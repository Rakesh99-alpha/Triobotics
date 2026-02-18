'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useReactToPrint } from 'react-to-print';
import { Printer, FileText, Truck, Receipt, ClipboardCheck, Plus, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

// Import Templates
import PurchaseOrderTemplate, { PurchaseOrderData, DEFAULT_PO_TERMS } from './PurchaseOrderTemplate';
import DeliveryChallanTemplate, { DeliveryChallanData } from './DeliveryChallanTemplate';
import TaxInvoiceTemplate, { TaxInvoiceData } from './TaxInvoiceTemplate';
import GoodsReceiptTemplate, { GoodsReceiptData } from './GoodsReceiptTemplate';
import { COMPANY_INFO } from './DocumentTemplates';

// ==========================================
// SAMPLE DATA FOR TESTING
// ==========================================
const SAMPLE_PO_DATA: PurchaseOrderData = {
  poNumber: 'PO-2026-001',
  poDate: '2026-01-31',
  quotationRef: 'QTN-2026-045',
  quotationDate: '2026-01-28',
  prNumber: 'PR-2026-012',
  validUntil: '2026-02-28',
  expectedDelivery: '2026-02-15',
  deliveryLocation: 'Unit-I, Kopparthy',
  
  vendor: {
    name: 'Premium Composites Pvt Ltd',
    address: 'Plot 45, Industrial Area, Bangalore - 560058',
    gstin: '29AABCP1234N1Z5',
    stateCode: '29',
    pan: 'AABCP1234N',
    contactPerson: 'Mr. Rajesh Kumar',
    phone: '+91 9876543210',
    email: 'sales@premiumcomp.com'
  },
  
  buyer: {
    name: COMPANY_INFO.name,
    unit: 'Unit - I',
    address: COMPANY_INFO.units.unit1.address,
    gstin: COMPANY_INFO.gstin,
    stateCode: '37',
    phone: COMPANY_INFO.units.unit1.phone,
    email: COMPANY_INFO.email
  },
  
  shipTo: {
    name: COMPANY_INFO.name,
    address: COMPANY_INFO.units.unit1.address,
    phone: COMPANY_INFO.units.unit1.phone,
    contactPerson: 'Store Manager'
  },
  
  items: [
    {
      slNo: 1,
      itemCode: 'GF-300-01',
      description: 'Glass Fiber Mat 300 GSM (1.5m width)',
      hsnCode: '70193900',
      quantity: 500,
      unit: 'Kg',
      unitPrice: 185.00,
      discount: 0,
      taxableValue: 92500.00,
      gstRate: 18,
      gstAmount: 16650.00,
      totalAmount: 109150.00
    },
    {
      slNo: 2,
      itemCode: 'EP-401-02',
      description: 'Epoxy Resin LY556 (Industrial Grade)',
      hsnCode: '39073010',
      quantity: 200,
      unit: 'Kg',
      unitPrice: 420.00,
      discount: 5,
      taxableValue: 79800.00,
      gstRate: 18,
      gstAmount: 14364.00,
      totalAmount: 94164.00
    },
    {
      slNo: 3,
      itemCode: 'HD-HY917',
      description: 'Hardener HY917',
      hsnCode: '39073020',
      quantity: 50,
      unit: 'Kg',
      unitPrice: 380.00,
      discount: 0,
      taxableValue: 19000.00,
      gstRate: 18,
      gstAmount: 3420.00,
      totalAmount: 22420.00
    }
  ],
  
  subtotal: 194500.00,
  totalDiscount: 3200.00,
  taxableAmount: 191300.00,
  cgst: 17217.00,
  sgst: 17217.00,
  igst: 0,
  freight: 2500.00,
  roundOff: -0.66,
  grandTotal: 228233.00,
  
  paymentTerms: '30 Days from Invoice Date',
  deliveryTerms: 'Ex-Works Bangalore',
  warranty: '12 months from delivery',
  specialInstructions: 'Handle with care. Store in cool, dry place.',
  termsAndConditions: DEFAULT_PO_TERMS,
  
  preparedBy: 'Suresh Kumar',
  approvedBy: 'Managing Director',
  approvedDate: '2026-01-31',
  mdApprovalRequired: true,
  mdApproved: true,
  status: 'Approved'
};

const SAMPLE_DC_DATA: DeliveryChallanData = {
  dcNumber: 'DC-2026-078',
  dcDate: '2026-01-31',
  poNumber: 'PO-2026-001',
  poDate: '2026-01-25',
  
  consignor: {
    name: COMPANY_INFO.name,
    address: COMPANY_INFO.units.unit1.address,
    gstin: COMPANY_INFO.gstin,
    stateCode: '37',
    phone: COMPANY_INFO.units.unit1.phone
  },
  
  consignee: {
    name: 'ABC Manufacturing Ltd',
    address: 'Plot 23, SIPCOT Industrial Park, Chennai - 600058',
    gstin: '33AABCA1234N1Z5',
    stateCode: '33',
    phone: '+91 9876543210'
  },
  
  transport: {
    mode: 'Road',
    vehicleNumber: 'AP39TG4567',
    driverName: 'Ramesh',
    driverPhone: '+91 9876543210',
    lrNumber: 'LR-2026-456',
    lrDate: '2026-01-31',
    eWayBillNo: 'EWB123456789012',
    eWayBillDate: '2026-01-31'
  },
  
  items: [
    {
      slNo: 1,
      itemCode: 'FRP-BODY-01',
      description: 'FRP Body Panel - Type A',
      hsnCode: '39269099',
      quantity: 25,
      unit: 'Pcs',
      remarks: 'Gross: 125 Kg, Net: 120 Kg'
    },
    {
      slNo: 2,
      itemCode: 'FRP-HOOD-02',
      description: 'FRP Hood Cover - Standard',
      hsnCode: '39269099',
      quantity: 10,
      unit: 'Pcs',
      remarks: 'Gross: 50 Kg, Net: 48 Kg'
    }
  ],
  
  reason: 'Supply',
  reasonRemarks: 'Supply against PO',
  
  preparedBy: 'Store Incharge',
  remarks: 'Handle with care. Do not stack.'
};

const SAMPLE_INVOICE_DATA: TaxInvoiceData = {
  invoiceNumber: 'INV-2026-0156',
  invoiceDate: '2026-01-31',
  poNumber: 'CUST-PO-2026-089',
  poDate: '2026-01-20',
  dcNumber: 'DC-2026-078',
  dcDate: '2026-01-31',
  dueDate: '2026-03-02',
  placeOfSupply: 'Tamil Nadu (33)',
  reverseCharge: false,
  
  seller: {
    name: COMPANY_INFO.name,
    address: COMPANY_INFO.units.unit1.address,
    gstin: COMPANY_INFO.gstin,
    stateCode: '37',
    pan: COMPANY_INFO.pan,
    phone: COMPANY_INFO.units.unit1.phone,
    email: COMPANY_INFO.email
  },
  
  buyer: {
    name: 'ABC Manufacturing Ltd',
    address: 'Plot 23, SIPCOT Industrial Park, Chennai - 600058',
    gstin: '33AABCA1234N1Z5',
    stateCode: '33',
    phone: '+91 9876543210',
    email: 'purchase@abcmfg.com'
  },
  
  shippingAddress: {
    name: 'ABC Manufacturing Ltd',
    address: 'Plot 23, SIPCOT Industrial Park, Chennai - 600058',
    phone: '+91 9876543210'
  },
  
  items: [
    {
      slNo: 1,
      itemCode: 'FRP-BODY-01',
      description: 'FRP Body Panel - Type A',
      hsnCode: '39269099',
      quantity: 25,
      unit: 'Pcs',
      unitPrice: 8500.00,
      discount: 0,
      taxableValue: 212500.00,
      cgstRate: 0,
      cgstAmount: 0,
      sgstRate: 0,
      sgstAmount: 0,
      igstRate: 18,
      igstAmount: 38250.00,
      totalAmount: 250750.00
    },
    {
      slNo: 2,
      itemCode: 'FRP-HOOD-02',
      description: 'FRP Hood Cover - Standard',
      hsnCode: '39269099',
      quantity: 10,
      unit: 'Pcs',
      unitPrice: 12000.00,
      discount: 5,
      taxableValue: 114000.00,
      cgstRate: 0,
      cgstAmount: 0,
      sgstRate: 0,
      sgstAmount: 0,
      igstRate: 18,
      igstAmount: 20520.00,
      totalAmount: 134520.00
    }
  ],
  
  subtotal: 332500.00,
  totalDiscount: 6000.00,
  taxableAmount: 326500.00,
  totalCGST: 0,
  totalSGST: 0,
  totalIGST: 58770.00,
  roundOff: 0.30,
  grandTotal: 390270.00,
  
  paymentTerms: '30 Days from Invoice Date',
  bankDetails: {
    bankName: COMPANY_INFO.bankDetails.bankName,
    branch: COMPANY_INFO.bankDetails.branch,
    accountNumber: COMPANY_INFO.bankDetails.accountNumber,
    ifsc: COMPANY_INFO.bankDetails.ifsc
  },
  
  remarks: 'Thank you for your business!',
  preparedBy: 'Accounts Team'
};

const SAMPLE_GRN_DATA: GoodsReceiptData = {
  grnNumber: 'GRN-2026-0234',
  grnDate: '2026-01-31',
  poNumber: 'PO-2026-001',
  poDate: '2026-01-25',
  dcNumber: 'SUP-DC-2026-089',
  dcDate: '2026-01-30',
  invoiceNumber: 'SUP-INV-2026-456',
  invoiceDate: '2026-01-30',
  invoiceAmount: 228233.00,
  
  vendor: {
    name: 'Premium Composites Pvt Ltd',
    address: 'Plot 45, Industrial Area, Bangalore - 560058',
    gstin: '29AABCP1234N1Z5',
    phone: '+91 9876543210'
  },
  
  receivingLocation: 'Unit - I, Kopparthy',
  
  transport: {
    vehicleNumber: 'KA01AB1234',
    driverName: 'Suresh',
    lrNumber: 'LR-2026-789',
    eWayBillNo: 'EWB123456789012'
  },
  
  items: [
    {
      slNo: 1,
      itemCode: 'GF-300-01',
      description: 'Glass Fiber Mat 300 GSM',
      hsnCode: '70193900',
      unit: 'Kg',
      orderedQty: 500,
      receivedQty: 495,
      pendingQty: 5,
      unitPrice: 185.00,
      totalValue: 91575.00,
      batchNo: 'GF-B2026-045',
      qualityStatus: 'Passed',
      remarks: '5 Kg damaged in transit'
    },
    {
      slNo: 2,
      itemCode: 'EP-401-02',
      description: 'Epoxy Resin LY556',
      hsnCode: '39073010',
      unit: 'Kg',
      orderedQty: 200,
      receivedQty: 200,
      pendingQty: 0,
      unitPrice: 420.00,
      totalValue: 84000.00,
      batchNo: 'EP-B2026-078',
      qualityStatus: 'Passed'
    },
    {
      slNo: 3,
      itemCode: 'HD-HY917',
      description: 'Hardener HY917',
      hsnCode: '39073020',
      unit: 'Kg',
      orderedQty: 50,
      receivedQty: 45,
      pendingQty: 5,
      unitPrice: 380.00,
      totalValue: 17100.00,
      batchNo: 'HD-B2026-012',
      qualityStatus: 'Pending',
      remarks: 'Short supply - 5 Kg pending'
    }
  ],
  
  totalOrderedQty: 750,
  totalReceivedQty: 740,
  totalPendingQty: 10,
  totalValue: 192675.00,
  
  itemsPassed: 2,
  itemsFailed: 0,
  itemsPending: 1,
  overallQualityStatus: 'Partially Approved',
  
  remarks: 'Partial delivery. Balance 5 Kg Hardener pending.',
  receivedBy: 'Raju - Store Incharge',
  inspectedBy: 'Quality Team',
  approvedBy: 'Store Manager'
};

// ==========================================
// DOCUMENT DEMO PAGE
// ==========================================
export default function DocumentsPage() {
  const router = useRouter();
  const [activeDoc, setActiveDoc] = useState<'PO' | 'DC' | 'INVOICE' | 'GRN'>('PO');
  const [copyType, setCopyType] = useState('ORIGINAL');
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${activeDoc}_Document`,
    pageStyle: `
      @page { size: A4; margin: 10mm; }
      @media print {
        html, body { 
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `
  });

  const docButtons = [
    { id: 'PO', label: 'Purchase Order', icon: FileText, color: 'blue' },
    { id: 'DC', label: 'Delivery Challan', icon: Truck, color: 'green' },
    { id: 'INVOICE', label: 'Tax Invoice', icon: Receipt, color: 'purple' },
    { id: 'GRN', label: 'Goods Receipt', icon: ClipboardCheck, color: 'orange' },
  ];

  const copyTypes: Record<string, string[]> = {
    PO: ['ORIGINAL', 'DUPLICATE', 'VENDOR COPY', 'OFFICE COPY'],
    DC: ['ORIGINAL', 'DUPLICATE', 'TRIPLICATE', 'TRANSPORT COPY'],
    INVOICE: ['ORIGINAL FOR RECIPIENT', 'DUPLICATE FOR TRANSPORTER', 'TRIPLICATE FOR SUPPLIER'],
    GRN: ['ORIGINAL', 'STORE COPY', 'ACCOUNTS COPY', 'PURCHASE COPY'],
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">📄 Document Templates</h1>
            <p className="text-zinc-400">Print-ready templates for PO, DC, Invoice & GRN</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/purchase/documents/dc')}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-medium shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Create & Manage DCs
          </motion.button>
        </div>
      </div>

      {/* Controls */}
      <div className="max-w-7xl mx-auto mb-6 bg-zinc-900 rounded-xl p-4 border border-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Document Type Selector */}
          <div className="flex gap-2">
            {docButtons.map((doc) => (
              <button
                key={doc.id}
                onClick={() => {
                  setActiveDoc(doc.id as 'PO' | 'DC' | 'INVOICE' | 'GRN');
                  setCopyType(copyTypes[doc.id][0]);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                  activeDoc === doc.id
                    ? `bg-${doc.color}-600 text-white`
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                <doc.icon className="w-4 h-4" />
                {doc.label}
              </button>
            ))}
          </div>

          {/* Copy Type Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Copy:</span>
            <select
              value={copyType}
              onChange={(e) => setCopyType(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
            >
              {copyTypes[activeDoc].map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Print Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handlePrint()}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg font-medium"
          >
            <Printer className="w-5 h-5" />
            Print Document
          </motion.button>
        </div>
      </div>

      {/* Document Preview */}
      <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-2xl overflow-hidden">
        <div ref={printRef}>
          {activeDoc === 'PO' && (
            <PurchaseOrderTemplate 
              data={SAMPLE_PO_DATA} 
              copyType={copyType as 'ORIGINAL' | 'DUPLICATE' | 'VENDOR COPY' | 'OFFICE COPY'} 
            />
          )}
          {activeDoc === 'DC' && (
            <DeliveryChallanTemplate 
              data={SAMPLE_DC_DATA} 
              copyType={copyType as 'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE' | 'TRANSPORT COPY'} 
            />
          )}
          {activeDoc === 'INVOICE' && (
            <TaxInvoiceTemplate 
              data={SAMPLE_INVOICE_DATA} 
              copyType={copyType as 'ORIGINAL FOR RECIPIENT' | 'DUPLICATE FOR TRANSPORTER' | 'TRIPLICATE FOR SUPPLIER'} 
            />
          )}
          {activeDoc === 'GRN' && (
            <GoodsReceiptTemplate 
              data={SAMPLE_GRN_DATA} 
              copyType={copyType as 'ORIGINAL' | 'STORE COPY' | 'ACCOUNTS COPY' | 'PURCHASE COPY'} 
            />
          )}
        </div>
      </div>
    </div>
  );
}
