/**
 * Barcode & QR Code Components
 * Scanning, generation, and label printing
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QrCode,
  Scan,
  Printer,
  Download,
  Check,
  X,
  Camera
} from 'lucide-react';
import type { BarcodeData, LabelItem } from '@/types/store-enhanced';

// ==========================================
// QR CODE SCANNER
// ==========================================

interface QRScannerProps {
  onScan: (data: BarcodeData) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [scanning] = useState(true);
  const [manualEntry, setManualEntry] = useState('');

  const handleManualSubmit = () => {
    try {
      const data = JSON.parse(manualEntry) as BarcodeData;
      onScan(data);
      onClose();
    } catch {
      alert('Invalid QR code data');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600">
                <QrCode className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Scan QR Code</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/5 transition-colors text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scanner Area */}
        <div className="p-6 space-y-4">
          <div className="aspect-square bg-black/40 rounded-2xl border-2 border-dashed border-blue-500/30 flex items-center justify-center overflow-hidden relative">
            {scanning ? (
              <>
                <Camera className="w-16 h-16 text-blue-400 opacity-30" />
                <motion.div
                  className="absolute inset-x-0 h-1 bg-blue-500"
                  animate={{ y: [0, 400, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
              </>
            ) : (
              <div className="text-center">
                <Check className="w-16 h-16 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-zinc-400">Code scanned successfully!</p>
              </div>
            )}
          </div>

          <div className="text-center text-sm text-zinc-400">
            Position the QR code within the frame
          </div>

          <div className="pt-4 border-t border-white/10">
            <p className="text-sm text-zinc-400 mb-3">Or enter code manually:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualEntry}
                onChange={(e) => setManualEntry(e.target.value)}
                placeholder="Paste QR code data..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleManualSubmit}
                disabled={!manualEntry}
                className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium transition-all"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ==========================================
// QR CODE GENERATOR
// ==========================================

interface QRGeneratorProps {
  data: BarcodeData;
  size?: number;
}

export function QRCodeDisplay({ data, size = 200 }: QRGeneratorProps) {
  const qrData = JSON.stringify(data);
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(qrData)}`;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `qr-${data.code}.png`;
    link.click();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="p-4 bg-white rounded-2xl">
        <img src={qrCodeUrl} alt="QR Code" className="w-full h-full" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-white">{data.name}</p>
        <p className="text-sm text-zinc-400">{data.code}</p>
      </div>
      <button
        onClick={handleDownload}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-xl text-sm font-medium transition-all"
      >
        <Download className="w-4 h-4" />
        Download QR Code
      </button>
    </div>
  );
}

// ==========================================
// LABEL PRINTING
// ==========================================

interface LabelPrintProps {
  items: LabelItem[];
  onClose: () => void;
}

export function LabelPrintDialog({ items, onClose }: LabelPrintProps) {
  const [template, setTemplate] = useState<'standard' | 'compact' | 'detailed'>('standard');

  const handlePrint = () => {
    window.print();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 sticky top-0 bg-zinc-900/95 backdrop-blur-xl z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600">
                <Printer className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Print Labels</h2>
                <p className="text-sm text-zinc-400">{items.length} labels to print</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/5 transition-colors text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Template Selector */}
          <div className="flex gap-2">
            {(['standard', 'compact', 'detailed'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTemplate(t)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  template === t
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Preview Area */}
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {items.map((item, index) => (
              <LabelPreview key={index} item={item} template={template} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-zinc-900/95 backdrop-blur-xl sticky bottom-0 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 rounded-xl font-medium transition-all flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print Labels
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ==========================================
// LABEL PREVIEW
// ==========================================

interface LabelPreviewProps {
  item: LabelItem;
  template: 'standard' | 'compact' | 'detailed';
}

function LabelPreview({ item, template }: LabelPreviewProps) {
  const qrSize = template === 'compact' ? 80 : template === 'detailed' ? 120 : 100;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(item.qrData)}`;

  if (template === 'compact') {
    return (
      <div className="bg-white p-3 rounded-lg border border-zinc-200">
        <div className="flex gap-2">
          <img src={qrUrl} alt="QR" className="w-20 h-20" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-black text-xs truncate">{item.itemName}</p>
            <p className="text-xs text-zinc-600">{item.code}</p>
          </div>
        </div>
      </div>
    );
  }

  if (template === 'detailed') {
    return (
      <div className="bg-white p-4 rounded-lg border-2 border-zinc-300">
        <div className="text-center mb-2">
          <p className="font-bold text-black text-sm">{item.itemName}</p>
          <p className="text-xs text-zinc-600">{item.code}</p>
        </div>
        <div className="flex justify-center mb-2">
          <img src={qrUrl} alt="QR" className="w-30 h-30" />
        </div>
        {item.quantity && (
          <p className="text-xs text-center text-zinc-600">Qty: {item.quantity}</p>
        )}
        {item.location && (
          <p className="text-xs text-center text-zinc-600">Loc: {item.location}</p>
        )}
        {item.expiryDate && (
          <p className="text-xs text-center text-red-600">Exp: {item.expiryDate}</p>
        )}
      </div>
    );
  }

  // Standard template
  return (
    <div className="bg-white p-4 rounded-lg border border-zinc-200">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-black text-sm truncate">{item.itemName}</p>
          <p className="text-xs text-zinc-600">{item.code}</p>
        </div>
      </div>
      <div className="flex justify-center">
        <img src={qrUrl} alt="QR" className="w-25 h-25" />
      </div>
    </div>
  );
}

// ==========================================
// QUICK SCAN BUTTON
// ==========================================

interface QuickScanButtonProps {
  onScan: (data: BarcodeData) => void;
}

export function QuickScanButton({ onScan }: QuickScanButtonProps) {
  const [showScanner, setShowScanner] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowScanner(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-xl font-medium transition-all shadow-lg shadow-blue-500/20"
      >
        <Scan className="w-4 h-4" />
        Scan QR Code
      </button>

      <AnimatePresence>
        {showScanner && (
          <QRScanner
            onScan={onScan}
            onClose={() => setShowScanner(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
