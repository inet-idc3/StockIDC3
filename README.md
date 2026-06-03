# INET IDC-3 Portal — v4.0

PWA สำหรับระบบ Stock & Asset ของ INET IDC-3  
Refactored จาก single-file HTML → Vite + React + GAS backend

---

## โครงสร้างโปรเจกต์

```
inet-idc3-portal/
├── index.html                   ← entry point (บาง 6 บรรทัด)
├── vite.config.js               ← Vite + PWA plugin
├── .env.example                 ← copy → .env แล้วใส่ค่า
├── GAS_TEMPLATE.js              ← paste ไปใส่ Google Apps Script
│
└── src/
    ├── main.jsx                 ← mount React + inject fonts/icons
    ├── App.jsx                  ← root router (Login → Shell → App)
    │
    ├── styles/
    │   ├── tokens.css           ← CSS custom properties (สีทั้งหมด)
    │   ├── global.css           ← reset + keyframes ทั้งหมด
    │   └── employee.css         ← employee overlay styles
    │
    ├── data/
    │   └── employees.js         ← ข้อมูลพนักงาน (shared)
    │
    ├── services/
    │   ├── authService.js       ← GAS auth (login, change_password)
    │   └── gasService.js        ← data sync helpers (items, logs)
    │
    ├── hooks/
    │   └── useAuth.js           ← portal-level auth state
    │
    ├── components/
    │   ├── ui/
    │   │   └── CinBackground.jsx ← cinematic background (shared)
    │   ├── PortalLogin.jsx      ← cinematic login screen
    │   ├── PortalShell.jsx      ← app launcher grid
    │   ├── AppOverlay.jsx       ← slide-up container for sub-apps
    │   ├── ChangePasswordScreen.jsx ← first-login pw change
    │   └── EmployeeDirectory.jsx ← employee overlay + picker
    │
    └── apps/
        ├── stockscan/
        │   ├── StockScan.jsx    ← main app component
        │   └── pages/
        │       ├── PageHome.jsx
        │       ├── PageScan.jsx
        │       ├── PageLog.jsx
        │       ├── PageAdmin.jsx
        │       └── PageSetup.jsx
        └── assetaudit/
            └── AssetAudit.jsx   ← main app component (self-contained pages)
```

---

## เริ่มใช้งาน

### 1. ติดตั้ง dependencies

```bash
npm install
```

### 2. ตั้งค่า environment

```bash
cp .env.example .env
# แก้ค่าใน .env
```

```env
VITE_GAS_URL=https://script.google.com/macros/s/YOUR_ID/exec
VITE_ADMIN_PIN=240739
```

### 3. ตั้งค่า Google Apps Script

1. เปิด [script.google.com](https://script.google.com) → New Project
2. Copy เนื้อหาจาก `GAS_TEMPLATE.js` → วางใน `Code.gs`
3. แก้ `SHEET_ID` ให้ตรงกับ Google Sheet ของคุณ
4. **Deploy → New deployment → Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy URL → ใส่ใน `.env` เป็น `VITE_GAS_URL`

### 4. ตั้งค่า Google Sheet

สร้าง Sheet tabs ต่อไปนี้ (ชื่อต้องตรงทุกตัว):

| Tab | Columns |
|-----|---------|
| `Auth` | `emp_id`, `hash`, `changed`, `updated_at` |
| `Items` | `id`, `name`, `cat`, `stock`, `unit`, `min`, `icon` |
| `Logs` | `timestamp`, `qr_id`, `item_name`, `cat`, `quantity`, `unit`, `employee`, `employee_name`, `employee_id`, `note`, `action` |
| `Assets` | `id`, `name`, `cat`, `status`, `location`, `assignee`, `icon`, `lastAudit` |
| `AuditLogs` | `timestamp`, `asset_id`, `asset_name`, `status`, `location`, `inspector`, `note`, `action` |

### 5. รัน development server

```bash
npm run dev
```

### 6. Build สำหรับ production

```bash
npm run build
# output → dist/
```

---

## Security improvements (เทียบกับ v3)

| ด้าน | v3 (เดิม) | v4 (ใหม่) |
|------|-----------|-----------|
| Auth | Hash เปรียบเทียบใน browser | GAS เปรียบเทียบ server-side |
| Hash ส่งไป client | ✅ ส่ง | ❌ ไม่ส่ง (ส่งแค่ `changed: bool`) |
| Password default | ตัวเลขจาก empId | เหมือนกัน แต่ verify ที่ GAS |
| Session | localStorage ไม่มีหมดอายุ | sessionStorage (หมดเมื่อปิด tab) |
| PIN Admin | hardcode ใน JS | `.env` → ย้ายไป GAS-side ได้ |

---

## รหัสผ่านเริ่มต้น

ครั้งแรกที่ login: รหัสผ่านคือ **ตัวเลขจากรหัสพนักงาน**

```
OD1158037  →  1158037
OD1161092  →  1161092
20085      →  20085
```

ระบบจะบังคับเปลี่ยนรหัสผ่านทันทีหลัง login ครั้งแรก

---

## Icons

ใช้ [Tabler Icons](https://tabler.io/icons) ผ่าน CDN  
Class: `ti ti-{icon-name}` เช่น `ti ti-home-2`, `ti ti-qrcode`
