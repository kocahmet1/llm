import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaCloudUploadAlt, FaTimes } from 'react-icons/fa';
import './App.css';

function App() {
  const [files, setFiles] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [batchMode, setBatchMode] = useState(true);
  const [batchInfo, setBatchInfo] = useState(null);
  const [strongEvaluations, setStrongEvaluations] = useState({});
  const [strongEvaluationLoading, setStrongEvaluationLoading] = useState({});
  const [originalFiles, setOriginalFiles] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageUrls, setImageUrls] = useState({});

  // Cleanup function to revoke object URLs when component unmounts
  useEffect(() => {
    return () => {
      Object.values(imageUrls).forEach(url => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  const onDrop = useCallback((acceptedFiles) => {
    const newFiles = [...files, ...acceptedFiles];
    
    if (newFiles.length > 8) {
      setError(`Maximum 8 images allowed. You selected ${newFiles.length} images. Please remove ${newFiles.length - 8} images.`);
      return;
    }
    
    setFiles(newFiles);
    setError('');

    // Create object URLs for thumbnails
    const newImageUrls = { ...imageUrls };
    acceptedFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        newImageUrls[file.name] = URL.createObjectURL(file);
      }
    });
    setImageUrls(newImageUrls);
  }, [files, imageUrls]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    onError: (err) => setError(err.message)
  });

  const removeFile = (index) => {
    const fileToRemove = files[index];
    // Revoke object URL to prevent memory leaks
    if (imageUrls[fileToRemove.name]) {
      URL.revokeObjectURL(imageUrls[fileToRemove.name]);
      const updatedUrls = { ...imageUrls };
      delete updatedUrls[fileToRemove.name];
      setImageUrls(updatedUrls);
    }
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleAnalyze = async () => {
    if (files.length === 0) {
      setError('Please upload at least one image');
      return;
    }

    if (files.length > 8) {
      setError('Maximum 8 images allowed per analysis. Please remove some images.');
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);
    setBatchInfo(null);
    setStrongEvaluations({});
    setStrongEvaluationLoading({});

    // Store original files mapping
    const fileMapping = {};
    files.forEach(file => {
      fileMapping[file.name] = file;
    });
    setOriginalFiles(fileMapping);

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('images', file);
      });
      
      if (prompt.trim()) {
        formData.append('prompt', prompt);
      }

      // Choose endpoint based on batch mode and number of files
      const endpoint = (batchMode && files.length > 1) ? '/api/analyze-batch' : '/api/analyze';
      
      console.log(`Using ${endpoint} for ${files.length} files (batch mode: ${batchMode})`);

      // Increase timeout based on number of files (more files = more time needed)
      const timeoutMs = files.length > 5 ? 300000 : 180000; // 5 minutes for >5 files, 3 minutes otherwise
      console.log(`Using timeout: ${timeoutMs}ms for ${files.length} files`);

      const response = await axios.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: timeoutMs,
      });

      setResults(response.data.results);
      
      if (response.data.batchProcessed) {
        setBatchInfo({
          enabled: true,
          apiCallsSaved: response.data.originalApiCallsSaved,
          totalImages: files.length
        });
        console.log(`Batch processing saved ${response.data.originalApiCallsSaved} API calls!`);
      } else {
        setBatchInfo({
          enabled: false,
          totalApiCalls: files.length * 2,
          totalImages: files.length
        });
      }
    } catch (err) {
      console.error('Analysis error:', err);
      
      let errorMessage = 'Failed to analyze images. Please try again.';
      
      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        errorMessage = `Network error - this might be due to too many images (${files.length}) causing timeout. Try with fewer images (max 8) or check your connection.`;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleStrongEvaluation = async (filename) => {
    console.log('Starting strong evaluation for:', filename);
    
    // More robust file finding - try multiple matching strategies
    let originalFile = originalFiles[filename];
    
    if (!originalFile) {
      console.log('Direct match failed, trying alternative matching strategies...');
      
      // Strategy 1: Try to find by normalized filename (handle encoding issues)
      const normalizeFilename = (name) => {
        return name
          .replace(/Ã¤/g, 'ä')
          .replace(/Ã¶/g, 'ö')  
          .replace(/Ã¼/g, 'ü')
          .replace(/Ã/g, 'Ä')
          .replace(/Ã/g, 'Ö')
          .replace(/Ã/g, 'Ü')
          .replace(/Ã§/g, 'ç')
          .replace(/Ã±/g, 'ñ')
          .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Remove diacritics as fallback
      };
      
      const normalizedRequestedName = normalizeFilename(filename);
      console.log('Normalized requested name:', normalizedRequestedName);
      
      // Try to find a file with matching normalized name
      for (const [storedName, file] of Object.entries(originalFiles)) {
        const normalizedStoredName = normalizeFilename(storedName);
        console.log('Comparing with stored name:', storedName, '-> normalized:', normalizedStoredName);
        
        if (normalizedStoredName === normalizedRequestedName) {
          originalFile = file;
          console.log('Found match using normalized names!');
          break;
        }
      }
    }
    
    if (!originalFile) {
      // Strategy 2: Try partial matching (remove special characters and compare)
      const simplifyName = (name) => name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const simplifiedRequested = simplifyName(filename);
      
      for (const [storedName, file] of Object.entries(originalFiles)) {
        const simplifiedStored = simplifyName(storedName);
        if (simplifiedStored === simplifiedRequested) {
          originalFile = file;
          console.log('Found match using simplified names!');
          break;
        }
      }
    }
    
    if (!originalFile) {
      console.error('Original file not found for:', filename);
      console.log('Available files:', Object.keys(originalFiles));
      console.log('Requested filename (char codes):', Array.from(filename).map(c => `${c}(${c.charCodeAt(0)})`).join(' '));
      setError(`Original file not found for ${filename}. This might be a character encoding issue. Please try uploading again.`);
      return;
    }
    
    console.log('Found original file:', {
      name: originalFile.name,
      size: originalFile.size,
      type: originalFile.type,
      lastModified: originalFile.lastModified
    });
    
    // Set loading state for this specific image
    setStrongEvaluationLoading(prev => ({
      ...prev,
      [filename]: true
    }));

    try {
      const formData = new FormData();
      formData.append('image', originalFile);
      
      if (prompt.trim()) {
        formData.append('prompt', prompt);
      }

      console.log('Sending strong evaluation request for:', filename);
      console.log('File size:', originalFile.size);
      console.log('File type:', originalFile.type);
      console.log('FormData entries:');
      for (let [key, value] of formData.entries()) {
        console.log(`  ${key}:`, typeof value === 'object' ? `File(${value.name}, ${value.size} bytes)` : value);
      }

      const response = await axios.post('/api/evaluate-strongly', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 180000, // 3 minutes timeout for powerful models
      });

      // Store the strong evaluation result
      setStrongEvaluations(prev => ({
        ...prev,
        [filename]: response.data
      }));

      console.log('Strong evaluation completed for:', filename);
    } catch (err) {
      console.error('Strong evaluation error:', err);
      console.error('Error details:', err.response?.data);
      console.error('Error status:', err.response?.status);
      console.error('Error config:', err.config);
      setError(`Failed to perform strong evaluation for ${filename}: ${err.response?.data?.error || err.message}`);
    } finally {
      // Clear loading state
      setStrongEvaluationLoading(prev => ({
        ...prev,
        [filename]: false
      }));
    }
  };

  // Helper function to check if any responses have "different" status
  const hasDisagreement = (responses) => {
    return responses && responses.some(response => response.status === 'different');
  };

  const getStatusIcon = (response) => {
    if (!response.success) {
      return <FaTimesCircle className="status-icon error" title="Error" />;
    }
    
    switch (response.status) {
      case 'consensus':
        return <FaCheckCircle className="status-icon success" title="Consensus - All models agree" />;
      case 'partial':
        return <FaExclamationTriangle className="status-icon warning" title="Partial agreement" />;
      case 'different':
        return <FaTimesCircle className="status-icon error" title="Different - Models disagree" />;
      case 'error':
        return <FaExclamationTriangle className="status-icon error" title="Error" />;
      default:
        return <FaExclamationTriangle className="status-icon error" title="Unknown" />;
    }
  };

  const getResponseCardClass = (response) => {
    if (!response.success) return 'response-card error';
    
    switch (response.status) {
      case 'consensus':
        return 'response-card consensus';
      case 'partial':
        return 'response-card partial';
      case 'different':
        return 'response-card different';
      case 'error':
        return 'response-card error';
      default:
        return 'response-card';
    }
  };

  const openImageModal = (filename) => {
    const imageUrl = imageUrls[filename];
    if (imageUrl) {
      setSelectedImage({ filename, url: imageUrl });
    }
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  return (
    <div className="container">
      <div className="header">
        <h1>🤖 Multi-LLM Question Solver</h1>
        <p>Upload images with questions and get answers from OpenAI and Claude</p>
      </div>

      <div className="upload-section">
        <div 
          {...getRootProps()} 
          className={`dropzone ${isDragActive ? 'dropzone-active' : ''}`}
        >
          <input {...getInputProps()} />
          <FaCloudUploadAlt size={48} color="#667eea" />
          <div className="dropzone-text">
            {isDragActive
              ? 'Drop the images here...'
              : 'Drag & drop images here, or click to select files'
            }
          </div>
          <div className="dropzone-subtext">
            Supports JPEG, PNG, GIF, WebP up to 10MB each (Max 8 images)
            {files.length > 0 && (
              <span className="file-counter"> • {files.length}/8 files selected</span>
            )}
          </div>
        </div>

        {files.length > 0 && (
          <div className="file-list">
            <h4>Selected Files:</h4>
            {files.map((file, index) => (
              <div key={index} className="file-item">
                <div>
                  <span className="file-name">{file.name}</span>
                  <span className="file-size"> ({formatFileSize(file.size)})</span>
                </div>
                <button 
                  onClick={() => removeFile(index)}
                  className="remove-file"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {files.length > 1 && (
          <div className="batch-mode-section">
            <div className="batch-mode-toggle">
              <label htmlFor="batchMode" className="batch-mode-label">
                <input
                  id="batchMode"
                  type="checkbox"
                  checked={batchMode}
                  onChange={(e) => setBatchMode(e.target.checked)}
                  className="batch-mode-checkbox"
                />
                <span className="batch-mode-text">
                  🚀 <strong>Batch Mode</strong> - Process all images in 2 API calls instead of {files.length * 2}
                </span>
              </label>
            </div>
            <div className="batch-mode-info">
              {batchMode ? (
                <span className="batch-mode-enabled">
                  ✅ Enabled: Faster processing, lower costs, single combined analysis
                </span>
              ) : (
                <span className="batch-mode-disabled">
                  ⚠️ Disabled: Each image processed separately (more API calls)
                </span>
              )}
            </div>
          </div>
        )}

        <textarea
          className="prompt-input"
          placeholder="Optional: Add a custom prompt or question (leave empty for default analysis)"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />

        <button
          className="analyze-button"
          onClick={handleAnalyze}
          disabled={loading || files.length === 0}
        >
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              Analyzing with AI models...
            </div>
          ) : (
            <>
              {batchMode && files.length > 1 
                ? `🚀 Analyze ${files.length} Images (Batch Mode)`
                : files.length > 1 
                  ? `Analyze ${files.length} Images (Individual Mode)`
                  : 'Analyze Image'
              }
            </>
          )}
        </button>

        {error && (
          <div style={{ 
            color: '#e53e3e', 
            marginTop: '15px', 
            padding: '10px', 
            background: '#fed7d7', 
            borderRadius: '8px' 
          }}>
            {error}
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="results-section">
          <h2 style={{ color: 'white', textAlign: 'center', marginBottom: '20px' }}>
            Analysis Results
          </h2>
          
          {batchInfo && (
            <div className={`batch-info-card ${batchInfo.enabled ? 'batch-success' : 'batch-individual'}`}>
              {batchInfo.enabled ? (
                <div className="batch-success-content">
                  <h3>🚀 Batch Processing Used!</h3>
                  <p>
                    Processed <strong>{batchInfo.totalImages} images</strong> with just <strong>2 API calls</strong> 
                    (saved <strong>{batchInfo.apiCallsSaved} API calls</strong>!)
                  </p>
                  <div className="batch-benefits">
                    <span className="benefit">⚡ Faster processing</span>
                    <span className="benefit">💰 Lower costs</span>
                    <span className="benefit">🧠 Better cross-image analysis</span>
                  </div>
                </div>
              ) : (
                <div className="batch-individual-content">
                  <h3>📊 Individual Processing Used</h3>
                  <p>
                    Processed <strong>{batchInfo.totalImages} images</strong> with <strong>{batchInfo.totalApiCalls} API calls</strong>
                  </p>
                  <p className="batch-tip">
                    💡 Tip: Enable batch mode for multiple images to save API calls and get faster results!
                  </p>
                </div>
              )}
            </div>
          )}

          {results.map((result, index) => (
            <div key={index} className="result-card">
              <div className="result-header">
                <div className="result-title-container">
                  {imageUrls[result.filename] && (
                    <img
                      src={imageUrls[result.filename]}
                      alt={result.filename}
                      className="result-thumbnail"
                      onClick={() => openImageModal(result.filename)}
                      title="Click to view full image"
                    />
                  )}
                  <h3>{result.filename}</h3>
                </div>
                {hasDisagreement(result.responses) && !strongEvaluations[result.filename] && (
                  <button
                    className="evaluate-strongly-btn"
                    onClick={() => handleStrongEvaluation(result.filename)}
                    disabled={strongEvaluationLoading[result.filename]}
                  >
                    {strongEvaluationLoading[result.filename] ? (
                      <div className="loading-small">
                        <div className="spinner-small"></div>
                        Evaluating...
                      </div>
                    ) : (
                      '🚀 Evaluate Strongly'
                    )}
                  </button>
                )}
              </div>

              {result.error ? (
                <div className="error-text">
                  Error processing this image: {result.error}
                </div>
              ) : (
                <>
                  <div className="responses-grid">
                    {result.responses.map((response, responseIndex) => (
                      <div key={responseIndex} className={getResponseCardClass(response)}>
                        <div className="response-header">
                          <span className="model-name">{response.model}</span>
                          {getStatusIcon(response)}
                        </div>
                        
                        <div className="response-text">
                          {response.success ? (
                            response.response
                          ) : (
                            <span className="error-text">
                              Error: {response.error}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Strong Evaluation Results */}
                  {strongEvaluations[result.filename] && (
                    <div className="strong-evaluation-section">
                      <div className="strong-evaluation-header">
                        <h4>🚀 Strong Evaluation Results</h4>
                        <span className="strong-evaluation-badge">Powerful Models</span>
                      </div>
                      <div className="responses-grid">
                        {strongEvaluations[result.filename].responses.map((response, responseIndex) => (
                          <div key={responseIndex} className={`${getResponseCardClass(response)} powerful-model`}>
                            <div className="response-header">
                              <span className="model-name">
                                {response.model} 
                                <span className="powerful-badge">🚀</span>
                              </span>
                              {getStatusIcon(response)}
                            </div>
                            
                            <div className="response-text">
                              {response.success ? (
                                response.response
                              ) : (
                                <span className="error-text">
                                  Error: {response.error}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div className="image-modal-overlay" onClick={closeImageModal}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="image-modal-close" onClick={closeImageModal}>
              <FaTimes />
            </button>
            <img
              src={selectedImage.url}
              alt={selectedImage.filename}
              className="image-modal-image"
            />
            <div className="image-modal-filename">{selectedImage.filename}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App; 