import React from 'react';
import { useWishlistStore } from '../store/store';

export const ProductCard = ({ product, onAddToCart, onViewDetails }) => {
  const { items: wishlistItems, addToWishlist, removeFromWishlist } = useWishlistStore();
  const isWishlisted = wishlistItems.some((item) => item.id === product.id);

  const handleWishlist = () => {
    if (isWishlisted) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  return (
    <div style={styles.card}>
      <div style={styles.imageContainer}>
        {product.image && (
          <img src={product.image} alt={product.name} style={styles.image} />
        )}
        <button
          onClick={handleWishlist}
          style={{
            ...styles.wishlistBtn,
            backgroundColor: isWishlisted ? '#ff6b6b' : '#fff',
          }}
        >
          {isWishlisted ? '♥' : '♡'}
        </button>
      </div>

      <div style={styles.content}>
        <h3 style={styles.title}>{product.name}</h3>
        <p style={styles.description}>{product.description.substring(0, 60)}...</p>

        <div style={styles.meta}>
          <span style={styles.category}>{product.category}</span>
          {product.isBitcoinAccepted && <span style={styles.badge}>₿</span>}
          {product.isEthereumAccepted && <span style={styles.badge}>Ξ</span>}
        </div>

        <div style={styles.footer}>
          <span style={styles.price}>${product.price.toFixed(2)}</span>
          <div style={styles.buttons}>
            <button onClick={() => onViewDetails(product)} style={styles.viewBtn}>
              View
            </button>
            <button onClick={() => onAddToCart(product)} style={styles.addBtn}>
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  card: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'pointer',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: '1',
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  wishlistBtn: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  },
  content: {
    padding: '1rem',
  },
  title: {
    margin: '0 0 0.5rem 0',
    fontSize: '1rem',
    fontWeight: 'bold',
  },
  description: {
    margin: '0 0 0.5rem 0',
    fontSize: '0.85rem',
    color: '#666',
  },
  meta: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '0.5rem',
    flexWrap: 'wrap',
  },
  category: {
    displayBox: 'inline-block',
    fontSize: '0.75rem',
    backgroundColor: '#f0f0f0',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
  },
  badge: {
    display: 'inline-block',
    fontSize: '0.75rem',
    backgroundColor: '#ffd700',
    color: '#000',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontWeight: 'bold',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '1rem',
    borderTop: '1px solid #eee',
    paddingTop: '1rem',
  },
  price: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#333',
  },
  buttons: {
    display: 'flex',
    gap: '0.5rem',
  },
  viewBtn: {
    padding: '0.5rem 1rem',
    backgroundColor: '#f0f0f0',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  addBtn: {
    padding: '0.5rem 1rem',
    backgroundColor: '#ffd700',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 'bold',
  },
};
