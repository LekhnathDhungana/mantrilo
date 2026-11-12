export type Usage = {
  contentRequests: number;
  audioBytes: number;
  daily: Record<string, { contentRequests: number; audioBytes: number }>;
  endpoints: Record<string, number>;
};
export type KeyRecord = {
  id: string;
  name: string;
  // Missing on keys made before environments were recorded; see keyEnvironment.
  environment?: 'sandbox' | 'production';
  // Only on the workspace's own keys, which the console shows. Older keys keep just a prefix.
  secret?: string;
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
  // Which Stripe mode this console sells and reads plans from. 'test' is local development.
  billingMode: 'live' | 'test';
  period: string;
  // The lane the plan is about: the live lane once paid, sandbox before that.
  usage: Usage;
  usageLane: 'sandbox' | 'live' | 'live-test';
  // Sandbox and live keys are metered separately; live appears once the plan is paid.
  usageByLane: { sandbox: Usage; live?: Usage };
  plan: Plan;
  allowance: {
    requests: number;
    audioBytes: number;
    products: number | null;
  };
  // When the monthly allowance resets (the 1st of next month, UTC).
  resetsAt: string;
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
