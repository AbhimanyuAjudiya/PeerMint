"use client";

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { getProgram } from "@/lib/anchor";
import { PublicKey } from "@solana/web3.js";
import { CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import BN from "bn.js";

interface Order {
  publicKey: PublicKey;
  account: {
    creator: PublicKey;
    helper: PublicKey | null;
    amount: BN;
    fee: BN;
    qrString: string;
    expiry: BN;
    nonce: BN;
    status: any;
    escrowAta: PublicKey;
  };
}

export default function MyOrders() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (wallet.publicKey) {
      fetchMyOrders();
    }
  }, [wallet.publicKey]);

  const fetchMyOrders = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) return;

    try {
      setLoading(true);
      const provider = new AnchorProvider(connection, wallet as any, {});
      const program = getProgram(provider);
      
      // Fetch all orders where user is the creator
      const allOrders = await program.account.order.all();
      const userOrders = allOrders.filter(
        (order) => order.account.creator.toString() === wallet.publicKey!.toString()
      );
      
      setMyOrders(userOrders);
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (orderPubkey: PublicKey) => {
    if (!wallet.publicKey || !wallet.signTransaction) return;

    try {
      const provider = new AnchorProvider(connection, wallet as any, {});
      const program = getProgram(provider);
      
      await program.methods
        .markPaid()
        .accounts({
          order: orderPubkey,
          helper: wallet.publicKey,
        })
        .rpc();

      alert("Order marked as paid!");
      fetchMyOrders();
    } catch (err) {
      console.error("Error marking paid:", err);
      alert("Failed to mark order as paid");
    }
  };

  const handleRelease = async (orderPubkey: PublicKey, order: Order) => {
    if (!wallet.publicKey || !wallet.signTransaction) return;

    try {
      const provider = new AnchorProvider(connection, wallet as any, {});
      const program = getProgram(provider);
      
      await program.methods
        .releaseFunds()
        .accounts({
          order: orderPubkey,
          creator: wallet.publicKey,
          helper: order.account.helper!,
          escrowAta: order.account.escrowAta,
        })
        .rpc();

      alert("Funds released!");
      fetchMyOrders();
    } catch (err) {
      console.error("Error releasing funds:", err);
      alert("Failed to release funds");
    }
  };

  const getStatusDisplay = (status: any) => {
    if (status.created) return { text: "Open", color: "blue", icon: Clock };
    if (status.joined) return { text: "Joined", color: "yellow", icon: AlertCircle };
    if (status.paid) return { text: "Paid", color: "green", icon: CheckCircle };
    if (status.completed) return { text: "Completed", color: "green", icon: CheckCircle };
    if (status.cancelled) return { text: "Cancelled", color: "red", icon: XCircle };
    return { text: "Unknown", color: "gray", icon: AlertCircle };
  };

  if (!wallet.publicKey) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">My Requests</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Please connect your wallet to view your requests
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">My Requests</h2>
        <button
          onClick={fetchMyOrders}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      ) : myOrders.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400">
          You haven't created any requests yet
        </p>
      ) : (
        <div className="space-y-4">
          {myOrders.map((order) => {
            const status = getStatusDisplay(order.account.status);
            const StatusIcon = status.icon;
            const amount = order.account.amount.toNumber() / 1_000_000;
            const fee = order.account.fee.toNumber();
            const isHelper = order.account.helper?.toString() === wallet.publicKey?.toString();
            
            return (
              <div
                key={order.publicKey.toString()}
                className="border dark:border-gray-700 rounded-lg p-4"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <StatusIcon className={`w-5 h-5 text-${status.color}-500`} />
                      <span className={`font-semibold text-${status.color}-500`}>
                        {status.text}
                      </span>
                    </div>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {(order.account as any).inrAmount && (order.account as any).inrAmount > 0 ? (
                      <>
                        <p className="text-2xl font-bold text-green-600">
                          ₹{(Number((order.account as any).inrAmount) / 100).toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          ≈ {amount} USDC • Fee: {fee / 100}%
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-2xl font-bold">{amount} USDC</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Fee: {fee / 100}%
                        </p>
                      </>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {new Date(order.account.expiry.toNumber() * 1000).toLocaleString()}
                    </p>
                  </div>
                </div>

                {order.account.helper && (
                  <div className="mb-3 text-sm">
                    <p className="text-gray-600 dark:text-gray-400">
                      Helper: {order.account.helper.toString().slice(0, 8)}...
                    </p>
                  </div>
                )}

                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">Payment QR:</p>
                  <p className="text-sm font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto">
                    {order.account.qrString.slice(0, 50)}...
                  </p>
                </div>

                <div className="flex gap-2">
                  {/* If you're the creator and status is "Paid", show Release button */}
                  {order.account.status.paid && (
                    <button
                      onClick={() => handleRelease(order.publicKey, order)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
                    >
                      Release Funds
                    </button>
                  )}

                  {/* If you're the helper and status is "Joined", show Mark Paid button */}
                  {isHelper && order.account.status.joined && (
                    <button
                      onClick={() => handleMarkPaid(order.publicKey)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                    >
                      Mark as Paid
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
