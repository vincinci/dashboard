import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Logo = ({ className = '', size = 'default', clickable = true }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const sizeClasses = {
    small: 'h-8',
    default: 'h-10',
    large: 'h-12'
  };

  const handleClick = () => {
    if (clickable && location.pathname !== '/dashboard') {
      navigate('/dashboard');
    }
  };

  const logoContent = (
    <>
      <img
        src="/logo.png"
        alt="Iwanyu Store"
        className={`${sizeClasses[size]} w-auto`}
        onError={(e) => {
          // Fallback to text if logo image is not found
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'block';
        }}
      />
      <div style={{ display: 'none' }} className="text-gray-800 font-bold">
        <span className="text-red-500">.store</span>
        <span className="ml-1">IWANYU</span>
      </div>
    </>
  );

  if (!clickable) {
    return (
      <div className={`flex items-center ${className}`}>
        {logoContent}
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`flex items-center hover:opacity-80 transition-opacity duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 rounded-md p-1 ${className} ${
        location.pathname === '/dashboard' ? 'cursor-default' : 'cursor-pointer'
      }`}
      disabled={location.pathname === '/dashboard'}
      title={location.pathname === '/dashboard' ? 'Iwanyu Dashboard' : 'Go to Dashboard'}
    >
      {logoContent}
    </button>
  );
};

export default Logo; 