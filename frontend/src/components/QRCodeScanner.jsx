/* D:\MyProjects\greenfield-scanwin\frontend\src\components\QRCodeScanner.jsx */

import React, { useState, useEffect, useRef } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useNavigate } from 'react-router-dom';
import './QRCodeScanner.css';

const QRCodeScanner = () => {
  const navigate = useNavigate();
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const [scanHistory, setScanHistory] = useState([]);
  const [error, setError] = useState(null);
  const scannerRef = useRef(null);

  // Check camera capabilities
  const checkCameraAvailability = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        throw new Error('No camera found on this device');
      }

      // Check if we can access the camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 }
        }
      });

      // Stop all tracks to clean up
      stream.getTracks().forEach(track => track.stop());
      
      return true;
    } catch (err) {
      console.error('Camera check failed:', err);
      setError(err.message || 'Camera access failed');
      return false;
    }
  };

  const handleScanResult = (scannedText) => {
    if (!scannedText) return;

    // Provide haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(100);
    }

    console.log(`Scan successful, raw text: ${scannedText}`);
    setIsScannerActive(false);
    setScanHistory(prev => [...prev, { 
      text: scannedText, 
      timestamp: new Date().toISOString() 
    }]);

    try {
      const urlObject = new URL(scannedText);
      const dataParam = urlObject.searchParams.get('d');
      
      if (dataParam) {
        navigate(`/scan?d=${dataParam}`);
      } else {
        setError("This does not appear to be a valid Greenfield QR Code.");
      }
    } catch (e) {
      console.error("Scanned content is not a valid URL:", e);
      setError("Scanned code is not a valid URL.");
    }
  };

  const handleScanError = (error) => {
    console.error("Scanner Error:", error);
    setError(error.message || "Scanning failed. Please try again.");
    setIsScannerActive(false);
    setIsLoading(false);
  };

  const startScanner = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const hasCamera = await checkCameraAvailability();
      if (!hasCamera) return;

      setIsScannerActive(true);
      setIsLoading(false);
    } catch (err) {
      console.error('Scanner initialization failed:', err);
      setError(err.message || 'Failed to initialize scanner');
      setIsLoading(false);
    }
  };

  const toggleFlash = () => {
    if (scannerRef.current) {
      scannerRef.current.torch = !hasFlash;
      setHasFlash(!hasFlash);
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup when component unmounts
      if (isScannerActive) {
        setIsScannerActive(false);
      }
    };
  }, [isScannerActive]);

  return (
    <div className="scanner-page-container">
      <h2>Scan QR Code</h2>
      
      {error && (
        <div className="scanner-error">
          <p>{error}</p>
          <button 
            className="action-button secondary" 
            onClick={() => setError(null)}
          >
            Try Again
          </button>
        </div>
      )}

      {!error && !isScannerActive && (
        <p>Click "Start Scan" to activate your camera.</p>
      )}

      {isLoading && (
        <div className="scanner-loading">
          <div className="loading-spinner"></div>
          <p>Initializing camera...</p>
        </div>
      )}

      {isScannerActive && !isLoading && (
        <div className="scanner-view-wrapper">
          <Scanner
            ref={scannerRef}
            onResult={(text) => handleScanResult(text)}
            onError={handleScanError}
            torch={hasFlash}
            constraints={{
              facingMode: 'environment',
              width: { min: 640, ideal: 1280, max: 1920 },
              height: { min: 480, ideal: 720, max: 1080 }
            }}
            components={{
              audio: false,
              tracker: false,
            }}
            styles={{
              container: {
                borderRadius: '16px'
              }
            }}
          />
          <div className="scanner-viewfinder"></div>
        </div>
      )}

      <div className="scanner-actions">
        {!isScannerActive ? (
          <button 
            className="action-button primary" 
            onClick={startScanner}
            disabled={isLoading}
            aria-label="Start QR code scanning"
          >
            {isLoading ? 'Initializing...' : 'Start Scan'}
          </button>
        ) : (
          <button 
            className="action-button" 
            onClick={toggleFlash}
            disabled={isLoading}
          >
            {hasFlash ? 'Turn Off Flash' : 'Turn On Flash'}
          </button>
        )}
        
        <button 
          className="action-button secondary" 
          onClick={() => navigate('/')}
          aria-label="Return to home page"
        >
          Return to Home
        </button>
      </div>
    </div>
  );
};

export default QRCodeScanner;