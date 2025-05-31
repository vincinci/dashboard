import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import ProductCard from '../components/ProductCard';
import ProductForm from '../components/ProductForm';
import CSVImport from '../components/CSVImport';
import Logo from '../components/Logo';
import API_CONFIG from '../config/api';

const Dashboard = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    limit: 10
  });
  
  const { user, logout } = useAuth();
  const vendorName = user?.displayName || 'Vendor';
  const PRODUCT_LIMIT = 10;

  const fetchProducts = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(API_CONFIG.getURL(`/products?page=${page}&limit=${pagination.limit}`), {
        timeout: API_CONFIG.TIMEOUT
      });
      setProducts(response.data.products);
      setPagination({
        currentPage: response.data.pagination.currentPage,
        totalPages: response.data.pagination.pages,
        total: response.data.pagination.total,
        limit: response.data.pagination.limit
      });
    } catch (error) {
      console.error('Error fetching products:', error);
      if (error.response?.status === 401) {
        logout();
      } else {
        const errorMsg = error.code === 'ECONNREFUSED' || error.message.includes('Network Error')
          ? `Cannot connect to server at ${API_CONFIG.getBaseURL()}. Please ensure the backend is running.`
          : error.response?.data?.error || 'Failed to fetch products';
        setError(errorMsg);
        showMessage('error', errorMsg);
      }
    } finally {
      setLoading(false);
    }
  }, [logout, pagination.limit]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleAddProduct = async (productData) => {
    try {
      const response = await axios.post(API_CONFIG.getURL('/products'), productData, {
        timeout: API_CONFIG.TIMEOUT
      });
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
      const response = await axios.put(API_CONFIG.getURL(`/products/${editingProduct.id}`), productData, {
        timeout: API_CONFIG.TIMEOUT
      });
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
      await axios.delete(API_CONFIG.getURL(`/products/${productId}`), {
        timeout: API_CONFIG.TIMEOUT
      });
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

  const handleCSVImportComplete = (importResult) => {
    showMessage('success', `CSV Import completed! ${importResult.summary.success} products imported successfully.`);
    setShowCSVImport(false);
    // Refresh products to show newly imported items
    fetchProducts(pagination.currentPage);
  };

  const isLimitReached = products.length >= PRODUCT_LIMIT;

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchProducts(newPage);
    }
  };

  // CSV Export Function
  const exportToCSV = () => {
    if (products.length === 0) {
      showMessage('error', 'No products to export');
      return;
    }

    // Define simple CSV headers for basic product information
    const headers = [
      'Name',
      'Category', 
      'Description',
      'Price',
      'Quantity',
      'Delivery',
      'Pickup',
      'Status'
    ];

    // Convert products to CSV format with basic fields only
    const csvData = products.map(product => [
      product.name || '',
      product.category || '',
      product.description ? product.description.replace(/"/g, '""') : '', // Escape quotes
      product.price || '0',
      product.quantity || '0',
      product.delivery ? 'Yes' : 'No',
      product.pickup || '',
      product.status || 'active'
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
    link.setAttribute('download', `products_export_${new Date().toISOString().split('T')[0]}.csv`);
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

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Something went wrong</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => fetchProducts(pagination.currentPage)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between py-4 sm:h-16">
            <div className="flex items-center w-full sm:w-auto justify-between">
              <div className="flex items-center">
                <Logo size="default" />
                <span className="ml-2 text-sm text-yellow-600 hidden sm:inline">Vendor Dashboard</span>
              </div>
              <button
                className="sm:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
            <div className={`${mobileMenuOpen ? 'flex' : 'hidden'} sm:flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full sm:w-auto mt-4 sm:mt-0`}>
              {user?.isAdmin && (
                <Link 
                  to="/admin"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 w-full sm:w-auto justify-center"
                >
                  Admin Panel
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 w-full sm:w-auto justify-center"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Message Display */}
        {message.text && (
          <div className={`mb-4 p-4 rounded-md ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message.text}
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 space-y-4 sm:space-y-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
            <button
              onClick={() => !isLimitReached && setShowForm(true)}
              disabled={isLimitReached}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${isLimitReached ? 'bg-gray-400 cursor-not-allowed' : 'bg-yellow-600 hover:bg-yellow-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 w-full sm:w-auto justify-center`}
            >
              Add New Product
            </button>
            <button
              onClick={() => setShowCSVImport(true)}
              className="inline-flex items-center px-4 py-2 border border-yellow-600 text-sm font-medium rounded-md text-yellow-600 bg-white hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 w-full sm:w-auto justify-center"
            >
              📥 Import CSV
            </button>
            <button
              onClick={exportToCSV}
              className="inline-flex items-center px-4 py-2 border border-yellow-600 text-sm font-medium rounded-md text-yellow-600 bg-white hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 w-full sm:w-auto justify-center"
            >
              📤 Export CSV
            </button>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <p className="text-sm text-gray-500">
              Welcome, {vendorName}!
            </p>
            {pagination.total > 0 && (
              <p className="text-sm text-gray-500">
                Showing {products.length} of {pagination.total} products
              </p>
            )}
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={() => handleEdit(product)}
              onDelete={() => handleDeleteProduct(product.id)}
            />
          ))}
        </div>

        {products.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">No products yet. Start by adding a new product!</p>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-8">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium ${
                  pagination.currentPage === 1
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className={`relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium ${
                  pagination.currentPage === pagination.totalPages
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{((pagination.currentPage - 1) * pagination.limit) + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.currentPage * pagination.limit, pagination.total)}
                  </span>{' '}
                  of <span className="font-medium">{pagination.total}</span> results
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                    className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                      pagination.currentPage === 1 ? 'cursor-not-allowed' : ''
                    }`}
                  >
                    Previous
                  </button>
                  
                  {/* Page numbers */}
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                        page === pagination.currentPage
                          ? 'z-10 bg-yellow-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-600'
                          : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                      pagination.currentPage === pagination.totalPages ? 'cursor-not-allowed' : ''
                    }`}
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-gray-500 bg-opacity-75 transition-opacity">
          <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
              <ProductForm
                onSubmit={editingProduct ? handleEditProduct : handleAddProduct}
                onCancel={handleCloseForm}
                product={editingProduct}
                isLimitReached={isLimitReached}
              />
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCSVImport && (
        <CSVImport
          onImportComplete={handleCSVImportComplete}
          onClose={() => setShowCSVImport(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;