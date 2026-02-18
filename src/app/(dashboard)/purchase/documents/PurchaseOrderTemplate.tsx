'use client';

import React, { forwardRef } from 'react';
import {
  COMPANY_INFO,
  printStyles,
  DocumentHeader,
  PartyDetailsBox,
  amountInWords,
  formatCurrency,
  formatDate
} from './DocumentTemplates';

// ==========================================
// PURCHASE ORDER DATA INTERFACE
// ==========================================
export interface POItemEnhanced {
  slNo: number;
  itemCode: string;
  description: string;
  hsnCode?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount?: number;
  taxableValue: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
}

export interface PurchaseOrderData {
  poNumber: string;
  poDate: string;
  quotationRef?: string;
  quotationDate?: string;
  prNumber?: string;
  
  // Validity & Delivery
  validUntil?: string;
  expectedDelivery: string;
  deliveryLocation: string;
  
  // Vendor/Supplier Details
  vendor: {
    name: string;
    address: string;
    gstin: string;
    stateCode?: string;
    pan?: string;
    contactPerson: string;
    phone: string;
    email: string;
  };
  
  // Buyer Details
  buyer: {
    name: string;
    unit: string;
    address: string;
    gstin: string;
    stateCode: string;
    phone: string;
    email: string;
  };
  
  // Shipping Details
  shipTo: {
    name: string;
    address: string;
    phone: string;
    contactPerson?: string;
  };
  
  // Items
  items: POItemEnhanced[];
  
  // Totals
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  freight?: number;
  otherCharges?: number;
  roundOff: number;
  grandTotal: number;
  
  // Terms
  paymentTerms: string;
  deliveryTerms: string;
  warranty?: string;
  specialInstructions?: string;
  termsAndConditions: string[];
  
  // Approval
  preparedBy: string;
  approvedBy?: string;
  approvedDate?: string;
  mdApprovalRequired: boolean;
  mdApproved?: boolean;
  
  // Status
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Sent to Vendor' | 'Acknowledged' | 'In Progress' | 'Completed' | 'Cancelled';
}

// ==========================================
// DEFAULT TERMS & CONDITIONS
// ==========================================
export const DEFAULT_PO_TERMS = [
  'Delivery: Material shall be dispatched within the stipulated time from the date of this PO. Any delay must be communicated in advance.',
  'Quality: All items must conform to the specifications mentioned. Substandard materials will be rejected and returned at vendor\'s cost.',
  'Inspection: Materials are subject to inspection upon receipt. M/s Triovision reserves the right to reject non-conforming items.',
  'Invoice: Submit invoice in duplicate with DC, PO number, item description, quantity, rate, GST details, and total amount.',
  'Payment: As per agreed payment terms after receipt, inspection, and acceptance of materials.',
  'Warranty: Vendor shall provide warranty as specified for each item against manufacturing defects.',
  'Jurisdiction: All disputes shall be subject to Kadapa, Andhra Pradesh jurisdiction only.',
];

// ==========================================
// PURCHASE ORDER PRINT TEMPLATE
// ==========================================
const PurchaseOrderTemplate = forwardRef<HTMLDivElement, { 
  data: PurchaseOrderData;
  copyType?: 'ORIGINAL' | 'DUPLICATE' | 'VENDOR COPY' | 'OFFICE COPY';
}>(({ data, copyType = 'ORIGINAL' }, ref) => {
  
  // Determine if IGST or CGST+SGST
  const isInterState = data.igst > 0;

  return (
    <>
      <style>{printStyles}</style>
      <div
        ref={ref}
        className="bg-white text-black p-6 max-w-4xl mx-auto doc-container shadow-lg"
        style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px' }}
      >
        {/* Document Header */}
        <DocumentHeader
          documentType="PURCHASE ORDER"
          documentNumber={data.poNumber}
          date={formatDate(data.poDate)}
          copyType={copyType}
        />

        {/* Status Badge */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-3">
            {data.quotationRef && (
              <div className="bg-green-50 border border-green-300 rounded px-3 py-1 text-xs">
                <span className="text-gray-600">Quotation Ref:</span>
                <span className="font-semibold ml-1">{data.quotationRef}</span>
              </div>
            )}
            {data.prNumber && (
              <div className="bg-blue-50 border border-blue-300 rounded px-3 py-1 text-xs">
                <span className="text-gray-600">PR No:</span>
                <span className="font-semibold ml-1">{data.prNumber}</span>
              </div>
            )}
          </div>
          <div className={`px-3 py-1 rounded text-xs font-bold ${
            data.status === 'Approved' ? 'bg-green-500 text-white' :
            data.status === 'Pending Approval' ? 'bg-yellow-500 text-black' :
            data.status === 'Cancelled' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
          }`}>
            {data.status.toUpperCase()}
          </div>
        </div>

        {/* Vendor & Buyer Details */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <PartyDetailsBox
            title="Vendor / Supplier"
            name={data.vendor.name}
            address={data.vendor.address}
            gstin={data.vendor.gstin}
            stateCode={data.vendor.stateCode}
            phone={data.vendor.phone}
            email={data.vendor.email}
          />
          <div className="border border-gray-300 rounded-lg p-3 bg-gray-50">
            <p className="text-xs font-bold text-gray-600 uppercase mb-2 border-b pb-1">Buyer Details</p>
            <p className="font-semibold text-gray-800">{data.buyer.name}</p>
            <p className="text-xs text-gray-600">{data.buyer.unit}</p>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">{data.buyer.address}</p>
            <p className="text-xs mt-2">
              <span className="font-semibold">GSTIN:</span> {data.buyer.gstin}
            </p>
            <p className="text-xs">
              <span className="font-semibold">Phone:</span> {data.buyer.phone}
            </p>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="border border-green-300 rounded-lg p-3 mb-4 bg-green-50">
          <p className="text-xs font-bold text-green-800 uppercase mb-1">📦 Ship To / Delivery Address</p>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-semibold">{data.shipTo.name}</p>
              <p className="text-gray-600">{data.shipTo.address}</p>
            </div>
            <div className="text-right">
              <p><span className="text-gray-600">Contact:</span> {data.shipTo.contactPerson}</p>
              <p><span className="text-gray-600">Phone:</span> {data.shipTo.phone}</p>
            </div>
          </div>
        </div>

        {/* Key Dates & Terms */}
        <div className="grid grid-cols-4 gap-3 mb-4 text-xs">
          <div className="border border-gray-300 rounded p-2 text-center">
            <p className="text-gray-500 text-[10px]">Expected Delivery</p>
            <p className="font-bold text-blue-800">{formatDate(data.expectedDelivery)}</p>
          </div>
          <div className="border border-gray-300 rounded p-2 text-center">
            <p className="text-gray-500 text-[10px]">Payment Terms</p>
            <p className="font-bold">{data.paymentTerms}</p>
          </div>
          <div className="border border-gray-300 rounded p-2 text-center">
            <p className="text-gray-500 text-[10px]">Delivery Terms</p>
            <p className="font-bold">{data.deliveryTerms}</p>
          </div>
          {data.validUntil && (
            <div className="border border-gray-300 rounded p-2 text-center">
              <p className="text-gray-500 text-[10px]">Valid Until</p>
              <p className="font-bold">{formatDate(data.validUntil)}</p>
            </div>
          )}
        </div>

        {/* Items Table */}
        <table className="w-full mb-4 text-[9px] border-collapse">
          <thead>
            <tr className="bg-blue-800 text-white">
              <th className="py-1.5 px-1 text-center border w-8">S.No</th>
              <th className="py-1.5 px-1 text-left border w-16">Code</th>
              <th className="py-1.5 px-1 text-left border">Description / Specification</th>
              <th className="py-1.5 px-1 text-center border w-12">HSN</th>
              <th className="py-1.5 px-1 text-center border w-10">Qty</th>
              <th className="py-1.5 px-1 text-center border w-10">Unit</th>
              <th className="py-1.5 px-1 text-right border w-14">Rate</th>
              <th className="py-1.5 px-1 text-right border w-16">Value</th>
              <th className="py-1.5 px-1 text-center border w-10">GST%</th>
              <th className="py-1.5 px-1 text-right border w-14">GST</th>
              <th className="py-1.5 px-1 text-right border w-16">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="py-1.5 px-1 text-center border">{item.slNo}</td>
                <td className="py-1.5 px-1 border font-medium text-blue-700">{item.itemCode}</td>
                <td className="py-1.5 px-1 border">{item.description}</td>
                <td className="py-1.5 px-1 text-center border">{item.hsnCode || '-'}</td>
                <td className="py-1.5 px-1 text-center border font-semibold">{item.quantity}</td>
                <td className="py-1.5 px-1 text-center border">{item.unit}</td>
                <td className="py-1.5 px-1 text-right border">{formatCurrency(item.unitPrice)}</td>
                <td className="py-1.5 px-1 text-right border">{formatCurrency(item.taxableValue)}</td>
                <td className="py-1.5 px-1 text-center border">{item.gstRate}%</td>
                <td className="py-1.5 px-1 text-right border">{formatCurrency(item.gstAmount)}</td>
                <td className="py-1.5 px-1 text-right border font-semibold">{formatCurrency(item.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Section */}
        <div className="grid grid-cols-2 gap-6 mb-4">
          {/* Amount in Words */}
          <div className="border border-gray-300 rounded p-3 bg-blue-50">
            <p className="text-xs font-semibold text-gray-700 mb-1">Total Amount in Words:</p>
            <p className="text-sm font-bold text-blue-800">{amountInWords(data.grandTotal)}</p>
          </div>

          {/* Totals */}
          <div className="text-xs">
            <div className="flex justify-between py-1 border-b border-gray-200">
              <span>Sub Total:</span>
              <span>{formatCurrency(data.subtotal)}</span>
            </div>
            {data.totalDiscount > 0 && (
              <div className="flex justify-between py-1 border-b border-gray-200 text-green-600">
                <span>Discount:</span>
                <span>-{formatCurrency(data.totalDiscount)}</span>
              </div>
            )}
            {isInterState ? (
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span>IGST:</span>
                <span>{formatCurrency(data.igst)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between py-1 border-b border-gray-200">
                  <span>CGST:</span>
                  <span>{formatCurrency(data.cgst)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200">
                  <span>SGST:</span>
                  <span>{formatCurrency(data.sgst)}</span>
                </div>
              </>
            )}
            {data.freight && data.freight > 0 && (
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span>Freight:</span>
                <span>{formatCurrency(data.freight)}</span>
              </div>
            )}
            {data.roundOff !== 0 && (
              <div className="flex justify-between py-1 border-b border-gray-200 text-gray-500">
                <span>Round Off:</span>
                <span>{data.roundOff > 0 ? '+' : ''}{formatCurrency(data.roundOff)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 bg-blue-800 text-white px-3 rounded mt-2 font-bold text-sm">
              <span>GRAND TOTAL:</span>
              <span>{formatCurrency(data.grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Special Instructions */}
        {data.specialInstructions && (
          <div className="border-2 border-yellow-400 rounded p-3 mb-4 bg-yellow-50">
            <p className="text-xs font-bold text-yellow-800 mb-1">⚠️ Special Instructions:</p>
            <p className="text-xs">{data.specialInstructions}</p>
          </div>
        )}

        {/* Terms & Conditions */}
        <div className="border border-gray-300 rounded p-3 mb-4 bg-gray-50">
          <p className="text-xs font-bold text-gray-700 mb-2">Terms & Conditions:</p>
          <ol className="list-decimal list-inside space-y-1 text-[9px] text-gray-600">
            {data.termsAndConditions.map((term, index) => (
              <li key={index} className="leading-relaxed">{term}</li>
            ))}
          </ol>
        </div>

        {/* Approval Section */}
        <div className="grid grid-cols-3 gap-4 mt-6 text-xs">
          <div className="text-center border-r border-gray-300 pr-4">
            <p className="font-semibold mb-8">Prepared By</p>
            <div className="border-t border-gray-400 pt-1">
              <p className="font-medium">{data.preparedBy}</p>
              <p className="text-gray-500 text-[10px]">Purchase Team</p>
            </div>
          </div>
          <div className="text-center border-r border-gray-300 pr-4">
            <p className="font-semibold mb-8">Purchase</p>
            <div className="border-t border-gray-400 pt-1">
              <p className="font-medium">{data.approvedBy || '____________'}</p>
            </div>
          </div>
          <div className="text-center">
            <p className="font-semibold mb-8">For {COMPANY_INFO.shortName}</p>
            <div className="border-t border-gray-400 pt-1">
              <p className="text-gray-600">Authorized Signatory</p>
              {data.mdApprovalRequired && (
                <p className={`text-[10px] mt-1 ${data.mdApproved ? 'text-green-600' : 'text-orange-600'}`}>
                  {data.mdApproved ? '✓ MD Approved' : '⏳ Pending MD Approval'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 pt-3 border-t-2 border-gray-300 text-center">
          <p className="text-[10px] text-gray-500">
            This is a system-generated Purchase Order. Valid only with authorized signature.
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            {COMPANY_INFO.name} | GSTIN: {COMPANY_INFO.gstin} | Email: {COMPANY_INFO.email}
          </p>
        </div>
      </div>
    </>
  );
});

PurchaseOrderTemplate.displayName = 'PurchaseOrderTemplate';

export default PurchaseOrderTemplate;
