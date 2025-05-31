import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import API_CONFIG from '../config/api';

const ImageUpload = ({ images, onChange, maxImages = 5 }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState({});
  const fileInputRef = useRef(null);
  const { isAuthenticated, token } = useAuth();

  // Client-side image compression function
  const compressImage = (file, quality = 0.8, maxWidth = 1200, maxHeight = 1200) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(resolve, file.type, quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  // Convert blob to base64
  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Upload single file with progress
  const uploadSingleFile = async (file, index) => {
    try {
      // Update progress
      setUploadProgress(prev => ({ ...prev, [index]: { stage: 'compressing', progress: 10 } }));
      
      // Compress image
      const compressedBlob = await compressImage(file);
      const compressedFile = new File([compressedBlob], file.name, { type: file.type });
      
      setUploadProgress(prev => ({ ...prev, [index]: { stage: 'converting', progress: 30 } }));
      
      // Convert to base64
      const base64 = await blobToBase64(compressedFile);
      
      setUploadProgress(prev => ({ ...prev, [index]: { stage: 'uploading', progress: 50 } }));
      
      // Get upload token
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
        timeout: 30000,
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(prev => ({ 
            ...prev, 
            [index]: { stage: 'uploading', progress: 50 + (progress * 0.5) } 
          }));
        }
      });

      setUploadProgress(prev => ({ ...prev, [index]: { stage: 'complete', progress: 100 } }));
      
      return response.data.imageUrl;
    } catch (err) {
      setUploadProgress(prev => ({ ...prev, [index]: { stage: 'error', progress: 0, error: err.message } }));
      throw err;
    }
  };

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
    const validFiles = fileArray.filter((file, index) => {
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
      setUploadProgress({});

      // Use bulk upload for multiple files (faster) or single upload for one file
      if (validFiles.length > 1) {
        await handleBulkUpload(validFiles);
      } else {
        // Upload files in parallel for better performance
        const uploadPromises = validFiles.map((file, index) => uploadSingleFile(file, index));
        const results = await Promise.allSettled(uploadPromises);
        
        // Process results
        const uploadedUrls = [];
        const errors = [];
        
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            uploadedUrls.push(result.value);
          } else {
            errors.push(`${validFiles[index].name}: ${result.reason.message}`);
          }
        });

        if (uploadedUrls.length > 0) {
          const newImages = [...images, ...uploadedUrls];
          onChange(newImages);
        }

        if (errors.length > 0) {
          setError(`Some uploads failed: ${errors.join(', ')}`);
        }
      }

    } catch (error) {
      console.error('Upload error:', error);
      const errorMsg = error.code === 'ECONNREFUSED' || error.message.includes('Network Error')
        ? `Cannot connect to server at ${API_CONFIG.getBaseURL()}`
        : error.response?.data?.error || 'Failed to upload images. Please try again.';
      setError(errorMsg);
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  };

  // Bulk upload for multiple files (faster)
  const handleBulkUpload = async (files) => {
    try {
      setUploadProgress({ bulk: { stage: 'processing', progress: 10 } });

      // Process all files in parallel
      const processPromises = files.map(async (file, index) => {
        // Compress image
        const compressedBlob = await compressImage(file);
        const compressedFile = new File([compressedBlob], file.name, { type: file.type });
        
        // Convert to base64
        const base64 = await blobToBase64(compressedFile);
        
        return {
          image: base64,
          filename: file.name
        };
      });

      setUploadProgress({ bulk: { stage: 'compressing', progress: 30 } });
      const processedImages = await Promise.all(processPromises);

      setUploadProgress({ bulk: { stage: 'uploading', progress: 60 } });

      // Get upload token
      const contextToken = token;
      const tokenFromStorage = localStorage.getItem('authToken');
      const tokenFromAxios = axios.defaults.headers.common['Authorization']?.replace('Bearer ', '');
      const finalToken = contextToken || tokenFromStorage || tokenFromAxios;
      
      if (!finalToken) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      // Upload all images in one request
      const response = await axios.post(API_CONFIG.getURL('/upload/images'), {
        images: processedImages
      }, {
        headers: { 
          Authorization: `Bearer ${finalToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000, // Longer timeout for bulk upload
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress({ 
            bulk: { 
              stage: 'uploading', 
              progress: 60 + (progress * 0.4) 
            } 
          });
        }
      });

      setUploadProgress({ bulk: { stage: 'complete', progress: 100 } });

      if (response.data.success) {
        const uploadedUrls = response.data.results.map(result => result.imageUrl);
        
        if (uploadedUrls.length > 0) {
          const newImages = [...images, ...uploadedUrls];
          onChange(newImages);
        }

        // Show any partial failures
        if (response.data.errors && response.data.errors.length > 0) {
          const errorMessages = response.data.errors.map(err => `${err.filename}: ${err.error}`);
          setError(`Some uploads failed: ${errorMessages.join(', ')}`);
        }
      }

    } catch (error) {
      console.error('Bulk upload error:', error);
      throw error;
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

  const getProgressBar = () => {
    const progressEntries = Object.entries(uploadProgress);
    if (progressEntries.length === 0) return null;

    // Handle bulk upload progress
    if (uploadProgress.bulk) {
      const { stage, progress } = uploadProgress.bulk;
      return (
        <div className="mt-2">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>⚡ Bulk uploading images...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-1">
            <div className="text-xs text-blue-600 font-medium">
              {stage === 'processing' && '📋 Processing files...'}
              {stage === 'compressing' && '🗜️ Compressing images...'}
              {stage === 'uploading' && '🚀 Uploading to server...'}
              {stage === 'complete' && '✅ Upload complete!'}
            </div>
          </div>
        </div>
      );
    }

    // Handle individual file progress
    const totalProgress = progressEntries.reduce((sum, [, data]) => sum + data.progress, 0) / progressEntries.length;

    return (
      <div className="mt-2">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Uploading {progressEntries.length} image(s)...</span>
          <span>{Math.round(totalProgress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${totalProgress}%` }}
          />
        </div>
        <div className="mt-1 space-y-1">
          {progressEntries.map(([index, data]) => (
            <div key={index} className="text-xs text-gray-500">
              File {parseInt(index) + 1}: {data.stage} {data.error && `- ${data.error}`}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
          dragActive 
            ? 'border-yellow-500 bg-yellow-50' 
            : uploading 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-yellow-500'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <div className="text-center">
          <svg
            className={`mx-auto h-12 w-12 ${uploading ? 'text-blue-400 animate-pulse' : 'text-gray-400'}`}
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
            <label className={`relative cursor-pointer rounded-md font-medium text-yellow-600 hover:text-yellow-500 ${uploading ? 'pointer-events-none opacity-50' : ''}`}>
              <span>{uploading ? 'Processing...' : 'Upload images'}</span>
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
          <p className="text-xs text-gray-500">
            PNG, JPG, GIF up to 10MB • Images will be automatically compressed
          </p>
        </div>
        
        {/* Progress Bar */}
        {getProgressBar()}
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
                loading="lazy"
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
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Upload info */}
      <div className="text-sm text-gray-500 text-center space-y-1">
        <div>{images.length} of {maxImages} images added</div>
        {uploading && (
          <div className="text-blue-600 font-medium">
            ⚡ Fast upload with automatic compression enabled
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUpload; 