import React, { useState, useEffect } from 'react';
import ImageUpload from './ImageUpload';

const ProductForm = ({ product, onSubmit, onCancel, isLimitReached }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    price: '',
    quantity: '',
    delivery: false,
    pickup: '',
    images: []
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const categories = [
    'Electronics',
    'Clothing Collection',
    'Food & Beverages',
    'Home & Garden',
    'Beauty & Health',
    'Books & Media',
    'Sports & Outdoors',
    'Toys & Games',
    'Automotive',
    'Services',
    'Smartphones',
    'Laptops'
  ];

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        category: product.category || '',
        description: product.description || '',
        price: product.price?.toString() || '',
        quantity: product.quantity?.toString() || '',
        delivery: product.delivery || false,
        pickup: product.pickup || '',
        images: product.images || []
      });
    }
  }, [product]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Product name must be at least 3 characters';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    const price = parseFloat(formData.price);
    if (!formData.price || price <= 0) {
      newErrors.price = 'Valid price is required';
    }

    const quantity = parseInt(formData.quantity);
    if (!formData.quantity || quantity < 0) {
      newErrors.quantity = 'Valid quantity is required';
    }

    if (!formData.delivery && !formData.pickup.trim()) {
      newErrors.pickup = 'Either delivery or pickup location must be specified';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const submitData = {
        ...formData,
        price: parseFloat(formData.price),
        quantity: parseInt(formData.quantity),
        pickup: formData.pickup.trim() || null
      };
      
      await onSubmit(submitData);
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleImagesChange = (newImages) => {
    setFormData(prev => ({
      ...prev,
      images: newImages
    }));
  };

  if (isLimitReached && !product) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full p-6 text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Product Limit Reached</h3>
          <p className="text-gray-600 mb-4">
            You've reached the maximum limit of 10 products. Please delete some products before adding new ones.
          </p>
          <button
            onClick={onCancel}
            className="w-full px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white">
      <form onSubmit={handleSubmit} className="flex flex-col divide-y divide-gray-200">
        {/* Header */}
        <div className="px-6 py-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              {product ? 'Edit Product' : 'Add New Product'}
            </h3>
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="px-6 py-5 flex-1 overflow-y-auto max-h-[calc(100vh-200px)]">
          <div className="space-y-6">
            {/* Product Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`mt-1 block w-full px-4 py-3 text-base rounded-md shadow-sm ${
                  errors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-yellow-500 focus:ring-yellow-500'
                }`}
                placeholder="Enter product name"
              />
              {errors.name && <p className="mt-2 text-sm text-red-600">{errors.name}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className={`mt-1 block w-full px-4 py-3 text-base rounded-md shadow-sm ${
                  errors.category ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-yellow-500 focus:ring-yellow-500'
                }`}
              >
                <option value="">Select a category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {errors.category && <p className="mt-2 text-sm text-red-600">{errors.category}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className={`mt-1 block w-full px-4 py-3 text-base rounded-md shadow-sm ${
                  errors.description ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-yellow-500 focus:ring-yellow-500'
                }`}
                placeholder="Describe your product..."
              />
              {errors.description && <p className="mt-2 text-sm text-red-600">{errors.description}</p>}
            </div>

            {/* Price and Quantity */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price (RWF) *
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  min="0"
                  step="1"
                  className={`mt-1 block w-full px-4 py-3 text-base rounded-md shadow-sm ${
                    errors.price ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-yellow-500 focus:ring-yellow-500'
                  }`}
                  placeholder="0"
                />
                {errors.price && <p className="mt-2 text-sm text-red-600">{errors.price}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity *
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  min="0"
                  step="1"
                  className={`mt-1 block w-full px-4 py-3 text-base rounded-md shadow-sm ${
                    errors.quantity ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-yellow-500 focus:ring-yellow-500'
                  }`}
                  placeholder="0"
                />
                {errors.quantity && <p className="mt-2 text-sm text-red-600">{errors.quantity}</p>}
              </div>
            </div>

            {/* Delivery Options */}
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="delivery"
                  checked={formData.delivery}
                  onChange={handleChange}
                  className="h-5 w-5 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                />
                <label className="ml-3 block text-base text-gray-700">
                  Offers Delivery
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pickup Location
                </label>
                <input
                  type="text"
                  name="pickup"
                  value={formData.pickup}
                  onChange={handleChange}
                  className={`mt-1 block w-full px-4 py-3 text-base rounded-md shadow-sm ${
                    errors.pickup ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-yellow-500 focus:ring-yellow-500'
                  }`}
                  placeholder="Enter pickup location"
                />
                {errors.pickup && <p className="mt-2 text-sm text-red-600">{errors.pickup}</p>}
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Product Images
              </label>
              <div className="mt-1">
                <ImageUpload
                  images={formData.images}
                  onChange={handleImagesChange}
                  maxImages={5}
                />
              </div>
            </div>

            {errors.submit && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="px-6 py-4 bg-gray-50">
          <div className="flex flex-row-reverse gap-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
            >
              {loading ? 'Processing...' : product ? 'Save Changes' : 'Add Product'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ProductForm; 