'use client';

import React, { useMemo } from 'react';
/* eslint-disable @next/next/no-img-element */
// Using standard img tag instead of Next.js Image for print compatibility

// ==========================================
// COMPANY DETAILS - Triovision
// ==========================================
export const COMPANY_INFO = {
  name: 'Triovision Composite Technologies Pvt Ltd',
  shortName: 'TRIOVISION',
  tagline: 'SHAPING IDEAS INTO REALITY',
  units: {
    unit1: {
      name: 'Unit - I',
      address: 'Plot No. 176, Jagananna Mega Industrial Hub, Kopparthy(V), C K Dinne(M), Kadapa - 516003, Andhra Pradesh',
      phone: '+91 9281434840',
    },
    unit2: {
      name: 'Unit - II',
      address: 'Plot No. 165, Kopparthy Mega Industrial Park, Kopparthy(V), C K Dinne(M), Kadapa - 516003, Andhra Pradesh',
      phone: '+91 9281434840',
    }
  },
  gstin: '37AAFCT4716N1ZV',
  pan: 'AAFCT4716N',
  cin: 'U25209AP2018PTC108789',
  email: 'info@triovision.in',
  website: 'www.triovision.in',
  bankDetails: {
    bankName: 'HDFC Bank',
    branch: 'Kadapa',
    accountNumber: '50200068945123',
    ifsc: 'HDFC0001234',
    accountType: 'Current Account'
  }
};

// ==========================================
// PRINT STYLES - Shared across all documents
// ==========================================
export const printStyles = `
  @media print {
    @page {
      size: A4;
      margin: 10mm 15mm;
    }
    body {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .doc-container {
      width: 100% !important;
      max-width: none !important;
      padding: 0 !important;
      box-shadow: none !important;
    }
    .doc-container img {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .page-break {
      page-break-before: always;
    }
    .no-print {
      display: none !important;
    }
    table {
      page-break-inside: auto;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
  }
`;

// ==========================================
// DOCUMENT HEADER COMPONENT
// ==========================================
interface DocumentHeaderProps {
  documentType: 'PURCHASE ORDER' | 'DELIVERY CHALLAN' | 'TAX INVOICE' | 'GOODS RECEIPT NOTE' | 'QUOTATION';
  documentNumber: string;
  date: string;
  copyType?: string; // Flexible to support all document copy types
}

export const DocumentHeader: React.FC<DocumentHeaderProps> = ({
  documentType,
  documentNumber,
  date,
  copyType = 'ORIGINAL'
}) => {
  return (
    <div className="border-b-2 border-blue-800 pb-4 mb-4">
      {/* Top Row - Logo & Copy Type */}
      <div className="flex justify-between items-start mb-4">
        {/* Logo - Using actual company logo with standard img for print compatibility */}
        <div className="flex items-center gap-3">
          <img 
            src="/Tlogo.png" 
            alt="Triovision Logo" 
            width={64} 
            height={64}
            className="w-16 h-16 object-contain"
          />
          <div>
            <h1 className="text-xl font-bold text-blue-800 tracking-wide">TRIOVISION</h1>
            <p className="text-xs text-gray-600 font-medium">Composite Technologies Pvt Ltd</p>
            <p className="text-[10px] text-blue-600 italic">{COMPANY_INFO.tagline}</p>
          </div>
        </div>
        
        {/* Copy Type Badge */}
        <div className="text-right">
          <span className="bg-blue-800 text-white px-3 py-1 text-xs font-bold rounded">
            {copyType}
          </span>
        </div>
      </div>

      {/* Document Title */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-600 text-white px-4 py-3 rounded-lg shadow">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold tracking-wider">{documentType}</h2>
          <div className="text-right text-sm">
            <p><span className="opacity-80">No:</span> <span className="font-bold">{documentNumber}</span></p>
            <p><span className="opacity-80">Date:</span> <span className="font-medium">{date}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// PARTY DETAILS BOX
// ==========================================
interface PartyDetailsProps {
  title: string;
  name: string;
  address: string;
  gstin?: string;
  phone?: string;
  email?: string;
  stateCode?: string;
}

export const PartyDetailsBox: React.FC<PartyDetailsProps> = ({
  title,
  name,
  address,
  gstin,
  phone,
  email,
  stateCode
}) => {
  return (
    <div className="border border-gray-300 rounded-lg p-3 bg-gray-50">
      <p className="text-xs font-bold text-gray-600 uppercase mb-2 border-b pb-1">{title}</p>
      <p className="font-semibold text-gray-800">{name}</p>
      <p className="text-xs text-gray-600 mt-1 leading-relaxed">{address}</p>
      {gstin && (
        <p className="text-xs mt-2">
          <span className="font-semibold">GSTIN:</span> {gstin}
        </p>
      )}
      {stateCode && (
        <p className="text-xs">
          <span className="font-semibold">State Code:</span> {stateCode}
        </p>
      )}
      {phone && (
        <p className="text-xs">
          <span className="font-semibold">Phone:</span> {phone}
        </p>
      )}
      {email && (
        <p className="text-xs">
          <span className="font-semibold">Email:</span> {email}
        </p>
      )}
    </div>
  );
};

// ==========================================
// DOCUMENT FOOTER
// ==========================================
interface DocumentFooterProps {
  companyName: string;
  showBankDetails?: boolean;
  showDeclaration?: boolean;
  declarationText?: string;
}

export const DocumentFooter: React.FC<DocumentFooterProps> = ({
  companyName,
  showBankDetails = false,
  showDeclaration = true,
  declarationText
}) => {
  return (
    <div className="mt-6 pt-4 border-t-2 border-gray-300">
      <div className="grid grid-cols-2 gap-8">
        {/* Left - Bank Details / Declaration */}
        <div>
          {showBankDetails && (
            <div className="text-xs">
              <p className="font-bold text-gray-700 mb-2">Bank Details:</p>
              <table className="text-gray-600">
                <tbody>
                  <tr>
                    <td className="pr-2">Bank Name:</td>
                    <td className="font-medium">{COMPANY_INFO.bankDetails.bankName}</td>
                  </tr>
                  <tr>
                    <td className="pr-2">Account No:</td>
                    <td className="font-medium">{COMPANY_INFO.bankDetails.accountNumber}</td>
                  </tr>
                  <tr>
                    <td className="pr-2">IFSC:</td>
                    <td className="font-medium">{COMPANY_INFO.bankDetails.ifsc}</td>
                  </tr>
                  <tr>
                    <td className="pr-2">Branch:</td>
                    <td className="font-medium">{COMPANY_INFO.bankDetails.branch}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          {showDeclaration && (
            <div className="text-xs text-gray-600 mt-4">
              <p className="font-semibold">Declaration:</p>
              <p className="text-[10px] leading-relaxed">
                {declarationText || 'We declare that this document shows the actual details of the goods described and that all particulars are true and correct.'}
              </p>
            </div>
          )}
        </div>

        {/* Right - Signature */}
        <div className="text-right">
          <p className="font-semibold text-xs text-gray-700">For {companyName}</p>
          <div className="h-16 border-b border-gray-400 mt-2 mb-1"></div>
          <p className="text-xs text-gray-600">Authorized Signatory</p>
        </div>
      </div>

      {/* Bottom Note */}
      <p className="text-center text-[10px] text-gray-400 mt-4">
        This is a computer-generated document. Subject to {COMPANY_INFO.name} Terms & Conditions.
      </p>
    </div>
  );
};

// ==========================================
// AMOUNT IN WORDS UTILITY
// ==========================================
export function amountInWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertLessThanThousand(n: number): string {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertLessThanThousand(n % 100) : '');
  }

  if (num === 0) return 'Zero Rupees Only';

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const hundred = Math.floor(num % 1000);
  const paise = Math.round((num % 1) * 100);

  let result = '';
  if (crore) result += convertLessThanThousand(crore) + ' Crore ';
  if (lakh) result += convertLessThanThousand(lakh) + ' Lakh ';
  if (thousand) result += convertLessThanThousand(thousand) + ' Thousand ';
  if (hundred) result += convertLessThanThousand(hundred);

  result = result.trim() + ' Rupees';
  if (paise) result += ' and ' + convertLessThanThousand(paise) + ' Paise';
  result += ' Only';

  return result;
}

// ==========================================
// CURRENCY FORMATTER
// ==========================================
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// ==========================================
// DATE FORMATTER
// ==========================================
export function formatDate(dateStr: string, includeTime: boolean = false): string {
  const date = new Date(dateStr);
  if (includeTime) {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// ==========================================
// QR CODE PLACEHOLDER (for verification)
// ==========================================
export const QRCodePlaceholder: React.FC<{ data: string }> = ({ data }) => {
  // Generate deterministic pattern based on data string
  const pattern = useMemo(() => {
    const hash = data.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return Array.from({ length: 25 }).map((_, i) => ((hash + i) % 3) !== 0);
  }, [data]);

  return (
    <div className="w-20 h-20 border border-gray-300 flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="grid grid-cols-5 gap-0.5">
          {pattern.map((isFilled, i) => (
            <div
              key={i}
              className={`w-3 h-3 ${isFilled ? 'bg-black' : 'bg-white'}`}
            />
          ))}
        </div>
        <p className="text-[6px] text-gray-500 mt-1">Scan to verify</p>
      </div>
    </div>
  );
};

const DocumentTemplatesExports = {
  COMPANY_INFO,
  printStyles,
  DocumentHeader,
  PartyDetailsBox,
  DocumentFooter,
  amountInWords,
  formatCurrency,
  formatDate,
  QRCodePlaceholder
};

export default DocumentTemplatesExports;
