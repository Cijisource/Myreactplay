import React from 'react';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  stock: number;
  rating: number;
  reviews: number;
}

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onProductClick: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart, onProductClick }) => {
  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 > 0.5;
    return (
      <>
        <span className="stars">{'★'.repeat(fullStars)}{hasHalfStar ? '½' : ''}</span>
        <span className="rating-value">{rating.toFixed(1)}</span>
      </>
    );
  };

  return (
    <div className="product-card" onClick={() => onProductClick(product)}>
      <div className="product-image">
        <img src={product.image || 'https://via.placeholder.com/250'} alt={product.name} />
      </div>
      <div className="product-info">
        <h3>{product.name}</h3>
        <div className="rating">
          {renderStars(product.rating)}
          <span className="reviews">({product.reviews} reviews)</span>
        </div>
        <p className="price">${product.price.toFixed(2)}</p>
        <p className={`stock ${product.stock > 0 ? 'in-stock' : 'out-stock'}`}>
          {product.stock > 0 ? `✓ In Stock (${product.stock})` : '✗ Out of Stock'}
        </p>
        <button 
          className="add-to-cart-btn"
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart(product);
          }}
          disabled={product.stock === 0}
        >
          {product.stock > 0 ? '🛒 Add to Cart' : 'Unavailable'}
        </button>
      </div>
    </div>
  );
};
