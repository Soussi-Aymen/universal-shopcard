import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

// Root .env (README + docker-compose); fallback to backend/.env for local-only setups
const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  '/app/.env',
  path.resolve(__dirname, '../../../.env'),
  path.resolve(__dirname, '../../.env'),
];
const envPath = envCandidates.find((candidate) => fs.existsSync(candidate));
if (envPath) {
  dotenv.config({ path: envPath });
}

export type BitrefillPaymentMethod = 'balance' | 'bitcoin';
export type BitrefillBalanceCurrency = 'EUR' | 'USD' | 'XBT';

export interface Config {
  port: number;
  nodeEnv: string;
  geminiApiKey: string;
  geminiModel: string;
  geminiOfflineOnly: boolean;
  bitrefillApiKey: string;
  bitrefillApiUrl: string;
  bitrefillApiV2Url: string;
  bitrefillPaymentMethod: BitrefillPaymentMethod;
  bitrefillBalanceCurrency: BitrefillBalanceCurrency;
  bitrefillIncludeTestProducts: boolean;
  bitrefillEnablePayment: boolean;
  frontendUrl: string;
}

const getEnvOrThrow = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Configuration Error: Missing environment variable ${key}`);
  }
  return value;
};

const paymentMethod = process.env.BITREFILL_PAYMENT_METHOD || 'balance';
const normalizedPaymentMethod: BitrefillPaymentMethod =
  paymentMethod === 'bitcoin' ? 'bitcoin' : 'balance';

const balanceCurrency = (process.env.BITREFILL_BALANCE_CURRENCY || 'EUR').toUpperCase();
const normalizedBalanceCurrency: BitrefillBalanceCurrency =
  balanceCurrency === 'USD' || balanceCurrency === 'XBT' ? balanceCurrency : 'EUR';

export const config: Config = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  geminiApiKey: getEnvOrThrow('GEMINI_API_KEY'),
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  geminiOfflineOnly: process.env.GEMINI_OFFLINE_ONLY === 'true',
  bitrefillApiKey: process.env.BITREFILL_API_KEY || 'mock',
  bitrefillApiUrl: process.env.BITREFILL_API_URL || 'https://api.bitrefill.com/mcp',
  bitrefillApiV2Url: process.env.BITREFILL_API_V2_URL || 'https://api.bitrefill.com/v2',
  bitrefillPaymentMethod: normalizedPaymentMethod,
  bitrefillBalanceCurrency: normalizedBalanceCurrency,
  bitrefillIncludeTestProducts: process.env.BITREFILL_INCLUDE_TEST_PRODUCTS === 'true',
  bitrefillEnablePayment: process.env.BITREFILL_ENABLE_PAYMENT !== 'false',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
};
