'use client';

import React, { forwardRef } from 'react';
import {
  COMPANY_INFO,
  printStyles,
  DocumentHeader,
  PartyDetailsBox,
  DocumentFooter,
  amountInWords,
  formatCurrency,
  formatDate,
  QRCodePlaceholder
} from './DocumentTemplates';

// ==========================================
// TAX INVOICE DATA INTERFACE
// ==========================================
export interface InvoiceItem {
  slNo: number;
  itemCode: string;
  description: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount?: number;
  taxableValue: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate?: number;
  igstAmount?: number;
  totalAmount: number;
}

export interface TaxInvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  
  // Reference Documents
  poNumber?: string;
  poDate?: string;
  dcNumber?: string;
  dcDate?: string;
  eWayBillNo?: string;
  
  // Seller Details
  seller: {
    name: string;
    address: string;
    gstin: string;
    stateCode: string;
    pan: string;
    phone: string;
    email: string;
  };
  
  // Buyer Details
  buyer: {
    name: string;
    address: string;
    gstin: string;
    stateCode: string;
    phone?: string;
    email?: string;
  };
  
  // Shipping Address (if different from buyer)
  shippingAddress?: {
    name: string;
    address: string;
    phone?: string;
  };
  
  // Items
  items: InvoiceItem[];
  
  // Totals
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  roundOff: number;
  grandTotal: number;
  
  // Payment
  paymentTerms: string;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    ifsc: string;
    branch: string;
  };
  
  // Additional
  placeOfSupply: string;
  reverseCharge: boolean;
  remarks?: string;
  preparedBy: string;
}

// ==========================================
// TAX INVOICE PRINT TEMPLATE
// ==========================================
const TaxInvoiceTemplate = forwardRef<HTMLDivElement, { 
  data: TaxInvoiceData;
  copyType?: 'ORIGINAL FOR RECIPIENT' | 'DUPLICATE FOR TRANSPORTER' | 'TRIPLICATE FOR SUPPLIER';
}>(({ data, copyType = 'ORIGINAL FOR RECIPIENT' }, ref) => {
  
  // Determine if IGST or CGST+SGST
  const isInterState = data.totalIGST > 0;

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
          documentType="TAX INVOICE"
          documentNumber={data.invoiceNumber}
          date={formatDate(data.invoiceDate)}
          copyType={copyType as 'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE'}
        />

        {/* Reference Documents */}
        <div className="flex gap-4 mb-4 text-xs">
          {data.poNumber && (
            <div className="bg-blue-50 border border-blue-200 rounded px-3 py-1">
              <span className="text-gray-600">PO Ref:</span>
              <span className="font-semibold ml-1">{data.poNumber}</span>
              {data.poDate && <span className="text-gray-500 ml-1">({formatDate(data.poDate)})</span>}
            </div>
          )}
          {data.dcNumber && (
            <div className="bg-green-50 border border-green-200 rounded px-3 py-1">
              <span className="text-gray-600">DC Ref:</span>
              <span className="font-semibold ml-1">{data.dcNumber}</span>
            </div>
          )}
          {data.eWayBillNo && (
            <div className="bg-yellow-50 border border-yellow-200 rounded px-3 py-1">
              <span className="text-gray-600">E-Way Bill:</span>
              <span className="font-semibold ml-1">{data.eWayBillNo}</span>
            </div>
          )}
          {data.dueDate && (
            <div className="bg-red-50 border border-red-200 rounded px-3 py-1">
              <span className="text-gray-600">Due Date:</span>
              <span className="font-semibold ml-1">{formatDate(data.dueDate)}</span>
            </div>
          )}
        </div>

        {/* Seller & Buyer Details */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <PartyDetailsBox
            title="Seller Details"
            name={data.seller.name}
            address={data.seller.address}
            gstin={data.seller.gstin}
            stateCode={data.seller.stateCode}
            phone={data.seller.phone}
            email={data.seller.email}
          />
          <PartyDetailsBox
            title="Buyer Details (Bill To)"
            name={data.buyer.name}
            address={data.buyer.address}
            gstin={data.buyer.gstin}
            stateCode={data.buyer.stateCode}
            phone={data.buyer.phone}
            email={data.buyer.email}
          />
        </div>

        {/* Shipping Address (if different) */}
        {data.shippingAddress && (
          <div className="mb-4">
            <PartyDetailsBox
              title="Ship To"
              name={data.shippingAddress.name}
              address={data.shippingAddress.address}
              phone={data.shippingAddress.phone}
            />
          </div>
        )}

        {/* Supply Details */}
        <div className="grid grid-cols-3 gap-4 mb-4 text-xs">
          <div className="border border-gray-300 rounded px-3 py-2">
            <span className="text-gray-600">Place of Supply:</span>
            <span className="font-semibold ml-1">{data.placeOfSupply}</span>
          </div>
          <div className="border border-gray-300 rounded px-3 py-2">
            <span className="text-gray-600">Reverse Charge:</span>
            <span className="font-semibold ml-1">{data.reverseCharge ? 'Yes' : 'No'}</span>
          </div>
          <div className="border border-gray-300 rounded px-3 py-2">
            <span className="text-gray-600">Payment Terms:</span>
            <span className="font-semibold ml-1">{data.paymentTerms}</span>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full mb-4 text-[9px] border-collapse">
          <thead>
            <tr className="bg-blue-800 text-white">
              <th className="py-1.5 px-1 text-center border w-8">S.No</th>
              <th className="py-1.5 px-1 text-left border">Description</th>
              <th className="py-1.5 px-1 text-center border w-14">HSN</th>
              <th className="py-1.5 px-1 text-center border w-10">Qty</th>
              <th className="py-1.5 px-1 text-center border w-10">Unit</th>
              <th className="py-1.5 px-1 text-right border w-14">Rate</th>
              <th className="py-1.5 px-1 text-right border w-16">Taxable</th>
              {isInterState ? (
                <>
                  <th className="py-1.5 px-1 text-center border w-10">IGST%</th>
                  <th className="py-1.5 px-1 text-right border w-14">IGST</th>
                </>
              ) : (
                <>
                  <th className="py-1.5 px-1 text-center border w-10">CGST%</th>
                  <th className="py-1.5 px-1 text-right border w-12">CGST</th>
                  <th className="py-1.5 px-1 text-center border w-10">SGST%</th>
                  <th className="py-1.5 px-1 text-right border w-12">SGST</th>
                </>
              )}
              <th className="py-1.5 px-1 text-right border w-16">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="py-1 px-1 text-center border">{item.slNo}</td>
                <td className="py-1 px-1 border">
                  <span className="text-gray-500">[{item.itemCode}]</span> {item.description}
                </td>
                <td className="py-1 px-1 text-center border">{item.hsnCode}</td>
                <td className="py-1 px-1 text-center border">{item.quantity}</td>
                <td className="py-1 px-1 text-center border">{item.unit}</td>
                <td className="py-1 px-1 text-right border">{formatCurrency(item.unitPrice)}</td>
                <td className="py-1 px-1 text-right border">{formatCurrency(item.taxableValue)}</td>
                {isInterState ? (
                  <>
                    <td className="py-1 px-1 text-center border">{item.igstRate}%</td>
                    <td className="py-1 px-1 text-right border">{formatCurrency(item.igstAmount || 0)}</td>
                  </>
                ) : (
                  <>
                    <td className="py-1 px-1 text-center border">{item.cgstRate}%</td>
                    <td className="py-1 px-1 text-right border">{formatCurrency(item.cgstAmount)}</td>
                    <td className="py-1 px-1 text-center border">{item.sgstRate}%</td>
                    <td className="py-1 px-1 text-right border">{formatCurrency(item.sgstAmount)}</td>
                  </>
                )}
                <td className="py-1 px-1 text-right border font-semibold">{formatCurrency(item.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Section */}
        <div className="grid grid-cols-2 gap-8 mb-4">
          {/* Amount in Words */}
          <div className="border border-gray-300 rounded p-3 bg-gray-50">
            <p className="text-xs font-semibold text-gray-700 mb-1">Amount in Words:</p>
            <p className="text-sm font-medium text-blue-800">{amountInWords(data.grandTotal)}</p>
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
            <div className="flex justify-between py-1 border-b border-gray-200">
              <span>Taxable Amount:</span>
              <span>{formatCurrency(data.taxableAmount)}</span>
            </div>
            {isInterState ? (
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span>IGST:</span>
                <span>{formatCurrency(data.totalIGST)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between py-1 border-b border-gray-200">
                  <span>CGST:</span>
                  <span>{formatCurrency(data.totalCGST)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200">
                  <span>SGST:</span>
                  <span>{formatCurrency(data.totalSGST)}</span>
                </div>
              </>
            )}
            {data.roundOff !== 0 && (
              <div className="flex justify-between py-1 border-b border-gray-200 text-gray-500">
                <span>Round Off:</span>
                <span>{data.roundOff > 0 ? '+' : ''}{formatCurrency(data.roundOff)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 bg-blue-800 text-white px-2 rounded mt-2 font-bold">
              <span>GRAND TOTAL:</span>
              <span>{formatCurrency(data.grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Tax Breakup Table */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-700 mb-2">Tax Breakup:</p>
          <table className="w-full text-[9px] border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="py-1 px-2 text-left border">HSN Code</th>
                <th className="py-1 px-2 text-right border">Taxable Value</th>
                {isInterState ? (
                  <>
                    <th className="py-1 px-2 text-center border">IGST Rate</th>
                    <th className="py-1 px-2 text-right border">IGST Amount</th>
                  </>
                ) : (
                  <>
                    <th className="py-1 px-2 text-center border">CGST Rate</th>
                    <th className="py-1 px-2 text-right border">CGST Amount</th>
                    <th className="py-1 px-2 text-center border">SGST Rate</th>
                    <th className="py-1 px-2 text-right border">SGST Amount</th>
                  </>
                )}
                <th className="py-1 px-2 text-right border">Total Tax</th>
              </tr>
            </thead>
            <tbody>
              {/* Group by HSN and tax rate - simplified for now */}
              {data.items.map((item, index) => (
                <tr key={index}>
                  <td className="py-1 px-2 border">{item.hsnCode}</td>
                  <td className="py-1 px-2 text-right border">{formatCurrency(item.taxableValue)}</td>
                  {isInterState ? (
                    <>
                      <td className="py-1 px-2 text-center border">{item.igstRate}%</td>
                      <td className="py-1 px-2 text-right border">{formatCurrency(item.igstAmount || 0)}</td>
                    </>
                  ) : (
                    <>
                      <td className="py-1 px-2 text-center border">{item.cgstRate}%</td>
                      <td className="py-1 px-2 text-right border">{formatCurrency(item.cgstAmount)}</td>
                      <td className="py-1 px-2 text-center border">{item.sgstRate}%</td>
                      <td className="py-1 px-2 text-right border">{formatCurrency(item.sgstAmount)}</td>
                    </>
                  )}
                  <td className="py-1 px-2 text-right border font-semibold">
                    {formatCurrency(isInterState ? (item.igstAmount || 0) : (item.cgstAmount + item.sgstAmount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bank Details & QR Code */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="col-span-2 border border-gray-300 rounded p-3 bg-gray-50 text-xs">
            <p className="font-bold text-gray-700 mb-2">Bank Details for Payment:</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-600">Bank Name:</span>
                <span className="font-medium ml-1">{data.bankDetails.bankName}</span>
              </div>
              <div>
                <span className="text-gray-600">Branch:</span>
                <span className="font-medium ml-1">{data.bankDetails.branch}</span>
              </div>
              <div>
                <span className="text-gray-600">Account No:</span>
                <span className="font-medium ml-1">{data.bankDetails.accountNumber}</span>
              </div>
              <div>
                <span className="text-gray-600">IFSC Code:</span>
                <span className="font-medium ml-1">{data.bankDetails.ifsc}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <QRCodePlaceholder data={data.invoiceNumber} />
          </div>
        </div>

        {/* Remarks */}
        {data.remarks && (
          <div className="border border-gray-300 rounded p-2 mb-4 text-xs bg-yellow-50">
            <span className="font-semibold">Remarks:</span>
            <span className="ml-2">{data.remarks}</span>
          </div>
        )}

        {/* Footer */}
        <DocumentFooter
          companyName={COMPANY_INFO.shortName}
          showBankDetails={false}
          showDeclaration={true}
          declarationText="We declare that this invoice shows the actual price of the goods/services described and that all particulars are true and correct. Subject to Kadapa Jurisdiction only."
        />
      </div>
    </>
  );
});

TaxInvoiceTemplate.displayName = 'TaxInvoiceTemplate';

export default TaxInvoiceTemplate;
