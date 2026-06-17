import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env';

export interface IntentItem {
  query: string;
  category: string;
  suggestedValue: number;
}

export interface IntentParseResult {
  country: string;
  items: IntentItem[];
}

export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private modelName: string;
  private static quotaBlockedUntil = 0;

  constructor() {
    this.modelName = config.geminiModel;

    if (config.geminiOfflineOnly) {
      console.log('[GeminiService] GEMINI_OFFLINE_ONLY=true; using offline parser only.');
      return;
    }

    if (config.geminiApiKey && config.geminiApiKey !== 'mock') {
      try {
        this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
        console.log(`[GeminiService] Initialized with model ${this.modelName}`);
      } catch (err) {
        console.error('[GeminiService] Failed to initialize GoogleGenerativeAI client:', (err as Error).message);
      }
    } else {
      console.log('[GeminiService] Running in offline fallback parser mode (no API key)');
    }
  }

  private isQuotaBlocked(): boolean {
    return Date.now() < GeminiService.quotaBlockedUntil;
  }

  private markQuotaBlocked(): void {
    GeminiService.quotaBlockedUntil = Date.now() + 60 * 60 * 1000;
    console.warn('[GeminiService] Gemini quota exceeded — using offline parser for the next hour.');
  }

  /**
   * Parse user intent string into structured query parameters
   */
  public async parseIntent(prompt: string): Promise<IntentParseResult> {
    if (!this.genAI || this.isQuotaBlocked()) {
      if (this.isQuotaBlocked()) {
        console.log('[GeminiService] Quota cooldown active; using offline heuristics parser.');
      } else {
        console.log('[GeminiService] No API key; using offline heuristics parser.');
      }
      return this.offlineFallbackParse(prompt);
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          responseMimeType: 'application/json',
        },
      });

      const systemInstruction = `
        You are an expert NLP parser for an Agentic Commerce platform.
        Your job is to analyze a single user travel or shopping request and break it down into search parameters for Bitrefill products.

        Supported countries: 2-letter country codes (e.g., DE for Germany, FR for France, US for USA, ES for Spain, IT for Italy, GB for Great Britain, etc.). You MUST resolve the country from the cities mentioned (e.g., Berlin -> DE, Paris -> FR, Rome -> IT, London -> GB, Madrid -> ES). If no country is resolved, default to "DE".

        You must output a strict JSON object matching this TypeScript interface:
        {
          "country": string, // 2-letter country code
          "items": Array<{
            "query": string, // The primary keyword/brand to search (e.g., "eSIM", "Uber", "Airbnb", "Steam", "Amazon")
            "category": string, // The category name: "eSIM", "Transportation", "Travel", "Food", "Shopping"
            "suggestedValue": number // Budget mentioned in the prompt for this item, default to 0 if not specified
          }>
        }

        Only return the JSON. No markdown blocks, no backticks, no comments.
      `;

      const result = await model.generateContent({
        contents: [
          { role: 'user', parts: [{ text: `${systemInstruction}\n\nUser Prompt: "${prompt}"` }] }
        ]
      });

      const responseText = result.response.text();
      if (!responseText) {
        throw new Error('Gemini returned an empty response');
      }

      const parsed = JSON.parse(responseText.trim()) as IntentParseResult;
      return this.validateAndNormalizeResult(parsed);
    } catch (error) {
      const message = (error as Error).message;
      if (message.includes('429') || /quota/i.test(message)) {
        this.markQuotaBlocked();
      } else {
        console.warn(`[GeminiService] Gemini parsing error: ${message}. Using offline fallback.`);
      }
      return this.offlineFallbackParse(prompt);
    }
  }

  /**
   * Clean and normalize raw parser outputs
   */
  private validateAndNormalizeResult(data: IntentParseResult): IntentParseResult {
    const country = (data.country || 'DE').toUpperCase().trim();
    const items = (data.items || []).map((item) => ({
      query: (item.query || 'eSIM').trim(),
      category: (item.category || 'eSIM').trim(),
      suggestedValue: Math.max(0, Number(item.suggestedValue || 0)),
    }));

    return { country, items };
  }

  /**
   * High-fidelity regex parser in case of offline/credential limits
   */
  private offlineFallbackParse(prompt: string): IntentParseResult {
    const text = prompt.toLowerCase();
    
    // Country resolution
    let country = 'DE';
    if (text.includes('paris') || text.includes('france') || text.includes('nice')) {
      country = 'FR';
    } else if (text.includes('berlin') || text.includes('germany') || text.includes('munich')) {
      country = 'DE';
    } else if (text.includes('london') || text.includes('uk') || text.includes('britain')) {
      country = 'GB';
    } else if (text.includes('new york') || text.includes('usa') || text.includes('america')) {
      country = 'US';
    }

    const items: IntentItem[] = [];

    // Parse eSIM
    if (text.includes('esim') || text.includes('data') || text.includes('internet') || text.includes('sim')) {
      // Find value
      let value = 10; // Default
      const match = text.match(/(?:(?:€|\$|eur|usd)\s*(\d+))|(\d+)\s*(?:€|\$|eur|usd|euro|euro)/);
      if (match) {
        value = Number(match[1] || match[2]);
      }
      items.push({
        query: 'eSIM',
        category: 'eSIM',
        suggestedValue: value,
      });
    }

    // Parse Uber/ride
    if (text.includes('ride') || text.includes('uber') || text.includes('taxi') || text.includes('transport')) {
      let value = 25;
      const rideValMatch = text.match(/(?:ride|uber|taxi).*?(?:(?:€|\$|eur|usd)\s*(\d+))|(\d+)\s*(?:€|\$|eur|usd|euro|euro)/);
      if (rideValMatch) {
        value = Number(rideValMatch[1] || rideValMatch[2]);
      }
      items.push({
        query: 'Uber',
        category: 'Transportation',
        suggestedValue: value,
      });
    }

    // Parse Airbnb/hotel
    if (text.includes('stay') || text.includes('airbnb') || text.includes('hotel') || text.includes('accommodation')) {
      let value = 100;
      const stayValMatch = text.match(/(?:stay|airbnb|hotel|room).*?(?:(?:€|\$|eur|usd)\s*(\d+))|(\d+)\s*(?:€|\$|eur|usd|euro|euro)/);
      if (stayValMatch) {
        value = Number(stayValMatch[1] || stayValMatch[2]);
      }
      items.push({
        query: 'Airbnb',
        category: 'Travel',
        suggestedValue: value,
      });
    }

    // Parse gaming / gift cards (no country filter at search time)
    if (
      text.includes('mobile legends') ||
      text.includes('test gift') ||
      text.includes('test-gift') ||
      (text.includes('gift card') && !text.includes('uber') && !text.includes('airbnb'))
    ) {
      items.push({
        query: text.includes('test gift') || text.includes('test-gift')
          ? 'test gift card'
          : text.includes('mobile legends')
            ? 'Mobile Legends Diamonds'
            : 'gift card',
        category: 'Shopping',
        suggestedValue: 0,
      });
    }

    // If empty list, search using the raw prompt (better than forcing eSIM)
    if (items.length === 0) {
      items.push({
        query: prompt.trim().slice(0, 80) || 'gift card',
        category: 'Shopping',
        suggestedValue: 0,
      });
      country = '';
    }

    return { country, items };
  }
}
