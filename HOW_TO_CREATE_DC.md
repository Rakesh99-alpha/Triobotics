# 🎯 HOW TO CREATE & PRINT A DC - STEP BY STEP

## ✅ Server is Running!
Your development server is now at: **http://localhost:3000**

---

## 📝 STEP 1: Go to DC Creation Page

**Copy this URL and paste in your browser:**
```
http://localhost:3000/purchase/documents/dc
```

OR

**Navigate through the app:**
1. Go to: `http://localhost:3000/purchase`
2. Click the green **"Documents"** button (top-right corner)
3. Click the green **"Create & Manage DCs"** button

---

## 📝 STEP 2: Create a New DC

1. **Click the big green button** that says **"Create New DC"**
   - It's at the top-right of the DC Management page

2. **You'll see a form popup** - Fill these fields:

### ✅ REQUIRED Fields (Must Fill):

**Basic Information:**
- **DC Number**: Already filled (DC-YYYYMMDD-XXX) - you can change it
- **DC Date**: Select today's date

**Consignee Details (Customer Information):**
- **Consignee Name**: Type customer company name
  - Example: "ABC Manufacturing Ltd"
- **Address**: Type customer full address
  - Example: "Plot 23, Industrial Area, Chennai - 600001"
- **GSTIN**: Type customer GST number
  - Example: "33AABCA1234N1Z5"
- **State Code**: Type 2-digit state code
  - Example: "33" for Tamil Nadu
- **Phone**: Type customer phone
  - Example: "+91 9876543210"

**Items (Add Products):**
1. Scroll down to "Items" section
2. Fill in one row:
   - **Item Code**: Example: "FRP-001"
   - **Description**: Example: "FRP Body Panel"
   - **HSN**: Example: "39269099"
   - **Qty**: Example: 25
   - **Unit**: Select from dropdown (Pcs/Kg/Ltr/Mtr/Box)
3. **Click the "+ Add Item" button** (important!)
4. You'll see the item appear in the list above
5. Repeat to add more items

### 📦 OPTIONAL Fields:

**PO Reference (if applicable):**
- PO Number
- PO Date

**Transport Details:**
- Vehicle Number: Example: "AP39TG4567"
- Driver Name: Example: "Ramesh Kumar"
- Driver Phone: Example: "+91 9876543210"
- E-Way Bill No: Example: "EWB123456789012"

**Other:**
- Reason for Transport: Select from dropdown
- Status: Select Draft/Dispatched/Delivered
- Remarks: Any special notes

---

## 📝 STEP 3: Save the DC

1. After filling all required fields
2. After adding at least 1 item
3. **Click the green "Create DC" button** at the bottom
4. You'll see a success message
5. The popup will close
6. Your DC will appear in the list!

---

## 🖨️ STEP 4: Print the DC

### Option A: View & Print from List

1. Find your DC in the list (it will be at the top)
2. **Click the "Eye" icon** 👁️ in the Actions column
3. A preview window opens showing your DC
4. **Click the "Print" button** at the top
5. Choose:
   - **Print** to physical printer
   - **Save as PDF** to save on computer
6. Done! ✅

### Option B: Direct Print

1. Your DC appears in the list
2. Right side has action buttons
3. Click the blue **eye icon** 👁️
4. Preview opens
5. Click **Print** button
6. Save as PDF or print

---

## 🎥 VISUAL GUIDE

```
┌─────────────────────────────────────────────────────────┐
│  STEP 1: Go to URL                                      │
│  http://localhost:3000/purchase/documents/dc            │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  STEP 2: Click "Create New DC" Button                   │
│  [+ Create New DC]  ← Click this green button          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  STEP 3: Fill Form                                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │ DC Number: [DC-20260207-123]                    │   │
│  │ DC Date: [2026-02-07]                           │   │
│  │                                                  │   │
│  │ Consignee Name: [ABC Manufacturing Ltd]         │   │
│  │ Address: [Plot 23, Industrial Area...]          │   │
│  │ GSTIN: [33AABCA1234N1Z5]                       │   │
│  │ State Code: [33]                                │   │
│  │ Phone: [+91 9876543210]                         │   │
│  │                                                  │   │
│  │ Items:                                          │   │
│  │ Code: [FRP-001] Desc: [FRP Panel]              │   │
│  │ HSN: [39269099] Qty: [25] Unit: [Pcs]          │   │
│  │ [+ Add Item] ← Click after filling              │   │
│  │                                                  │   │
│  │         [Cancel]  [Create DC]                   │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  STEP 4: DC Created! Now in List                        │
│  DC#        Date      Consignee      Actions            │
│  DC-001  2026-02-07  ABC Ltd      [👁️][✏️][🗑️]       │
│                                     ↑                   │
│                              Click Eye Icon             │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  STEP 5: Preview & Print                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │  [Print] [X]               ← Click Print         │   │
│  │  ─────────────────────────────────────────────  │   │
│  │  DELIVERY CHALLAN                               │   │
│  │  DC Number: DC-001                              │   │
│  │  From: Triovision                               │   │
│  │  To: ABC Manufacturing Ltd                      │   │
│  │  Items: FRP Panel - 25 Pcs                      │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 QUICK EXAMPLE - Copy These Values

Use these dummy values to test:

```
DC Number: DC-20260207-TEST
DC Date: 2026-02-07

CONSIGNEE:
Name: ABC Manufacturing Ltd
Address: Plot 23, SIPCOT Industrial Park, Chennai - 600058
GSTIN: 33AABCA1234N1Z5
State Code: 33
Phone: +91 9876543210

ITEMS:
Item 1:
- Code: FRP-001
- Description: FRP Body Panel
- HSN: 39269099
- Quantity: 25
- Unit: Pcs
[Click + Add Item]

Item 2:
- Code: FRP-002
- Description: FRP Hood Cover
- HSN: 39269099
- Quantity: 10
- Unit: Pcs
[Click + Add Item]

TRANSPORT (Optional):
Vehicle Number: AP39TG4567
Driver Name: Ramesh Kumar
E-Way Bill: EWB123456789012
```

---

## ✅ CHECKLIST - Before Clicking "Create DC"

- [ ] DC Number is filled
- [ ] DC Date is selected
- [ ] Consignee Name is filled
- [ ] Consignee Address is filled
- [ ] Consignee GSTIN is filled
- [ ] Consignee State Code is filled
- [ ] Consignee Phone is filled
- [ ] At least 1 item is added (item appears in the list above)
- [ ] Click "Create DC" button

---

## ⚠️ COMMON MISTAKES

❌ **Filling item details but NOT clicking "+ Add Item"**
   ✅ Solution: After filling item row, click "+ Add Item" button

❌ **Leaving Consignee fields empty**
   ✅ Solution: All Consignee fields are required

❌ **Trying to save with 0 items**
   ✅ Solution: Add at least 1 item first

---

## 🎨 WHAT YOU'LL SEE

### DC Management Page:
- Stats at top (Total DCs, Draft, Dispatched, Delivered)
- Search bar
- Table with all DCs
- Green "Create New DC" button (top-right)

### After Creating DC:
- DC appears in the table
- You'll see: DC Number, Date, Consignee Name, Status
- Action buttons: 👁️ View, ✏️ Edit, 🗑️ Delete

### Print Preview:
- Full formatted DC
- Company logo and details
- From/To addresses
- Transport details
- Items table
- Signatures section
- Professional print format

---

## 🆘 TROUBLESHOOTING

### Problem: Can't find the page
**Solution:** Make sure you're at: `http://localhost:3000/purchase/documents/dc`

### Problem: Form won't save
**Solution:** 
1. Check all required fields are filled
2. Make sure you added at least 1 item
3. Click "+ Add Item" after filling item details

### Problem: Can't print
**Solution:**
1. Click eye icon first to preview
2. Then click Print button in the preview window
3. Choose "Save as PDF" from browser print dialog

### Problem: DC not showing in list
**Solution:**
1. Refresh the page
2. Check if save was successful (look for success message)
3. Try creating again

---

## 📞 QUICK REFERENCE

| What | Where |
|------|-------|
| **DC Page URL** | `http://localhost:3000/purchase/documents/dc` |
| **Create Button** | Top-right green button "Create New DC" |
| **Required Fields** | DC#, Date, Consignee (Name, Address, GSTIN, State, Phone), Items |
| **Add Item** | Fill item row, then click "+ Add Item" |
| **Save DC** | Click "Create DC" at bottom of form |
| **View/Print** | Click 👁️ eye icon, then Print button |

---

## 🎉 YOU'RE READY!

1. Go to: `http://localhost:3000/purchase/documents/dc`
2. Click "Create New DC"
3. Fill customer info
4. Add items
5. Click "Create DC"
6. Click 👁️ to view
7. Click Print!

**That's it! Your DC is created and ready to print! 🎊**

---

**Need Help?** The form will show error messages if something is missing.

**Test First?** Use the dummy values provided above to create a test DC.
