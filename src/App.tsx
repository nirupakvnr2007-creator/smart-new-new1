import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { NotificationDrawer } from './components/NotificationDrawer';
import { LoginGatewayScreen } from './components/screens/LoginGatewayScreen';
import { OwnerMembersScreen } from './components/screens/OwnerMembersScreen';
import { ManagerProductsScreen } from './components/screens/ManagerProductsScreen';
import { PosBillingScreen } from './components/screens/PosBillingScreen';
import { SalesTrendDashboard } from './components/screens/SalesTrendDashboard';
import { ForumScreen } from './components/screens/ForumScreen';
import { PublicCustomerFeedbackScreen } from './components/screens/PublicCustomerFeedbackScreen';
import { MongoCompassSyncModal } from './components/screens/MongoCompassSyncModal';
import {
  fetchServerData,
  apiSaveShop,
  apiSaveUser,
  apiDeleteUser,
  apiSaveProduct,
  apiUpdateProductStock,
  apiDeleteProduct,
  apiSaveTransaction,
  apiUpdateRestockStatus,
  apiSaveForumPost,
  apiSaveReply,
  apiSaveReview,
  apiGetMongoStatus
} from './services/api';
import {
  loadStoredData,
  saveShop,
  saveUsers,
  saveProducts,
  saveRestockRequests,
  saveTransactions,
  saveForumPosts,
  saveReviews,
  loadSessionUser,
  saveSessionUser,
  updateSessionActivity,
  isSessionExpired
} from './utils/storage';
import {
  ProductItem,
  UserAccount,
  ShopProfile,
  RestockRequest,
  SalesTransaction,
  SalesItem,
  ForumPost,
  CustomerReview
} from './types';

// Helper to prevent unnecessary re-renders when data has not changed
function hasDataChanged(prev: any, next: any): boolean {
  if (prev === next) return false;
  return JSON.stringify(prev) !== JSON.stringify(next);
}

export default function App() {
  // Authentication State with persistent session
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => loadSessionUser());

  // Load initial dataset strictly for the active authenticated session user's shop
  const [initialData] = useState(() => {
    const session = loadSessionUser();
    if (session && session.shopId) {
      return loadStoredData(session.shopId);
    }
    return {
      shop: null,
      users: [],
      products: [],
      restockRequests: [],
      transactions: [],
      forumPosts: [],
      reviews: []
    };
  });

  const [currentShop, setCurrentShop] = useState<ShopProfile | null>(initialData.shop);
  const [users, setUsers] = useState<UserAccount[]>(initialData.users);
  const [products, setProducts] = useState<ProductItem[]>(initialData.products);
  const [restockRequests, setRestockRequests] = useState<RestockRequest[]>(
    initialData.restockRequests
  );
  const [transactions, setTransactions] = useState<SalesTransaction[]>(
    initialData.transactions
  );
  const [forumPosts, setForumPosts] = useState<ForumPost[]>(initialData.forumPosts);
  const [reviews, setReviews] = useState<CustomerReview[]>(initialData.reviews);

  // Active Tab View
  const [activeTab, setActiveTab] = useState<string>(() => {
    const session = loadSessionUser();
    if (session) {
      if (session.role === 'Cashier') return 'billing';
      if (session.role === 'Manager') return 'inventory';
      if (session.role === 'Helper') return 'dashboard';
    }
    return 'members';
  });

  // Modals & Public Feedback Route
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMongoSyncOpen, setIsMongoSyncOpen] = useState(false);
  const [isMongoConnected, setIsMongoConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeFeedbackProductId, setActiveFeedbackProductId] = useState<string | null>(null);

  // Toast Notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  // Multi-device synchronization: Fetch server data with diff checking to prevent screen flickering
  const syncWithServer = useCallback(async (isManual: boolean = false, targetShopId?: string) => {
    if (isManual) {
      setIsSyncing(true);
    }
    try {
      const activeShopId = targetShopId || currentShop?.id || currentUser?.shopId;
      const serverData = await fetchServerData(activeShopId);
      if (serverData) {
        if (serverData.shop) {
          setCurrentShop((prev) => (hasDataChanged(prev, serverData.shop) ? serverData.shop : prev));
        }
        if (Array.isArray(serverData.users)) {
          setUsers((prev) => (hasDataChanged(prev, serverData.users) ? serverData.users : prev));
        }
        if (Array.isArray(serverData.products)) {
          setProducts((prev) => (hasDataChanged(prev, serverData.products) ? serverData.products : prev));
        }
        if (Array.isArray(serverData.restockRequests)) {
          setRestockRequests((prev) => (hasDataChanged(prev, serverData.restockRequests) ? serverData.restockRequests : prev));
        }
        if (Array.isArray(serverData.transactions)) {
          setTransactions((prev) => (hasDataChanged(prev, serverData.transactions) ? serverData.transactions : prev));
        }
        if (Array.isArray(serverData.forumPosts)) {
          setForumPosts((prev) => (hasDataChanged(prev, serverData.forumPosts) ? serverData.forumPosts : prev));
        }
        if (Array.isArray(serverData.reviews)) {
          setReviews((prev) => (hasDataChanged(prev, serverData.reviews) ? serverData.reviews : prev));
        }
      }

      // Check MongoDB status silently
      const mongoStat = await apiGetMongoStatus();
      setIsMongoConnected(Boolean(mongoStat?.connected));
    } finally {
      if (isManual) {
        setIsSyncing(false);
      }
    }
  }, [currentShop?.id, currentUser?.shopId]);

  useEffect(() => {
    const activeShopId = currentShop?.id || currentUser?.shopId;
    if (activeShopId) {
      syncWithServer(false, activeShopId);
      // Silent periodic background check (every 15 seconds) without UI layout shifts
      const interval = setInterval(() => {
        syncWithServer(false, activeShopId);
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [syncWithServer, currentShop?.id, currentUser?.shopId]);

  // Security: Automatic session termination after 15 minutes of inactivity
  useEffect(() => {
    if (!currentUser) return;

    const recordActivity = () => {
      updateSessionActivity();
    };

    const trackedEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    trackedEvents.forEach((ev) => window.addEventListener(ev, recordActivity, { passive: true }));

    // Check every 10 seconds for session idle timeout
    const checkInterval = setInterval(() => {
      if (isSessionExpired()) {
        saveSessionUser(null);
        setCurrentUser(null);
        showToast('🔒 Session terminated due to 15 minutes of inactivity for your security. Please sign in again.');
      }
    }, 10000);

    return () => {
      trackedEvents.forEach((ev) => window.removeEventListener(ev, recordActivity));
      clearInterval(checkInterval);
    };
  }, [currentUser, showToast]);

  // Check URL query parameters for QR code scanning (?feedback=<productId>)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const feedbackId = params.get('feedback');
      if (feedbackId) {
        setActiveFeedbackProductId(feedbackId);
      }
    }
  }, []);

  // Sync to local storage backup scoped by active shop
  useEffect(() => {
    if (currentShop) {
      saveShop(currentShop);
    }
  }, [currentShop]);

  useEffect(() => {
    const sid = currentShop?.id || currentUser?.shopId;
    if (sid && users.length > 0) {
      saveUsers(users, sid);
    }
  }, [users, currentShop?.id, currentUser?.shopId]);

  useEffect(() => {
    const sid = currentShop?.id || currentUser?.shopId;
    if (sid) {
      saveProducts(products, sid);
    }
  }, [products, currentShop?.id, currentUser?.shopId]);

  useEffect(() => {
    const sid = currentShop?.id || currentUser?.shopId;
    if (sid) {
      saveRestockRequests(restockRequests, sid);
    }
  }, [restockRequests, currentShop?.id, currentUser?.shopId]);

  useEffect(() => {
    const sid = currentShop?.id || currentUser?.shopId;
    if (sid) {
      saveTransactions(transactions, sid);
    }
  }, [transactions, currentShop?.id, currentUser?.shopId]);

  useEffect(() => {
    const sid = currentShop?.id || currentUser?.shopId;
    if (sid) {
      saveForumPosts(forumPosts, sid);
    }
  }, [forumPosts, currentShop?.id, currentUser?.shopId]);

  useEffect(() => {
    const sid = currentShop?.id || currentUser?.shopId;
    if (sid) {
      saveReviews(reviews, sid);
    }
  }, [reviews, currentShop?.id, currentUser?.shopId]);

  // Handle Shop Registration & User Login
  const handleRegisterShop = async (newShop: ShopProfile, owner: UserAccount) => {
    const ownerWithShop: UserAccount = { ...owner, shopId: newShop.id };
    setCurrentShop(newShop);
    setUsers([ownerWithShop]);
    setProducts([]);
    setRestockRequests([]);
    setTransactions([]);
    setForumPosts([]);
    setReviews([]);
    saveSessionUser(ownerWithShop);
    setCurrentUser(ownerWithShop);
    setActiveTab('members');

    // Save to server database immediately
    await apiSaveShop(newShop);
    await apiSaveUser(ownerWithShop);
    await syncWithServer(false, newShop.id);
  };

  const handleLoginSuccess = async (user: UserAccount, shop?: ShopProfile) => {
    saveSessionUser(user);
    setCurrentUser(user);
    if (shop) {
      setCurrentShop(shop);
    }
    const targetShopId = shop?.id || user.shopId;
    if (targetShopId) {
      const localScoped = loadStoredData(targetShopId);
      if (localScoped.shop) setCurrentShop(localScoped.shop);
      setUsers(localScoped.users);
      setProducts(localScoped.products);
      setRestockRequests(localScoped.restockRequests);
      setTransactions(localScoped.transactions);
      setForumPosts(localScoped.forumPosts);
      setReviews(localScoped.reviews);

      await syncWithServer(false, targetShopId);
    }

    // Route to appropriate initial screen based on assigned role
    switch (user.role) {
      case 'Helper':
        setActiveTab('dashboard');
        break;
      case 'Cashier':
        setActiveTab('billing');
        break;
      case 'Manager':
        setActiveTab('inventory');
        break;
      case 'Owner':
      default:
        setActiveTab('members');
        break;
    }
  };

  const handleLogout = () => {
    saveSessionUser(null);
    setCurrentUser(null);
    setCurrentShop(null);
    setUsers([]);
    setProducts([]);
    setRestockRequests([]);
    setTransactions([]);
    setForumPosts([]);
    setReviews([]);
    showToast('Signed out of shop account.');
  };

  // Owner Member Management Handlers
  const handleAddMember = async (newMember: UserAccount) => {
    const sid = currentShop?.id || currentUser?.shopId;
    const scopedMember: UserAccount = { ...newMember, shopId: sid };
    setUsers((prev) => [scopedMember, ...prev]);
    await apiSaveUser(scopedMember);
  };

  const handleTerminateMember = async (memberId: string) => {
    const sid = currentShop?.id || currentUser?.shopId;
    setUsers((prev) => prev.filter((u) => u.id !== memberId));
    await apiDeleteUser(memberId, sid);
  };

  // Manager Product Management Handlers
  const handleAddProduct = async (newProduct: ProductItem) => {
    const sid = currentShop?.id || currentUser?.shopId;
    const scopedProduct: ProductItem = { ...newProduct, shopId: sid };
    const nextProducts = [scopedProduct, ...products];
    setProducts(nextProducts);
    await apiSaveProduct(scopedProduct);
  };

  const handleRemoveProduct = async (productId: string) => {
    const sid = currentShop?.id || currentUser?.shopId;
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    setRestockRequests((prev) => prev.filter((r) => r.productId !== productId));
    await apiDeleteProduct(productId, sid);
  };

  // Manager Stock Edit Handler
  const handleUpdateStock = async (productId: string, newStock: number) => {
    const sid = currentShop?.id || currentUser?.shopId;
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, availableStock: newStock } : p))
    );

    // If stock now exceeds threshold, resolve pending restock requests
    setRestockRequests((prev) =>
      prev.map((r) => {
        if (r.productId === productId && newStock > r.minThreshold) {
          return { ...r, status: 'Approved' };
        }
        return r;
      })
    );

    await apiUpdateProductStock(productId, newStock, sid);
  };

  // Restock Approval Handler: marks approved and opens supplier mail
  const handleApproveRestock = async (request: RestockRequest) => {
    const sid = currentShop?.id || currentUser?.shopId;
    setRestockRequests((prev) =>
      prev.map((r) => (r.id === request.id ? { ...r, status: 'Approved' } : r))
    );
    await apiUpdateRestockStatus(request.id, 'Approved', sid);
  };

  // Cashier POS Billing Handler: records customer phone number and updates DB stock
  const handleCompleteSale = async (
    items: SalesItem[],
    subtotal: number,
    tax: number,
    total: number,
    paymentMethod: 'Cash' | 'UPI' | 'Card',
    customerPhone: string,
    cashierName: string,
    cashierEmail: string
  ) => {
    const sid = currentShop?.id || currentUser?.shopId;
    const receiptNum = `REC-${Math.floor(100000 + Math.random() * 900000)}`;
    const newTxn: SalesTransaction = {
      id: `txn-${Date.now()}`,
      shopId: sid,
      receiptNumber: receiptNum,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cashierName,
      cashierEmail,
      customerPhone,
      items,
      subtotal,
      tax,
      total,
      paymentMethod
    };

    // 1. Immediately deduct stock in local UI
    setProducts((prev) =>
      prev.map((prod) => {
        const soldItem = items.find((i) => i.productId === prod.id || i.sku === prod.sku);
        if (soldItem) {
          const nextStock = Math.max(0, prod.availableStock - soldItem.quantity);
          return { ...prod, availableStock: nextStock };
        }
        return prod;
      })
    );

    // 2. Add transaction to local list
    setTransactions((prev) => [newTxn, ...prev]);

    // 3. Post to backend DB
    await apiSaveTransaction(newTxn);

    // 4. Check if any product went below minimum threshold
    items.forEach((soldItem) => {
      const prod = products.find((p) => p.id === soldItem.productId || p.sku === soldItem.sku);
      if (prod) {
        const remaining = prod.availableStock - soldItem.quantity;
        if (remaining <= prod.minThreshold) {
          const existingReq = restockRequests.find(
            (r) => r.productId === prod.id && r.status === 'Pending'
          );
          if (!existingReq) {
            const autoReq: RestockRequest = {
              id: `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              shopId: sid,
              productId: prod.id,
              productName: prod.name,
              brand: prod.brand,
              currentStock: Math.max(0, remaining),
              minThreshold: prod.minThreshold,
              requestedQuantity: prod.minThreshold,
              supplierName: prod.supplierName,
              supplierEmail: prod.supplierEmail,
              supplierPhone: prod.supplierPhone,
              status: 'Pending',
              createdAt: new Date().toISOString()
            };
            setRestockRequests((prev) => [autoReq, ...prev]);
          }
        }
      }
    });

    showToast(`Bill ${receiptNum} recorded! Stock decremented and customer phone saved.`);
  };

  // Forum Discussion Handlers
  const handleAddForumPost = async (post: ForumPost) => {
    const sid = currentShop?.id || currentUser?.shopId;
    const scopedPost = { ...post, shopId: sid };
    setForumPosts((prev) => [scopedPost, ...prev]);
    await apiSaveForumPost(scopedPost);
  };

  const handleAddReply = async (
    postId: string,
    content: string,
    author: string,
    role: any
  ) => {
    const sid = currentShop?.id || currentUser?.shopId;
    const reply = {
      id: `rep-${Date.now()}`,
      authorName: author,
      authorRole: role,
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setForumPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            replies: [...(p.replies || []), reply]
          };
        }
        return p;
      })
    );
    await apiSaveReply(postId, reply, sid);
  };

  // Customer Feedback Handler
  const handleAddReview = async (review: CustomerReview) => {
    const sid = currentShop?.id || currentUser?.shopId;
    const scopedReview = { ...review, shopId: review.shopId || sid };
    const updated = [scopedReview, ...reviews];
    setReviews(updated);
    saveReviews(updated, sid);
    await apiSaveReview(scopedReview);
  };

  // Calculate critical alerts count for notification bell badge
  const criticalCount = restockRequests.filter((r) => r.status === 'Pending').length;

  // 1. PUBLIC CUSTOMER FEEDBACK PORTAL (Accessible by scanning product packaging QR code)
  if (activeFeedbackProductId) {
    return (
      <>
        <PublicCustomerFeedbackScreen
          productId={activeFeedbackProductId}
          products={products}
          shop={currentShop}
          transactions={transactions}
          reviews={reviews}
          onAddReview={handleAddReview}
          onClose={() => setActiveFeedbackProductId(null)}
          onShowToast={showToast}
        />
        {toastMessage && (
          <div className="fixed top-6 left-4 right-4 max-w-md mx-auto z-50 bg-[#0b1c30] text-white px-4 py-3 rounded-xl shadow-xl flex items-center justify-between border border-[#213145] animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[#85f8c4] text-[20px]">
                check_circle
              </span>
              <span className="text-[13px] font-medium">{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-white/70 hover:text-white ml-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}
      </>
    );
  }

  // 2. LOGIN / REGISTER SCREEN (Presented when not logged in)
  if (!currentUser) {
    return (
      <>
        <LoginGatewayScreen
          currentShop={currentShop}
          users={users}
          onRegisterShop={handleRegisterShop}
          onLoginSuccess={handleLoginSuccess}
          onShowToast={showToast}
          isSyncingWithServer={isSyncing}
        />
        {toastMessage && (
          <div className="fixed top-6 left-4 right-4 max-w-md mx-auto z-50 bg-[#0b1c30] text-white px-4 py-3 rounded-xl shadow-xl flex items-center justify-between border border-[#213145] animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[#85f8c4] text-[20px]">
                check_circle
              </span>
              <span className="text-[13px] font-medium">{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-white/70 hover:text-white ml-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}
      </>
    );
  }

  // 3. AUTHENTICATED SHOP CONSOLE: Strictly by user's assigned role
  return (
    <div className="bg-[#f8f9ff] min-h-screen text-[#0b1c30] flex flex-col font-sans antialiased selection:bg-[#dce1ff] selection:text-[#001551]">
      {/* Top Header */}
      <Header
        currentTab={activeTab}
        activeRole={currentUser.role}
        currentUser={currentUser}
        currentShop={
          currentShop || {
            id: 'shop-01',
            name: 'My Retail Shop',
            ownerName: currentUser.name,
            phone: '',
            email: currentUser.email,
            createdAt: new Date().toISOString()
          }
        }
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onLogout={handleLogout}
        notificationCount={criticalCount}
        onOpenMongoSync={() => setIsMongoSyncOpen(true)}
        isMongoConnected={isMongoConnected}
      />

      {/* Main Content Area */}
      <main className="flex flex-col relative w-full pt-20 pb-24 px-4 bg-[#f8f9ff] flex-grow max-w-4xl mx-auto">
        {/* OWNER: Members Management */}
        {activeTab === 'members' && currentUser.role === 'Owner' && (
          <OwnerMembersScreen
            currentShop={
              currentShop || {
                id: 'shop-01',
                name: 'My Retail Shop',
                ownerName: currentUser.name,
                phone: '',
                email: currentUser.email,
                createdAt: new Date().toISOString()
              }
            }
            users={users}
            currentUser={currentUser}
            onAddMember={handleAddMember}
            onTerminateMember={handleTerminateMember}
            onShowToast={showToast}
          />
        )}

        {/* MANAGER / OWNER: Product Catalog, Stock Editing, Packaging QR, Reviews & Restock */}
        {(activeTab === 'inventory' || activeTab === 'restock') &&
          (currentUser.role === 'Manager' || currentUser.role === 'Owner') && (
            <ManagerProductsScreen
              products={products}
              restockRequests={restockRequests}
              reviews={reviews}
              currentShop={
                currentShop || {
                  id: 'shop-01',
                  name: 'My Retail Shop',
                  ownerName: currentUser.name,
                  phone: '',
                  email: currentUser.email,
                  createdAt: new Date().toISOString()
                }
              }
              activeRole={currentUser.role}
              onAddProduct={handleAddProduct}
              onRemoveProduct={handleRemoveProduct}
              onUpdateStock={handleUpdateStock}
              onApproveRestock={handleApproveRestock}
              onShowFeedbackPage={(product) => setActiveFeedbackProductId(product.id)}
              onShowToast={showToast}
            />
          )}

        {/* CASHIER / OWNER: POS Billing Register with Mandatory Customer Phone Number */}
        {activeTab === 'billing' &&
          (currentUser.role === 'Cashier' || currentUser.role === 'Owner') && (
            <PosBillingScreen
              products={products}
              currentUser={currentUser}
              transactions={transactions}
              onCompleteSale={handleCompleteSale}
              onShowToast={showToast}
              onShowFeedbackPage={(product) => setActiveFeedbackProductId(product.id)}
            />
          )}

        {/* ALL SHOP MEMBERS: Sales Trend Dashboard */}
        {activeTab === 'dashboard' && (
          <SalesTrendDashboard
            transactions={transactions}
            products={products}
            currentUser={currentUser}
          />
        )}

        {/* ALL SHOP MEMBERS: Team Discussion Forum */}
        {activeTab === 'forum' && (
          <ForumScreen
            posts={forumPosts}
            currentUser={currentUser}
            onAddPost={handleAddForumPost}
            onAddReply={handleAddReply}
            onToggleResolve={() => {}}
            onShowToast={showToast}
          />
        )}
      </main>

      {/* Role Navigation Bar */}
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        role={currentUser.role}
        criticalCount={criticalCount}
      />

      {/* Restock Notification Drawer */}
      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        restockRequests={restockRequests}
        products={products}
        onNavigateToRestock={() => {
          if (currentUser.role === 'Manager' || currentUser.role === 'Owner') {
            setActiveTab('restock');
          } else {
            showToast('Restock requests are managed by the Store Manager.');
          }
        }}
      />

      {/* MongoDB Compass Synchronization Modal */}
      <MongoCompassSyncModal
        isOpen={isMongoSyncOpen}
        onClose={() => setIsMongoSyncOpen(false)}
        products={products}
        transactions={transactions}
        reviews={reviews}
        users={users}
        currentShop={currentShop}
        onRefreshData={syncWithServer}
        onShowToast={showToast}
      />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-4 right-4 max-w-md mx-auto z-50 bg-[#0b1c30] text-white px-4 py-3 rounded-xl shadow-xl flex items-center justify-between border border-[#213145] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#85f8c4] text-[20px]">
              check_circle
            </span>
            <span className="text-[13px] font-medium leading-tight">{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-white/70 hover:text-white ml-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}
    </div>
  );
}
