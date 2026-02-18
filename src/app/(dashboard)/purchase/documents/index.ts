// ==========================================
// DOCUMENT TEMPLATES - Main Export
// ==========================================
// Professional document templates for Purchase workflow
// PO, DC, Invoice, GRN with print support

// Shared Components & Utilities
export {
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

// Individual Templates
export { default as PurchaseOrderTemplate, DEFAULT_PO_TERMS } from './PurchaseOrderTemplate';
export type { PurchaseOrderData, POItemEnhanced } from './PurchaseOrderTemplate';

export { default as DeliveryChallanTemplate } from './DeliveryChallanTemplate';
export type { DeliveryChallanData, DCItem } from './DeliveryChallanTemplate';

export { default as TaxInvoiceTemplate } from './TaxInvoiceTemplate';
export type { TaxInvoiceData, InvoiceItem } from './TaxInvoiceTemplate';

export { default as GoodsReceiptTemplate } from './GoodsReceiptTemplate';
export type { GoodsReceiptData, GRNItemData } from './GoodsReceiptTemplate';

// Print Hub
export { 
  DocumentPrintHub, 
  QuickPrintButtons,
  DOCUMENT_CONFIGS 
} from './DocumentPrintHub';
export type { DocumentType, DocumentConfig } from './DocumentPrintHub';
