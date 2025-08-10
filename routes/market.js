const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const moment = require('moment-timezone');
const { firestore, COLLECTIONS } = require('../config/firestore');

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Market routes are working',
    collections: COLLECTIONS,
    timestamp: new Date().toISOString()
  });
});

// Create/Update market condition for a date (Feature 2: Updated structure)
router.post('/condition', async (req, res) => {
  try {
    const { date, broadIndexCondition, marketConditionText, sectorIndices } = req.body;
    const conditionDate = date || moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
    
    // Check if condition exists for this date
    const existingQuery = await firestore.collection(COLLECTIONS.MARKET_CONDITIONS)
      .where('date', '==', conditionDate)
      .get();
    
    let conditionId;
    
    if (existingQuery.empty) {
      // Create new condition
      conditionId = uuidv4();
      await firestore.collection(COLLECTIONS.MARKET_CONDITIONS).doc(conditionId).set({
        id: conditionId,
        date: conditionDate,
        broadIndexCondition, // Changed from broadIndex to broadIndexCondition (dropdown)
        marketConditionText: marketConditionText || '', // New free text field
        sectorIndices: sectorIndices || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } else {
      // Update existing condition
      const doc = existingQuery.docs[0];
      conditionId = doc.id;
      await doc.ref.update({
        broadIndexCondition,
        marketConditionText: marketConditionText || '',
        sectorIndices: sectorIndices || {},
        updatedAt: new Date().toISOString()
      });
    }
    
    res.json({ success: true, data: { id: conditionId } });
  } catch (error) {
    console.error('Error saving market condition:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get market condition for a date
router.get('/condition/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    const snapshot = await firestore.collection(COLLECTIONS.MARKET_CONDITIONS)
      .where('date', '==', date)
      .get();
    
    if (snapshot.empty) {
      return res.json({ success: true, data: null });
    }
    
    const condition = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    res.json({ success: true, data: condition });
  } catch (error) {
    console.error('Error getting market condition:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search market conditions (Feature 4: Enhanced search)
router.post('/conditions/search', async (req, res) => {
  try {
    const { startDate, endDate, broadIndexCondition, sectorIndex, marketConditionText } = req.body;
    let query = firestore.collection(COLLECTIONS.MARKET_CONDITIONS);
    
    // Handle date range filtering
    if (startDate && endDate) {
      query = query.where('date', '>=', startDate).where('date', '<=', endDate);
    } else if (startDate) {
      query = query.where('date', '>=', startDate);
    } else if (endDate) {
      query = query.where('date', '<=', endDate);
    }
    
    const snapshot = await query.get();
    let results = [];
    
    snapshot.forEach(doc => {
      const data = { id: doc.id, ...doc.data() };
      
      // Filter by broad index condition if specified
      if (broadIndexCondition && data.broadIndexCondition !== broadIndexCondition) {
        return;
      }
      
      // Filter by sector index if specified
      if (sectorIndex && !Object.values(data.sectorIndices || {}).includes(sectorIndex)) {
        return;
      }
      
      // Filter by market condition text if specified (case-insensitive search)
      if (marketConditionText && 
          (!data.marketConditionText || 
           !data.marketConditionText.toLowerCase().includes(marketConditionText.toLowerCase()))) {
        return;
      }
      
      results.push(data);
    });
    
    // Sort by date descending
    results.sort((a, b) => b.date.localeCompare(a.date));
    
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Error searching market conditions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update market condition (Feature 4: Edit functionality)
router.put('/condition/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { broadIndexCondition, marketConditionText, sectorIndices } = req.body;
    
    await firestore.collection(COLLECTIONS.MARKET_CONDITIONS).doc(id).update({
      broadIndexCondition,
      marketConditionText: marketConditionText || '',
      sectorIndices: sectorIndices || {},
      updatedAt: new Date().toISOString()
    });
    
    res.json({ success: true, message: 'Market condition updated successfully' });
  } catch (error) {
    console.error('Error updating market condition:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete market condition (Feature 4: Delete functionality)
router.delete('/condition/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await firestore.collection(COLLECTIONS.MARKET_CONDITIONS).doc(id).delete();
    
    res.json({ success: true, message: 'Market condition deleted successfully' });
  } catch (error) {
    console.error('Error deleting market condition:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Feature 3: Market Condition Templates CRUD

// Create market condition template
router.post('/condition-template', async (req, res) => {
  try {
    const { name, indexType, indexName, marketCondition, output } = req.body;
    const templateId = uuidv4();
    
    const template = {
      id: templateId,
      name,
      indexType, // 'BROAD' or 'SECTOR'
      indexName,
      marketCondition,
      output,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await firestore.collection(COLLECTIONS.MARKET_CONDITION_TEMPLATES).doc(templateId).set(template);
    
    res.json({ success: true, data: template });
  } catch (error) {
    console.error('Error creating market condition template:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all market condition templates
router.get('/condition-templates', async (req, res) => {
  try {
    const snapshot = await firestore.collection(COLLECTIONS.MARKET_CONDITION_TEMPLATES)
      .orderBy('createdAt', 'desc')
      .get();
    
    const templates = [];
    snapshot.forEach(doc => {
      templates.push({ id: doc.id, ...doc.data() });
    });
    
    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('Error getting market condition templates:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update market condition template
router.put('/condition-template/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, indexType, indexName, marketCondition, output } = req.body;
    
    await firestore.collection(COLLECTIONS.MARKET_CONDITION_TEMPLATES).doc(id).update({
      name,
      indexType,
      indexName,
      marketCondition,
      output,
      updatedAt: new Date().toISOString()
    });
    
    res.json({ success: true, message: 'Market condition template updated successfully' });
  } catch (error) {
    console.error('Error updating market condition template:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete market condition template
router.delete('/condition-template/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await firestore.collection(COLLECTIONS.MARKET_CONDITION_TEMPLATES).doc(id).delete();
    
    res.json({ success: true, message: 'Market condition template deleted successfully' });
  } catch (error) {
    console.error('Error deleting market condition template:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search market condition templates
router.post('/condition-templates/search', async (req, res) => {
  try {
    const { name, indexType, indexName } = req.body;
    let query = firestore.collection(COLLECTIONS.MARKET_CONDITION_TEMPLATES);
    
    const snapshot = await query.get();
    let results = [];
    
    snapshot.forEach(doc => {
      const data = { id: doc.id, ...doc.data() };
      
      // Filter by name if specified
      if (name && !data.name.toLowerCase().includes(name.toLowerCase())) {
        return;
      }
      
      // Filter by index type if specified
      if (indexType && data.indexType !== indexType) {
        return;
      }
      
      // Filter by index name if specified
      if (indexName && data.indexName !== indexName) {
        return;
      }
      
      results.push(data);
    });
    
    // Sort by name
    results.sort((a, b) => a.name.localeCompare(b.name));
    
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Error searching market condition templates:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Market indices management (existing code)
router.post('/indices/create', async (req, res) => {
  try {
    const { type, name } = req.body; // type: 'BROAD' or 'SECTOR'
    
    if (!type || !name) {
      return res.status(400).json({ success: false, error: 'Type and name are required' });
    }
    
    // Check if index with same name already exists
    const existingQuery = await firestore.collection(COLLECTIONS.MARKET_INDICES)
      .where('name', '==', name)
      .where('type', '==', type)
      .where('active', '==', true)
      .get();
    
    if (!existingQuery.empty) {
      return res.status(400).json({ success: false, error: 'Index with this name already exists' });
    }
    
    const indexId = uuidv4();
    
    const index = {
      id: indexId,
      type,
      name,
      active: true,
      createdAt: new Date().toISOString()
    };
    
    await firestore.collection(COLLECTIONS.MARKET_INDICES).doc(indexId).set(index);
    
    res.json({ success: true, data: index });
  } catch (error) {
    console.error('Error creating index:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all indices
router.get('/indices', async (req, res) => {
  try {
    const { type } = req.query;
    let query = firestore.collection(COLLECTIONS.MARKET_INDICES);
    
    // Simple query without ordering first
    if (type) {
      query = query.where('type', '==', type).where('active', '==', true);
    } else {
      query = query.where('active', '==', true);
    }
    
    const snapshot = await query.get();
    const indices = [];
    
    snapshot.forEach(doc => {
      indices.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort in memory instead of using orderBy
    indices.sort((a, b) => a.name.localeCompare(b.name));
    
    // If no indices exist, create default ones
    if (indices.length === 0 && type) {
      console.log(`No ${type} indices found, creating defaults...`);
      const defaults = type === 'BROAD' 
        ? ['NIFTY', 'SENSEX', 'BANK NIFTY', 'NIFTY MIDCAP', 'NIFTY SMALLCAP']
        : ['AUTO', 'BANKING', 'FMCG', 'IT', 'METAL', 'PHARMA', 'REALTY', 'ENERGY', 'FINANCE', 'MEDIA'];
      
      for (const name of defaults) {
        const indexId = uuidv4();
        const index = {
          id: indexId,
          type,
          name,
          active: true,
          createdAt: new Date().toISOString()
        };
        
        try {
          await firestore.collection(COLLECTIONS.MARKET_INDICES).doc(indexId).set(index);
          indices.push(index);
          console.log(`Created ${type} index: ${name}`);
        } catch (createError) {
          console.error(`Error creating index ${name}:`, createError);
        }
      }
    }
    
    res.json({ success: true, data: indices });
  } catch (error) {
    console.error('Error getting indices:', error);
    res.status(500).json({ success: false, error: error.message, details: error.stack });
  }
});

// Delete index
router.delete('/indices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ success: false, error: 'Index ID is required' });
    }
    
    // Check if index exists
    const doc = await firestore.collection(COLLECTIONS.MARKET_INDICES).doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Index not found' });
    }
    
    // Soft delete - set active to false
    await firestore.collection(COLLECTIONS.MARKET_INDICES).doc(id).update({
      active: false,
      deletedAt: new Date().toISOString()
    });
    
    res.json({ success: true, message: 'Index deleted successfully' });
  } catch (error) {
    console.error('Error deleting index:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add stock success/checkmark
router.post('/stock-success', async (req, res) => {
  try {
    const { stock, date, webhookId, isSuccess, sectorIndex } = req.body;
    const successId = `${webhookId}_${stock}_${date}`;
    
    const stockSuccess = {
      id: successId,
      stock,
      date,
      webhookId,
      isSuccess,
      sectorIndex: sectorIndex || null,
      updatedAt: new Date().toISOString()
    };
    
    await firestore.collection(COLLECTIONS.STOCK_SUCCESS).doc(successId).set(stockSuccess);
    
    res.json({ success: true, data: stockSuccess });
  } catch (error) {
    console.error('Error saving stock success:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get webhook maturity
router.get('/webhook-maturity/:webhookId', async (req, res) => {
  try {
    const { webhookId } = req.params;
    const { startDate, endDate } = req.query;
    
    // Get all webhook data
    let dataQuery = firestore.collection(COLLECTIONS.WEBHOOK_DATA)
      .where('webhookId', '==', webhookId);
    
    if (startDate && endDate) {
      dataQuery = dataQuery
        .where('date', '>=', startDate)
        .where('date', '<=', endDate);
    }
    
    const dataSnapshot = await dataQuery.get();
    let totalStocks = 0;
    const stockDates = new Set();
    
    dataSnapshot.forEach(doc => {
      const data = doc.data();
      data.stocks.forEach(stock => {
        totalStocks++;
        stockDates.add(`${data.webhookId}_${stock}_${data.date}`);
      });
    });
    
    // Get success data
    const successSnapshot = await firestore.collection(COLLECTIONS.STOCK_SUCCESS)
      .where('webhookId', '==', webhookId)
      .where('isSuccess', '==', true)
      .get();
    
    let successCount = 0;
    successSnapshot.forEach(doc => {
      const data = doc.data();
      if (stockDates.has(`${data.webhookId}_${data.stock}_${data.date}`)) {
        successCount++;
      }
    });
    
    const maturity = totalStocks > 0 ? (successCount / totalStocks * 100).toFixed(2) : 0;
    
    res.json({
      success: true,
      data: {
        webhookId,
        totalStocks,
        successCount,
        maturity: parseFloat(maturity),
        startDate,
        endDate
      }
    });
  } catch (error) {
    console.error('Error calculating maturity:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get maturity report
router.post('/maturity-report', async (req, res) => {
  try {
    const { broadIndex, sectorIndex, stock, startDate, endDate } = req.body;
    
    // Get all webhooks
    const webhooksSnapshot = await firestore.collection(COLLECTIONS.WEBHOOKS).get();
    const maturityData = [];
    
    for (const webhookDoc of webhooksSnapshot.docs) {
      const webhook = { id: webhookDoc.id, ...webhookDoc.data() };
      
      // Calculate maturity for this webhook
      const maturityResponse = await fetch(`http://localhost:${process.env.PORT || 8080}/api/market/webhook-maturity/${webhook.id}?startDate=${startDate || ''}&endDate=${endDate || ''}`);
      const maturityResult = await maturityResponse.json();
      
      if (maturityResult.success) {
        let include = true;
        
        // Filter by market conditions if specified
        if (broadIndex || sectorIndex || stock) {
          // Get market conditions for the period
          const conditionsQuery = firestore.collection(COLLECTIONS.MARKET_CONDITIONS);
          if (startDate && endDate) {
            conditionsQuery.where('date', '>=', startDate).where('date', '<=', endDate);
          }
          
          const conditionsSnapshot = await conditionsQuery.get();
          include = false;
          
          conditionsSnapshot.forEach(doc => {
            const condition = doc.data();
            if (broadIndex && condition.broadIndexCondition === broadIndex) {
              include = true;
            }
            if (sectorIndex && Object.values(condition.sectorIndices || {}).includes(sectorIndex)) {
              include = true;
            }
          });
          
          // If filtering by stock, check if webhook has this stock
          if (stock) {
            const stockDataQuery = await firestore.collection(COLLECTIONS.WEBHOOK_DATA)
              .where('webhookId', '==', webhook.id)
              .where('stocks', 'array-contains', stock)
              .limit(1)
              .get();
            
            include = include && !stockDataQuery.empty;
          }
        }
        
        if (include) {
          maturityData.push({
            webhook,
            ...maturityResult.data
          });
        }
      }
    }
    
    // Sort by maturity in descending order
    maturityData.sort((a, b) => b.maturity - a.maturity);
    
    res.json({ success: true, data: maturityData });
  } catch (error) {
    console.error('Error generating maturity report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get stock success data
router.get('/stock-success/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await firestore.collection(COLLECTIONS.STOCK_SUCCESS).doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Stock success data not found' });
    }
    
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error('Error getting stock success:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Initialize default indices (useful for first-time setup)
router.post('/indices/initialize-defaults', async (req, res) => {
  try {
    // Check if indices already exist
    const existingSnapshot = await firestore.collection(COLLECTIONS.MARKET_INDICES)
      .where('active', '==', true)
      .limit(1)
      .get();
    
    if (!existingSnapshot.empty) {
      return res.json({ success: true, message: 'Indices already exist' });
    }
    
    let created = 0;
    
    // Create default broad indices
    const broadIndices = ['NIFTY', 'SENSEX', 'BANK NIFTY', 'NIFTY MIDCAP', 'NIFTY SMALLCAP'];
    for (const name of broadIndices) {
      const indexId = uuidv4();
      await firestore.collection(COLLECTIONS.MARKET_INDICES).doc(indexId).set({
        id: indexId,
        type: 'BROAD',
        name,
        active: true,
        createdAt: new Date().toISOString()
      });
      created++;
    }
    
    // Create default sector indices
    const sectorIndices = ['AUTO', 'BANKING', 'FMCG', 'IT', 'METAL', 'PHARMA', 'REALTY', 'ENERGY', 'FINANCE', 'MEDIA'];
    for (const name of sectorIndices) {
      const indexId = uuidv4();
      await firestore.collection(COLLECTIONS.MARKET_INDICES).doc(indexId).set({
        id: indexId,
        type: 'SECTOR',
        name,
        active: true,
        createdAt: new Date().toISOString()
      });
      created++;
    }
    
    console.log(`Created ${created} default indices`);
    res.json({ success: true, message: `Created ${created} default indices` });
  } catch (error) {
    console.error('Error initializing default indices:', error);
    res.status(500).json({ success: false, error: error.message, details: error.stack });
  }
});

// Debug endpoint to check collections
router.get('/debug/collections', async (req, res) => {
  try {
    const results = {};
    
    // Check each collection
    for (const [key, collection] of Object.entries(COLLECTIONS)) {
      if (collection === 'market_indices' || collection === 'market_conditions' || collection === 'stock_success' || collection === 'market_condition_templates') {
        const snapshot = await firestore.collection(collection).limit(1).get();
        results[collection] = {
          exists: !snapshot.empty,
          count: snapshot.size
        };
      }
    }
    
    res.json({ 
      success: true, 
      collections: results,
      COLLECTIONS_CONFIG: COLLECTIONS
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;