import React, { useState } from 'react';
import { Plus, Check, ImageOff } from 'lucide-react';

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
  suggestedPackage?: ProductPackage;
}

interface ProductCardProps {
  product: Product;
  onAddToCard: (product: Product, selectedPackage: ProductPackage) => void;
  isInCart: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCard, isInCart }) => {
  const [imageError, setImageError] = useState(false);

  // Initialize with the parsed suggested package, or fallback to the first available package
  const [selectedPackage, setSelectedPackage] = useState<ProductPackage>(
    product.suggestedPackage || product.packages[0],
  );

  // Premium hover mouse glow effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { currentTarget, clientX, clientY } = e;
    const { left, top } = currentTarget.getBoundingClientRect();
    const x = clientX - left;
    const y = clientY - top;
    currentTarget.style.setProperty('--x', `${x}px`);
    currentTarget.style.setProperty('--y', `${y}px`);
  };

  return (
    <div className="product-card" onMouseMove={handleMouseMove}>
      <div className="card-image-container">
        {product.image && !imageError ? (
          <img
            src={product.image}
            alt={product.name}
            className="card-image"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="card-image-placeholder">
            <ImageOff size={32} />
          </div>
        )}
        <span className="card-badge">{product.country}</span>
      </div>

      <div className="card-body">
        <h3 className="card-title">{product.name}</h3>

        {product.packages.length > 1 && (
          <div className="packages-row">
            {product.packages.slice(0, 3).map((pkg) => (
              <button
                key={pkg.id}
                type="button"
                className={`package-chip ${selectedPackage.id === pkg.id ? 'active' : ''}`}
                onClick={() => setSelectedPackage(pkg)}
              >
                {pkg.value} {pkg.currency}
              </button>
            ))}
          </div>
        )}

        <div className="card-footer">
          <div className="price-display">
            <span className="price-amount">
              {selectedPackage.value.toFixed(2)}
            </span>
            <span className="price-currency">{selectedPackage.currency}</span>
          </div>

          <button
            type="button"
            className="add-btn"
            onClick={() => onAddToCard(product, selectedPackage)}
            style={
              isInCart
                ? {
                    background: 'var(--color-success)',
                    borderColor: 'var(--color-success)',
                    color: 'white',
                  }
                : {}
            }
          >
            {isInCart ? (
              <>
                <Check size={14} /> Added
              </>
            ) : (
              <>
                <Plus size={14} /> Add
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
