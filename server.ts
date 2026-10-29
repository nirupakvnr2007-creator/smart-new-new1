import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { MongoClient, Db } from 'mongodb';

interface DbSchema {
  shops: any[];
  users: any[];
  products: any[];
  restockRequests: any[];
  transactions: any[];
  forumPosts: any[];
  reviews: any[];
}

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'smart_inventory_db.json');
const MONGO_CONFIG_FILE = path.join(DB_DIR, 'mongo_config.json');

const DEFAULT_SHOP_ID = 'shop-01';

// --- Standalone Multi-Tenant Persistent Database Engine ---
function ensureDbFile(): DbSchema {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const defaultDb: DbSchema = {
    shops: [
      {
        id: DEFAULT_SHOP_ID,
        name: 'Smart Retail Store',
        ownerName: 'Store Administrator',
        countryCode: '+91',
        phone: '9840123456',
        email: 'owner@store.com',
        createdAt: '2026-10-20T10:00:00.000Z'
      }
    ],
    users: [],
    products: [],
    restockRequests: [],
    transactions: [],
    forumPosts: [],
    reviews: []
  };

  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2), 'utf-8');
    return defaultDb;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);

    let shops: any[] = [];
    if (Array.isArray(parsed.shops)) {
      shops = parsed.shops;
    } else if (parsed.shop) {
      const singleShop = parsed.shop;
      if (!singleShop.id) singleShop.id = DEFAULT_SHOP_ID;
      shops = [singleShop];
    }

    if (shops.length === 0) {
      shops = [...defaultDb.shops];
    }

    const primaryShopId = shops[0]?.id || DEFAULT_SHOP_ID;

    // Migrate any legacy records lacking shopId so existing local records are safely isolated
    const rawProducts = Array.isArray(parsed.products) ? parsed.products : [];
    const products = rawProducts.map((p: any) => ({
      ...p,
      shopId: p.shopId || primaryShopId
    }));

    const rawUsers = Array.isArray(parsed.users) ? parsed.users : [];
    const users = rawUsers.map((u: any) => ({
      ...u,
      shopId: u.shopId || primaryShopId
    }));

    const rawRequests = Array.isArray(parsed.restockRequests) ? parsed.restockRequests : [];
    const restockRequests = rawRequests.map((r: any) => ({
      ...r,
      shopId: r.shopId || primaryShopId
    }));

    const rawTransactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];
    const transactions = rawTransactions.map((t: any) => ({
      ...t,
      shopId: t.shopId || primaryShopId
    }));

    const rawForum = Array.isArray(parsed.forumPosts) ? parsed.forumPosts : [];
    const forumPosts = rawForum.map((f: any) => ({
      ...f,
      shopId: f.shopId || primaryShopId
    }));

    const rawReviews = Array.isArray(parsed.reviews) ? parsed.reviews : [];
    const reviews = rawReviews.map((r: any) => ({
      ...r,
      shopId: r.shopId || primaryShopId
    }));

    const sanitizedDb: DbSchema = {
      shops,
      users,
      products,
      restockRequests,
      transactions,
      forumPosts,
      reviews
    };

    return sanitizedDb;
  } catch (err) {
    console.error('Error reading DB_FILE, resetting to default', err);
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2), 'utf-8');
    return defaultDb;
  }
}

function writeDbFile(data: DbSchema) {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write database file', err);
  }
}

// --- MongoDB Manager with Shop-Isolated Multi-Tenant Collections ---
class MongoManager {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private uri: string = '';
  public isConnected: boolean = false;
  public lastError: string | null = null;

  constructor() {
    this.loadSavedUri();
  }

  private loadSavedUri() {
    if (process.env.MONGODB_URI) {
      this.uri = process.env.MONGODB_URI;
      return;
    }
    try {
      if (fs.existsSync(MONGO_CONFIG_FILE)) {
        const conf = JSON.parse(fs.readFileSync(MONGO_CONFIG_FILE, 'utf-8'));
        if (conf.uri) {
          this.uri = conf.uri;
          return;
        }
      }
    } catch {
      // ignore
    }

    // Default local candidates: try 127.0.0.1 first, then localhost
    this.uri = 'mongodb://127.0.0.1:27017/smart_inventory';
  }

  public getDb(): Db | null {
    return this.db;
  }

  public async connect(overrideUri?: string, silent: boolean = false): Promise<{ success: boolean; message: string }> {
    const candidates = overrideUri
      ? [overrideUri]
      : [
          this.uri,
          'mongodb://127.0.0.1:27017/smart_inventory',
          'mongodb://localhost:27017/smart_inventory'
        ];

    const uniqueCandidates = Array.from(new Set(candidates.filter(Boolean)));
    let lastErr: any = null;

    for (const targetUri of uniqueCandidates) {
      try {
        if (!silent) {
          console.log(`[MongoDB Engine] Attempting connection to: ${targetUri}...`);
        }
        if (this.client) {
          try {
            await this.client.close();
          } catch {}
        }

        this.client = new MongoClient(targetUri, {
          serverSelectionTimeoutMS: 2000,
          connectTimeoutMS: 2000
        });

        await this.client.connect();
        this.db = this.client.db('smart_inventory');
        this.isConnected = true;
        this.uri = targetUri;
        this.lastError = null;

        try {
          if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
          fs.writeFileSync(MONGO_CONFIG_FILE, JSON.stringify({ uri: targetUri }, null, 2));
        } catch {}

        console.log(`[MongoDB] Connected successfully to database "smart_inventory" at ${targetUri}!`);
        await this.initializeTables();
        return { success: true, message: `Connected to MongoDB database smart_inventory successfully at ${targetUri}` };
      } catch (err: any) {
        lastErr = err;
      }
    }

    this.isConnected = false;
    this.lastError = lastErr?.message || 'MongoDB server not reachable';
    if (!silent) {
      console.log('[Database Engine] Local mirror active (smart_inventory_db.json). Ready for local MongoDB Compass on port 27017.');
    }
    return { success: false, message: this.lastError || 'Failed to connect to MongoDB' };
  }

  public async initializeTables(): Promise<{
    success: boolean;
    collections: string[];
    counts: Record<string, number>;
    message: string;
  }> {
    if (!this.isConnected || !this.db) {
      return {
        success: false,
        collections: [],
        counts: {},
        message: 'MongoDB is not connected. Connect locally at mongodb://127.0.0.1:27017 or via connection string.'
      };
    }

    try {
      const requiredCollections = [
        'products',
        'users',
        'shops',
        'transactions',
        'reviews',
        'restock_requests',
        'forum_posts'
      ];

      const existingCollections = await this.db.listCollections().toArray();
      const existingNames = new Set(existingCollections.map((c) => c.name));

      for (const name of requiredCollections) {
        if (!existingNames.has(name)) {
          await this.db.createCollection(name);
        }
      }

      // Ensure indexes for fast search and shop data isolation
      await this.db.collection('shops').createIndex({ id: 1 }, { unique: true }).catch(() => {});
      await this.db.collection('users').createIndex({ email: 1, shopId: 1 }).catch(() => {});
      await this.db.collection('users').createIndex({ shopId: 1 }).catch(() => {});
      await this.db.collection('products').createIndex({ sku: 1, shopId: 1 }).catch(() => {});
      await this.db.collection('products').createIndex({ shopId: 1 }).catch(() => {});
      await this.db.collection('transactions').createIndex({ receiptNumber: 1 }).catch(() => {});
      await this.db.collection('transactions').createIndex({ customerPhone: 1, shopId: 1 }).catch(() => {});
      await this.db.collection('transactions').createIndex({ shopId: 1 }).catch(() => {});
      await this.db.collection('reviews').createIndex({ productId: 1, shopId: 1 }).catch(() => {});
      await this.db.collection('restock_requests').createIndex({ shopId: 1 }).catch(() => {});
      await this.db.collection('forum_posts').createIndex({ shopId: 1 }).catch(() => {});

      // Seed collections only if currently empty in MongoDB
      const fileDb = ensureDbFile();

      const shopCount = await this.db.collection('shops').countDocuments();
      if (shopCount === 0 && fileDb.shops.length > 0) {
        await this.db.collection('shops').insertMany(fileDb.shops).catch(() => {});
      }

      const prodCount = await this.db.collection('products').countDocuments();
      if (prodCount === 0 && fileDb.products.length > 0) {
        await this.db.collection('products').insertMany(fileDb.products).catch(() => {});
      }

      const userCount = await this.db.collection('users').countDocuments();
      if (userCount === 0 && fileDb.users.length > 0) {
        await this.db.collection('users').insertMany(fileDb.users).catch(() => {});
      }

      const reqCount = await this.db.collection('restock_requests').countDocuments();
      if (reqCount === 0 && fileDb.restockRequests.length > 0) {
        await this.db.collection('restock_requests').insertMany(fileDb.restockRequests).catch(() => {});
      }

      const txnCount = await this.db.collection('transactions').countDocuments();
      if (txnCount === 0 && fileDb.transactions.length > 0) {
        await this.db.collection('transactions').insertMany(fileDb.transactions).catch(() => {});
      }

      const revCount = await this.db.collection('reviews').countDocuments();
      if (revCount === 0 && fileDb.reviews.length > 0) {
        await this.db.collection('reviews').insertMany(fileDb.reviews).catch(() => {});
      }

      const forumCount = await this.db.collection('forum_posts').countDocuments();
      if (forumCount === 0 && fileDb.forumPosts.length > 0) {
        await this.db.collection('forum_posts').insertMany(fileDb.forumPosts).catch(() => {});
      }

      const counts: Record<string, number> = {};
      for (const col of requiredCollections) {
        counts[col] = await this.db.collection(col).countDocuments();
      }

      return {
        success: true,
        collections: requiredCollections,
        counts,
        message: 'All multi-tenant tables initialized with shop-isolated indexing.'
      };
    } catch (err: any) {
      return {
        success: false,
        collections: [],
        counts: {},
        message: `Initialization error: ${err.message}`
      };
    }
  }
}

const mongoManager = new MongoManager();

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(express.json({ limit: '10mb' }));

  // CORS and Cache Control
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-shop-id');
    res.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    next();
  });

  // Attempt initial MongoDB connection
  mongoManager.connect(undefined, true).catch(() => {});

  // Background reconnect check
  setInterval(() => {
    if (!mongoManager.isConnected) {
      mongoManager.connect(undefined, true).catch(() => {});
    }
  }, 30000);

  // Helper to extract effective shopId from query or header
  const getRequestedShopId = (req: express.Request): string => {
    const fromQuery = typeof req.query.shopId === 'string' ? req.query.shopId.trim() : '';
    const fromHeader = typeof req.headers['x-shop-id'] === 'string' ? req.headers['x-shop-id'].trim() : '';
    return fromQuery || fromHeader || '';
  };

  // 1. GET SHOP-ISOLATED DATA
  app.get('/api/data', async (req, res) => {
    const shopId = getRequestedShopId(req);
    const fileDb = ensureDbFile();
    const db = mongoManager.getDb();

    // If no shopId requested, return general registry without exposing private records
    if (!shopId) {
      return res.json({
        shop: null,
        shops: fileDb.shops.map((s) => ({
          id: s.id,
          name: s.name,
          ownerName: s.ownerName,
          email: s.email,
          createdAt: s.createdAt
        })),
        users: [],
        products: [],
        restockRequests: [],
        transactions: [],
        forumPosts: [],
        reviews: []
      });
    }

    if (db) {
      try {
        const [products, users, targetShopDoc, restockRequests, transactions, forumPosts, reviews] = await Promise.all([
          db.collection('products').find({ shopId }).toArray(),
          db.collection('users').find({ shopId }).toArray(),
          db.collection('shops').findOne({ id: shopId }),
          db.collection('restock_requests').find({ shopId }).toArray(),
          db.collection('transactions').find({ shopId }).toArray(),
          db.collection('forum_posts').find({ shopId }).toArray(),
          db.collection('reviews').find({ shopId }).toArray()
        ]);

        const resolvedShop = targetShopDoc
          ? (({ _id, ...s }) => s)(targetShopDoc)
          : (fileDb.shops.find((s) => s.id === shopId) || null);

        const mongoData = {
          shop: resolvedShop,
          users: users.map(({ _id, ...u }) => u),
          products: products.map(({ _id, ...p }) => p),
          restockRequests: restockRequests.map(({ _id, ...r }) => r),
          transactions: transactions.map(({ _id, ...t }) => t),
          forumPosts: forumPosts.map(({ _id, ...f }) => f),
          reviews: reviews.map(({ _id, ...r }) => r)
        };

        return res.json(mongoData);
      } catch (err) {
        console.error('Error querying MongoDB for shop data, falling back to local file', err);
      }
    }

    // Local file fallback strictly isolated by shopId
    const localShop = fileDb.shops.find((s) => s.id === shopId) || null;
    res.json({
      shop: localShop,
      users: fileDb.users.filter((u) => u.shopId === shopId),
      products: fileDb.products.filter((p) => p.shopId === shopId),
      restockRequests: fileDb.restockRequests.filter((r) => r.shopId === shopId),
      transactions: fileDb.transactions.filter((t) => t.shopId === shopId),
      forumPosts: fileDb.forumPosts.filter((f) => f.shopId === shopId),
      reviews: fileDb.reviews.filter((r) => r.shopId === shopId)
    });
  });

  // 2. AUTH LOGIN ENDPOINT: Identifies user AND loads their specific shop
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    const db = mongoManager.getDb();
    let matchedUser: any = null;

    if (db) {
      try {
        const found = await db.collection('users').findOne({
          email: { $regex: new RegExp(`^${trimmedEmail}$`, 'i') },
          password: cleanPassword
        });
        if (found) {
          const { _id, ...u } = found;
          matchedUser = u;
        }
      } catch (err) {
        console.error('MongoDB auth error, checking local database', err);
      }
    }

    if (!matchedUser) {
      const fileDb = ensureDbFile();
      matchedUser = fileDb.users.find(
        (u: any) =>
          (u.email || '').toLowerCase() === trimmedEmail &&
          (u.password || '').trim() === cleanPassword
      );
    }

    if (matchedUser) {
      // Find the specific shop associated with this user
      const userShopId = matchedUser.shopId || DEFAULT_SHOP_ID;
      let matchedShop: any = null;

      if (db) {
        try {
          const shopDoc = await db.collection('shops').findOne({ id: userShopId });
          if (shopDoc) {
            const { _id, ...s } = shopDoc;
            matchedShop = s;
          }
        } catch {}
      }

      if (!matchedShop) {
        const fileDb = ensureDbFile();
        matchedShop = fileDb.shops.find((s) => s.id === userShopId) || fileDb.shops[0] || null;
      }

      return res.json({
        success: true,
        user: { ...matchedUser, shopId: userShopId },
        shop: matchedShop
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid email or password. Please verify your credentials or register your shop.'
    });
  });

  // 3. SHOP ENDPOINT: Securely upserts shop without overwriting other shops
  app.post('/api/shop', async (req, res) => {
    const shop = req.body;
    if (!shop || !shop.id) {
      shop.id = `shop-${Date.now()}`;
    }

    const fileDb = ensureDbFile();
    const existingIndex = fileDb.shops.findIndex((s: any) => s.id === shop.id);
    if (existingIndex >= 0) {
      fileDb.shops[existingIndex] = shop;
    } else {
      fileDb.shops.push(shop);
    }
    writeDbFile(fileDb);

    const db = mongoManager.getDb();
    if (db) {
      try {
        // Safe upsert by shop.id: NEVER delete other shops!
        await db.collection('shops').updateOne(
          { id: shop.id },
          { $set: shop },
          { upsert: true }
        );
      } catch (e) {
        console.error('MongoDB shop write error:', e);
      }
    }

    res.json({ success: true, shop });
  });

  // 4. USERS ENDPOINTS: Scoped to specific shop
  app.post('/api/users', async (req, res) => {
    const newUser = req.body;
    const shopId = newUser.shopId || getRequestedShopId(req) || DEFAULT_SHOP_ID;
    newUser.shopId = shopId;

    const fileDb = ensureDbFile();
    const existingIndex = fileDb.users.findIndex(
      (u: any) =>
        u.id === newUser.id ||
        ((u.email || '').toLowerCase() === (newUser.email || '').toLowerCase() && u.shopId === shopId)
    );

    if (existingIndex >= 0) {
      fileDb.users[existingIndex] = newUser;
    } else {
      fileDb.users.unshift(newUser);
    }
    writeDbFile(fileDb);

    const db = mongoManager.getDb();
    if (db) {
      try {
        await db.collection('users').updateOne(
          { id: newUser.id },
          { $set: newUser },
          { upsert: true }
        );
      } catch (e) {
        console.error('MongoDB user write error:', e);
      }
    }

    // Return only the users belonging to this specific shop
    const shopUsers = fileDb.users.filter((u) => u.shopId === shopId);
    res.json({ success: true, users: shopUsers });
  });

  app.delete('/api/users/:id', async (req, res) => {
    const fileDb = ensureDbFile();
    const userToDelete = fileDb.users.find((u: any) => u.id === req.params.id);
    const shopId = userToDelete?.shopId || getRequestedShopId(req);

    fileDb.users = fileDb.users.filter((u: any) => u.id !== req.params.id);
    writeDbFile(fileDb);

    const db = mongoManager.getDb();
    if (db) {
      try {
        await db.collection('users').deleteOne({ id: req.params.id });
      } catch (e) {
        console.error('MongoDB user delete error:', e);
      }
    }

    const shopUsers = shopId ? fileDb.users.filter((u) => u.shopId === shopId) : fileDb.users;
    res.json({ success: true, users: shopUsers });
  });

  // 5. PRODUCTS ENDPOINTS: Isolated by shop
  app.post('/api/products', async (req, res) => {
    const product = req.body;
    const shopId = product.shopId || getRequestedShopId(req) || DEFAULT_SHOP_ID;
    product.shopId = shopId;

    const fileDb = ensureDbFile();
    const existingIndex = fileDb.products.findIndex((p: any) => p.id === product.id);
    if (existingIndex >= 0) {
      fileDb.products[existingIndex] = product;
    } else {
      fileDb.products.unshift(product);
    }

    // Auto-generate restock request if stock is below or equal to threshold
    if (product.availableStock <= product.minThreshold) {
      const hasPending = fileDb.restockRequests.some(
        (r: any) => r.productId === product.id && r.shopId === shopId && r.status === 'Pending'
      );
      if (!hasPending) {
        fileDb.restockRequests.unshift({
          id: `req-${Date.now()}`,
          shopId,
          productId: product.id,
          productName: product.name,
          brand: product.brand,
          currentStock: product.availableStock,
          minThreshold: product.minThreshold,
          requestedQuantity: product.minThreshold,
          supplierName: product.supplierName,
          supplierEmail: product.supplierEmail,
          supplierPhone: product.supplierPhone,
          status: 'Pending',
          createdAt: new Date().toISOString()
        });
      }
    }

    writeDbFile(fileDb);

    const db = mongoManager.getDb();
    if (db) {
      try {
        await db.collection('products').updateOne(
          { id: product.id },
          { $set: product },
          { upsert: true }
        );
        if (fileDb.restockRequests.length > 0) {
          const pending = fileDb.restockRequests[0];
          await db.collection('restock_requests').updateOne(
            { id: pending.id },
            { $set: pending },
            { upsert: true }
          );
        }
      } catch (e) {
        console.error('MongoDB product write error:', e);
      }
    }

    const shopProducts = fileDb.products.filter((p) => p.shopId === shopId);
    const shopRequests = fileDb.restockRequests.filter((r) => r.shopId === shopId);
    res.json({ success: true, products: shopProducts, restockRequests: shopRequests });
  });

  // Edit Stock Endpoint
  app.put('/api/products/:id/stock', async (req, res) => {
    const fileDb = ensureDbFile();
    const { newStock } = req.body;
    const product = fileDb.products.find((p: any) => p.id === req.params.id);

    if (product) {
      const shopId = product.shopId || DEFAULT_SHOP_ID;
      product.availableStock = Math.max(0, parseInt(newStock, 10) || 0);

      if (product.availableStock > product.minThreshold) {
        fileDb.restockRequests = fileDb.restockRequests.map((r: any) =>
          r.productId === product.id && r.status === 'Pending'
            ? { ...r, status: 'Approved' }
            : r
        );
      } else {
        const hasPending = fileDb.restockRequests.some(
          (r: any) => r.productId === product.id && r.status === 'Pending'
        );
        if (!hasPending) {
          fileDb.restockRequests.unshift({
            id: `req-${Date.now()}`,
            shopId,
            productId: product.id,
            productName: product.name,
            brand: product.brand,
            currentStock: product.availableStock,
            minThreshold: product.minThreshold,
            requestedQuantity: product.minThreshold,
            supplierName: product.supplierName,
            supplierEmail: product.supplierEmail,
            supplierPhone: product.supplierPhone,
            status: 'Pending',
            createdAt: new Date().toISOString()
          });
        }
      }
      writeDbFile(fileDb);

      const db = mongoManager.getDb();
      if (db) {
        try {
          await db.collection('products').updateOne(
            { id: product.id },
            { $set: { availableStock: product.availableStock } }
          );
          for (const reqItem of fileDb.restockRequests) {
            await db.collection('restock_requests').updateOne(
              { id: reqItem.id },
              { $set: reqItem },
              { upsert: true }
            ).catch(() => {});
          }
        } catch (e) {
          console.error('MongoDB update stock error:', e);
        }
      }

      const shopProducts = fileDb.products.filter((p) => p.shopId === shopId);
      const shopRequests = fileDb.restockRequests.filter((r) => r.shopId === shopId);
      res.json({ success: true, product, products: shopProducts, restockRequests: shopRequests });
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  });

  app.delete('/api/products/:id', async (req, res) => {
    const fileDb = ensureDbFile();
    const product = fileDb.products.find((p: any) => p.id === req.params.id);
    const shopId = product?.shopId || getRequestedShopId(req);

    fileDb.products = fileDb.products.filter((p: any) => p.id !== req.params.id);
    fileDb.restockRequests = fileDb.restockRequests.filter((r: any) => r.productId !== req.params.id);
    writeDbFile(fileDb);

    const db = mongoManager.getDb();
    if (db) {
      try {
        await db.collection('products').deleteOne({ id: req.params.id });
        await db.collection('restock_requests').deleteMany({ productId: req.params.id });
      } catch (e) {
        console.error('MongoDB product delete error:', e);
      }
    }

    const shopProducts = shopId ? fileDb.products.filter((p) => p.shopId === shopId) : fileDb.products;
    res.json({ success: true, products: shopProducts });
  });

  // 6. RESTOCK REQUESTS ENDPOINTS
  app.put('/api/restock/:id', async (req, res) => {
    const fileDb = ensureDbFile();
    const { status } = req.body;
    const reqItem = fileDb.restockRequests.find((r: any) => r.id === req.params.id);
    const shopId = reqItem?.shopId || getRequestedShopId(req);

    fileDb.restockRequests = fileDb.restockRequests.map((r: any) =>
      r.id === req.params.id ? { ...r, status: status || 'Approved' } : r
    );
    writeDbFile(fileDb);

    const db = mongoManager.getDb();
    if (db) {
      try {
        await db.collection('restock_requests').updateOne(
          { id: req.params.id },
          { $set: { status: status || 'Approved' } }
        );
      } catch (e) {
        console.error('MongoDB restock update error:', e);
      }
    }

    const shopRequests = shopId ? fileDb.restockRequests.filter((r) => r.shopId === shopId) : fileDb.restockRequests;
    res.json({ success: true, restockRequests: shopRequests });
  });

  // 7. TRANSACTIONS / BILLING: Scoped to specific shop
  app.post('/api/transactions', async (req, res) => {
    const fileDb = ensureDbFile();
    const txn = req.body;
    const shopId = txn.shopId || getRequestedShopId(req) || DEFAULT_SHOP_ID;
    txn.shopId = shopId;

    fileDb.transactions.unshift(txn);

    if (Array.isArray(txn.items)) {
      txn.items.forEach((item: any) => {
        const product = fileDb.products.find(
          (p: any) => (p.shopId === shopId) && (p.id === item.productId || p.sku === item.sku)
        );
        if (product) {
          product.availableStock = Math.max(0, product.availableStock - (item.quantity || 1));

          if (product.availableStock <= product.minThreshold) {
            const hasPending = fileDb.restockRequests.some(
              (r: any) => r.productId === product.id && r.shopId === shopId && r.status === 'Pending'
            );
            if (!hasPending) {
              fileDb.restockRequests.unshift({
                id: `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                shopId,
                productId: product.id,
                productName: product.name,
                brand: product.brand,
                currentStock: product.availableStock,
                minThreshold: product.minThreshold,
                requestedQuantity: product.minThreshold,
                supplierName: product.supplierName,
                supplierEmail: product.supplierEmail,
                supplierPhone: product.supplierPhone,
                status: 'Pending',
                createdAt: new Date().toISOString()
              });
            }
          }
        }
      });
    }

    writeDbFile(fileDb);

    const db = mongoManager.getDb();
    if (db) {
      try {
        await db.collection('transactions').insertOne(txn);
        for (const p of fileDb.products.filter((p) => p.shopId === shopId)) {
          await db.collection('products').updateOne(
            { id: p.id },
            { $set: { availableStock: p.availableStock } }
          );
        }
        for (const reqItem of fileDb.restockRequests.filter((r) => r.shopId === shopId)) {
          await db.collection('restock_requests').updateOne(
            { id: reqItem.id },
            { $set: reqItem },
            { upsert: true }
          ).catch(() => {});
        }
      } catch (e) {
        console.error('MongoDB transaction error:', e);
      }
    }

    res.json({
      success: true,
      transaction: txn,
      products: fileDb.products.filter((p) => p.shopId === shopId),
      restockRequests: fileDb.restockRequests.filter((r) => r.shopId === shopId)
    });
  });

  // 8. VERIFY BUYER PURCHASE: Scoped to matching product & shop
  app.post('/api/verify-purchase', (req, res) => {
    const { productId, customerPhone, shopId } = req.body;
    if (!productId || !customerPhone) {
      return res.status(400).json({ verified: false, message: 'Product ID and customer phone required' });
    }

    const cleanInput = customerPhone.replace(/\D/g, '');
    const fileDb = ensureDbFile();

    const matchedTxn = fileDb.transactions.find((txn: any) => {
      if (shopId && txn.shopId && txn.shopId !== shopId) return false;
      const cleanPhone = (txn.customerPhone || '').replace(/\D/g, '');
      const phoneMatches =
        cleanPhone.length >= 6 && (cleanPhone.includes(cleanInput) || cleanInput.includes(cleanPhone));
      const hasProduct = txn.items?.some((i: any) => i.productId === productId || i.sku === productId);
      return phoneMatches && hasProduct;
    });

    if (matchedTxn) {
      return res.json({
        verified: true,
        receiptNumber: matchedTxn.receiptNumber,
        timestamp: matchedTxn.timestamp
      });
    }

    return res.json({
      verified: false,
      message: 'No matching in-store counter purchase record found for this mobile number.'
    });
  });

  // 9. REVIEWS: Isolated by shop
  app.post('/api/reviews', async (req, res) => {
    const review = req.body;
    const shopId = review.shopId || getRequestedShopId(req) || DEFAULT_SHOP_ID;
    review.shopId = shopId;

    const fileDb = ensureDbFile();
    fileDb.reviews.unshift(review);
    writeDbFile(fileDb);

    const db = mongoManager.getDb();
    if (db) {
      try {
        await db.collection('reviews').insertOne(review);
      } catch (e) {
        console.error('MongoDB review write error:', e);
      }
    }

    res.json({ success: true, reviews: fileDb.reviews.filter((r) => r.shopId === shopId) });
  });

  // 10. FORUM POSTS & REPLIES: Isolated by shop
  app.post('/api/forum', async (req, res) => {
    const post = req.body;
    const shopId = post.shopId || getRequestedShopId(req) || DEFAULT_SHOP_ID;
    post.shopId = shopId;

    const fileDb = ensureDbFile();
    fileDb.forumPosts.unshift(post);
    writeDbFile(fileDb);

    const db = mongoManager.getDb();
    if (db) {
      try {
        await db.collection('forum_posts').insertOne(post);
      } catch (e) {
        console.error('MongoDB forum write error:', e);
      }
    }

    res.json({ success: true, forumPosts: fileDb.forumPosts.filter((f) => f.shopId === shopId) });
  });

  app.post('/api/forum/:id/replies', async (req, res) => {
    const reply = req.body;
    const fileDb = ensureDbFile();
    const post = fileDb.forumPosts.find((p: any) => p.id === req.params.id);

    if (post) {
      if (!Array.isArray(post.replies)) post.replies = [];
      post.replies.push(reply);
      writeDbFile(fileDb);

      const db = mongoManager.getDb();
      if (db) {
        try {
          await db.collection('forum_posts').updateOne(
            { id: req.params.id },
            { $set: { replies: post.replies } }
          );
        } catch (e) {
          console.error('MongoDB reply write error:', e);
        }
      }

      res.json({ success: true, post });
    } else {
      res.status(404).json({ error: 'Forum post not found' });
    }
  });

  // 11. MONGODB STATUS & CONFIG ENDPOINTS
  app.get('/api/mongodb/status', async (_req, res) => {
    const db = mongoManager.getDb();
    let counts: Record<string, number> = {};

    if (db && mongoManager.isConnected) {
      try {
        counts = {
          shops: await db.collection('shops').countDocuments(),
          products: await db.collection('products').countDocuments(),
          users: await db.collection('users').countDocuments(),
          transactions: await db.collection('transactions').countDocuments(),
          reviews: await db.collection('reviews').countDocuments()
        };
      } catch {}
    } else {
      const fileDb = ensureDbFile();
      counts = {
        shops: fileDb.shops.length,
        products: fileDb.products.length,
        users: fileDb.users.length,
        transactions: fileDb.transactions.length,
        reviews: fileDb.reviews.length
      };
    }

    res.json({
      connected: mongoManager.isConnected,
      databaseName: 'smart_inventory',
      counts,
      lastError: mongoManager.lastError
    });
  });

  app.post('/api/mongodb/config', async (req, res) => {
    const { uri } = req.body;
    if (!uri) {
      return res.status(400).json({ success: false, message: 'URI is required' });
    }

    const result = await mongoManager.connect(uri.trim());
    if (result.success) {
      const db = mongoManager.getDb();
      if (db) {
        const fileDb = ensureDbFile();
        const sCount = await db.collection('shops').countDocuments();
        if (sCount === 0 && fileDb.shops.length > 0) {
          await db.collection('shops').insertMany(fileDb.shops);
        }
        const pCount = await db.collection('products').countDocuments();
        if (pCount === 0 && fileDb.products.length > 0) {
          await db.collection('products').insertMany(fileDb.products);
        }
        const uCount = await db.collection('users').countDocuments();
        if (uCount === 0 && fileDb.users.length > 0) {
          await db.collection('users').insertMany(fileDb.users);
        }
      }
    }

    res.json(result);
  });

  app.post('/api/mongodb/init-tables', async (_req, res) => {
    const result = await mongoManager.initializeTables();
    res.json(result);
  });

  app.post('/api/mongodb/import-compass', async (req, res) => {
    const { collection, documents, shopId } = req.body;
    if (!collection || !Array.isArray(documents)) {
      return res.status(400).json({ success: false, message: 'collection and documents array required' });
    }

    const fileDb = ensureDbFile();
    const db = mongoManager.getDb();
    const effectiveShopId = shopId || getRequestedShopId(req) || DEFAULT_SHOP_ID;

    const cleanedDocs = documents.map((doc: any) => {
      const copy = { ...doc };
      if (copy._id && typeof copy._id === 'object' && copy._id.$oid) {
        copy._id = copy._id.$oid;
      }
      if (!copy.id) {
        copy.id = String(copy._id || copy.sku || `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
      }
      if (!copy.shopId) {
        copy.shopId = effectiveShopId;
      }
      return copy;
    });

    if (collection === 'products') {
      cleanedDocs.forEach((newP: any) => {
        const existingIdx = fileDb.products.findIndex(
          (p: any) => p.id === newP.id || (p.sku === newP.sku && p.shopId === newP.shopId)
        );
        if (existingIdx >= 0) {
          fileDb.products[existingIdx] = { ...fileDb.products[existingIdx], ...newP };
        } else {
          fileDb.products.push(newP);
        }
      });
      writeDbFile(fileDb);

      if (db) {
        for (const doc of cleanedDocs) {
          await db.collection('products').updateOne(
            { sku: doc.sku, shopId: doc.shopId },
            { $set: doc },
            { upsert: true }
          ).catch(() => {});
        }
      }
    }

    res.json({
      success: true,
      count: cleanedDocs.length,
      products: fileDb.products.filter((p) => p.shopId === effectiveShopId)
    });
  });

  // 12. Mount public assets & Vite or static dist
  const publicPath = path.resolve(process.cwd(), 'public');
  if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath));
  }

  const distPath = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(distPath) && process.env.VITE_DEV !== 'true') {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      try {
        const url = req.originalUrl;
        const indexPath = path.resolve(process.cwd(), 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    const url = `http://localhost:${PORT}`;
    console.log(`===================================================`);
    console.log(`  Smart Inventory Assistant running on ${url}`);
    console.log(`  Target Database: MongoDB smart_inventory (Multi-Tenant Isolated)`);
    console.log(`===================================================`);

    if (process.env.AUTO_OPEN !== 'false' && !process.env.K_SERVICE) {
      setTimeout(() => {
        const openCmd =
          process.platform === 'win32'
            ? `start "" "${url}"`
            : process.platform === 'darwin'
            ? `open "${url}"`
            : `xdg-open "${url}"`;
        exec(openCmd, () => {});
      }, 500);
    }
  });
}

startServer();
