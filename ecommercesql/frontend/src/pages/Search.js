import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Search.css';

function Search() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    query: searchParams.get('q') || '',
    minPrice: '',
    maxPrice: '',
    category: ''
  });
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });

  useEffect(() => {
    fetchCategories();
    if (filters.query) {
      performSearch();
    }
  }, []);

  useEffect(() => {
    if (filters.query) {
      performSearch();
    }
  }, [searchParams]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/products/categories/list');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const performSearch = async () => {
    if (!filters.query.trim()) return;

    setLoading(true);
    try {
      let url = `/api/search/?q=${encodeURIComponent(filters.query)}&page=${pagination.page}`;
      if (filters.category) url += `&category=${filters.category}`;
      if (filters.minPrice) url += `&minPrice=${filters.minPrice}`;
      if (filters.maxPrice) url += `&maxPrice=${filters.maxPrice}`;

      const response = await axios.get(url);
      setResults(response.data.products);
      setPagination({ page: response.data.page, pages: response.data.pages });
    } catch (error) {
      console.error('Error performing search:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination({ page: 1, pages: 1 });
    performSearch();
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="search-container">
      <div className="search-header">
        <h1>Search Products</h1>
      </div>

      <div className="search-layout">
        <aside className="search-filters">
          <form onSubmit={handleSearch} className="filter-form">
            <div className="filter-group">
              <label htmlFor="query">Search Term</label>
              <input
                id="query"
                type="text"
                name="query"
                value={filters.query}
                onChange={handleFilterChange}
                placeholder="Enter search term..."
              />
            </div>

            <div className="filter-group">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                name="category"
                value={filters.category}
                onChange={handleFilterChange}
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="minPrice">Min Price</label>
              <input
                id="minPrice"
                type="number"
                name="minPrice"
                value={filters.minPrice}
                onChange={handleFilterChange}
                placeholder="0"
              />
            </div>

            <div className="filter-group">
              <label htmlFor="maxPrice">Max Price</label>
              <input
                id="maxPrice"
                type="number"
                name="maxPrice"
                value={filters.maxPrice}
                onChange={handleFilterChange}
                placeholder="1000"
              />
            </div>

            <button type="submit" className="btn btn-primary">
              Apply Filters
            </button>
          </form>
        </aside>

        <main className="search-results">
          {loading ? (
            <div className="loading">Searching...</div>
          ) : (
            <>
              <div className="results-header">
                <h2>Results for "{filters.query}"</h2>
                <p className="result-count">Found {results.length} product(s)</p>
              </div>

              {results.length === 0 ? (
                <div className="no-results">
                  <p>No products found matching your search.</p>
                  <button className="btn btn-primary" onClick={() => navigate('/')}>
                    Browse All Products
                  </button>
                </div>
              ) : (
                <>
                  <div className="results-grid">
                    {results.map(product => (
                      <div key={product.id} className="result-card">
                        <div
                          className="result-image"
                          onClick={() => navigate(`/product/${product.id}`)}
                          style={{ cursor: 'pointer' }}
                        >
                          <img
                            src={product.images && product.images[0] ? product.images[0] : '/placeholder.jpg'}
                            alt={product.name}
                          />
                        </div>
                        <div className="result-info">
                          <h3 onClick={() => navigate(`/product/${product.id}`)} style={{ cursor: 'pointer' }}>
                            {product.name}
                          </h3>
                          <p className="result-price">${product.price.toFixed(2)}</p>
                          <p className="result-stock">
                            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {pagination.pages > 1 && (
                    <div className="pagination">
                      <button
                        disabled={pagination.page === 1}
                        onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                      >
                        Previous
                      </button>
                      <span>Page {pagination.page} of {pagination.pages}</span>
                      <button
                        disabled={pagination.page === pagination.pages}
                        onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default Search;
