"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Copy, CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { getProgram, USDC_MINT } from "@/lib/anchor";
import { PublicKey } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import BN from "bn.js";
import QRCode from "qrcode";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

interface PaymentRequest {
  id: string;
  requestNumber: string;
  amount: string;
  currency: string;
  inrAmount: string;
  helperFee: string;
  status: "pending" | "completed" | "expired";
  qrString: string;
  createdAt: string;
  expiryInfo: string;
  publicKey: PublicKey;
  creator: PublicKey;
  helper: PublicKey | null;
  statusCode: number;
  rawAmount: BN;
}

interface Order {
  publicKey: PublicKey;
  account: {
    creator: PublicKey;
    helper: PublicKey | null;
    amount: BN;
    feePercentage: number;
    expiry: BN | number;
    qrString: string;
    status: number;
    nonce: BN;
  };
}

export default function RequestDetailPage() {
  const params = useParams();
  const requestId = params.id as string;
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [request, setRequest] = useState<PaymentRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [processing, setProcessing] = useState(false);

  const getStatusFromCode = (statusCode: number): "pending" | "completed" | "expired" => {
    if (statusCode === 0) return "pending";
    if (statusCode === 1) return "completed";
    return "expired";
  };

  const getExpiryInfo = (expiry: BN | number | undefined, status: number): string => {
    if (status === 1) return "Completed";
    if (status === 2) return "Expired";
    if (!expiry) return "No expiry";
    
    const expiryTimestamp = typeof expiry === 'number' ? expiry : expiry.toNumber();
    const now = Math.floor(Date.now() / 1000);
    
    if (expiryTimestamp <= now) return "Expired";
    
    const daysLeft = Math.ceil((expiryTimestamp - now) / 86400);
    if (daysLeft === 1) return "Expires in 1 day";
    if (daysLeft > 1) return `Expires in ${daysLeft} days`;
    
    const hoursLeft = Math.ceil((expiryTimestamp - now) / 3600);
    return `Expires in ${hoursLeft} hours`;
  };

  const formatAmount = (amount: BN) => {
    const usdcAmount = amount.toNumber() / 1_000_000;
    const inrAmount = Math.round(usdcAmount * 84);
    return {
      usdc: usdcAmount.toFixed(2),
      inr: inrAmount.toLocaleString('en-IN'),
    };
  };

  useEffect(() => {
    const fetchRequest = async () => {
      if (!wallet || !requestId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const provider = new AnchorProvider(connection, wallet, {});
        const program = getProgram(provider);

        // Fetch all program accounts with better error handling
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allOrders: any[] = [];
        try {
          const accounts = await connection.getProgramAccounts(program.programId);

          // Try to deserialize each account individually, skipping failures
          for (const { pubkey, account } of accounts) {
            try {
              const decoded = program.coder.accounts.decode('order', account.data);
              allOrders.push({
                publicKey: pubkey,
                account: decoded,
              });
            } catch {
              // Skip accounts that can't be deserialized (old schema or different account type)
            }
          }
        } catch (err) {
          console.error("Error fetching program accounts:", err);
        }

        const order = allOrders.find((o: Order) => o.publicKey.toString() === requestId);

        if (!order) {
          setLoading(false);
          return;
        }

        const amounts = formatAmount(order.account.amount);
        const status = getStatusFromCode(order.account.status);
        const expiryInfo = getExpiryInfo(order.account.expiry, order.account.status);

        const transformedRequest: PaymentRequest = {
          id: order.publicKey.toString(),
          requestNumber: order.account.nonce.toString().padStart(6, '0'),
          amount: amounts.usdc,
          currency: 'USDC',
          inrAmount: amounts.inr,
          helperFee: `${order.account.feePercentage}%`,
          status,
          qrString: order.account.qrString,
          createdAt: new Date().toLocaleDateString(),
          expiryInfo,
          publicKey: order.publicKey,
          creator: order.account.creator,
          helper: order.account.helper || null,
          statusCode: order.account.status,
          rawAmount: order.account.amount,
        };

        setRequest(transformedRequest);
      } catch (error) {
        console.error('Error fetching request:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet?.publicKey, requestId, connection]);

  // Generate QR code when request is loaded
  useEffect(() => {
    if (request?.qrString) {
      QRCode.toDataURL(request.qrString, {
        width: 512,
        margin: 2,
        color: {
          dark: '#111111',
          light: '#FFFFFF'
        }
      })
        .then(url => setQrCodeUrl(url))
        .catch(err => console.error('Error generating QR code:', err));
    }
  }, [request?.qrString]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinRequest = async () => {
    if (!wallet || !request) return;

    try {
      setProcessing(true);
      const provider = new AnchorProvider(connection, wallet, {});
      const program = getProgram(provider);

      await program.methods
        .joinRequest()
        .accounts({
          helper: wallet.publicKey,
          order: request.publicKey,
        })
        .rpc();

      alert("Successfully joined the request!");
      // Refresh request data
      window.location.reload();
    } catch (error) {
      console.error("Error joining request:", error);
      alert("Failed to join request. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!wallet || !request) return;

    try {
      setProcessing(true);
      const provider = new AnchorProvider(connection, wallet, {});
      const program = getProgram(provider);

      await program.methods
        .markPaid(null)
        .accounts({
          helper: wallet.publicKey,
          order: request.publicKey,
        })
        .rpc();

      alert("Successfully marked as paid!");
      // Refresh request data
      window.location.reload();
    } catch (error) {
      console.error("Error marking as paid:", error);
      alert("Failed to mark as paid. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReleaseFunds = async () => {
    if (!wallet || !request) return;

    try {
      setProcessing(true);
      const provider = new AnchorProvider(connection, wallet, {});
      const program = getProgram(provider);

      // Get the escrow ATA
      const [orderPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("order"),
          request.creator.toBuffer(),
          new BN(request.requestNumber).toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      const escrowAta = getAssociatedTokenAddressSync(
        USDC_MINT,
        orderPda,
        true
      );

      // Get helper's ATA
      const helperAta = getAssociatedTokenAddressSync(
        USDC_MINT,
        request.helper!,
        false
      );

      await program.methods
        .acknowledgeAndRelease()
        .accounts({
          creator: wallet.publicKey,
          order: request.publicKey,
          escrowAta: escrowAta,
          helperAta: helperAta,
        })
        .rpc();

      alert("Successfully released funds!");
      // Refresh request data
      window.location.reload();
    } catch (error) {
      console.error("Error releasing funds:", error);
      alert("Failed to release funds. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#9FFFCB] animate-spin mx-auto mb-4" />
          <p className="text-[#666666]">Loading request details...</p>
        </div>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#BFFFE0]/20 to-[#E8E0FF]/20 border border-[#EDEDED] flex items-center justify-center">
            <XCircle className="w-12 h-12 text-[#999999]" />
          </div>
          <h2 className="text-2xl font-bold text-[#111111] mb-3">Connect Your Wallet</h2>
          <p className="text-[#666666] mb-6">
            Please connect your wallet to view request details
          </p>
          <Link
            href="/my-requests"
            className="inline-block px-8 py-4 bg-gradient-to-r from-[#BFFFE0] to-[#E8E0FF] rounded-full text-[#111111] font-bold hover:scale-105 hover:shadow-[0_8px_24px_rgba(140,255,200,0.3)] transition-all duration-300"
          >
            Back to My Requests
          </Link>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#BFFFE0]/20 to-[#E8E0FF]/20 border border-[#EDEDED] flex items-center justify-center">
            <XCircle className="w-12 h-12 text-[#999999]" />
          </div>
          <h2 className="text-2xl font-bold text-[#111111] mb-3">Request Not Found</h2>
          <p className="text-[#666666] mb-6">
            The request you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
          </p>
          <Link
            href="/my-requests"
            className="inline-block px-8 py-4 bg-gradient-to-r from-[#BFFFE0] to-[#E8E0FF] rounded-full text-[#111111] font-bold hover:scale-105 hover:shadow-[0_8px_24px_rgba(140,255,200,0.3)] transition-all duration-300"
          >
            Back to My Requests
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-[#EDEDED]">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link 
                href="/my-requests"
                className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-[#F8F8F8] transition-colors text-[#111111]"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Back</span>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-[#111111]">Request Details</h1>
                <p className="text-sm text-[#666666] mt-1">Request #{request.requestNumber}</p>
              </div>
            </div>
            
            {/* Status Badge */}
            {request.status === "pending" ? (
              <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#FFE8A3] border border-[#FFD770] text-[#996A00] text-sm font-medium">
                <Clock className="w-4 h-4" />
                Pending
              </span>
            ) : request.status === "completed" ? (
              <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#CFF8D8] border border-[#9EF0B3] text-[#00662E] text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Completed
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#FFD6D6] border border-[#FFAAAA] text-[#CC0000] text-sm font-medium">
                <XCircle className="w-4 h-4" />
                Expired
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left Column - Amount & Details */}
            <div className="space-y-6">
              {/* Amount Card */}
              <div className="p-8 rounded-3xl bg-gradient-to-br from-[#BFFFE0]/20 to-[#E1F0FF]/20 border border-[#EDEDED] shadow-sm">
                <div className="text-sm text-[#666666] mb-2 font-medium">Requested Amount</div>
                <div className="text-4xl font-bold text-[#111111] mb-2">₹{request.inrAmount}</div>
                <div className="text-lg text-[#999999]">{request.amount} {request.currency}</div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 rounded-2xl bg-[#F8F8F8] border border-[#EDEDED]">
                  <div className="text-xs text-[#666666] mb-2 font-medium">Helper Fee</div>
                  <div className="text-2xl font-bold text-[#111111]">{request.helperFee}</div>
                </div>
                <div className="p-6 rounded-2xl bg-[#F8F8F8] border border-[#EDEDED]">
                  <div className="text-xs text-[#666666] mb-2 font-medium">Expiry</div>
                  <div className="text-lg font-bold text-[#111111]">{request.expiryInfo}</div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-[#E8E0FF]/20 to-[#FFF2E5]/20 border border-[#EDEDED]">
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-[#666666] mb-1 font-medium">Request ID</div>
                    <div className="text-sm text-[#111111] font-mono break-all">{request.id.slice(0, 16)}...</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#666666] mb-1 font-medium">Created On</div>
                    <div className="text-sm text-[#111111]">{request.createdAt}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - QR Code */}
            <div className="space-y-6">
              <div className="p-8 rounded-3xl bg-gradient-to-br from-[#BFFFE0]/10 to-[#E8E0FF]/10 border border-[#EDEDED]">
                <h3 className="text-lg font-semibold text-[#111111] mb-6">Payment QR Code</h3>
                
                {/* QR Code Display */}
                <div className="aspect-square bg-white rounded-2xl flex items-center justify-center shadow-inner mb-6 border border-[#EDEDED] p-4 relative">
                  {qrCodeUrl ? (
                    <Image 
                      src={qrCodeUrl} 
                      alt="Payment QR Code" 
                      width={512}
                      height={512}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Loader2 className="w-16 h-16 text-[#9FFFCB] animate-spin" />
                  )}
                </div>

                {/* QR String */}
                <div className="mb-6">
                  <div className="text-xs text-[#666666] mb-2 font-medium">QR String</div>
                  <div className="text-xs text-[#666666] break-all font-mono bg-[#F8F8F8] p-4 rounded-xl border border-[#EDEDED] leading-relaxed">
                    {request.qrString}
                  </div>
                </div>

                {/* Copy Button */}
                <button
                  onClick={() => copyToClipboard(request.qrString)}
                  className="w-full px-6 py-4 bg-gradient-to-r from-[#BFFFE0] to-[#9FFFCB] rounded-full text-[#111111] font-bold hover:scale-105 hover:shadow-[0_8px_24px_rgba(140,255,200,0.3)] transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Copy className="w-5 h-5" />
                  {copied ? "Copied!" : "Copy QR String"}
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons Section */}
          <div className="mt-8">
            <div className="p-8 rounded-3xl bg-gradient-to-br from-[#E1F0FF]/20 to-[#FFF2E5]/20 border border-[#EDEDED]">
              <h3 className="text-lg font-semibold text-[#111111] mb-6">Actions</h3>
              <div className="space-y-4">
                {/* Join Request Button - Show if status is 0 (pending) and user is not the creator */}
                {request.statusCode === 0 && wallet?.publicKey.toString() !== request.creator.toString() && (
                  <button
                    onClick={handleJoinRequest}
                    disabled={processing}
                    className="w-full px-8 py-4 bg-gradient-to-r from-[#B3DBFF] to-[#E1F0FF] rounded-full text-[#111111] font-bold hover:scale-105 hover:shadow-[0_8px_24px_rgba(179,219,255,0.4)] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Join Request
                      </>
                    )}
                  </button>
                )}

                {/* Mark as Paid Button - Show if status is 1 (joined) and user is the helper */}
                {request.statusCode === 1 && request.helper && wallet?.publicKey.toString() === request.helper.toString() && (
                  <button
                    onClick={handleMarkPaid}
                    disabled={processing}
                    className="w-full px-8 py-4 bg-gradient-to-r from-[#FFE8A3] to-[#FFD770] rounded-full text-[#996A00] font-bold hover:scale-105 hover:shadow-[0_8px_24px_rgba(255,232,163,0.4)] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Mark as Paid
                      </>
                    )}
                  </button>
                )}

                {/* Release Funds Button - Show if status is 2 (paid) and user is the creator */}
                {request.statusCode === 2 && wallet?.publicKey.toString() === request.creator.toString() && (
                  <button
                    onClick={handleReleaseFunds}
                    disabled={processing}
                    className="w-full px-8 py-4 bg-gradient-to-r from-[#CFF8D8] to-[#9EF0B3] rounded-full text-[#00662E] font-bold hover:scale-105 hover:shadow-[0_8px_24px_rgba(158,240,179,0.4)] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Release Funds
                      </>
                    )}
                  </button>
                )}

                {/* Info text when no actions available */}
                {((request.statusCode === 0 && wallet?.publicKey.toString() === request.creator.toString()) ||
                  (request.statusCode === 1 && (!request.helper || wallet?.publicKey.toString() !== request.helper.toString())) ||
                  (request.statusCode === 2 && wallet?.publicKey.toString() !== request.creator.toString()) ||
                  request.statusCode === 3 ||
                  request.statusCode === 2) && (
                  <div className="text-center py-4">
                    <p className="text-[#666666]">
                      {request.statusCode === 0 && wallet?.publicKey.toString() === request.creator.toString() && 
                        "Waiting for someone to join your request..."}
                      {request.statusCode === 1 && (!request.helper || wallet?.publicKey.toString() !== request.helper.toString()) && 
                        "Request has been joined. Waiting for helper to mark as paid..."}
                      {request.statusCode === 2 && wallet?.publicKey.toString() !== request.creator.toString() && 
                        "Payment completed. Waiting for creator to release funds..."}
                      {request.statusCode === 3 && 
                        "Request completed! Funds have been released."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
