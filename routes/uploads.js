const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment-timezone');
const { firestore, COLLECTIONS } = require('../config/firestore');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  }
});

// Upload Excel file
router.post('/excel', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    if (data.length === 0) {
      return res.status(400).json({ success: false, error: 'Excel file is empty' });
    }
    
    // Extract file name without extension for template name
    const templateName = req.file.originalname.replace(/\.[^/.]+$/, '');
    const uploadId = uuidv4();
    const uploadDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
    
    // Get column names
    const columns = Object.keys(data[0]);
    
    // Create or update upload template
    const templateQuery = await firestore.collection(COLLECTIONS.UPLOAD_TEMPLATES)
      .where('name', '==', templateName)
      .get();
    
    let templateId;
    if (templateQuery.empty) {
      // Create new template
      templateId = uuidv4();
      await firestore.collection(COLLECTIONS.UPLOAD_TEMPLATES).doc(templateId).set({
        id: templateId,
        name: templateName,
        columns,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } else {
      // Update existing template
      templateId = templateQuery.docs[0].id;
      await firestore.collection(COLLECTIONS.UPLOAD_TEMPLATES).doc(templateId).update({
        columns,
        updatedAt: new Date()
      });
    }
    
    // Store Excel data
    const excelData = {
      id: uploadId,
      templateId,
      templateName,
      fileName: req.file.originalname,
      columns,
      data,
      rowCount: data.length,
      uploadedAt: uploadDate,
      createdAt: new Date()
    };
    
    await firestore.collection(COLLECTIONS.EXCEL_UPLOADS).doc(uploadId).set(excelData);
    
    res.json({
      success: true,
      data: {
        uploadId,
        templateName,
        columns,
        rowCount: data.length,
        uploadedAt: uploadDate
      }
    });
  } catch (error) {
    console.error('Error uploading Excel:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get upload templates
router.get('/templates', async (req, res) => {
  try {
    const snapshot = await firestore.collection(COLLECTIONS.UPLOAD_TEMPLATES).get();
    const templates = [];
    
    snapshot.forEach(doc => {
      templates.push({ id: doc.id, ...doc.data() });
    });
    
    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('Error getting upload templates:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get uploaded data by template
router.get('/data/:templateName', async (req, res) => {
  try {
    const { templateName } = req.params;
    const { limit = 10, offset = 0 } = req.query;
    
    const snapshot = await firestore.collection(COLLECTIONS.EXCEL_UPLOADS)
      .where('templateName', '==', templateName)
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset))
      .get();
    
    const uploads = [];
    snapshot.forEach(doc => {
      uploads.push({ id: doc.id, ...doc.data() });
    });
    
    res.json({ success: true, data: uploads });
  } catch (error) {
    console.error('Error getting uploaded data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete uploaded data
router.delete('/delete/:uploadId', async (req, res) => {
  try {
    const { uploadId } = req.params;
    await firestore.collection(COLLECTIONS.EXCEL_UPLOADS).doc(uploadId).delete();
    
    res.json({ success: true, message: 'Upload deleted successfully' });
  } catch (error) {
    console.error('Error deleting upload:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export data to Excel
router.post('/export', async (req, res) => {
  try {
    const { templateName, startDate, endDate } = req.body;
    
    let query = firestore.collection(COLLECTIONS.EXCEL_UPLOADS);
    
    if (templateName) {
      query = query.where('templateName', '==', templateName);
    }
    
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      return res.status(404).json({ success: false, error: 'No data found' });
    }
    
    // Combine all data
    let allData = [];
    snapshot.forEach(doc => {
      const upload = doc.data();
      allData = allData.concat(upload.data);
    });
    
    // Create new workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(allData);
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    
    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    // Send file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${templateName || 'export'}_${moment().format('YYYYMMDD')}.xlsx"`);
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;