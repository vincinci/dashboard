import React, { useState } from 'react';

const SizeColorInput = ({ type, values, onChange, placeholder }) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addValue();
    }
  };

  const addValue = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !values.includes(trimmedValue)) {
      onChange([...values, trimmedValue]);
      setInputValue('');
    }
  };

  const removeValue = (valueToRemove) => {
    onChange(values.filter(value => value !== valueToRemove));
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  return (
    <div className="space-y-3">
      {/* Input field */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-yellow-500 focus:ring-yellow-500 text-sm"
        />
        <button
          type="button"
          onClick={addValue}
          disabled={!inputValue.trim() || values.includes(inputValue.trim())}
          className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>

      {/* Display added values */}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((value, index) => (
            <span
              key={index}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
            >
              {value}
              <button
                type="button"
                onClick={() => removeValue(value)}
                className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-300 hover:bg-gray-400 text-gray-600 hover:text-gray-800 focus:outline-none"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Helper text */}
      {values.length === 0 && (
        <p className="text-xs text-gray-400">
          No {type} added yet. Type a {type.slice(0, -1)} and press Enter or click Add.
        </p>
      )}
    </div>
  );
};

export default SizeColorInput; 