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

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('images', file);
      });
      
      if (prompt.trim()) {
        formData.append('prompt', prompt);
      }

      const response = await axios.post('/api/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 minutes timeout
      });

      setResults(response.data.results);
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

  const getStatusIcon = (response) => {
    if (!response.success) {
      return <FaTimesCircle className="status-icon error" title="Error" />;
    }
    
    switch (response.status) {
      case 'consensus':
        return <FaCheckCircle className="status-icon success" title="Consensus" />;
      case 'different':
        return <FaTimesCircle className="status-icon error" title="Different" />;
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
            'Analyze Images'
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
          
          {results.map((result, index) => (
            <div key={index} className="result-card">
              <div className="result-header">
                <h3>{result.filename}</h3>
              </div>

              {result.error ? (
                <div className="error-text">
                  Error processing this image: {result.error}
                </div>
              ) : (
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
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App; 