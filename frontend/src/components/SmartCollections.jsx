import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_CONFIG from '../config/api';
import ProductCard from './ProductCard';

const SmartCollections = ({ onEdit, onDelete, onRefresh }) => {
  const [collections, setCollections] = useState(null);
  const [activeCollection, setActiveCollection] = useState('byCategory');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bulkOperation, setBulkOperation] = useState('');
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkUpdates, setBulkUpdates] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_CONFIG.getURL('/products/collections'), {
        timeout: API_CONFIG.TIMEOUT
      });
      setCollections(response.data);
    } catch (error) {
      console.error('Error fetching collections:', error);
      showMessage('error', 'Failed to fetch product collections');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleProductSelect = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAll = (products) => {
    const productIds = products.map(p => p.id);
    const allSelected = productIds.every(id => selectedProducts.includes(id));
    
    if (allSelected) {
      setSelectedProducts(prev => prev.filter(id => !productIds.includes(id)));
    } else {
      setSelectedProducts(prev => [...new Set([...prev, ...productIds])]);
    }
  };

  const handleBulkOperation = async () => {
    if (!selectedProducts.length || !bulkOperation) return;

    try {
      const requestData = {
        operation: bulkOperation,
        productIds: selectedProducts
      };

      if (bulkOperation === 'update') {
        requestData.updates = bulkUpdates;
      }

      const response = await axios.post(
        API_CONFIG.getURL('/products/bulk-operations'),
        requestData,
        { timeout: API_CONFIG.TIMEOUT }
      );

      showMessage('success', response.data.message);
      setSelectedProducts([]);
      setBulkOperation('');
      setShowBulkForm(false);
      setBulkUpdates({});
      
      // Refresh collections and parent dashboard
      await fetchCollections();
      onRefresh && onRefresh();
      
    } catch (error) {
      console.error('Bulk operation error:', error);
      showMessage('error', error.response?.data?.error || 'Failed to perform bulk operation');
    }
  };

  const formatRWF = (price) => {
    return new Intl.NumberFormat('rw-RW', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const getCollectionData = () => {
    if (!collections) return { items: [], label: '' };

    switch (activeCollection) {
      case 'byCategory':
        return {
          items: Object.entries(collections.collections.byCategory).map(([category, products]) => ({
            name: category,
            count: products.length,
            products
          })),
          label: 'Categories'
        };
      case 'byStatus':
        return {
          items: Object.entries(collections.collections.byStatus).map(([status, products]) => ({
            name: status,
            count: products.length,
            products
          })),
          label: 'Status'
        };
      case 'byPriceRange':
        const priceRanges = {
          'under_5000': 'Under 5,000 RWF',
          '5000_15000': '5,000 - 15,000 RWF',
          '15000_30000': '15,000 - 30,000 RWF',
          'over_30000': 'Over 30,000 RWF'
        };
        return {
          items: Object.entries(collections.collections.byPriceRange).map(([range, products]) => ({
            name: priceRanges[range] || range,
            count: products.length,
            products
          })),
          label: 'Price Ranges'
        };
      case 'byStock':
        const stockLabels = {
          'inStock': 'In Stock (>10)',
          'lowStock': 'Low Stock (1-10)',
          'outOfStock': 'Out of Stock (0)'
        };
        return {
          items: Object.entries(collections.collections.byStock).map(([stock, products]) => ({
            name: stockLabels[stock] || stock,
            count: products.length,
            products
          })),
          label: 'Stock Levels'
        };
      case 'byDelivery':
        const deliveryLabels = {
          'delivery': 'Offers Delivery',
          'pickupOnly': 'Pickup Only'
        };
        return {
          items: Object.entries(collections.collections.byDelivery).map(([delivery, products]) => ({
            name: deliveryLabels[delivery] || delivery,
            count: products.length,
            products
          })),
          label: 'Delivery Options'
        };
      default:
        return { items: [], label: '' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
        <span className="ml-2 text-gray-600">Loading collections...</span>
      </div>
    );
  }

  if (!collections) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load collections</p>
      </div>
    );
  }

  const collectionData = getCollectionData();

  return (
    <div className="space-y-6">
      {/* Message Display */}
      {message.text && (
        <div className={`p-4 rounded-md ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message.text}
        </div>
      )}

      {/* Collection Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'byCategory', label: 'Categories', count: Object.keys(collections.collections.byCategory).length },
            { key: 'byStatus', label: 'Status', count: Object.keys(collections.collections.byStatus).length },
            { key: 'byPriceRange', label: 'Price Range', count: 4 },
            { key: 'byStock', label: 'Stock Level', count: 3 },
            { key: 'byDelivery', label: 'Delivery', count: 2 }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveCollection(tab.key)}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeCollection === tab.key
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Bulk Operations Bar */}
      {selectedProducts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-yellow-800">
              {selectedProducts.length} product(s) selected
            </span>
            <div className="flex items-center space-x-2">
              <select
                value={bulkOperation}
                onChange={(e) => {
                  setBulkOperation(e.target.value);
                  if (e.target.value === 'update') {
                    setShowBulkForm(true);
                  } else {
                    setShowBulkForm(false);
                  }
                }}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value="">Select action...</option>
                <option value="update">Update Selected</option>
                <option value="activate">Activate</option>
                <option value="deactivate">Deactivate</option>
                <option value="delete">Delete</option>
              </select>
              
              {bulkOperation && bulkOperation !== 'update' && (
                <button
                  onClick={handleBulkOperation}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-1 rounded-md text-sm"
                >
                  Apply
                </button>
              )}
              
              <button
                onClick={() => setSelectedProducts([])}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Clear
              </button>
            </div>
          </div>
          
          {/* Bulk Update Form */}
          {showBulkForm && bulkOperation === 'update' && (
            <div className="mt-4 p-4 bg-white border border-gray-200 rounded-md">
              <h4 className="text-sm font-medium text-gray-800 mb-3">Update Selected Products</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={bulkUpdates.category || ''}
                    onChange={(e) => setBulkUpdates(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                  >
                    <option value="">No change</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Clothing Collection">Clothing Collection</option>
                    <option value="Shoes">Shoes</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Food & Beverages">Food & Beverages</option>
                    <option value="Beauty & Health">Beauty & Health</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={bulkUpdates.status || ''}
                    onChange={(e) => setBulkUpdates(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                  >
                    <option value="">No change</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Price Adjustment (%)</label>
                  <input
                    type="number"
                    value={bulkUpdates.priceAdjustment || ''}
                    onChange={(e) => setBulkUpdates(prev => ({ ...prev, priceAdjustment: e.target.value }))}
                    placeholder="e.g., 10 for +10%, -5 for -5%"
                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={bulkUpdates.delivery || false}
                      onChange={(e) => setBulkUpdates(prev => ({ ...prev, delivery: e.target.checked }))}
                      className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-xs text-gray-700">Enable Delivery</span>
                  </label>
                </div>
              </div>
              <div className="mt-3 flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowBulkForm(false);
                    setBulkOperation('');
                    setBulkUpdates({});
                  }}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkOperation}
                  className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md text-sm"
                >
                  Update Products
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collections Display */}
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900">
          {collectionData.label} ({collections.summary.total} total products)
        </h3>
        
        {collectionData.items.map((collection) => (
          <div key={collection.name} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-medium text-gray-900">
                  {collection.name} ({collection.count})
                </h4>
                {collection.products.length > 0 && (
                  <button
                    onClick={() => handleSelectAll(collection.products)}
                    className="text-sm text-yellow-600 hover:text-yellow-700"
                  >
                    {collection.products.every(p => selectedProducts.includes(p.id)) ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>
            </div>
            
            {collection.products.length > 0 ? (
              <div className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {collection.products.map((product) => (
                    <div key={product.id} className="relative">
                      <div className="absolute top-2 left-2 z-10">
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.id)}
                          onChange={() => handleProductSelect(product.id)}
                          className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                        />
                      </div>
                      <ProductCard
                        product={product}
                        onEdit={() => onEdit(product)}
                        onDelete={() => onDelete(product.id)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                No products in this collection
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SmartCollections; 