"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Search, Filter, Copy, ExternalLink, CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { getProgram } from "@/lib/anchor";
import { PublicKey } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import BN from "bn.js";

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
  creator: string;
  helper: string | null;
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

export default function ExplorePage() {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "completed" | "expired">("all");

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
    fetchAllRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet?.publicKey, connection]);

  const fetchAllRequests = async () => {
    if (!wallet) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const provider = new AnchorProvider(connection, wallet, {});
      const program = getProgram(provider);

      // Fetch all order accounts with better error handling
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let allOrders: any[] = [];
      try {
        // Get all program accounts without filters
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
            // This is expected and won't affect functionality
          }
        }
      } catch (error) {
        console.error("Error fetching program accounts:", error);
        allOrders = [];
      }

      const transformedRequests: PaymentRequest[] = allOrders
        .filter((order: Order) => {
          try {
            return order.account && order.account.creator && order.publicKey;
          } catch {
            return false;
          }
        })
        .map((order: Order) => {
          try {
            const amounts = formatAmount(order.account.amount);
            const status = getStatusFromCode(order.account.status);
            const expiryInfo = getExpiryInfo(order.account.expiry, order.account.status);

            return {
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
              creator: order.account.creator.toString(),
              helper: order.account.helper?.toString() || null,
            };
          } catch (error) {
            console.error('Error transforming order:', error);
            return null;
          }
        })
        .filter((req: PaymentRequest | null): req is PaymentRequest => req !== null)
        .sort((a: PaymentRequest, b: PaymentRequest) => {
          const statusPriority: Record<string, number> = { pending: 0, completed: 1, expired: 2 };
          const aPriority = statusPriority[a.status];
          const bPriority = statusPriority[b.status];
          if (aPriority !== bPriority) return aPriority - bPriority;
          return parseInt(b.requestNumber) - parseInt(a.requestNumber);
        });

      setRequests(transformedRequests);
    } catch (error) {
      console.error('Error fetching all requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.requestNumber.includes(searchQuery) ||
      request.status.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = 
      filterStatus === "all" || request.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-[#EDEDED]">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link 
                href="/"
                className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-[#F8F8F8] transition-colors text-[#111111]"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Back</span>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-[#111111]">Explore Requests</h1>
                <p className="text-[#666666] text-sm mt-1">Browse and join available payment requests</p>
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#999999]" />
              <input
                type="text"
                placeholder="Search by ID or status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-full border border-[#EDEDED] focus:outline-none focus:border-[#9FFFCB] transition-colors text-[#111111] placeholder:text-[#999999] bg-[#F8F8F8]"
              />
            </div>
            
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#999999] pointer-events-none" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as "all" | "pending" | "completed" | "expired")}
                className="pl-12 pr-8 py-3 rounded-full border border-[#EDEDED] focus:outline-none focus:border-[#9FFFCB] transition-colors text-[#111111] bg-[#F8F8F8] appearance-none cursor-pointer min-w-[150px]"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-12">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-[#9FFFCB] animate-spin mx-auto mb-4" />
              <p className="text-[#666666]">Loading requests...</p>
            </div>
          </div>
        ) : !wallet ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-md">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#BFFFE0]/20 to-[#E8E0FF]/20 border border-[#EDEDED] flex items-center justify-center">
                <XCircle className="w-12 h-12 text-[#999999]" />
              </div>
              <h2 className="text-2xl font-bold text-[#111111] mb-3">Connect Your Wallet</h2>
              <p className="text-[#666666] mb-6">
                Please connect your wallet to explore payment requests
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRequests.length === 0 ? (
              <div className="col-span-full">
                <div className="text-center py-20">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#BFFFE0]/20 to-[#E8E0FF]/20 border border-[#EDEDED] flex items-center justify-center">
                    <Search className="w-12 h-12 text-[#999999]" />
                  </div>
                  <h3 className="text-xl font-bold text-[#111111] mb-2">No requests found</h3>
                  <p className="text-[#666666]">
                    {searchQuery || filterStatus !== "all" 
                      ? "Try adjusting your search or filters" 
                      : "No payment requests available at the moment"}
                  </p>
                </div>
              </div>
            ) : (
              filteredRequests.map((request) => (
                <div
                  key={request.id}
                  className="group relative bg-white rounded-3xl border border-[#EDEDED] p-6 hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300"
                >
                  {/* Hover Gradient Effect */}
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#BFFFE0]/10 via-transparent to-[#E8E0FF]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Content */}
                  <div className="relative">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-xs text-[#999999] font-medium mb-1">Request #{request.requestNumber}</p>
                        <h3 className="text-2xl font-bold text-[#111111]">₹{request.inrAmount}</h3>
                        <p className="text-sm text-[#666666] mt-1">{request.amount} {request.currency}</p>
                      </div>
                      
                      {/* Status Badge */}
                      {request.status === "pending" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFE8A3] border border-[#FFD770] text-[#996A00] text-xs font-medium">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      ) : request.status === "completed" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#CFF8D8] border border-[#9EF0B3] text-[#00662E] text-xs font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFD6D6] border border-[#FFAAAA] text-[#CC0000] text-xs font-medium">
                          <XCircle className="w-3 h-3" />
                          Expired
                        </span>
                      )}
                    </div>

                    {/* Details Grid */}
                    <div className="space-y-3 mb-5">
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-[#BFFFE0]/20 to-[#E1F0FF]/20 border border-[#EDEDED]">
                        <div className="text-xs text-[#666666] mb-1 font-medium">Helper Fee</div>
                        <div className="text-lg font-bold text-[#111111]">{request.helperFee}</div>
                      </div>

                      <div className="p-4 rounded-2xl bg-gradient-to-br from-[#E8E0FF]/20 to-[#FFF2E5]/20 border border-[#EDEDED]">
                        <div className="text-xs text-[#666666] mb-1 font-medium">Status</div>
                        <div className="text-sm font-medium text-[#111111]">{request.expiryInfo}</div>
                      </div>
                    </div>

                    {/* QR Code */}
                    <div className="mb-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-[#666666] font-medium">QR Code</span>
                        <button
                          onClick={() => copyToClipboard(request.qrString)}
                          className="text-[#9FFFCB] hover:text-[#7FFFB3] transition-colors p-1.5 rounded-lg hover:bg-[#F8F8F8]"
                          title="Copy QR string"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-xs text-[#999999] font-mono bg-[#F8F8F8] p-3 rounded-xl border border-[#EDEDED] truncate">
                        {request.qrString}
                      </div>
                    </div>

                    {/* Action Button */}
                    <Link 
                      href={`/request/${request.id}`}
                      className="group/btn relative w-full px-5 py-3.5 rounded-full font-semibold text-[#111111] shadow-lg overflow-hidden transition-all duration-300 hover:shadow-[0_8px_24px_rgba(140,255,200,0.3)] block"
                    >
                      {/* Animated Pastel Gradient Background */}
                      <div className="absolute inset-0 bg-gradient-to-r from-[#BFFFE0] via-[#9FFFCB] to-[#E8E0FF] bg-[length:200%_100%] group-hover/btn:animate-gradient-shift" />
                      {/* Content */}
                      <div className="relative flex items-center justify-center gap-2 text-sm font-bold">
                        <span>View Details</span>
                        <ExternalLink className="w-4 h-4" />
                      </div>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes gradient-shift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        .animate-gradient-shift {
          animation: gradient-shift 4s ease infinite;
        }
      `}</style>
    </div>
  );
}
