export interface DropshippingProduct {
  id: string;
  userId: string;
  source: string;
  name: string;
  description: string;
  costPrice: number;
  targetSellPrice: number;
  category: string;
  trendingScore: number;
  trendData: TrendData | null;
  validationStatus: 'pending' | 'validating' | 'approved' | 'rejected';
  aiScore: number | null;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TrendData {
  googleTrends: number;
  tikTokMentions: number;
  competitorCount: number;
  searchVolume: number;
  growthRate: number;
}

export interface ValidationResult {
  id: string;
  productId: string;
  stepName: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  resultData: ValidationStepData | null;
  completedAt: Date | null;
}

export interface ValidationStepData {
  score: number;
  passed: boolean;
  findings: string[];
  recommendation: string;
  data: Record<string, unknown>;
}

export interface DropshippingStore {
  id: string;
  userId: string;
  productId: string;
  name: string;
  domain: string | null;
  platform: 'shopify' | 'woocommerce' | 'custom';
  settings: StoreSettings;
  status: 'new' | 'testing' | 'scaling' | 'paused' | 'killed';
  createdAt: Date;
  updatedAt: Date;
}

export interface StoreSettings {
  primaryColor: string;
  logoUrl: string | null;
  tagline: string;
  targetCountries: string[];
  pricingMultiplier: number;
  shippingDays: number;
}

export interface StoreOrder {
  id: string;
  storeId: string;
  orderData: Record<string, unknown>;
  revenue: number;
  cost: number;
  placedAt: Date;
}

export interface Ad {
  id: string;
  storeId: string;
  platform: 'facebook' | 'instagram' | 'tiktok' | 'google';
  creativeType: 'image' | 'video' | 'carousel';
  adName: string;
  spend: number;
  revenue: number;
  roas: number;
  status: 'draft' | 'active' | 'paused' | 'killed';
  metadata: AdMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdMetadata {
  headline: string;
  bodyText: string;
  callToAction: string;
  targetAudience: string[];
  imageUrl?: string;
  videoUrl?: string;
}

export interface ProductScanResult {
  scanned: number;
  newProducts: number;
  duplicates: number;
  products: DropshippingProduct[];
}

export interface DropshippingAnalytics {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  totalOrders: number;
  averageRoas: number;
  activeStores: number;
  topProduct: string | null;
  revenueByDay: { date: string; revenue: number }[];
}
