'use client';

import React, { forwardRef } from 'react';
import {
  COMPANY_INFO,
  printStyles,
  DocumentHeader,
  PartyDetailsBox,
  formatDate
} from './DocumentTemplates';

// ==========================================
// DELIVERY CHALLAN DATA INTERFACE
// ==========================================
export interface DCItem {
  slNo: number;
  itemCode: string;
  description: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  remarks?: string;
}

export interface DeliveryChallanData {
  dcNumber: string;
  dcDate: string;
  poNumber?: string;
  poDate?: string;
  
  // Consignor (Sender)
  consignor: {
    name: string;
    address: string;
    gstin: string;
    stateCode: string;
    phone: string;
  };
  
  // Consignee (Receiver)
  consignee: {
    name: string;
    address: string;
    gstin: string;
    stateCode: string;
    phone: string;
  };
  
  // Transport Details
  transport: {
    mode: 'Road' | 'Rail' | 'Air' | 'Courier' | 'Hand Delivery';
    vehicleNumber?: string;
    driverName?: string;
    driverPhone?: string;
    lrNumber?: string; // Lorry Receipt Number
    lrDate?: string;
    eWayBillNo?: string;
    eWayBillDate?: string;
  };
  
  // Items
  items: DCItem[];
  
  // Reason for Transport
  reason: 'Supply' | 'Job Work' | 'Sales Return' | 'Approval' | 'Exhibition' | 'Personal Use' | 'Others';
  reasonRemarks?: string;
  
  // Additional
  preparedBy: string;
  checkedBy?: string;
  approvedBy?: string;
  remarks?: string;
}

// ==========================================
// DELIVERY CHALLAN PRINT TEMPLATE
// ==========================================
const DeliveryChallanTemplate = forwardRef<HTMLDivElement, { 
  data: DeliveryChallanData;
  copyType?: 'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE' | 'TRANSPORT COPY';
}>(({ data, copyType = 'ORIGINAL' }, ref) => {
  
  return (
    <>
      <style>{printStyles}</style>
      <div
        ref={ref}
        className="bg-white text-black p-6 max-w-4xl mx-auto doc-container shadow-lg"
        style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px' }}
      >
        {/* Document Header */}
        <DocumentHeader
          documentType="DELIVERY CHALLAN"
          documentNumber={data.dcNumber}
          date={formatDate(data.dcDate)}
          copyType={copyType}
        />

        {/* PO Reference (if any) */}
        {data.poNumber && (
          <div className="bg-yellow-50 border border-yellow-300 rounded px-3 py-2 mb-4 text-xs">
            <span className="font-semibold">Against PO:</span> {data.poNumber}
            {data.poDate && <span className="ml-4">Dated: {formatDate(data.poDate)}</span>}
          </div>
        )}

        {/* Consignor & Consignee Details */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <PartyDetailsBox
            title="Consignor (From)"
            name={data.consignor.name}
            address={data.consignor.address}
            gstin={data.consignor.gstin}
            stateCode={data.consignor.stateCode}
            phone={data.consignor.phone}
          />
          <PartyDetailsBox
            title="Consignee (To)"
            name={data.consignee.name}
            address={data.consignee.address}
            gstin={data.consignee.gstin}
            stateCode={data.consignee.stateCode}
            phone={data.consignee.phone}
          />
        </div>

        {/* Transport Details */}
        <div className="border border-gray-300 rounded-lg p-3 mb-4 bg-blue-50">
          <p className="text-xs font-bold text-blue-800 uppercase mb-2 border-b border-blue-200 pb-1">
            Transport Details
          </p>
          <div className="grid grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-gray-600">Mode:</span>
              <span className="font-medium ml-1">{data.transport.mode}</span>
            </div>
            {data.transport.vehicleNumber && (
              <div>
                <span className="text-gray-600">Vehicle No:</span>
                <span className="font-medium ml-1">{data.transport.vehicleNumber}</span>
              </div>
            )}
            {data.transport.driverName && (
              <div>
                <span className="text-gray-600">Driver:</span>
                <span className="font-medium ml-1">{data.transport.driverName}</span>
              </div>
            )}
            {data.transport.driverPhone && (
              <div>
                <span className="text-gray-600">Driver Ph:</span>
                <span className="font-medium ml-1">{data.transport.driverPhone}</span>
              </div>
            )}
            {data.transport.lrNumber && (
              <div>
                <span className="text-gray-600">LR No:</span>
                <span className="font-medium ml-1">{data.transport.lrNumber}</span>
              </div>
            )}
            {data.transport.eWayBillNo && (
              <div className="col-span-2">
                <span className="text-gray-600">E-Way Bill:</span>
                <span className="font-bold ml-1 text-blue-800">{data.transport.eWayBillNo}</span>
                {data.transport.eWayBillDate && (
                  <span className="ml-2 text-gray-500">({formatDate(data.transport.eWayBillDate)})</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Reason for Transport */}
        <div className="bg-gray-100 px-3 py-2 rounded mb-4 text-xs">
          <span className="font-semibold">Reason for Transport:</span>
          <span className="ml-2 font-medium text-blue-800">{data.reason}</span>
          {data.reasonRemarks && (
            <span className="ml-2 text-gray-600">- {data.reasonRemarks}</span>
          )}
        </div>

        {/* Items Table */}
        <table className="w-full mb-4 text-xs border-collapse">
          <thead>
            <tr className="bg-blue-800 text-white">
              <th className="py-2 px-2 text-center border border-blue-900 w-10">S.No</th>
              <th className="py-2 px-2 text-left border border-blue-900 w-24">Item Code</th>
              <th className="py-2 px-2 text-left border border-blue-900">Description</th>
              <th className="py-2 px-2 text-center border border-blue-900 w-20">HSN Code</th>
              <th className="py-2 px-2 text-center border border-blue-900 w-16">Qty</th>
              <th className="py-2 px-2 text-center border border-blue-900 w-16">Unit</th>
              <th className="py-2 px-2 text-left border border-blue-900 w-32">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="py-2 px-2 text-center border">{item.slNo}</td>
                <td className="py-2 px-2 border font-medium">{item.itemCode}</td>
                <td className="py-2 px-2 border">{item.description}</td>
                <td className="py-2 px-2 text-center border">{item.hsnCode}</td>
                <td className="py-2 px-2 text-center border font-semibold">{item.quantity}</td>
                <td className="py-2 px-2 text-center border">{item.unit}</td>
                <td className="py-2 px-2 border text-gray-600">{item.remarks || '-'}</td>
              </tr>
            ))}
            {/* Empty rows for manual entry */}
            {data.items.length < 10 && Array.from({ length: 10 - data.items.length }).map((_, i) => (
              <tr key={`empty-${i}`} className="h-8">
                <td className="border"></td>
                <td className="border"></td>
                <td className="border"></td>
                <td className="border"></td>
                <td className="border"></td>
                <td className="border"></td>
                <td className="border"></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-semibold">
              <td colSpan={4} className="py-2 px-2 border text-right">Total Items:</td>
              <td className="py-2 px-2 border text-center">{data.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
              <td className="py-2 px-2 border"></td>
              <td className="py-2 px-2 border"></td>
            </tr>
          </tfoot>
        </table>

        {/* Remarks */}
        {data.remarks && (
          <div className="border border-gray-300 rounded p-3 mb-4 text-xs bg-yellow-50">
            <span className="font-semibold">Remarks:</span>
            <span className="ml-2">{data.remarks}</span>
          </div>
        )}

        {/* Signatures Section */}
        <div className="grid grid-cols-4 gap-4 mt-8 text-xs">
          <div className="text-center">
            <p className="font-semibold mb-8">Prepared By</p>
            <div className="border-t border-gray-400 pt-1">
              <p>{data.preparedBy}</p>
            </div>
          </div>
          <div className="text-center">
            <p className="font-semibold mb-8">Checked By</p>
            <div className="border-t border-gray-400 pt-1">
              <p>{data.checkedBy || '____________'}</p>
            </div>
          </div>
          <div className="text-center">
            <p className="font-semibold mb-8">Received By</p>
            <div className="border-t border-gray-400 pt-1">
              <p>____________</p>
              <p className="text-[10px] text-gray-500">(Name & Sign with Stamp)</p>
            </div>
          </div>
          <div className="text-center">
            <p className="font-semibold mb-8">For {COMPANY_INFO.shortName}</p>
            <div className="border-t border-gray-400 pt-1">
              <p className="text-gray-600">Authorized Signatory</p>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 pt-3 border-t border-gray-300">
          <p className="text-[10px] text-gray-500 text-center">
            This Delivery Challan is valid only with authorized signature. 
            Goods once delivered will not be taken back. E&OE.
          </p>
          <p className="text-[10px] text-gray-400 text-center mt-1">
            {COMPANY_INFO.name} | GSTIN: {COMPANY_INFO.gstin} | CIN: {COMPANY_INFO.cin}
          </p>
        </div>
      </div>
    </>
  );
});

DeliveryChallanTemplate.displayName = 'DeliveryChallanTemplate';

export default DeliveryChallanTemplate;
