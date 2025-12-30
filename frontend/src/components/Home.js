/**
 * Home Component
 * Displays perfume selection with spray count and automatic price calculation
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { systemAPI, orderAPI } from '../services/api';
import './Home.css';

const perfumes = [
  // ULTRA-LUXURY (3 perfumes)
  // Selling Price = Cost per Spray × 3 (1:3 ratio)
  {
    id: 1,
    name: 'Chanel No. 5',
    description: 'Iconic floral-aldehyde masterpiece, timeless elegance',
    image: '/images/chanel.png',
    color: '#d4af37',
    gradient: 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)',
    pricePerSpray: 51, // Bottle: ₹17,000, Cost/spray: ₹17, Selling: ₹51
    category: 'ULTRA-LUXURY',
  },
  {
    id: 2,
    name: 'Tom Ford Black Orchid',
    description: 'Luxurious dark floral with vanilla and patchouli',
    image: '/images/tom-ford.webp',
    color: '#2c2c2c',
    gradient: 'linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%)',
    pricePerSpray: 54, // Bottle: ₹18,000, Cost/spray: ₹18, Selling: ₹54
    category: 'ULTRA-LUXURY',
  },
  {
    id: 3,
    name: 'Creed Aventus',
    description: 'Sophisticated fruity chypre with pineapple and birch',
    image: '/images/creed.webp',
    color: '#8b7355',
    gradient: 'linear-gradient(135deg, #8b7355 0%, #6b5b4f 100%)',
    pricePerSpray: 105, // Bottle: ₹35,000, Cost/spray: ₹35, Selling: ₹105
    category: 'ULTRA-LUXURY',
  },
  // LUXURY DESIGNER (3 perfumes)
  {
    id: 4,
    name: 'Dior Sauvage',
    description: 'Fresh and spicy with bergamot and ambroxan',
    image: '/images/dior.png',
    color: '#4169e1',
    gradient: 'linear-gradient(135deg, #4169e1 0%, #1e3a8a 100%)',
    pricePerSpray: 39, // Bottle: ₹13,000, Cost/spray: ₹13, Selling: ₹39
    category: 'LUXURY DESIGNER',
  },
  {
    id: 5,
    name: 'Yves Saint Laurent Libre',
    description: 'Bold lavender and vanilla, modern femininity',
    image: '/images/ysl.jpg',
    color: '#9370db',
    gradient: 'linear-gradient(135deg, #9370db 0%, #6a5acd 100%)',
    pricePerSpray: 30, // Bottle: ₹10,000, Cost/spray: ₹10, Selling: ₹30
    category: 'LUXURY DESIGNER',
  },
  {
    id: 6,
    name: 'Armani Code',
    description: 'Seductive oriental with lemon, star anise, and tonka',
    image: '/images/armani.png',
    color: '#34495e',
    gradient: 'linear-gradient(135deg, #34495e 0%, #2c3e50 100%)',
    pricePerSpray: 30, // Bottle: ₹10,000, Cost/spray: ₹10, Selling: ₹30
    category: 'LUXURY DESIGNER',
  },
  // PREMIUM DESIGNERS (3 perfumes)
  {
    id: 7,
    name: 'Versace Eros',
    description: 'Bold and seductive with mint, vanilla, and tonka bean',
    image: '/images/versace.png',
    color: '#ff6b6b',
    gradient: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
    pricePerSpray: 33, // Bottle: ₹11,000, Cost/spray: ₹11, Selling: ₹33
    category: 'PREMIUM DESIGNERS',
  },
  {
    id: 8,
    name: 'Acqua di Gio',
    description: 'Fresh aquatic fragrance with marine and citrus notes',
    image: '/images/armani.png',
    color: '#4ecdc4',
    gradient: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
    pricePerSpray: 30, // Bottle: ₹10,000, Cost/spray: ₹10, Selling: ₹30
    category: 'PREMIUM DESIGNERS',
  },
  {
    id: 9,
    name: 'Hugo Boss Bottled',
    description: 'Fresh spicy with apple, cinnamon, and vanilla',
    image: '/images/hugo-boss.png',
    color: '#e74c3c',
    gradient: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
    pricePerSpray: 21, // Bottle: ₹7,000, Cost/spray: ₹7, Selling: ₹21
    category: 'PREMIUM DESIGNERS',
  },
  // NICHE ARTISAN (3 perfumes)
  {
    id: 10,
    name: 'Bleu de Chanel',
    description: 'Fresh aromatic with citrus, cedar, and sandalwood',
    image: '/images/chanel.png',
    color: '#5dade2',
    gradient: 'linear-gradient(135deg, #5dade2 0%, #3498db 100%)',
    pricePerSpray: 45, // Bottle: ₹15,000, Cost/spray: ₹15, Selling: ₹45
    category: 'NICHE ARTISAN',
  },
  {
    id: 11,
    name: 'Maison Margiela Replica',
    description: 'Nostalgic scents that capture moments in time',
    image: '/images/maison-margiela.webp',
    color: '#c0c0c0',
    gradient: 'linear-gradient(135deg, #c0c0c0 0%, #808080 100%)',
    pricePerSpray: 39, // Bottle: ₹13,000, Cost/spray: ₹13, Selling: ₹39
    category: 'NICHE ARTISAN',
  },
  {
    id: 12,
    name: 'Polo Blue',
    description: 'Fresh aquatic with melon, cucumber, and basil',
    image: '/images/ralph-lauren.png',
    color: '#3498db',
    gradient: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
    pricePerSpray: 24, // Bottle: ₹8,000, Cost/spray: ₹8, Selling: ₹24
    category: 'NICHE ARTISAN',
  },
];

const PRICE_PER_SPRAY = 30; // Default price for perfumes without pricePerSpray

const Home = () => {
  const navigate = useNavigate();
  const [selectedPerfume, setSelectedPerfume] = useState(null);
  const [sprays, setSprays] = useState(1);
  const [totalPrice, setTotalPrice] = useState(PRICE_PER_SPRAY);
  const [perfumeLevels, setPerfumeLevels] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSystemStatus = async () => {
      try {
        const response = await systemAPI.getStatus();
        if (response.data && response.data.perfumeLevels) {
          setPerfumeLevels(response.data.perfumeLevels);
        } else if (response.data && response.data.perfumeLevel) {
          // Fallback for legacy data
          const levels = {};
          perfumes.forEach(p => {
            levels[p.id] = response.data.perfumeLevel;
          });
          setPerfumeLevels(levels);
        }
      } catch (err) {
        console.error('Error fetching system status:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSystemStatus();
  }, []);

  const handlePerfumeSelect = (perfume) => {
    // Check if perfume level is low (< 20%)
    const level = perfumeLevels[perfume.id.toString()] ?? 100;
    if (level < 20) {
      return; // Do not select if low level
    }

    setSelectedPerfume(perfume);
    setSprays(1);
    const pricePerSpray = perfume.pricePerSpray || PRICE_PER_SPRAY;
    setTotalPrice(pricePerSpray);
  };

  const handleSprayChange = (newSprays) => {
    if (newSprays >= 1 && newSprays <= 10) {
      setSprays(newSprays);
      const pricePerSpray = selectedPerfume?.pricePerSpray || PRICE_PER_SPRAY;
      setTotalPrice(newSprays * pricePerSpray);

      // Add animation class to trigger number bounce
      const sprayNumber = document.querySelector('.spray-number');
      const totalAmount = document.querySelector('.total-amount');
      if (sprayNumber) {
        sprayNumber.classList.add('updated');
        setTimeout(() => sprayNumber.classList.remove('updated'), 400);
      }
      if (totalAmount) {
        totalAmount.classList.add('updated');
        setTimeout(() => totalAmount.classList.remove('updated'), 400);
      }
    }
  };

  const handleProceedToPayment = () => {
    if (selectedPerfume) {
      // Navigate to payment with selected perfume and sprays
      navigate('/payment', {
        state: {
          perfume: selectedPerfume,
          sprays: sprays,
          amount: totalPrice,
        },
      });
    }
  };

  return (
    <div className="home-container">
      <div className="home-header">
        <div className="home-logo">
          <img src="/images/aureole-logo.png" alt="AUREOLE" />
        </div>
        <p className="home-subtitle">Select your favorite fragrance</p>
      </div>

      {/* Perfumes by Category */}
      {['ULTRA-LUXURY', 'LUXURY DESIGNER', 'PREMIUM DESIGNERS', 'NICHE ARTISAN'].map((category) => {
        const categoryPerfumes = perfumes.filter((p) => p.category === category);
        if (categoryPerfumes.length === 0) return null;

        return (
          <div key={category} className="perfume-category-section">
            <h2 className="category-title">{category}</h2>
            <div className="perfumes-grid">
              {categoryPerfumes.map((perfume) => {
                const level = perfumeLevels[perfume.id.toString()] ?? 100;
                const isLow = level < 20;

                return (
                  <div
                    key={perfume.id}
                    className={`perfume-card ${selectedPerfume?.id === perfume.id ? 'selected' : ''} ${isLow ? 'disabled' : ''}`}
                    onClick={() => handlePerfumeSelect(perfume)}
                    style={{
                      '--perfume-color': perfume.color,
                      '--perfume-gradient': perfume.gradient,
                      opacity: isLow ? 0.6 : 1,
                      filter: isLow ? 'grayscale(0.8)' : 'none',
                      cursor: isLow ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <div className="perfume-icon">
                      <img src={perfume.image} alt={perfume.name} onError={(e) => { e.target.style.display = 'none'; }} />
                    </div>
                    <h3 className="perfume-name">{perfume.name}</h3>
                    <p className="perfume-description">{perfume.description}</p>

                    {isLow ? (
                      <div className="low-level-warning" style={{
                        color: '#ef4444',
                        fontWeight: 'bold',
                        marginTop: '10px',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px'
                      }}>
                        <span>⚠️</span> Perfume level low
                      </div>
                    ) : (
                      selectedPerfume?.id === perfume.id && (
                        <div className="selected-badge">
                          <span>✓ Selected</span>
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Popup Modal for Spray Selection */}
      {selectedPerfume && (
        <div className="modal-overlay" onClick={() => setSelectedPerfume(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedPerfume(null)}>
              ×
            </button>

            <div className="selected-perfume-info">
              <div className="selected-perfume-icon">
                <img src={selectedPerfume.image} alt={selectedPerfume.name} onError={(e) => { e.target.style.display = 'none'; }} />
              </div>
              <div className="selected-perfume-details">
                <h2>{selectedPerfume.name}</h2>
                <p>{selectedPerfume.description}</p>
              </div>
            </div>

            <div className="spray-selection-container">
              <div className="spray-selector">
                <label className="spray-label">Number of Sprays</label>
                <div className="spray-controls">
                  <button
                    className="spray-btn"
                    onClick={() => handleSprayChange(sprays - 1)}
                    disabled={sprays <= 1}
                  >
                    −
                  </button>
                  <div className="spray-count">
                    <span className="spray-number">{sprays}</span>
                    <span className="spray-unit">spray{sprays !== 1 ? 's' : ''}</span>
                  </div>
                  <button
                    className="spray-btn"
                    onClick={() => handleSprayChange(sprays + 1)}
                    disabled={sprays >= 10}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="order-details-container">
              <div className="price-calculation">
                <div className="price-breakdown">
                  <div className="price-item">
                    <span>{sprays} spray{sprays !== 1 ? 's' : ''} × ₹{selectedPerfume?.pricePerSpray || PRICE_PER_SPRAY}</span>
                    <span>₹{totalPrice}</span>
                  </div>
                </div>
                <div className="total-price">
                  <span className="total-label">Total Amount</span>
                  <span className="total-amount">₹{totalPrice}</span>
                </div>
              </div>

              <button className="proceed-btn" onClick={handleProceedToPayment}>
                Proceed to Payment
                <span className="btn-arrow">→</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {!selectedPerfume && (
        <div className="selection-hint">
          <p>👆 Click on a perfume to select</p>
        </div>
      )}
    </div>
  );
};

export default Home;

