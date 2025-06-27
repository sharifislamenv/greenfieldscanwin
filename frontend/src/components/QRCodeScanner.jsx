/* D:\MyProjects\greenfield-scanwin\frontend\src\components\QRCodeScanner.jsx */

import React, { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useNavigate } from 'react-router-dom';
import './QRCodeScanner.css';

const QRCodeScanner = () => {
  const navigate = useNavigate();
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scanHistory, setScanHistory] = useState([]);

  const handleScanResult = (scannedText) => {
    if (scannedText) {
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
          alert("This does not appear to be a valid Greenfield QR Code.");
          navigate('/');
        }
      } catch (e) {
        console.error("Scanned content is not a valid URL:", e);
        alert("Scanned code is not a valid URL.");
        navigate('/');
      }
    }
  };

  const handleScanError = (error) => {
    console.error("Scanner Error Object:", error);
    setIsScannerActive(false);
    setIsLoading(false);
    
    let errorMessage = "Scanning failed. Please try again.";
    if (error.name === 'NotAllowedError') {
      errorMessage = "Camera access denied. Please enable camera permissions.";
    } else if (error.name === 'NotFoundError') {
      errorMessage = "No camera found on this device.";
    }
    
    alert(errorMessage);
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
      
      {!isScannerActive && (
        <p>Click "Start Scan" to activate your camera.</p>
      )}

      {isScannerActive && isLoading && (
        <div className="scanner-loading">
          <div className="loading-spinner"></div>
          <p>Initializing camera...</p>
        </div>
      )}

      {isScannerActive && !isLoading && (
        <div className="scanner-view-wrapper">
          <Scanner
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
            onStart={() => setIsLoading(false)}
          />
          <div className="scanner-viewfinder"></div>
        </div>
      )}

      <div className="scanner-actions">
        {!isScannerActive ? (
          <button 
            className="action-button primary" 
            onClick={() => {
              setIsScannerActive(true);
              setIsLoading(true);
            }}
            aria-label="Start QR code scanning"
          >
            Start Scan
          </button>
        ) : (
          <button 
            className="action-button" 
            onClick={() => setHasFlash(!hasFlash)}
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