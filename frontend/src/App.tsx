import React, { useState } from 'react';
import { ShoppingBag, Globe, AlertCircle } from 'lucide-react';
import { PromptInput } from './components/PromptInput';
import { ProductCard } from './components/ProductCard';
import type { Product, ProductPackage } from './components/ProductCard';
import { ShopCard } from './components/ShopCard';
import type { ShopCardItem, Invoice } from './components/ShopCard';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [country, setCountry] = useState<string>('');
  const [cartItems, setCartItems] = useState<ShopCardItem[]>([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Intent parsing & catalog search submit handler
  const handlePromptSubmit = async (promptText: string) => {
    setIsLoading(true);
    setError(null);
    setProducts([]);

    try {
      const response = await fetch(`${API_BASE}/api/intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText }),
      });

      if (!response.ok) {
        throw new Error(`Server returned error code ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setProducts(data.products || []);
        setCountry(data.country || '');
      } else {
        throw new Error(data.error || 'Failed to process travel prompt');
      }
    } catch (err) {
      console.error('[App] Submit Error:', err);
      setError((err as Error).message || 'Failed to parse requirements. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Add selected product package to ShopCard
  const handleAddToCard = (product: Product, selectedPackage: ProductPackage) => {
    setCartItems((prev) => {
      // Check if product is already in card, if so, replace package with new selection
      const existsIdx = prev.findIndex((item) => item.product.id === product.id);
      if (existsIdx > -1) {
        const copy = [...prev];
        copy[existsIdx] = { product, selectedPackage };
        return copy;
      }
      return [...prev, { product, selectedPackage }];
    });
  };

  // Remove product from ShopCard
  const handleRemoveItem = (index: number) => {
    setCartItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Trigger secure payment checkout call
  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    setIsCheckingOut(true);
    setError(null);

    try {
      const payload = {
        paymentMethod: 'balance' as const,
        items: cartItems.map((item) => ({
          productId: item.product.id,
          packageId: item.selectedPackage.id,
          label: item.product.name,
        })),
      };

      const response = await fetch(`${API_BASE}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(
          (errBody as { error?: string; message?: string }).error ||
            (errBody as { message?: string }).message ||
            `Checkout failed with status ${response.status}`,
        );
      }

      const data = await response.json();
      if (data.success && data.invoices) {
        setInvoices(data.invoices);
      } else {
        throw new Error(data.error || 'Invoice generation failed');
      }
    } catch (err) {
      console.error('[App] Checkout Error:', err);
      setError((err as Error).message || 'Failed to secure check-out invoice. Try again.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleCloseInvoiceModal = () => {
    setInvoices(null);
    setCartItems([]); // Reset card items upon checkout settlement screen exit
  };

  // Helper to check if a product is in cart
  const isProductInCart = (prodId: string) => {
    return cartItems.some((item) => item.product.id === prodId);
  };

  return (
    <div className="app-container">
      <main className="main-content">
        <header className="app-header">
          <div className="brand-badge">
            <span className="brand-badge-dot" />
            Powered by Bitrefill
          </div>
          <h1 className="app-title">Universal ShopCard</h1>
          <p className="app-subtitle">
            One prompt to shop gift cards, eSIMs, and game credits from the <span>Bitrefill</span> catalog
          </p>
        </header>

        {/* NLP Prompt Input Area */}
        <PromptInput onSubmit={handlePromptSubmit} isLoading={isLoading} />

        {/* Global Error Banner */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '14px',
            padding: '12px 20px',
            color: '#ef4444',
            fontSize: '0.9rem',
            width: '100%',
            maxWidth: '760px',
            marginBottom: '2rem'
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Catalog Output Area */}
        {isLoading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', fontWeight: 300 }}>
              AI Agent is analyzing location, filtering eSIMs, and generating recommendations...
            </p>
          </div>
        )}

        {!isLoading && products.length > 0 && (
          <div className="products-section">
            <h2 className="section-label">
              <Globe size={14} style={{ marginRight: '6px', verticalAlign: 'text-bottom' }} />
              {country ? `Top matches for ${country}` : 'Top matches'}
            </h2>
            <div className="products-grid">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCard={handleAddToCard}
                  isInCart={isProductInCart(product.id)}
                />
              ))}
            </div>
          </div>
        )}

        {!isLoading && products.length === 0 && !error && (
          <div className="empty-state">
            <ShoppingBag size={42} className="empty-icon" />
            <p style={{ fontWeight: 500, color: 'var(--color-text-main)', marginBottom: '0.5rem' }}>
              What do you need from Bitrefill?
            </p>
            <p style={{ fontSize: '0.85rem' }}>
              Describe a product — eSIM, gift card, or game top-up — and we&apos;ll find the best matches.
            </p>
          </div>
        )}
      </main>

      {/* Sticky Universal ShopCard Sidebar */}
      <ShopCard
        items={cartItems}
        onRemoveItem={handleRemoveItem}
        onCheckout={handleCheckout}
        isCheckingOut={isCheckingOut}
        invoices={invoices}
        onCloseInvoiceModal={handleCloseInvoiceModal}
      />
    </div>
  );
};

export default App;
