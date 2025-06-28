/* D:\MyProjects\greenfield-scanwin\frontend\src\components\QRCodeScanner.jsx */

import React, { useState, useEffect, useRef } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useNavigate } from 'react-router-dom';
import './QRCodeScanner.css';

const QRCodeScanner = () => {
  const navigate = useNavigate();
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const scannerRef = useRef(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [scanAttempts, setScanAttempts] = useState(0);
  const [isScanning, setIsScanning] = useState(false);

  const checkCameraAvailability = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      const videoTrack = stream.getVideoTracks()[0];
      if (!videoTrack) throw new Error('No video track available');

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

  const handleScanResult = (text, result) => {
    if (!text || isScanning) return;
    
    setIsScanning(true);
    console.log('Scan result:', { text, result });
    
    // Validate URL format
    if (!text.startsWith('http') && !text.startsWith('https')) {
      setError('Invalid QR code format. Please scan a valid URL.');
      setScanAttempts(prev => prev + 1);
      if (scanAttempts >= 2) setIsScannerActive(false);
      setIsScanning(false);
      return;
    }

    // Vibrate on success
    if ('vibrate' in navigator) navigator.vibrate(100);

    try {
      const url = new URL(text);
      const dataParam = url.searchParams.get('d');
      
      if (dataParam) {
        navigate(`/scan?d=${encodeURIComponent(dataParam)}`);
      } else {
        setError('This QR code doesn\'t contain valid scan data.');
      }
    } catch (e) {
      console.error("URL parsing error:", e);
      setError("Couldn't process QR code data. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

  const startScanner = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const hasCamera = await checkCameraAvailability();
      if (!hasCamera) throw new Error('Camera not available');

      setIsScannerActive(true);
      setScanAttempts(0);
    } catch (err) {
      console.error('Scanner start failed:', err);
      setError(getUserFriendlyError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFlash = () => {
    if (scannerRef.current && scannerRef.current.torch !== undefined) {
      const newState = !hasFlash;
      scannerRef.current.torch = newState;
      setHasFlash(newState);
    }
  };

  useEffect(() => {
    const init = async () => {
      await checkCameraAvailability();
    };
    init();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop();
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
          <Scanner
            ref={scannerRef}
            onResult={(text, result) => handleScanResult(text, result)}
            onError={(err) => {
              console.error('Scanner error:', err);
              setError(`Scanning failed: ${err.message}`);
              setIsScannerActive(false);
            }}
            torch={hasFlash}
            constraints={{
              facingMode: 'environment',
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            }}
            options={{
              delayBetweenScanAttempts: 100,
              maxScansPerSecond: 30,
              highlightScanRegion: true,
              highlightCodeOutline: true,
              returnDetailedScanResult: true,
              preferredCamera: 'environment',
              scanRegion: {
                x: 25,
                y: 25,
                width: 50,
                height: 50
              },
              formatsToSupport: [
                'qr_code',
                'ean_13',
                'ean_8',
                'code_128',
                'code_39',
                'code_93',
                'codabar',
                'upc_a',
                'upc_e'
              ]
            }}
            styles={{
              container: {
                width: '100%',
                height: '100%',
                position: 'relative'
              },
              video: {
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }
            }}
          />
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
              onClick={() => setIsScannerActive(false)}
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