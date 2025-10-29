"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { QrCode, X } from "lucide-react";

interface QRDisplayProps {
  data: string;
  onClose: () => void;
}

export default function QRDisplay({ data, onClose }: QRDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!canvasRef.current || !data) return;

    QRCode.toCanvas(canvasRef.current, data, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    }).catch((err) => {
      console.error("Failed to generate QR code:", err);
      setError("Failed to generate QR code");
    });
  }, [data]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <QrCode className="w-6 h-6" />
            Payment QR Code
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error ? (
          <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-4 rounded-lg">
            {error}
          </div>
        ) : (
          <>
            <div className="flex justify-center mb-4 bg-white p-4 rounded-lg">
              <canvas ref={canvasRef} />
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
              <p className="text-xs text-gray-600 dark:text-gray-400 break-all">
                {data}
              </p>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 text-center">
              Scan this QR code to make the payment
            </p>
          </>
        )}
      </div>
    </div>
  );
}
