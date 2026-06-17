import axios, { AxiosError } from 'axios';
import { config } from '../config/env';
import { McpParameterValidationError } from '../errors/McpParameterValidationError';
import { BitrefillApiError } from '../errors/BitrefillApiError';
import { validateMcpToolArguments } from '../schemas/mcp.schemas';

export interface ProductPackage {
  id: string;
  value: number;
  currency: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  country: string;
  category: string;
  image: string;
  packages: ProductPackage[];
}

export interface Invoice {
  id: string;
  paymentUri: string;
  invoiceString: string;
  btcAmount: number;
  usdAmount: number;
  productId: string;
  packageName: string;
  expirationTime: string;
  status?: string;
  paymentMethod?: string;
  redemptionCode?: string;
}

interface V2Package {
  id: string;
  value: string | number;
  price?: number;
  amount?: number;
}

interface V2Product {
  id: string;
  name: string;
  description?: string;
  country_code?: string;
  currency?: string;
  image?: string;
  categories?: string[];
  packages?: V2Package[] | V2Package;
  range?: { min: number; max: number; step: number };
}

interface V2Invoice {
  id: string;
  status: string;
  created_time?: string;
  completed_time?: string;
  payment?: {
    method?: string;
    address?: string;
    currency?: string;
    price?: number;
    amount?: number;
    status?: string;
  };
  orders?: Array<{
    id: string;
    status?: string;
    product?: { name?: string; value?: string | number; currency?: string };
    redemption_info?: { code?: string; link?: string; instructions?: string };
  }>;
}

// High-fidelity Mock Catalog Database
const MOCK_PRODUCTS: Product[] = [
  {
    id: 'esim-germany',
    name: 'Germany eSIM',
    description: 'Prepaid mobile data eSIM for Germany. High-speed 4G/5G LTE data on major networks.',
    country: 'DE',
    category: 'eSIM',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80',
    packages: [
      { id: 'esim-de-1gb', value: 5.0, currency: 'EUR' },
      { id: 'esim-de-3gb', value: 10.0, currency: 'EUR' },
      { id: 'esim-de-5gb', value: 15.0, currency: 'EUR' },
      { id: 'esim-de-10gb', value: 25.0, currency: 'EUR' },
    ],
  },
  {
    id: 'uber-germany',
    name: 'Uber Germany Gift Card',
    description: 'Get a reliable ride in minutes or order food with Uber Eats in German cities.',
    country: 'DE',
    category: 'Transportation',
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600&auto=format&fit=crop&q=80',
    packages: [
      { id: 'uber-de-15', value: 15.0, currency: 'EUR' },
      { id: 'uber-de-25', value: 25.0, currency: 'EUR' },
      { id: 'uber-de-50', value: 50.0, currency: 'EUR' },
      { id: 'uber-de-100', value: 100.0, currency: 'EUR' },
    ],
  },
  {
    id: 'airbnb-germany',
    name: 'Airbnb Germany Gift Card',
    description: 'Book unique accommodations, cabins, beach houses, and experiences in Germany.',
    country: 'DE',
    category: 'Travel',
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&auto=format&fit=crop&q=80',
    packages: [
      { id: 'airbnb-de-25', value: 25.0, currency: 'EUR' },
      { id: 'airbnb-de-50', value: 50.0, currency: 'EUR' },
      { id: 'airbnb-de-100', value: 100.0, currency: 'EUR' },
      { id: 'airbnb-de-250', value: 250.0, currency: 'EUR' },
    ],
  },
  {
    id: 'esim-france',
    name: 'France eSIM',
    description: 'Prepaid mobile data eSIM for France. 5G/4G connectivity for tourists.',
    country: 'FR',
    category: 'eSIM',
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&auto=format&fit=crop&q=80',
    packages: [
      { id: 'esim-fr-1gb', value: 6.0, currency: 'EUR' },
      { id: 'esim-fr-3gb', value: 12.0, currency: 'EUR' },
      { id: 'esim-fr-5gb', value: 18.0, currency: 'EUR' },
    ],
  },
  {
    id: 'uber-france',
    name: 'Uber France Gift Card',
    description: 'Pay for Uber rides and Uber Eats orders across France.',
    country: 'FR',
    category: 'Transportation',
    image: 'https://images.unsplash.com/photo-1494783367193-149034c05e8f?w=600&auto=format&fit=crop&q=80',
    packages: [
      { id: 'uber-fr-25', value: 25.0, currency: 'EUR' },
      { id: 'uber-fr-50', value: 50.0, currency: 'EUR' },
    ],
  },
];

export class McpService {
  private isMockMode: boolean;

  constructor() {
    this.isMockMode = config.bitrefillApiKey === 'mock';
    console.log(
      `[McpService] Initialized in ${this.isMockMode ? 'Mock' : 'Live'} mode (payment: ${config.bitrefillPaymentMethod}, balance: ${config.bitrefillBalanceCurrency})`,
    );
  }

  private get v2Headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${config.bitrefillApiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private assertValidMcpArgs(toolName: string, args: Record<string, unknown>): void {
    const validation = validateMcpToolArguments(toolName, args);
    if (!validation.success) {
      console.error(
        `[McpService] MCP parameter validation failed for tool "${toolName}" on fields: ${validation.fieldSummary}`,
      );
      throw new McpParameterValidationError('Invalid MCP tool arguments');
    }
  }

  private normalizePackages(raw: V2Product): ProductPackage[] {
    const currency = raw.currency || 'USD';
    const rawPackages = raw.packages
      ? Array.isArray(raw.packages)
        ? raw.packages
        : [raw.packages]
      : [];

    if (rawPackages.length > 0) {
      return rawPackages.map((pkg) => ({
        id: pkg.id,
        value:
          pkg.amount ??
          (typeof pkg.value === 'number' ? pkg.value : Number(pkg.value) || 0),
        currency,
      }));
    }

    if (raw.range) {
      return [
        {
          id: String(raw.range.min),
          value: raw.range.min,
          currency,
        },
      ];
    }

    return [];
  }

  private resolveProductImage(image?: string): string {
    if (!image) {
      return '';
    }
    if (image.startsWith('http://') || image.startsWith('https://')) {
      return image;
    }
    return `https://res.cloudinary.com/bitrefill/image/upload/f_auto,q_auto/${image}`;
  }

  private truncateDescription(text: string, maxLen = 120): string {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= maxLen) {
      return cleaned;
    }
    return `${cleaned.slice(0, maxLen).trimEnd()}…`;
  }

  private mapV2Product(raw: V2Product): Product {
    const packages = this.normalizePackages(raw);
    const description = raw.description || raw.name;
    return {
      id: raw.id,
      name: raw.name,
      description: this.truncateDescription(description),
      country: (raw.country_code || 'US').toUpperCase(),
      category: raw.categories?.[0] || 'Gift Card',
      image: this.resolveProductImage(raw.image),
      packages,
    };
  }

  private mapV2Invoice(
    invoice: V2Invoice,
    productId: string,
    packageName: string,
    packageValue: number,
  ): Invoice {
    const order = invoice.orders?.[0];
    const redemptionCode = order?.redemption_info?.code || order?.redemption_info?.link;
    const paymentMethod = invoice.payment?.method || config.bitrefillPaymentMethod;
    const usdAmount = invoice.payment?.price ?? packageValue;
    const address = invoice.payment?.address;
    const btcFromApi = invoice.payment?.amount;
    const btcAmount =
      paymentMethod === 'bitcoin' && typeof btcFromApi === 'number'
        ? btcFromApi
        : paymentMethod === 'bitcoin' && address
          ? usdAmount / 65000
          : 0;

    let paymentUri = '';
    if (paymentMethod === 'bitcoin' && address) {
      paymentUri = `bitcoin:${address}?amount=${btcAmount.toFixed(8)}`;
    } else if (order?.redemption_info?.link) {
      paymentUri = order.redemption_info.link;
    }

    return {
      id: invoice.id,
      paymentUri,
      invoiceString: redemptionCode ? '[REDACTED]' : '',
      btcAmount: parseFloat(btcAmount.toFixed(8)),
      usdAmount,
      productId,
      packageName,
      expirationTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      status: invoice.status,
      paymentMethod,
      redemptionCode: redemptionCode || undefined,
    };
  }

  private async liveSearchProducts(query: string, country: string): Promise<Product[]> {
    const normCountry = country.toUpperCase();
    const params: Record<string, string | number | boolean> = {
      limit: 20,
      include_test_products: config.bitrefillIncludeTestProducts,
    };

    const trimmedQuery = query.trim();
    const endpoint = trimmedQuery
      ? `${config.bitrefillApiV2Url}/products/search`
      : `${config.bitrefillApiV2Url}/products`;

    if (trimmedQuery) {
      params.q = trimmedQuery;
    }

    if (normCountry) {
      params.country = normCountry;
    }

    const response = await axios.get<{ data: V2Product[] }>(endpoint, {
      headers: this.v2Headers,
      params,
      timeout: 12000,
    });

    return (response.data.data || []).map((product) => this.mapV2Product(product));
  }

  private async liveGetProductDetails(productId: string): Promise<Product> {
    const response = await axios.get<{ data: V2Product }>(
      `${config.bitrefillApiV2Url}/products/${encodeURIComponent(productId)}`,
      { headers: this.v2Headers, timeout: 12000 },
    );
    return this.mapV2Product(response.data.data);
  }

  private buildInvoiceProductPayload(
    productId: string,
    packageId: string,
  ): Record<string, string | number> {
    if (packageId.includes('<&>')) {
      return { product_id: productId, package_id: packageId, quantity: 1 };
    }

    const numericValue = Number(packageId);
    if (!Number.isNaN(numericValue)) {
      return { product_id: productId, value: numericValue, quantity: 1 };
    }

    return { product_id: productId, package_id: packageId, quantity: 1 };
  }

  private async fetchInvoiceById(invoiceId: string): Promise<V2Invoice> {
    const response = await axios.get<{ data: V2Invoice }>(
      `${config.bitrefillApiV2Url}/invoices/${encodeURIComponent(invoiceId)}`,
      { headers: this.v2Headers, timeout: 12000 },
    );
    return response.data.data;
  }

  private async waitForBalanceInvoice(invoiceId: string): Promise<V2Invoice> {
    const settled = new Set(['complete', 'payment_confirmed', 'not_delivered']);
    let latest = await this.fetchInvoiceById(invoiceId);

    for (let attempt = 0; attempt < 8; attempt += 1) {
      if (latest.orders?.[0]?.redemption_info?.code || latest.orders?.[0]?.redemption_info?.link) {
        return latest;
      }
      if (settled.has(latest.status) && latest.payment?.status === 'paid') {
        return latest;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
      latest = await this.fetchInvoiceById(invoiceId);
    }

    return latest;
  }

  private async liveBuyProducts(
    productId: string,
    packageId: string,
    paymentMethod: 'balance' | 'bitcoin',
  ): Promise<Invoice> {
    const product = await this.liveGetProductDetails(productId);
    const selectedPackage =
      product.packages.find((pkg) => pkg.id === packageId) || product.packages[0];

    if (!selectedPackage) {
      throw new Error(`No package found for product ${productId}`);
    }

    const invoiceBody: Record<string, unknown> = {
      products: [this.buildInvoiceProductPayload(productId, packageId)],
      payment_method: paymentMethod,
      auto_pay: paymentMethod === 'balance',
    };

    if (paymentMethod === 'balance') {
      invoiceBody.balance_currency = config.bitrefillBalanceCurrency;
    }

    const response = await axios.post<{ data: V2Invoice }>(
      `${config.bitrefillApiV2Url}/invoices`,
      invoiceBody,
      { headers: this.v2Headers, timeout: 20000 },
    );

    let invoice = response.data.data;
    if (paymentMethod === 'balance') {
      invoice = await this.waitForBalanceInvoice(invoice.id);
    }
    const packageName = `${product.name} - ${selectedPackage.value} ${selectedPackage.currency}`;

    return this.mapV2Invoice(invoice, productId, packageName, selectedPackage.value);
  }

  private handleLiveError(toolName: string, error: unknown): never {
    if (error instanceof AxiosError) {
      const apiMessage =
        typeof error.response?.data === 'object' &&
        error.response?.data !== null &&
        'message' in error.response.data
          ? String((error.response.data as { message: string }).message)
          : error.message;

      console.error(`[McpService] Live ${toolName} failed: ${apiMessage}`);

      if (/balance too low/i.test(apiMessage)) {
        throw new BitrefillApiError(
          'API developer balance is empty. Your Bitrefill website wallet ($23) is separate — ' +
            'fund the developer API balance at bitrefill.com/account/developers (not your personal cart wallet).',
          402,
        );
      }

      const status = error.response?.status;
      const statusCode =
        status && status >= 400 && status < 500 ? status : 502;

      throw new BitrefillApiError(apiMessage, statusCode);
    }

    console.error(`[McpService] Live ${toolName} failed: ${(error as Error).message}`);
    throw error;
  }

  /**
   * Developer account balance for the API key (EUR / USD / XBT sub-accounts).
   */
  public async getAccountBalance(): Promise<{
    amount: number;
    currency: string;
    configuredCurrency: string;
    isEmpty: boolean;
  }> {
    if (this.isMockMode) {
      return {
        amount: 0,
        currency: config.bitrefillBalanceCurrency,
        configuredCurrency: config.bitrefillBalanceCurrency,
        isEmpty: true,
      };
    }

    try {
      const response = await axios.get<{
        data: { balance: number; currency: string };
      }>(`${config.bitrefillApiV2Url}/accounts/balance`, {
        headers: this.v2Headers,
        timeout: 12000,
      });

      const amount = response.data.data.balance;
      const currency = response.data.data.currency;

      return {
        amount,
        currency,
        configuredCurrency: config.bitrefillBalanceCurrency,
        isEmpty: amount <= 0,
      };
    } catch (error) {
      return this.handleLiveError('get-account-balance', error);
    }
  }

  public isTestProduct(productId: string): boolean {
    return productId.startsWith('test-');
  }

  /**
   * search-products tool — live catalog via Bitrefill API v2 (same backend as hosted MCP).
   */
  public async searchProducts(query: string, country: string): Promise<Product[]> {
    const args = {
      query,
      country: country ? country.toUpperCase() : '',
    };
    this.assertValidMcpArgs('search-products', args);

    if (this.isMockMode) {
      return this.mockSearchProducts(query, country);
    }

    try {
      return await this.liveSearchProducts(query, country);
    } catch (error) {
      return this.handleLiveError('search-products', error);
    }
  }

  /**
   * get-product-details tool — live catalog via Bitrefill API v2.
   */
  public async getProductDetails(productId: string): Promise<Product> {
    const args = { product_id: productId };
    this.assertValidMcpArgs('get-product-details', args);

    if (this.isMockMode) {
      return this.mockGetProductDetails(productId);
    }

    try {
      return await this.liveGetProductDetails(productId);
    } catch (error) {
      return this.handleLiveError('get-product-details', error);
    }
  }

  /**
   * buy-products tool — live checkout via Bitrefill API v2 (developer balance or bitcoin).
   */
  public async buyProducts(
    productId: string,
    packageId: string,
    paymentMethod: 'balance' | 'bitcoin' = config.bitrefillPaymentMethod,
  ): Promise<Invoice> {
    if (!config.bitrefillEnablePayment) {
      throw new Error('Payment is disabled via BITREFILL_ENABLE_PAYMENT=false');
    }

    const args = {
      product_id: productId,
      package_id: packageId,
      payment_method: paymentMethod,
    };
    this.assertValidMcpArgs('buy-products', args);

    if (this.isMockMode) {
      return this.mockBuyProducts(productId, packageId, paymentMethod);
    }

    try {
      return await this.liveBuyProducts(productId, packageId, paymentMethod);
    } catch (error) {
      return this.handleLiveError('buy-products', error);
    }
  }

  // --- MOCK IMPLEMENTATIONS ---

  private mockSearchProducts(query: string, country: string): Product[] {
    const normQuery = query.toLowerCase();
    const normCountry = country.toUpperCase();

    return MOCK_PRODUCTS.filter((p) => {
      const countryMatch = p.country === normCountry;
      const queryMatch =
        normQuery === '' ||
        p.name.toLowerCase().includes(normQuery) ||
        p.description.toLowerCase().includes(normQuery) ||
        p.category.toLowerCase().includes(normQuery);
      return countryMatch && queryMatch;
    });
  }

  private mockGetProductDetails(productId: string): Product {
    const product = MOCK_PRODUCTS.find((p) => p.id === productId);
    if (!product) {
      throw new Error(`Product not found with id ${productId}`);
    }
    return product;
  }

  private mockBuyProducts(
    productId: string,
    packageId: string,
    paymentMethod: string,
  ): Invoice {
    const product = this.mockGetProductDetails(productId);
    const pkg = product.packages.find((p) => p.id === packageId);

    if (!pkg) {
      throw new Error(`Package not found: ${packageId} on product: ${productId}`);
    }

    const orderId = `usc-tx-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
    const btcExchangeRate = 65000;
    const usdValue = pkg.value;
    const btcAmount = parseFloat((usdValue / btcExchangeRate).toFixed(8));
    const dummyBtcAddress = 'tb1q3k4s5h9yuxmvlwt22t8h9mqlsqz9h62xwnzfln';
    const paymentUri = `bitcoin:${dummyBtcAddress}?amount=${btcAmount}&label=USC%20Checkout&message=Order%20${orderId}`;
    const invoiceString = `lnbc${Math.floor(btcAmount * 1e8)}n1p3x${Math.random().toString(16).substring(2, 24)}...`;

    return {
      id: orderId,
      paymentUri,
      invoiceString,
      btcAmount,
      usdAmount: usdValue,
      productId,
      packageName: `${product.name} - ${pkg.value} ${pkg.currency}`,
      expirationTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      status: paymentMethod === 'balance' ? 'complete' : 'unpaid',
      paymentMethod,
    };
  }
}
