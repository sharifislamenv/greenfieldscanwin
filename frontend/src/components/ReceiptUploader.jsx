//D:\MyProjects\greenfield-scanwin\frontend\src\components\ReceiptUploader.jsx

import React, { useRef } from 'react';
import './ReceiptUploader.css';

const ReceiptUploader = ({ onReceiptSubmit, isProcessing }) => {
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleTakePhotoClick = () => {
    cameraInputRef.current.click();
  };

  const handleUploadFileClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      onReceiptSubmit(file);
    }
  };

  return (
    <div className="receipt-uploader-card">
      <h2>Upload Your Receipt</h2>
      <p>Take a new photo with your camera or choose one from your library to validate your purchase.</p>
      
      <div className="upload-options">
        <button
            className="upload-button primary"
            onClick={handleTakePhotoClick}
            disabled={isProcessing}
        >
            📷 Take Photo
        </button>

        <button
            className="upload-button secondary"
            onClick={handleUploadFileClick}
            disabled={isProcessing}
        >
            📁 Upload from Library
        </button>
      </div>

      {/* Hidden input for camera capture */}
      <input 
        type="file" 
        accept="image/*" 
        capture="environment"
        ref={cameraInputRef}
        onChange={handleFileChange} 
        style={{ display: 'none' }}
      />

      {/* Hidden input for file selection */}
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef}
        onChange={handleFileChange} 
        style={{ display: 'none' }}
      />
      
      {isProcessing && <div className="loader" style={{marginTop: '20px'}}>Processing...</div>}
    </div>
  );
};

export default ReceiptUploader;