import React, { useState } from 'react';
import { createProduct, createCategory, getCategories } from '../api';
import './ProductUpload.css';

const ProductUpload = () => {
  const [activeTab, setActiveTab] = useState('product');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    category_id: '',
    price: '',
    stock: '',
    sku: ''
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: ''
  });

  React.useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await getCategories();
      setCategories(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error loading categories:', err);
      setCategories([]);
    }
  };

  const handleProductChange = (e) => {
    const { name, value } = e.target;
    setProductForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCategoryChange = (e) => {
    const { name, value } = e.target;
    setCategoryForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setMessage('');

      if (!productForm.name || !productForm.category_id || !productForm.price) {
        setMessage('Please fill in all required fields');
        return;
      }

      await createProduct({
        name: productForm.name,
        description: productForm.description,
        category_id: parseInt(productForm.category_id),
        price: parseFloat(productForm.price),
        stock: parseInt(productForm.stock) || 0,
        sku: productForm.sku || null
      });

      setMessage('Product created successfully!');
      setProductForm({
        name: '',
        description: '',
        category_id: '',
        price: '',
        stock: '',
        sku: ''
      });
    } catch (err) {
      setMessage('Error creating product: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setMessage('');

      if (!categoryForm.name) {
        setMessage('Category name is required');
        return;
      }

      await createCategory({
        name: categoryForm.name,
        description: categoryForm.description
      });

      setMessage('Category created successfully!');
      setCategoryForm({ name: '', description: '' });
      await loadCategories();
    } catch (err) {
      setMessage('Error creating category: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="product-upload">
      <div className="upload-container">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'product' ? 'active' : ''}`}
            onClick={() => setActiveTab('product')}
          >
            Add Product
          </button>
          <button
            className={`tab ${activeTab === 'category' ? 'active' : ''}`}
            onClick={() => setActiveTab('category')}
          >
            Add Category
          </button>
        </div>

        {message && (
          <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

        {activeTab === 'product' && (
          <form onSubmit={handleCreateProduct} className="form">
            <h2>Add New Product</h2>

            <div className="form-group">
              <label>Product Name *</label>
              <input
                type="text"
                name="name"
                value={productForm.name}
                onChange={handleProductChange}
                placeholder="Enter product name"
                required
              />
            </div>

            <div className="form-group">
              <label>Category *</label>
              <select
                name="category_id"
                value={productForm.category_id}
                onChange={handleProductChange}
                required
              >
                <option value="">Select a category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={productForm.description}
                onChange={handleProductChange}
                placeholder="Enter product description"
                rows={4}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Price *</label>
                <input
                  type="number"
                  name="price"
                  value={productForm.price}
                  onChange={handleProductChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              <div className="form-group">
                <label>Stock</label>
                <input
                  type="number"
                  name="stock"
                  value={productForm.stock}
                  onChange={handleProductChange}
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            <div className="form-group">
              <label>SKU</label>
              <input
                type="text"
                name="sku"
                value={productForm.sku}
                onChange={handleProductChange}
                placeholder="Product SKU"
              />
            </div>

            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? 'Creating...' : 'Create Product'}
            </button>
          </form>
        )}

        {activeTab === 'category' && (
          <form onSubmit={handleCreateCategory} className="form">
            <h2>Add New Category</h2>

            <div className="form-group">
              <label>Category Name *</label>
              <input
                type="text"
                name="name"
                value={categoryForm.name}
                onChange={handleCategoryChange}
                placeholder="Enter category name"
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={categoryForm.description}
                onChange={handleCategoryChange}
                placeholder="Enter category description"
                rows={4}
              />
            </div>

            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? 'Creating...' : 'Create Category'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ProductUpload;
