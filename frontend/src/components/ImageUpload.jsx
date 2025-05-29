import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import API_CONFIG from '../config/api';

const ImageUpload = ({ images, onChange, maxImages = 5 }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const { isAuthenticated, token } = useAuth();

  const handleFiles = async (files) => {
    const fileArray = Array.from(files);
    setError('');
    
    // Check if user is authenticated
    if (!isAuthenticated) {
      setError('You must be logged in to upload images');
      return;
    }
    
    // Check file count limit
    if (images.length + fileArray.length > maxImages) {
      setError(`Maximum ${maxImages} images allowed. You can add ${maxImages - images.length} more.`);
      return;
    }

    // Validate file types and sizes
    const validFiles = fileArray.filter(file => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (!validTypes.includes(file.type)) {
        setError(`${file.name} is not a valid image format. Please use JPEG, PNG, GIF, or WebP.`);
        return false;
      }

      if (file.size > maxSize) {
        setError(`${file.name} is too large. Maximum file size is 10MB.`);
        return false;
      }

      return true;
    });

    if (validFiles.length === 0) return;

    try {
      setUploading(true);
      setError('');

      // Convert files to base64 and upload
      const uploadedUrls = [];
      for (const file of validFiles) {
        try {
          // Convert file to base64
          const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          // Get upload token - try context first, then localStorage, then axios
          const contextToken = token;
          const tokenFromStorage = localStorage.getItem('authToken');
          const tokenFromAxios = axios.defaults.headers.common['Authorization']?.replace('Bearer ', '');
          const finalToken = contextToken || tokenFromStorage || tokenFromAxios;
          
          if (!finalToken) {
            throw new Error('Authentication token not found. Please log in again.');
          }

          // Upload to backend
          const response = await axios.post(API_CONFIG.getURL('/upload/image'), {
            image: base64,
            filename: file.name
          }, {
            headers: { 
              Authorization: `Bearer ${finalToken}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000 // Longer timeout for large files
          });

          uploadedUrls.push(response.data.imageUrl);
        } catch (err) {
          console.error('Failed to upload file:', file.name, err);
          const errorMsg = err.response?.data?.message || err.message;
          setError(`Failed to upload ${file.name}: ${errorMsg}`);
        }
      }

      if (uploadedUrls.length > 0) {
        const newImages = [...images, ...uploadedUrls];
        onChange(newImages);
      }

    } catch (error) {
      console.error('Upload error:', error);
      const errorMsg = error.code === 'ECONNREFUSED' || error.message.includes('Network Error')
        ? `Cannot connect to server at ${API_CONFIG.getBaseURL()}`
        : error.response?.data?.error || 'Failed to upload images. Please try again.';
      setError(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files?.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveImage = async (indexToRemove) => {
    const imageToRemove = images[indexToRemove];
    
    // Only delete from server if it's an uploaded file (contains /uploads/)
    if (imageToRemove.includes('/uploads/')) {
      try {
        // Get the token from localStorage
        const token = localStorage.getItem('authToken') || axios.defaults.headers.common['Authorization']?.replace('Bearer ', '');
        if (!token) {
          throw new Error('Authentication token not found. Please log in again.');
        }

        // Extract the relative path from the full URL
        const urlObject = new URL(imageToRemove);
        const imageUrl = urlObject.pathname;

        await axios.delete(`${API_CONFIG.getBaseURL()}/upload/image`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          data: { imageUrl }
        });
      } catch (error) {
        console.error('Failed to delete image from server:', error);
        alert('Failed to delete image. Please try again.');
      }
    }

    // Remove from local state
    const newImages = images.filter((_, index) => index !== indexToRemove);
    onChange(newImages);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 ${
          dragActive ? 'border-yellow-500 bg-yellow-50' : 'border-gray-300 hover:border-yellow-500'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="mt-4 flex text-sm text-gray-600">
            <label className="relative cursor-pointer rounded-md font-medium text-yellow-600 hover:text-yellow-500">
              <span>{uploading ? 'Uploading...' : 'Upload images'}</span>
              <input
                ref={fileInputRef}
                type="file"
                className="sr-only"
                accept="image/*"
                multiple
                onChange={(e) => handleFiles(e.target.files)}
                disabled={uploading}
              />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
        </div>
      </div>

      {/* Image Preview */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {images.map((image, index) => (
            <div key={index} className="relative group aspect-w-1 aspect-h-1">
              <img
                src={image}
                alt={`Product ${index + 1}`}
                className="object-cover w-full h-full rounded-lg"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik03MCA3MEgxMzBWMTMwSDcwVjcwWiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';
                }}
              />
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                className="absolute top-2 right-2 p-1 rounded-full bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-700"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-black bg-opacity-50 text-white text-xs rounded">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Progress indicator */}
      <div className="text-sm text-gray-500 text-center">
        {images.length} of {maxImages} images added
      </div>
    </div>
  );
};

export default ImageUpload; 