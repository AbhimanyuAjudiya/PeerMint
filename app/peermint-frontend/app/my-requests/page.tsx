"use client";

import MyRequests from "@/components/my-requests";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function MyRequestsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            My Requests
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your payment requests and track their status
          </p>
        </div>

        <MyRequests />
      </div>
    </div>
  );
}
