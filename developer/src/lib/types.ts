export type Usage = {
  contentRequests: number;
  audioBytes: number;
  daily: Record<string, { contentRequests: number; audioBytes: number }>;
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
  cost?: { contentRequests: number; audioBytes: number };
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
  billing?: {
    customerId?: string;
    subscriptionId?: string;
    status?: string;
    currentPeriodEnd?: string | null;
    cancelsAt?: string | null;
  };
};
export type Plan = {
  name: string;
  price: number;
  requests: string;
  audio: string;
  catalog: string;
  astrology: string;
  products: string;
  support: string;
};
export type Session = {
  user: {
    uid: string;
    email: string;
    admin: boolean;
    verified: boolean;
    name: string;
    onboarded: boolean;
  };
  workspace: Workspace;
  mode: 'demo' | 'firebase';
  period: string;
  usage: Usage;
  plan: Plan;
  allowance: {
    requests: number;
    audioBytes: number;
    products: number | null;
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
  apiUrl: string | null;
  registration: boolean;
  emailCodes: boolean;
  phoneCodes: boolean;
};
