/* D:\MyProjects\greenfield-scanwin\frontend\src\components\QRCodeScanner.jsx */

import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import './QRCodeScanner.css';

const QRCodeScanner = () => {
  const navigate = useNavigate();
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scanAttempts, setScanAttempts] = useState(0);
  const scannerRef = useRef(null);
  const html5QrCodeScanner = useRef(null);

  const checkCameraAvailability = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      console.error('Camera check failed:', err);
      setError(getUserFriendlyError(err));
      return false;
    }
  };

  const getUserFriendlyError = (error) => {
    switch(error.name) {
      case 'NotAllowedError':
        return 'Camera access denied. Please enable camera permissions in your browser settings.';
      case 'NotFoundError':
        return 'No camera found. Please check your device.';
      case 'NotSupportedError':
        return 'Browser not supported. Try Chrome or Firefox.';
      case 'OverconstrainedError':
        return 'Camera requirements not met. Try different camera settings.';
      case 'SecurityError':
        return 'Camera blocked. Ensure you\'re on HTTPS.';
      default:
        return error.message || 'Camera access failed. Please try again.';
    }
  };

  const handleScanResult = (decodedText, decodedResult) => {
    if (!decodedText) return;
    
    console.log('Scan result:', { decodedText, decodedResult });
    
    // Validate URL format
    if (!decodedText.startsWith('http') && !decodedText.startsWith('https')) {
      setError('Invalid QR code format. Please scan a valid URL.');
      setScanAttempts(prev => prev + 1);
      if (scanAttempts >= 2) setIsScannerActive(false);
      return;
    }

    // Vibrate on success
    if ('vibrate' in navigator) navigator.vibrate(100);

    try {
      const url = new URL(decodedText);
      const dataParam = url.searchParams.get('d');
      
      if (dataParam) {
        html5QrCodeScanner.current?.stop().then(() => {
          navigate(`/scan?d=${encodeURIComponent(dataParam)}`);
        });
      } else {
        setError('This QR code doesn\'t contain valid scan data.');
      }
    } catch (e) {
      console.error("URL parsing error:", e);
      setError("Couldn't process QR code data. Please try again.");
    }
  };

  const handleScanError = (error) => {
    if (!error.message.includes('NotFoundException')) {
      console.error('Scanner error:', error);
      setError(`Scanning failed: ${error.message || 'Please try again'}`);
    }
  };

  const startScanner = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const hasCamera = await checkCameraAvailability();
      if (!hasCamera) throw new Error('Camera not available');

      if (html5QrCodeScanner.current) {
        html5QrCodeScanner.current.clear();
      }

      html5QrCodeScanner.current = new Html5QrcodeScanner(
        "qr-scanner-container",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          rememberLastUsedCamera: true,
          supportedScanTypes: [1] // Camera scan only
        },
        false
      );

      html5QrCodeScanner.current.render(
        handleScanResult,
        handleScanError
      );

      setIsScannerActive(true);
      setScanAttempts(0);
    } catch (err) {
      console.error('Scanner start failed:', err);
      setError(getUserFriendlyError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFlash = async () => {
    if (html5QrCodeScanner.current) {
      try {
        const newState = !hasFlash;
        await html5QrCodeScanner.current.applyVideoConstraints({
          advanced: [{ torch: newState }]
        });
        setHasFlash(newState);
      } catch (err) {
        console.error('Flash toggle failed:', err);
        setError('Flash not supported on this device');
      }
    }
  };

  const stopScanner = () => {
    if (html5QrCodeScanner.current) {
      html5QrCodeScanner.current.clear().catch(err => {
        console.error('Failed to stop scanner:', err);
      });
    }
    setIsScannerActive(false);
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeScanner.current) {
        html5QrCodeScanner.current.clear().catch(err => {
          console.error('Failed to clean up scanner:', err);
        });
      }
    };
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
          <div id="qr-scanner-container"></div>
          <div className="scanner-viewfinder"></div>
          <div className="scanner-hint">Align QR code within frame</div>
        </div>
      )}

      <div className="scanner-actions">
        {!isScannerActive ? (
          <button 
            className="action-button primary" 
            onClick={startScanner}
            disabled={isLoading}
          >
            {isLoading ? 'Initializing...' : 'Start Scan'}
          </button>
        ) : (
          <>
            <button 
              className="action-button" 
              onClick={toggleFlash}
              disabled={isLoading}
            >
              {hasFlash ? 'Turn Off Flash' : 'Turn On Flash'}
            </button>
            <button 
              className="action-button secondary" 
              onClick={stopScanner}
            >
              Stop Scanner
            </button>
          </>
        )}
        
        <button 
          className="action-button secondary" 
          onClick={() => navigate('/')}
        >
          Return to Home
        </button>
      </div>
    </div>
  );
};

export default QRCodeScanner;