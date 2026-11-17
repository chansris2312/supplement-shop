export type Category = 'ผิวพรรณ' | 'การนอนหลับ' | 'พลังงาน' | 'ภูมิคุ้มกัน' | 'กระดูกและข้อ' | 'สุขภาพทั่วไป';

export interface Product {
  productId: string;
  name: string;
  cat: Category;
  price: number;
  stock: number;
  imageUrl?: string;
}

export interface CartItem {
  productId: string;
  qty: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  qty: number;
  price: number;
}

export interface Order {
  orderId: string; // "NM-0001"
  status: 'done';
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  createdAt: string; // ISO
}

/** Questionnaire answers. No name / email / user id ever goes in here. */
export interface Answers {
  age?: string;
  weight?: string;
  height?: string;
  sleep?: string;
  sleepq?: string;
  work?: string;
  hours?: string;
  meals?: string;
  diet?: string;
  veg?: string;
  ex?: string;
  stress?: string;
  goal?: string[];
  preg?: string;
  meds?: string;
}

export interface Recommendation {
  productId: string;
  reason: string;
  howToTake: string;
}

export interface PlanResult {
  summary: string;
  recommendations: Recommendation[];
  lifestyleTips: string[];
}

export interface Plan {
  createdAt: string;
  answers: Answers;
  result: PlanResult;
  needsDoctor: boolean;
}

export type City = 'กรุงเทพมหานคร' | 'เชียงใหม่' | 'ขอนแก่น' | 'ภูเก็ต';

export interface Me {
  email?: string;
  city: City;
  weeklySignal: boolean;
  pendingConfirmation?: boolean;
}

export interface ProductQuery {
  cat?: string;
  q?: string;
  price?: string;
  sort?: string;
}

export interface NewProduct {
  productId?: string;
  name: string;
  cat: Category;
  price: number;
  stock: number;
  imageUrl?: string;
}

/** Everything the UI needs from the backend. Implemented by http.ts and mock.ts. */
export interface Api {
  listProducts(q?: ProductQuery): Promise<Product[]>;
  getProduct(id: string): Promise<Product>;
  saveProduct(p: NewProduct): Promise<Product>;
  createUpload(fileName: string, contentType: string): Promise<{ uploadUrl: string; imageUrl: string }>;
  getCart(): Promise<CartItem[]>;
  putCart(items: CartItem[]): Promise<CartItem[]>;
  createOrder(): Promise<Order>;
  listOrders(): Promise<Order[]>;
  submitQuiz(answers: Answers): Promise<Plan>;
  latestPlan(): Promise<Plan | null>;
  getMe(): Promise<Me>;
  putMe(patch: Partial<Pick<Me, 'city' | 'weeklySignal'>>): Promise<Me>;
}
