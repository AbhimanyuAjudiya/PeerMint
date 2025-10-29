"use client";

import { useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { getProgram, USDC_MINT } from "@/lib/anchor";
import { CheckCircle, Clock, XCircle, Loader2, QrCode } from "lucide-react";
import QRDisplay from "./qr-display";

interface Order {
  publicKey: PublicKey;
  account: any;
}

export default function OrderList() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showQR, setShowQR] = useState<string | null>(null);

  useEffect(() => {
    if (wallet.publicKey) {
      fetchOrders();
    }
  }, [wallet.publicKey]);

  const fetchOrders = async () => {
    if (!wallet.publicKey) return;

    try {
      setLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const provider = new AnchorProvider(connection, wallet as any, {});
      const program = getProgram(provider);

      const allOrders = await program.account.order.all();
      setOrders(allOrders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (orderPubkey: PublicKey) => {
    if (!wallet.publicKey || !wallet.signTransaction) return;

    try {
      setActionLoading(orderPubkey.toBase58());
      const provider = new AnchorProvider(connection, wallet as any, {});
      const program = getProgram(provider);

      await program.methods
        .joinRequest()
        .accounts({
          helper: wallet.publicKey,
          order: orderPubkey,
        })
        .rpc();

      await fetchOrders();
      alert("Joined successfully!");
    } catch (err) {
      console.error(err);
      alert("Error: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkPaid = async (orderPubkey: PublicKey) => {
    if (!wallet.publicKey || !wallet.signTransaction) return;

    try {
      setActionLoading(orderPubkey.toBase58());
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const provider = new AnchorProvider(connection, wallet as any, {});
      const program = getProgram(provider);

      await program.methods
        .markPaid(null)
        .accounts({
          helper: wallet.publicKey,
          order: orderPubkey,
        })
        .rpc();

      await fetchOrders();
      alert("Marked as paid!");
    } catch (err) {
      console.error(err);
      alert("Error: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRelease = async (orderPubkey: PublicKey, order: Order["account"]) => {
    if (!wallet.publicKey || !wallet.signTransaction) return;

    try {
      setActionLoading(orderPubkey.toBase58());
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const provider = new AnchorProvider(connection, wallet as any, {});
      const program = getProgram(provider);

      const escrowAta = await getAssociatedTokenAddress(
        USDC_MINT,
        orderPubkey,
        true
      );

      const helperAta = await getAssociatedTokenAddress(
        USDC_MINT,
        order.helper
      );

      const feeReceiverAta = await getAssociatedTokenAddress(
        USDC_MINT,
        order.creator
      );

      await program.methods
        .acknowledgeAndRelease()
        .accounts({
          creator: wallet.publicKey,
          order: orderPubkey,
          escrowAta,
          helperAta,
          feeReceiverAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      await fetchOrders();
      alert("Funds released!");
    } catch (err) {
      console.error(err);
      alert("Error: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: number) => {
    const statuses = [
      { label: "Created", color: "bg-gray-500", icon: Clock },
      { label: "Joined", color: "bg-blue-500", icon: Clock },
      { label: "Paid", color: "bg-yellow-500", icon: CheckCircle },
      { label: "Released", color: "bg-green-500", icon: CheckCircle },
      { label: "Disputed", color: "bg-red-500", icon: XCircle },
      { label: "Resolved", color: "bg-purple-500", icon: CheckCircle },
    ];
    const s = statuses[status] || statuses[0];
    const Icon = s.icon;
    return (
      <span className={`${s.color} text-white px-3 py-1 rounded-full text-sm flex items-center gap-1`}>
        <Icon className="w-4 h-4" />
        {s.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">All Orders</h2>
        <button
          onClick={fetchOrders}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Refresh
        </button>
      </div>

      {orders.length === 0 ? (
        <p className="text-center text-gray-500 py-8">No orders found</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.publicKey.toBase58()}
              className="border dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm text-gray-500">
                    {order.publicKey.toBase58().slice(0, 8)}...
                  </p>
                  <p className="text-2xl font-bold">
                    ${(order.account.amount / 1_000_000).toFixed(2)}
                  </p>
                </div>
                {getStatusBadge(order.account.status)}
              </div>

              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400 mb-3">
                <p>Creator: {order.account.creator.toBase58().slice(0, 12)}...</p>
                {order.account.helper && (
                  <p>Helper: {order.account.helper.toBase58().slice(0, 12)}...</p>
                )}
                <div className="flex items-center gap-2">
                  <p className="flex-1">QR: {order.account.qrString.slice(0, 40)}...</p>
                  <button
                    onClick={() => setShowQR(order.account.qrString)}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    title="View QR Code"
                  >
                    <QrCode className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                {order.account.status === 0 &&
                  !order.account.creator.equals(wallet.publicKey!) && (
                    <button
                      onClick={() => handleJoin(order.publicKey)}
                      disabled={actionLoading === order.publicKey.toBase58()}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
                    >
                      {actionLoading === order.publicKey.toBase58() ? "..." : "Join"}
                    </button>
                  )}

                {order.account.status === 1 &&
                  order.account.helper?.equals(wallet.publicKey!) && (
                    <button
                      onClick={() => handleMarkPaid(order.publicKey)}
                      disabled={actionLoading === order.publicKey.toBase58()}
                      className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded disabled:opacity-50"
                    >
                      {actionLoading === order.publicKey.toBase58()
                        ? "..."
                        : "Mark Paid"}
                    </button>
                  )}

                {order.account.status === 2 &&
                  order.account.creator.equals(wallet.publicKey!) && (
                    <button
                      onClick={() => handleRelease(order.publicKey, order.account)}
                      disabled={actionLoading === order.publicKey.toBase58()}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50"
                    >
                      {actionLoading === order.publicKey.toBase58()
                        ? "..."
                        : "Release Funds"}
                    </button>
                  )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showQR && (
        <QRDisplay
          data={showQR}
          onClose={() => setShowQR(null)}
        />
      )}
    </div>
  );
}
