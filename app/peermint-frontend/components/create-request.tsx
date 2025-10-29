"use client";

import { useState, useRef } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { SystemProgram, Transaction } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { getProgram, getOrderPda, USDC_MINT } from "@/lib/anchor";
import { Upload, Loader2, ScanLine } from "lucide-react";
import QRScannerComponent from "./qr-scanner";

export default function CreateRequest() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [amount, setAmount] = useState("");
  const [qrString, setQrString] = useState("");
  const [feeBps, setFeeBps] = useState("50");
  const [expiryMinutes, setExpiryMinutes] = useState("30");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  // Use a ref to track last nonce to ensure uniqueness
  const lastNonceRef = useRef(0);
  const processingRef = useRef(false);
  const counterRef = useRef(0);
  const lastTransactionTimeRef = useRef(0);

  const generateUniqueNonce = () => {
    // Increment counter for extra uniqueness
    counterRef.current += 1;
    
    // Use high-resolution timestamp + random + counter to ensure uniqueness
    const timestamp = Math.floor(performance.now() * 1000); // Microseconds
    const random = Math.floor(Math.random() * 1000000);
    const counter = counterRef.current;
    let nonce = timestamp + random + counter;
    
    // Ensure it's different from the last one
    let attempts = 0;
    while (nonce === lastNonceRef.current && attempts < 10) {
      nonce = Math.floor(performance.now() * 1000) + Math.floor(Math.random() * 1000000) + counterRef.current;
      attempts++;
    }
    
    lastNonceRef.current = nonce;
    console.log("Generated nonce:", nonce, "counter:", counter);
    return nonce;
  };

  const handleCreate = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) return;
    
    // Prevent double-submission with ref (more reliable than state)
    if (processingRef.current) {
      console.log("Already processing, ignoring duplicate call");
      return;
    }
    
    // Cooldown: prevent rapid successive transactions (within 3 seconds)
    const now = Date.now();
    if (now - lastTransactionTimeRef.current < 3000) {
      alert("Please wait a moment before creating another request.");
      return;
    }

    // Set processing flag IMMEDIATELY before any async operations
    processingRef.current = true;
    setLoading(true);

    try {
      setSuccess("");

      // With the updated program, we can now store up to 500 characters!
      console.log("QR String length:", qrString.length);
      
      if (qrString.length > 500) {
        throw new Error(`QR string too long (${qrString.length} chars). Maximum is 500 characters.`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const provider = new AnchorProvider(connection, wallet as any, {
        commitment: 'confirmed',
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });
      const program = getProgram(provider);

      // Generate unique nonce to prevent transaction collisions
      const nonce = generateUniqueNonce();
      
      const amountLamports = Math.floor(parseFloat(amount) * 1_000_000);
      const expiryTs = Math.floor(Date.now() / 1000) + parseInt(expiryMinutes) * 60; // Convert minutes to seconds

      const [orderPda] = getOrderPda(wallet.publicKey, nonce);
      
      // Calculate token account addresses
      const sourceAta = await getAssociatedTokenAddress(
        USDC_MINT,
        wallet.publicKey
      );
      
      const escrowAta = await getAssociatedTokenAddress(
        USDC_MINT,
        orderPda,
        true // allowOwnerOffCurve - PDA can own token accounts
      );

      console.log("Source ATA:", sourceAta.toString());
      console.log("Escrow ATA:", escrowAta.toString());

      // Check if escrow ATA exists, create if it doesn't
      const escrowInfo = await connection.getAccountInfo(escrowAta);
      if (!escrowInfo) {
        console.log("Creating escrow token account...");
        const createAtaIx = createAssociatedTokenAccountInstruction(
          wallet.publicKey, // payer
          escrowAta,        // ata
          orderPda,         // owner (PDA)
          USDC_MINT        // mint
        );
        
        const createAtaTx = new Transaction().add(createAtaIx);
        const { blockhash } = await connection.getLatestBlockhash();
        createAtaTx.recentBlockhash = blockhash;
        createAtaTx.feePayer = wallet.publicKey;
        
        const signedTx = await wallet.signTransaction(createAtaTx);
        const createAtaSig = await connection.sendRawTransaction(signedTx.serialize());
        await connection.confirmTransaction(createAtaSig);
        console.log("Escrow ATA created:", createAtaSig);
      } else {
        console.log("Escrow ATA already exists");
      }

      // Convert percentage to basis points (1% = 100 bps)
      // Convert percentage to actual percentage value (e.g., 0.5% stays as 0.5)
      const feePercentage = parseFloat(feeBps);

      console.log("Creating order with params:", {
        amount: amountLamports,
        expiry: expiryTs,
        feePercentage: feePercentage,
        nonce,
        qrString: qrString,
      });

      // Get fresh blockhash to ensure transaction uniqueness
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
      console.log("Using blockhash:", blockhash);

      const txBuilder = program.methods
        .createRequest(
          new BN(amountLamports),
          new BN(expiryTs),
          feePercentage,
          new BN(nonce),
          qrString
        )
        .accounts({
          creator: wallet.publicKey,
          order: orderPda,
          mint: USDC_MINT,
          sourceAta,
          escrowAta,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        });

      // Build and sign transaction manually for better control
      const tx = await txBuilder.transaction();
      tx.recentBlockhash = blockhash;
      tx.feePayer = wallet.publicKey;

      const signedTx = await wallet.signTransaction(tx);
      const rawTx = signedTx.serialize();

      // Send with explicit configuration to prevent duplicates
      const signature = await connection.sendRawTransaction(rawTx, {
        skipPreflight: false,
        maxRetries: 0, // Don't auto-retry - prevents duplicate submissions
        preflightCommitment: 'confirmed',
      });

      console.log("Transaction sent:", signature);
      
      // Wait for confirmation
      await connection.confirmTransaction({
        signature: signature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');
      
      // Update last transaction time for cooldown
      lastTransactionTimeRef.current = Date.now();
      
      setSuccess(`Request created! TX: ${signature.slice(0, 8)}...`);
      
      // Clear form only after successful transaction
      setAmount("");
      setQrString("");
      setFeeBps("50");
    } catch (err) {
      console.error("Full error:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      
      // Check if it's a duplicate transaction error
      if (errorMessage.includes("already been processed")) {
        alert("This transaction was already submitted. Please wait a moment and try creating a new request.");
      } else {
        alert("Error creating request: " + errorMessage);
      }
    } finally {
      setLoading(false);
      processingRef.current = false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission
    handleCreate();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Upload className="w-6 h-6" />
        Create Payment Request
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Amount (USDC)
          </label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
            placeholder="10.00"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Payment QR Code
          </label>
          <div className="flex gap-2">
            <textarea
              value={qrString}
              onChange={(e) => setQrString(e.target.value)}
              className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
              placeholder="upi://pay?pa=yourname@paytm&am=10"
              rows={3}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 h-fit disabled:opacity-50"
              title="Scan QR Code"
              disabled={loading}
            >
              <ScanLine className="w-5 h-5" />
              Scan
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Enter manually or click &quot;Scan&quot; to use your camera
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Helper Fee (% of amount)
            </label>
            <input
              type="number"
              value={feeBps}
              onChange={(e) => setFeeBps(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder="0.5"
              step="0.1"
              min="0"
              max="100"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Percentage fee paid to the helper (e.g., 0.5 = 0.5%)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Expiry (minutes)
            </label>
            <input
              type="number"
              value={expiryMinutes}
              onChange={(e) => setExpiryMinutes(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
              placeholder="30"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              How long before the request expires
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !wallet.connected || !amount || !qrString}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Request"
          )}
        </button>

        {success && (
          <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 p-3 rounded-lg">
            {success}
          </div>
        )}
      </form>

      {showScanner && (
        <QRScannerComponent
          onScan={(result) => {
            setQrString(result);
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
