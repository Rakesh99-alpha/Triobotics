# 📋 Delivery Challan (DC) Generation Guide

## Overview
This guide explains how to access, generate, and print Delivery Challans (DC) in the Triovision ERP system.

---

## ✅ Recent Changes

### Purchase Order Signature - **Updated!**
- Changed "Approved By" label to **"Purchase"** (simplified)
- Removed "Purchase Manager" subtitle
- Format now: **Prepared By** | **Purchase** | **For Triovision**

---

## 📍 Where is the DC?

### **Direct Access**
Navigate to: **`/purchase/documents`**

From localhost: `http://localhost:3000/purchase/documents`

### **From Purchase Module**
1. Go to Purchase Management page
2. Click the green **"Documents"** button in the top-right header
3. This opens the Documents Hub with all templates

---

## 📄 Available Documents

The Documents page provides **4 print-ready templates**:

| Document | Purpose | Copy Types |
|----------|---------|------------|
| **📄 Purchase Order (PO)** | Supplier orders | Original, Duplicate, Vendor Copy, Office Copy |
| **🚚 Delivery Challan (DC)** | Material dispatch | Original, Duplicate, Triplicate, Transport Copy |
| **📑 Tax Invoice** | Billing customers | Original for Recipient, Duplicate for Transporter, Triplicate for Supplier |
| **✅ Goods Receipt Note (GRN)** | Incoming materials | Original, Store Copy, Accounts Copy, Purchase Copy |

---

## 🚚 How to Generate a DC

### **Step 1: Navigate to Documents**
- From Purchase page → Click **"Documents"** button (green button in header)
- Or directly visit: `/purchase/documents`

### **Step 2: Select DC Template**
- Click on the **"Delivery Challan"** button (green truck icon)
- The DC preview will load with sample data

### **Step 3: Select Copy Type**
Choose from dropdown:
- **ORIGINAL** - For consignee/receiver
- **DUPLICATE** - Office record
- **TRIPLICATE** - Additional copy
- **TRANSPORT COPY** - For driver/logistics

### **Step 4: Review DC Details**
The DC includes:
- **DC Number & Date**
- **PO Reference** (if applicable)
- **Consignor Details** (From - Triovision)
- **Consignee Details** (To - Customer/Destination)
- **Transport Information**:
  - Mode (Road/Rail/Air/Courier)
  - Vehicle Number
  - Driver Name & Phone
  - LR (Lorry Receipt) Number
  - E-Way Bill Number
- **Items Table** (Code, Description, HSN, Quantity, Unit, Remarks)
- **Signatures** (Prepared By, Checked By, Received By, Authorized Signatory)

### **Step 5: Print**
- Click the **"Print Document"** button
- This opens the browser print dialog
- Choose printer or "Save as PDF"
- Print settings: A4 size, Portrait mode

---

## 🔧 Using DC with Real Data

Currently, the Documents page shows **sample data** for testing. To use with real data:

### **Option 1: Update Sample Data** (Quick testing)
Edit: `src/app/(dashboard)/purchase/documents/page.tsx`

Look for `SAMPLE_DC_DATA` constant (around line 123) and modify:
```typescript
const SAMPLE_DC_DATA: DeliveryChallanData = {
  dcNumber: 'DC-2026-078',  // Your DC number
  dcDate: '2026-01-31',     // Date
  poNumber: 'PO-2026-001',  // PO reference
  // ... update other fields
};
```

### **Option 2: Integrate with Database** (Production)
Create a DC from PO data:

1. Go to Purchase Orders tab
2. Select a PO that's "Ordered" or "Completed"
3. Add a "Generate DC" button (future feature)
4. System auto-fills DC from PO data
5. Confirm and print

---

## 📋 DC Template Structure

### **Header**
- Company logo & details
- Document title: "DELIVERY CHALLAN"
- DC Number, Date, PO Reference
- Copy type (ORIGINAL/DUPLICATE/etc.)

### **Party Details**
- **Consignor** (Sender - Triovision)
  - Name, Address, GSTIN, State Code, Phone
- **Consignee** (Receiver - Customer)
  - Name, Address, GSTIN, State Code, Phone

### **Transport Section**
- Mode of transport
- Vehicle number, Driver details
- LR Number, E-Way Bill

### **Items Table**
| S.No | Item Code | Description | HSN Code | Qty | Unit | Remarks |
|------|-----------|-------------|----------|-----|------|---------|
| 1    | FRP-001   | FRP Panel   | 39269099 | 25  | Pcs  | Handle with care |

### **Footer**
- Remarks
- 4 signature boxes: **Prepared By** | **Checked By** | **Received By** | **Authorized Signatory**

---

## 🔄 DC Workflow

### **Standard Process**
```
1. PO Approved & Ordered
   ↓
2. Materials Ready for Dispatch
   ↓
3. Generate DC (with items, vehicle, e-way bill)
   ↓
4. Print DC (4 copies: Original, Duplicate, Triplicate, Transport)
   ↓
5. Attach to shipment
   ↓
6. Customer signs "Received By"
   ↓
7. File in records (Office keeps Duplicate/Triplicate)
```

### **Copy Distribution**
- **ORIGINAL** → Goes with goods to customer
- **DUPLICATE** → Office/Accounts copy
- **TRIPLICATE** → Store/Dispatch copy
- **TRANSPORT COPY** → Driver keeps for LR/logistics

---

## 💾 File Locations

| Component | Path |
|-----------|------|
| **DC Template** | `src/app/(dashboard)/purchase/documents/DeliveryChallanTemplate.tsx` |
| **Documents Page** | `src/app/(dashboard)/purchase/documents/page.tsx` |
| **Document Utilities** | `src/app/(dashboard)/purchase/documents/DocumentTemplates.tsx` |
| **PO Template** | `src/app/(dashboard)/purchase/documents/PurchaseOrderTemplate.tsx` |

---

## ⚙️ Customization

### **Modify DC Format**
Edit: `DeliveryChallanTemplate.tsx`

Change table columns, add fields, adjust styling:
```tsx
// Example: Add a "Weight" column
<th className="py-2 px-2 text-center border">Weight</th>
// ...
<td className="py-2 px-2 text-center border">{item.weight}</td>
```

### **Update Company Details**
Edit: `DocumentTemplates.tsx`

Look for `COMPANY_INFO` constant:
```typescript
export const COMPANY_INFO = {
  name: 'Triovision Composite Technologies Pvt Ltd',
  shortName: 'Triovision',
  // ... update as needed
};
```

---

## 🧪 Testing

### **Test DC Generation**
1. Visit `/purchase/documents`
2. Click "Delivery Challan" button
3. Review pre-filled sample data
4. Try all 4 copy types
5. Click Print → Preview/Save as PDF

---

## 🚀 Next Steps

### **Planned Enhancements**
- [ ] Auto-generate DC from PO with one click
- [ ] Save DC records to Firestore
- [ ] Track DC status (Dispatched, Delivered, Received)
- [ ] Link DC to GRN (Goods Receipt)
- [ ] Search & filter past DCs
- [ ] Email DC PDF to customer
- [ ] QR code on DC for tracking

---

## 📞 Need Help?

- **Documents Page**: `/purchase/documents`
- **Purchase Module**: `/purchase`
- **Sample Data**: See `SAMPLE_DC_DATA` in `documents/page.tsx`

---

**Last Updated**: February 7, 2026  
**Version**: 1.0  
**Module**: Purchase Management - Triovision ERP
