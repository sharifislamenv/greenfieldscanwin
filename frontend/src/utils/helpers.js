// HMAC Signature Creation (for QR code validation)
export const createHmacSignature = (secretKey, data) => {
  // In production, use a proper HMAC implementation
  // This is a simplified version for demonstration
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const dataBuffer = encoder.encode(data);
  
  let signature = '';
  for (let i = 0; i < dataBuffer.length; i++) {
    signature += String.fromCharCode(dataBuffer[i] ^ keyData[i % keyData.length]);
  }
  
  return btoa(signature).substring(0, 20);
};

// Receipt Parsing Functions
export const extractDate = (text) => {
  // Implementation as in ScanPage.jsx
};

export const extractTime = (text) => {
  // Implementation as in ScanPage.jsx
};

export const extractItems = (text) => {
  // Implementation as in ScanPage.jsx
};

export const extractTotal = (text) => {
  // Implementation as in ScanPage.jsx
};

// Distance Calculation
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2 - lat1) * Math.PI/180;
  const Δλ = (lon2 - lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
};