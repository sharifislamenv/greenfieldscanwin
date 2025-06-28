/* D:\MyProjects\greenfield-scanwin\frontend\src\components\QRCodeScanner.jsx */

import React, { useState, useEffect, useRef } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useNavigate } from 'react-router-dom';
import './QRCodeScanner.css';

const QRCodeScanner = () => {
  const navigate = useNavigate();
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Start with loading false
  const [scanHistory, setScanHistory] = useState([]);
  const [error, setError] = useState(null);
  const scannerRef = useRef(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);

  // Check camera capabilities and permissions
  const checkCameraAvailability = async () => {
    try {
      // First check if browser supports mediaDevices
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }

      // Check camera permissions
      const permissionStatus = await navigator.permissions.query({ name: 'camera' });
      if (permissionStatus.state === 'denied') {
        throw new Error('Camera access denied. Please enable camera permissions in your browser settings.');
      }

      // Enumerate devices to check for cameras
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        throw new Error('No camera found on this device');
      }

      // Test camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 }
        }
      });

      // Stop all tracks to clean up
      stream.getTracks().forEach(track => track.stop());
      
      setHasCameraPermission(true);
      return true;
    } catch (err) {
      console.error('Camera check failed:', err);
      setError(getUserFriendlyError(err));
      setHasCameraPermission(false);
      return false;
    }
  };

  // Convert technical errors to user-friendly messages
  const getUserFriendlyError = (error) => {
    if (error.name === 'NotAllowedError') {
      return 'Camera access was denied. Please allow camera permissions to scan QR codes.';
    } else if (error.name === 'NotFoundError') {
      return 'No camera found on this device.';
    } else if (error.name === 'NotSupportedError') {
      return 'Your browser doesn\'t support camera access. Try using Chrome or Firefox.';
    } else if (error.name === 'SecurityError') {
      return 'Camera access is blocked for security reasons. Try accessing the site via HTTPS.';
    }
    return error.message || 'Failed to access camera. Please try again.';
  };

  const handleScanResult = (scannedText) => {
    if (!scannedText) return;

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
    setError(getUserFriendlyError(error));
    setIsScannerActive(false);
    setIsLoading(false);
  };

  const startScanner = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const hasCamera = await checkCameraAvailability();
      if (!hasCamera) {
        setIsLoading(false);
        return;
      }

      setIsScannerActive(true);
      setIsLoading(false);
    } catch (err) {
      console.error('Scanner initialization failed:', err);
      setError(getUserFriendlyError(err));
      setIsLoading(false);
    }
  };

  const toggleFlash = () => {
    if (scannerRef.current) {
      scannerRef.current.torch = !hasFlash;
      setHasFlash(!hasFlash);
    }
  };

  // Check camera on component mount
  useEffect(() => {
    checkCameraAvailability();
  }, []);

  return (
    <div className="scanner-page-container">
      <h2>Scan QR Code</h2>
      
      {error && (
        <div className="scanner-error">
          <p>{error}</p>
          <div className="scanner-error-actions">
            <button 
              className="action-button primary" 
              onClick={startScanner}
            >
              Try Again
            </button>
            <button 
              className="action-button secondary" 
              onClick={() => navigate('/')}
            >
              Return to Home
            </button>
          </div>
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
                borderRadius: '16px',
                width: '100%',
                height: '100%'
              }
            }}
            onStart={() => console.log('Scanner started')}
            onStop={() => console.log('Scanner stopped')}
          />
          <div className="scanner-viewfinder"></div>
        </div>
      )}

      <div className="scanner-actions">
        {!isScannerActive ? (
          <button 
            className="action-button primary" 
            onClick={startScanner}
            disabled={isLoading || !hasCameraPermission}
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