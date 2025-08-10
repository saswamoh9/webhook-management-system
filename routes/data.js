const express = require('express');
const router = express.Router();
const { firestore, COLLECTIONS } = require('../config/firestore');

// Search webhook data
router.post('/search', async (req, res) => {
  try {
    const { date, webhookName, tag, scannerName } = req.body;
    let query = firestore.collection(COLLECTIONS.WEBHOOK_DATA);
    
    if (date) {
      query = query.where('date', '==', date);
    }
    
    if (webhookName) {
      query = query.where('webhookName', '==', webhookName);
    }
    
    if (scannerName) {
      query = query.where('scanName', '==', scannerName);
    }
    
    const snapshot = await query.get();
    let results = [];
    
    snapshot.forEach(doc => {
      const data = { id: doc.id, ...doc.data() };
      
      // Filter by tag if provided
      if (!tag || (data.tags && data.tags.includes(tag))) {
        results.push(data);
      }
    });
    
    // Sort by triggered time (most recent first)
    results.sort((a, b) => {
      const timeA = a.triggeredAt || '';
      const timeB = b.triggeredAt || '';
      return timeB.localeCompare(timeA);
    });
    
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Error searching data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete webhook data
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await firestore.collection(COLLECTIONS.WEBHOOK_DATA).doc(id).delete();
    
    res.json({ success: true, message: 'Data deleted successfully' });
  } catch (error) {
    console.error('Error deleting data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete data by date range
router.post('/delete-by-date', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    const query = firestore.collection(COLLECTIONS.WEBHOOK_DATA)
      .where('date', '>=', startDate)
      .where('date', '<=', endDate);
    
    const snapshot = await query.get();
    const batch = firestore.batch();
    
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    res.json({ 
      success: true, 
      message: `Deleted ${snapshot.size} records from ${startDate} to ${endDate}` 
    });
  } catch (error) {
    console.error('Error deleting data by date:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all unique stocks
router.get('/stocks', async (req, res) => {
  try {
    const snapshot = await firestore.collection(COLLECTIONS.WEBHOOK_DATA).get();
    const stocksSet = new Set();
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.stocks && Array.isArray(data.stocks)) {
        data.stocks.forEach(stock => stocksSet.add(stock));
      }
    });
    
    const stocks = Array.from(stocksSet).sort();
    res.json({ success: true, data: stocks });
  } catch (error) {
    console.error('Error getting stocks:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all unique tags
router.get('/tags', async (req, res) => {
  try {
    const snapshot = await firestore.collection(COLLECTIONS.WEBHOOKS).get();
    const tagsSet = new Set();
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.tags && Array.isArray(data.tags)) {
        data.tags.forEach(tag => tagsSet.add(tag));
      }
    });
    
    const tags = Array.from(tagsSet).sort();
    res.json({ success: true, data: tags });
  } catch (error) {
    console.error('Error getting tags:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all unique scanner names
router.get('/scanners', async (req, res) => {
  try {
    const snapshot = await firestore.collection(COLLECTIONS.WEBHOOK_DATA).get();
    const scannersSet = new Set();
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.scanName) {
        scannersSet.add(data.scanName);
      }
    });
    
    const scanners = Array.from(scannersSet).sort();
    res.json({ success: true, data: scanners });
  } catch (error) {
    console.error('Error getting scanners:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;