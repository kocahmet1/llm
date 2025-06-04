import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaCloudUploadAlt } from 'react-icons/fa';
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

  const onDrop = useCallback((acceptedFiles) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
    setError('');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    onError: (err) => setError(err.message)
  });

  const removeFile = (index) => {
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

    setLoading(true);
    setError('');
    setResults([]);
    setBatchInfo(null);
    setStrongEvaluations({});
    setStrongEvaluationLoading({});

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('images', file);
      });
      
      if (prompt.trim()) {
        formData.append('prompt', prompt);
      }

      const endpoint = (batchMode && files.length > 1) ? '/api/analyze-batch' : '/api/analyze';
      
      console.log(`Using ${endpoint} for ${files.length} files (batch mode: ${batchMode})`);

      const response = await axios.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 minutes timeout
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
      setError(
        err.response?.data?.error || 
        err.message || 
        'Failed to analyze images. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStrongEvaluation = async (filename, originalFile) => {
    console.log('Starting strong evaluation for:', filename);
    
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

  // Helper function to get the original file for a filename
  const getOriginalFile = (filename) => {
    return files.find(file => file.name === filename);
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
            Supports JPEG, PNG, GIF, WebP up to 10MB each
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
                <h3>{result.filename}</h3>
                {hasDisagreement(result.responses) && !strongEvaluations[result.filename] && (
                  <button
                    className="evaluate-strongly-btn"
                    onClick={() => handleStrongEvaluation(result.filename, getOriginalFile(result.filename))}
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
    </div>
  );
}

export default App; 