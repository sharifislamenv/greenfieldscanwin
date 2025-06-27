
// D:\MyProjects\greenfield-scanwin\frontend\src\components\QRCodeScanner.jsx

import React from 'react';
import { Scanner } from '@yudiel/react-qr-scanner'; // Import from the new library
import { useNavigate } from 'react-router-dom';
import './QRCodeScanner.css';

const QRCodeScanner = () => {
  const navigate = useNavigate();

  const handleScanResult = (scannedText) => {
    if (scannedText) {
      console.log(`Scan successful, raw text: ${scannedText}`);

      try {
        // We will try to parse the scanned text as a URL
        const urlObject = new URL(scannedText);
        // And get the 'd' parameter from it
        const dataParam = urlObject.searchParams.get('d');
        
        if (dataParam) {
          // If successful, navigate to the validation page with the data
          navigate(`/scan?d=${dataParam}`);
        } else {
          // If the URL is valid but has no 'd' parameter
          alert("This does not appear to be a valid Greenfield QR Code.");
        }
      } catch (e) {
        // If the scanned text is not a valid URL at all
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
          components={{
            audio: false, // Turn off the "beep" sound
            tracker: true, // Show the tracking box
          }}
          styles={{
            container: {
              borderRadius: '16px' // Match the wrapper style
            }
          }}
        />
      </div>

      <p style={{marginTop: '20px', fontSize: '0.9rem', color: '#6b7280'}}>
        Looking for a QR code...
      </p>
    </div>
  );
};

export default QRCodeScanner;