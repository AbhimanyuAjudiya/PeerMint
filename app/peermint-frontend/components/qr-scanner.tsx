"use client";

import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { Camera, X, CheckCircle } from "lucide-react";

interface QRScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export default function QRScannerComponent({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [error, setError] = useState<string>("");
  const [scanned, setScanned] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);

  useEffect(() => {
    if (!videoRef.current) return;

    const initScanner = async () => {
      try {
        QrScanner.WORKER_PATH = '/qr-scanner-worker.min.js';
        
        const cameraAvailable = await QrScanner.hasCamera();
        if (!cameraAvailable) {
          setError("No camera found on this device.");
          return;
        }
        setHasCamera(true);

        const qrScanner = new QrScanner(
          videoRef.current!,
          (result) => {
            if (!scanned) {
              console.log("QR Code detected:", result.data);
              setScanned(true);
              onScan(result.data);
              
              setTimeout(() => {
                qrScanner?.stop();
                onClose();
              }, 1000);
            }
          },
          {
            returnDetailedScanResult: true,
            highlightScanRegion: true,
            highlightCodeOutline: true,
            maxScansPerSecond: 5,
            preferredCamera: 'environment',
          }
        );

        await qrScanner.start();
        scannerRef.current = qrScanner;
        console.log("QR Scanner started successfully");
      } catch (err) {
        console.error("Failed to start QR scanner:", err);
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(`Camera error: ${errorMessage}. Please allow camera access.`);
      }
    };

    initScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty - only run once on mount

  const handleClose = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Camera className="w-6 h-6" />
            Scan QR Code
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error ? (
          <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-4 rounded-lg">
            <p className="font-semibold mb-2">Error</p>
            <p className="text-sm">{error}</p>
            <button
              onClick={handleClose}
              className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full rounded-lg bg-black"
              style={{ maxHeight: "400px", minHeight: "300px" }}
              playsInline
              muted
            />
            {scanned && (
              <div className="absolute inset-0 bg-green-500 bg-opacity-20 flex items-center justify-center rounded-lg">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                  <p className="text-center mt-2 font-semibold">Scanned!</p>
                </div>
              </div>
            )}
            {!scanned && hasCamera && (
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <div className="inline-block bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg text-sm">
                  Position QR code within frame
                </div>
              </div>
            )}
          </div>
        )}

        {!error && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 text-center">
            {hasCamera 
              ? "Point your camera at a QR code to scan" 
              : "Initializing camera..."}
          </p>
        )}
      </div>
    </div>
  );
}
