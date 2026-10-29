export type RoleType = 'Owner' | 'Manager' | 'Cashier' | 'Helper';

export interface ShopProfile {
  id: string;
  name: string;
  ownerName: string;
  countryCode?: string;
  phone: string;
  email: string;
  createdAt: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: RoleType;
  shopId?: string;
  countryCode?: string;
  phone: string;
  createdAt: string;
}

export type StaffMember = UserAccount;

export interface ProductItem {
  id: string;
  shopId?: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  availableStock: number;
  minThreshold: number;
  supplierName: string;
  supplierEmail: string;
  supplierPhone: string;
  qrCode: string;
  createdAt: string;
}

export interface RestockRequest {
  id: string;
  shopId?: string;
  productId: string;
  productName: string;
  brand: string;
  currentStock: number;
  minThreshold: number;
  requestedQuantity: number;
  supplierName: string;
  supplierEmail: string;
  supplierPhone: string;
  status: 'Pending' | 'Approved' | 'Sent';
  createdAt: string;
}

export interface SalesItem {
  productId: string;
  sku: string;
  name: string;
  brand: string;
  price: number;
  quantity: number;
  qrCode: string;
}

export interface SalesTransaction {
  id: string;
  shopId?: string;
  receiptNumber: string;
  timestamp: string;
  cashierName: string;
  cashierEmail: string;
  customerPhone: string;
  countryCode?: string;
  items: SalesItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'Cash' | 'UPI' | 'Card';
}

export interface ForumPost {
  id: string;
  shopId?: string;
  authorName: string;
  authorRole: RoleType;
  title: string;
  content: string;
  tag: 'Restock Flag' | 'Floor Alert' | 'Shift Note' | 'General';
  timestamp: string;
  replies: Array<{
    id: string;
    authorName: string;
    authorRole: RoleType;
    content: string;
    timestamp: string;
  }>;
}

export interface CustomerReview {
  id: string;
  shopId?: string;
  productId: string;
  productName: string;
  customerPhone: string;
  countryCode?: string;
  rating: number;
  comment: string;
  tags: string[];
  timestamp: string;
  isVerified: boolean;
  sentiment?: 'Positive' | 'Negative' | 'Neutral';
  sentimentScore?: number;
  sentimentConfidence?: number;
  sentimentKeywords?: string[];
}

export interface SentimentClassification {
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  score: number;
  confidence: number;
  keywords: string[];
}

export interface SentimentSummary {
  total: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  positive: number; // alias for positiveCount
  negative: number; // alias for negativeCount
  neutral: number;  // alias for neutralCount
  positivePercentage: number;
  negativePercentage: number;
  neutralPercentage: number;
  averageScore: number;
}

export interface TrainingExample {
  id: number;
  text: string;
  label: 'Positive' | 'Negative' | 'Neutral';
  rating: number;
  category: string;
}
