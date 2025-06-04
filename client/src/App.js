import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaCloudUploadAlt } from 'react-icons/fa';
import './App.css';
import translations from './translations';
import { interpolate, interpolateHtml } from './utils';

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

  const onDrop = useCallback((acceptedFiles) => {
    const newFiles = [...files, ...acceptedFiles];
    
    if (newFiles.length > 8) {
      setError(interpolate(translations.maxImagesError, { 
        count: newFiles.length, 
        excess: newFiles.length - 8 
      }));
      return;
    }
    
    setFiles(newFiles);
    setError('');
  }, [files]);

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
    if (bytes === 0) return `0 ${translations.fileSizeUnits.bytes}`;
    const k = 1024;
    const sizes = [
      translations.fileSizeUnits.bytes, 
      translations.fileSizeUnits.kb, 
      translations.fileSizeUnits.mb, 
      translations.fileSizeUnits.gb
    ];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleAnalyze = async () => {
    if (files.length === 0) {
      setError(translations.minImagesError);
      return;
    }

    if (files.length > 8) {
      setError(translations.maxImagesAnalysisError);
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
      
      let errorMessage = translations.analysisError;
      
      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        errorMessage = interpolate(translations.networkError, { count: files.length });
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
      setError(interpolate(translations.fileNotFoundError, { filename }));
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
      setError(interpolate(translations.strongEvaluationError, { 
        filename, 
        error: err.response?.data?.error || err.message 
      }));
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
      return <FaTimesCircle className="status-icon error" title={translations.statusTitles.error} />;
    }
    
    switch (response.status) {
      case 'consensus':
        return <FaCheckCircle className="status-icon success" title={translations.statusTitles.consensus} />;
      case 'partial':
        return <FaExclamationTriangle className="status-icon warning" title={translations.statusTitles.partial} />;
      case 'different':
        return <FaTimesCircle className="status-icon error" title={translations.statusTitles.different} />;
      case 'error':
        return <FaExclamationTriangle className="status-icon error" title={translations.statusTitles.error} />;
      default:
        return <FaExclamationTriangle className="status-icon error" title={translations.statusTitles.unknown} />;
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
        <h1>{translations.appTitle}</h1>
        <p>{translations.appDescription}</p>
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
              ? translations.dragDropActive
              : translations.dragDropText
            }
          </div>
          <div className="dropzone-subtext">
            {translations.supportedFormats}
            {files.length > 0 && (
              <span className="file-counter"> • {files.length}/8 {translations.fileCounter}</span>
            )}
          </div>
        </div>

        {files.length > 0 && (
          <div className="file-list">
            <h4>{translations.selectedFiles}</h4>
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
                  {translations.removeFile}
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
                  🚀 <strong>{translations.batchMode}</strong> - {interpolate(translations.batchModeDescription, { total: files.length * 2 })}
                </span>
              </label>
            </div>
            <div className="batch-mode-info">
              {batchMode ? (
                <span className="batch-mode-enabled">
                  {translations.batchModeEnabled}
                </span>
              ) : (
                <span className="batch-mode-disabled">
                  {translations.batchModeDisabled}
                </span>
              )}
            </div>
          </div>
        )}

        <textarea
          className="prompt-input"
          placeholder={translations.promptPlaceholder}
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
              {translations.analyzingText}
            </div>
          ) : (
            <>
              {batchMode && files.length > 1 
                ? interpolate(translations.analyzeButtonBatch, { count: files.length })
                : files.length > 1 
                  ? interpolate(translations.analyzeButtonIndividual, { count: files.length })
                  : translations.analyzeButton
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
            {translations.analysisResults}
          </h2>
          
          {batchInfo && (
            <div className={`batch-info-card ${batchInfo.enabled ? 'batch-success' : 'batch-individual'}`}>
              {batchInfo.enabled ? (
                <div className="batch-success-content">
                  <h3>{translations.batchProcessingUsed}</h3>
                  <p dangerouslySetInnerHTML={{
                    __html: interpolateHtml(translations.batchProcessingDescription, {
                      totalImages: batchInfo.totalImages,
                      savedCalls: batchInfo.apiCallsSaved
                    })
                  }} />
                  <div className="batch-benefits">
                    <span className="benefit">{translations.batchBenefits.faster}</span>
                    <span className="benefit">{translations.batchBenefits.cheaper}</span>
                    <span className="benefit">{translations.batchBenefits.better}</span>
                  </div>
                </div>
              ) : (
                <div className="batch-individual-content">
                  <h3>{translations.individualProcessingUsed}</h3>
                  <p dangerouslySetInnerHTML={{
                    __html: interpolateHtml(translations.individualProcessingDescription, {
                      totalImages: batchInfo.totalImages,
                      totalApiCalls: batchInfo.totalApiCalls
                    })
                  }} />
                  <p className="batch-tip">
                    {translations.batchModeTip}
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
                    onClick={() => handleStrongEvaluation(result.filename)}
                    disabled={strongEvaluationLoading[result.filename]}
                  >
                    {strongEvaluationLoading[result.filename] ? (
                      <div className="loading-small">
                        <div className="spinner-small"></div>
                        {translations.evaluating}
                      </div>
                    ) : (
                      translations.evaluateStrongly
                    )}
                  </button>
                )}
              </div>

              {result.error ? (
                <div className="error-text">
                  {interpolate(translations.errorProcessingImage, { error: result.error })}
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
                              {interpolate(translations.errorGeneral, { error: response.error })}
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
                        <h4>{translations.strongEvaluationResults}</h4>
                        <span className="strong-evaluation-badge">{translations.powerfulModels}</span>
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
                                  {interpolate(translations.errorGeneral, { error: response.error })}
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