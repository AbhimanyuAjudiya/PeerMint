"use client";

import { useState, useRef } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { SystemProgram } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { getProgram, getOrderPda, USDC_MINT } from "@/lib/anchor";
import { 
  Plus, 
  Info, 
  ScanLine, 
  Upload, 
  Loader2, 
  CheckCircle2,
  Clock,
  QrCode,
  Wallet,
  ArrowRight,
  Sparkles,
  Shield,
  Zap,
  Users
} from "lucide-react";
import Link from "next/link";
import QRScannerModal from "@/components/qr-scanner-modal";

// Global lock to prevent duplicate transactions
let globalTransactionLock = false;
let globalLockTimestamp = 0;

export default function CreateRequestPage() {
  const { connection } = useConnection();
  const wallet = useWallet();
  
  // Form state
  const [inrAmount, setInrAmount] = useState("");
  const [qrString, setQrString] = useState("");
  const [feeBps, setFeeBps] = useState("50");
  const [expiryMinutes, setExpiryMinutes] = useState("30");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  
  // Exchange rate: 1 USDC = 83.09 INR
  const USDC_TO_INR_RATE = 83.09;
  
  // Calculate USDC amount from INR
  const usdcAmount = inrAmount ? (parseFloat(inrAmount) / USDC_TO_INR_RATE).toFixed(6) : "0";
  
  // Calculate helper fee in INR
  const helperFeeINR = inrAmount && feeBps 
    ? (parseFloat(inrAmount) * (parseFloat(feeBps) / 10000)).toFixed(2) 
    : "0";

  // Transaction management refs
  const lastNonceRef = useRef(0);
  const processingRef = useRef(false);
  const counterRef = useRef(0);
  const lastTransactionTimeRef = useRef(0);
  const activeTransactionRef = useRef<string | null>(null);

  const generateUniqueNonce = () => {
    counterRef.current += 1;
    const timestamp = Math.floor(performance.now() * 1000);
    const random = Math.floor(Math.random() * 1000000);
    const counter = counterRef.current;
    let nonce = timestamp + random + counter;
    
    let attempts = 0;
    while (nonce === lastNonceRef.current && attempts < 10) {
      nonce = Math.floor(performance.now() * 1000) + Math.floor(Math.random() * 1000000) + counterRef.current;
      attempts++;
    }
    
    lastNonceRef.current = nonce;
    return nonce;
  };

  const handleCreate = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      alert("Please connect your wallet first");
      return;
    }
    
    // Validation
    if (!inrAmount || parseFloat(inrAmount) <= 0) {
      alert("Please enter a valid INR amount");
      return;
    }
    if (!qrString.trim()) {
      alert("Please enter or scan a payment QR code");
      return;
    }
    
    const now = Date.now();
    
    // Check global lock
    if (globalTransactionLock && (now - globalLockTimestamp) < 10000) {
      console.log("🚫 GLOBAL LOCK: Another transaction is in progress");
      return;
    }
    
    // Check if processing
    if (processingRef.current || activeTransactionRef.current) {
      console.log("Transaction already in progress");
      return;
    }
    
    // Cooldown check
    if (now - lastTransactionTimeRef.current < 5000) {
      alert("Please wait a moment before creating another request.");
      return;
    }

    const txId = `tx-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    try {
      // Set all locks
      globalTransactionLock = true;
      globalLockTimestamp = now;
      processingRef.current = true;
      activeTransactionRef.current = txId;
      lastTransactionTimeRef.current = now;
      
      setLoading(true);
      setSuccess("");

      const provider = new AnchorProvider(connection, wallet as any, {
        commitment: "confirmed",
      });
      const program = getProgram(provider);

      // Calculate amounts
      const usdcAmountValue = parseFloat(inrAmount) / USDC_TO_INR_RATE;
      const amountLamports = Math.floor(usdcAmountValue * 1_000_000);
      const inrAmountPaise = Math.floor(parseFloat(inrAmount) * 100);
      const feeBpsValue = parseInt(feeBps);
      const expiryTs = Math.floor(Date.now() / 1000) + parseInt(expiryMinutes) * 60;
      const nonce = generateUniqueNonce();

      console.log("Creating request with nonce:", nonce);

      // Get PDAs and token accounts
      const [orderPda] = getOrderPda(wallet.publicKey, nonce);
      const creatorTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        wallet.publicKey
      );
      const escrowTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        orderPda,
        true
      );

      // Check if escrow account exists
      const escrowAccountInfo = await connection.getAccountInfo(escrowTokenAccount);
      const instructions = [];

      if (!escrowAccountInfo) {
        instructions.push(
          createAssociatedTokenAccountInstruction(
            wallet.publicKey,
            escrowTokenAccount,
            orderPda,
            USDC_MINT,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        );
      }

      // Create request instruction
      const createIx = await program.methods
        .createRequest(
          new BN(amountLamports),
          new BN(inrAmountPaise),
          new BN(expiryTs),
          new BN(feeBpsValue),
          qrString.trim(),
          new BN(nonce)
        )
        .accounts({
          creator: wallet.publicKey,
          order: orderPda,
          creatorTokenAccount,
          escrowTokenAccount,
          mint: USDC_MINT,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      instructions.push(createIx);

      // Send transaction
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      const transaction = new (await import("@solana/web3.js")).Transaction();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey;
      transaction.add(...instructions);

      const signed = await wallet.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });

      console.log("Transaction sent:", signature);

      await connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        "confirmed"
      );

      setSuccess(`Request created successfully! Transaction: ${signature.slice(0, 8)}...`);
      
      // Reset form
      setInrAmount("");
      setQrString("");
      setFeeBps("50");
      setExpiryMinutes("30");

      // Redirect after 2 seconds
      setTimeout(() => {
        window.location.href = "/my-requests";
      }, 2000);

    } catch (error: any) {
      console.error("Error creating request:", error);
      alert(`Error: ${error.message || "Failed to create request"}`);
    } finally {
      setLoading(false);
      
      // Release locks after a delay
      setTimeout(() => {
        globalTransactionLock = false;
        processingRef.current = false;
        activeTransactionRef.current = null;
      }, 2000);
    }
  };

  const handleScan = (result: string) => {
    setQrString(result);
    setShowScanner(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log("File selected:", file.name, file.type);

    // Check if it's an image file
    if (file.type.startsWith('image/')) {
      try {
        console.log("Scanning QR code from image...");
        // Dynamically import QrScanner to decode QR from image
        const QrScanner = (await import('qr-scanner')).default;
        const result = await QrScanner.scanImage(file);
        console.log("QR scan result:", result);
        setQrString(result);
      } catch (error) {
        console.error('Error scanning QR code:', error);
      }
    } else {
      // If it's a text file, read as text
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        console.log("Text file content:", text);
        setQrString(text);
      };
      reader.readAsText(file);
    }
    
    // Reset input so same file can be selected again
    event.target.value = '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8F9FB] via-white to-[#F8F9FB]">
      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        {/* Main Form Card */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 md:p-12 border-2 border-[#C6F6D5]/50 shadow-2xl">
            {success && (
              <div className="mb-6 p-4 bg-gradient-to-r from-[#C6F6D5] to-[#8FFF73] rounded-2xl flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#0D0D0D]" />
                <p className="text-[#0D0D0D] font-semibold">{success}</p>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Amount (INR) */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <span className="text-xl">🇮🇳</span>
                  Amount (INR)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={inrAmount}
                    onChange={(e) => setInrAmount(e.target.value)}
                    placeholder="Enter amount in INR"
                    className="w-full px-4 py-4 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-2xl focus:border-[#8FFF73] focus:ring-4 focus:ring-[#8FFF73]/20 transition-all outline-none text-lg font-semibold text-gray-900"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    ₹
                  </div>
                </div>
                {inrAmount && (
                  <p className="text-sm text-gray-600 mt-2">
                    ≈ <span className="font-semibold text-[#10b981]">{usdcAmount} USDC</span> will be locked
                  </p>
                )}
              </div>

              {/* Helper Fee */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  Helper Fee (% of amount)
                  <div className="group relative">
                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-gray-900 text-white text-xs rounded-lg">
                      Fee paid to helper for providing INR liquidity (in basis points, 50 = 0.5%)
                    </div>
                  </div>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={feeBps}
                    onChange={(e) => setFeeBps(e.target.value)}
                    placeholder="50"
                    className="w-full px-4 py-4 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-2xl focus:border-[#E9D8FD] focus:ring-4 focus:ring-[#E9D8FD]/20 transition-all outline-none text-lg font-semibold text-gray-900"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    bps
                  </div>
                </div>
                {inrAmount && feeBps && (
                  <p className="text-sm text-gray-600 mt-2">
                    Fee: <span className="font-semibold text-purple-600">₹{helperFeeINR}</span> ({(parseFloat(feeBps) / 100).toFixed(2)}%)
                  </p>
                )}
              </div>

              {/* Expiry */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Clock className="w-4 h-4" />
                  Expiry (minutes)
                  <div className="group relative">
                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-gray-900 text-white text-xs rounded-lg">
                      How long the request remains active before expiring
                    </div>
                  </div>
                </label>
                <input
                  type="number"
                  value={expiryMinutes}
                  onChange={(e) => setExpiryMinutes(e.target.value)}
                  placeholder="30"
                  className="w-full px-4 py-4 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-2xl focus:border-[#FDE68A] focus:ring-4 focus:ring-[#FDE68A]/20 transition-all outline-none text-lg font-semibold text-gray-900"
                />
              </div>
            </div>

            {/* Payment QR Code */}
            <div className="space-y-2 mb-8">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <QrCode className="w-4 h-4" />
                Payment QR Code / UPI Details
              </label>
              <div className="relative">
                <textarea
                  value={qrString}
                  onChange={(e) => setQrString(e.target.value)}
                  placeholder="Enter UPI ID or payment details, or scan QR code"
                  rows={4}
                  className="w-full px-4 py-4 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-2xl focus:border-[#8FFF73] focus:ring-4 focus:ring-[#8FFF73]/20 transition-all outline-none resize-none text-gray-900 font-mono text-sm"
                />
              </div>
              
              {qrString && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                  <p className="text-xs font-semibold text-green-700 mb-1">✓ Payment details captured ({qrString.length} characters)</p>
                  <p className="text-xs text-green-600 break-all">{qrString.substring(0, 150)}{qrString.length > 150 ? '...' : ''}</p>
                </div>
              )}
              
              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => setShowScanner(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all transform hover:scale-105"
                >
                  <ScanLine className="w-5 h-5" />
                  Scan QR
                </button>

                <label className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all transform hover:scale-105 cursor-pointer">
                  <Upload className="w-5 h-5" />
                  Upload QR
                  <input
                    type="file"
                    accept="image/*,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Create Button */}
            <button
              onClick={handleCreate}
              disabled={loading || !wallet.publicKey}
              className="w-full py-5 bg-gradient-to-r from-[#00D09C] to-[#10b981] text-white text-lg font-bold rounded-2xl hover:shadow-2xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Creating Request...
                </>
              ) : !wallet.publicKey ? (
                <>
                  <Wallet className="w-6 h-6" />
                  Connect Wallet First
                </>
              ) : (
                <>
                  <Sparkles className="w-6 h-6" />
                  Create Request
                </>
              )}
            </button>

            {!wallet.publicKey && (
              <p className="text-center text-sm text-gray-500 mt-4">
                Connect your wallet using the button in the header to create requests
              </p>
            )}
          </div>
        </div>

        {/* How It Works Section */}
        <div className="max-w-6xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-[#1A1A1A] mb-12">
            How It <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8FFF73] to-[#10b981]">Works</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="group bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-[#C6F6D5]/30 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-[#C6F6D5] to-[#8FFF73] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="text-3xl font-bold text-[#0D0D0D]">1</span>
              </div>
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl mb-3">
                  <Plus className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-[#1A1A1A] mb-3">Create Request</h3>
              <p className="text-gray-600 leading-relaxed">
                Fill in the INR amount, your UPI details, helper fee, and expiry time. Your USDC gets locked in escrow.
              </p>
            </div>

            {/* Step 2 */}
            <div className="group bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-[#E9D8FD]/30 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-[#E9D8FD] to-[#D8B4FE] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="text-3xl font-bold text-[#0D0D0D]">2</span>
              </div>
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-100 to-violet-100 rounded-xl mb-3">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-[#1A1A1A] mb-3">Helper Joins & Pays</h3>
              <p className="text-gray-600 leading-relaxed">
                A helper discovers your request, joins it, and pays you the INR amount via UPI to your provided details.
              </p>
            </div>

            {/* Step 3 */}
            <div className="group bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-[#FDE68A]/30 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-[#FDE68A] to-[#FCD34D] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="text-3xl font-bold text-[#0D0D0D]">3</span>
              </div>
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-yellow-100 to-amber-100 rounded-xl mb-3">
                  <CheckCircle2 className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-[#1A1A1A] mb-3">Release Funds</h3>
              <p className="text-gray-600 leading-relaxed">
                Once you confirm receiving INR, you release the USDC + fee to the helper. Transaction complete!
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-[#C6F6D5]/30 via-white to-[#E9D8FD]/30 rounded-3xl p-8 md:p-12 border-2 border-[#8FFF73]/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#8FFF73]/20 to-transparent rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-br from-[#E9D8FD]/20 to-transparent rounded-full blur-3xl"></div>
            
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center gap-2 mb-4">
                <Shield className="w-8 h-8 text-[#10b981]" />
                <Zap className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4">
                Start Exploring Requests
              </h3>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                Want to help others and earn crypto? Browse active payment requests and start earning USDC today.
              </p>
              <Link
                href="/explore"
                className="inline-flex items-center gap-3 px-8 py-4 bg-white border-2 border-[#8FFF73] text-[#0D0D0D] font-bold rounded-2xl hover:bg-[#8FFF73] hover:shadow-xl transition-all transform hover:scale-105"
              >
                Explore Now
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#0D0D0D] text-white py-12 mt-20 border-t-2 border-[#8FFF73]/30">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#8FFF73] to-[#E8E0FF] rounded-xl flex items-center justify-center">
                <Plus className="w-6 h-6 text-[#0D0D0D]" />
              </div>
              <span className="text-2xl font-bold">PeerMint</span>
            </div>

            <div className="flex gap-8">
              <Link href="/" className="hover:text-[#8FFF73] transition-colors">Home</Link>
              <Link href="/create" className="hover:text-[#8FFF73] transition-colors">Create</Link>
              <Link href="/my-requests" className="hover:text-[#8FFF73] transition-colors">My Requests</Link>
              <Link href="/explore" className="hover:text-[#8FFF73] transition-colors">Explore</Link>
            </div>

            <p className="text-gray-400 text-sm">
              © 2025 PeerMint. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScan}
        onUpload={handleFileUpload}
      />
    </div>
  );
}
