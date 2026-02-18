# 📊 TRIOVISION ERP - DATA ENTRY GUIDE

---

## 🎯 SYSTEM OVERVIEW

The system has **TWO pages** working together:

| Page | Purpose | User | Function |
|------|---------|------|----------|
| **empStore** | ✏️ DATA ENTRY | Store Manager | Add/Log material consumption, purchases |
| **store (MD)** | 📊 READ-ONLY DASHBOARD | Management | View real-time consumption & analytics |

---

## 📝 HOW TO ENTER DATA (empStore Page)

### **STEP 1: Navigate to Data Entry Page**
- Click on **"Employee Store"** or go to `/empStore`
- You'll see the **Dashboard** with 4 main tabs

---

### **STEP 2: ISSUE MATERIAL (Material Consumption)**

#### **What is "Issue Material"?**
When workers take materials from stock for production/projects, you **ISSUE** them. This reduces stock and creates a consumption record.

#### **How to Issue Material - 5 Steps:**

**Step 1:** Click **"Issue Material"** button (Red button with📤 icon)

**Step 2:** A form opens. Fill in these fields:

| Field | What to Enter | Example |
|-------|---------------|---------|
| **Select Material** | Choose which material was taken | Steel Rod 10mm |
| **Quantity** | How many units taken | 50 |
| **Team** | Which team took it | Production Team |
| **Project** | For which project/job | Project Alpha |
| **Entered By** | Auto-filled: Store Manager | (Auto) |

**Step 3:** Check the preview shows correct info

**Step 4:** Click **"ISSUE MATERIAL"** button

**Step 5:** See ✅ "Material Issued Successfully" message

---

### **STEP 3: ADD PURCHASE (New Material Arrival)**

#### **What is "Add Purchase"?**
When new materials arrive from suppliers, you **ADD PURCHASE** to increase stock.

#### **How to Add Purchase - 5 Steps:**

**Step 1:** Click **"Add Purchase"** button (Green button with📦 icon)

**Step 2:** A form opens. Fill in these fields:

| Field | What to Enter | Example |
|-------|---------------|---------|
| **Material** | Which material arrived | Steel Rod 10mm |
| **Supplier** | Which supplier sent it | ABC Suppliers |
| **Quantity** | Units received | 100 |
| **Unit Price** | Cost per unit | ₹150 |
| **Invoice Number** | Supplier invoice ref | INV-2026-001 |
| **Received By** | Auto-filled | (Auto) |

**Step 3:** System calculates **Total Cost** automatically (Qty × Price)

**Step 4:** Click **"ADD PURCHASE"** button

**Step 5:** See ✅ "Purchase Recorded Successfully" message

---

### **STEP 4: VIEW CONSUMPTION LOG**

**Tab:** Click **"📋 Issue Log"**

Shows all material consumption records:
- ✅ What material was taken
- ✅ How much (quantity)
- ✅ When (date & time)
- ✅ Which team
- ✅ Which project
- ✅ Who entered it

---

### **STEP 5: VIEW PURCHASE LOG**

**Tab:** Click **"📦 Purchase Log"**

Shows all purchase records:
- ✅ Materials received
- ✅ From which supplier
- ✅ Quantity & unit price
- ✅ Total cost
- ✅ Invoice reference
- ✅ Date received

---

## 🔄 REAL-TIME SYNC TO DASHBOARD

### **What Happens After You Enter Data?**

**empStore (Data Entry)**
```
Issue Material ➜ Database ➜ store (MD Dashboard)
                  ↓
            Auto Updates
                  ↓
            Management sees:
            - Today's consumption
            - Which teams working
            - Which projects active
            - Material consumption trends
```

**The store page AUTOMATICALLY shows:**
- ✅ Material consumption today
- ✅ Active teams & projects
- ✅ Real-time stock levels
- ✅ Consumption history timeline

---

## 📊 DASHBOARD TABS (empStore)

### **Tab 1: Dashboard (Overview)**
Quick stats at a glance:
- 📦 Total Items in inventory
- ⚠️ Low stock items count
- 🔥 Today's material consumption
- 💰 Stock value

### **Tab 2: Inventory (Stock View)**
See all materials with:
- Material name & code
- Current stock level
- Status (OK / Low / Out)
- Supplier info
- Supplier contact (click email/phone)

### **Tab 3: Issue Material (Record Consumption)**
**Form to log when materials are taken**
- Select material
- Enter quantity
- Select team
- Select project
- Submit

### **Tab 4: Purchase Receipts (Record Arrivals)**
**Form to log when new materials arrive**
- Select material
- Select supplier
- Enter quantity
- Enter unit price
- Enter invoice number
- Submit

### **Tab 5: Issue Log (Consumption History)**
View all past material consumptions in a table

### **Tab 6: Purchase Log (Receipt History)**
View all past purchases in a table

---

## ⚠️ IMPORTANT RULES

### **✅ When You CAN Issue Material:**
- ✅ Material exists in inventory
- ✅ Stock is available (≥ quantity requested)
- ✅ Team name is entered
- ✅ Project name is entered

### **❌ When You CANNOT Issue Material:**
- ❌ Stock is insufficient → Shows: "Insufficient Stock! Available: 45 units"
- ❌ Quantity is 0 or negative → Shows: "Quantity must be greater than 0"
- ❌ Required fields are empty → Shows: "Please fill all required fields"

### **✅ Data Entry Best Practices:**
1. **Enter data SAME DAY** - Don't delay consumption logs
2. **Use correct TEAM NAME** - Be consistent (Production, Assembly, etc.)
3. **Specify PROJECT clearly** - Use standard names (Alpha, Beta, Gamma, Maintenance, General)
4. **Keep INVOICE NUMBER** - For purchase audits
5. **Check STOCK before issuing** - Avoid "insufficient stock" errors

---

## 🎯 COMMON SCENARIOS

### **Scenario 1: Daily Morning Check**
```
1. Open empStore page
2. Check "Dashboard" tab for overnight consumption
3. Review low stock items
4. Note materials needing urgent purchase
```

### **Scenario 2: Material Received from Supplier**
```
1. Click "Add Purchase" button
2. Select material
3. Enter quantity received
4. Enter unit price
5. Enter invoice number
6. Click "ADD PURCHASE"
✅ Stock automatically increases
✅ Data shows in store (MD) dashboard
```

### **Scenario 3: Production Team Takes Materials**
```
1. Click "Issue Material" button
2. Select material
3. Enter quantity taken
4. Select team (e.g., "Production Team")
5. Select project (e.g., "Project Alpha")
6. Click "ISSUE MATERIAL"
✅ Stock automatically decreases
✅ Consumption shows in store (MD) dashboard
✅ Management sees real-time activity
```

### **Scenario 4: Check Yesterday's Activity**
```
1. Go to "Issue Log" tab
2. Scroll through records from yesterday
3. Filter by date/team if needed
4. Review consumption patterns
```

---

## 📍 FIELD DEFINITIONS

### **Material Fields:**
- **Code**: Unique identifier (auto-generated or manual)
- **Name**: Full material description
- **Category**: Type (Electronics, Hardware, etc.)
- **Unit**: Measurement (pcs, kg, meter, box, etc.)
- **Current Stock**: Available quantity now
- **Min Stock**: Alert level - order when this low
- **Price**: Cost per unit in ₹

### **Issue Record Fields:**
- **Date**: When material was taken
- **Material**: Which item
- **Quantity**: How many units
- **Team**: Production, Assembly, Tooling, etc.
- **Project**: Project Alpha, Beta, Gamma, etc.
- **Entered By**: Who logged it

### **Purchase Record Fields:**
- **Date**: When received
- **Material**: Which item
- **Supplier**: From which vendor
- **Quantity**: Units received
- **Unit Price**: Cost per unit
- **Total Cost**: Qty × Unit Price (auto-calculated)
- **Invoice**: Supplier document reference

---

## 🔗 HOW DATA FLOWS

```
empStore (Data Entry Page)
    ↓
Issue Material Form → Firestore Database → inventory_transactions table
    ↓                                      ↓
Add Purchase Form  → Firestore Database → purchase_entries table
                                          ↓
                    Real-time Updates ← onSnapshot listeners
                                          ↓
                                    store/page.tsx (MD Dashboard)
                                          ↓
                    Management Dashboard Shows:
                    • Today's consumption
                    • Which teams worked
                    • Which projects active
                    • Consumption trends
                    • Planning points
```

---

## ✅ QUICK START CHECKLIST

- [ ] Open empStore page (`/empStore`)
- [ ] Check "Dashboard" tab first
- [ ] Review current inventory in "Inventory" tab
- [ ] For material consumption → Click "Issue Material"
- [ ] For new purchases → Click "Add Purchase"
- [ ] Verify submission success message
- [ ] Check store (MD) page to see real-time updates
- [ ] Review logs if needed

---

## 🆘 TROUBLESHOOTING

| Problem | Solution |
|---------|----------|
| **"Material not found"** | Material doesn't exist - add it first in Materials section |
| **"Insufficient Stock"** | Don't have enough - add purchase or reduce quantity |
| **"Required fields empty"** | Fill all fields (Material, Qty, Team, Project) |
| **Form won't submit** | Check all fields are filled and no validation errors |
| **Data not updating on store page** | Wait 2-3 seconds for real-time sync from Firestore |

---

## 📞 SUMMARY

**empStore** = **WHERE** you enter data (forms, logs, inventory view)
**store** = **WHERE** management sees reports (dashboard, analytics, trends)

**The two pages are connected in real-time** via Firestore!

---

*Last Updated: January 20, 2026*
