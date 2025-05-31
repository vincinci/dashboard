import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_CONFIG from '../config/api';
import ShopifyIntegration from './ShopifyIntegration';

const AdminShopifyIntegration = ({ onClose }) => {
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showShopifyModal, setShowShopifyModal] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    status: 'all',
    vendor: '',
    verified: ''
  });
  
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pages: 1,
    total: 0,
    limit: 10
  });

  useEffect(() => {
    fetchProducts();
    fetchVendors();
  }, [filters]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all' && value !== '') {
          params.append(key, value);
        }
      });

      const response = await axios.get(
        API_CONFIG.getURL(`/shopify/products?${params.toString()}`),
        { timeout: API_CONFIG.TIMEOUT }
      );
      
      setProducts(response.data.products);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError(error.response?.data?.error || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await axios.get(
        API_CONFIG.getURL('/shopify/vendors'),
        { timeout: API_CONFIG.TIMEOUT }
      );
      setVendors(response.data.vendors);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const handleVerifyProduct = async (productId, isVerified, isApprovedForShopify, adminNotes = '') => {
    try {
      const response = await axios.put(
        API_CONFIG.getURL(`/shopify/products/${productId}/verify`),
        { isVerified, isApprovedForShopify, adminNotes },
        { timeout: API_CONFIG.TIMEOUT }
      );
      
      setSuccess('Product verification updated successfully');
      fetchProducts(); // Refresh the list
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error verifying product:', error);
      setError(error.response?.data?.error || 'Failed to update product verification');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleSelectProduct = (productId) => {
    setSelectedProducts(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  const handleSelectAll = () => {
    const approvedProductIds = products
      .filter(p => p.isVerified && p.isApprovedForShopify)
      .map(p => p.id);
    
    if (selectedProducts.length === approvedProductIds.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(approvedProductIds);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filtering
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const getStatusBadge = (product) => {
    if (product.isVerified && product.isApprovedForShopify) {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
          ✅ Approved for Shopify
        </span>
      );
    } else if (product.isVerified) {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
          ✓ Verified
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
          ⏳ Pending Review
        </span>
      );
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('rw-RW', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0
    }).format(price);
  };

  const approvedCount = products.filter(p => p.isVerified && p.isApprovedForShopify).length;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-50">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-7xl">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">🛍️</span>
                  Admin Shopify Management
                </h3>

                {/* Error/Success Messages */}
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-600">{success}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-4 mb-6">
                  <button
                    onClick={() => setShowShopifyModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    🔗 Shopify Connection
                  </button>
                  
                  {approvedCount > 0 && (
                    <button
                      onClick={() => setShowShopifyModal(true)}
                      className="inline-flex items-center px-4 py-2 border border-green-600 text-sm font-medium rounded-md text-green-600 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      🔄 Sync {selectedProducts.length || approvedCount} Products to Shopify
                    </button>
                  )}
                </div>

                {/* Filters */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vendor
                    </label>
                    <select
                      value={filters.vendor}
                      onChange={(e) => handleFilterChange('vendor', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Vendors</option>
                      {vendors.map(vendor => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.businessName || vendor.displayName} ({vendor._count.products})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Verification
                    </label>
                    <select
                      value={filters.verified}
                      onChange={(e) => handleFilterChange('verified', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All</option>
                      <option value="true">Verified</option>
                      <option value="false">Pending</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={() => setFilters({ page: 1, limit: 10, status: 'all', vendor: '', verified: '' })}
                      className="w-full px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>

                {/* Products Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <input
                            type="checkbox"
                            checked={selectedProducts.length === products.filter(p => p.isVerified && p.isApprovedForShopify).length}
                            onChange={handleSelectAll}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vendor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Verification
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loading ? (
                        <tr>
                          <td colSpan="7" className="px-6 py-4 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                          </td>
                        </tr>
                      ) : products.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                            No products found
                          </td>
                        </tr>
                      ) : (
                        products.map((product) => (
                          <tr key={product.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedProducts.includes(product.id)}
                                onChange={() => handleSelectProduct(product.id)}
                                disabled={!product.isVerified || !product.isApprovedForShopify}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {product.name}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {product.category}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {product.vendor?.businessName || product.vendor?.displayName || 'Unknown'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {product.vendor?.email || ''}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatPrice(product.price)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                product.status === 'active' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {product.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(product)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                              {!product.isVerified && (
                                <button
                                  onClick={() => handleVerifyProduct(product.id, true, false)}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  Verify
                                </button>
                              )}
                              {product.isVerified && !product.isApprovedForShopify && (
                                <button
                                  onClick={() => handleVerifyProduct(product.id, true, true)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  Approve for Shopify
                                </button>
                              )}
                              {product.isApprovedForShopify && (
                                <button
                                  onClick={() => handleVerifyProduct(product.id, true, false)}
                                  className="text-yellow-600 hover:text-yellow-900"
                                >
                                  Remove from Shopify
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {((pagination.currentPage - 1) * pagination.limit) + 1} to{' '}
                      {Math.min(pagination.currentPage * pagination.limit, pagination.total)} of{' '}
                      {pagination.total} products
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                        disabled={pagination.currentPage === 1}
                        className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-2 text-sm text-gray-700">
                        Page {pagination.currentPage} of {pagination.pages}
                      </span>
                      <button
                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                        disabled={pagination.currentPage === pagination.pages}
                        className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Shopify Connection Modal */}
      {showShopifyModal && (
        <ShopifyIntegration
          onClose={() => setShowShopifyModal(false)}
          selectedProducts={selectedProducts}
        />
      )}
    </div>
  );
};

export default AdminShopifyIntegration; 