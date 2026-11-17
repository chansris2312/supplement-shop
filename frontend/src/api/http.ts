import { fetchAuthSession } from 'aws-amplify/auth';
import { config } from '../config';
import type { Api, Answers, CartItem, Me, NewProduct, Order, Plan, Product, ProductQuery } from './types';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Cognito ID token (contains email + cognito:groups), or undefined when signed out. */
async function idToken(): Promise<string | undefined> {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString();
  } catch {
    return undefined;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const token = await idToken();
  if (token) headers.Authorization = token;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(config.apiUrl + '/api' + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data?.message ?? res.statusText);
  return data as T;
}

const qs = (q: ProductQuery = {}) => {
  const p = new URLSearchParams(Object.entries(q).filter(([, v]) => v) as [string, string][]);
  const s = p.toString();
  return s ? '?' + s : '';
};

export const httpApi: Api = {
  listProducts: async (q) => (await request<{ items: Product[] }>('GET', '/products' + qs(q))).items,
  getProduct: (id) => request<Product>('GET', '/products/' + encodeURIComponent(id)),
  saveProduct: (p: NewProduct) => request<Product>('POST', '/products', p),
  createUpload: (fileName, contentType) => request('POST', '/uploads', { fileName, contentType }),
  getCart: async () => (await request<{ items: CartItem[] }>('GET', '/cart')).items,
  putCart: async (items) => (await request<{ items: CartItem[] }>('PUT', '/cart', { items })).items,
  createOrder: () => request<Order>('POST', '/orders'),
  listOrders: async () => (await request<{ items: Order[] }>('GET', '/orders')).items,
  submitQuiz: (answers: Answers) => request<Plan>('POST', '/quiz', { answers }),
  latestPlan: async () => (await request<{ plan: Plan | null }>('GET', '/plans/latest')).plan,
  getMe: () => request<Me>('GET', '/me'),
  putMe: (patch) => request<Me>('PUT', '/me', patch),
};
