import { Order, OrderItem, SalesRecord } from '../types';

const VALID_STATUSES: ReadonlyArray<Order['status']> = [
  'Processing',
  'Shipped',
  'In Transit',
  'Delivered',
  'Cancelled',
  'Returned'
];

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Normalizes raw JSON into a consistent shape before validation.
 */
function normalizeOrder(raw: any): any {
  return {
    ...raw,
    id: String(raw.id ?? ''), // force string
    customerName: String(raw.customerName ?? ''),
    status: typeof raw.status === 'string' ? raw.status.trim() : '',
    orderDate: typeof raw.orderDate === 'string'
      ? raw.orderDate.substring(0, 10) // YYYY-MM-DD only
      : '',
    estimatedDelivery: typeof raw.estimatedDelivery === 'string'
      ? raw.estimatedDelivery.substring(0, 10)
      : '',
    totalOrderValue: Number(raw.totalOrderValue) || 0,
    returnPolicy: String(raw.returnPolicy ?? ''),
    items: Array.isArray(raw.items)
      ? raw.items.map((it: any) => ({
          ...it,
          name: String(it?.name ?? ''),
          category: String(it?.category ?? ''),
          unitPrice: Number(it?.unitPrice) || 0,
          quantity: Number(it?.quantity) || 0,
          total: Number(it?.total) || 0,
        }))
      : []
  };
}

/**
 * Validates if an object conforms to the OrderItem interface.
 */
function validateOrderItem(obj: unknown): ValidationResult {
  const errors: string[] = [];
  if (!obj || typeof obj !== 'object') {
    return { isValid: false, errors: ['Item is not an object.'] };
  }
  const item = obj as Record<string, unknown>;
  if (typeof item.name !== 'string' || !item.name)
    errors.push('Item "name" is missing or not a string.');
  if (typeof item.category !== 'string' || !item.category)
    errors.push('Item "category" is missing or not a string.');
  if (typeof item.unitPrice !== 'number')
    errors.push('Item "unitPrice" is missing or not a number.');
  if (typeof item.quantity !== 'number')
    errors.push('Item "quantity" is missing or not a number.');
  if (typeof item.total !== 'number')
    errors.push('Item "total" is missing or not a number.');
  return { isValid: errors.length === 0, errors };
}

/**
 * Validates if an object conforms to the Order interface.
 */
function validateOrder(obj: unknown): ValidationResult {
  const errors: string[] = [];
  if (!obj || typeof obj !== 'object') {
    return { isValid: false, errors: ['Order is not an object.'] };
  }

  const order = obj as Record<string, unknown>;

  if (typeof order.id !== 'string' || !order.id)
    errors.push('Field "id" is missing or not a string.');
  if (typeof order.customerName !== 'string' || !order.customerName)
    errors.push('Field "customerName" is missing or not a string.');
  if (
    typeof order.orderDate !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(order.orderDate)
  )
    errors.push('Field "orderDate" is missing or not in YYYY-MM-DD format.');
  if (typeof order.status !== 'string') {
    errors.push('Field "status" is missing or not a string.');
  } else if (!VALID_STATUSES.includes(order.status as any)) {
    errors.push(`Field "status" has an invalid value: "${order.status}".`);
  }
  if (!Array.isArray(order.items) || order.items.length === 0) {
    errors.push('Field "items" is missing, not an array, or empty.');
  } else {
    order.items.forEach((item, index) => {
      const itemResult = validateOrderItem(item);
      if (!itemResult.isValid) {
        errors.push(
          `Item at index ${index} is invalid: ${itemResult.errors.join(', ')}`
        );
      }
    });
  }
  if (
    typeof order.estimatedDelivery !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(order.estimatedDelivery)
  )
    errors.push(
      'Field "estimatedDelivery" is missing or not in YYYY-MM-DD format.'
    );
  if (typeof order.totalOrderValue !== 'number')
    errors.push('Field "totalOrderValue" is missing or not a number.');
  if (typeof order.returnPolicy !== 'string' || !order.returnPolicy)
    errors.push('Field "returnPolicy" is missing or not a string.');

  return { isValid: errors.length === 0, errors };
}

/**
 * Fetches, parses, normalizes, and validates order data from a given URL.
 */
export async function fetchDataFromUrl(url: string): Promise<Order[]> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error(
      'Network request failed. Please check your internet connection.'
    );
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch data: ${response.status} ${response.statusText}. Please check the URL and network permissions (CORS).`
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error('Failed to parse JSON. The data from the URL is not valid JSON.');
  }

  if (!Array.isArray(data)) {
    throw new Error(
      'Fetched data is not an array. The JSON file must contain an array of order objects.'
    );
  }

  const validOrders: Order[] = [];
  const validationErrors: { itemIndex: number; errors: string[] }[] = [];

  data.forEach((raw, index) => {
    const normalized = normalizeOrder(raw);
    const result = validateOrder(normalized);
    if (result.isValid) {
      validOrders.push(normalized as Order);
    } else {
      if (validationErrors.length < 10) {
        validationErrors.push({ itemIndex: index, errors: result.errors });
      }
    }
  });

  if (validationErrors.length > 0) {
    console.warn(
      `Data validation finished with some issues. ${validationErrors.length} out of ${data.length} records were invalid.`
    );
    console.warn('Details of invalid records:', validationErrors);
  }

  if (validOrders.length === 0 && data.length > 0) {
    throw new Error(
      'Fetched data, but no valid order objects were found. Please check the structure of the objects in the JSON file. See console for detailed validation errors.'
    );
  }

  return validOrders;
}

/**
 * Processes a list of orders into aggregated monthly sales data for forecasting.
 */
export function processOrdersToSalesData(orders: Order[]): SalesRecord[] {
  const salesMap: { [key: string]: { unitsSold: number; prices: number[] } } = {};

  orders.forEach(order => {
    if (order.status === 'Delivered' || order.status === 'Shipped') {
      const month = order.orderDate.substring(0, 7); // YYYY-MM
      order.items.forEach(item => {
        const key = `${item.name}|${month}`;
        if (!salesMap[key]) {
          salesMap[key] = { unitsSold: 0, prices: [] };
        }
        salesMap[key].unitsSold += item.quantity;
        salesMap[key].prices.push(item.unitPrice);
      });
    }
  });

  return Object.entries(salesMap).map(([key, value]) => {
    const [productName, month] = key.split('|');
    const averagePrice =
      value.prices.reduce((a, b) => a + b, 0) / value.prices.length;
    return {
      productName,
      month,
      unitsSold: value.unitsSold,
      price: parseFloat(averagePrice.toFixed(2)),
    };
  });
}
