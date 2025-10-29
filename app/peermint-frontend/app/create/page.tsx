"use client";

import CreateRequest from "@/components/create-request";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CreateRequestPage() {
  const wallet = useAnchorWallet();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Create Payment Request
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create a secure payment request with USDC on Solana
          </p>
        </div>

        {!wallet ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Please connect your wallet to create a payment request
            </p>
          </div>
        ) : (
          <CreateRequest />
        )}

        {/* How It Works Section */}
        <div className="mt-12 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Create Request
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Fill in the amount, UPI details, and expiry time. Your USDC will be locked in escrow.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Helper Joins & Pays
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                A helper scans your UPI QR code, pays in INR, and marks the transaction as paid.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Release Funds
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Once you confirm payment, release the USDC from escrow to the helper.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
