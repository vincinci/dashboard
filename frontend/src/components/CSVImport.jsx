import React, { useState } from 'react';
import axios from 'axios';
import API_CONFIG from '../config/api';

const CSVImport = ({ onImportComplete, onClose }) => {
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);
  const [overwrite, setOverwrite] = useState(false);
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState('');

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    setFile(selectedFile);
    setResults(null);
    setError('');
    
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csv = e.target.result;
          const lines = csv.split('\n').filter(line => line.trim());
          
          if (lines.length < 2) {
            setError('CSV file must have at least a header row and one data row');
            return;
          }

          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          const data = [];

          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            const row = {};
            
            headers.forEach((header, index) => {
              row[header.toLowerCase().replace(/\s+/g, '')] = values[index] || '';
            });
            
            data.push(row);
          }

          setCsvData(data);
          setPreview(data.slice(0, 5)); // Show first 5 rows as preview
        } catch (err) {
          setError('Error parsing CSV file. Please check the format.');
        }
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!csvData.length) {
      setError('Please select a valid CSV file first');
      return;
    }

    setImporting(true);
    setError('');

    try {
      const response = await axios.post(
        API_CONFIG.getURL('/products/import-csv'),
        {
          csvData,
          overwrite
        },
        {
          timeout: 30000 // 30 seconds for bulk import
        }
      );

      setResults(response.data);
      
      if (response.data.results.success > 0) {
        onImportComplete && onImportComplete(response.data);
      }
    } catch (error) {
      console.error('Import error:', error);
      setError(error.response?.data?.error || 'Failed to import CSV');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = `name,category,description,price,quantity,delivery,pickup,images,sizes,colors,status
Sample T-Shirt,Clothing Collection,Premium cotton t-shirt,2500,20,true,Kigali Store,"image1.jpg; image2.jpg","S; M; L; XL","Red; Blue; White",active
Running Shoes,Shoes,Comfortable running sneakers,8500,15,true,Sports Store,"shoe1.jpg","40; 41; 42; 43","Black; White",active`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'product_import_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-50">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  Import Products from CSV
                </h3>

                {!results && (
                  <>
                    <div className="mb-4">
                      <button
                        onClick={downloadTemplate}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                      >
                        📥 Download Template
                      </button>
                      <p className="text-sm text-gray-500 mt-2">
                        Download a sample CSV template to see the required format.
                      </p>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select CSV File
                      </label>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100"
                      />
                    </div>

                    {error && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-600">{error}</p>
                      </div>
                    )}

                    {preview.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Preview (First 5 rows):</h4>
                        <div className="max-h-64 overflow-auto border border-gray-200 rounded-md">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {preview.map((row, index) => (
                                <tr key={index}>
                                  <td className="px-2 py-2 text-xs text-gray-900">{row.name || 'N/A'}</td>
                                  <td className="px-2 py-2 text-xs text-gray-900">{row.category || 'N/A'}</td>
                                  <td className="px-2 py-2 text-xs text-gray-900">{row.price || 'N/A'}</td>
                                  <td className="px-2 py-2 text-xs text-gray-900">{row.quantity || 'N/A'}</td>
                                  <td className="px-2 py-2 text-xs text-gray-900">{row.status || 'active'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                          Total rows to import: {csvData.length}
                        </p>
                      </div>
                    )}

                    {csvData.length > 0 && (
                      <div className="mb-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={overwrite}
                            onChange={(e) => setOverwrite(e.target.checked)}
                            className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            Overwrite existing products with same name
                          </span>
                        </label>
                      </div>
                    )}
                  </>
                )}

                {results && (
                  <div className="mb-4">
                    <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                      <h4 className="text-sm font-medium text-green-800 mb-2">Import Results</h4>
                      <p className="text-sm text-green-700">{results.message}</p>
                      <div className="mt-2 text-sm text-green-600">
                        <p>Total: {results.summary.total}</p>
                        <p>Success: {results.summary.success}</p>
                        <p>Errors: {results.summary.errors}</p>
                      </div>
                    </div>

                    {results.results.errors.length > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                        <h4 className="text-sm font-medium text-yellow-800 mb-2">Errors ({results.results.errors.length})</h4>
                        <div className="max-h-32 overflow-auto">
                          {results.results.errors.map((error, index) => (
                            <p key={index} className="text-sm text-yellow-700">
                              Row {error.row}: {error.error}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {results.results.created.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                        <h4 className="text-sm font-medium text-blue-800 mb-2">
                          Successfully Imported ({results.results.created.length})
                        </h4>
                        <div className="max-h-32 overflow-auto">
                          {results.results.created.slice(0, 10).map((product, index) => (
                            <p key={index} className="text-sm text-blue-700">
                              {product.name} - {product.category} - {product.price} RWF
                            </p>
                          ))}
                          {results.results.created.length > 10 && (
                            <p className="text-sm text-blue-600 mt-2">
                              ... and {results.results.created.length - 10} more
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            {!results && (
              <button
                type="button"
                disabled={!csvData.length || importing}
                onClick={handleImport}
                className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 sm:ml-3 sm:w-auto sm:text-sm ${
                  !csvData.length || importing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-yellow-600 hover:bg-yellow-700'
                }`}
              >
                {importing ? 'Importing...' : 'Import Products'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              {results ? 'Close' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CSVImport; 