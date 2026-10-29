import {
  ShopProfile,
  UserAccount,
  ProductItem,
  RestockRequest,
  SalesTransaction,
  ForumPost,
  CustomerReview
} from '../types';

export interface AppData {
  shop: ShopProfile | null;
  users: UserAccount[];
  products: ProductItem[];
  restockRequests: RestockRequest[];
  transactions: SalesTransaction[];
  forumPosts: ForumPost[];
  reviews: CustomerReview[];
}

export interface MongoStatus {
  connected: boolean;
  uriMasked: string;
  databaseName: string;
  counts: Record<string, number>;
  lastError: string | null;
}

export async function fetchServerData(shopId?: string): Promise<AppData | null> {
  try {
    const url = shopId ? `/api/data?shopId=${encodeURIComponent(shopId)}` : '/api/data';
    const res = await fetch(url, {
      headers: shopId ? { 'x-shop-id': shopId } : {}
    });
    if (!res.ok) throw new Error('Failed to fetch from server');
    return await res.json();
  } catch (err) {
    console.warn('Could not fetch server data, using local store', err);
    return null;
  }
}

export async function apiLogin(
  email: string,
  password: string
): Promise<{ success: boolean; user?: UserAccount; shop?: ShopProfile; message?: string }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.warn('Backend login fetch failed (offline or network):', err);
    return { success: false, message: 'Network offline. Attempting offline cached credentials.' };
  }
}

export async function apiSaveShop(shop: ShopProfile): Promise<void> {
  try {
    await fetch('/api/shop', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-shop-id': shop.id
      },
      body: JSON.stringify(shop)
    });
  } catch (err) {
    console.error('apiSaveShop error:', err);
  }
}

export async function apiSaveUser(user: UserAccount): Promise<void> {
  try {
    await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(user.shopId ? { 'x-shop-id': user.shopId } : {})
      },
      body: JSON.stringify(user)
    });
  } catch (err) {
    console.error('apiSaveUser error:', err);
  }
}

export async function apiDeleteUser(userId: string, shopId?: string): Promise<void> {
  try {
    await fetch(`/api/users/${userId}`, {
      method: 'DELETE',
      headers: shopId ? { 'x-shop-id': shopId } : {}
    });
  } catch (err) {
    console.error('apiDeleteUser error:', err);
  }
}

export async function apiSaveProduct(product: ProductItem): Promise<void> {
  try {
    await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(product.shopId ? { 'x-shop-id': product.shopId } : {})
      },
      body: JSON.stringify(product)
    });
  } catch (err) {
    console.error('apiSaveProduct error:', err);
  }
}

export async function apiUpdateProductStock(productId: string, newStock: number, shopId?: string): Promise<void> {
  try {
    await fetch(`/api/products/${productId}/stock`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(shopId ? { 'x-shop-id': shopId } : {})
      },
      body: JSON.stringify({ newStock, shopId })
    });
  } catch (err) {
    console.error('apiUpdateProductStock error:', err);
  }
}

export async function apiDeleteProduct(productId: string, shopId?: string): Promise<void> {
  try {
    await fetch(`/api/products/${productId}`, {
      method: 'DELETE',
      headers: shopId ? { 'x-shop-id': shopId } : {}
    });
  } catch (err) {
    console.error('apiDeleteProduct error:', err);
  }
}

export async function apiUpdateRestockStatus(requestId: string, status: string, shopId?: string): Promise<void> {
  try {
    await fetch(`/api/restock/${requestId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(shopId ? { 'x-shop-id': shopId } : {})
      },
      body: JSON.stringify({ status, shopId })
    });
  } catch (err) {
    console.error('apiUpdateRestockStatus error:', err);
  }
}

export async function apiSaveTransaction(txn: SalesTransaction): Promise<void> {
  try {
    await fetch('/api/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(txn.shopId ? { 'x-shop-id': txn.shopId } : {})
      },
      body: JSON.stringify(txn)
    });
  } catch (err) {
    console.error('apiSaveTransaction error:', err);
  }
}

export async function apiVerifyPurchase(
  productId: string,
  customerPhone: string,
  shopId?: string
): Promise<{ verified: boolean; receiptNumber?: string; timestamp?: string; message?: string }> {
  try {
    const res = await fetch('/api/verify-purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, customerPhone, shopId })
    });
    return await res.json();
  } catch (err) {
    console.error('apiVerifyPurchase error:', err);
    return { verified: false, message: 'Server verification error' };
  }
}

export async function apiSaveReview(review: CustomerReview): Promise<void> {
  try {
    await fetch('/api/reviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(review.shopId ? { 'x-shop-id': review.shopId } : {})
      },
      body: JSON.stringify(review)
    });
  } catch (err) {
    console.error('apiSaveReview error:', err);
  }
}

export async function apiSaveForumPost(post: ForumPost): Promise<void> {
  try {
    await fetch('/api/forum', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(post.shopId ? { 'x-shop-id': post.shopId } : {})
      },
      body: JSON.stringify(post)
    });
  } catch (err) {
    console.error('apiSaveForumPost error:', err);
  }
}

export async function apiSaveReply(
  postId: string,
  reply: { id: string; authorName: string; authorRole: string; content: string; timestamp: string },
  shopId?: string
): Promise<void> {
  try {
    await fetch(`/api/forum/${postId}/replies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(shopId ? { 'x-shop-id': shopId } : {})
      },
      body: JSON.stringify({ ...reply, shopId })
    });
  } catch (err) {
    console.error('apiSaveReply error:', err);
  }
}

// MongoDB & Compass Sync APIs
export async function apiGetMongoStatus(): Promise<MongoStatus> {
  try {
    const res = await fetch('/api/mongodb/status');
    return await res.json();
  } catch {
    return {
      connected: false,
      uriMasked: '',
      databaseName: 'smart_inventory',
      counts: {},
      lastError: 'Server unreachable'
    };
  }
}

export async function apiSetMongoUri(uri: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/mongodb/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uri })
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to connect to MongoDB' };
  }
}

export async function apiImportCompassData(
  collection: string,
  documents: any[]
): Promise<{ success: boolean; count: number; products?: ProductItem[] }> {
  try {
    const res = await fetch('/api/mongodb/import-compass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collection, documents })
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, count: 0 };
  }
}

export async function apiInitTables(): Promise<{
  success: boolean;
  collections: string[];
  counts: Record<string, number>;
  message: string;
}> {
  try {
    const res = await fetch('/api/mongodb/init-tables', {
      method: 'POST'
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      collections: [],
      counts: {},
      message: err?.message || 'Failed to reach database initializer'
    };
  }
}

export async function apiGetSentimentDataset(): Promise<any[]> {
  try {
    const res = await fetch('/sentiment_training_dataset.json');
    if (res.ok) {
      return await res.json();
    }
    return [];
  } catch {
    return [];
  }
}
