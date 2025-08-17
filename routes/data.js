const express = require('express');
const router = express.Router();
const { firestore, COLLECTIONS } = require('../config/firestore');

// Helper function to convert data to CSV
function convertToCSV(data) {
  if (!data || data.length === 0) return '';
  
  const headers = ['Date', 'Webhook Name', 'Scanner Name', 'Stocks', 'Triggered At', 'Tags', 'Stock Set'];
  const csvRows = [headers.join(',')];
  
  data.forEach(item => {
    const row = [
      item.date || '',
      (item.webhookName || '').replace(/,/g, ';'),
      (item.scanName || '').replace(/,/g, ';'),
      (item.stocks || []).join(';'),
      (item.triggeredAt || '').replace(/,/g, ';'),
      (item.tags || []).join(';'),
      item.stockSet || ''
    ];
    csvRows.push(row.join(','));
  });
  
  return csvRows.join('\n');
}

// Helper function to perform search
async function performSearch(queryParams) {
  const { 
    date, 
    startDate, 
    endDate, 
    webhook, 
    scanner, 
    tag, 
    stockSet, 
    limit = 50 
  } = queryParams;
  
  let query = firestore.collection(COLLECTIONS.WEBHOOK_DATA);
  
  // Date filtering
  if (date) {
    query = query.where('date', '==', date);
  } else if (startDate && endDate) {
    query = query.where('date', '>=', startDate).where('date', '<=', endDate);
  } else if (startDate) {
    query = query.where('date', '>=', startDate);
  } else if (endDate) {
    query = query.where('date', '<=', endDate);
  }
  
  // Other filters
  if (webhook) {
    query = query.where('webhookName', '==', webhook);
  }
  
  if (stockSet) {
    query = query.where('stockSet', '==', stockSet);
  }
  
  // Order by date descending
  query = query.orderBy('date', 'desc').limit(parseInt(limit));
  
  const snapshot = await query.get();
  let results = [];
  
  snapshot.forEach(doc => {
    const data = { id: doc.id, ...doc.data() };
    
    // Additional filtering that can't be done in Firestore
    if (scanner && data.scanName !== scanner) return;
    if (tag && (!data.tags || !data.tags.includes(tag))) return;
    
    results.push(data);
  });
  
  return results;
}

// Search webhook data
router.get('/search', async (req, res) => {
  try {
    console.log('🔍 Data search request:', req.query);
    
    const results = await performSearch(req.query);
    
    console.log(`✅ Found ${results.length} results`);
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Error searching data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get search options (unique scanners, tags)
router.get('/search-options', async (req, res) => {
  try {
    console.log('📋 Getting search options...');
    
    const snapshot = await firestore.collection(COLLECTIONS.WEBHOOK_DATA)
      .limit(1000) // Adjust based on your data size
      .get();
    
    const scanners = new Set();
    const tags = new Set();
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.scanName) scanners.add(data.scanName);
      if (data.tags && Array.isArray(data.tags)) {
        data.tags.forEach(tag => tags.add(tag));
      }
    });
    
    const result = {
      success: true,
      scanners: Array.from(scanners).sort(),
      tags: Array.from(tags).sort()
    };
    
    console.log(`✅ Found ${result.scanners.length} scanners, ${result.tags.length} tags`);
    res.json(result);
  } catch (error) {
    console.error('Error getting search options:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single webhook data item
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📄 Getting data item: ${id}`);
    
    const doc = await firestore.collection(COLLECTIONS.WEBHOOK_DATA).doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Data not found' });
    }
    
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error('Error getting data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete webhook data
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Deleting data item: ${id}`);
    
    await firestore.collection(COLLECTIONS.WEBHOOK_DATA).doc(id).delete();
    res.json({ success: true, message: 'Data deleted successfully' });
  } catch (error) {
    console.error('Error deleting data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export search results
router.get('/export', async (req, res) => {
  try {
    console.log('📤 Exporting search results...');
    
    const searchResults = await performSearch(req.query);
    const csv = convertToCSV(searchResults);
    
    const filename = `webhook-data-${new Date().toISOString().split('T')[0]}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
    
    console.log(`✅ Exported ${searchResults.length} records`);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get data statistics
router.get('/stats/overview', async (req, res) => {
  try {
    console.log('📊 Getting data statistics...');
    
    // Get total data count
    const totalSnapshot = await firestore.collection(COLLECTIONS.WEBHOOK_DATA).get();
    const totalData = totalSnapshot.size;
    
    // Get today's data count
    const today = new Date().toISOString().split('T')[0];
    const todaySnapshot = await firestore.collection(COLLECTIONS.WEBHOOK_DATA)
      .where('date', '==', today)
      .get();
    const todayData = todaySnapshot.size;
    
    // Get this week's data count
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoDate = weekAgo.toISOString().split('T')[0];
    
    const weekSnapshot = await firestore.collection(COLLECTIONS.WEBHOOK_DATA)
      .where('date', '>=', weekAgoDate)
      .get();
    const weekData = weekSnapshot.size;
    
    // Get unique webhook names
    const webhookNames = new Set();
    totalSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.webhookName) webhookNames.add(data.webhookName);
    });
    
    res.json({
      success: true,
      data: {
        totalData,
        todayData,
        weekData,
        uniqueWebhooks: webhookNames.size
      }
    });
    
    console.log(`✅ Stats: ${totalData} total, ${todayData} today, ${weekData} this week`);
  } catch (error) {
    console.error('Error getting data stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bulk delete data
router.delete('/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ success: false, error: 'Invalid IDs provided' });
    }
    
    console.log(`🗑️ Bulk deleting ${ids.length} items...`);
    
    const batch = firestore.batch();
    
    ids.forEach(id => {
      const docRef = firestore.collection(COLLECTIONS.WEBHOOK_DATA).doc(id);
      batch.delete(docRef);
    });
    
    await batch.commit();
    
    res.json({ 
      success: true, 
      message: `Successfully deleted ${ids.length} items` 
    });
    
    console.log(`✅ Bulk deleted ${ids.length} items`);
  } catch (error) {
    console.error('Error bulk deleting data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Data API is running',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /search - Search webhook data',
      'GET /search-options - Get filter options',
      'GET /:id - Get single data item',
      'DELETE /delete/:id - Delete data item',
      'GET /export - Export search results as CSV',
      'GET /stats/overview - Get data statistics',
      'DELETE /bulk-delete - Bulk delete data items'
    ]
  });
});

module.exports = router;