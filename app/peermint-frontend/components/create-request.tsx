"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { SystemProgram, Transaction } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { getProgram, getOrderPda, USDC_MINT } from "@/lib/anchor";
import { shortenUrlWithFallback } from "@/lib/url-shortener";
import { Upload, Loader2, ScanLine } from "lucide-react";
import QRScannerComponent from "./qr-scanner";

export default function CreateRequest() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [amount, setAmount] = useState("");
  const [qrString, setQrString] = useState("");
  const [feeBps, setFeeBps] = useState("50");
  const [expiryHours, setExpiryHours] = useState("24");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  const handleCreate = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) return;

    try {
      setLoading(true);
      setSuccess("");

      // Shorten the QR string if it's too long
      let finalQrString = qrString;
      if (qrString.length > 200) {
        console.log("QR string too long, shortening...");
        finalQrString = await shortenUrlWithFallback(qrString);
        console.log("Shortened QR:", finalQrString);
        
        if (finalQrString.length > 200) {
          throw new Error("QR string still too long after shortening. Please use a shorter payment link.");
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const provider = new AnchorProvider(connection, wallet as any, {});
      const program = getProgram(provider);

      const nonce = Date.now();
      const amountLamports = Math.floor(parseFloat(amount) * 1_000_000);
      const expiryTs = Math.floor(Date.now() / 1000) + parseInt(expiryHours) * 3600;

      const [orderPda] = getOrderPda(wallet.publicKey, nonce);
      
      // Calculate token account addresses
      const sourceAta = await getAssociatedTokenAddress(
        USDC_MINT,
        wallet.publicKey
      );
      
      const escrowAta = await getAssociatedTokenAddress(
        USDC_MINT,
        orderPda,
        true // allowOwnerOffCurve - PDA can own token accounts
      );

      console.log("Source ATA:", sourceAta.toString());
      console.log("Escrow ATA:", escrowAta.toString());

      // Check if escrow ATA exists, create if it doesn't
      const escrowInfo = await connection.getAccountInfo(escrowAta);
      if (!escrowInfo) {
        console.log("Creating escrow token account...");
        const createAtaIx = createAssociatedTokenAccountInstruction(
          wallet.publicKey, // payer
          escrowAta,        // ata
          orderPda,         // owner (PDA)
          USDC_MINT        // mint
        );
        
        const createAtaTx = new Transaction().add(createAtaIx);
        const { blockhash } = await connection.getLatestBlockhash();
        createAtaTx.recentBlockhash = blockhash;
        createAtaTx.feePayer = wallet.publicKey;
        
        const signedTx = await wallet.signTransaction(createAtaTx);
        const createAtaSig = await connection.sendRawTransaction(signedTx.serialize());
        await connection.confirmTransaction(createAtaSig);
        console.log("Escrow ATA created:", createAtaSig);
      } else {
        console.log("Escrow ATA already exists");
      }

      console.log("Creating order with params:", {
        amount: amountLamports,
        expiry: expiryTs,
        fee: parseInt(feeBps),
        nonce,
        qrString: finalQrString,
      });

      const tx = await program.methods
        .createRequest(
          new BN(amountLamports),
          new BN(expiryTs),
          parseInt(feeBps),
          new BN(nonce),
          finalQrString
        )
        .accounts({
          creator: wallet.publicKey,
          order: orderPda,
          mint: USDC_MINT,
          sourceAta,
          escrowAta,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("Transaction successful:", tx);
      setSuccess(`Request created! TX: ${tx.slice(0, 8)}...`);
      setAmount("");
      setQrString("");
    } catch (err) {
      console.error("Full error:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      alert("Error creating request: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Upload className="w-6 h-6" />
        Create Payment Request
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Amount (USDC)
          </label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
            placeholder="10.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Payment QR Code
          </label>
          <div className="flex gap-2">
            <textarea
              value={qrString}
              onChange={(e) => setQrString(e.target.value)}
              className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
              placeholder="upi://pay?pa=yourname@paytm&am=10"
              rows={3}
            />
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 h-fit"
              title="Scan QR Code"
            >
              <ScanLine className="w-5 h-5" />
              Scan
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Enter manually or click &quot;Scan&quot; to use your camera
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Fee (basis points)
            </label>
            <input
              type="number"
              value={feeBps}
              onChange={(e) => setFeeBps(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
              placeholder="50"
            />
            <p className="text-xs text-gray-500 mt-1">
              {(parseInt(feeBps) / 100).toFixed(2)}% fee
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Expiry (hours)
            </label>
            <input
              type="number"
              value={expiryHours}
              onChange={(e) => setExpiryHours(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
              placeholder="24"
            />
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={loading || !wallet.connected}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Request"
          )}
        </button>

        {success && (
          <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 p-3 rounded-lg">
            {success}
          </div>
        )}
      </div>

      {showScanner && (
        <QRScannerComponent
          onScan={(result) => {
            setQrString(result);
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
