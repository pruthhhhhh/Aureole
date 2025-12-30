/**
 * QR Code Generator Utility
 * Generates QR codes for order IDs
 */

const QRCode = require('qrcode');

/**
 * Generate QR Code as Data URL
 * @param {string} orderId - Order ID to encode
 * @param {string} frontendUrl - Frontend URL for payment
 * @returns {Promise<string>} Data URL of QR code image
 */
const generateQRCode = async (orderId, frontendUrl) => {
  try {
    const url = `${frontendUrl}/payment?orderId=${orderId}`;
    const qrDataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      margin: 2,
    });
    return qrDataUrl;
  } catch (error) {
    console.error('QR Code Generation Error:', error);
    throw error;
  }
};

/**
 * Generate QR Code as Buffer
 * @param {string} orderId - Order ID to encode
 * @param {string} frontendUrl - Frontend URL for payment
 * @returns {Promise<Buffer>} Buffer of QR code image
 */
const generateQRCodeBuffer = async (orderId, frontendUrl) => {
  try {
    const url = `${frontendUrl}/payment?orderId=${orderId}`;
    const qrBuffer = await QRCode.toBuffer(url, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      margin: 2,
    });
    return qrBuffer;
  } catch (error) {
    console.error('QR Code Generation Error:', error);
    throw error;
  }
};

module.exports = {
  generateQRCode,
  generateQRCodeBuffer,
};

