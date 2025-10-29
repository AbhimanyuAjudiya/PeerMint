"use client";

import { useEffect, useState } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { getProgram, USDC_MINT } from "@/lib/anchor";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import QRDisplay from "./qr-display";
import { AnchorProvider } from "@coral-xyz/anchor";
import { CheckCircle, Clock, XCircle, Loader2 } from "lucide-react";
import BN from "bn.js";

interface Order {
  publicKey: PublicKey;
  account: {
    creator: PublicKey;
    helper: PublicKey | null;
    amount: BN;
    fee: BN;
    expiry: BN;
    qrString: string;
    status: { pending?: object; helperJoined?: object; paid?: object; released?: object; disputed?: object };
    nonce: BN;
  };
}

export default function MyRequests() {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [showQR, setShowQR] = useState<string | null>(null);
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);

  const fetchMyOrders = async () => {
    if (!wallet) return;

    try {
      setLoading(true);
      const provider = new AnchorProvider(connection, wallet, {});
      const program = getProgram(provider);
      const allOrders = await program.account.order.all();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const myOrdersList = allOrders.filter(
        (order: any) => order.account.creator.toString() === wallet.publicKey.toString()
      );

      setMyOrders(myOrdersList as Order[]);
    } catch (error) {
      console.error("Error fetching my orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet?.publicKey]);

  const handleShowQR = (qrString: string) => {
    // Since we're now storing the full URL on-chain (up to 500 chars), just show it directly
    setShowQR(qrString);
  };

  const handleMarkPaid = async (orderPubkey: PublicKey) => {
    if (!wallet) return;

    try {
      setProcessingOrder(orderPubkey.toString());
      const provider = new AnchorProvider(connection, wallet, {});
      const program = getProgram(provider);

      const orderPda = orderPubkey;
      const escrowAta = await getAssociatedTokenAddress(USDC_MINT, orderPda, true);

      await program.methods
        .markPaid()
        .accounts({
          helper: wallet.publicKey,
          order: orderPda,
          escrowAta: escrowAta,
        })
        .rpc();

      alert("Successfully marked as paid!");
      fetchMyOrders(); // Refresh the list
    } catch (error) {
      console.error("Error marking as paid:", error);
      alert("Failed to mark as paid. Please try again.");
    } finally {
      setProcessingOrder(null);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getStatusBadge = (status: any) => {
    if (status.pending) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          <Clock className="w-4 h-4" />
          Pending
        </span>
      );
    }
    if (status.helperJoined) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          <Clock className="w-4 h-4" />
          Helper Joined
        </span>
      );
    }
    if (status.paid) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
          <CheckCircle className="w-4 h-4" />
          Paid
        </span>
      );
    }
    if (status.released) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <CheckCircle className="w-4 h-4" />
          Released
        </span>
      );
    }
    if (status.disputed) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          <XCircle className="w-4 h-4" />
          Disputed
        </span>
      );
    }
    return null;
  };

  if (!wallet) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          Please connect your wallet to view your requests.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading your requests...</p>
      </div>
    );
  }

  if (myOrders.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          You haven't created any requests yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {myOrders.map((order) => (
        <div
          key={order.publicKey.toString()}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Request #{order.account.nonce?.toString() || 'N/A'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {order.account.expiry 
                  ? new Date(Number(order.account.expiry) * 1000).toLocaleString()
                  : 'No expiry'}
              </p>
            </div>
            {getStatusBadge(order.account.status)}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Amount</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {order.account.amount 
                  ? (Number(order.account.amount) / 1_000_000).toFixed(2)
                  : '0.00'} USDC
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Fee</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {order.account.fee ? Number(order.account.fee) : 0} bps
              </p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Payment QR</p>
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1 font-mono bg-gray-50 dark:bg-gray-700 p-2 rounded">
                {order.account.qrString}
              </p>
              <button
                onClick={() => handleShowQR(order.account.qrString)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium whitespace-nowrap"
              >
                Show QR
              </button>
            </div>
          </div>

          {order.account.helper && (
            <div className="mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Helper</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                {order.account.helper.toString().slice(0, 8)}...{order.account.helper.toString().slice(-8)}
              </p>
            </div>
          )}

          {order.account.status.helperJoined && !order.account.status.paid && (
            <button
              onClick={() => handleMarkPaid(order.publicKey)}
              disabled={processingOrder === order.publicKey.toString()}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2"
            >
              {processingOrder === order.publicKey.toString() ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Mark as Paid
                </>
              )}
            </button>
          )}
        </div>
      ))}

      {showQR && (
        <QRDisplay data={showQR} onClose={() => setShowQR(null)} />
      )}
    </div>
  );
}
