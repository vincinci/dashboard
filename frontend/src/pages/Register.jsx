import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/Logo';

const Register = () => {
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    businessAddress: '',
    phoneNumber: '',
    nationalId: null,
    businessRegistration: null,
    legalDeclaration: false
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleChange = (e) => {
    const { name, value, type, files, checked } = e.target;
    
    if (type === 'file') {
      const file = files[0];
      if (file) {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
          setErrors(prev => ({ 
            ...prev, 
            [name]: 'Please upload a JPG, PNG, or PDF file' 
          }));
          return;
        }
        
        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
          setErrors(prev => ({ 
            ...prev, 
            [name]: 'File size must be less than 10MB' 
          }));
          return;
        }
        
        setFormData(prev => ({ ...prev, [name]: file }));
      }
    } else if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error when user makes changes
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (!formData.businessName.trim()) {
      newErrors.businessName = 'Business name is required';
    }
    
    if (!formData.nationalId) {
      newErrors.nationalId = 'National ID document is required (JPG, PNG, or PDF)';
    }
    
    if (!formData.legalDeclaration) {
      newErrors.legalDeclaration = 'You must declare that you are authorized to operate this business legally';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Convert files to base64 for submission
      const nationalIdBase64 = formData.nationalId ? await fileToBase64(formData.nationalId) : null;
      const businessRegistrationBase64 = formData.businessRegistration ? await fileToBase64(formData.businessRegistration) : null;

      const { confirmPassword, nationalId, businessRegistration, ...registrationData } = formData;
      
      // Add file data and legal declaration
      const submitData = {
        ...registrationData,
        nationalIdDocument: nationalIdBase64,
        businessRegistrationDocument: businessRegistrationBase64,
        legalDeclaration: formData.legalDeclaration
      };

      const result = await register(submitData);
      
      if (!result.success) {
        setErrors({ general: result.error });
      }
    } catch (error) {
      console.error('Registration error:', error);
      if (error.message && error.message.includes('PayloadTooLargeError')) {
        setErrors({ general: 'File upload is too large. Please use files smaller than 10MB.' });
      } else if (error.message && error.message.includes('Network Error')) {
        setErrors({ general: 'Network error. Please check your connection and try again.' });
      } else {
        setErrors({ general: 'Registration failed. Please check your files and try again.' });
      }
    }
    
    setLoading(false);
  };

  // Helper function to convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <Logo size="large" className="justify-center mb-2" clickable={false} />
          <p className="mt-2 text-sm text-yellow-600">Vendor Dashboard</p>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create your vendor account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-yellow-600 hover:text-yellow-500"
          >
            Sign in here
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                {errors.general}
              </div>
            )}

            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
                Display Name *
              </label>
              <div className="mt-1">
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  required
                  value={formData.displayName}
                  onChange={handleChange}
                  className={`appearance-none block w-full px-3 py-2 border ${
                    errors.displayName ? 'border-red-300' : 'border-gray-300'
                  } rounded-md placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm`}
                  placeholder="Your display name"
                />
                {errors.displayName && (
                  <p className="mt-2 text-sm text-red-600">{errors.displayName}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address *
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className={`appearance-none block w-full px-3 py-2 border ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  } rounded-md placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm`}
                  placeholder="your@email.com"
                />
                {errors.email && (
                  <p className="mt-2 text-sm text-red-600">{errors.email}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password *
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`appearance-none block w-full px-3 py-2 border ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  } rounded-md placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm`}
                  placeholder="At least 6 characters"
                />
                {errors.password && (
                  <p className="mt-2 text-sm text-red-600">{errors.password}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password *
              </label>
              <div className="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`appearance-none block w-full px-3 py-2 border ${
                    errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                  } rounded-md placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm`}
                  placeholder="Confirm your password"
                />
                {errors.confirmPassword && (
                  <p className="mt-2 text-sm text-red-600">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="businessName" className="block text-sm font-medium text-gray-700">
                Business Name *
              </label>
              <div className="mt-1">
                <input
                  id="businessName"
                  name="businessName"
                  type="text"
                  required
                  value={formData.businessName}
                  onChange={handleChange}
                  className={`appearance-none block w-full px-3 py-2 border ${
                    errors.businessName ? 'border-red-300' : 'border-gray-300'
                  } rounded-md placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm`}
                  placeholder="Your business name"
                />
                {errors.businessName && (
                  <p className="mt-2 text-sm text-red-600">{errors.businessName}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="businessAddress" className="block text-sm font-medium text-gray-700">
                Business Address
              </label>
              <div className="mt-1">
                <textarea
                  id="businessAddress"
                  name="businessAddress"
                  rows={3}
                  value={formData.businessAddress}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                  placeholder="Your business address"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <div className="mt-1">
                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                  placeholder="+250 700 000 000"
                />
              </div>
            </div>

            {/* National ID Upload */}
            <div>
              <label htmlFor="nationalId" className="block text-sm font-medium text-gray-700">
                National ID Document *
              </label>
              <div className="mt-1">
                <input
                  id="nationalId"
                  name="nationalId"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,application/pdf"
                  onChange={handleChange}
                  className={`appearance-none block w-full px-3 py-2 border ${
                    errors.nationalId ? 'border-red-300' : 'border-gray-300'
                  } rounded-md focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm`}
                />
                <p className="mt-1 text-xs text-gray-500">Upload JPG, PNG, or PDF (max 10MB)</p>
                {errors.nationalId && (
                  <p className="mt-2 text-sm text-red-600">{errors.nationalId}</p>
                )}
              </div>
            </div>

            {/* Business Registration Document Upload */}
            <div>
              <label htmlFor="businessRegistration" className="block text-sm font-medium text-gray-700">
                Business Registration Document (Optional)
              </label>
              <div className="mt-1">
                <input
                  id="businessRegistration"
                  name="businessRegistration"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,application/pdf"
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">Upload JPG, PNG, or PDF (max 10MB)</p>
              </div>
            </div>

            {/* Legal Declaration Checkbox */}
            <div>
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="legalDeclaration"
                    name="legalDeclaration"
                    type="checkbox"
                    checked={formData.legalDeclaration}
                    onChange={handleChange}
                    className={`h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded ${
                      errors.legalDeclaration ? 'border-red-300' : ''
                    }`}
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="legalDeclaration" className="text-gray-700">
                    I declare that I am authorized to operate this business legally *
                  </label>
                  {errors.legalDeclaration && (
                    <p className="mt-1 text-sm text-red-600">{errors.legalDeclaration}</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  loading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500'
                }`}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating account...
                  </div>
                ) : (
                  'Create account'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Terms & Privacy</span>
              </div>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs text-gray-600">
                By creating an account, you agree to our{' '}
                <button type="button" className="text-yellow-600 hover:text-yellow-500 underline bg-transparent border-none cursor-pointer">Terms of Service</button>
                {' '}and{' '}
                <button type="button" className="text-yellow-600 hover:text-yellow-500 underline bg-transparent border-none cursor-pointer">Privacy Policy</button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register; 