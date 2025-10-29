"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, ExternalLink, QrCode, TrendingUp, CheckCircle2, Clock, DollarSign } from "lucide-react";
import Link from "next/link";

interface PaymentRequest {
  id: string;
  requestNumber: string;
  amount: string;
  currency: string;
  helperFee: string;
  status: "pending" | "completed";
  qrString: string;
  createdAt: string;
  expiryInfo: string;
}

// Mock data - replace with actual blockchain data
const mockRequests: PaymentRequest[] = [
  {
    id: "1",
    requestNumber: "18876022",
    amount: "1.00",
    currency: "USDC",
    helperFee: "5%",
    status: "pending",
    qrString: "upi://pay?pa=merchant@paytm&pn=PeerMint&am=100&cu=INR&tn=Payment",
    createdAt: "2024-03-15",
    expiryInfo: "No expiry"
  },
  {
    id: "2",
    requestNumber: "18876021",
    amount: "2.50",
    currency: "USDC",
    helperFee: "5%",
    status: "completed",
    qrString: "upi://pay?pa=merchant@paytm&pn=PeerMint&am=250&cu=INR&tn=Payment",
    createdAt: "2024-03-14",
    expiryInfo: "No expiry"
  },
  {
    id: "3",
    requestNumber: "18876020",
    amount: "0.75",
    currency: "USDC",
    helperFee: "5%",
    status: "completed",
    qrString: "upi://pay?pa=merchant@paytm&pn=PeerMint&am=75&cu=INR&tn=Payment",
    createdAt: "2024-03-13",
    expiryInfo: "No expiry"
  }
];

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<PaymentRequest[]>(mockRequests);
  const [selectedQR, setSelectedQR] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    volume: 0
  });

  useEffect(() => {
    // Calculate stats
    const completed = requests.filter(r => r.status === "completed").length;
    const pending = requests.filter(r => r.status === "pending").length;
    const volume = requests.reduce((sum, r) => sum + parseFloat(r.amount), 0);

    // Animate numbers
    const duration = 1000;
    const steps = 50;
    const interval = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      setStats({
        total: Math.floor(requests.length * progress),
        completed: Math.floor(completed * progress),
        pending: Math.floor(pending * progress),
        volume: volume * progress
      });

      if (step >= steps) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, [requests]);

  const truncateString = (str: string, maxLength: number = 40) => {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + "...";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0B1A] via-[#131326] to-[#0B0B1A] relative overflow-hidden">
      {/* Background Noise Texture */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')]" />
      </div>

      <div className="relative z-10 max-w-[1000px] mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-[#9CA3AF] hover:text-[#00D09C] transition-colors duration-300 mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" />
          <span className="text-sm font-medium">Back to Home</span>
        </Link>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-[28px] font-bold text-[#E5E7EB] mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
            My Requests
          </h1>
          <p className="text-[16px] text-[#9CA3AF] mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
            Manage your payment requests and track their status in real-time.
          </p>
          <div className="h-[1px] bg-white/8" />
        </div>

        {/* Live Stats Bar */}
        <div className="mb-8 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Total Requests */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-[#00D09C]" />
                <span className="text-[#9CA3AF] text-xs uppercase tracking-wider">Total</span>
              </div>
              <div className="text-2xl font-bold text-[#F3F4F6]">
                {stats.total.toLocaleString()}
              </div>
            </div>

            {/* Completed */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                <span className="text-[#9CA3AF] text-xs uppercase tracking-wider">Completed</span>
              </div>
              <div className="text-2xl font-bold text-[#22C55E]">
                {stats.completed.toLocaleString()}
              </div>
            </div>

            {/* Pending */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-[#FACC15]" />
                <span className="text-[#9CA3AF] text-xs uppercase tracking-wider">Pending</span>
              </div>
              <div className="text-2xl font-bold text-[#FACC15]">
                {stats.pending.toLocaleString()}
              </div>
            </div>

            {/* Volume */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-[#C084FC]" />
                <span className="text-[#9CA3AF] text-xs uppercase tracking-wider">Volume</span>
              </div>
              <div className="text-2xl font-bold bg-gradient-to-r from-[#00D09C] to-[#C084FC] bg-clip-text text-transparent">
                ${stats.volume.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Request Cards */}
        <div className="space-y-4">
          {requests.map((request, index) => (
            <div
              key={request.id}
              className="group p-6 rounded-[24px] bg-white/[0.03] border border-white/[0.08] backdrop-blur-[16px] shadow-[0_6px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_4px_24px_rgba(0,208,156,0.1)] transition-all duration-500 hover:-translate-y-1"
              style={{
                animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`
              }}
            >
              {/* Top Row */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold bg-gradient-to-r from-[#00D09C] to-[#3B82F6] bg-clip-text text-transparent mb-1">
                    Request #{request.requestNumber}
                  </h3>
                  <p className="text-sm text-[#9CA3AF]">{request.expiryInfo}</p>
                </div>
                <div>
                  {request.status === "pending" ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EAB308]/15 text-[#FACC15] text-sm font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      Pending
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#22C55E]/15 text-[#22C55E] text-sm font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Completed
                    </span>
                  )}
                </div>
              </div>

              {/* Middle Row - Grid */}
              <div className="grid grid-cols-2 gap-6 mb-4">
                {/* Helper Pays */}
                <div>
                  <label className="block text-xs text-[#9CA3AF] uppercase tracking-wider mb-1">
                    Helper Pays (INR)
                  </label>
                  <div className="text-xl font-semibold text-[#F3F4F6]">
                    {request.amount} {request.currency}
                  </div>
                </div>

                {/* Helper Fee */}
                <div>
                  <label className="block text-xs text-[#9CA3AF] uppercase tracking-wider mb-1">
                    Helper Fee
                  </label>
                  <div className="text-xl font-semibold text-[#00D09C]">
                    {request.helperFee}
                  </div>
                </div>
              </div>

              {/* QR Section */}
              <div className="mb-4">
                <label className="block text-xs text-[#9CA3AF] uppercase tracking-wider mb-2">
                  Payment QR
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 px-4 py-3 bg-black/30 border border-white/[0.06] rounded-xl text-sm text-[#9CA3AF] font-mono">
                    {truncateString(request.qrString)}
                  </div>
                  <button
                    onClick={() => setSelectedQR(request.qrString)}
                    className="flex items-center gap-2 px-4 py-3 text-[#00D09C] hover:text-[#00F0B5] transition-colors duration-300 font-medium text-sm"
                  >
                    <QrCode className="w-4 h-4" />
                    Show QR
                  </button>
                </div>
              </div>

              {/* Action Button */}
              <button className="group/btn relative w-full px-6 py-4 rounded-2xl font-bold text-white shadow-lg overflow-hidden transition-all duration-300 hover:scale-[1.03]">
                {/* Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#00D09C] to-[#3B82F6]" />
                {/* Hover Glow */}
                <div className="absolute inset-0 opacity-0 group-hover/btn:opacity-100 shadow-[0_0_30px_rgba(0,209,156,0.6)] transition-opacity duration-300" />
                {/* Content */}
                <div className="relative flex items-center justify-center gap-2">
                  <span>View Details</span>
                  <ExternalLink className="w-4 h-4" />
                </div>
              </button>
            </div>
          ))}
        </div>

        {/* Empty State (show when no requests) */}
        {requests.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center">
              <Clock className="w-10 h-10 text-[#9CA3AF]" />
            </div>
            <h3 className="text-xl font-bold text-[#E5E7EB] mb-2">No Requests Yet</h3>
            <p className="text-[#9CA3AF] mb-6">Create your first payment request to get started.</p>
            <Link 
              href="/create"
              className="inline-block px-6 py-3 bg-gradient-to-r from-[#00D09C] to-[#3B82F6] rounded-xl text-white font-bold hover:scale-105 transition-transform duration-300"
            >
              Create Request
            </Link>
          </div>
        )}
      </div>

      {/* QR Modal */}
      {selectedQR && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedQR(null)}
        >
          <div 
            className="relative p-8 bg-white rounded-3xl shadow-2xl max-w-md w-full animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedQR(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              ×
            </button>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Payment QR Code</h3>
            <div className="bg-gray-50 p-4 rounded-xl mb-4">
              <div className="aspect-square bg-white flex items-center justify-center">
                {/* QR Code would be generated here */}
                <QrCode className="w-48 h-48 text-gray-300" />
              </div>
            </div>
            <div className="text-sm text-gray-600 break-all font-mono bg-gray-50 p-3 rounded-lg">
              {selectedQR}
            </div>
          </div>
        </div>
      )}

      {/* Animations */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }

        .animate-scale-in {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
