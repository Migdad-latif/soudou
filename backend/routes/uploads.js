const express = require('express');
const multer = require('multer');
const cloudinary = require('../utils/cloudinary'); // Cloudinary utility

const router = express.Router();

// Multer configuration: Use memory storage (no limits or fileFilter in this version)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage
});

// @route   POST /api/uploads/image
// @desc    Upload a single image to Cloudinary
// @access  Public (authentication can be added later)
router.post('/image', upload.single('image'), async (req, res, next) => {
  console.log("\n--- UPLOADS.JS DEBUG TEST ---");
  console.log("DEBUG: Request Headers (in uploads.js):", req.headers);
  console.log("DEBUG: Request Content-Type (in uploads.js):", req.headers['content-type']);
  console.log("DEBUG: Attempting to process file with Multer...");

  try {
    if (!req.file) {
      console.log("DEBUG: Multer DID NOT receive a file (req.file is undefined).");
      const multerError = new Error('No file received by Multer.');
      multerError.statusCode = 400; // Bad Request
      return next(multerError);
    }

    console.log("DEBUG: Multer SUCCESSFULLY received a file!");
    console.log("DEBUG: File details:", {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      bufferLength: req.file.buffer ? req.file.buffer.length : 0
    });

    // Upload image to Cloudinary
    const result = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
      {
        folder: 'soudou_properties', // Folder in Cloudinary
      }
    );

    // --- NEW: LOG CLOUDINARY RESULT OBJECT ---
    console.log("DEBUG: Cloudinary upload result object:", result);
    // --- END NEW LOG ---

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: result.secure_url, // Secure URL of the uploaded image
        public_id: result.public_id // Cloudinary public ID
      }
    });
    console.log("--- END UPLOADS.JS DEBUG TEST ---\n");
  } catch (err) {
    console.error('Cloudinary Upload Error (CAUGHT IN ROUTE):', err);
    const statusCode = err.http_code || 500;
    const uploadError = new Error(err.message || 'Cloudinary upload failed (unknown error).');
    uploadError.statusCode = statusCode;
    next(uploadError);
  }
});

module.exports = router;