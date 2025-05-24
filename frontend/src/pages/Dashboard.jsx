import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import ProductCard from '../components/ProductCard';
import ProductForm from '../components/ProductForm';
import Logo from '../components/Logo';

const API_BASE_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api');

const Dashboard = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const { user, logout } = useAuth();
  const vendorName = user?.displayName || 'Vendor';
  const PRODUCT_LIMIT = 10;

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/products`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      if (error.response?.status === 401) {
        logout();
      } else {
        showMessage('error', 'Failed to fetch products');
      }
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleAddProduct = async (productData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/products`, productData);
      setProducts(prev => [response.data, ...prev]);
      setShowForm(false);
      showMessage('success', 'Product added successfully!');
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to add product';
      if (error.response?.status === 403) {
        showMessage('error', errorMessage);
        setShowForm(false);
      } else {
        throw new Error(errorMessage);
      }
    }
  };

  const handleEditProduct = async (productData) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/products/${editingProduct.id}`, productData);
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? response.data : p));
      setEditingProduct(null);
      setShowForm(false);
      showMessage('success', 'Product updated successfully!');
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to update product';
      throw new Error(errorMessage);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/products/${productId}`);
      setProducts(prev => prev.filter(p => p.id !== productId));
      showMessage('success', 'Product deleted successfully!');
    } catch (error) {
      console.error('Error deleting product:', error);
      showMessage('error', 'Failed to delete product');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingProduct(null);
  };

  const isLimitReached = products.length >= PRODUCT_LIMIT;

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  // CSV Export Function
  const exportToCSV = () => {
    if (products.length === 0) {
      showMessage('error', 'No products to export');
      return;
    }

    // Define CSV headers
    const headers = [
      'ID',
      'Name',
      'Description',
      'Price',
      'Category',
      'Stock Quantity',
      'SKU',
      'Status',
      'Images Count',
      'Created Date',
      'Updated Date'
    ];

    // Convert products to CSV format
    const csvData = products.map(product => [
      product.id || '',
      product.name || '',
      product.description ? product.description.replace(/"/g, '""') : '', // Escape quotes
      product.price || '0',
      product.category || '',
      product.stockQuantity || '0',
      product.sku || '',
      product.status || 'active',
      product.images ? product.images.length : '0',
      product.createdAt ? new Date(product.createdAt).toLocaleDateString() : '',
      product.updatedAt ? new Date(product.updatedAt).toLocaleDateString() : ''
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => 
        row.map(field => 
          typeof field === 'string' && field.includes(',') 
            ? `"${field}"` 
            : field
        ).join(',')
      )
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `products_${vendorName}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showMessage('success', `Exported ${products.length} products to CSV`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
          <p className="mt-4 text-gray-700">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Logo size="default" />
              <span className="ml-2 text-sm text-yellow-600">Vendor Dashboard</span>
            </div>
            <div className="flex items-center space-x-3">
              <Link 
                to="/account"
                className="px-3 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200 font-medium"
              >
                Account Settings
              </Link>
              <button
                onClick={handleLogout}
                className="px-3 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors duration-200 font-medium"
              >
                Logout
              </button>
              <div className="text-sm text-gray-700 bg-yellow-50 px-3 py-2 rounded-lg border border-yellow-200">
                Welcome, <span className="font-medium text-yellow-700">{vendorName}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Stats */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Welcome back, {vendorName}!
              </h2>
              <p className="text-gray-700">
                You've used <span className="font-medium text-yellow-600">{products.length}</span> of{' '}
                <span className="font-medium">{PRODUCT_LIMIT}</span> product slots
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {products.length > 0 && (
                <button
                  onClick={exportToCSV}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                  title="Export all products to CSV"
                >
                  📊 Export CSV
                </button>
              )}
              <button
                onClick={() => setShowForm(true)}
                disabled={isLimitReached}
                className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 ${
                  isLimitReached
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                }`}
              >
                {isLimitReached ? 'Product Limit Reached' : '+ Add Product'}
              </button>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-700 mb-1">
              <span>Product Slots Used</span>
              <span>{products.length}/{PRODUCT_LIMIT}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  products.length >= PRODUCT_LIMIT ? 'bg-red-500' : 'bg-yellow-500'
                }`}
                style={{ width: `${(products.length / PRODUCT_LIMIT) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Message Display */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Products Grid */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Your Products</h3>
            <div className="flex items-center space-x-3">
              {products.length > 0 && (
                <>
                  <button
                    onClick={exportToCSV}
                    className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export CSV
                  </button>
                  <span className="text-sm text-yellow-600">
                    {products.length} product{products.length !== 1 ? 's' : ''}
                  </span>
                </>
              )}
            </div>
          </div>

          {products.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <div className="mx-auto h-24 w-24 text-yellow-400 mb-4">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-full w-full">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-gray-800 mb-2">No products yet</h4>
              <p className="text-gray-600 mb-6">Get started by adding your first product to the marketplace.</p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg transition-colors duration-200"
              >
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Your First Product
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onEdit={handleEdit}
                  onDelete={handleDeleteProduct}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Product Form Modal */}
      {showForm && (
        <ProductForm
          product={editingProduct}
          onSubmit={editingProduct ? handleEditProduct : handleAddProduct}
          onCancel={handleCloseForm}
          isLimitReached={isLimitReached}
        />
      )}
    </div>
  );
};

export default Dashboard;