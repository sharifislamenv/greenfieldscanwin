//D:\MyProjects\greenfield-scanwin\frontend\src\components\QRCodeScanner.jsx

import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';

const QRCodeScanner = () => {
  const scannerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // This function will be called on successful scan
    const onScanSuccess = (decodedText, decodedResult) => {
      console.log(`Scan successful, decoded text: ${decodedText}`);
      
      // Stop the scanner
      scanner.clear().catch(error => {
        console.error("Failed to clear scanner.", error);
      });

      // Extract the '?d=...' parameter from the scanned URL
      try {
        const urlObject = new URL(decodedText);
        const dataParam = urlObject.searchParams.get('d');
        if (dataParam) {
          // Navigate to the validation page with the data
          navigate(`/scan?d=${dataParam}`);
        } else {
          console.error("Scanned QR code does not contain the 'd' parameter.");
        }
      } catch (error) {
        console.error("Scanned content is not a valid URL:", error);
      }
    };

    // This function will be called on scan failure
    const onScanFailure = (error) => {
      // The library will continuously scan, so we can ignore individual failures.
      // console.warn(`QR scan failure: ${error}`);
    };

    const scanner = new Html5QrcodeScanner(
      'qr-code-reader', 
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 } 
      },
      false // Use verbose = false
    );

    scanner.render(onScanSuccess, onScanFailure);

    // Cleanup function to clear the scanner when the component is unmounted
    return () => {
      // Ensure the scanner's clear method is available and the element exists
      if (scanner && scanner.getState() !== "NOT_STARTED") {
        scanner.clear().catch(error => {
          console.error("Failed to clear scanner on unmount.", error);
        });
      }
    };
  }, [navigate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
      <h2>Scan QR Code</h2>
      <p>Point your camera at a Greenfield QR code.</p>
      <div id="qr-code-reader" style={{ width: '100%', maxWidth: '500px', border: '1px solid #ccc', borderRadius: '8px' }}></div>
    </div>
  );
};

export default QRCodeScanner;