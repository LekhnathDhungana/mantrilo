export type Usage = {
  contentRequests: number;
  audioBytes: number;
  astrologyCredits: number;
  daily: Record<string, { contentRequests: number; audioBytes: number; astrologyCredits: number }>;
  endpoints: Record<string, number>;
};
export type KeyRecord = {
  id: string;
  name: string;
  environment: 'sandbox' | 'production';
  prefix: string;
  status: string;
  createdAt: string;
  lastUsedAt: string | null;
};
export type Product = {
  id: string;
  name: string;
  type: string;
  environment: string;
  createdAt: string;
};
export type Activity = {
  id: string;
  at: string;
  type: string;
  message?: string;
  endpoint?: string;
  status: number;
  requestId?: string;
  code?: string;
  billable?: boolean;
  cost?: { contentRequests: number; audioBytes: number; astrologyCredits: number };
};
export type Workspace = {
  id: string;
  name: string;
  plan: string;
  createdAt: string;
  keys: KeyRecord[];
  products: Product[];
  logs: Activity[];
  preferences: { emailNotifications: boolean; usageAlertThreshold: number };
};
export type Plan = {
  name: string;
  price: number;
  requests: string;
  audio: string;
  catalog: string;
  products: string;
  support: string;
};
export type Addon = {
  id: string;
  name: string;
  plan: string;
  price: number;
  credits: number;
  combined: number;
};
export type Session = {
  user: { uid: string; email: string; admin: boolean };
  workspace: Workspace;
  mode: 'demo' | 'firebase';
  period: string;
  usage: Usage;
  plan: Plan;
  allowance: {
    requests: number;
    audioBytes: number;
    products: number | null;
    astrologyCredits: number;
  };
  accountingPolicy: string;
  billingPeriod: null;
  integrations: Record<string, boolean>;
};
export type AuthConfig = {
  mode: 'demo' | 'firebase';
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    appId: string;
    authEmulatorHost?: string | null;
  } | null;
  registration: false;
};
export type CatalogRecord = {
  id: string;
  type: string;
  label: string;
  language: string | null;
  source_reference: string | null;
  original_text?: string;
  transliteration?: string;
  translation?: string | null;
  meaning?: string | null;
  audio_id?: string;
  content_id?: string;
  recording_url?: string | null;
  title?: string;
  chapters?: {
    number: number;
    verses: {
      number: number;
      original_text: string;
      translation: string | null;
      source_reference: string | null;
    }[];
  }[];
  demo: boolean;
};
