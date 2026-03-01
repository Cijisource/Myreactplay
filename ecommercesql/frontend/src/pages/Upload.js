import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Upload.css';

function Upload() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [currentImages, setCurrentImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/products?limit=100');
      setProducts(response.data.products);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = async (e) => {
    const productId = e.target.value;
    setSelectedProduct(productId);
    
    if (productId) {
      try {
        const response = await axios.get(`/api/products/${productId}`);
        setCurrentImages(response.data.images || []);
      } catch (error) {
        console.error('Error fetching product images:', error);
        setCurrentImages([]);
      }
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      setFile(selectedFile);
      setMessage('');
    } else {
      setMessage('Please select a valid image file');
      setFile(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!selectedProduct) {
      setMessage('Please select a product');
      return;
    }

    if (!file) {
      setMessage('Please select a file');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`/api/upload/image/${selectedProduct}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setMessage('Image uploaded successfully!');
      setFile(null);
      setCurrentImages(prev => [...prev, response.data.imageUrl]);

      // Reset file input
      const fileInput = document.getElementById('fileInput');
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error('Error uploading image:', error);
      setMessage(error.response?.data?.error || 'Error uploading image');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageId) => {
    if (window.confirm('Are you sure you want to delete this image?')) {
      try {
        await axios.delete(`/api/upload/image/${imageId}`);
        setCurrentImages(prev => prev.filter((_, idx) => idx !== currentImages.findIndex(img => img === currentImages[imageId])));
        
        // Reload current product images
        if (selectedProduct) {
          const response = await axios.get(`/api/products/${selectedProduct}`);
          setCurrentImages(response.data.images || []);
        }
        setMessage('Image deleted successfully');
        setTimeout(() => setMessage(''), 2000);
      } catch (error) {
        console.error('Error deleting image:', error);
        setMessage('Error deleting image');
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading products...</div>;
  }

  return (
    <div className="upload-container">
      <div className="upload-card">
        <h1>📸 Upload Product Photos</h1>
        
        <form onSubmit={handleUpload} className="upload-form">
          <div className="form-group">
            <label htmlFor="productSelect">Select Product *</label>
            <select
              id="productSelect"
              value={selectedProduct}
              onChange={handleProductSelect}
              required
            >
              <option value="">-- Choose a product --</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="fileInput">Choose Image File *</label>
            <input
              id="fileInput"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              required
              className="file-input"
            />
            {file && (
              <div className="file-preview">
                <p>Selected: {file.name}</p>
                <img
                  src={URL.createObjectURL(file)}
                  alt="Preview"
                  className="preview-img"
                />
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary" disabled={uploading || !selectedProduct || !file}>
            {uploading ? 'Uploading...' : 'Upload Image'}
          </button>

          {message && (
            <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
              {message}
            </div>
          )}
        </form>

        {selectedProduct && currentImages.length > 0 && (
          <div className="current-images">
            <h3>Current Product Images ({currentImages.length})</h3>
            <div className="images-grid">
              {currentImages.map((image, index) => (
                <div key={index} className="image-item">
                  <img src={image.image_url || image} alt={`Product ${index}`} />
                  <button
                    type="button"
                    className="btn-delete"
                    onClick={() => handleDeleteImage(image.id)}
                    title="Delete image"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Upload;
