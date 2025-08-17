const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const moment = require('moment-timezone');
const { firestore, COLLECTIONS } = require('../config/firestore');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Delivery Volume API is running',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/receive - Store delivery volume data',
      '/data/:date - Retrieve stored data',
      '/dates - Get available dates',
      '/search/:date/:symbol - Search specific stock',
      '/analysis/top-delivery/:date - Top delivery % stocks',
      '/delete/:date - Delete data for specific date'
    ]
  });
});

// Enhanced endpoint to receive and store delivery volume data from your scraper
router.post('/receive', async (req, res) => {
  try {
    const { timestamp, date, source, data } = req.body;
    
    // Validate required fields
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid data format. Expected array of securities.' 
      });
    }

    const istDate = date || moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
    console.log(`📅 Storing delivery volume data for date: ${istDate} (provided: ${date})`);
    const dataId = uuidv4();
    
    console.log(`📥 Receiving delivery volume data for ${istDate}: ${data.length} securities`);
    
    // Process and enhance delivery volume data
    const processedData = data.map(item => {
      const quantityTraded = item.quantityTraded || 0;
      const deliveryQuantity = item.deliveryQuantity || 0;
      const deliveryPercentage = quantityTraded > 0 ? 
        ((deliveryQuantity / quantityTraded) * 100).toFixed(2) : '0.00';

      return {
        symbol: item.symbol || '',
        series: item.series || 'EQ',
        isin: item.isin || '',
        
        // Trading data
        quantityTraded: quantityTraded,
        deliveryQuantity: deliveryQuantity,
        deliveryToTradedQuantity: parseFloat(item.deliveryToTradedQuantity || deliveryPercentage),
        deliveryPercentage: deliveryPercentage,
        
        // Price data
        lastPrice: parseFloat(item.lastPrice || 0),
        open: parseFloat(item.open || 0),
        dayHigh: parseFloat(item.dayHigh || 0),
        dayLow: parseFloat(item.dayLow || 0),
        previousClose: parseFloat(item.previousClose || 0),
        marketDaysHigh: parseFloat(item.marketDaysHigh || 0),
        marketDaysLow: parseFloat(item.marketDaysLow || 0),
        
        // Change data
        change: parseFloat(item.change || 0),
        pChange: parseFloat(item.pChange || 0),
        perChange365d: parseFloat(item.perChange365d || 0),
        
        // Volume data
        totalTradedVolume: parseFloat(item.totalTradedVolume || 0),
        totalTradedValue: parseFloat(item.totalTradedValue || 0),
        
        // Metadata
        lastUpdateTime: item.lastUpdateTime || new Date().toISOString()
      };
    });

    // Calculate summary statistics
    const totalSecurities = processedData.length;
    const totalTradedVolume = processedData.reduce((sum, item) => sum + item.quantityTraded, 0);
    const totalDeliveryVolume = processedData.reduce((sum, item) => sum + item.deliveryQuantity, 0);
    const totalTradedValue = processedData.reduce((sum, item) => sum + item.totalTradedValue, 0);
    
    const avgDeliveryPercentage = processedData.length > 0 ?
      (processedData.reduce((sum, item) => sum + parseFloat(item.deliveryPercentage), 0) / processedData.length).toFixed(2) : '0.00';
    
    const highDeliveryCount = processedData.filter(item => parseFloat(item.deliveryPercentage) > 50).length;
    const veryHighDeliveryCount = processedData.filter(item => parseFloat(item.deliveryPercentage) > 70).length;
    
    const marketDeliveryRatio = totalTradedVolume > 0 ? 
      ((totalDeliveryVolume / totalTradedVolume) * 100).toFixed(2) : '0.00';

    // Prepare document for storage
    const deliveryVolumeDoc = {
      id: dataId,
      timestamp: timestamp || new Date().toISOString(),
      date: istDate,
      source: source || 'nse-scraper',
      dataFormat: 'securityWiseDP',
      totalSecurities: totalSecurities,
      summary: {
        avgDeliveryPercentage: parseFloat(avgDeliveryPercentage),
        highDeliveryCount: highDeliveryCount,
        veryHighDeliveryCount: veryHighDeliveryCount,
        totalTradedVolume: totalTradedVolume,
        totalDeliveryVolume: totalDeliveryVolume,
        totalTradedValue: totalTradedValue,
        marketDeliveryRatio: parseFloat(marketDeliveryRatio)
      },
      data: processedData,
      receivedAt: new Date().toISOString(),
      createdAt: new Date()
    };
    
    // Store in Firestore
    await firestore.collection(COLLECTIONS.DELIVERY_VOLUME_DATA).doc(dataId).set(deliveryVolumeDoc);
    
    console.log(`✅ Successfully stored delivery volume data for ${istDate}`);
    
    res.json({ 
      success: true, 
      message: 'Delivery volume data stored successfully',
      data: {
        id: dataId,
        date: istDate,
        totalSecurities: totalSecurities,
        avgDeliveryPercentage: avgDeliveryPercentage,
        highDeliveryCount: highDeliveryCount,
        timestamp: deliveryVolumeDoc.timestamp
      }
    });
    
  } catch (error) {
    console.error('❌ Error storing delivery volume data:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get stored delivery volume data for a specific date
router.get('/data/:date?', async (req, res) => {
  try {
    const date = req.params.date || moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
    console.log(`📖 Retrieving delivery volume data for date: ${date}`);
    
    const snapshot = await firestore.collection(COLLECTIONS.DELIVERY_VOLUME_DATA)
      .where('date', '==', date)
      .get();
    
    if (snapshot.empty) {
      console.log(`❌ No delivery volume data found for date: ${date}`);
      return res.status(404).json({ 
        success: false, 
        error: 'No delivery volume data found for this date',
        date: date,
        message: 'Please upload data for this date or select a different date'
      });
    }
    
    // Get the latest document if multiple exist for same date
    let latestDoc = null;
    let latestTime = null;
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const docTime = data.createdAt || data.receivedAt;
      if (!latestDoc || (docTime && docTime > latestTime)) {
        latestDoc = doc;
        latestTime = docTime;
      }
    });
    
    const data = latestDoc.data();
    
    console.log(`✅ Found delivery volume data for ${date}: ${data.data?.length || 0} securities`);
    
    res.json({ 
      success: true, 
      data: {
        id: data.id,
        date: data.date,
        timestamp: data.timestamp,
        source: data.source,
        dataFormat: data.dataFormat,
        totalSecurities: data.totalSecurities,
        summary: data.summary,
        securities: data.data || []
      }
    });
    
  } catch (error) {
    console.error('❌ Error retrieving delivery volume data:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Search for a specific security on a specific date
router.get('/search/:date/:symbol', async (req, res) => {
  try {
    const { date, symbol } = req.params;
    console.log(`🔍 Searching for ${symbol} on ${date}`);
    
    const snapshot = await firestore.collection(COLLECTIONS.DELIVERY_VOLUME_DATA)
      .where('date', '==', date)
      .get();
    
    if (snapshot.empty) {
      return res.status(404).json({ 
        success: false, 
        error: 'No delivery volume data found for this date' 
      });
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    
    const security = data.data?.find(item => 
      item.symbol.toLowerCase() === symbol.toLowerCase()
    );
    
    if (!security) {
      return res.status(404).json({ 
        success: false, 
        error: `Security ${symbol} not found for date ${date}` 
      });
    }
    
    console.log(`✅ Found ${symbol} for ${date}`);
    
    res.json({ 
      success: true, 
      data: {
        date: date,
        security: security
      }
    });
    
  } catch (error) {
    console.error('❌ Error searching for security:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get available dates with delivery volume data
router.get('/dates', async (req, res) => {
  try {
    console.log('📅 Retrieving available delivery volume dates');
    
    const snapshot = await firestore.collection(COLLECTIONS.DELIVERY_VOLUME_DATA)
      .orderBy('date', 'desc')
      .get();
    
    const dates = [];
    const dateMap = new Map();
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.date && !dateMap.has(data.date)) {
        dateMap.set(data.date, true);
        dates.push({
          date: data.date,
          timestamp: data.timestamp,
          source: data.source,
          totalSecurities: data.totalSecurities,
          avgDeliveryPercentage: data.summary?.avgDeliveryPercentage,
          dataFormat: data.dataFormat
        });
      }
    });
    
    console.log(`✅ Found delivery volume data for ${dates.length} dates`);
    
    res.json({ 
      success: true, 
      data: {
        totalDates: dates.length,
        dates: dates
      }
    });
    
  } catch (error) {
    console.error('❌ Error retrieving available dates:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Top delivery percentage analysis for a specific date
router.get('/analysis/top-delivery/:date', async (req, res) => {
  try {
    const date = req.params.date;
    const limit = parseInt(req.query.limit) || 50;
    const minDeliveryPercent = parseFloat(req.query.minPercent) || 30;
    
    console.log(`📊 Analyzing top delivery % stocks for ${date} (min: ${minDeliveryPercent}%, limit: ${limit})`);
    
    const snapshot = await firestore.collection(COLLECTIONS.DELIVERY_VOLUME_DATA)
      .where('date', '==', date)
      .get();
    
    if (snapshot.empty) {
      return res.status(404).json({ 
        success: false, 
        error: 'No delivery volume data found for this date' 
      });
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    
    if (!data.data || !Array.isArray(data.data)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid data structure in stored document' 
      });
    }
    
    // Filter and sort by delivery percentage
    const topDeliveryStocks = data.data
      .filter(item => parseFloat(item.deliveryPercentage) >= minDeliveryPercent)
      .sort((a, b) => parseFloat(b.deliveryPercentage) - parseFloat(a.deliveryPercentage))
      .slice(0, limit)
      .map(item => ({
        symbol: item.symbol,
        series: item.series,
        deliveryPercentage: parseFloat(item.deliveryPercentage),
        quantityTraded: item.quantityTraded,
        deliveryQuantity: item.deliveryQuantity,
        lastPrice: item.lastPrice,
        pChange: item.pChange,
        totalTradedValue: item.totalTradedValue,
        totalTradedVolume: item.totalTradedVolume
      }));
    
    console.log(`✅ Found ${topDeliveryStocks.length} stocks with delivery % >= ${minDeliveryPercent}%`);
    
    res.json({ 
      success: true, 
      data: {
        date: date,
        criteria: {
          minDeliveryPercent: minDeliveryPercent,
          limit: limit
        },
        totalFound: topDeliveryStocks.length,
        topDeliveryStocks: topDeliveryStocks,
        summary: data.summary
      }
    });
    
  } catch (error) {
    console.error('❌ Error in delivery percentage analysis:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Delete delivery volume data for a specific date
router.delete('/data/:date', async (req, res) => {
  try {
    const date = req.params.date;
    console.log(`🗑️ Deleting delivery volume data for date: ${date}`);
    
    const snapshot = await firestore.collection(COLLECTIONS.DELIVERY_VOLUME_DATA)
      .where('date', '==', date)
      .get();
    
    if (snapshot.empty) {
      return res.status(404).json({ 
        success: false, 
        error: 'No delivery volume data found for this date' 
      });
    }
    
    const batch = firestore.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    console.log(`✅ Deleted ${snapshot.size} delivery volume records for ${date}`);
    
    res.json({ 
      success: true, 
      message: `Deleted ${snapshot.size} delivery volume records for ${date}` 
    });
    
  } catch (error) {
    console.error('❌ Error deleting delivery volume data:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Debug endpoint to see all stored data
router.get('/debug/all', async (req, res) => {
  try {
    const snapshot = await firestore.collection(COLLECTIONS.DELIVERY_VOLUME_DATA).get();
    const allData = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      allData.push({
        id: doc.id,
        date: data.date,
        timestamp: data.timestamp,
        totalSecurities: data.totalSecurities,
        source: data.source,
        avgDeliveryPercentage: data.summary?.avgDeliveryPercentage
      });
    });
    
    res.json({
      success: true,
      totalDocuments: allData.length,
      documents: allData.sort((a, b) => b.date.localeCompare(a.date))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get sample data structure for debugging
router.get('/debug/sample/:date', async (req, res) => {
  try {
    const date = req.params.date;
    console.log(`🔍 Debug: Getting sample delivery volume data for ${date}`);
    
    const snapshot = await firestore.collection(COLLECTIONS.DELIVERY_VOLUME_DATA)
      .where('date', '==', date)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return res.status(404).json({ 
        success: false, 
        error: 'No delivery volume data found for this date' 
      });
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    
    // Get first 3 securities to show structure
    const sampleSecurities = data.data ? data.data.slice(0, 3) : [];
    
    res.json({
      success: true,
      date: date,
      totalSecurities: data.data ? data.data.length : 0,
      dataStructure: {
        documentFields: Object.keys(data),
        firstSecurityFields: sampleSecurities.length > 0 ? Object.keys(sampleSecurities[0]) : [],
        sampleSecurities: sampleSecurities
      },
      summary: data.summary
    });
    
  } catch (error) {
    console.error('❌ Error getting sample data:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;