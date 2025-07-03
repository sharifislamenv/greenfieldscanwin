/* D:\MyProjects\greenfield-scanwin\frontend\src\components\QRCodeScanner.jsx */

import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import './QRCodeScanner.css';

const QRCodeScanner = () => {
  const navigate = useNavigate();
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [error, setError] = useState(null);
  
  // A ref to hold the scanner instance so we can call its methods
  const html5QrCodeRef = useRef(null);
  
  // This useEffect hook is the core of the solution.
  // It runs ONLY when 'isScannerActive' changes.
  useEffect(() => {
    // If the scanner should not be active, do nothing.
    if (!isScannerActive) {
      // If the scanner instance exists and is scanning, stop it.
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(e => console.error("Failed to stop scanner on deactivation.", e));
      }
      return;
    }

    // This is an async function to start the camera scanning.
    const startScanner = async () => {
      try {
        // Create a new instance of the scanner library, attaching to our div.
        html5QrCodeRef.current = new Html5Qrcode("qr-scanner-container");
        
        const onScanSuccess = (decodedText) => {
          handleScanResult(decodedText);
        };
        
        const onScanFailure = (errorMessage) => {
          // We can ignore the "NotFound" error which happens on every frame.
        };

        // Start the camera and scanning process.
        await html5QrCodeRef.current.start(
          { facingMode: "environment" }, // Request the rear camera on mobile
          { fps: 10, qrbox: { width: 250, height: 250 } },
          onScanSuccess,
          onScanFailure
        );

      } catch (err) {
        console.error("Failed to start scanner:", err);
        setError("Could not initialize camera. Please check browser permissions and refresh.");
        setIsScannerActive(false); // Turn off on error
      }
    };

    startScanner();

    // This is a cleanup function. It runs when the component is removed
    // from the page, ensuring the camera is turned off.
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(e => console.error("Failed to stop scanner on cleanup.", e));
      }
    };
  }, [isScannerActive]);

  const handleScanResult = (scannedText) => {
    if (scannedText) {
      setIsScannerActive(false); // Stop scanning on success
      try {
        const urlObject = new URL(scannedText);
        const dataParam = urlObject.searchParams.get('d');
        if (dataParam) {
          navigate(`/scan?d=${dataParam}`);
        } else {
          setError("Invalid Greenfield QR Code: Data parameter missing.");
        }
      } catch (e) {
        setError("Scanned code is not a valid URL.");
      }
    }
  };

  return (
    <div className="scanner-page-container">
      <h2>Scan QR Code</h2>

      {error && (
        <div className="scanner-error">
            <p>{error}</p>
        </div>
      )}

      {/* This container is now always in the DOM but hidden until active.
          This prevents the "HTML Element not found" error. */}
      <div className="scanner-view-wrapper" style={{ display: isScannerActive ? 'block' : 'none' }}>
        <div id="qr-scanner-container"></div>
        <div className="scanner-viewfinder"></div>
        <div className="scanner-hint">Align QR code within the frame</div>
      </div>
      
      {!isScannerActive && !error && (
        <p>Click "Start Scan" to activate your camera.</p>
      )}
      
      {isScannerActive && <p className="scanner-status">Looking for a QR code...</p>}

      <div className="scanner-actions">
        {!isScannerActive ? (
          <button className="action-button primary" onClick={() => { setError(null); setIsScannerActive(true); }}>
            Start Scan
          </button>
        ) : (
          <button className="action-button secondary" onClick={() => setIsScannerActive(false)}>
            Stop Scanning
          </button>
        )}
        <button className="action-button secondary" onClick={() => navigate('/')}>
          Return to Home
        </button>
      </div>
    </div>
  );
};

export default QRCodeScanner;