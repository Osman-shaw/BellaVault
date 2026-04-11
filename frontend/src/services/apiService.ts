import { clearSession, readSession, Session, writeSession } from "@/state/auth";
import { notifyError, notifyInfo, notifySuccess } from "@/utils/notify";

const DEFAULT_TENANT_SLUG = "default";

function withTenantSlug(body: Record<string, unknown>) {
  const tenantSlug =
    typeof body.tenantSlug === "string" && body.tenantSlug.trim().length >= 2
      ? body.tenantSlug.trim().toLowerCase()
      : DEFAULT_TENANT_SLUG;
  return JSON.stringify({ ...body, tenantSlug });
}

export type Commodity = "GOLD" | "SILVER" | "PLATINUM" | "DIAMOND";

export interface Entity {
  _id: string;
  name: string;
  phone?: string;
  notes?: string;
}

export interface Deal {
  _id: string;
  entityId: string;
  commodity: Commodity;
  quantity: number;
  spotPrice: number;
  totalValue: number;
  paidAmount: number;
  status: "OWED" | "PARTIAL" | "SETTLED";
  notes?: string;
  createdAt: string;
}

export interface CreateEntityPayload {
  name: string;
  phone?: string;
  notes?: string;
}

export interface CreateDealPayload {
  entityId: string;
  commodity: Commodity;
  quantity: number;
  spotPrice: number;
  paidAmount?: number;
  notes?: string;
}

export interface MarketItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  updatedAt: number;
}

export interface LiveMarketResponse {
  gold: MarketItem;
  /** Present when `GOLDAPI_API_KEY` is configured on the server (XAG/USD spot). */
  silver?: MarketItem;
  /** XPT/USD spot from GoldAPI when configured. */
  platinum?: MarketItem;
  /** XPD/USD spot from GoldAPI when configured. */
  palladium?: MarketItem;
  forex: MarketItem;
  sp500: MarketItem;
  nasdaq: MarketItem;
  /** `goldapi` if metals use GoldAPI; `yahoo` if gold only from Yahoo; `unavailable` on error. */
  metalsSource?: "goldapi" | "yahoo" | "unavailable";
  /** Whether server has GOLDAPI_API_KEY configured. */
  goldapiConfigured?: boolean;
}

export interface LiveMarketApiResponse {
  success: boolean;
  endpoint: string;
  requestedAt: number;
  data: LiveMarketResponse;
}

export type UpdateEntityPayload = Partial<CreateEntityPayload>;

export interface PartnerLedgerRow {
  _id: string;
  entityId: string;
  recordedAt: string;
  moneyInvested: number;
  moneyReceived: number;
  cumulativeInvested: number;
  cumulativeReceived: number;
  totalCapital: number;
  remainingBalance: number;
}

export interface CreatePartnerLedgerPayload {
  recordedAt: string;
  moneyInvested?: number;
  moneyReceived?: number;
}

export interface VaultSummary {
  balance: number;
  currency: string;
  currencyLabel: string;
}

export interface VaultMovementRow {
  id: string;
  delta: number;
  balanceAfter: number;
  kind: string;
  label: string;
  createdAt: string;
}

export type UpdateDealPayload = Partial<CreateDealPayload>;

export type PurchaseStatus = "pending" | "paid";

export interface Purchase {
  _id: string;
  purchaseDate: string;
  buyingPrice: number;
  weightCarat: number;
  clientName: string;
  clientContact: string;
  status: PurchaseStatus;
  amountReceived: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CreatePurchasePayload {
  purchaseDate: string;
  buyingPrice: number;
  weightCarat: number;
  clientName: string;
  clientContact: string;
  status?: PurchaseStatus;
  amountReceived?: number;
}

export type UpdatePurchasePayload = Partial<CreatePurchasePayload>;

export type SaleWeightUnit = "gram" | "carat";

export interface Sale {
  _id: string;
  saleDate: string;
  buyerName: string;
  buyerContact: string;
  weight: number;
  weightUnit: SaleWeightUnit;
  sellingPrice: number;
  amountReceived: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateSalePayload {
  saleDate: string;
  buyerName: string;
  buyerContact: string;
  weight: number;
  weightUnit: SaleWeightUnit;
  sellingPrice: number;
  amountReceived?: number;
}

export type UpdateSalePayload = Partial<CreateSalePayload>;

export type BorrowPaymentStatus = "pending" | "paid";

export interface Borrow {
  _id: string;
  borrowerName: string;
  borrowerContact: string;
  borrowedAt: string;
  principalAmount: number;
  amountPaid: number;
  remainingBalance: number;
  status: BorrowPaymentStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateBorrowPayload {
  borrowerName: string;
  borrowerContact: string;
  borrowedAt: string;
  principalAmount: number;
  amountPaid?: number;
}

export type UpdateBorrowPayload = Partial<{
  borrowerName: string;
  borrowerContact: string;
  borrowedAt: string;
  principalAmount: number;
  amountPaid: number;
  additionalPayment: number;
}>;

export interface ReportBucketPurchase {
  period: string;
  transactionCount: number;
  totalAmountReceived: number;
  totalBuyingPrice: number;
  totalWeightCarat: number;
}

export interface ReportBucketSale {
  period: string;
  transactionCount: number;
  totalAmountReceived: number;
  totalSellingPrice: number;
  totalWeightGram: number;
  totalWeightCarat: number;
}

export interface PeakLowMetric {
  period: string;
  transactionCount: number;
  value: number;
}

export interface PeakLowBlock {
  peak: PeakLowMetric | null;
  low: PeakLowMetric | null;
  basis: string;
}

export interface PurchasePeakLowNested {
  daily: { byAmountReceived: PeakLowBlock; byTransactionCount: PeakLowBlock };
  weekly: { byAmountReceived: PeakLowBlock; byTransactionCount: PeakLowBlock };
  monthly: { byAmountReceived: PeakLowBlock; byTransactionCount: PeakLowBlock };
}

export interface ReportsOverview {
  range: { from: string; to: string };
  purchases: {
    daily: ReportBucketPurchase[];
    weekly: ReportBucketPurchase[];
    monthly: ReportBucketPurchase[];
    peakLow: PurchasePeakLowNested;
  };
  sales: {
    daily: ReportBucketSale[];
    weekly: ReportBucketSale[];
    monthly: ReportBucketSale[];
    peakLow: PurchasePeakLowNested;
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

let refreshPromise: Promise<Session | null> | null = null;

function buildHeaders(session: Session | null, options?: RequestInit): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
    ...(session?.user?.role ? { "x-user-role": session.user.role } : {}),
    ...(options?.headers || {}),
  };
}

async function tryRefreshSession(): Promise<Session | null> {
  const current = readSession();
  if (!current?.refreshToken) return null;

  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken: current.refreshToken }),
      cache: "no-store",
    });

    if (!response.ok) {
      clearSession();
      notifyInfo("Session expired. Please login again.");
      return null;
    }

    const nextSession = (await response.json()) as Session;
    writeSession(nextSession);
    notifySuccess("Your secure session is active again — pick up right where you left off.", "Still signed in ✓");
    return nextSession;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function request<T>(path: string, options?: RequestInit, retryOn401 = true): Promise<T> {
  const session = readSession();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: buildHeaders(session, options),
    cache: "no-store",
  });

  const isAuthPath = path.startsWith("/auth/");
  if (response.status === 401 && retryOn401 && !isAuthPath && session?.refreshToken) {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      return request<T>(path, options, false);
    }
  }

  if (!response.ok) {
    const text = await response.text();
    let message = text || "Request failed";
    try {
      const parsed = JSON.parse(text) as { message?: string; errors?: { message?: string }[] };
      if (typeof parsed.message === "string") message = parsed.message;
      else if (parsed.errors?.[0]?.message) message = parsed.errors[0].message;
    } catch {
      /* plain text body */
    }
    if (response.status >= 500) {
      notifyError("Server issue detected. Please retry.");
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: "admin" | "secretary" | "associate_director";
    emailVerified: boolean;
    tenantId: string;
    tenantSlug?: string;
    tenantName?: string;
    phoneMasked?: string;
  };
};

export type PhoneOtpHintResponse = {
  message: string;
  carrier?: string;
  devOtp?: string;
};

export const apiService = {
  getVault: () => request<VaultSummary>("/vault"),
  getVaultMovements: (limit = 50) => request<VaultMovementRow[]>(`/vault/movements?limit=${limit}`),
  vaultDeposit: (payload: { amount: number; note?: string }) =>
    request<{ balance: number; message: string }>("/vault/deposit", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getDeals: () => request<Deal[]>("/deals"),
  createDeal: (payload: CreateDealPayload) =>
    request<Deal>("/deals", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateDeal: (id: string, payload: UpdateDealPayload) =>
    request<Deal>(`/deals/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteDeal: (id: string) =>
    request<void>(`/deals/${id}`, {
      method: "DELETE",
    }),
  getEntities: () => request<Entity[]>("/entities"),
  createEntity: (payload: CreateEntityPayload) =>
    request<Entity>("/entities", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateEntity: (id: string, payload: UpdateEntityPayload) =>
    request<Entity>(`/entities/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteEntity: (id: string) =>
    request<void>(`/entities/${id}`, {
      method: "DELETE",
    }),
  getPartnerLedger: (entityId: string) => request<PartnerLedgerRow[]>(`/entities/${entityId}/ledger`),
  createPartnerLedgerEntry: (entityId: string, payload: CreatePartnerLedgerPayload) =>
    request<{ _id: string; entityId: string; recordedAt: string; moneyInvested: number; moneyReceived: number }>(
      `/entities/${entityId}/ledger`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    ),
  deletePartnerLedgerEntry: (entityId: string, entryId: string) =>
    request<void>(`/entities/${entityId}/ledger/${entryId}`, {
      method: "DELETE",
    }),
  getPurchases: () => request<Purchase[]>("/purchases"),
  createPurchase: (payload: CreatePurchasePayload) =>
    request<Purchase>("/purchases", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updatePurchase: (id: string, payload: UpdatePurchasePayload) =>
    request<Purchase>(`/purchases/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deletePurchase: (id: string) =>
    request<void>(`/purchases/${id}`, {
      method: "DELETE",
    }),
  getSales: () => request<Sale[]>("/sales"),
  createSale: (payload: CreateSalePayload) =>
    request<Sale>("/sales", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateSale: (id: string, payload: UpdateSalePayload) =>
    request<Sale>(`/sales/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteSale: (id: string) =>
    request<void>(`/sales/${id}`, {
      method: "DELETE",
    }),
  getBorrows: () => request<Borrow[]>("/borrows"),
  createBorrow: (payload: CreateBorrowPayload) =>
    request<Borrow>("/borrows", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateBorrow: (id: string, payload: UpdateBorrowPayload) =>
    request<Borrow>(`/borrows/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteBorrow: (id: string) =>
    request<void>(`/borrows/${id}`, {
      method: "DELETE",
    }),
  getReportsOverview: (params?: { from?: string; to?: string }) => {
    const q = new URLSearchParams();
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    const suffix = q.toString() ? `?${q.toString()}` : "";
    return request<ReportsOverview>(`/reports/overview${suffix}`);
  },
  getDashboard: () => request<{ totalValue: number; totalPaid: number; balanceDue: number; deals: number }>("/dashboard"),
  getLiveMarket: () => request<LiveMarketApiResponse>("/market/live"),
  login: (payload: { email: string; password: string; tenantSlug?: string }) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: withTenantSlug(payload),
    }),
  register: (payload: {
    fullName: string;
    email: string;
    password: string;
    role: "admin" | "secretary" | "associate_director";
    tenantSlug?: string;
  }) =>
    request<{ message: string; verificationToken: string; user: AuthResponse["user"] }>("/auth/register", {
      method: "POST",
      body: withTenantSlug(payload),
    }),
  verifyEmail: (payload: { email: string; token: string; tenantSlug?: string }) =>
    request<{ message: string }>("/auth/verify-email", {
      method: "POST",
      body: withTenantSlug(payload),
    }),
  phoneRegisterRequest: (payload: { fullName: string; phone: string; role: "admin" | "secretary" | "associate_director" }) =>
    request<PhoneOtpHintResponse>("/auth/phone/register/request", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  phoneRegisterVerify: (payload: { phone: string; code: string }) =>
    request<AuthResponse>("/auth/phone/register/verify", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  phoneLoginRequest: (payload: { phone: string }) =>
    request<PhoneOtpHintResponse>("/auth/phone/login/request", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  phoneLoginVerify: (payload: { phone: string; code: string }) =>
    request<AuthResponse>("/auth/phone/login/verify", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  refresh: (refreshToken: string) =>
    request<AuthResponse>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),
  logout: (refreshToken: string) =>
    request<void>("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),
};
