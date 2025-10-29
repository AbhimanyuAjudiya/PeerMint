"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import CreateRequest from "@/components/create-request";
import OrderList from "@/components/order-list";
import { Coins } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Header */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Coins className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                PeerMint
              </h1>
            </div>
            <WalletMultiButton />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-4">
            Peer-to-Peer Fiat to Crypto Exchange
          </h2>
          <p className="text-xl opacity-90 mb-8">
            Secure escrow system for seamless fiat to USDC conversion
          </p>
          <div className="flex justify-center gap-8 text-sm">
            <div>
              <div className="text-3xl font-bold">🔒</div>
              <p className="mt-2">Escrow Protected</p>
            </div>
            <div>
              <div className="text-3xl font-bold">⚡</div>
              <p className="mt-2">Instant Settlement</p>
            </div>
            <div>
              <div className="text-3xl font-bold">🌍</div>
              <p className="mt-2">Global Access</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-8">
          <CreateRequest />
          <OrderList />
        </div>

        {/* How It Works */}
        <div className="mt-16 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h3 className="text-2xl font-bold mb-6">How It Works</h3>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                1
              </div>
              <h4 className="font-semibold mb-2">Create Request</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Upload your fiat payment QR and deposit USDC into escrow
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                2
              </div>
              <h4 className="font-semibold mb-2">Helper Joins</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Someone fulfills your request by paying via the QR code
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                3
              </div>
              <h4 className="font-semibold mb-2">Mark Paid</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Helper confirms fiat payment sent
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                4
              </div>
              <h4 className="font-semibold mb-2">Release USDC</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                You acknowledge and USDC is released to helper
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-400 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>Built with ❤️ on Solana | PeerMint 2025</p>
        </div>
      </footer>
    </main>
  );
}
