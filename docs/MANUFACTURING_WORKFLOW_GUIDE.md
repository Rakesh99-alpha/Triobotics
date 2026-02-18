# 🏭 Composite ERP - Manufacturing Unit Workflow Guide

**Version:** 1.0  
**Last Updated:** January 27, 2026  
**Company:** TrioVision International

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [User Roles & Access](#2-user-roles--access)
3. [Daily Stock Management](#3-daily-stock-management)
4. [Purchase Order Workflow](#4-purchase-order-workflow)
5. [Material Categories](#5-material-categories)
6. [Firebase Database Structure](#6-firebase-database-structure)
7. [Daily Checklists](#7-daily-checklists)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. System Overview

### What is Composite ERP?

A manufacturing inventory & production management system designed for **composites manufacturing units**. The system handles:

- ✅ Real-time inventory tracking
- ✅ Daily opening/closing stock management
- ✅ Purchase order creation & approval workflow
- ✅ Multi-department production tracking
- ✅ Supplier management
- ✅ Material issue tracking by project

### Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 16, React 18, TypeScript |
| Database | Firebase Firestore (Real-time) |
| Hosting | Vercel |
| UI | Tailwind CSS, shadcn/ui |

### Live URLs

- **Production:** https://trio-erp-production.vercel.app/
- **GitHub:** https://github.com/triovisionerp-server/TRIO-ERP-PRODUCTION-

---

## 2. User Roles & Access

### Login Credentials

| Role | Username | Password | Dashboard URL | Primary Functions |
|------|----------|----------|---------------|-------------------|
| **Managing Director (MD)** | md | md123 | `/md` | Approve POs, View production, Inventory overview |
| **Store Keeper** | supervisor | supervisor123 | `/empStore` | Daily stock, Issue materials, Manage inventory |
| **Purchase Team** | supervisor | supervisor123 | `/purchase` | Create POs, Monitor low stock |
| **HR Manager** | hr1 | hr123 | `/hr` | Employee management |
| **Project Manager** | pm | pm123 | `/pm` | Project tracking, Resource allocation |
| **Admin** | admin | admin123 | `/admin` | System configuration |

### Role Hierarchy

```
                    ┌─────────────┐
                    │     MD      │
                    │ (Approver)  │
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────┴─────┐    ┌─────┴─────┐    ┌─────┴─────┐
    │  Purchase │    │   Store   │    │    PM     │
    │   Team    │    │  Keeper   │    │ (Projects)│
    └───────────┘    └───────────┘    └───────────┘
```

---

## 3. Daily Stock Management

### Stock Calculation Formula

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   CLOSING STOCK = Opening Stock                             │
│                   + Inward (Purchases Received)             │
│                   - Project Issues                          │
│                   - R&D Usage                               │
│                   - Internal Usage                          │
│                   - New Factory Usage                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Daily Stock Cycle

```
┌─────────────────────────────────────────────────────────────────┐
│                    DAILY STOCK CYCLE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   [Previous Day Closing] ──────► [Today's Opening]              │
│            │                            │                       │
│            │                            ▼                       │
│            │                    ┌───────────────┐               │
│            │                    │   + INWARD    │ ◄── Purchases │
│            │                    │   (GRN Entry) │     Received  │
│            │                    └───────┬───────┘               │
│            │                            │                       │
│            │                            ▼                       │
│            │                    ┌───────────────┐               │
│            │                    │   - ISSUES    │               │
│            │                    │  • Projects   │               │
│            │                    │  • R&D        │               │
│            │                    │  • Internal   │               │
│            │                    │  • New Factory│               │
│            │                    └───────┬───────┘               │
│            │                            │                       │
│            │                            ▼                       │
│            │                    ┌───────────────┐               │
│            └──────────────────► │ CLOSING STOCK │ ──► Save      │
│                                 └───────────────┘     Daily     │
│                                         │                       │
│                                         ▼                       │
│                                 [Next Day Opening]              │
└─────────────────────────────────────────────────────────────────┘
```

### empStore Page - Tabs Overview

| Tab | Purpose | Key Actions |
|-----|---------|-------------|
| **Daily Stock** | Opening/Closing tracking | Set opening, Enter issues, Save daily record |
| **Stock Entry** | Excel-style data entry | Edit quantities, Add projects |
| **Materials** | Master material list | Add/Edit/Delete materials |
| **Suppliers** | Supplier directory | Manage supplier details |
| **Analytics** | Reports & charts | View stock trends |
| **Audit** | Activity log | Track all changes |

### Step-by-Step: Daily Stock Entry

#### Step 1: Set Opening Stock
```
Action: Click "Set Opening from Previous Day"
Result: System copies yesterday's closing stock to today's opening
```

#### Step 2: Enter Inward (Purchases Received)
```
Column: "Inward (+)"
Enter: Quantity received from suppliers
Example: Received 100 Kg of Epoxy Resin → Enter 100
```

#### Step 3: Enter Material Issues
```
Columns: Project columns, R&D, Internal, New Factory
Enter: Quantity issued/consumed
Example: Issued 25 Kg to Project Alpha → Enter 25 in Project Alpha column
```

#### Step 4: Verify Closing Stock
```
Column: "Closing"
Auto-calculated: Opening + Inward - All Issues
Check: Ensure no negative values
```

#### Step 5: Save Daily Record
```
Action: Click "Save Daily Stock" button
Optional: Add notes for the day
Result: Record saved to Firebase with timestamp
```

---

## 4. Purchase Order Workflow

### Complete PO Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    PURCHASE ORDER WORKFLOW                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐                                                 │
│  │ LOW STOCK   │ ◄─── System detects stock ≤ minimum level      │
│  │   ALERT     │                                                 │
│  └──────┬──────┘                                                 │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────┐                                                 │
│  │  PURCHASE   │      • Select material (auto-fills supplier)   │
│  │  TEAM       │      • Enter quantity needed                    │
│  │  Creates PO │      • Enter unit price                         │
│  └──────┬──────┘      • Submit for approval                      │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────┐                                                 │
│  │  PENDING    │      Status: "pending_md_approval"              │
│  │  MD APPROVAL│      Appears in MD Notifications                │
│  └──────┬──────┘                                                 │
│         │                                                        │
│    ┌────┴────┐                                                   │
│    │         │                                                   │
│    ▼         ▼                                                   │
│ ┌──────┐  ┌──────┐                                               │
│ │APPROVE│  │REJECT│                                               │
│ │(Sign) │  │(Reason)│                                             │
│ └───┬───┘  └───┬───┘                                              │
│     │          │                                                 │
│     ▼          ▼                                                 │
│ ┌──────┐  ┌──────┐                                               │
│ │STORE │  │ BACK │                                               │
│ │RECEIVE│  │ TO   │                                               │
│ │GOODS │  │PURCHASE│                                              │
│ └───┬───┘  └──────┘                                               │
│     │                                                            │
│     ▼                                                            │
│ ┌──────────┐                                                     │
│ │  CREATE  │      • Verify delivery                              │
│ │   GRN    │      • Update stock (Inward)                        │
│ └──────────┘                                                     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### PO Status Types

| Status | Meaning | Next Action |
|--------|---------|-------------|
| `pending_md_approval` | Awaiting MD review | MD to approve/reject |
| `approved` | MD approved | Store to receive goods |
| `rejected` | MD rejected | Purchase to revise or cancel |
| `received` | Goods delivered | GRN created, stock updated |

### MD Approval Process

1. **View Notifications** - Click bell icon in header
2. **Review PO Details** - Click on pending order
3. **Verify Information:**
   - Material name & quantity
   - Supplier & unit price
   - Total amount
   - Requester details
4. **Take Action:**
   - **Approve:** Enter signature (name) → Click "Approve"
   - **Reject:** Enter reason → Click "Reject"

---

## 5. Material Categories

### Category Definitions

| Category | Description | Examples |
|----------|-------------|----------|
| **Raw Material** | Primary production inputs | Resins, Fibers, Hardeners, Core materials |
| **Consumable** | Items used up in production | Acetone, Release agents, Styrene |
| **Tool** | Reusable production equipment | Brushes, Cutting wheels, Mixing buckets |
| **Safety Equipment** | Worker protection items | Gloves, Masks, Goggles, Coveralls |

### Sample Materials (Composites Manufacturing)

#### Raw Materials
| Code | Material | Unit | Typical Supplier |
|------|----------|------|------------------|
| RES-001 | Epoxy Resin LY556 | Kg | Huntsman Chemicals |
| RES-002 | Polyester Resin | Kg | Sivaa Enterprises |
| RES-003 | Vinyl Ester Resin | Kg | Huntsman Chemicals |
| FIB-001 | E-Glass Fiber Mat 300gsm | Kg | Owens Corning India |
| FIB-002 | Carbon Fiber 3K Twill | Meters | SS Enterprises |
| HRD-001 | Hardener HY951 | Kg | Huntsman Chemicals |
| COR-001 | PVC Foam Core 10mm | Pieces | Windinso Engineering |

#### Consumables
| Code | Material | Unit | Typical Supplier |
|------|----------|------|------------------|
| CON-001 | Acetone (Cleaning) | Liters | Sivaa Enterprises |
| REL-001 | Mold Release Wax | Kg | Sivaa Enterprises |
| REL-002 | PVA Release Film | Liters | Sivaa Enterprises |

#### Tools
| Code | Material | Unit | Typical Supplier |
|------|----------|------|------------------|
| TL-001 | Roller Brush 4" | Pieces | SS Enterprises |
| TL-002 | Cutting Wheels 4" | Pieces | Sivaa Enterprises |
| TL-003 | Mixing Buckets 20L | Pieces | SS Enterprises |

#### Safety Equipment
| Code | Material | Unit | Typical Supplier |
|------|----------|------|------------------|
| SAF-001 | Nitrile Gloves (Box) | Boxes | Sivaa Enterprises |
| SAF-002 | Respirator Mask N95 | Pieces | SS Enterprises |
| SAF-003 | Safety Goggles | Pieces | SS Enterprises |

---

## 6. Firebase Database Structure

### Collections Overview

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `inventory_materials` | Current stock | code, name, current_stock, min_stock, supplier_name |
| `inventory_suppliers` | Supplier info | name, contact_person, email, phone, gst |
| `daily_stock_records` | Daily snapshots | date, materials[], summary, savedBy |
| `purchase_orders` | PO records | items[], supplier, status, total_amount |
| `goods_receipts` | GRN records | po_id, received_items[], received_by |

### Data Relationships

```
inventory_suppliers (1) ──────────── (N) inventory_materials
        │                                      │
        │                                      │
        ▼                                      ▼
purchase_orders ◄────────────────────► daily_stock_records
        │                                      │
        │                                      │
        ▼                                      │
goods_receipts ◄───────────────────────────────┘
```

---

## 7. Daily Checklists

### ☀️ Morning Checklist (Store Keeper)

- [ ] Login to empStore (`/empStore`)
- [ ] Go to **Daily Stock** tab
- [ ] Click **"Set Opening from Previous Day"**
- [ ] Review any pending GRNs to receive
- [ ] Check **Low Stock Alerts** panel
- [ ] Notify Purchase team of critical items
- [ ] Print daily issue register if needed

### 🌤️ During Day (Store Keeper)

- [ ] Enter **Inward** quantities when goods received
- [ ] Update **Project Issues** as materials are taken
- [ ] Record **R&D / Internal / New Factory** usage
- [ ] Create GRN for approved POs
- [ ] Update supplier details if changed

### 🌙 End of Day (Store Keeper)

- [ ] Review all entries for accuracy
- [ ] Verify **Closing Stock** calculations
- [ ] Add **notes** for any special occurrences
- [ ] Click **"Save Daily Stock"** button
- [ ] Export Excel report if required

### 📋 Purchase Team Checklist

- [ ] Review **Low Stock Alerts** in purchase page
- [ ] Create POs for critical items
- [ ] Follow up on pending PO approvals
- [ ] Update supplier quotes if changed
- [ ] Coordinate delivery schedules

### 👔 MD Daily Review

- [ ] Check **Notifications** for pending approvals
- [ ] Review **Inventory** panel for critical items
- [ ] Approve/Reject pending POs
- [ ] Review production dashboard
- [ ] Check department efficiencies

---

## 8. Troubleshooting

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Can't login | Wrong credentials | Use exact credentials from Section 2 |
| Stock not updating | Browser cache | Hard refresh (Ctrl+Shift+R) |
| PO not appearing for MD | Status issue | Verify PO status is "pending_md_approval" |
| Previous day data missing | Not saved | Always click "Save Daily Stock" at end of day |
| Supplier not showing | Not synced | Go to empStore → Suppliers → Verify data |

### Data Recovery

If daily stock was not saved:
1. Go to **Stock Entry** tab
2. Manually enter yesterday's closing as today's opening
3. Continue with today's entries
4. Save at end of day

### Support Contacts

For technical issues:
- Check browser console for errors (F12 → Console)
- Verify Firebase connection in Network tab
- Contact system administrator

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│                    QUICK REFERENCE                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  LOGINS:                                                    │
│  • MD: md / md123                                           │
│  • Store: supervisor / supervisor123                        │
│  • Purchase: supervisor / supervisor123                     │
│                                                             │
│  KEY URLS:                                                  │
│  • Production: https://trio-erp-production.vercel.app/      │
│  • empStore: /empStore                                      │
│  • Purchase: /purchase                                      │
│  • MD Dashboard: /md                                        │
│                                                             │
│  DAILY STOCK FORMULA:                                       │
│  Closing = Opening + Inward - Issues                        │
│                                                             │
│  PO FLOW:                                                   │
│  Create → MD Approval → Receive → Update Stock              │
│                                                             │
│  REMEMBER:                                                  │
│  ✓ Save daily stock at end of each day                     │
│  ✓ All POs require MD approval                             │
│  ✓ Set opening from previous day each morning              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

**Document End**

*For updates to this guide, contact the system administrator.*
