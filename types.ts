export enum AppView {
  CHATBOT = 'CHATBOT',
  FORECASTER = 'FORECASTER',
  TEAM = 'TEAM',
}

export enum ForecastingModel {
  SES = 'Simple Exponential Smoothing',
  HOLT = "Holt's Method (Trend Corrected)",
  HOLT_WINTERS = "Holt-Winters (Trend & Seasonality)",
}

export interface OrderItem {
  name: string;
  category: string;
  unitPrice: number;
  quantity: number;
  total: number;
}

export interface Order {
  id: string;
  customerName: string;
  orderDate: string; // ISO 8601 format: "YYYY-MM-DD"
  status: 'Processing' | 'Shipped' | 'In Transit' | 'Delivered' | 'Cancelled' | 'Returned';
  items: OrderItem[];
  estimatedDelivery: string;
  totalOrderValue: number;
  returnPolicy: string;
}

export interface ChatMessage {
  id: number;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
}

export interface SalesRecord {
  productName: string;
  month: string; // "YYYY-MM" format
  unitsSold: number;
  price: number; // Price for that month
}

export interface ForecastResult {
  productName: string;
  demandForecast: number;
  reasoning: string;
  pricingStrategy: string;
  marketingSuggestion: string;
  inventorySuggestion: string;
}
