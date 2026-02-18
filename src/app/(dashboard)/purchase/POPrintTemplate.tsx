'use client';

import React, { forwardRef } from 'react';

// ==========================================
// PURCHASE ORDER PRINT TEMPLATE
// ==========================================
// Matches Triovision official PO format

export interface POPrintData {
  poNumber: string;
  orderDate: string;
  deliveryDate: string;
  
  // Vendor/Supplier
  vendor: {
    name: string;
    address: string;
    gstin: string;
    contact?: string;
    email?: string;
  };
  
  // Company Details (Buyer)
  buyer: {
    name: string;
    unit: string;
    address: string;
    gstin: string;
    phone: string;
  };
  
  // Shipping
  shippingAddress: {
    name: string;
    address: string;
    phone: string;
  };
  
  // Order Details
  purchaseRepresentative: string;
  logisticDetails: string;
  paymentTerms: string;
  vendorReference?: string;
  
  // Items
  items: {
    code: string;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    taxPercent: number;
    amount: number;
  }[];
  
  // Totals
  subtotal: number;
  sgst: number;
  cgst: number;
  igst: number;
  totalAmount: number;
  
  // Terms
  termsAndConditions: string[];
}

// Default company info
export const TRIOVISION_COMPANY = {
  name: 'Triovision Composite Technologies Pvt Ltd',
  unit: 'Unit -II',
  address: 'Plot No. 165, Kopparthy Mega Industrial Park, Kopparthy(V), C K Dinne (Mandal) Kadapa 516003 Andhra Pradesh',
  gstin: '37AAFCT4716N1ZV',
  phone: '+91 9281434840',
  tagline: 'SHAPING IDEAS INTO REALITY',
};

export const DEFAULT_SHIPPING = {
  name: 'Triovision warehouse (Unit-1) Plot 176',
  address: 'Plot no.165, Jagananna Mega Industrial Hub, Kopparty(V), Chintha Komma Dinne(M), Kadapa 516003, Andhra Pradesh AP, India',
  phone: '+91 9281434840',
};

export const DEFAULT_TERMS = [
  'Delivery Terms: Material Shall be dispatch within 21 days from the date of receipt of this Purchase Order & details to M/s. Triovision. Delivery Address: M/S Triovision Composite Technologies PVT LTD Unit 2: Plot no.165, Jagananna Mega Industrial Hub, Kopparthy(V), Chintha Komma Dinne(M), Kadapa-516003, Andhra Pradesh. Contact Details: Mr. Venkateshwara Reddy, Mobile Number: 9550896635.',
  'Material receiving inspection & Acceptance: In case of any rejection of materials by M/s. Triovision Composite Technologies Pvt Ltd Unit 2, Vendor shall replace all the rejected materials free of cost or in case of inability to replace, the order shall be revised accordingly or cancelled as required and the applicable value if any, shall be credited to M/s. Triovision Composite Technologies Pvt Ltd.',
  'Invoice: The invoice should be submitted in duplicate along with the delivery challan and should contain PO number, item description, quantity, rate, and total amount.',
  'Payment: Payment will be made as per the payment terms mentioned in this PO after receipt and acceptance of materials.',
];

// Print-specific styles
const printStyles = `
  @media print {
    @page {
      size: A4;
      margin: 15mm;
    }
    body {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .po-print-container {
      width: 100% !important;
      max-width: none !important;
      padding: 0 !important;
    }
    .po-header-logo {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .page-break {
      page-break-before: always;
    }
    .no-print {
      display: none !important;
    }
  }
`;

const POPrintTemplate = forwardRef<HTMLDivElement, { data: POPrintData }>(
  ({ data }, ref) => {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
      }).format(amount);
    };

    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    return (
      <>
        <style>{printStyles}</style>
        <div 
          ref={ref} 
          className="bg-white text-black p-8 max-w-4xl mx-auto po-print-container"
          style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px' }}
        >
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-gray-300 pb-4 mb-4">
            {/* Logo & Company Name */}
            <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-2xl">T</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-blue-800">TrioVision</h1>
              <p className="text-sm text-gray-600">Composite Technologies</p>
            </div>
          </div>
          
          {/* Tagline & Buyer Details */}
          <div className="text-right">
            <p className="text-blue-600 font-semibold italic mb-2">{TRIOVISION_COMPANY.tagline}</p>
            <div className="text-xs text-gray-700">
              <p className="font-semibold">Details of Buyer:</p>
              <p>{data.buyer.name} {data.buyer.unit}</p>
              <p className="max-w-xs">{data.buyer.address}</p>
              <p>GSTIN: {data.buyer.gstin}</p>
            </div>
          </div>
        </div>

        {/* Shipping & Supplier Info */}
        <div className="grid grid-cols-2 gap-8 mb-6 text-xs">
          {/* Shipping Address */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Shipping address:</h3>
            <p>{data.shippingAddress.name}</p>
            <p className="text-gray-600">{data.shippingAddress.address}</p>
            <p>📞 {data.shippingAddress.phone}</p>
          </div>
          
          {/* Supplier Details */}
          <div className="text-right">
            <p className="font-semibold">{data.vendor.name}</p>
            <p className="text-gray-600">{data.vendor.address}</p>
            <p>GSTIN: {data.vendor.gstin}</p>
          </div>
        </div>

        {/* PO Title */}
        <div className="bg-gray-100 p-4 mb-6 border-l-4 border-blue-600">
          <h2 className="text-2xl font-bold text-gray-800">
            Purchase Order <span className="text-blue-600">#{data.poNumber}</span>
          </h2>
        </div>

        {/* Order Details Grid */}
        <div className="grid grid-cols-2 gap-x-12 gap-y-2 mb-6 text-xs">
          <div className="flex justify-between border-b border-gray-200 py-1">
            <span className="font-semibold text-gray-600">Purchase Representative:</span>
            <span>{data.purchaseRepresentative}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 py-1">
            <span className="font-semibold text-gray-600">Order Date:</span>
            <span>{formatDate(data.orderDate)}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 py-1">
            <span className="font-semibold text-gray-600">Logistic Details:</span>
            <span>{data.logisticDetails}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 py-1">
            <span className="font-semibold text-gray-600">Payment Terms:</span>
            <span>{data.paymentTerms}</span>
          </div>
          {data.vendorReference && (
            <div className="flex justify-between border-b border-gray-200 py-1">
              <span className="font-semibold text-gray-600">Vendor Reference:</span>
              <span>{data.vendorReference}</span>
            </div>
          )}
          <div className="flex justify-between border-b border-gray-200 py-1">
            <span className="font-semibold text-gray-600">Delivery Date:</span>
            <span>{formatDate(data.deliveryDate)}</span>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full mb-6 text-xs">
          <thead>
            <tr className="bg-blue-800 text-white">
              <th className="py-2 px-3 text-left border">DESCRIPTION</th>
              <th className="py-2 px-3 text-center border w-20">QTY</th>
              <th className="py-2 px-3 text-right border w-24">UNIT PRICE</th>
              <th className="py-2 px-3 text-center border w-20">TAXES</th>
              <th className="py-2 px-3 text-right border w-28">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={index} className="border-b">
                <td className="py-2 px-3 border">
                  <span className="text-gray-500">[{item.code}]</span> {item.description}
                </td>
                <td className="py-2 px-3 text-center border">
                  {item.quantity} {item.unit}
                </td>
                <td className="py-2 px-3 text-right border">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="py-2 px-3 text-center border">
                  {item.taxPercent}%
                </td>
                <td className="py-2 px-3 text-right border font-medium">
                  {formatCurrency(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-6">
          <div className="w-64 text-xs">
            <div className="flex justify-between py-1 border-b">
              <span>Untaxed Amount</span>
              <span>{formatCurrency(data.subtotal)}</span>
            </div>
            {data.sgst > 0 && (
              <div className="flex justify-between py-1 border-b">
                <span>SGST (9%)</span>
                <span>{formatCurrency(data.sgst)}</span>
              </div>
            )}
            {data.cgst > 0 && (
              <div className="flex justify-between py-1 border-b">
                <span>CGST (9%)</span>
                <span>{formatCurrency(data.cgst)}</span>
              </div>
            )}
            {data.igst > 0 && (
              <div className="flex justify-between py-1 border-b">
                <span>IGST (18%)</span>
                <span>{formatCurrency(data.igst)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 bg-blue-100 px-2 font-bold text-sm">
              <span>Total</span>
              <span className="text-blue-800">{formatCurrency(data.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="border-t-2 border-gray-300 pt-4 text-xs">
          <h3 className="font-bold text-gray-800 mb-2">Terms & Conditions:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            {data.termsAndConditions.map((term, index) => (
              <li key={index} className="text-justify leading-relaxed">
                <span className="font-semibold">{term.split(':')[0]}:</span>
                {term.split(':').slice(1).join(':')}
              </li>
            ))}
          </ol>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-300 flex justify-between items-end text-xs">
          <div>
            <p className="text-gray-500">This is a computer generated document.</p>
            <p className="text-gray-500">No signature required.</p>
          </div>
          <div className="text-right">
            <p className="font-semibold">For {TRIOVISION_COMPANY.name}</p>
            <div className="h-12"></div>
            <p className="border-t border-gray-400 pt-1">Authorized Signatory</p>
          </div>
        </div>
        </div>
      </>
    );
  }
);

POPrintTemplate.displayName = 'POPrintTemplate';

export default POPrintTemplate;
