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
    images: [],
    sizes: [],
    colors: []
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const categories = [
    'Electronics',
    'Clothing',
    'Shoes',
    'Accessories',
    'Food',
    'Home',
    'Beauty',
    'Books',
    'Sports',
    'Toys',
    'Other'
  ];

  // Categories that typically have size/color variants
  const variantCategories = ['Clothing', 'Shoes', 'Accessories'];
  
  // Common sizes for different categories
  const commonSizes = {
    'Clothing': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    'Shoes': ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'],
    'Accessories': ['One Size', 'S', 'M', 'L']
  };

  // Common colors
  const commonColors = [
    'Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Purple', 
    'Pink', 'Brown', 'Gray', 'Navy', 'Maroon', 'Beige', 'Khaki'
  ];

  useEffect(() => {
    if (product) {
      // Parse sizes and colors if they exist as JSON strings
      let parsedSizes = [];
      let parsedColors = [];
      
      try {
        if (product.sizes && typeof product.sizes === 'string') {
          parsedSizes = JSON.parse(product.sizes);
        } else if (Array.isArray(product.sizes)) {
          parsedSizes = product.sizes;
        }
      } catch (e) {
        console.warn('Failed to parse sizes:', product.sizes);
      }
      
      try {
        if (product.colors && typeof product.colors === 'string') {
          parsedColors = JSON.parse(product.colors);
        } else if (Array.isArray(product.colors)) {
          parsedColors = product.colors;
        }
      } catch (e) {
        console.warn('Failed to parse colors:', product.colors);
      }
      
      setFormData({
        name: product.name || '',
        category: product.category || '',
        description: product.description || '',
        price: product.price?.toString() || '',
        quantity: product.quantity?.toString() || '',
        delivery: product.delivery || false,
        pickup: product.pickup || '',
        images: product.images || [],
        sizes: parsedSizes,
        colors: parsedColors
      });
    }
  }, [product]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
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
        pickup: formData.pickup.trim() || null,
        sizes: formData.sizes.length > 0 ? JSON.stringify(formData.sizes) : null,
        colors: formData.colors.length > 0 ? JSON.stringify(formData.colors) : null
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

  const handleSizeToggle = (size) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size) 
        ? prev.sizes.filter(s => s !== size)
        : [...prev.sizes, size]
    }));
  };

  const handleColorToggle = (color) => {
    setFormData(prev => ({
      ...prev,
      colors: prev.colors.includes(color) 
        ? prev.colors.filter(c => c !== color)
        : [...prev.colors, color]
    }));
  };

  const shouldShowVariants = () => {
    return variantCategories.includes(formData.category);
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

        {errors.submit && (
          <div className="px-6 py-4 bg-red-50 border-b border-red-200">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        <div className="px-6 py-6 space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter product name"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.category ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select a category</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter product description"
            />
            {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                Price (RWF) *
              </label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                step="0.01"
                min="0"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.price ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
              {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price}</p>}
            </div>

            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                min="0"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.quantity ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0"
              />
              {errors.quantity && <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>}
            </div>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="delivery"
                checked={formData.delivery}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Delivery Available</span>
            </label>
          </div>

          <div>
            <label htmlFor="pickup" className="block text-sm font-medium text-gray-700 mb-1">
              Pickup Location {!formData.delivery && '*'}
            </label>
            <input
              type="text"
              id="pickup"
              name="pickup"
              value={formData.pickup}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.pickup ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter pickup location"
            />
            {errors.pickup && <p className="mt-1 text-sm text-red-600">{errors.pickup}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Images
            </label>
            <ImageUpload
              images={formData.images}
              onChange={handleImagesChange}
              maxImages={5}
            />
          </div>

          {/* Size and Color Variants */}
          {shouldShowVariants() && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Sizes
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {commonSizes[formData.category]?.map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => handleSizeToggle(size)}
                      className={`px-3 py-2 text-sm border rounded-lg transition-colors ${
                        formData.sizes.includes(size)
                          ? 'bg-yellow-600 text-white border-yellow-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                {formData.sizes.length > 0 && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected: {formData.sizes.join(', ')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Colors
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {commonColors.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleColorToggle(color)}
                      className={`px-3 py-2 text-sm border rounded-lg transition-colors ${
                        formData.colors.includes(color)
                          ? 'bg-yellow-600 text-white border-yellow-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
                {formData.colors.length > 0 && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected: {formData.colors.join(', ')}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 border border-transparent rounded-lg hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50"
          >
            {loading ? 'Saving...' : (product ? 'Update Product' : 'Add Product')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm; 