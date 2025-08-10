const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { firestore, COLLECTIONS } = require('../config/firestore');

// Create custom indicator
router.post('/create', async (req, res) => {
  try {
    const { name, excelTemplate, stockColumn, dataColumn, dateColumn, description } = req.body;
    const indicatorId = uuidv4();
    
    const indicator = {
      id: indicatorId,
      name,
      excelTemplate,
      stockColumn,
      dataColumn,
      dateColumn,
      description: description || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await firestore.collection(COLLECTIONS.CUSTOM_INDICATORS).doc(indicatorId).set(indicator);
    
    res.json({ success: true, data: indicator });
  } catch (error) {
    console.error('Error creating custom indicator:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all custom indicators
router.get('/list', async (req, res) => {
  try {
    const snapshot = await firestore.collection(COLLECTIONS.CUSTOM_INDICATORS)
      .orderBy('createdAt', 'desc')
      .get();
    
    const indicators = [];
    snapshot.forEach(doc => {
      indicators.push({ id: doc.id, ...doc.data() });
    });
    
    res.json({ success: true, data: indicators });
  } catch (error) {
    console.error('Error getting custom indicators:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single custom indicator
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await firestore.collection(COLLECTIONS.CUSTOM_INDICATORS).doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Custom indicator not found' });
    }
    
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error('Error getting custom indicator:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update custom indicator
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {
      ...req.body,
      updatedAt: new Date()
    };
    
    await firestore.collection(COLLECTIONS.CUSTOM_INDICATORS).doc(id).update(updates);
    
    res.json({ success: true, message: 'Custom indicator updated successfully' });
  } catch (error) {
    console.error('Error updating custom indicator:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete custom indicator
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await firestore.collection(COLLECTIONS.CUSTOM_INDICATORS).doc(id).delete();
    
    res.json({ success: true, message: 'Custom indicator deleted successfully' });
  } catch (error) {
    console.error('Error deleting custom indicator:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get indicator data for specific stocks and date
router.post('/data', async (req, res) => {
  try {
    const { indicatorIds, stocks, date } = req.body;
    const indicatorData = {};
    
    // Get indicator definitions
    const indicatorPromises = indicatorIds.map(id => 
      firestore.collection(COLLECTIONS.CUSTOM_INDICATORS).doc(id).get()
    );
    
    const indicatorDocs = await Promise.all(indicatorPromises);
    
    for (let i = 0; i < indicatorDocs.length; i++) {
      const doc = indicatorDocs[i];
      if (!doc.exists) continue;
      
      const indicator = doc.data();
      const indicatorId = indicatorIds[i];
      
      // Get Excel data for this indicator
      const uploadQuery = await firestore.collection(COLLECTIONS.EXCEL_UPLOADS)
        .where('templateName', '==', indicator.excelTemplate)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
      
      if (!uploadQuery.empty) {
        const uploadData = uploadQuery.docs[0].data();
        const excelData = uploadData.data;
        
        indicatorData[indicatorId] = {};
        
        // Match stocks with Excel data
        stocks.forEach(stock => {
          const matchingRow = excelData.find(row => 
            row[indicator.stockColumn] && 
            row[indicator.stockColumn].toString().toUpperCase() === stock.toUpperCase()
          );
          
          if (matchingRow) {
            indicatorData[indicatorId][stock] = matchingRow[indicator.dataColumn] || 'N/A';
          } else {
            indicatorData[indicatorId][stock] = 'N/A';
          }
        });
      } else {
        indicatorData[indicatorId] = {};
        stocks.forEach(stock => {
          indicatorData[indicatorId][stock] = 'N/A';
        });
      }
    }
    
    res.json({ success: true, data: indicatorData });
  } catch (error) {
    console.error('Error getting indicator data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;