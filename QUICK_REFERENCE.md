# 🚀 QUICK DATA ENTRY REFERENCE

## TWO MAIN ACTIONS

### 1️⃣ ISSUE MATERIAL (Material Being Taken)
**Click:** "Issue Material" button
**Fill:**
- Material: (dropdown - select item)
- Quantity: (number - how many units)
- Team: (Production, Assembly, Tooling, etc.)
- Project: (Alpha, Beta, Gamma, Maintenance, General)
**Result:** Stock DECREASES ⬇️

---

### 2️⃣ ADD PURCHASE (Material Arriving)
**Click:** "Add Purchase" button
**Fill:**
- Material: (dropdown - select item)
- Supplier: (dropdown - which vendor)
- Quantity: (number - units received)
- Unit Price: (₹ cost per unit)
- Invoice: (supplier document ref)
**Result:** Stock INCREASES ⬆️

---

## REAL-TIME DASHBOARD

After you enter data:
- ✅ empStore shows consumption/purchase log
- ✅ store (MD page) auto-updates with trends
- ✅ Management sees: today's consumption, active teams, active projects

---

## REQUIRED FIELDS

### Issue Material
- ✓ Material (required)
- ✓ Quantity (required, >0)
- ✓ Team (required)
- ✓ Project (required)

### Add Purchase
- ✓ Material (required)
- ✓ Supplier (required)
- ✓ Quantity (required, >0)
- ✓ Unit Price (required, >0)

---

## TEAMS (Common Values)
- Production
- Assembly
- Tooling
- Quality
- Maintenance
- R&D

## PROJECTS (Common Values)
- Project Alpha
- Project Beta
- Project Gamma
- Maintenance
- General

---

## ERROR MESSAGES

| Error | Fix |
|-------|-----|
| Insufficient Stock | Quantity > Available stock. Add purchase or reduce qty |
| Quantity must be > 0 | Enter a positive number |
| Please fill all fields | Missing required field |
| Material not found | Material doesn't exist |

---

## DATA FLOW

empStore Data Entry → Firestore Database → store (MD Dashboard)

**Instant sync via real-time listeners!**

---

## VERIFICATION

✅ After submission, you should see:
- Green success toast message
- New entry in Issue Log / Purchase Log
- Updated dashboard stats
- Real-time updates on store page

---

*Everything you need to enter data in 60 seconds!*
