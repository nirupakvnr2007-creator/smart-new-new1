import React, { useState, useEffect } from 'react';
import { ProductItem, SalesTransaction, CustomerReview, UserAccount, ShopProfile } from '../../types';
import { apiGetMongoStatus, apiSetMongoUri, apiImportCompassData, apiInitTables, MongoStatus } from '../../services/api';

interface MongoCompassSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductItem[];
  transactions: SalesTransaction[];
  reviews: CustomerReview[];
  users: UserAccount[];
  currentShop: ShopProfile | null;
  onRefreshData: () => void;
  onShowToast: (msg: string) => void;
}

export const MongoCompassSyncModal: React.FC<MongoCompassSyncModalProps> = ({
  isOpen,
  onClose,
  products,
  transactions,
  reviews,
  users,
  currentShop,
  onRefreshData,
  onShowToast
}) => {
  const [mongoStatus, setMongoStatus] = useState<MongoStatus | null>(null);
  const [mongoUriInput, setMongoUriInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isInitializingTables, setIsInitializingTables] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'connect' | 'import-export'>('status');
  const [pasteJson, setPasteJson] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<'products' | 'transactions' | 'reviews'>('products');

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    }
  }, [isOpen]);

  const loadStatus = async () => {
    const status = await apiGetMongoStatus();
    setMongoStatus(status);
    if (status.uriMasked && !mongoUriInput) {
      setMongoUriInput(status.uriMasked);
    }
  };

  if (!isOpen) return null;

  const handleConnectMongo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mongoUriInput.trim()) return;

    setIsConnecting(true);
    const res = await apiSetMongoUri(mongoUriInput.trim());
    setIsConnecting(false);

    if (res.success) {
      onShowToast('Connected to MongoDB smart_inventory successfully!');
      loadStatus();
      onRefreshData();
    } else {
      onShowToast(`MongoDB connection failed: ${res.message}`);
      loadStatus();
    }
  };

  const handleInitializeTables = async () => {
    setIsInitializingTables(true);
    const res = await apiInitTables();
    setIsInitializingTables(false);
    if (res.success) {
      onShowToast(res.message);
      loadStatus();
      onRefreshData();
    } else {
      onShowToast(res.message);
      loadStatus();
    }
  };

  // 1-Click Import of the exact products seen in the user's MongoDB Compass screenshot!
  const handleImportScreenshotProducts = async () => {
    const compassDocs: any[] = [
      {
        id: 'prod-sku103',
        sku: 'SKU-103',
        name: 'Natural Honey 250g',
        brand: 'Apex Apiaries Direct',
        category: 'Pantry & Sweeteners',
        price: 190,
        availableStock: 18,
        minThreshold: 10,
        supplierName: 'Apex Apiaries Direct',
        supplierEmail: 'procure@apexapiaries.com',
        supplierPhone: '+91 98401 88990',
        qrCode: typeof window !== 'undefined' ? `${window.location.origin}/?feedback=prod-sku103` : 'SCAN-9842-MEPCO',
        createdAt: new Date().toISOString()
      },
      {
        id: 'prod-sku102',
        sku: 'SKU-102',
        name: 'Organic Almond Milk 1L',
        brand: 'Green Meadows Dairy',
        category: 'Beverages & Dairy',
        price: 240,
        availableStock: 8,
        minThreshold: 10,
        supplierName: 'Green Meadows Dairy',
        supplierEmail: 'orders@greenmeadows.com',
        supplierPhone: '+91 98402 12345',
        qrCode: typeof window !== 'undefined' ? `${window.location.origin}/?feedback=prod-sku102` : 'SCAN-ALMOND-MILK',
        createdAt: new Date().toISOString()
      }
    ];

    const res = await apiImportCompassData('products', compassDocs);
    if (res.success) {
      onShowToast('Successfully imported 2 products matching your MongoDB Compass documents!');
      onRefreshData();
      onClose();
    } else {
      onShowToast('Failed to import Compass documents.');
    }
  };

  const handleExportJsonForCompass = (type: 'products' | 'transactions' | 'reviews' | 'all') => {
    let dataToExport: any = [];
    let filename = `smart_inventory_${type}.json`;

    if (type === 'products') {
      dataToExport = products.map((p) => ({
        _id: { $oid: p.id.replace(/[^a-f0-9]/gi, '').padEnd(24, '0').slice(0, 24) },
        sku: p.sku,
        name: p.name,
        brand: p.brand,
        category: p.category,
        price: p.price,
        currentStock: p.availableStock,
        minThreshold: p.minThreshold,
        supplierName: p.supplierName,
        supplierEmail: p.supplierEmail,
        supplierPhone: p.supplierPhone,
        qrToken: p.qrCode,
        createdAt: p.createdAt
      }));
    } else if (type === 'transactions') {
      dataToExport = transactions;
    } else if (type === 'reviews') {
      dataToExport = reviews;
    } else {
      dataToExport = {
        shop: currentShop,
        users,
        products,
        transactions,
        reviews
      };
      filename = 'smart_inventory_full_backup.json';
    }

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    onShowToast(`Downloaded ${filename} ready for MongoDB Compass Import!`);
  };

  const handleImportPastedJson = async () => {
    try {
      const parsed = JSON.parse(pasteJson);
      const docs = Array.isArray(parsed) ? parsed : [parsed];
      const res = await apiImportCompassData(selectedCollection, docs);
      if (res.success) {
        onShowToast(`Imported ${res.count} documents into ${selectedCollection}!`);
        setPasteJson('');
        onRefreshData();
      } else {
        onShowToast('Import failed. Please check JSON format.');
      }
    } catch (err: any) {
      onShowToast(`Invalid JSON: ${err?.message || 'Check syntax'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0b1c30]/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-[#dae2fd] space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#eff4ff]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#00ed64] text-[#001e2b] flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[22px]">database</span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-[17px] text-[#0b1c30] flex items-center gap-2">
                <span>MongoDB & Compass Database Synchronization</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                    mongoStatus?.connected
                      ? 'bg-[#dcfce7] text-[#166534]'
                      : 'bg-[#eff4ff] text-[#0037b0]'
                  }`}
                >
                  {mongoStatus?.connected ? '● MongoDB Connected' : '○ Standalone / Local DB Synced'}
                </span>
              </h3>
              <p className="text-[12px] text-[#565e74]">
                Target Database: <strong className="text-[#0b1c30]">smart_inventory</strong> • Collections: products, users, transactions, reviews
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#565e74] hover:text-[#0b1c30] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-[#eff4ff] p-1 rounded-xl text-[12px] font-bold border border-[#dae2fd]">
          <button
            onClick={() => setActiveTab('status')}
            className={`py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'status' ? 'bg-white text-[#0037b0] shadow-xs' : 'text-[#565e74]'
            }`}
          >
            Database Status & Collections
          </button>
          <button
            onClick={() => setActiveTab('connect')}
            className={`py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'connect' ? 'bg-white text-[#0037b0] shadow-xs' : 'text-[#565e74]'
            }`}
          >
            Connect MongoDB Atlas / URI
          </button>
          <button
            onClick={() => setActiveTab('import-export')}
            className={`py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'import-export' ? 'bg-white text-[#0037b0] shadow-xs' : 'text-[#565e74]'
            }`}
          >
            Compass 1-Click Sync
          </button>
        </div>

        {/* TAB 1: STATUS & COLLECTIONS */}
        {activeTab === 'status' && (
          <div className="space-y-3.5">
            <div className="p-4 bg-[#f8f9ff] rounded-xl border border-[#dae2fd] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-[#0b1c30]">
                  Database Engine:
                </span>
                <span className="text-[12px] font-semibold text-[#0037b0]">
                  {mongoStatus?.connected ? 'Real MongoDB Connection' : 'Persistent Storage Engine + Offline Local Mirror'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-[#0b1c30]">
                  Database Name:
                </span>
                <span className="text-[12px] font-mono text-[#004f35] font-bold">
                  smart_inventory
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-[#0b1c30]">
                  Offline Functionality:
                </span>
                <span className="text-[12px] text-[#004f35] font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px]">check_circle</span>
                  100% Offline (QR, POS Billing, Feedback & Mobile Verification)
                </span>
              </div>
            </div>

            {/* Collection Counts Grid (All 7 Tables) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-bold uppercase text-[#565e74] tracking-wider">
                  All 7 Database Tables (Collections):
                </h4>
                <button
                  type="button"
                  onClick={handleInitializeTables}
                  disabled={isInitializingTables}
                  className="px-3 py-1 bg-[#004f35] hover:bg-[#003824] text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  title="Create all 7 collections and indexes in MongoDB smart_inventory"
                >
                  <span className="material-symbols-outlined text-[15px]">add_task</span>
                  <span>{isInitializingTables ? 'Creating Tables...' : 'Create & Sync All Tables in DB'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-white p-2.5 rounded-xl border border-[#e5eeff] text-center shadow-2xs">
                  <span className="text-[11px] text-[#565e74] block font-mono">products</span>
                  <span className="font-headline font-bold text-[17px] text-[#0037b0]">
                    {products.length}
                  </span>
                  <span className="text-[10px] text-[#565e74] block">Catalog & QR</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-[#e5eeff] text-center shadow-2xs">
                  <span className="text-[11px] text-[#565e74] block font-mono">transactions</span>
                  <span className="font-headline font-bold text-[17px] text-[#004f35]">
                    {transactions.length}
                  </span>
                  <span className="text-[10px] text-[#565e74] block">Sales & Phones</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-[#e5eeff] text-center shadow-2xs">
                  <span className="text-[11px] text-[#565e74] block font-mono">reviews</span>
                  <span className="font-headline font-bold text-[17px] text-[#ba1a1a]">
                    {reviews.length}
                  </span>
                  <span className="text-[10px] text-[#565e74] block">Buyer Ratings</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-[#e5eeff] text-center shadow-2xs">
                  <span className="text-[11px] text-[#565e74] block font-mono">users</span>
                  <span className="font-headline font-bold text-[17px] text-[#565e74]">
                    {users.length}
                  </span>
                  <span className="text-[10px] text-[#565e74] block">Staff Profiles</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-[#e5eeff] text-center shadow-2xs">
                  <span className="text-[11px] text-[#565e74] block font-mono">shops</span>
                  <span className="font-headline font-bold text-[17px] text-[#0037b0]">
                    {currentShop ? 1 : 0}
                  </span>
                  <span className="text-[10px] text-[#565e74] block">Store Profile</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-[#e5eeff] text-center shadow-2xs">
                  <span className="text-[11px] text-[#565e74] block font-mono">restock_requests</span>
                  <span className="font-headline font-bold text-[17px] text-[#b45309]">
                    {mongoStatus?.counts?.restock_requests ?? 0}
                  </span>
                  <span className="text-[10px] text-[#565e74] block">Purchase Orders</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-[#e5eeff] text-center shadow-2xs col-span-2 sm:col-span-2">
                  <span className="text-[11px] text-[#565e74] block font-mono">forum_posts</span>
                  <span className="font-headline font-bold text-[17px] text-[#4f46e5]">
                    {mongoStatus?.counts?.forum_posts ?? 0}
                  </span>
                  <span className="text-[10px] text-[#565e74] block">Team Communications</span>
                </div>
              </div>
            </div>

            {/* Live Auto-Update Confirmation Note */}
            <div className="p-3 bg-[#f0fdf4] rounded-xl border border-[#bbf7d0] text-[11px] text-[#166534] space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-[12px]">
                <span className="material-symbols-outlined text-[16px]">sync_saved_locally</span>
                Real-Time Database Synchronization Active
              </div>
              <p>
                As you make changes in the application (registering a store, adding staff, creating products, editing inventory, scanning QR codes, completing POS billing, or writing customer reviews), all data is instantly saved and updated in the database.
              </p>
            </div>

            {/* Quick Action: Sync from Compass screenshot */}
            <div className="bg-[#eff4ff] p-3.5 rounded-xl border border-[#dae2fd] flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="font-bold text-[13px] text-[#0b1c30] block">
                  Quick Sync with Your Compass Documents
                </span>
                <span className="text-[11px] text-[#565e74]">
                  Import SKU-103 (Natural Honey) & SKU-102 (Almond Milk) from your Compass screenshot.
                </span>
              </div>
              <button
                type="button"
                onClick={handleImportScreenshotProducts}
                className="px-3 py-1.5 bg-[#0037b0] hover:bg-[#1d4ed8] text-white rounded-lg text-[12px] font-bold shrink-0 cursor-pointer shadow-xs"
              >
                Import Compass Products
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: CONNECT MONGO COMPASS / LOCAL URI */}
        {activeTab === 'connect' && (
          <form onSubmit={handleConnectMongo} className="space-y-3.5">
            <div className="p-3 bg-[#eff4ff] rounded-xl border border-[#dae2fd] text-[12px] text-[#0b1c30] space-y-1.5">
              <p className="font-bold text-[#0037b0] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">power</span>
                Direct Local MongoDB Compass Connection (Port 27017)
              </p>
              <p className="text-[#565e74]">
                When running locally on your computer with <code>start-offline.bat</code> or <code>npm run offline</code>, the server connects directly to your local MongoDB at <code>mongodb://127.0.0.1:27017/smart_inventory</code>.
              </p>
              <div className="bg-white p-2.5 rounded-lg border border-[#dae2fd] text-[11px] font-mono space-y-1">
                <div><strong>Standard Local URI:</strong> <code>mongodb://127.0.0.1:27017/smart_inventory</code></div>
                <div><strong>Target Database:</strong> <code>smart_inventory</code></div>
              </div>
              <p className="text-[#004f35] font-semibold text-[11px]">
                Open MongoDB Compass, click "Connect" to <code>mongodb://localhost:27017</code>, and all collections (products, transactions, reviews, users) appear live with zero cloud requirement.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#565e74] uppercase tracking-wider mb-1">
                MongoDB Connection String (URI)
              </label>
              <input
                type="text"
                required
                value={mongoUriInput}
                onChange={(e) => setMongoUriInput(e.target.value)}
                placeholder="mongodb+srv://<username>:<password>@cluster0.mongodb.net/smart_inventory?retryWrites=true&w=majority"
                className="w-full px-3 py-2 border border-[#c3cadb] rounded-lg text-[12px] font-mono text-[#0b1c30] focus:outline-none focus:border-[#0037b0]"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-[#565e74]">
                {mongoStatus?.lastError ? (
                  <span className="text-[#ba1a1a]">Note: {mongoStatus.lastError}</span>
                ) : (
                  'Connection will be verified immediately'
                )}
              </span>
              <button
                type="submit"
                disabled={isConnecting}
                className="px-4 py-2 bg-[#004f35] hover:bg-[#003824] disabled:opacity-60 text-white rounded-lg text-[12px] font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {isConnecting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">sync</span>
                    <span>Connect & Live Sync</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: 1-CLICK COMPASS IMPORT / EXPORT */}
        {activeTab === 'import-export' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Export Box */}
              <div className="p-4 bg-white rounded-xl border border-[#dae2fd] space-y-2.5 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#0037b0]">download</span>
                  <span className="font-headline font-bold text-[13px] text-[#0b1c30]">
                    Export to MongoDB Compass
                  </span>
                </div>
                <p className="text-[11px] text-[#565e74]">
                  Download ready-to-import JSON files formatted with ObjectId for MongoDB Compass:
                </p>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => handleExportJsonForCompass('products')}
                    className="w-full py-1.5 px-2.5 bg-[#eff4ff] hover:bg-[#dce1ff] text-[#0037b0] rounded-lg text-[11px] font-bold text-left flex items-center justify-between cursor-pointer"
                  >
                    <span>Download products.json ({products.length} items)</span>
                    <span className="material-symbols-outlined text-[15px]">file_download</span>
                  </button>
                  <button
                    onClick={() => handleExportJsonForCompass('transactions')}
                    className="w-full py-1.5 px-2.5 bg-[#eff4ff] hover:bg-[#dce1ff] text-[#0037b0] rounded-lg text-[11px] font-bold text-left flex items-center justify-between cursor-pointer"
                  >
                    <span>Download transactions.json ({transactions.length} bills)</span>
                    <span className="material-symbols-outlined text-[15px]">file_download</span>
                  </button>
                  <button
                    onClick={() => handleExportJsonForCompass('reviews')}
                    className="w-full py-1.5 px-2.5 bg-[#eff4ff] hover:bg-[#dce1ff] text-[#0037b0] rounded-lg text-[11px] font-bold text-left flex items-center justify-between cursor-pointer"
                  >
                    <span>Download reviews.json ({reviews.length} reviews)</span>
                    <span className="material-symbols-outlined text-[15px]">file_download</span>
                  </button>
                </div>
              </div>

              {/* Import Box */}
              <div className="p-4 bg-white rounded-xl border border-[#dae2fd] space-y-2.5 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#004f35]">upload</span>
                  <span className="font-headline font-bold text-[13px] text-[#0b1c30]">
                    Paste Compass JSON to Import
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#565e74]">Collection:</span>
                  <select
                    value={selectedCollection}
                    onChange={(e: any) => setSelectedCollection(e.target.value)}
                    className="px-2 py-1 text-[11px] border border-[#c3cadb] rounded bg-white text-[#0b1c30]"
                  >
                    <option value="products">products</option>
                    <option value="transactions">transactions</option>
                    <option value="reviews">reviews</option>
                  </select>
                </div>
                <textarea
                  rows={4}
                  value={pasteJson}
                  onChange={(e) => setPasteJson(e.target.value)}
                  placeholder='Paste JSON from Compass: e.g. [{"sku":"SKU-103","name":"Natural Honey 250g","price":190}]'
                  className="w-full p-2 border border-[#c3cadb] rounded-lg text-[11px] font-mono text-[#0b1c30] focus:outline-none focus:border-[#0037b0]"
                />
                <button
                  onClick={handleImportPastedJson}
                  disabled={!pasteJson.trim()}
                  className="w-full py-1.5 bg-[#004f35] hover:bg-[#003824] disabled:opacity-50 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                >
                  Import into {selectedCollection}
                </button>
              </div>
            </div>

            {/* CLI mongoimport hint */}
            <div className="p-3 bg-[#f8f9ff] rounded-xl border border-[#dae2fd] text-[11px] space-y-1">
              <span className="font-bold text-[#0b1c30] block">
                CLI mongoimport command for local Compass/MongoDB:
              </span>
              <pre className="p-2 bg-[#0b1c30] text-[#00ed64] rounded font-mono text-[10px] overflow-x-auto">
                mongoimport --db smart_inventory --collection products --file smart_inventory_products.json --jsonArray
              </pre>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-[#eff4ff]">
          <div className="flex items-center gap-1.5 text-[11px] text-[#565e74]">
            <span className="material-symbols-outlined text-[15px] text-[#004f35]">offline_pin</span>
            <span>All operations persist offline in local database mirror automatically.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#0b1c30] text-white rounded-lg text-[12px] font-bold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
