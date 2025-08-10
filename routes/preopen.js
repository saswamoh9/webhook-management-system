const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const moment = require('moment-timezone');
const { firestore, COLLECTIONS } = require('../config/firestore');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Pre-open API is running',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/receive - Store preopen data',
      '/store - Legacy storage endpoint', 
      '/data/:date - Retrieve stored data',
      '/dates - Get available dates',
      '/search/:date/:symbol - Search specific stock',
      '/analysis/spreads/:date - Low spread analysis',
      '/analysis/volume/:date - Volume analysis', 
      '/analysis/industry/:date - Industry analysis',
      '/analysis/gaps/:date - Gap analysis'
    ]
  });
});

// Enhanced endpoint to receive and store preopen data
router.post('/receive', async (req, res) => {
  try {
    const { timestamp, date, source, totalStocks, originalCount, advances, declines, unchanged, summary, data } = req.body;
    
    // Validate required fields
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid data format. Expected array of stocks.' 
      });
    }

    const istDate = date || moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
    console.log(`📅 Storing data for date: ${istDate} (provided: ${date})`);
    const dataId = uuidv4();
    
    console.log(`📥 Receiving preopen data for ${istDate}: ${data.length} stocks`);
    
    // Prepare document for storage
    const preopenDoc = {
      id: dataId,
      timestamp: timestamp || new Date().toISOString(),
      date: istDate,
      source: source || 'unknown',
      dataFormat: 'enhanced',
      totalStocks: totalStocks || data.length,
      originalCount: originalCount || data.length,
      advances: advances || 0,
      declines: declines || 0,
      unchanged: unchanged || 0,
      summary: summary || null,
      data: data,
      receivedAt: new Date().toISOString(),
      createdAt: new Date()
    };
    
    // Store in Firestore
    await firestore.collection(COLLECTIONS.PREOPEN_DATA).doc(dataId).set(preopenDoc);
    
    console.log(`✅ Successfully stored preopen data for ${istDate}`);
    
    res.json({ 
      success: true, 
      message: 'Preopen data stored successfully',
      data: {
        id: dataId,
        date: istDate,
        totalStocks: data.length,
        timestamp: preopenDoc.timestamp
      }
    });
    
  } catch (error) {
    console.error('❌ Error storing preopen data:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Legacy endpoint to store preopen data (maintaining backward compatibility)
router.post('/store', async (req, res) => {
  try {
    const stocksData = req.body;
    
    if (!Array.isArray(stocksData)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid data format. Expected array of stocks.' 
      });
    }

    const istDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
    const dataId = uuidv4();
    
    console.log(`📥 Storing legacy preopen data for ${istDate}: ${stocksData.length} stocks`);
    
    // Convert legacy format
    const preopenDoc = {
      id: dataId,
      timestamp: new Date().toISOString(),
      date: istDate,
      source: 'legacy-api',
      dataFormat: 'legacy',
      totalStocks: stocksData.length,
      data: stocksData,
      receivedAt: new Date().toISOString(),
      createdAt: new Date()
    };
    
    await firestore.collection(COLLECTIONS.PREOPEN_DATA).doc(dataId).set(preopenDoc);
    
    console.log(`✅ Successfully stored legacy preopen data for ${istDate}`);
    
    res.json({ 
      success: true, 
      message: 'Preopen data stored successfully',
      data: {
        id: dataId,
        date: istDate,
        totalStocks: stocksData.length
      }
    });
    
  } catch (error) {
    console.error('❌ Error storing legacy preopen data:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get stored preopen data for a specific date
router.get('/data/:date?', async (req, res) => {
  try {
    const date = req.params.date || moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
    console.log(`📖 Retrieving preopen data for date: ${date}`);
    
    // Method 1: Simple query without orderBy
    const snapshot = await firestore.collection(COLLECTIONS.PREOPEN_DATA)
      .where('date', '==', date)
      .get();
    
    if (snapshot.empty) {
      console.log(`❌ No preopen data found for date: ${date}`);
      return res.status(404).json({ 
        success: false, 
        error: 'No preopen data found for this date',
        date: date,
        message: 'Please upload data for this date or select a different date'
      });
    }
    
    // If multiple documents exist for the same date, get the latest one
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
    
    const preopenDoc = snapshot.docs[0];
    const data = latestDoc.data();

    // Calculate actual advances/declines from the data
    let advances = 0;
    let declines = 0;
    let unchanged = 0;
    let totalVolume = 0;
    let totalTurnover = 0;

    if (data.data && Array.isArray(data.data)) {
      data.data.forEach(stock => {
        if (stock.pChange > 0) advances++;
        else if (stock.pChange < 0) declines++;
        else unchanged++;
        
        totalVolume += stock.finalQuantity || 0;
        totalTurnover += stock.totalTurnover || 0;
      });
    }
    console.log(`✅ Found preopen data for ${date}: ${data.data?.length || 0} stocks`);
    
    res.json({ 
      success: true, 
      data: {
        id: data.id,
        date: data.date,
        timestamp: data.timestamp,
        source: data.source,
        dataFormat: data.dataFormat,
        totalStocks: data.totalStocks || data.data?.length || 0,
        originalCount: data.originalCount,
        advances: advances,
        declines: declines,
        unchanged: unchanged,
        totalVolume: totalVolume,
        totalTurnover: totalTurnover,
        summary: data.summary,
        receivedAt: data.receivedAt,
        stocks: data.data
      }
    });
    
  } catch (error) {
    console.error('❌ Error retrieving preopen data:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Search for specific stock in preopen data
router.get('/search/:date/:symbol', async (req, res) => {
  try {
    const { date, symbol } = req.params;
    console.log(`🔍 Searching for stock ${symbol} on ${date}`);
    
    const snapshot = await firestore.collection(COLLECTIONS.PREOPEN_DATA)
      .where('date', '==', date)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return res.status(404).json({ 
        success: false, 
        error: 'No preopen data found for this date' 
      });
    }
    
    const preopenData = snapshot.docs[0].data();
    const stockData = preopenData.data.filter(stock => 
      stock.symbol && stock.symbol.toUpperCase().includes(symbol.toUpperCase())
    );
    
    console.log(`✅ Found ${stockData.length} matching stocks for ${symbol}`);
    
    res.json({ 
      success: true, 
      data: {
        searchTerm: symbol,
        date: date,
        totalMatches: stockData.length,
        stocks: stockData
      }
    });
    
  } catch (error) {
    console.error('❌ Error searching stocks:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Low spread analysis
router.get('/analysis/spreads/:date', async (req, res) => {
  try {
    const date = req.params.date;
    const threshold = parseFloat(req.query.threshold) || 1.0;
    
    console.log(`📊 Analyzing spreads for ${date} with threshold ${threshold}%`);
    
    const snapshot = await firestore.collection(COLLECTIONS.PREOPEN_DATA)
      .where('date', '==', date)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return res.status(404).json({ 
        success: false, 
        error: 'No preopen data found for this date' 
      });
    }
    
    const preopenData = snapshot.docs[0].data();
    const lowSpreadStocks = [];
    
    preopenData.data.forEach(stock => {
      // Use the nested spreadAnalysis object
      if (stock.spreadAnalysis && 
          stock.spreadAnalysis.spreadPercent !== null && 
          stock.spreadAnalysis.spreadPercent <= threshold) {
        
        lowSpreadStocks.push({
          symbol: stock.symbol,
          bidPrice: stock.spreadAnalysis.bestBid || 0,
          askPrice: stock.spreadAnalysis.bestAsk || 0,
          spread: stock.spreadAnalysis.spreadPercent,
          volume: stock.finalQuantity || 0,
          change: stock.pChange || 0,
          changePercent: stock.pChange || 0
        });
      }
    });
    
    // Sort by spread ascending
    lowSpreadStocks.sort((a, b) => a.spread - b.spread);
    
    console.log(`✅ Found ${lowSpreadStocks.length} stocks with spreads <= ${threshold}%`);
    
    res.json({ 
      success: true, 
      data: {
        date: date,
        threshold: threshold,
        totalStocks: lowSpreadStocks.length,
        stocks: lowSpreadStocks.slice(0, 50)
      }
    });
    
  } catch (error) {
    console.error('❌ Error analyzing spreads:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Volume analysis (vs 20-day average)
router.get('/analysis/volume/:date', async (req, res) => {
  try {
    const date = req.params.date;
    console.log(`📊 Analyzing volume for ${date}`);
    
    const snapshot = await firestore.collection(COLLECTIONS.PREOPEN_DATA)
      .where('date', '==', date)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return res.status(404).json({ 
        success: false, 
        error: 'No preopen data found for this date' 
      });
    }
    
    const preopenData = snapshot.docs[0].data();
    const highVolumeStocks = [];
    
    preopenData.data.forEach(stock => {
      if (stock.finalQuantity && stock.finalQuantity > 0) {
        highVolumeStocks.push({
          symbol: stock.symbol,
          currentVolume: stock.finalQuantity,
          avgVolume20D: 'N/A', // Will need historical data
          volumeRatio: 'N/A',
          price: stock.lastPrice || stock.finalPrice || 0,
          change: stock.pChange || 0,
          changePercent: stock.pChange || 0,
          totalTurnover: stock.totalTurnover || 0
        });
      }
    });
    
    // Sort by current volume descending
    highVolumeStocks.sort((a, b) => b.currentVolume - a.currentVolume);
    
    console.log(`✅ Found ${highVolumeStocks.length} stocks with volume data`);
    
    res.json({ 
      success: true, 
      data: {
        date: date,
        note: '20-day average volume calculation requires historical data',
        totalStocks: highVolumeStocks.length,
        stocks: highVolumeStocks.slice(0, 50)
      }
    });
    
  } catch (error) {
    console.error('❌ Error analyzing volume:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Industry analysis
router.get('/analysis/industry/:date', async (req, res) => {
  try {
    const date = req.params.date;
    const level = req.query.level || 'sector'; // sector, industry, basicIndustry
    const parentFilter = req.query.parent || null; // For filtering by parent category
    
    console.log(`📊 Analyzing industry volumes for ${date} at ${level} level`);
    
    // Get preopen data
    const preopenSnapshot = await firestore.collection(COLLECTIONS.PREOPEN_DATA)
      .where('date', '==', date)
      .limit(1)
      .get();
    
    if (preopenSnapshot.empty) {
      return res.status(404).json({ 
        success: false, 
        error: 'No preopen data found for this date' 
      });
    }
    
    const preopenData = preopenSnapshot.docs[0].data();
    
    // Get stock master data for sector/industry mapping
    const stocksSnapshot = await firestore.collection(COLLECTIONS.STOCKS).get();
    const stockMap = new Map();
    
    stocksSnapshot.forEach(doc => {
      const stock = doc.data();
      stockMap.set(stock.symbol, {
        sector: stock.sector || 'Unknown',
        industry: stock.industry || 'Unknown',
        basicIndustry: stock.basicIndustry || 'Unknown'
      });
    });
    
    // Create analysis map based on level
    const analysisMap = new Map();
    
    // Process each stock in preopen data
    preopenData.data.forEach(stock => {
      const stockInfo = stockMap.get(stock.symbol);
      if (!stockInfo) return; // Skip if stock not found in master
      
      // Apply parent filter if specified
      if (parentFilter) {
        if (level === 'industry' && stockInfo.sector !== parentFilter) return;
        if (level === 'basicIndustry' && stockInfo.industry !== parentFilter) return;
      }
      
      // Determine the category based on level
      let category;
      if (level === 'sector') {
        category = stockInfo.sector;
      } else if (level === 'industry') {
        category = stockInfo.industry;
      } else {
        category = stockInfo.basicIndustry;
      }
      
      // Initialize category if not exists
      if (!analysisMap.has(category)) {
        analysisMap.set(category, {
          name: category,
          sector: stockInfo.sector,
          industry: level === 'basicIndustry' ? stockInfo.industry : null,
          stocks: [],
          totalVolume: 0,
          totalTurnover: 0,
          totalBidVolume: 0,
          totalAskVolume: 0,
          totalChange: 0,
          advances: 0,
          declines: 0,
          unchanged: 0,
          spreadSum: 0,
          spreadCount: 0
        });
      }
      
      const categoryData = analysisMap.get(category);
      
      // Add stock data
      categoryData.stocks.push(stock.symbol);
      categoryData.totalVolume += stock.finalQuantity || 0;
      categoryData.totalTurnover += stock.totalTurnover || 0;
      categoryData.totalChange += stock.pChange || 0;
      
      // Count advances/declines
      if (stock.pChange > 0) categoryData.advances++;
      else if (stock.pChange < 0) categoryData.declines++;
      else categoryData.unchanged++;
      
      // Aggregate bid/ask volumes and spread
      if (stock.spreadAnalysis) {
        categoryData.totalBidVolume += stock.spreadAnalysis.totalBidVolume || 0;
        categoryData.totalAskVolume += stock.spreadAnalysis.totalAskVolume || 0;
        
        if (stock.spreadAnalysis.spreadPercent !== null && stock.spreadAnalysis.spreadPercent !== undefined) {
          categoryData.spreadSum += stock.spreadAnalysis.spreadPercent;
          categoryData.spreadCount++;
        }
      }
    });
    
    // Convert to array and calculate aggregates
    const results = Array.from(analysisMap.entries()).map(([name, data]) => {
      const stockCount = data.stocks.length;
      const avgChange = stockCount > 0 ? data.totalChange / stockCount : 0;
      const avgSpread = data.spreadCount > 0 ? data.spreadSum / data.spreadCount : 0;
      
      // Calculate buyer/seller power
      let buyerSellerPower = 'NEUTRAL';
      let powerRatio = 0;
      let powerText = 'Balanced';
      
      if (data.totalBidVolume > 0 || data.totalAskVolume > 0) {
        if (data.totalBidVolume > data.totalAskVolume) {
          buyerSellerPower = 'BUYER';
          powerRatio = data.totalAskVolume > 0 ? data.totalBidVolume / data.totalAskVolume : 999;
          powerText = `Buyers ${powerRatio.toFixed(1)}x Sellers`;
        } else if (data.totalAskVolume > data.totalBidVolume) {
          buyerSellerPower = 'SELLER';
          powerRatio = data.totalBidVolume > 0 ? data.totalAskVolume / data.totalBidVolume : 999;
          powerText = `Sellers ${powerRatio.toFixed(1)}x Buyers`;
        }
      }
      
      return {
        name: name,
        sector: data.sector,
        industry: data.industry,
        stockCount: stockCount,
        advances: data.advances,
        declines: data.declines,
        unchanged: data.unchanged,
        avgChange: parseFloat(avgChange.toFixed(2)),
        totalVolume: data.totalVolume,
        avgVolume: Math.round(data.totalVolume / stockCount),
        totalTurnover: data.totalTurnover,
        totalBidVolume: data.totalBidVolume,
        totalAskVolume: data.totalAskVolume,
        buyerSellerPower: buyerSellerPower,
        powerRatio: powerRatio,
        powerText: powerText,
        avgSpread: parseFloat(avgSpread.toFixed(2)),
        marketSentiment: avgChange > 0 ? 'BULLISH' : avgChange < 0 ? 'BEARISH' : 'NEUTRAL'
      };
    }).filter(item => item.stockCount > 0)
      .sort((a, b) => b.totalTurnover - a.totalTurnover);
    
    // Calculate summary statistics
    const summary = {
      level: level,
      parentFilter: parentFilter,
      totalCategories: results.length,
      topByTurnover: results[0] ? results[0].name : 'N/A',
      topByVolume: results.sort((a, b) => b.totalVolume - a.totalVolume)[0]?.name || 'N/A',
      mostBullish: results.sort((a, b) => b.avgChange - a.avgChange)[0]?.name || 'N/A',
      mostBearish: results.sort((a, b) => a.avgChange - b.avgChange)[0]?.name || 'N/A'
    };
    
    // Resort by turnover for final output
    results.sort((a, b) => b.totalTurnover - a.totalTurnover);
    
    console.log(`✅ Industry analysis complete: ${results.length} categories analyzed at ${level} level`);
    
    res.json({ 
      success: true, 
      data: {
        date: date,
        level: level,
        parentFilter: parentFilter,
        summary: summary,
        analysis: results
      }
    });
    
  } catch (error) {
    console.error('❌ Error analyzing industries:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Gap analysis
router.get('/analysis/gaps/:date', async (req, res) => {
  try {
    const date = req.params.date;
    console.log(`📊 Analyzing gaps for ${date}`);
    
    const snapshot = await firestore.collection(COLLECTIONS.PREOPEN_DATA)
      .where('date', '==', date)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return res.status(404).json({ 
        success: false, 
        error: 'No preopen data found for this date' 
      });
    }
    
    const preopenData = snapshot.docs[0].data();
    const gapAnalysis = {
      strongGapUp: [], // > 3%
      moderateGapUp: [], // 1-3%
      moderateGapDown: [], // -1% to -3%
      strongGapDown: [] // < -3%
    };
    
    preopenData.data.forEach(stock => {
      const gap = stock.pChange || 0; // Using pChange field
      const gapData = {
        symbol: stock.symbol,
        gap: parseFloat(gap.toFixed(2)),
        open: stock.lastPrice || stock.finalPrice || 0,
        previousClose: stock.previousClose || 0
      };
      
      if (gap > 3) {
        gapAnalysis.strongGapUp.push(gapData);
      } else if (gap >= 1 && gap <= 3) {
        gapAnalysis.moderateGapUp.push(gapData);
      } else if (gap >= -3 && gap <= -1) {
        gapAnalysis.moderateGapDown.push(gapData);
      } else if (gap < -3) {
        gapAnalysis.strongGapDown.push(gapData);
      }
    });
    
    // Sort each category
    gapAnalysis.strongGapUp.sort((a, b) => b.gap - a.gap);
    gapAnalysis.moderateGapUp.sort((a, b) => b.gap - a.gap);
    gapAnalysis.moderateGapDown.sort((a, b) => a.gap - b.gap); // Sort ascending for negative gaps
    gapAnalysis.strongGapDown.sort((a, b) => a.gap - b.gap);
    
    console.log(`✅ Gap analysis complete: ${gapAnalysis.strongGapUp.length} strong up, ${gapAnalysis.moderateGapUp.length} moderate up, ${gapAnalysis.moderateGapDown.length} moderate down, ${gapAnalysis.strongGapDown.length} strong down`);
    
    res.json({ 
      success: true, 
      data: {
        date: date,
        summary: {
          strongGapUpCount: gapAnalysis.strongGapUp.length,
          moderateGapUpCount: gapAnalysis.moderateGapUp.length,
          moderateGapDownCount: gapAnalysis.moderateGapDown.length,
          strongGapDownCount: gapAnalysis.strongGapDown.length
        },
        strongGapUp: gapAnalysis.strongGapUp.slice(0, 10),
        moderateGapUp: gapAnalysis.moderateGapUp.slice(0, 10),
        moderateGapDown: gapAnalysis.moderateGapDown.slice(0, 10),
        strongGapDown: gapAnalysis.strongGapDown.slice(0, 10)
      }
    });
    
  } catch (error) {
    console.error('❌ Error analyzing gaps:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get basic statistics for stored data
router.get('/stats/:date?', async (req, res) => {
  try {
    const date = req.params.date || moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
    console.log(`📊 Getting basic stats for date: ${date}`);
    
    const snapshot = await firestore.collection(COLLECTIONS.PREOPEN_DATA)
      .where('date', '==', date)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return res.json({ 
        success: true, 
        data: { 
          hasData: false,
          date: date,
          message: 'No preopen data available for this date' 
        } 
      });
    }
    
    const preopenData = snapshot.docs[0].data();
    
    const stats = {
      hasData: true,
      date: date,
      timestamp: preopenData.timestamp,
      source: preopenData.source,
      dataFormat: preopenData.dataFormat,
      totalStocks: preopenData.totalStocks,
      originalCount: preopenData.originalCount,
      advances: preopenData.advances,
      declines: preopenData.declines,
      unchanged: preopenData.unchanged,
      receivedAt: preopenData.receivedAt
    };
    
    // Include summary if available
    if (preopenData.summary) {
      stats.summary = preopenData.summary;
    }
    
    console.log(`✅ Stats retrieved for ${date}`);
    res.json({ success: true, data: stats });
    
  } catch (error) {
    console.error('❌ Error getting stats:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get list of available dates with data
router.get('/dates', async (req, res) => {
  try {
    console.log('📅 Retrieving available preopen data dates');
    
    const snapshot = await firestore.collection(COLLECTIONS.PREOPEN_DATA)
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
          totalStocks: data.totalStocks,
          dataFormat: data.dataFormat
        });
      }
    });
    
    console.log(`✅ Found data for ${dates.length} dates`);
    
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

// Delete preopen data for a specific date
router.delete('/data/:date', async (req, res) => {
  try {
    const date = req.params.date;
    console.log(`🗑️ Deleting preopen data for date: ${date}`);
    
    const snapshot = await firestore.collection(COLLECTIONS.PREOPEN_DATA)
      .where('date', '==', date)
      .get();
    
    if (snapshot.empty) {
      return res.status(404).json({ 
        success: false, 
        error: 'No preopen data found for this date' 
      });
    }
    
    const batch = firestore.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    console.log(`✅ Deleted ${snapshot.size} records for ${date}`);
    
    res.json({ 
      success: true, 
      message: `Deleted ${snapshot.size} preopen data records for ${date}` 
    });
    
  } catch (error) {
    console.error('❌ Error deleting preopen data:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

router.get('/debug/all', async (req, res) => {
  try {
    const snapshot = await firestore.collection(COLLECTIONS.PREOPEN_DATA).get();
    const allData = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      allData.push({
        id: doc.id,
        date: data.date,
        timestamp: data.timestamp,
        totalStocks: data.totalStocks,
        source: data.source
      });
    });
    
    res.json({
      success: true,
      totalDocuments: allData.length,
      documents: allData
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add this debug endpoint to see the actual data structure
router.get('/debug/sample/:date', async (req, res) => {
  try {
    const date = req.params.date;
    console.log(`🔍 Debug: Getting sample data for ${date}`);
    
    const snapshot = await firestore.collection(COLLECTIONS.PREOPEN_DATA)
      .where('date', '==', date)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return res.status(404).json({ 
        success: false, 
        error: 'No data found for this date' 
      });
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    
    // Get first 5 stocks to see structure
    const sampleStocks = data.data ? data.data.slice(0, 5) : [];
    
    res.json({
      success: true,
      date: date,
      totalStocks: data.data ? data.data.length : 0,
      dataStructure: {
        // Show what fields exist in the document
        documentFields: Object.keys(data),
        // Show first stock's structure
        firstStockFields: sampleStocks.length > 0 ? Object.keys(sampleStocks[0]) : [],
        // Show sample stocks
        sampleStocks: sampleStocks
      }
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/analysis/volume-imbalance/:date', async (req, res) => {
  try {
    const date = req.params.date;
    console.log(`📊 Analyzing volume imbalance for ${date}`);
    
    const snapshot = await firestore.collection(COLLECTIONS.PREOPEN_DATA)
      .where('date', '==', date)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return res.status(404).json({ 
        success: false, 
        error: 'No preopen data found for this date' 
      });
    }
    
    const preopenData = snapshot.docs[0].data();
    const bidDominantStocks = [];
    const askDominantStocks = [];
    
    preopenData.data.forEach(stock => {
      if (stock.spreadAnalysis && 
          stock.spreadAnalysis.volumeImbalancePercent !== null &&
          stock.spreadAnalysis.volumeImbalancePercent !== undefined) {
        
        const imbalanceData = {
          symbol: stock.symbol,
          lastPrice: stock.lastPrice,
          pChange: stock.pChange,
          bidAskVolumeRatioText: stock.spreadAnalysis.bidAskVolumeRatioText || 'N/A',
          volumeDominantSide: stock.spreadAnalysis.volumeDominantSide,
          volumeImbalancePercent: stock.spreadAnalysis.volumeImbalancePercent,
          bidVolume: stock.spreadAnalysis.bidVolume || 0,
          askVolume: stock.spreadAnalysis.askVolume || 0,
          totalBidVolume: stock.spreadAnalysis.totalBidVolume || 0,
          totalAskVolume: stock.spreadAnalysis.totalAskVolume || 0,
          spreadPercent: stock.spreadAnalysis.spreadPercent || 0
        };
        
        if (stock.spreadAnalysis.volumeDominantSide === 'BID') {
          bidDominantStocks.push(imbalanceData);
        } else if (stock.spreadAnalysis.volumeDominantSide === 'ASK') {
          askDominantStocks.push(imbalanceData);
        }
      }
    });
    
    // Sort by imbalance percentage descending
    bidDominantStocks.sort((a, b) => b.volumeImbalancePercent - a.volumeImbalancePercent);
    askDominantStocks.sort((a, b) => b.volumeImbalancePercent - a.volumeImbalancePercent);
    
    console.log(`✅ Volume imbalance analysis complete: ${bidDominantStocks.length} bid dominant, ${askDominantStocks.length} ask dominant`);
    
    res.json({ 
      success: true, 
      data: {
        date: date,
        summary: {
          totalBidDominant: bidDominantStocks.length,
          totalAskDominant: askDominantStocks.length,
          strongBidImbalance: bidDominantStocks.filter(s => s.volumeImbalancePercent > 50).length,
          strongAskImbalance: askDominantStocks.filter(s => s.volumeImbalancePercent > 50).length
        },
        bidDominantStocks: bidDominantStocks.slice(0, 10), // Top 10
        askDominantStocks: askDominantStocks.slice(0, 10)  // Top 10
      }
    });
    
  } catch (error) {
    console.error('❌ Error analyzing volume imbalance:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;