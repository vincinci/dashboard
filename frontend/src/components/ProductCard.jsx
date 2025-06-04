import React from 'react';

const ProductCard = ({ product, onEdit, onDelete }) => {
  const formatPrice = (price) => {
    return `$${price.toFixed(2)}`;
  };

  const getStatusColor = (quantity) => {
    if (quantity === 0) return 'text-red-600 bg-red-50';
    if (quantity <= 10) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getStatusText = (quantity) => {
    if (quantity === 0) return 'Out of Stock';
    if (quantity <= 10) return 'Low Stock';
    return 'In Stock';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200">
      <div className="relative h-40 bg-gray-100 flex items-center justify-center">
        {product.images && product.images.length > 0 ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="text-gray-400">
            <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <span className={`absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(product.quantity)}`}>
          {getStatusText(product.quantity)}
        </span>
      </div>

      <div className="p-4">
        <div className="mb-2">
          <h4 className="font-medium text-gray-800 text-lg leading-tight">
            {product.name}
          </h4>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-gray-600">{product.category}</span>
          {product.delivery && (
            <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
              Delivery
            </span>
          )}
        </div>
        
        {product.description && (
          <p className="text-sm text-gray-700 mb-3 line-clamp-2">
            {product.description}
          </p>
        )}

        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-semibold text-blue-600">
            {formatPrice(product.price)}
          </span>
          <span className="text-sm text-gray-600">
            Qty: {product.quantity}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onEdit(product)}
            className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors duration-200"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(product.id)}
            className="flex-1 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-lg transition-colors duration-200"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard; 