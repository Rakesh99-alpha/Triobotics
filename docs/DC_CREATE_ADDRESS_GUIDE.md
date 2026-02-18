# 📋 DC Creation & Address Configuration Guide

## 🎉 NEW: Create DC Feature - Now Available!

You can now **create, edit, and manage Delivery Challans** with your own data!

---

## 🚀 How to Access DC Creation

### **Method 1: Direct URL**
Navigate to: **`http://localhost:3000/purchase/documents/dc`**

### **Method 2: From Documents Page**
1. Go to: `/purchase/documents`
2. Click the green **"Create & Manage DCs"** button (top-right corner)
3. Opens DC Management page

---

## ✨ DC Management Features

### **What You Can Do:**
✅ **Create New DC** - Fill form with your data  
✅ **View All DCs** - List of all created delivery challans  
✅ **Edit DC** - Update existing DC details  
✅ **Delete DC** - Remove unwanted DCs  
✅ **Print DC** - Professional print format  
✅ **Search DCs** - Find by DC number, consignee, or PO number  
✅ **Track Status** - Draft, Dispatched, Delivered, Cancelled  

---

## 📝 How to Create a NEW DC

### **Step-by-Step Instructions:**

1. **Navigate to DC Management**
   - Go to: `/purchase/documents/dc`
   - Or click "Create & Manage DCs" button

2. **Click "Create New DC" Button**
   - Big green button in top-right corner

3. **Fill DC Details:**

   **Basic Info:**
   - DC Number (auto-generated, you can edit)
   - DC Date
   - PO Number (optional - if dispatch is against a PO)
   - PO Date

   **Consignee Details (Required):**
   - Consignee Name (customer/receiver)
   - Address
   - GSTIN
   - State Code
   - Phone

   **Transport Details:**
   - Transport Mode (Road/Rail/Air/Courier)
   - Vehicle Number
   - Driver Name & Phone
   - LR Number (Lorry Receipt)
   - E-Way Bill Number

   **Items (Required - Add at least 1):**
   - Item Code
   - Description
   - HSN Code
   - Quantity
   - Unit (Pcs/Kg/Ltr/Mtr/Box)
   - Click "+ Add Item" button
   - Repeat for multiple items

   **Additional:**
   - Reason for Transport (Supply/Job Work/etc.)
   - Status (Draft/Dispatched/Delivered)
   - Remarks

4. **Click "Create DC" Button**
   - DC is saved to database
   - Shows in DC list

5. **View/Print DC**
   - Click "Eye" icon to preview
   - Click "Print" button
   - Choose print or save as PDF

---

## 📍 Where to Change Addresses

### **1. Company Address (Consignor - FROM)**

**File to Edit:**  
📁 `src/app/(dashboard)/purchase/documents/DocumentTemplates.tsx`

**Line Numbers:** Lines 10-26

**Current Address:**
```typescript
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
}
```

**To Update:**
1. Open: `src/app/(dashboard)/purchase/documents/DocumentTemplates.tsx`
2. Find `export const COMPANY_INFO`
3. Change:
   - `units.unit1.address` - Line 17
   - `units.unit2.address` - Line 22
   - `phone` - Line 18 or 23
   - `gstin` - Line 26
   - `email` - Line 29

**This will update addresses in:**
- ✅ Purchase Orders (PO)
- ✅ Delivery Challans (DC)
- ✅ Tax Invoices
- ✅ Goods Receipt Notes (GRN)

---

### **2. Default Consignor in DC Creation Form**

**File to Edit:**  
📁 `src/app/(dashboard)/purchase/documents/dc/page.tsx`

**Line Numbers:** Lines 69-74

**Current Default:**
```typescript
consignorName: COMPANY_INFO.name,
consignorAddress: COMPANY_INFO.units.unit1.address,
consignorGSTIN: COMPANY_INFO.gstin,
consignorStateCode: '37',
consignorPhone: COMPANY_INFO.units.unit1.phone,
```

**To Update:**
- Change `unit1` to `unit2` if you want Unit-II as default
- Or edit the values directly in the form when creating DC

---

### **3. Customer/Consignee Address (TO)**

**Entered When Creating DC:**
- Not fixed - you enter this for each DC
- Each customer has different address
- Fill in the "Consignee Details" section of the form

---

## 📂 File Locations Summary

| What to Edit | File Path | Lines |
|-------------|-----------|-------|
| **Company Address** | `src/app/(dashboard)/purchase/documents/DocumentTemplates.tsx` | 10-30 |
| **DC Management Page** | `src/app/(dashboard)/purchase/documents/dc/page.tsx` | Full file |
| **DC Template** | `src/app/(dashboard)/purchase/documents/DeliveryChallanTemplate.tsx` | Full file |
| **DC Service (Database)** | `src/lib/services/dcService.ts` | Full file |
| **Documents Hub** | `src/app/(dashboard)/purchase/documents/page.tsx` | Full file |

---

## 🔄 DC Workflow

```
1. Navigate to DC Management
   ↓
2. Click "Create New DC"
   ↓
3. Fill Form:
   - Basic Info (DC#, Date, PO#)
   - Consignee Details (Customer)
   - Transport Info (Vehicle, Driver, E-Way Bill)
   - Add Items (Materials/Products)
   - Set Status & Remarks
   ↓
4. Click "Create DC"
   ↓
5. DC Saved to Firestore Database
   ↓
6. Shows in DC List
   ↓
7. Can Edit/View/Print/Delete
   ↓
8. Click Eye Icon → Preview
   ↓
9. Click Print → PDF/Physical Print
   ↓
10. DC Ready for Dispatch!
```

---

## 🎯 Quick Reference

### **Create DC URL:**
```
http://localhost:3000/purchase/documents/dc
```

### **Documents Hub URL:**
```
http://localhost:3000/purchase/documents
```

### **Edit Company Address:**
```
File: src/app/(dashboard)/purchase/documents/DocumentTemplates.tsx
Section: COMPANY_INFO (Line 10)
```

### **DC Database Collection:**
```
Firestore Collection: delivery_challans
```

---

## 📋 DC Form Fields Explanation

### **Required Fields (Must Fill):**
- ✅ DC Number
- ✅ DC Date
- ✅ Consignee Name
- ✅ Consignee Address
- ✅ Consignee GSTIN
- ✅ Consignee State Code
- ✅ Consignee Phone
- ✅ At least 1 Item

### **Optional Fields:**
- PO Number/Date (if dispatch is against PO)
- Transport details (Vehicle, Driver, LR, E-Way Bill)
- Remarks

---

## 💾 Data Storage

**Where DCs are Saved:**
- Firebase Firestore
- Collection: `delivery_challans`
- Real-time sync (changes appear instantly)

**DC Data Includes:**
```javascript
{
  dcNumber: "DC-20260207-123",
  dcDate: "2026-02-07",
  consigneeName: "ABC Manufacturing Ltd",
  items: [
    { itemCode: "FRP-001", description: "FRP Panel", quantity: 25, unit: "Pcs" }
  ],
  status: "dispatched",
  createdAt: Timestamp,
  createdBy: "user-id"
}
```

---

## 🚀 Advanced Features

### **1. Edit Existing DC**
- Click yellow "Edit" icon on any DC
- Form opens with existing data
- Make changes
- Click "Update DC"

### **2. Search DCs**
- Search box at top of DC list
- Search by: DC Number, Consignee Name, PO Number
- Real-time filtering

### **3. Status Tracking**
- **Draft** - DC created but not dispatched (Orange)
- **Dispatched** - Material sent (Blue)
- **Delivered** - Received by customer (Green)
- **Cancelled** - DC cancelled (Red)

### **4. Multiple Items**
- Add as many items as needed
- Each item has: Code, Description, HSN, Qty, Unit
- Remove with trash icon

### **5. Print with Copy Types**
- Original → Customer
- Duplicate → Office Record
- Triplicate → Store Copy
- Transport Copy → Driver

---

## 🎨 UI Features

### **Dashboard Stats:**
- Total DCs
- Draft DCs
- Dispatched DCs
- Delivered DCs

### **Color-Coded Status:**
- 🟠 Orange = Draft
- 🔵 Blue = Dispatched
- 🟢 Green = Delivered
- 🔴 Red = Cancelled

### **Action Buttons:**
- 👁️ Eye = View/Print
- ✏️ Edit = Modify DC
- 🗑️ Trash = Delete DC

---

## 🔧 Customization Guide

### **Change Default Unit:**
Open: `src/app/(dashboard)/purchase/documents/dc/page.tsx`  
Find: `unit: 'Pcs'` (Line ~81)  
Change to: `'Kg'`, `'Ltr'`, `'Mtr'`, or `'Box'`

### **Add More Transport Modes:**
Open: `src/lib/services/dcService.ts`  
Find: `transportMode: 'Road' | 'Rail' | 'Air' | 'Courier' | 'Hand Delivery'`  
Add more options: `| 'Ship' | 'Drone'`

### **Customize DC Number Format:**
Open: `src/lib/services/dcService.ts`  
Find: `generateDCNumber()` function (Line ~172)  
Modify: Change from `DC-YYYYMMDD-XXX` to your format

---

## 📱 Screenshot Reference

### **DC Management Page:**
```
┌────────────────────────────────────────────────────────┐
│  🚚 Delivery Challan Management    [Create New DC]     │
├────────────────────────────────────────────────────────┤
│  Stats: [Total: 5] [Draft: 2] [Dispatched: 2] [Delivered: 1] │
├────────────────────────────────────────────────────────┤
│  Search: [___________________________________]          │
├────────────────────────────────────────────────────────┤
│  DC#        Date      Consignee       PO#    Actions   │
│  DC-001  2026-02-07  ABC Ltd      PO-123  [👁️][✏️][🗑️] │
│  DC-002  2026-02-06  XYZ Corp     PO-124  [👁️][✏️][🗑️] │
└────────────────────────────────────────────────────────┘
```

### **Create DC Form:**
```
┌─────────────────────────────────────────────┐
│  🚚 Create New Delivery Challan       [X]   │
├─────────────────────────────────────────────┤
│  Basic Info:                                │
│  DC Number: [DC-20260207-123]               │
│  DC Date: [2026-02-07]                      │
│  PO Number: [PO-2026-001]                   │
│                                             │
│  📍 Consignee Details (To) *                │
│  Name: [ABC Manufacturing Ltd]              │
│  Address: [_________________________]       │
│  GSTIN: [33AABCA1234N1Z5]                  │
│                                             │
│  🚚 Transport Details                       │
│  Mode: [Road ▼]  Vehicle: [AP39TG4567]     │
│                                             │
│  📦 Items *                                 │
│  [Code] [Description] [HSN] [Qty] [Unit]   │
│  [+ Add Item]                               │
│                                             │
│  [Cancel]              [Create DC]          │
└─────────────────────────────────────────────┘
```

---

## ✅ Testing Checklist

- [ ] Open DC Management page
- [ ] Click "Create New DC"
- [ ] Fill consignee details
- [ ] Add at least 1 item
- [ ] Click "Create DC"
- [ ] See DC in list
- [ ] Click eye icon to view
- [ ] Click print button
- [ ] Edit DC
- [ ] Delete test DC

---

## 🆘 Troubleshooting

### **DC Not Saving?**
- Check all required fields are filled
- Ensure at least 1 item is added
- Check console for errors

### **Address Not Updating?**
- Edit `DocumentTemplates.tsx` file
- Update `COMPANY_INFO` object
- Restart dev server: `npm run dev`

### **Print Not Working?**
- Check if `react-to-print` package is installed
- Try using "Save as PDF" in print dialog

### **Database Connection Error?**
- Check Firebase config in `lib/firebase/client.ts`
- Ensure Firestore is enabled in Firebase console

---

## 📞 Support

**File Locations:**
- DC Management: `src/app/(dashboard)/purchase/documents/dc/page.tsx`
- Address Config: `src/app/(dashboard)/purchase/documents/DocumentTemplates.tsx`
- DC Service: `src/lib/services/dcService.ts`
- DC Template: `src/app/(dashboard)/purchase/documents/DeliveryChallanTemplate.tsx`

**Database:**
- Collection: `delivery_challans`
- Located in: Firebase Firestore

---

**Last Updated:** February 7, 2026  
**Version:** 2.0 - DC Creation Feature Added  
**Module:** Purchase Management - Triovision ERP
