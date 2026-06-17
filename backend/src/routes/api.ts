import { Router, Request, Response, NextFunction } from 'express';
import { config } from '../config/env';
import { GeminiService } from '../services/gemini.service';
import { McpService, Product, ProductPackage } from '../services/mcp.service';

type ProductWithSuggestedPackage = Product & { suggestedPackage: ProductPackage };

const router = Router();
const geminiService = new GeminiService();
const mcpService = new McpService();

/**
 * @route   POST /api/intent
 * @desc    Translate user natural language intent into top 3 Bitrefill product nodes
 * @access  Public
 */
router.post('/intent', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "prompt" parameter in request body' });
    }

    console.log(`[POST /api/intent] Processing prompt (${prompt.length} chars)`);

    // 1. Ask Gemini to extract intent parameters (e.g. country, search queries, value budgets)
    const parsedIntent = await geminiService.parseIntent(prompt);
    console.log(
      `[POST /api/intent] Gemini parsed intent: country=${parsedIntent.country}, items=${parsedIntent.items.length}`,
    );

    // 2. Query the Bitrefill catalog for each parsed query item
    const searchResults: ProductWithSuggestedPackage[] = [];
    for (const item of parsedIntent.items) {
      const useCountryFilter = ['eSIM', 'Transportation', 'Travel'].includes(item.category);
      const products = await mcpService.searchProducts(
        item.query,
        useCountryFilter ? parsedIntent.country : '',
      );
      
      // Attach metadata parsed from intent (e.g., target suggested budget) to products
      const productsWithMeta = products.map((product) => {
        // Find the package that matches the budget best, or default to the first package
        let bestPackage = product.packages[0];
        if (item.suggestedValue > 0) {
          const closest = product.packages.reduce((prev, curr) => {
            return Math.abs(curr.value - item.suggestedValue) < Math.abs(prev.value - item.suggestedValue)
              ? curr
              : prev;
          });
          if (closest) bestPackage = closest;
        }

        return {
          ...product,
          suggestedPackage: bestPackage,
        };
      });

      searchResults.push(...productsWithMeta);
    }

    // 3. De-duplicate products by ID
    const uniqueProductsMap = new Map<string, ProductWithSuggestedPackage>();
    for (const prod of searchResults) {
      uniqueProductsMap.set(prod.id, prod);
    }
    let uniqueProducts = Array.from(uniqueProductsMap.values());

    // 4. If we don't have enough products, search generally for eSIMs/Transportation in the same country
    if (uniqueProducts.length < 3) {
      const backupProducts = await mcpService.searchProducts('', parsedIntent.country);
      for (const prod of backupProducts) {
        if (!uniqueProductsMap.has(prod.id)) {
          uniqueProductsMap.set(prod.id, {
            ...prod,
            suggestedPackage: prod.packages[0],
          });
        }
      }
      uniqueProducts = Array.from(uniqueProductsMap.values());
    }

    // 5. Select exactly top 3 products
    const finalProducts = uniqueProducts.slice(0, 3);
    console.log(`[POST /api/intent] Returning ${finalProducts.length} product nodes`);

    const displayCountry = parsedIntent.items.every((item) =>
      ['eSIM', 'Transportation', 'Travel'].includes(item.category),
    )
      ? parsedIntent.country
      : '';

    return res.status(200).json({
      success: true,
      country: displayCountry,
      products: finalProducts,
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * @route   POST /api/checkout
 * @desc    Generate crypto invoices for selected product packages
 * @access  Public
 */
router.post('/checkout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { items, paymentMethod: requestedMethod } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing or invalid "items" array in request body' });
    }

    const paymentMethod =
      requestedMethod === 'bitcoin' || requestedMethod === 'balance'
        ? requestedMethod
        : config.bitrefillPaymentMethod;

    console.log(`[POST /api/checkout] Initiating ${paymentMethod} payment for ${items.length} items`);

    const invoices = [];

    // If developer balance is empty, auto-fallback to a free test product for demo videos.
    // This keeps the full "checkout → invoice → redemption" UX without requiring funded API balance.
    const balance = paymentMethod === 'balance' ? await mcpService.getAccountBalance() : null;
    const useFreeTestCheckout = paymentMethod === 'balance' && Boolean(balance?.isEmpty);

    if (useFreeTestCheckout) {
      console.warn('[POST /api/checkout] API balance empty — using free test product checkout');
    }

    for (const item of items) {
      const { productId, packageId } = item;
      if (!productId || !packageId) {
        return res.status(400).json({ error: 'Each checkout item must contain a productId and packageId' });
      }

      const checkoutProductId = useFreeTestCheckout ? 'test-gift-card-code' : productId;
      const checkoutPackageId = useFreeTestCheckout ? 'test-gift-card-code<&>10' : packageId;

      const invoice = await mcpService.buyProducts(checkoutProductId, checkoutPackageId, paymentMethod);
      invoices.push(
        useFreeTestCheckout
          ? { ...invoice, packageName: `${productId} (demo)`, productId, usdAmount: 0 }
          : invoice,
      );
    }

    return res.status(200).json({
      success: true,
      invoices,
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * @route   GET /api/balance
 * @desc    Bitrefill developer account balance (linked to BITREFILL_API_KEY)
 */
router.get('/balance', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const balance = await mcpService.getAccountBalance();
    return res.status(200).json({ success: true, balance });
  } catch (error) {
    return next(error);
  }
});

export default router;
