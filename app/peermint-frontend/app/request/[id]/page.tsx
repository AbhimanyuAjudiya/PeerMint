"use client";

import { useEffect, useState } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { getProgram, USDC_MINT } from "@/lib/anchor";
import { PublicKey } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle, Clock, XCircle } from "lucide-react";
import QRDisplay from "@/components/qr-display";
import BN from "bn.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";

interface OrderAccount {
  creator: PublicKey;
  helper: PublicKey | null;
  amount: BN;
  feePercentage: BN | number;
  expiryTs: BN | number;  // Changed from 'expiry' to 'expiryTs'
  qrString: string;
  status: number;
  nonce: BN;
  paidAt?: BN | number;
}

export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [order, setOrder] = useState<{ publicKey: PublicKey; account: OrderAccount } | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const orderId = params.id as string;

  useEffect(() => {
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, wallet?.publicKey]);

  const fetchOrder = async () => {
    if (!orderId) return;

    try {
      setLoading(true);
      const orderPubkey = new PublicKey(orderId);
      
      if (wallet) {
        const provider = new AnchorProvider(connection, wallet, {});
        const program = getProgram(provider);
        
        try {
          const orderAccount = await program.account.order.fetch(orderPubkey);
          console.log('Order account fetched:', orderAccount);
          console.log('ExpiryTs value:', orderAccount.expiryTs);
          console.log('ExpiryTs type:', typeof orderAccount.expiryTs);
          setOrder({ publicKey: orderPubkey, account: orderAccount as unknown as OrderAccount });
        } catch (fetchError) {
          console.error("Error decoding order account:", fetchError);
          
          // Check if account exists but is incompatible
          const accountInfo = await connection.getAccountInfo(orderPubkey);
          if (accountInfo) {
            alert("This request was created with an older program version and is no longer compatible. Please create a new request.");
          } else {
            alert("Request not found.");
          }
          setOrder(null);
        }
      } else {
        // Fetch without wallet for viewing
        const accountInfo = await connection.getAccountInfo(new PublicKey(orderId));
        if (accountInfo) {
          // Basic display without decoded data
          setOrder(null);
        }
      }
    } catch (error) {
      console.error("Error fetching order:", error);
      alert("Failed to load request details.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRequest = async () => {
    if (!wallet || !order) return;
    if (processing) return; // Prevent double-submission

    try {
      setProcessing(true);
      const provider = new AnchorProvider(connection, wallet, {
        commitment: 'confirmed',
        skipPreflight: false,
      });
      const program = getProgram(provider);

      await program.methods
        .joinRequest()
        .accounts({
          helper: wallet.publicKey,
          order: order.publicKey,
        })
        .rpc({
          skipPreflight: false,
          commitment: 'confirmed',
        });

      alert("Successfully joined the request!");
      fetchOrder();
    } catch (error) {
      console.error("Error joining request:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("already been processed")) {
        alert("This action was already submitted. Please refresh the page.");
      } else {
        alert("Failed to join request. Please try again.");
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!wallet || !order) return;
    if (processing) return; // Prevent double-submission

    try {
      setProcessing(true);
      const provider = new AnchorProvider(connection, wallet, {
        commitment: 'confirmed',
        skipPreflight: false,
      });
      const program = getProgram(provider);

      await program.methods
        .markPaid(null)
        .accounts({
          signer: wallet.publicKey,
          order: order.publicKey,
        })
        .rpc({
          skipPreflight: false,
          commitment: 'confirmed',
        });

      alert("Successfully marked as paid!");
      fetchOrder();
    } catch (error) {
      console.error("Error marking as paid:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("already been processed")) {
        alert("This action was already submitted. Please refresh the page.");
      } else {
        alert("Failed to mark as paid. Please try again.");
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleReleaseFunds = async () => {
    if (!wallet || !order) return;
    if (processing) return; // Prevent double-submission

    try {
      setProcessing(true);
      const provider = new AnchorProvider(connection, wallet, {
        commitment: 'confirmed',
        skipPreflight: false,
      });
      const program = getProgram(provider);

      const escrowAta = await getAssociatedTokenAddress(USDC_MINT, order.publicKey, true);
      const helperAta = await getAssociatedTokenAddress(USDC_MINT, order.account.helper!);

      await program.methods
        .acknowledgeAndRelease()
        .accounts({
          creator: wallet.publicKey,
          order: order.publicKey,
          escrowAta,
          helperAta,
        })
        .rpc({
          skipPreflight: false,
          commitment: 'confirmed',
        });

      alert("Funds released successfully!");
      fetchOrder();
    } catch (error) {
      console.error("Error releasing funds:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("already been processed")) {
        alert("This action was already submitted. Please refresh the page.");
      } else {
        alert("Failed to release funds. Please try again.");
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleAutoRelease = async () => {
    if (!wallet || !order) return;
    if (processing) return; // Prevent double-submission

    try {
      setProcessing(true);
      const provider = new AnchorProvider(connection, wallet, {
        commitment: 'confirmed',
        skipPreflight: false,
      });
      const program = getProgram(provider);

      const escrowAta = await getAssociatedTokenAddress(USDC_MINT, order.publicKey, true);
      const helperAta = await getAssociatedTokenAddress(USDC_MINT, order.account.helper!);

      await program.methods
        .autoRelease()
        .accounts({
          creator: wallet.publicKey,
          order: order.publicKey,
          escrowAta,
          helperAta,
        })
        .rpc({
          skipPreflight: false,
          commitment: 'confirmed',
        });

      alert("Funds returned successfully!");
      fetchOrder();
    } catch (error) {
      console.error("Error auto-releasing funds:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("already been processed")) {
        alert("This action was already submitted. Please refresh the page.");
      } else {
        alert("Failed to auto-release funds. Please try again.");
      }
    } finally {
      setProcessing(false);
    }
  };

  // Status: 0=Pending, 1=HelperJoined, 2=Paid, 3=Released, 4=Disputed
  const getStatusBadge = (status: number) => {
    if (status === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          <Clock className="w-4 h-4" />
          Pending
        </span>
      );
    }
    if (status === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          <Clock className="w-4 h-4" />
          Helper Joined
        </span>
      );
    }
    if (status === 2) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
          <CheckCircle className="w-4 h-4" />
          Paid
        </span>
      );
    }
    if (status === 3) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <CheckCircle className="w-4 h-4" />
          Completed
        </span>
      );
    }
    if (status === 4) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          <XCircle className="w-4 h-4" />
          Disputed
        </span>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading request...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link 
              href="/explore"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Explore
            </Link>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">Request not found</p>
          </div>
        </div>
      </div>
    );
  }

  const isCreator = wallet?.publicKey?.toString() === order.account.creator.toString();
  const isHelper = wallet?.publicKey?.toString() === order.account.helper?.toString();
  const amount = order.account.amount.toNumber() / 1_000_000;
  const feePercentage = typeof order.account.feePercentage === 'object' && 'toNumber' in order.account.feePercentage
    ? order.account.feePercentage.toNumber()
    : Number(order.account.feePercentage);
  const feeAmount = (amount * feePercentage) / 100;
  const totalDeposited = amount + feeAmount;

  // Check if order is expired (only show as expired if not completed)
  const isExpired = (() => {
    try {
      // Don't show as expired if already completed (status 3)
      if (order.account.status === 3) return false;
      
      let expirySeconds: number;
      if (typeof order.account.expiryTs === 'object' && 'toNumber' in order.account.expiryTs) {
        expirySeconds = order.account.expiryTs.toNumber();
      } else {
        expirySeconds = Number(order.account.expiryTs);
      }
      const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
      return currentTime > expirySeconds;
    } catch {
      return false;
    }
  })();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link 
            href={isCreator ? "/my-requests" : "/explore"}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-2">Payment Request</h1>
                <p className="text-blue-100 text-sm font-mono">
                  {order.publicKey.toString().slice(0, 12)}...{order.publicKey.toString().slice(-12)}
                </p>
              </div>
              {getStatusBadge(order.account.status)}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Amount Details */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Requested Amount</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {amount.toFixed(2)} USDC
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Helper Fee ({feePercentage}%)</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {feeAmount.toFixed(2)} USDC
                </p>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-300 mb-1">Total in Escrow</p>
              <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
                {totalDeposited.toFixed(2)} USDC
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Includes amount + fee
              </p>
            </div>

            {/* Creator & Helper Info */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Creator</p>
                <p className="text-sm font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded">
                  {order.account.creator.toString().slice(0, 8)}...{order.account.creator.toString().slice(-8)}
                </p>
                {isCreator && (
                  <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    You
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Helper</p>
                {order.account.helper ? (
                  <>
                    <p className="text-sm font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded">
                      {order.account.helper.toString().slice(0, 8)}...{order.account.helper.toString().slice(-8)}
                    </p>
                    {isHelper && (
                      <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                        You
                      </span>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    No helper yet
                  </p>
                )}
              </div>
            </div>

            {/* Expiry */}
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Expires At</p>
              <p className={`font-medium ${isExpired ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                {(() => {
                  try {
                    // Handle BN or number type for expiryTs (Unix timestamp in seconds)
                    let expirySeconds: number;
                    if (typeof order.account.expiryTs === 'object' && 'toNumber' in order.account.expiryTs) {
                      expirySeconds = order.account.expiryTs.toNumber();
                    } else {
                      expirySeconds = Number(order.account.expiryTs);
                    }
                    
                    // Convert seconds to milliseconds for JavaScript Date
                    const expiryDate = new Date(expirySeconds * 1000);
                    
                    // Check if valid date
                    if (isNaN(expiryDate.getTime())) {
                      return 'Invalid Date';
                    }
                    
                    return expiryDate.toLocaleString();
                  } catch (error) {
                    console.error('Error formatting expiry date:', error);
                    return 'Error displaying date';
                  }
                })()}
                {isExpired && <span className="ml-2 text-xs bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 px-2 py-1 rounded">EXPIRED</span>}
              </p>
            </div>

            {/* Payment QR */}
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Payment Details
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowQR(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2"
                >
                  📱 Show QR Code
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(order.account.qrString);
                    alert("Copied to clipboard!");
                  }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium"
                >
                  📋 Copy Link
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t dark:border-gray-700 pt-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Actions</h3>
              
              {/* Expired - Auto Release (for creator) */}
              {isExpired && isCreator && order.account.status !== 3 && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-800 dark:text-red-200 font-medium mb-3">
                    ⚠️ This request has expired. You can reclaim your funds.
                  </p>
                  <button
                    onClick={handleAutoRelease}
                    disabled={processing}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ArrowLeft className="w-5 h-5" />
                        Reclaim Funds
                      </>
                    )}
                  </button>
                </div>
              )}
              
              {/* Join Request (for non-creators when pending and not expired) - Status 0 */}
              {!isCreator && !isHelper && order.account.status === 0 && !isExpired && (
                <button
                  onClick={handleJoinRequest}
                  disabled={processing}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Join as Helper"
                  )}
                </button>
              )}

              {/* Mark as Paid (for creator or helper when helper joined) - Status 1 */}
              {(isCreator || isHelper) && order.account.status === 1 && (
                <button
                  onClick={handleMarkPaid}
                  disabled={processing}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 mb-3"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Mark as Paid
                    </>
                  )}
                </button>
              )}

              {/* Release Funds (for creator when paid) - Status 2 */}
              {isCreator && order.account.status === 2 && (
                <button
                  onClick={handleReleaseFunds}
                  disabled={processing}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Release Funds to Helper
                    </>
                  )}
                </button>
              )}

              {/* No actions available - Status 3 (Released) */}
              {order.account.status === 3 && (
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
                  <p className="text-green-800 dark:text-green-200 font-medium">
                    Transaction Completed
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showQR && (
        <QRDisplay data={order.account.qrString} onClose={() => setShowQR(false)} />
      )}
    </div>
  );
}
