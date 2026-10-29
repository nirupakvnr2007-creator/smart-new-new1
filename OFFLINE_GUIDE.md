# Mepco Retail Hub — 100% Offline Architecture

This project is built to operate **strictly with zero cloud servers**. All data persistence, customer feedback, QR code generation, billing, and role permissions run entirely on your local machine with your local database.

---

## 1. Quick Start: Running 100% Locally (Zero Cloud Servers)

### Prerequisites
1. **Node.js** (v18 or higher recommended)
2. **MongoDB Community Server & MongoDB Compass** running locally on port `27017`

### One-Click Launch
- **Windows**: Double-click `start-offline.bat`
- **macOS / Linux**: Run `./start-offline.sh` (or `bash start-offline.sh`)
- **Command Line**:
  ```bash
  npm install
  npm run offline
  ```

The server will start on:
👉 **`http://localhost:3000`** (and `http://<your-lan-ip>:3000` for other devices on your local Wi-Fi)

---

## 2. Local MongoDB Compass Synchronization

- **Database Name**: `smart_inventory`
- **Connection String**: `mongodb://127.0.0.1:27017/smart_inventory` (or `mongodb://localhost:27017`)
- **Collections Automatically Managed**:
  1. `products` — Product catalog, SKU, current stock, thresholds, packaging QR links, supplier contacts.
  2. `users` — Shop owner, managers, and cashiers with secure login passwords.
  3. `shops` — Registered store metadata (name, address, GST, contact).
  4. `transactions` — All POS sales records, customer phone numbers, receipts, line items, and totals.
  5. `reviews` — Verified customer ratings, comments, buyer phone, and tags.
  6. `restock_requests` — Replenishment purchase orders triggered when stock breaches safety thresholds.
  7. `forum_posts` — Internal team communications.

### How Data Synchronizes Without Cloud Servers:
- When running locally, `server.ts` connects directly to your local MongoDB at `mongodb://127.0.0.1:27017/smart_inventory`.
- Every product addition, stock update, POS checkout, phone recording, and customer review immediately writes to MongoDB and reads back live.
- If MongoDB Compass is closed or restarting, the server automatically uses local disk persistence (`data/smart_inventory_db.json`) and browser storage (`localStorage` / IndexedDB), then reconnects automatically in the background every 10 seconds.

---

## 3. Offline Feature Verification

| Feature | How It Operates Offline |
| :--- | :--- |
| **Packaging QR Code** | Generated client-side using standard ISO QR matrix math via the `qrcode` library. Does not require internet or cloud APIs. Encodes the local link to the feedback portal. |
| **Cashier POS & Phone Capture** | Cashiers enter customer phone number during checkout. The bill is recorded in local `transactions` collection and decrements product inventory. |
| **Buyer Mobile Verification** | When a customer scans the packaging QR or opens the feedback page, they enter their phone number. The system verifies that this phone number exists in recorded transactions for that product before allowing feedback. |
| **Customer Review Display** | Verified reviews are saved into the `reviews` collection and immediately rendered under the product description in the Manager Product screen and POS. |
| **Manager Restock & Stock Edit** | When a product reaches or drops below minimum threshold, an alert is triggered. Managers can approve the request (opening a pre-filled local mail draft) and directly edit/adjust stock. |
| **Strict Profile Security** | Members cannot switch to another member's profile. Each staff member must log in with their own credentials. |
| **Multi-Device Local Access** | Run on your local shop PC and access from tablets, barcode scanners, or smartphones on the same offline Wi-Fi router via `http://<your-pc-ip>:3000`. |
| **PWA & Offline Service Worker** | Registered Service Worker (`public/sw.js`) and Web App Manifest (`public/manifest.json`) cache all assets so the app opens and works even with no internet connection. |

---

## 4. Environment Variables (`.env.example`)
```env
PORT=3000
MONGODB_URI="mongodb://127.0.0.1:27017/smart_inventory"
NODE_ENV=development
```
No cloud credentials or cloud API keys are required for core operations.
