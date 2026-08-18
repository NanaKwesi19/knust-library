import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Modal } from './Modal';
import { Camera, AlertCircle } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called once per open session with the first code detected by the camera. */
  onDetected: (code: string) => void;
  title?: string;
  description?: string;
}

const SCANNER_ELEMENT_ID = 'barcode-scanner-viewport';

/**
 * Camera-based barcode/QR scanner. Wraps html5-qrcode's controlled Html5Qrcode
 * class (not the bundled Html5QrcodeScanner UI) so it renders inside our own
 * Modal and matches the rest of the app's styling. Works for both 1D book
 * barcodes and QR codes (e.g. a student's digital library card).
 */
export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onDetected,
  title = 'Scan Barcode / QR Code',
  description = 'Point the camera at a book barcode or a student ID QR code.',
}) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const detectedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    detectedRef.current = false;
    setError(null);
    setStarting(true);

    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, { verbose: false });
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 160 } },
        (decodedText) => {
          if (cancelled || detectedRef.current) return;
          detectedRef.current = true;
          onDetected(decodedText.trim());
          scanner.stop().catch(() => {});
        },
        () => {
          /* Per-frame "nothing found in this frame" - expected constantly, not an error. */
        }
      )
      .then(() => {
        if (!cancelled) setStarting(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setStarting(false);
        setError(
          err?.message?.includes('Permission')
            ? 'Camera permission was denied. Allow camera access and try again.'
            : 'Could not access a camera on this device.'
        );
      });

    return () => {
      cancelled = true;
      const activeScanner = scannerRef.current;
      scannerRef.current = null;
      if (activeScanner) {
        activeScanner
          .stop()
          .then(() => activeScanner.clear())
          .catch(() => {
            // Already stopped/never started - safe to ignore.
          });
      }
    };
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} description={description} size="sm">
      <div className="space-y-3">
        <div id={SCANNER_ELEMENT_ID} className="w-full rounded-xl overflow-hidden bg-slate-900 min-h-[220px]" />
        {starting && !error && <p className="text-[11px] text-slate-500 text-center">Starting camera&hellip;</p>}
        {error && (
          <div className="flex items-start gap-2 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        <p className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
          <Camera className="w-3 h-3" /> Requires camera permission
        </p>
      </div>
    </Modal>
  );
};
