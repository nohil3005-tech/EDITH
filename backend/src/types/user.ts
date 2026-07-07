export interface User {
  id: string;
  email: string;
  supabaseId: string | null;
  profile: UserProfile;
  preferences: UserPreferences;
  paymentSettings: PaymentSettings;
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  name: string;
  bio: string | null;
  avatar: string | null;
  timezone: string;
  website: string | null;
  skills: string[];
  hourlyRate: number | null;
  portfolio: string[];
}

export interface UserPreferences {
  language: string;
  currency: string;
  theme: 'dark' | 'light' | 'system';
  notifications: NotificationPreferences;
  aiDefaults: AiDefaults;
}

export interface NotificationPreferences {
  email: boolean;
  newJobs: boolean;
  proposalAccepted: boolean;
  paymentReceived: boolean;
  adPerformance: boolean;
}

export interface AiDefaults {
  model: string;
  proposalTone: 'professional' | 'friendly' | 'direct';
  autoSendProposals: boolean;
  autoExecute: boolean;
  budgetThreshold: number;
}

export interface PaymentSettings {
  stripeEnabled: boolean;
  razorpayEnabled: boolean;
  paymentLink: string | null;
  defaultCurrency: string;
  taxRate: number;
  bankAccount: BankAccount | null;
  invoiceSettings: InvoiceSettings;
}

export interface BankAccount {
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  accountHolder: string;
}

export interface InvoiceSettings {
  companyName: string;
  address: string;
  logo: string | null;
  defaultDueDays: number;
  termsAndConditions: string;
  footer: string | null;
}

export interface ActivityLog {
  id: string;
  userId: string;
  type: string;
  description: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}
