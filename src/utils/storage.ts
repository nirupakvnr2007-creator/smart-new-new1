import {
  ShopProfile,
  UserAccount,
  ProductItem,
  RestockRequest,
  SalesTransaction,
  ForumPost,
  CustomerReview
} from '../types';

const STORAGE_KEYS = {
  SHOP: 'smart_inventory_shop',
  SHOPS_LIST: 'smart_inventory_shops_registry',
  USERS: 'smart_inventory_users',
  PRODUCTS: 'smart_inventory_products',
  RESTOCK: 'smart_inventory_restock',
  TRANSACTIONS: 'smart_inventory_transactions',
  FORUM: 'smart_inventory_forum',
  REVIEWS: 'smart_inventory_reviews',
  SESSION_USER: 'smart_inventory_session_user'
};

function getScopedKey(baseKey: string, shopId?: string): string {
  if (!shopId) return baseKey;
  return `${baseKey}_${shopId}`;
}

export function loadStoredData(targetShopId?: string) {
  // If targetShopId is provided, try to load that shop's specific data
  let shop: ShopProfile | null = null;
  const activeUser = loadSessionUser();
  const effectiveShopId = targetShopId || activeUser?.shopId;

  if (effectiveShopId) {
    const scopedShopJson = localStorage.getItem(`smart_inventory_shop_${effectiveShopId}`);
    if (scopedShopJson) {
      try {
        shop = JSON.parse(scopedShopJson) as ShopProfile;
      } catch {}
    }
  }

  if (!shop) {
    const shopJson = localStorage.getItem(STORAGE_KEYS.SHOP);
    if (shopJson) {
      try {
        const parsed = JSON.parse(shopJson) as ShopProfile;
        if (!effectiveShopId || parsed.id === effectiveShopId) {
          shop = parsed;
        }
      } catch {}
    }
  }

  // Helper to load scoped or fallback array
  const loadScopedArray = <T extends { shopId?: string }>(baseKey: string): T[] => {
    if (effectiveShopId) {
      const scopedJson = localStorage.getItem(getScopedKey(baseKey, effectiveShopId));
      if (scopedJson) {
        try {
          return JSON.parse(scopedJson) as T[];
        } catch {}
      }
    }

    const fallbackJson = localStorage.getItem(baseKey);
    if (fallbackJson) {
      try {
        const list = JSON.parse(fallbackJson) as T[];
        if (effectiveShopId && Array.isArray(list)) {
          return list.filter((item) => !item.shopId || item.shopId === effectiveShopId);
        }
        return Array.isArray(list) ? list : [];
      } catch {}
    }
    return [];
  };

  return {
    shop,
    users: loadScopedArray<UserAccount>(STORAGE_KEYS.USERS),
    products: loadScopedArray<ProductItem>(STORAGE_KEYS.PRODUCTS),
    restockRequests: loadScopedArray<RestockRequest>(STORAGE_KEYS.RESTOCK),
    transactions: loadScopedArray<SalesTransaction>(STORAGE_KEYS.TRANSACTIONS),
    forumPosts: loadScopedArray<ForumPost>(STORAGE_KEYS.FORUM),
    reviews: loadScopedArray<CustomerReview>(STORAGE_KEYS.REVIEWS)
  };
}

export function saveShop(shop: ShopProfile | null) {
  if (shop && shop.id) {
    localStorage.setItem(`smart_inventory_shop_${shop.id}`, JSON.stringify(shop));
    localStorage.setItem(STORAGE_KEYS.SHOP, JSON.stringify(shop));

    // Maintain a registry of known shops on this device
    try {
      const rawList = localStorage.getItem(STORAGE_KEYS.SHOPS_LIST);
      const list: ShopProfile[] = rawList ? JSON.parse(rawList) : [];
      const idx = list.findIndex((s) => s.id === shop.id);
      if (idx >= 0) {
        list[idx] = shop;
      } else {
        list.push(shop);
      }
      localStorage.setItem(STORAGE_KEYS.SHOPS_LIST, JSON.stringify(list));
    } catch {}
  } else {
    localStorage.removeItem(STORAGE_KEYS.SHOP);
  }
}

export function saveUsers(users: UserAccount[], shopId?: string) {
  const sid = shopId || users[0]?.shopId;
  if (sid) {
    const shopOnlyUsers = users.filter((u) => !u.shopId || u.shopId === sid);
    localStorage.setItem(getScopedKey(STORAGE_KEYS.USERS, sid), JSON.stringify(shopOnlyUsers));
  }
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

export function saveProducts(products: ProductItem[], shopId?: string) {
  const sid = shopId || products[0]?.shopId;
  if (sid) {
    const shopOnlyProds = products.filter((p) => !p.shopId || p.shopId === sid);
    localStorage.setItem(getScopedKey(STORAGE_KEYS.PRODUCTS, sid), JSON.stringify(shopOnlyProds));
  }
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
}

export function saveRestockRequests(requests: RestockRequest[], shopId?: string) {
  const sid = shopId || requests[0]?.shopId;
  if (sid) {
    const shopOnlyReqs = requests.filter((r) => !r.shopId || r.shopId === sid);
    localStorage.setItem(getScopedKey(STORAGE_KEYS.RESTOCK, sid), JSON.stringify(shopOnlyReqs));
  }
  localStorage.setItem(STORAGE_KEYS.RESTOCK, JSON.stringify(requests));
}

export function saveTransactions(transactions: SalesTransaction[], shopId?: string) {
  const sid = shopId || transactions[0]?.shopId;
  if (sid) {
    const shopOnlyTxns = transactions.filter((t) => !t.shopId || t.shopId === sid);
    localStorage.setItem(getScopedKey(STORAGE_KEYS.TRANSACTIONS, sid), JSON.stringify(shopOnlyTxns));
  }
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
}

export function saveForumPosts(posts: ForumPost[], shopId?: string) {
  const sid = shopId || posts[0]?.shopId;
  if (sid) {
    const shopOnlyPosts = posts.filter((f) => !f.shopId || f.shopId === sid);
    localStorage.setItem(getScopedKey(STORAGE_KEYS.FORUM, sid), JSON.stringify(shopOnlyPosts));
  }
  localStorage.setItem(STORAGE_KEYS.FORUM, JSON.stringify(posts));
}

export function saveReviews(reviews: CustomerReview[], shopId?: string) {
  const sid = shopId || reviews[0]?.shopId;
  if (sid) {
    const shopOnlyRevs = reviews.filter((r) => !r.shopId || r.shopId === sid);
    localStorage.setItem(getScopedKey(STORAGE_KEYS.REVIEWS, sid), JSON.stringify(shopOnlyRevs));
  }
  localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews));
}

const SESSION_META_KEY = 'smart_inventory_session_meta';
export const DEFAULT_IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes security idle timeout

export interface SessionMeta {
  loginTime: number;
  lastActiveTime: number;
  maxIdleMs: number;
}

export function loadSessionUser(): UserAccount | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION_USER);
    if (!raw) return null;

    const metaRaw = localStorage.getItem(SESSION_META_KEY);
    if (metaRaw) {
      const meta = JSON.parse(metaRaw) as SessionMeta;
      const idleElapsed = Date.now() - meta.lastActiveTime;
      if (idleElapsed > (meta.maxIdleMs || DEFAULT_IDLE_TIMEOUT_MS)) {
        // Terminate session due to inactivity
        saveSessionUser(null);
        return null;
      }
    }
    return JSON.parse(raw) as UserAccount;
  } catch {
    return null;
  }
}

export function saveSessionUser(user: UserAccount | null, maxIdleMs: number = DEFAULT_IDLE_TIMEOUT_MS) {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.SESSION_USER, JSON.stringify(user));
    const meta: SessionMeta = {
      loginTime: Date.now(),
      lastActiveTime: Date.now(),
      maxIdleMs
    };
    localStorage.setItem(SESSION_META_KEY, JSON.stringify(meta));
  } else {
    localStorage.removeItem(STORAGE_KEYS.SESSION_USER);
    localStorage.removeItem(SESSION_META_KEY);
  }
}

export function updateSessionActivity(): void {
  try {
    const metaRaw = localStorage.getItem(SESSION_META_KEY);
    if (metaRaw) {
      const meta = JSON.parse(metaRaw) as SessionMeta;
      meta.lastActiveTime = Date.now();
      localStorage.setItem(SESSION_META_KEY, JSON.stringify(meta));
    }
  } catch {}
}

export function isSessionExpired(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION_USER);
    if (!raw) return false;
    const metaRaw = localStorage.getItem(SESSION_META_KEY);
    if (!metaRaw) return false;
    const meta = JSON.parse(metaRaw) as SessionMeta;
    return (Date.now() - meta.lastActiveTime) > (meta.maxIdleMs || DEFAULT_IDLE_TIMEOUT_MS);
  } catch {
    return false;
  }
}
