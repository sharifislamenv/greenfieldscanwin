/* D:\MyProjects\greenfield-scanwin\frontend\src\components\QRCodeScanner.jsx */

import React from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useNavigate } from 'react-router-dom';
import './QRCodeScanner.css';

const QRCodeScanner = () => {
  const navigate = useNavigate();

  const handleScanResult = (scannedText) => {
    if (scannedText) {
      console.log(`Scan successful, raw text: ${scannedText}`);

      try {
        const urlObject = new URL(scannedText);
        const dataParam = urlObject.searchParams.get('d');
        
        if (dataParam) {
          // Navigate to the validation page with the data
          navigate(`/scan?d=${dataParam}`);
        } else {
          alert("This does not appear to be a valid Greenfield QR Code.");
        }
      } catch (e) {
        console.error("Scanned content is not a valid URL:", e);
        alert("Scanned code is not a valid URL.");
      }
    }
  };

  return (
    <div className="scanner-page-container">
      <h2>Scan QR Code</h2>
      <p>Point your camera at a Greenfield QR code to begin.</p>
      
      <div className="scanner-view-wrapper">
        <Scanner
          onResult={(text, result) => handleScanResult(text)}
          onError={(error) => console.log(error?.message)}
          
          // --- THE FIX: Explicitly request the rear-facing camera ---
          constraints={{
            facingMode: 'environment'
          }}
          // -----------------------------------------------------------

          components={{
            audio: false, 
            tracker: false, // We disable the library's tracker to use our own CSS viewfinder
          }}
          styles={{
            container: {
              borderRadius: '16px'
            }
          }}
        />
        {/* This div acts as our custom viewfinder styled by the CSS */}
        <div className="scanner-viewfinder"></div>
      </div>

      <p style={{marginTop: '20px', fontSize: '0.9rem', color: '#6b7280'}}>
        Looking for a QR code...
      </p>
    </div>
  );
};

export default QRCodeScanner;