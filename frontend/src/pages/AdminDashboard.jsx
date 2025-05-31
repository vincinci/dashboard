import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import Logo from '../components/Logo';
import DocumentViewer from '../components/DocumentViewer';
import DeliveryAddressViewer from '../components/DeliveryAddressViewer';
import ConfirmationModal from '../components/ConfirmationModal';
import AdminShopifyIntegration from '../components/AdminShopifyIntegration';
import API_CONFIG from '../config/api';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [showDeliveryAddressViewer, setShowDeliveryAddressViewer] = useState(false);
  const [selectedUserForAddress, setSelectedUserForAddress] = useState(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showShopifyIntegration, setShowShopifyIntegration] = useState(false);

  // Format price in RWF
  const formatRWF = (price) => {
    return new Intl.NumberFormat('rw-RW', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(API_CONFIG.getURL('/admin/stats'), {
        timeout: API_CONFIG.TIMEOUT
      });
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      const errorMsg = error.code === 'ECONNREFUSED' || error.message.includes('Network Error') 
        ? `Cannot connect to server at ${API_CONFIG.getBaseURL()}` 
        : 'Failed to fetch statistics';
      setError(errorMsg);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(API_CONFIG.getURL('/admin/users'), {
        timeout: API_CONFIG.TIMEOUT
      });
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      const errorMsg = error.code === 'ECONNREFUSED' || error.message.includes('Network Error')
        ? `Cannot connect to server at ${API_CONFIG.getBaseURL()}`
        : 'Failed to fetch users';
      setError(errorMsg);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(API_CONFIG.getURL('/admin/products'), {
        timeout: API_CONFIG.TIMEOUT
      });
      setProducts(response.data.products);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching products:', error);
      const errorMsg = error.code === 'ECONNREFUSED' || error.message.includes('Network Error')
        ? `Cannot connect to server at ${API_CONFIG.getBaseURL()}`
        : 'Failed to fetch products';
      setError(errorMsg);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && !user.isAdmin) {
      // Redirect non-admin users
      window.location.href = '/dashboard';
      return;
    }
    
    const loadData = async () => {
      setLoading(true);
      setError('');
      
      // Fetch all data sequentially to avoid overwhelming the server
      try {
        await fetchStats();
        await fetchUsers();
        await fetchProducts();
      } catch (error) {
        console.error('Error loading admin data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user]);

  const handleExport = async () => {
    try {
      const response = await axios.get(API_CONFIG.getURL('/admin/export'), {
        responseType: 'blob',
        timeout: 30000 // Longer timeout for export
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.setAttribute('download', `iwanyu_complete_export_${timestamp}.csv`);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      const errorMsg = error.code === 'ECONNREFUSED' || error.message.includes('Network Error')
        ? `Cannot connect to server at ${API_CONFIG.getBaseURL()}`
        : 'Failed to export data';
      setError(errorMsg);
    }
  };

  const makeUserAdmin = async (userId) => {
    try {
      await axios.post(API_CONFIG.getURL('/admin/make-admin'), { userId }, {
        timeout: API_CONFIG.TIMEOUT
      });
      fetchUsers(); // Refresh users list
      alert('User promoted to admin successfully!');
    } catch (error) {
      console.error('Error promoting user:', error);
      const errorMsg = error.code === 'ECONNREFUSED' || error.message.includes('Network Error')
        ? `Cannot connect to server at ${API_CONFIG.getBaseURL()}`
        : 'Failed to promote user to admin';
      setError(errorMsg);
    }
  };

  const verifyDocuments = async (userId) => {
    try {
      await axios.post(API_CONFIG.getURL('/admin/verify-documents'), { userId }, {
        timeout: API_CONFIG.TIMEOUT
      });
      fetchUsers(); // Refresh users list
      setError('');
      alert('Documents verified successfully!');
    } catch (error) {
      console.error('Error verifying documents:', error);
      const errorMsg = error.code === 'ECONNREFUSED' || error.message.includes('Network Error')
        ? `Cannot connect to server at ${API_CONFIG.getBaseURL()}`
        : 'Failed to verify documents';
      setError(errorMsg);
    }
  };

  const rejectDocuments = async (userId) => {
    try {
      await axios.post(API_CONFIG.getURL('/admin/reject-documents'), { userId }, {
        timeout: API_CONFIG.TIMEOUT
      });
      fetchUsers(); // Refresh users list
      setError('');
      alert('Documents rejected successfully!');
    } catch (error) {
      console.error('Error rejecting documents:', error);
      const errorMsg = error.code === 'ECONNREFUSED' || error.message.includes('Network Error')
        ? `Cannot connect to server at ${API_CONFIG.getBaseURL()}`
        : 'Failed to reject documents';
      setError(errorMsg);
    }
  };

  const viewDocuments = (userId) => {
    setSelectedUserId(userId);
    setShowDocumentViewer(true);
  };

  const closeDocumentViewer = () => {
    setShowDocumentViewer(false);
    setSelectedUserId(null);
  };

  const viewDeliveryAddress = (user) => {
    setSelectedUserForAddress(user);
    setShowDeliveryAddressViewer(true);
  };

  const closeDeliveryAddressViewer = () => {
    setShowDeliveryAddressViewer(false);
    setSelectedUserForAddress(null);
  };

  const removeUser = async (userId, userName) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to remove "${userName}"?\n\nThis action will:\n- Delete the user account permanently\n- Delete all their products\n- Cannot be undone\n\nType "DELETE" to confirm this action.`
    );
    
    if (!confirmed) {
      return;
    }

    // Additional confirmation for safety
    const confirmText = window.prompt(
      `To confirm deletion of "${userName}", please type "DELETE" (in capital letters):`
    );
    
    if (confirmText !== 'DELETE') {
      alert('Deletion cancelled. User not removed.');
      return;
    }

    try {
      await axios.delete(API_CONFIG.getURL(`/admin/users/${userId}`), {
        timeout: API_CONFIG.TIMEOUT
      });
      
      // Refresh users list after successful deletion
      fetchUsers();
      setError('');
      alert(`User "${userName}" has been successfully removed.`);
    } catch (error) {
      console.error('Error removing user:', error);
      const errorMsg = error.response?.data?.error || 
        (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')
          ? `Cannot connect to server at ${API_CONFIG.getBaseURL()}`
          : 'Failed to remove user');
      setError(errorMsg);
    }
  };

  const handleRemoveUser = async () => {
    if (!userToDelete) return;

    try {
      await axios.delete(API_CONFIG.getURL(`/admin/users/${userToDelete.id}`), {
        timeout: API_CONFIG.TIMEOUT
      });
      
      // Refresh users list after successful deletion
      fetchUsers();
      setError('');
    } catch (error) {
      console.error('Error removing user:', error);
      const errorMsg = error.response?.data?.error || 
        (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')
          ? `Cannot connect to server at ${API_CONFIG.getBaseURL()}`
          : 'Failed to remove user');
      setError(errorMsg);
      throw error; // Re-throw to let modal handle the error state
    }
  };

  if (!user || !user.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Logo size="medium" className="mr-4" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-500">Welcome, {user.displayName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleExport}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Export All Data
              </button>
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview' },
              { id: 'users', name: 'Users' },
              { id: 'products', name: 'Products' },
              { id: 'shopify', name: 'Shopify' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-yellow-500 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Stats Cards */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900">Total Users</h3>
                <p className="text-3xl font-bold text-blue-600">{stats?.totalUsers || 0}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900">Total Products</h3>
                <p className="text-3xl font-bold text-green-600">{stats?.totalProducts || 0}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900">Admin Users</h3>
                <p className="text-3xl font-bold text-yellow-600">{stats?.totalAdmins || 0}</p>
              </div>

              {/* Recent Users */}
              <div className="bg-white p-6 rounded-lg shadow md:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Users</h3>
                <div className="space-y-3">
                  {stats?.recentUsers?.map((user) => (
                    <div key={user.id} className="flex justify-between items-center border-b pb-2">
                      <div>
                        <p className="font-medium">{user.displayName}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <p className="text-xs text-gray-400">{user.businessName}</p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Products */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Products</h3>
                <div className="space-y-3">
                  {stats?.recentProducts?.map((product) => (
                    <div key={product.id} className="border-b pb-2">
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.vendor.displayName}</p>
                      <p className="text-xs text-green-600">{formatRWF(product.price)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">All Users ({users.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery Address</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documents</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{user.displayName}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                            <p className="text-xs text-gray-400">{user.phoneNumber}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm text-gray-900">{user.businessName || 'N/A'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-xs">
                            {user.businessAddress ? (
                              <div className="flex items-start space-x-2">
                                <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <div>
                                  <p className="text-sm text-gray-900 break-words">{user.businessAddress}</p>
                                  <span className="inline-flex px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 mt-1">
                                    Available for delivery
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span className="text-sm text-gray-500">No delivery address</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.totalProducts}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="space-y-1">
                            <span className={`inline-flex px-2 py-1 text-xs rounded-full ${user.hasNationalId ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              ID: {user.hasNationalId ? 'Yes' : 'No'}
                            </span>
                            <br />
                            <span className={`inline-flex px-2 py-1 text-xs rounded-full ${user.hasBusinessRegistration ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                              Reg: {user.hasBusinessRegistration ? 'Yes' : 'No'}
                            </span>
                            <br />
                            <span className={`inline-flex px-2 py-1 text-xs rounded-full ${user.documentsVerified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              Verified: {user.documentsVerified ? 'Yes' : 'No'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs rounded-full ${user.isAdmin ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                            {user.isAdmin ? 'Admin' : 'Vendor'}
                          </span>
                          <br />
                          <span className={`inline-flex px-2 py-1 text-xs rounded-full mt-1 ${user.legalDeclaration ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            Legal: {user.legalDeclaration ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="space-y-2">
                            {/* View Documents button - always visible */}
                            <div>
                              <button
                                onClick={() => viewDocuments(user.id)}
                                className="inline-flex items-center text-blue-600 hover:text-blue-900 text-xs font-medium"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                View Documents
                              </button>
                            </div>

                            {/* View Address button - always visible */}
                            <div>
                              <button
                                onClick={() => viewDeliveryAddress(user)}
                                className="inline-flex items-center text-purple-600 hover:text-purple-900 text-xs font-medium"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                View Address
                              </button>
                            </div>
                            
                            {/* Admin actions - only for non-admin users */}
                            {!user.isAdmin && (
                              <div className="space-y-1">
                                <div>
                                  <button
                                    onClick={() => makeUserAdmin(user.id)}
                                    className="inline-flex items-center text-yellow-600 hover:text-yellow-900 text-xs font-medium"
                                  >
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                    </svg>
                                    Make Admin
                                  </button>
                                </div>
                                
                                {/* Document Verification Actions */}
                                <div className="flex flex-col space-y-1">
                                  {!user.documentsVerified ? (
                                    <>
                                      <button
                                        onClick={() => verifyDocuments(user.id)}
                                        className="inline-flex items-center text-green-600 hover:text-green-900 text-xs font-medium"
                                      >
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Verify Documents
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <span className="inline-flex items-center text-green-700 text-xs font-medium">
                                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Verified
                                      </span>
                                    </>
                                  )}
                                  <button
                                    onClick={() => rejectDocuments(user.id)}
                                    className="inline-flex items-center text-red-600 hover:text-red-900 text-xs font-medium"
                                  >
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Reject Documents
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Remove User button - only for non-admin users */}
                            {!user.isAdmin && (
                              <div className="pt-2 border-t border-gray-200 mt-2">
                                <button
                                  onClick={() => {
                                    setUserToDelete({ id: user.id, displayName: user.displayName });
                                    setShowConfirmationModal(true);
                                  }}
                                  className="inline-flex items-center text-red-700 hover:text-red-900 hover:bg-red-50 text-xs font-medium px-2 py-1 rounded border border-red-200 hover:border-red-300 transition-all"
                                >
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Remove User
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">All Products ({products.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product) => (
                      <tr key={product.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{product.name}</p>
                            <p className="text-sm text-gray-500">{product.category}</p>
                            <p className="text-xs text-gray-400">{product.description.substring(0, 50)}...</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm text-gray-900">{product.vendor.displayName}</p>
                            <p className="text-xs text-gray-500">{product.vendor.businessName}</p>
                            <p className="text-xs text-gray-400">{product.vendor.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatRWF(product.price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {product.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs rounded-full ${product.delivery ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {product.delivery ? 'Yes' : 'No'}
                          </span>
                          {product.pickup && (
                            <p className="text-xs text-gray-500 mt-1">Pickup: {product.pickup}</p>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(product.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'shopify' && (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Shopify Integration</h3>
                <p className="text-gray-600 mb-6">
                  Manage product verification and sync approved vendor products to your Shopify store.
                </p>
                <button
                  onClick={() => setShowShopifyIntegration(true)}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  🛍️ Open Shopify Management
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showDocumentViewer && (
        <DocumentViewer
          userId={selectedUserId}
          onClose={closeDocumentViewer}
        />
      )}

      {showDeliveryAddressViewer && (
        <DeliveryAddressViewer
          user={selectedUserForAddress}
          onClose={closeDeliveryAddressViewer}
        />
      )}

      {showConfirmationModal && (
        <ConfirmationModal
          isOpen={showConfirmationModal}
          onClose={() => {
            setShowConfirmationModal(false);
            setUserToDelete(null);
          }}
          onConfirm={handleRemoveUser}
          title="Remove User"
          message={`Are you sure you want to remove "${userToDelete?.displayName}"?`}
          confirmText="DELETE"
          confirmButtonText="Remove User"
        />
      )}

      {showShopifyIntegration && (
        <AdminShopifyIntegration
          onClose={() => setShowShopifyIntegration(false)}
        />
      )}
    </div>
  );
};

export default AdminDashboard; 