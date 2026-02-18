'use client';

import React, { useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
  Printer, Download, Eye, X, Copy,
  Truck, FileCheck, Receipt, ClipboardList, Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Import Templates
import PurchaseOrderTemplate, { PurchaseOrderData, DEFAULT_PO_TERMS } from './PurchaseOrderTemplate';
import DeliveryChallanTemplate, { DeliveryChallanData } from './DeliveryChallanTemplate';
import TaxInvoiceTemplate, { TaxInvoiceData } from './TaxInvoiceTemplate';
import GoodsReceiptTemplate, { GoodsReceiptData } from './GoodsReceiptTemplate';

// ==========================================
// DOCUMENT TYPES
// ==========================================
export type DocumentType = 'PO' | 'DC' | 'INVOICE' | 'GRN';

export interface DocumentConfig {
  type: DocumentType;
  title: string;
  icon: React.ReactNode;
  copies: string[];
  color: string;
}

export const DOCUMENT_CONFIGS: Record<DocumentType, DocumentConfig> = {
  PO: {
    type: 'PO',
    title: 'Purchase Order',
    icon: <ClipboardList className="w-5 h-5" />,
    copies: ['ORIGINAL', 'DUPLICATE', 'VENDOR COPY', 'OFFICE COPY'],
    color: 'blue'
  },
  DC: {
    type: 'DC',
    title: 'Delivery Challan',
    icon: <Truck className="w-5 h-5" />,
    copies: ['ORIGINAL', 'DUPLICATE', 'TRIPLICATE', 'TRANSPORT COPY'],
    color: 'green'
  },
  INVOICE: {
    type: 'INVOICE',
    title: 'Tax Invoice',
    icon: <Receipt className="w-5 h-5" />,
    copies: ['ORIGINAL FOR RECIPIENT', 'DUPLICATE FOR TRANSPORTER', 'TRIPLICATE FOR SUPPLIER'],
    color: 'purple'
  },
  GRN: {
    type: 'GRN',
    title: 'Goods Receipt Note',
    icon: <FileCheck className="w-5 h-5" />,
    copies: ['ORIGINAL', 'STORE COPY', 'ACCOUNTS COPY', 'PURCHASE COPY'],
    color: 'orange'
  }
};

// ==========================================
// PRINT HUB COMPONENT
// ==========================================
interface DocumentPrintHubProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: DocumentType;
  data: PurchaseOrderData | DeliveryChallanData | TaxInvoiceData | GoodsReceiptData;
}

export const DocumentPrintHub: React.FC<DocumentPrintHubProps> = ({
  isOpen,
  onClose,
  documentType,
  data
}) => {
  const componentRef = useRef<HTMLDivElement>(null);
  const [selectedCopy, setSelectedCopy] = useState<string>(DOCUMENT_CONFIGS[documentType].copies[0]);
  const [showPreview, setShowPreview] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);

  const config = DOCUMENT_CONFIGS[documentType];

  // Print handler using react-to-print v3 API
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `${documentType}_${getDocumentNumber(data)}`,
    onBeforePrint: async () => {
      setIsPrinting(true);
    },
    onAfterPrint: () => {
      setIsPrinting(false);
    },
    pageStyle: `
      @page {
        size: A4;
        margin: 10mm;
      }
      @media print {
        html, body {
          height: 100%;
          margin: 0 !important;
          padding: 0 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .doc-container {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 20px !important;
          box-shadow: none !important;
        }
        img {
          max-width: 100% !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `
  });

  // Helper to get document number
  function getDocumentNumber(docData: PurchaseOrderData | DeliveryChallanData | TaxInvoiceData | GoodsReceiptData): string {
    if ('poNumber' in docData && docData.poNumber) return docData.poNumber;
    if ('dcNumber' in docData && docData.dcNumber) return docData.dcNumber;
    if ('invoiceNumber' in docData && docData.invoiceNumber) return docData.invoiceNumber;
    if ('grnNumber' in docData && (docData as GoodsReceiptData).grnNumber) return (docData as GoodsReceiptData).grnNumber;
    return 'DOC';
  }

  // Render appropriate template
  const renderTemplate = () => {
    switch (documentType) {
      case 'PO':
        return (
          <PurchaseOrderTemplate
            ref={componentRef}
            data={data as PurchaseOrderData}
            copyType={selectedCopy as 'ORIGINAL' | 'DUPLICATE' | 'VENDOR COPY' | 'OFFICE COPY'}
          />
        );
      case 'DC':
        return (
          <DeliveryChallanTemplate
            ref={componentRef}
            data={data as DeliveryChallanData}
            copyType={selectedCopy as 'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE' | 'TRANSPORT COPY'}
          />
        );
      case 'INVOICE':
        return (
          <TaxInvoiceTemplate
            ref={componentRef}
            data={data as TaxInvoiceData}
            copyType={selectedCopy as 'ORIGINAL FOR RECIPIENT' | 'DUPLICATE FOR TRANSPORTER' | 'TRIPLICATE FOR SUPPLIER'}
          />
        );
      case 'GRN':
        return (
          <GoodsReceiptTemplate
            ref={componentRef}
            data={data as GoodsReceiptData}
            copyType={selectedCopy as 'ORIGINAL' | 'STORE COPY' | 'ACCOUNTS COPY' | 'PURCHASE COPY'}
          />
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`bg-${config.color}-600 p-4 flex items-center justify-between`}>
            <div className="flex items-center gap-3 text-white">
              {config.icon}
              <h2 className="text-xl font-bold">{config.title}</h2>
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                {selectedCopy}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Toolbar */}
          <div className="bg-zinc-800 p-3 flex items-center justify-between border-b border-zinc-700">
            {/* Copy Selector */}
            <div className="flex items-center gap-2">
              <Copy className="w-4 h-4 text-zinc-400" />
              <span className="text-sm text-zinc-400">Copy Type:</span>
              <div className="flex gap-1">
                {config.copies.map((copy) => (
                  <button
                    key={copy}
                    onClick={() => setSelectedCopy(copy)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      selectedCopy === copy
                        ? `bg-${config.color}-600 text-white`
                        : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                    }`}
                  >
                    {copy}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition text-sm"
              >
                <Eye className="w-4 h-4" />
                {showPreview ? 'Hide' : 'Show'} Preview
              </button>
              <button
                onClick={() => handlePrint()}
                disabled={isPrinting}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-${config.color}-600 text-white hover:bg-${config.color}-700 transition text-sm font-medium`}
              >
                <Printer className="w-4 h-4" />
                {isPrinting ? 'Printing...' : 'Print'}
              </button>
              <button
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition text-sm"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
              <button
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition text-sm"
              >
                <Mail className="w-4 h-4" />
                Email
              </button>
            </div>
          </div>

          {/* Preview Area - ALWAYS render for print, but hide visually if preview is off */}
          <div className="flex-1 overflow-auto bg-zinc-950 p-6">
            <div className={`max-w-4xl mx-auto ${showPreview ? '' : 'opacity-0 h-0 overflow-hidden'}`}>
              {renderTemplate()}
            </div>
            {!showPreview && (
              <div className="flex items-center justify-center h-64 text-zinc-500">
                <div className="text-center">
                  <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Preview hidden. Click &quot;Show Preview&quot; to view document.</p>
                  <p className="text-xs mt-1">Print will still work.</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-zinc-800 p-3 flex items-center justify-between border-t border-zinc-700 text-xs text-zinc-500">
            <p>
              Document: {documentType}-{getDocumentNumber(data)}
            </p>
            <p>Generated on {new Date().toLocaleString('en-IN')}</p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ==========================================
// QUICK PRINT BUTTONS COMPONENT
// ==========================================
interface QuickPrintButtonsProps {
  onPrintPO?: () => void;
  onPrintDC?: () => void;
  onPrintInvoice?: () => void;
  onPrintGRN?: () => void;
}

export const QuickPrintButtons: React.FC<QuickPrintButtonsProps> = ({
  onPrintPO,
  onPrintDC,
  onPrintInvoice,
  onPrintGRN
}) => {
  return (
    <div className="flex gap-2">
      {onPrintPO && (
        <button
          onClick={onPrintPO}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm"
        >
          <ClipboardList className="w-4 h-4" />
          Print PO
        </button>
      )}
      {onPrintDC && (
        <button
          onClick={onPrintDC}
          className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-sm"
        >
          <Truck className="w-4 h-4" />
          Print DC
        </button>
      )}
      {onPrintInvoice && (
        <button
          onClick={onPrintInvoice}
          className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition text-sm"
        >
          <Receipt className="w-4 h-4" />
          Print Invoice
        </button>
      )}
      {onPrintGRN && (
        <button
          onClick={onPrintGRN}
          className="flex items-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition text-sm"
        >
          <FileCheck className="w-4 h-4" />
          Print GRN
        </button>
      )}
    </div>
  );
};

// ==========================================
// EXPORTS
// ==========================================
export {
  PurchaseOrderTemplate,
  DeliveryChallanTemplate,
  TaxInvoiceTemplate,
  GoodsReceiptTemplate,
  DEFAULT_PO_TERMS
};

export type {
  PurchaseOrderData,
  DeliveryChallanData,
  TaxInvoiceData,
  GoodsReceiptData
};

export default DocumentPrintHub;
