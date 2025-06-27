/* D:\MyProjects\greenfield-scanwin\frontend\src\components\QRCodeScanner.jsx */

import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useNavigate } from 'react-router-dom';
import './QRCodeScanner.css';

const QRCodeScanner = () => {
  const navigate = useNavigate();
  const [isScannerActive, setIsScannerActive] = useState(false);

  const handleScanResult = (scannedText) => {
    if (scannedText) {
      console.log(`Scan successful, raw text: ${scannedText}`);
      setIsScannerActive(false); // Turn off scanner after a successful scan

      try {
        const urlObject = new URL(scannedText);
        const dataParam = urlObject.searchParams.get('d');
        
        if (dataParam) {
          navigate(`/scan?d=${dataParam}`); // Navigate to the validation page
        } else {
          alert("This does not appear to be a valid Greenfield QR Code.");
          navigate('/'); // Go home on invalid code
        }
      } catch (e) {
        console.error("Scanned content is not a valid URL:", e);
        alert("Scanned code is not a valid URL.");
        navigate('/'); // Go home on invalid code
      }
    }
  };

  const handleScanError = (error) => {
    // Log the entire error object for detailed debugging if needed
    console.error("Scanner Error Object:", error);
  };

  return (
    <div className="scanner-page-container">
      <h2>Scan QR Code</h2>
      
      {!isScannerActive && (
        <p>Click "Start Scan" to activate your camera.</p>
      )}

      {isScannerActive && (
        <div className="scanner-view-wrapper">
          <Scanner
            onResult={(text) => handleScanResult(text)}
            onError={handleScanError}
            
            // --- MERGED AND FINALIZED PROPS ---
            constraints={{
              facingMode: 'environment',
              width: { min: 640, ideal: 1280, max: 1920 },
              height: { min: 480, ideal: 720, max: 1080 }
            }}
            components={{
              audio: false, 
              tracker: false, // Disable default tracker to use our CSS viewfinder
            }}
            styles={{
              container: {
                borderRadius: '16px'
              }
            }}
            // ------------------------------------
          />
          <div className="scanner-viewfinder"></div>
        </div>
      )}

      <div className="scanner-actions">
        {!isScannerActive && (
            <button className="action-button primary" onClick={() => setIsScannerActive(true)}>
              Start Scan
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