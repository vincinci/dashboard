import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_CONFIG from '../config/api';

const ShopifyIntegration = ({ onClose, selectedProducts = [] }) => {
  const [shopifyConnection, setShopifyConnection] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connectionForm, setConnectionForm] = useState({
    shopifyStoreUrl: '',
    accessToken: ''
  });
  const [syncResults, setSyncResults] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const response = await axios.get(API_CONFIG.getURL('/shopify/connection'), {
        timeout: API_CONFIG.TIMEOUT
      });
      
      if (response.data.connected) {
        setShopifyConnection(response.data.connection);
      }
    } catch (error) {
      console.error('Error checking Shopify connection:', error);
    }
  };

  const handleConnect = async () => {
    if (!connectionForm.shopifyStoreUrl || !connectionForm.accessToken) {
      setError('Please provide both store URL and access token');
      return;
    }

    setConnecting(true);
    setError('');
    setSuccess('');

    try {
      // Clean up the store URL (remove https:// if present, ensure .myshopify.com)
      let storeUrl = connectionForm.shopifyStoreUrl.trim();
      storeUrl = storeUrl.replace(/^https?:\/\//, '');
      if (!storeUrl.includes('.myshopify.com')) {
        storeUrl = `${storeUrl}.myshopify.com`;
      }

      const response = await axios.post(
        API_CONFIG.getURL('/shopify/connect'),
        {
          shopifyStoreUrl: storeUrl,
          accessToken: connectionForm.accessToken.trim()
        },
        { timeout: API_CONFIG.TIMEOUT }
      );

      setShopifyConnection(response.data.connection);
      setSuccess('Successfully connected to Shopify!');
      setConnectionForm({ shopifyStoreUrl: '', accessToken: '' });
    } catch (error) {
      console.error('Error connecting to Shopify:', error);
      setError(error.response?.data?.error || 'Failed to connect to Shopify');
    } finally {
      setConnecting(false);
    }
  };

  const handleSyncProducts = async () => {
    setSyncing(true);
    setError('');
    setSuccess('');
    setSyncResults(null);

    try {
      const requestData = {};
      if (selectedProducts.length > 0) {
        requestData.productIds = selectedProducts;
      }

      const response = await axios.post(
        API_CONFIG.getURL('/shopify/sync-products'),
        requestData,
        { timeout: 60000 } // 60 seconds for sync
      );

      setSyncResults(response.data.results);
      setSuccess(response.data.message);
    } catch (error) {
      console.error('Error syncing products:', error);
      setError(error.response?.data?.error || 'Failed to sync products to Shopify');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect from Shopify?')) {
      return;
    }

    try {
      await axios.delete(API_CONFIG.getURL('/shopify/disconnect'), {
        timeout: API_CONFIG.TIMEOUT
      });
      
      setShopifyConnection(null);
      setSuccess('Successfully disconnected from Shopify');
    } catch (error) {
      console.error('Error disconnecting from Shopify:', error);
      setError('Failed to disconnect from Shopify');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-50">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">🛍️</span>
                  Shopify Integration
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

                {/* Connection Status */}
                {shopifyConnection ? (
                  <div className="mb-6">
                    <div className="bg-green-50 border border-green-200 rounded-md p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-green-800 mb-2">
                            ✅ Connected to Shopify
                          </h4>
                          <p className="text-sm text-green-700">
                            Store: <span className="font-medium">{shopifyConnection.storeUrl}</span>
                          </p>
                          <p className="text-sm text-green-600 mt-1">
                            Last sync: {formatDate(shopifyConnection.lastSyncAt)}
                          </p>
                        </div>
                        <button
                          onClick={handleDisconnect}
                          className="px-3 py-1 text-sm border border-red-300 text-red-700 rounded-md hover:bg-red-50"
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>

                    {/* Sync Section */}
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">
                            Sync Products to Shopify
                          </h4>
                          <p className="text-sm text-gray-500">
                            {selectedProducts.length > 0 
                              ? `Sync ${selectedProducts.length} selected product(s)`
                              : 'Sync all your products to your Shopify store'
                            }
                          </p>
                        </div>
                        <button
                          onClick={handleSyncProducts}
                          disabled={syncing}
                          className={`px-4 py-2 rounded-md text-sm font-medium ${
                            syncing
                              ? 'bg-gray-400 text-white cursor-not-allowed'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                        >
                          {syncing ? 'Syncing...' : '🔄 Sync Products'}
                        </button>
                      </div>

                      {/* Sync Results */}
                      {syncResults && (
                        <div className="mt-4">
                          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                            <h5 className="text-sm font-medium text-blue-800 mb-2">
                              Sync Results
                            </h5>
                            <div className="text-sm text-blue-700">
                              <p>✅ Successfully synced: {syncResults.success}</p>
                              <p>❌ Errors: {syncResults.errors.length}</p>
                            </div>

                            {syncResults.synced.length > 0 && (
                              <div className="mt-3">
                                <h6 className="text-xs font-medium text-blue-800 mb-1">
                                  Synced Products:
                                </h6>
                                <div className="max-h-32 overflow-auto">
                                  {syncResults.synced.slice(0, 10).map((item, index) => (
                                    <p key={index} className="text-xs text-blue-600">
                                      • {item.productName} ({item.action})
                                    </p>
                                  ))}
                                  {syncResults.synced.length > 10 && (
                                    <p className="text-xs text-blue-600 mt-1">
                                      ... and {syncResults.synced.length - 10} more
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            {syncResults.errors.length > 0 && (
                              <div className="mt-3">
                                <h6 className="text-xs font-medium text-red-800 mb-1">
                                  Errors:
                                </h6>
                                <div className="max-h-32 overflow-auto">
                                  {syncResults.errors.slice(0, 5).map((error, index) => (
                                    <p key={index} className="text-xs text-red-600">
                                      • {error.productName}: {error.error}
                                    </p>
                                  ))}
                                  {syncResults.errors.length > 5 && (
                                    <p className="text-xs text-red-600 mt-1">
                                      ... and {syncResults.errors.length - 5} more errors
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Connection Form */
                  <div>
                    <div className="mb-6">
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                        <h4 className="text-sm font-medium text-blue-800 mb-2">
                          🔗 Connect Your Shopify Store
                        </h4>
                        <p className="text-sm text-blue-700">
                          To sync your products to Shopify, you'll need:
                        </p>
                        <ul className="text-xs text-blue-600 mt-2 ml-4 list-disc">
                          <li>Your Shopify store URL (e.g., mystore.myshopify.com)</li>
                          <li>A private app access token with product read/write permissions</li>
                        </ul>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Shopify Store URL
                          </label>
                          <input
                            type="text"
                            value={connectionForm.shopifyStoreUrl}
                            onChange={(e) => setConnectionForm(prev => ({ 
                              ...prev, 
                              shopifyStoreUrl: e.target.value 
                            }))}
                            placeholder="mystore.myshopify.com"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Access Token
                          </label>
                          <input
                            type="password"
                            value={connectionForm.accessToken}
                            onChange={(e) => setConnectionForm(prev => ({ 
                              ...prev, 
                              accessToken: e.target.value 
                            }))}
                            placeholder="shpat_xxxxxxxxxxxxxxxxxxxxx"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <button
                          onClick={handleConnect}
                          disabled={connecting || !connectionForm.shopifyStoreUrl || !connectionForm.accessToken}
                          className={`w-full py-2 px-4 rounded-md text-sm font-medium ${
                            connecting || !connectionForm.shopifyStoreUrl || !connectionForm.accessToken
                              ? 'bg-gray-400 text-white cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {connecting ? 'Connecting...' : 'Connect to Shopify'}
                        </button>
                      </div>

                      {/* Instructions */}
                      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
                        <h5 className="text-sm font-medium text-yellow-800 mb-2">
                          📋 How to get your Access Token:
                        </h5>
                        <ol className="text-xs text-yellow-700 space-y-1 ml-4 list-decimal">
                          <li>Go to your Shopify admin → Apps → Develop apps</li>
                          <li>Create a private app or edit an existing one</li>
                          <li>Configure scopes: <code className="bg-yellow-100 px-1">write_products, read_products</code></li>
                          <li>Generate and copy the Admin API access token</li>
                          <li>Paste the token above to connect</li>
                        </ol>
                      </div>
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
    </div>
  );
};

export default ShopifyIntegration; 