import React, { useEffect, useRef, useState } from 'react';
import { ShoppingBag, Trash2, X, CreditCard, ExternalLink, Copy, Check } from 'lucide-react';
import QRCode from 'qrcode';
import type { Product, ProductPackage } from './ProductCard';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

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

export interface ShopCardItem {
  product: Product;
  selectedPackage: ProductPackage;
}

interface ShopCardProps {
  items: ShopCardItem[];
  onRemoveItem: (index: number) => void;
  onCheckout: () => Promise<void>;
  isCheckingOut: boolean;
  invoices: Invoice[] | null;
  onCloseInvoiceModal: () => void;
}

export const ShopCard: React.FC<ShopCardProps> = ({
  items,
  onRemoveItem,
  onCheckout,
  isCheckingOut,
  invoices,
  onCloseInvoiceModal,
}) => {
  const [copiedInvoiceId, setCopiedInvoiceId] = useState<string | null>(null);
  const [devBalance, setDevBalance] = useState<{
    amount: number;
    currency: string;
    isEmpty?: boolean;
  } | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/balance`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.balance) {
          setDevBalance(data.balance);
        }
      })
      .catch(() => {});
  }, [invoices]);
  
  // Hardcoded exchange rate for calculation display: 1 BTC = 60000 EUR
  const BTC_RATE = 60000;
  
  const totalFiat = items.reduce((sum, item) => sum + item.selectedPackage.value, 0);
  const totalBtc = parseFloat((totalFiat / BTC_RATE).toFixed(8));

  // Handle Copy to Clipboard
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedInvoiceId(id);
    setTimeout(() => setCopiedInvoiceId(null), 2000);
  };

  return (
    <>
      <aside className="shopcard-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <h2 className="sidebar-title">
              <ShoppingBag size={22} />
              Universal ShopCard
            </h2>
            <p className="sidebar-powered-by">via Bitrefill</p>
            {devBalance && (
              <p className={`sidebar-balance ${devBalance.isEmpty ? 'sidebar-balance--empty' : ''}`}>
                API balance: {devBalance.amount.toFixed(2)} {devBalance.currency}
              </p>
            )}
          </div>
          {items.length > 0 && (
            <span className="badge-count">{items.length} items</span>
          )}
        </div>

        <div className="cart-items">
          {items.length === 0 ? (
            <div className="cart-empty">
              <ShoppingBag size={48} className="cart-empty-icon" style={{ opacity: 0.2 }} />
              <p className="cart-empty-text">Your ShopCard is empty.</p>
              <p className="cart-empty-text" style={{ fontSize: '0.8rem', opacity: 0.5 }}>
                Add eSIMs or travel gift cards from the search cards.
              </p>
            </div>
          ) : (
            items.map((item, idx) => (
              <div key={`${item.product.id}-${item.selectedPackage.id}-${idx}`} className="cart-item">
                <div className="item-details">
                  <span className="item-name">{item.product.name}</span>
                  <span className="item-package">
                    {item.selectedPackage.value} {item.selectedPackage.currency}
                  </span>
                </div>
                <div className="item-price-row">
                  <span className="item-price">
                    {item.selectedPackage.value} {item.selectedPackage.currency}
                  </span>
                  <button
                    type="button"
                    className="remove-item-btn"
                    onClick={() => onRemoveItem(idx)}
                    aria-label="Remove item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="sidebar-footer">
          <div className="total-row">
            <span className="total-label">Total Amount</span>
            <div className="total-amount-col">
              <div className="total-fiat">
                {totalFiat.toFixed(2)} EUR
              </div>
              {totalFiat > 0 && (
                <div className="total-btc">≈ {totalBtc} BTC</div>
              )}
            </div>
          </div>

          <button
            type="button"
            className="checkout-btn"
            disabled={items.length === 0 || isCheckingOut}
            onClick={onCheckout}
          >
            <CreditCard size={18} />
            {isCheckingOut ? 'Securing Invoice...' : 'Checkout & Pay'}
          </button>
        </div>
      </aside>

      {/* Crypto Invoice Settlement Modal */}
      {invoices && invoices.length > 0 && (
        <InvoiceModal
          invoices={invoices}
          onClose={onCloseInvoiceModal}
          copiedInvoiceId={copiedInvoiceId}
          onCopy={handleCopy}
        />
      )}
    </>
  );
};

// Subcomponent for the Checkout Modal
interface InvoiceModalProps {
  invoices: Invoice[];
  onClose: () => void;
  copiedInvoiceId: string | null;
  onCopy: (text: string, id: string) => void;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({
  invoices,
  onClose,
  copiedInvoiceId,
  onCopy,
}) => {
  const [activeInvoiceIdx, setActiveInvoiceIdx] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeInvoice = invoices[activeInvoiceIdx];
  const isBalancePaid =
    activeInvoice?.paymentMethod === 'balance' &&
    ['complete', 'payment_confirmed', 'not_delivered', 'pending'].includes(
      activeInvoice?.status || '',
    );

  // Render QR Code to Canvas on Invoice update (crypto flow only)
  useEffect(() => {
    if (canvasRef.current && activeInvoice && !isBalancePaid && activeInvoice.paymentUri) {
      QRCode.toCanvas(
        canvasRef.current,
        activeInvoice.paymentUri,
        {
          width: 190,
          margin: 1,
          color: {
            dark: '#05050a',
            light: '#ffffff',
          },
        },
        (err) => {
          if (err) console.error('[InvoiceModal] QRCode render error:', err);
        },
      );
    }
  }, [activeInvoice, isBalancePaid]);

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button type="button" className="close-modal-btn" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>

        <div className="modal-header">
          <h3 className="modal-title">
            {isBalancePaid ? 'Purchase Complete' : 'Secure Crypto Payment'}
          </h3>
          <p className="modal-subtitle">
            {isBalancePaid
              ? 'Paid from Bitrefill developer balance'
              : 'AP2 Zero-Address Crypto Handshake'}
          </p>
        </div>

        {/* Tab Selector if multiple invoices */}
        {invoices.length > 1 && (
          <div style={{ display: 'flex', gap: '5px', marginBottom: '1.2rem', background: 'rgba(255,255,255,0.02)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            {invoices.map((inv, idx) => (
              <button
                key={inv.id}
                type="button"
                style={{
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: activeInvoiceIdx === idx ? 'var(--color-primary)' : 'transparent',
                  color: 'white',
                  transition: 'background 0.2s',
                }}
                onClick={() => setActiveInvoiceIdx(idx)}
              >
                Item {idx + 1}
              </button>
            ))}
          </div>
        )}

        <div className="qr-container">
          {isBalancePaid ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-success)' }}>
              <Check size={48} />
              <p style={{ marginTop: '0.75rem', fontWeight: 600 }}>Developer balance charged</p>
              {activeInvoice.redemptionCode && (
                <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                  Redemption: {activeInvoice.redemptionCode}
                </p>
              )}
            </div>
          ) : (
            <canvas ref={canvasRef} className="qr-canvas"></canvas>
          )}
        </div>

        <div className="invoice-details">
          <div className="invoice-detail-row">
            <span className="detail-label">Item</span>
            <span className="detail-val" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeInvoice.packageName}
            </span>
          </div>
          <div className="invoice-detail-row">
            <span className="detail-label">USD Equivalent</span>
            <span className="detail-val">${activeInvoice.usdAmount.toFixed(2)} USD</span>
          </div>
          <div className="invoice-detail-row">
            <span className="detail-label">Total BTC</span>
            <span className="detail-val crypto">{activeInvoice.btcAmount} BTC</span>
          </div>
          <div className="invoice-detail-row">
            <span className="detail-label">Order ID</span>
            <span className="detail-val" style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
              {activeInvoice.id}
            </span>
          </div>
        </div>

        <div className="pay-btn-group">
          {!isBalancePaid && (
            <>
              <a
                href={activeInvoice.paymentUri}
                className="action-btn primary"
                style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                Open in Wallet <ExternalLink size={14} />
              </a>
              <button
                type="button"
                className="action-btn secondary"
                onClick={() => onCopy(activeInvoice.paymentUri, activeInvoice.id)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                {copiedInvoiceId === activeInvoice.id ? (
                  <>
                    Copied <Check size={14} style={{ color: 'var(--color-success)' }} />
                  </>
                ) : (
                  <>
                    Copy URI <Copy size={14} />
                  </>
                )}
              </button>
            </>
          )}
          {isBalancePaid && activeInvoice.redemptionCode && (
            <button
              type="button"
              className="action-btn primary"
              onClick={() => onCopy(activeInvoice.redemptionCode!, activeInvoice.id)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              {copiedInvoiceId === activeInvoice.id ? (
                <>
                  Copied <Check size={14} style={{ color: 'var(--color-success)' }} />
                </>
              ) : (
                <>
                  Copy Redemption <Copy size={14} />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
