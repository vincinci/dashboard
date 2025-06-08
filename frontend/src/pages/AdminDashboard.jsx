import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import Logo from '../components/Logo';
import ConfirmationModal from '../components/ConfirmationModal';
import API_CONFIG from '../config/api';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showUserDeleteModal, setShowUserDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showProductDeleteModal, setShowProductDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(API_CONFIG.getURL('/admin/users'));
      setUsers(response.data.users);
    } catch (error) {
      setError('Failed to fetch users');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(API_CONFIG.getURL('/admin/products'));
      setProducts(response.data.products);
    } catch (error) {
      setError('Failed to fetch products');
    }
  };

  useEffect(() => {
    if (user && !user.isAdmin) {
      window.location.href = '/dashboard';
      return;
    }
    
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchProducts()]);
      setLoading(false);
    };
    
    loadData();
  }, [user]);

  const handleExport = async () => {
    try {
      setError('');
      setSuccess('');
      
      const response = await axios.get(API_CONFIG.getURL('/admin/export'), {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setSuccess('Standard CSV export downloaded successfully!');
    } catch (error) {
      setError('Export failed');
    }
  };

  const handleShopifyExport = async () => {
    try {
      setError('');
      setSuccess('');
      
      const response = await axios.get(API_CONFIG.getURL('/admin/export-shopify'), {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `shopify-export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setSuccess('Shopify-compatible CSV exported successfully! Ready to import into Shopify Products section.');
    } catch (error) {
      setError('Shopify export failed');
    }
  };

  const deleteUser = async (userId) => {
    try {
      await axios.delete(API_CONFIG.getURL(`/admin/users/${userId}`));
      setUsers(users.filter(u => u.id !== userId));
      setShowUserDeleteModal(false);
      setUserToDelete(null);
      setSuccess('User deleted successfully!');
      setError('');
    } catch (error) {
      setError('Failed to delete user');
      setSuccess('');
    }
  };

  const deleteProduct = async (productId) => {
    try {
      await axios.delete(API_CONFIG.getURL(`/admin/products/${productId}`));
      setProducts(products.filter(p => p.id !== productId));
      setShowProductDeleteModal(false);
      setProductToDelete(null);
      setSuccess('Product deleted successfully!');
      setError('');
    } catch (error) {
      setError('Failed to delete product');
      setSuccess('');
    }
  };

  // Clear messages when switching tabs
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError('');
    setSuccess('');
  };

  // Auto-clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-2">Access Denied</h1>
          <p>Admin access required</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Logo size="default" />
              <h1 className="ml-3 text-xl font-bold">Admin Panel</h1>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleExport}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
                title="Export basic product data as CSV"
              >
                <span>📊</span>
                <span>Export CSV</span>
              </button>
              <button
                onClick={handleShopifyExport}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
                title="Export Shopify-compatible CSV with all required fields for direct import"
              >
                <span>🛍️</span>
                <span>Shopify Export</span>
              </button>
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="bg-red-50 text-red-700 px-3 py-2 rounded text-sm">
            {error}
          </div>
        </div>
      )}

      {success && (
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="bg-green-50 text-green-700 px-3 py-2 rounded text-sm">
            {success}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="border-b">
          <nav className="flex space-x-6">
            {[
              { id: 'overview', name: 'Overview' },
              { id: 'users', name: 'Users' },
              { id: 'products', name: 'Products' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`py-2 px-1 border-b-2 text-sm font-medium ${
                  activeTab === tab.id
                    ? 'border-yellow-500 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="mt-4">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded shadow-sm">
                <h3 className="font-medium text-gray-900">Users</h3>
                <p className="text-2xl font-bold text-blue-600">{users.length}</p>
              </div>
              <div className="bg-white p-4 rounded shadow-sm">
                <h3 className="font-medium text-gray-900">Products</h3>
                <p className="text-2xl font-bold text-green-600">{products.length}</p>
              </div>
              <div className="bg-white p-4 rounded shadow-sm">
                <h3 className="font-medium text-gray-900">Admins</h3>
                <p className="text-2xl font-bold text-yellow-600">
                  {users.filter(u => u.isAdmin).length}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-white rounded shadow-sm">
              <div className="px-4 py-3 border-b">
                <h3 className="font-medium">Users ({users.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Products</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-4 py-2">
                          <div>
                            <p className="text-sm font-medium">{user.displayName}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm">{user.businessName || 'N/A'}</td>
                        <td className="px-4 py-2 text-sm">{user.totalProducts || 0}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            user.isAdmin ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.isAdmin ? 'Admin' : 'User'}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          {!user.isAdmin && (
                            <button
                              onClick={() => {
                                setUserToDelete(user);
                                setShowUserDeleteModal(true);
                              }}
                              className="text-red-600 hover:text-red-800 text-xs"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="bg-white rounded shadow-sm">
              <div className="px-4 py-3 border-b">
                <h3 className="font-medium">Products ({products.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {products.map((product) => (
                      <tr key={product.id}>
                        <td className="px-4 py-2">
                          <div>
                            <p className="text-sm font-medium">{product.name}</p>
                            <p className="text-xs text-gray-500">{product.category}</p>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <p className="text-sm">{product.vendor.displayName}</p>
                          <p className="text-xs text-gray-500">{product.vendor.email}</p>
                        </td>
                        <td className="px-4 py-2 text-sm">RWF {product.price.toLocaleString()}</td>
                        <td className="px-4 py-2 text-sm">{product.quantity}</td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => {
                              setProductToDelete(product);
                              setShowProductDeleteModal(true);
                            }}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showUserDeleteModal && (
        <ConfirmationModal
          isOpen={showUserDeleteModal}
          onClose={() => {
            setShowUserDeleteModal(false);
            setUserToDelete(null);
          }}
          onConfirm={() => deleteUser(userToDelete.id)}
          title="Delete User"
          message={`Delete "${userToDelete?.displayName}"?`}
          confirmText="DELETE"
          confirmButtonText="Delete"
        />
      )}

      {showProductDeleteModal && (
        <ConfirmationModal
          isOpen={showProductDeleteModal}
          onClose={() => {
            setShowProductDeleteModal(false);
            setProductToDelete(null);
          }}
          onConfirm={() => deleteProduct(productToDelete.id)}
          title="Delete Product"
          message={`Delete "${productToDelete?.name}"?`}
          confirmText="DELETE"
          confirmButtonText="Delete"
        />
      )}
    </div>
  );
};

export default AdminDashboard; 