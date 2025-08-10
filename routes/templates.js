const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const moment = require('moment-timezone');
const { firestore, COLLECTIONS } = require('../config/firestore');

// Create template
router.post('/create', async (req, res) => {
  try {
    const { name, type, webhookIds } = req.body;
    const templateId = uuidv4();
    
    const template = {
      id: templateId,
      name,
      type, // 'TEXT_GENERATION', 'DISPLAY', 'REPORT'
      webhookIds: webhookIds || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await firestore.collection(COLLECTIONS.TEMPLATES).doc(templateId).set(template);
    
    res.json({ success: true, data: template });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update template
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {
      ...req.body,
      updatedAt: new Date()
    };
    
    await firestore.collection(COLLECTIONS.TEMPLATES).doc(id).update(updates);
    
    res.json({ success: true, message: 'Template updated successfully' });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete template
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await firestore.collection(COLLECTIONS.TEMPLATES).doc(id).delete();
    
    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all templates
router.get('/list', async (req, res) => {
  try {
    const { type } = req.query;
    let query = firestore.collection(COLLECTIONS.TEMPLATES);
    
    if (type) {
      query = query.where('type', '==', type);
    }
    
    const snapshot = await query.get();
    const templates = [];
    
    snapshot.forEach(doc => {
      templates.push({ id: doc.id, ...doc.data() });
    });
    
    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('Error listing templates:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate text from template
router.post('/generate-text/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const { date } = req.body;
    const targetDate = date || moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
    
    // Get template
    const templateDoc = await firestore.collection(COLLECTIONS.TEMPLATES).doc(templateId).get();
    if (!templateDoc.exists) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    
    const template = templateDoc.data();
    if (template.type !== 'TEXT_GENERATION') {
      return res.status(400).json({ success: false, error: 'Invalid template type' });
    }
    
    // Get webhook data for the specified date and webhooks
    const dataQuery = firestore.collection(COLLECTIONS.WEBHOOK_DATA)
      .where('date', '==', targetDate)
      .where('webhookId', 'in', template.webhookIds);
    
    const dataSnapshot = await dataQuery.get();
    
    // Group stocks by scan name
    const groupedData = {};
    dataSnapshot.forEach(doc => {
      const data = doc.data();
      if (!groupedData[data.scanName]) {
        groupedData[data.scanName] = [];
      }
      data.stocks.forEach(stock => {
        groupedData[data.scanName].push(`NSE:${stock}`);
      });
    });
    
    // Generate text in the specified format
    let generatedText = '';
    for (const [scanName, stocks] of Object.entries(groupedData)) {
      generatedText += `###${scanName.toUpperCase()},${stocks.join(',')},`;
    }
    
    res.json({ success: true, data: { generatedText, date: targetDate } });
  } catch (error) {
    console.error('Error generating text:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get display data for template
router.post('/display-data/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const { date } = req.body;
    const targetDate = date || moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
    
    // Get template
    const templateDoc = await firestore.collection(COLLECTIONS.TEMPLATES).doc(templateId).get();
    if (!templateDoc.exists) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    
    const template = templateDoc.data();
    if (template.type !== 'DISPLAY') {
      return res.status(400).json({ success: false, error: 'Invalid template type' });
    }
    
    // Get webhook data
    const dataQuery = firestore.collection(COLLECTIONS.WEBHOOK_DATA)
      .where('date', '==', targetDate)
      .where('webhookId', 'in', template.webhookIds);
    
    const dataSnapshot = await dataQuery.get();
    const displayData = [];
    
    for (const doc of dataSnapshot.docs) {
      const data = doc.data();
      
      // Get notes for these stocks if any
      const notesQuery = firestore.collection(COLLECTIONS.NOTES)
        .where('date', '==', targetDate)
        .where('webhookId', '==', data.webhookId);
      
      const notesSnapshot = await notesQuery.get();
      const notesMap = {};
      
      notesSnapshot.forEach(noteDoc => {
        const noteData = noteDoc.data();
        notesMap[noteData.stock] = noteData.note;
      });
      
      // Get stock success data
      const stockSuccessMap = {};
      const stockSectorMap = {};
      
      for (const stock of data.stocks) {
        const successId = `${data.webhookId}_${stock}_${targetDate}`;
        const successDoc = await firestore.collection(COLLECTIONS.STOCK_SUCCESS).doc(successId).get();
        
        if (successDoc.exists) {
          const successData = successDoc.data();
          stockSuccessMap[stock] = successData.isSuccess;
          stockSectorMap[stock] = successData.sectorIndex;
        }
      }
      
      // Combine stock data with notes and success status
      const stocksWithNotes = data.stocks.map((stock, index) => ({
        stock,
        triggerPrice: data.triggerPrices[index],
        note: notesMap[stock] || '',
        isSuccess: stockSuccessMap[stock] || false,
        sectorIndex: stockSectorMap[stock] || null
      }));
      
      displayData.push({
        webhookId: data.webhookId,
        webhookName: data.webhookName,
        scanName: data.scanName,
        triggeredAt: data.triggeredAt,
        stocks: stocksWithNotes
      });
    }
    
    res.json({ success: true, data: { displayData, date: targetDate } });
  } catch (error) {
    console.error('Error getting display data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all templates settings
router.get('/settings', async (req, res) => {
  try {
    const snapshot = await firestore.collection(COLLECTIONS.TEMPLATES).get();
    const templates = {
      textGeneration: [],
      display: [],
      report: []
    };
    
    snapshot.forEach(doc => {
      const data = { id: doc.id, ...doc.data() };
      switch (data.type) {
        case 'TEXT_GENERATION':
          templates.textGeneration.push(data);
          break;
        case 'DISPLAY':
          templates.display.push(data);
          break;
        case 'REPORT':
          templates.report.push(data);
          break;
      }
    });
    
    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('Error getting template settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;