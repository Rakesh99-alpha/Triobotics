'use client';

import React, { forwardRef } from 'react';
import {
  COMPANY_INFO,
  printStyles,
  DocumentHeader,
  PartyDetailsBox,
  formatCurrency,
  formatDate
} from './DocumentTemplates';

// ==========================================
// GOODS RECEIPT NOTE DATA INTERFACE
// ==========================================
export interface GRNItemData {
  slNo: number;
  itemCode: string;
  description: string;
  hsnCode?: string;
  orderedQty: number;
  receivedQty: number;
  pendingQty: number;
  unit: string;
  unitPrice: number;
  totalValue: number;
  batchNo?: string;
  expiryDate?: string;
  qualityStatus: 'Pending' | 'Passed' | 'Failed' | 'Partial';
  remarks?: string;
}

export interface GoodsReceiptData {
  grnNumber: string;
  grnDate: string;
  
  // Reference Documents
  poNumber: string;
  poDate: string;
  dcNumber?: string;
  dcDate?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  invoiceAmount?: number;
  
  // Vendor Details
  vendor: {
    name: string;
    address: string;
    gstin: string;
    phone: string;
  };
  
  // Receiving Location
  receivingLocation: string;
  
  // Transport Details
  transport: {
    vehicleNumber?: string;
    driverName?: string;
    lrNumber?: string;
    eWayBillNo?: string;
  };
  
  // Items
  items: GRNItemData[];
  
  // Summary
  totalOrderedQty: number;
  totalReceivedQty: number;
  totalPendingQty: number;
  totalValue: number;
  
  // Quality Summary
  itemsPassed: number;
  itemsFailed: number;
  itemsPending: number;
  overallQualityStatus: 'Pending Inspection' | 'Approved' | 'Partially Approved' | 'Rejected';
  
  // Personnel
  receivedBy: string;
  inspectedBy?: string;
  approvedBy?: string;
  storeIncharge?: string;
  
  // Remarks
  remarks?: string;
  qualityRemarks?: string;
}

// ==========================================
// GRN PRINT TEMPLATE
// ==========================================
const GoodsReceiptTemplate = forwardRef<HTMLDivElement, { 
  data: GoodsReceiptData;
  copyType?: 'ORIGINAL' | 'STORE COPY' | 'ACCOUNTS COPY' | 'PURCHASE COPY';
}>(({ data, copyType = 'ORIGINAL' }, ref) => {
  
  const getQualityStatusColor = (status: string) => {
    switch (status) {
      case 'Passed': return 'bg-green-100 text-green-800';
      case 'Failed': return 'bg-red-100 text-red-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
          documentType="GOODS RECEIPT NOTE"
          documentNumber={data.grnNumber}
          date={formatDate(data.grnDate)}
          copyType={copyType}
        />

        {/* Reference Documents */}
        <div className="flex flex-wrap gap-3 mb-4 text-xs">
          <div className="bg-blue-50 border border-blue-300 rounded px-3 py-1.5">
            <span className="text-gray-600">Against PO:</span>
            <span className="font-bold ml-1 text-blue-800">{data.poNumber}</span>
            <span className="text-gray-500 ml-1">({formatDate(data.poDate)})</span>
          </div>
          {data.dcNumber && (
            <div className="bg-green-50 border border-green-300 rounded px-3 py-1.5">
              <span className="text-gray-600">DC No:</span>
              <span className="font-semibold ml-1">{data.dcNumber}</span>
            </div>
          )}
          {data.invoiceNumber && (
            <div className="bg-purple-50 border border-purple-300 rounded px-3 py-1.5">
              <span className="text-gray-600">Invoice:</span>
              <span className="font-semibold ml-1">{data.invoiceNumber}</span>
              {data.invoiceAmount && (
                <span className="ml-1">({formatCurrency(data.invoiceAmount)})</span>
              )}
            </div>
          )}
          {data.transport.eWayBillNo && (
            <div className="bg-yellow-50 border border-yellow-300 rounded px-3 py-1.5">
              <span className="text-gray-600">E-Way Bill:</span>
              <span className="font-semibold ml-1">{data.transport.eWayBillNo}</span>
            </div>
          )}
        </div>

        {/* Vendor & Receiving Details */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <PartyDetailsBox
            title="Received From (Vendor)"
            name={data.vendor.name}
            address={data.vendor.address}
            gstin={data.vendor.gstin}
            phone={data.vendor.phone}
          />
          <div className="border border-gray-300 rounded-lg p-3 bg-green-50">
            <p className="text-xs font-bold text-green-800 uppercase mb-2 border-b border-green-200 pb-1">
              📦 Received At
            </p>
            <p className="font-semibold text-gray-800">{COMPANY_INFO.name}</p>
            <p className="text-xs text-gray-600 mt-1">{data.receivingLocation}</p>
            {data.transport.vehicleNumber && (
              <div className="mt-2 pt-2 border-t border-green-200">
                <p className="text-xs">
                  <span className="text-gray-600">Vehicle:</span>
                  <span className="font-medium ml-1">{data.transport.vehicleNumber}</span>
                </p>
                {data.transport.driverName && (
                  <p className="text-xs">
                    <span className="text-gray-600">Driver:</span>
                    <span className="font-medium ml-1">{data.transport.driverName}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quality Status Badge */}
        <div className="mb-4 flex justify-between items-center">
          <div className="text-xs">
            <span className="text-gray-600">Overall Quality Status:</span>
            <span className={`ml-2 px-3 py-1 rounded font-bold ${
              data.overallQualityStatus === 'Approved' ? 'bg-green-500 text-white' :
              data.overallQualityStatus === 'Rejected' ? 'bg-red-500 text-white' :
              data.overallQualityStatus === 'Partially Approved' ? 'bg-orange-500 text-white' :
              'bg-yellow-500 text-black'
            }`}>
              {data.overallQualityStatus.toUpperCase()}
            </span>
          </div>
          <div className="flex gap-3 text-xs">
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded">✓ Passed: {data.itemsPassed}</span>
            <span className="bg-red-100 text-red-800 px-2 py-1 rounded">✗ Failed: {data.itemsFailed}</span>
            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">⏳ Pending: {data.itemsPending}</span>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full mb-4 text-[9px] border-collapse">
          <thead>
            <tr className="bg-blue-800 text-white">
              <th className="py-1.5 px-1 text-center border w-8">S.No</th>
              <th className="py-1.5 px-1 text-left border w-16">Code</th>
              <th className="py-1.5 px-1 text-left border">Description</th>
              <th className="py-1.5 px-1 text-center border w-14">Ordered</th>
              <th className="py-1.5 px-1 text-center border w-14">Received</th>
              <th className="py-1.5 px-1 text-center border w-14">Pending</th>
              <th className="py-1.5 px-1 text-center border w-10">Unit</th>
              <th className="py-1.5 px-1 text-right border w-14">Rate</th>
              <th className="py-1.5 px-1 text-right border w-16">Value</th>
              <th className="py-1.5 px-1 text-center border w-16">QC Status</th>
              <th className="py-1.5 px-1 text-left border w-20">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="py-1.5 px-1 text-center border">{item.slNo}</td>
                <td className="py-1.5 px-1 border font-medium text-blue-700">{item.itemCode}</td>
                <td className="py-1.5 px-1 border">
                  {item.description}
                  {item.batchNo && <span className="text-gray-500 text-[8px] block">Batch: {item.batchNo}</span>}
                </td>
                <td className="py-1.5 px-1 text-center border">{item.orderedQty}</td>
                <td className="py-1.5 px-1 text-center border font-bold text-green-700">{item.receivedQty}</td>
                <td className="py-1.5 px-1 text-center border">
                  {item.pendingQty > 0 ? (
                    <span className="text-red-600 font-semibold">{item.pendingQty}</span>
                  ) : (
                    <span className="text-green-600">0</span>
                  )}
                </td>
                <td className="py-1.5 px-1 text-center border">{item.unit}</td>
                <td className="py-1.5 px-1 text-right border">{formatCurrency(item.unitPrice)}</td>
                <td className="py-1.5 px-1 text-right border">{formatCurrency(item.totalValue)}</td>
                <td className="py-1.5 px-1 text-center border">
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold ${getQualityStatusColor(item.qualityStatus)}`}>
                    {item.qualityStatus}
                  </span>
                </td>
                <td className="py-1.5 px-1 border text-gray-600">{item.remarks || '-'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-200 font-semibold">
              <td colSpan={3} className="py-2 px-2 border text-right">TOTAL:</td>
              <td className="py-2 px-1 text-center border">{data.totalOrderedQty}</td>
              <td className="py-2 px-1 text-center border text-green-700">{data.totalReceivedQty}</td>
              <td className="py-2 px-1 text-center border text-red-600">{data.totalPendingQty}</td>
              <td className="py-2 px-1 border"></td>
              <td className="py-2 px-1 border"></td>
              <td className="py-2 px-1 text-right border font-bold">{formatCurrency(data.totalValue)}</td>
              <td className="py-2 px-1 border"></td>
              <td className="py-2 px-1 border"></td>
            </tr>
          </tfoot>
        </table>

        {/* Summary Boxes */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="border border-blue-300 rounded p-3 bg-blue-50 text-center">
            <p className="text-xs text-gray-600">Total Ordered</p>
            <p className="text-xl font-bold text-blue-800">{data.totalOrderedQty}</p>
          </div>
          <div className="border border-green-300 rounded p-3 bg-green-50 text-center">
            <p className="text-xs text-gray-600">Total Received</p>
            <p className="text-xl font-bold text-green-700">{data.totalReceivedQty}</p>
          </div>
          <div className="border border-gray-300 rounded p-3 bg-gray-50 text-center">
            <p className="text-xs text-gray-600">Total Value</p>
            <p className="text-lg font-bold text-gray-800">{formatCurrency(data.totalValue)}</p>
          </div>
        </div>

        {/* Remarks */}
        {(data.remarks || data.qualityRemarks) && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            {data.remarks && (
              <div className="border border-gray-300 rounded p-2 text-xs">
                <span className="font-semibold">General Remarks:</span>
                <span className="ml-2">{data.remarks}</span>
              </div>
            )}
            {data.qualityRemarks && (
              <div className="border border-orange-300 rounded p-2 text-xs bg-orange-50">
                <span className="font-semibold">Quality Remarks:</span>
                <span className="ml-2">{data.qualityRemarks}</span>
              </div>
            )}
          </div>
        )}

        {/* Signatures Section */}
        <div className="grid grid-cols-4 gap-3 mt-6 text-xs">
          <div className="text-center border border-gray-300 rounded p-3">
            <p className="font-semibold text-gray-700 mb-6">Received By</p>
            <div className="border-t border-gray-400 pt-1">
              <p className="font-medium">{data.receivedBy}</p>
              <p className="text-[10px] text-gray-500">Store Executive</p>
            </div>
          </div>
          <div className="text-center border border-gray-300 rounded p-3">
            <p className="font-semibold text-gray-700 mb-6">Inspected By</p>
            <div className="border-t border-gray-400 pt-1">
              <p className="font-medium">{data.inspectedBy || '____________'}</p>
              <p className="text-[10px] text-gray-500">Quality Team</p>
            </div>
          </div>
          <div className="text-center border border-gray-300 rounded p-3">
            <p className="font-semibold text-gray-700 mb-6">Verified By</p>
            <div className="border-t border-gray-400 pt-1">
              <p className="font-medium">{data.storeIncharge || '____________'}</p>
              <p className="text-[10px] text-gray-500">Store Incharge</p>
            </div>
          </div>
          <div className="text-center border border-gray-300 rounded p-3">
            <p className="font-semibold text-gray-700 mb-6">Approved By</p>
            <div className="border-t border-gray-400 pt-1">
              <p className="font-medium">{data.approvedBy || '____________'}</p>
              <p className="text-[10px] text-gray-500">Manager</p>
            </div>
          </div>
        </div>

        {/* Important Notes */}
        <div className="mt-4 p-2 bg-yellow-50 border border-yellow-300 rounded text-[9px] text-gray-700">
          <p className="font-semibold">Important:</p>
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            <li>Materials received must be inspected within 24 hours</li>
            <li>Discrepancies must be reported to Purchase team immediately</li>
            <li>Failed items must be segregated and marked for return</li>
            <li>Stock will be updated only after QC approval</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-gray-300 text-center">
          <p className="text-[10px] text-gray-500">
            This is a system-generated GRN. Stock update pending quality verification.
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            {COMPANY_INFO.name} | Store Management System
          </p>
        </div>
      </div>
    </>
  );
});

GoodsReceiptTemplate.displayName = 'GoodsReceiptTemplate';

export default GoodsReceiptTemplate;
