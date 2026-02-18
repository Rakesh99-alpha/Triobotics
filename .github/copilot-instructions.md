# Triovision ERP Dashboard - AI Agent Instructions

## Project Overview
**Composite ERP** is a manufacturing inventory & production management system. This is a **Next.js 16 + TypeScript** application with real-time data sync via Firebase Firestore, featuring inventory management, materials tracking, supplier management, and multi-department manufacturing workflow.

## Architecture

### Tech Stack
- **Frontend**: React 18, Next.js 16, TypeScript, Tailwind CSS, shadcn/ui
- **Backend/Database**: Firebase Firestore (primary), Firebase Realtime Database (secondary)
- **State Management**: Zustand (stores for auth, tasks) + React hooks for local component state
- **Forms**: React Hook Form + Zod validation
- **UI Components**: Material-UI, Radix UI, Lucide icons
- **Animation**: Framer Motion
- **Real-time Sync**: Firebase onSnapshot listeners

### Directory Structure
```
src/
├── app/                  # Next.js App Router pages & layouts
│   ├── (auth)/          # Auth routes (login, register, admin)
│   ├── (dashboard)/     # Main dashboard area (sidebar layout)
│   ├── empStore/        # Inventory management (data entry)
│   ├── store/           # MD dashboard (read-only analytics)
│   ├── api/             # API routes (n8n webhook)
│   └── layout.tsx       # Root layout with Vercel Analytics
├── components/          # Reusable UI components
│   ├── dashboard/       # Dashboard-specific components
│   ├── ui/             # Base UI components (buttons, modals, etc.)
│   ├── Sidebar.tsx     # Main navigation sidebar
│   └── ProtectedRoute.tsx # Auth wrapper
├── lib/
│   ├── firebase/       # Firebase initialization & auth utilities
│   ├── services.ts     # Firestore CRUD operations for projects/tasks/logs
│   ├── services/       # Specialized services (efficiencyCalculator, etc.)
│   ├── stores/         # Zustand stores (useAuthStore, useTaskStore)
│   └── utils.ts        # Helper functions
├── config/
│   └── departments.ts  # Department definitions, operations, supervisors
├── types/              # TypeScript interfaces (database, dashboard, etc.)
├── hooks/              # Custom hooks (useInventoryData)
└── data/              # Mock data & sample datasets
```

## Key Patterns & Conventions

### 1. Real-Time Data Sync
- **Pattern**: Firebase `onSnapshot()` listeners in components
- **Location**: [src/hooks/useInventoryData.ts](src/hooks/useInventoryData.ts), [src/lib/services.ts](src/lib/services.ts#L50-L60)
- **Example**: Subscribe to materials, suppliers, issue records, purchase entries
- **Important**: Use `unsubscribe()` cleanup in `useEffect` to prevent memory leaks

### 2. State Management Strategy
- **Zustand stores**: Global state for auth, tasks (see [src/lib/stores/](src/lib/stores/))
- **React hooks**: Local component state for UI (modals, filters, forms)
- **Firebase listeners**: Drive reactive updates to component state
- **Pattern**: Listeners call setState → React rerenders → UI updates

### 3. Data Validation
- **Forms**: React Hook Form + Zod schemas
- **Validation rules**: Required fields, positive numbers (quantities), email format
- **Error display**: Toast notifications at bottom-right corner

### 4. Page Structure Pattern
All dashboard pages follow this structure:
1. Client component (`'use client'`)
2. State definitions (hooks, local state, listeners)
3. Data fetching/sync effects
4. Business logic functions
5. Render: Main UI → Tabs/sections → Modals
- Example: [src/app/empStore/page.tsx](src/app/empStore/page.tsx#L1-L100)

### 5. Component Organization
- **Layout wrapper**: [src/app/(dashboard)/layout.tsx](src/app/(dashboard)/layout.tsx) provides sidebar + animated background
- **Global styles**: [src/app/globals.css](src/app/globals.css) loads Tailwind, base animations
- **Dark mode**: Fixed dark theme (no toggle) - background is `bg-zinc-950` or `#020202`

## Critical Data Flows

### Inventory Data Flow
```
Data Entry (empStore) → Firebase Firestore → Real-time listeners → 
Store Page (MD) Dashboard → Analytics & Charts
```

### Document Types in Firestore
| Collection | Purpose | Key Fields |
|-----------|---------|-----------|
| `materials` | Stock items | code, name, currentStock, minStock, supplier |
| `suppliers` | Vendors | name, contact, gst, materials_supplied |
| `issue_records` | Material consumption | material, team, quantity, date, entered_by |
| `purchase_entries` | Incoming stock | material, supplier, quantity, unit_price, date |
| `projects` | Manufacturing projects (BOM) | name, created_at |
| `work_orders` | Task assignments | assignedTo, status, progress, jobId |
| `daily_logs` | Supervisor work logs | timestamp, jobId, progress |

### Common Operations Pattern
```typescript
// 1. Create: addDoc(collection(db, 'collectionName'), {...data})
// 2. Read: getDocs(query(...)) or onSnapshot(query(...))
// 3. Update: updateDoc(doc(db, 'collectionName', id), {...updates})
// 4. Delete: deleteDoc(doc(db, 'collectionName', id))
```

## Domain Knowledge

### Inventory Concepts
- **Issue Material**: Decrease stock when team takes materials (for production/projects)
- **Purchase Entry**: Increase stock when materials arrive from supplier
- **Stock Levels**: Tracked via `currentStock` (calculated from opening + purchases - issues)
- **Min Stock**: Alert threshold; items below this are "Low Stock"
- **Material Categories**: Raw Material, Consumable, Tool, Safety Equipment
- **Units**: Kg, Liters, Pieces, Meters, Boxes, Pairs, Sets

### Teams & Projects
- **Teams**: Production, Assembly, Tooling, Quality, Maintenance, R&D
- **Projects**: Project Alpha, Project Beta, Project Gamma, Maintenance, General
- Used for categorizing material consumption

### Department/Manufacturing Workflow
- **11 Departments**: Stock Building, Machining, Pattern Finishing, Lamination, Mold Finishing, Welding, Assembly, CMM, Trimline, Quality, Maintenance
- **Operations**: Each department has specific sub-tasks (see [src/config/departments.ts](src/config/departments.ts))
- **Supervisors**: Each department has a lead supervisor managing daily work

## Developer Workflows

### Local Development
```bash
npm install              # Install dependencies
npm run dev             # Start dev server (http://localhost:3000)
npm run build           # Production build
npm run lint            # Run ESLint
npm run auto-push       # Auto-commit & push (see auto-push.js)
```

### Database Access
- **Firestore Emulator**: Not configured; uses live Firebase
- **Firebase Console**: [composite-erp-system-162c0](https://console.firebase.google.com)
- **Connection**: Long polling enabled in [src/lib/firebase/client.ts](src/lib/firebase/client.ts#L24)

### Common Debugging
- **Toast notifications**: Check bottom-right for success/error messages
- **Console logs**: Check browser DevTools → Console tab
- **Firebase issues**: Enable verbose logging in browser, check Firestore rules
- **Build errors**: Check `tsconfig.json` - strict mode enabled

## Integration Points

### External Services
1. **Firebase Firestore**: Real-time database (Composite ERP project)
2. **Firebase Auth**: User authentication
3. **n8n Webhooks**: Integration endpoint at `/api/n8n-webhook`
4. **Vercel Analytics**: Automatic performance monitoring

### Import Aliases
- `@/*` → `src/*` (configured in tsconfig.json)
- Use `@/components`, `@/lib`, `@/types` consistently

## Testing & Validation

### Manual Testing Checklist
1. **Data Entry**: Submit material issue → Check stock decreases
2. **Purchase**: Add purchase → Check stock increases
3. **Real-time**: Open page in 2 tabs → Submit on one → Check other updates
4. **Validation**: Try submit with empty fields → Should show error
5. **Performance**: Check console for Firebase listener leaks

### Common Gotchas
- **Firestore rules**: All operations require proper auth rules (check Firebase console)
- **Listener cleanup**: Always unsubscribe in useEffect cleanup to prevent memory leaks
- **Long polling**: Enabled for reliability; may have ~5s latency
- **TypeScript strict**: All types must be properly defined; use `@/types/` files
- **Dark mode CSS**: Don't use light colors directly; use Tailwind dark variants

## When Adding Features

1. **Define types** first in `@/types/` files
2. **Add Firestore CRUD** in `@/lib/services.ts` with proper error handling
3. **Create Zustand store** if global state needed (see `useTaskStore` pattern)
4. **Build component** with React hooks, use custom hooks for data fetching
5. **Add validation** using Zod if it's a form
6. **Use toast notifications** for user feedback
7. **Test real-time sync** with 2+ browser tabs
8. **Clean up listeners** in useEffect return statement

## Quick Reference

| Need | Location | Example |
|------|----------|---------|
| Type definitions | `@/types/` | `src/types/database.ts` |
| UI components | `@/components/ui/` | Button, Modal, Input |
| Firebase ops | `@/lib/services.ts` | `createProject()`, `subscribeToProjects()` |
| State management | `@/lib/stores/` | `useAuthStore`, `useTaskStore` |
| Data fetching | `@/hooks/` | `useInventoryData()` |
| Styling | Tailwind classes | `bg-zinc-950`, `text-white`, `rounded-lg` |
| Config values | `@/config/` | `DEPARTMENTS`, `DEPARTMENT_OPERATIONS` |

---

**Last Updated**: January 2026 | **Project**: Composite ERP (Triovision)
