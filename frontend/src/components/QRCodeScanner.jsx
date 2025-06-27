import React from 'react';
import { Scanner } from '@yudiel/react-qr-scanner'; // --- FIX: Import from the new, correct library
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
        <Scanner // --- FIX: Use the new <Scanner /> component
          onResult={(text, result) => handleScanResult(text)}
          onError={(error) => console.log(error?.message)}
          components={{
            audio: false, 
            tracker: true, 
          }}
          styles={{
            container: {
              borderRadius: '16px'
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