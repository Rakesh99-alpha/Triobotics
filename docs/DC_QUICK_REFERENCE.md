# 🚀 DC Creation - Quick Start Card

## ⚡ Quick Access URLs

```
DC Management:    http://localhost:3000/purchase/documents/dc
Documents Hub:    http://localhost:3000/purchase/documents
Purchase Page:    http://localhost:3000/purchase
```

---

## 📝 Create DC in 5 Steps

1. **Navigate**: Go to `/purchase/documents/dc`
2. **Click**: "Create New DC" button (green, top-right)
3. **Fill**: Consignee details + Add items
4. **Save**: Click "Create DC"
5. **Print**: Click eye icon → Print button

---

## 📍 Edit Company Address

**File**: `src/app/(dashboard)/purchase/documents/DocumentTemplates.tsx`  
**Line**: 17 (Unit-I) or 22 (Unit-II)

```typescript
// Change this:
address: 'Plot No. 176, Jagananna Mega Industrial Hub...'

// To your address:
address: 'Your Company Address Here'
```

**Also Update:**
- Line 18/23: Phone number
- Line 26: GSTIN
- Line 29: Email

---

## 🎯 Required Fields for DC

✅ DC Number (auto-generated)  
✅ DC Date  
✅ Consignee Name  
✅ Consignee Address  
✅ Consignee GSTIN  
✅ At least 1 Item (Code, Description, Qty)

---

## 🔧 Files to Edit

| What | File Path | Line |
|------|-----------|------|
| Company Address | `documents/DocumentTemplates.tsx` | 10-30 |
| DC Form Defaults | `documents/dc/page.tsx` | 69-74 |
| DC Database Logic | `lib/services/dcService.ts` | All |

---

## 💾 Database Info

**Collection**: `delivery_challans`  
**Location**: Firebase Firestore  
**Real-time**: Yes (auto-sync)

---

## 🎨 DC Status Colors

🟠 **Draft** - Just created  
🔵 **Dispatched** - Material sent  
🟢 **Delivered** - Customer received  
🔴 **Cancelled** - DC cancelled

---

## 🛠️ Actions Available

👁️ **View** - Preview & Print DC  
✏️ **Edit** - Modify existing DC  
🗑️ **Delete** - Remove DC from system  
🔍 **Search** - Find by DC#, Consignee, PO#

---

## 📦 Item Units Available

- **Pcs** - Pieces
- **Kg** - Kilograms
- **Ltr** - Liters
- **Mtr** - Meters
- **Box** - Boxes

---

## 🚚 Transport Modes

- Road
- Rail
- Air
- Courier
- Hand Delivery

---

## 📄 DC Copy Types

When printing:
- **ORIGINAL** → Customer
- **DUPLICATE** → Office
- **TRIPLICATE** → Store
- **TRANSPORT COPY** → Driver

---

## ⚠️ Common Mistakes

❌ Forgetting to add items  
❌ Missing consignee GSTIN  
❌ Empty address field  
❌ Not saving after filling form

---

## ✅ Test Your DC

1. Create a test DC
2. Fill dummy data
3. Add 1-2 items
4. Save & view
5. Print/PDF
6. Delete test DC

---

## 🎓 Pro Tips

💡 DC number auto-generates - you can edit it  
💡 Search works on DC#, Consignee, or PO#  
💡 Edit company address once, applies to all docs  
💡 Can create DC without PO number (optional)  
💡 Add multiple items in one DC  

---

**Print This Card & Keep Handy! 📌**
