// routes/intraday-analysis.js - Simplified version reading JSON from root folder
const express = require('express');
const router = express.Router();
const { firestore, COLLECTIONS } = require('../config/firestore');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;

// Add collection name for intraday analysis
const INTRADAY_ANALYSIS_COLLECTION = 'intraday_analysis';

// Load industry and sector mappings from root folder
let industryData = null;
let sectorData = null;

// Initialize data on startup
async function initializeData() {
  try {
    // Read from root folder (same level as server.js)
    const industryPath = path.join(__dirname, '../stocks_by_industry.json');
    const sectorPath = path.join(__dirname, '../stocks_by_sector.json');
    
    console.log('📂 Looking for JSON files in root folder...');
    console.log('🔍 Industry file path:', industryPath);
    console.log('🔍 Sector file path:', sectorPath);
    
    const industryContent = await fs.readFile(industryPath, 'utf8');
    const sectorContent = await fs.readFile(sectorPath, 'utf8');
    
    industryData = JSON.parse(industryContent);
    sectorData = JSON.parse(sectorContent);
    
    console.log(`✅ Loaded ${industryData.length} industries and ${sectorData.length} sectors from root folder`);
    
    // Log sample data for verification
    console.log(`📊 Sample Industry: ${industryData[0]?.Industry} (${industryData[0]?.['Stock Count']} stocks)`);
    console.log(`📊 Sample Sector: ${sectorData[0]?.Sector} (${sectorData[0]?.['Stock Count']} stocks)`);
    
  } catch (error) {
    console.error('❌ Error loading industry/sector data from root folder:', error.message);
    console.log('📋 Please ensure these files exist in the root folder:');
    console.log('   - stocks_by_industry.json');
    console.log('   - stocks_by_sector.json');
  }
}

// Initialize on module load
initializeData();

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Intraday Analysis API is running',
    timestamp: new Date().toISOString(),
    dataLoaded: {
      industries: industryData ? industryData.length : 0,
      sectors: sectorData ? sectorData.length : 0,
      dataSource: 'Root folder JSON files'
    }
  });
});

// Load saved analysis for a specific date
router.post('/load', async (req, res) => {
  try {
    const { date } = req.body;
    
    if (!date) {
      return res.status(400).json({ 
        success: false, 
        error: 'Date is required' 
      });
    }

    // Query Firestore for analysis on the specific date
    const snapshot = await firestore
      .collection(INTRADAY_ANALYSIS_COLLECTION)
      .where('date', '==', date)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.json({ 
        success: true, 
        data: null,
        message: `No analysis found for date: ${date}` 
      });
    }

    const analysisDoc = snapshot.docs[0];
    const analysisData = {
      id: analysisDoc.id,
      ...analysisDoc.data()
    };

    res.json({ 
      success: true, 
      data: analysisData 
    });

  } catch (error) {
    console.error('Error loading analysis:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Run fresh analysis using industry/sector JSON data from root folder
router.post('/run-analysis', async (req, res) => {
  try {
    const { date } = req.body;
    
    if (!date) {
      return res.status(400).json({ 
        success: false, 
        error: 'Date is required' 
      });
    }

    if (!industryData || !sectorData) {
      return res.status(500).json({ 
        success: false, 
        error: 'Industry/Sector data not loaded. Please ensure JSON files are in root folder.' 
      });
    }

    console.log(`🔄 Running analysis for ${date} using ${industryData.length} industries and ${sectorData.length} sectors`);

    // Fetch pre-open data for the date
    let preopenData = null;
    try {
      const preopenSnapshot = await firestore
        .collection(COLLECTIONS.PREOPEN_DATA)
        .where('date', '==', date)
        .limit(1)
        .get();

      if (!preopenSnapshot.empty) {
        preopenData = preopenSnapshot.docs[0].data();
        console.log(`📊 Found pre-open data for ${date} with ${Object.keys(preopenData.stocks || {}).length} stocks`);
      } else {
        console.log(`⚠️  No pre-open data found for ${date}, will use current market data`);
      }
    } catch (error) {
      console.log('No pre-open data found for date:', date);
    }

    // Perform analysis using JSON data
    const analysis = await performAnalysisWithJSON(industryData, sectorData, preopenData, date);
    
    // Save the analysis
    const analysisId = uuidv4();
    const analysisDoc = {
      id: analysisId,
      date: date,
      timestamp: new Date().toISOString(),
      ...analysis
    };

    await firestore.collection(INTRADAY_ANALYSIS_COLLECTION).doc(analysisId).set(analysisDoc);

    console.log(`✅ Analysis completed for ${date} and saved with ID: ${analysisId}`);

    res.json({ 
      success: true, 
      data: analysisDoc,
      message: 'Analysis completed and saved successfully' 
    });

  } catch (error) {
    console.error('Error running analysis:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Function to perform analysis using JSON data
async function performAnalysisWithJSON(industries, sectors, preopenData, date) {
  const industryAnalysis = {};
  const sectorAnalysis = {};
  
  let totalAdvances = 0;
  let totalDeclines = 0;
  let totalUnchanged = 0;
  let totalVolume = 0;
  let totalPreopenVolume = 0;

  console.log(`📈 Processing ${industries.length} industries...`);

  // Process Industry Analysis
  for (const industry of industries) {
    const analysis = {
      name: industry.Industry,
      totalMarketCap: industry['Total Market Cap'],
      stockCount: industry['Stock Count'],
      advances: 0,
      declines: 0,
      unchanged: 0,
      totalVolume: 0,
      preopenVolume: 0,
      stocks: []
    };

    for (const stock of industry.Stocks) {
      const stockAnalysis = await analyzeStock(stock, preopenData);
      analysis.stocks.push(stockAnalysis);

      // Count advances/declines
      if (stockAnalysis.change > 0) {
        analysis.advances++;
      } else if (stockAnalysis.change < 0) {
        analysis.declines++;
      } else {
        analysis.unchanged++;
      }

      analysis.totalVolume += stockAnalysis.volume || 0;
      analysis.preopenVolume += stockAnalysis.preopenVolume || 0;
    }

    analysis.adr = analysis.declines > 0 ? analysis.advances / analysis.declines : analysis.advances;
    industryAnalysis[industry.Industry] = analysis;

    // Add to market totals
    totalAdvances += analysis.advances;
    totalDeclines += analysis.declines;
    totalUnchanged += analysis.unchanged;
    totalVolume += analysis.totalVolume;
    totalPreopenVolume += analysis.preopenVolume;
  }

  console.log(`📊 Processing ${sectors.length} sectors...`);

  // Process Sector Analysis
  for (const sector of sectors) {
    const analysis = {
      name: sector.Sector,
      totalMarketCap: sector['Total Market Cap'],
      stockCount: sector['Stock Count'],
      advances: 0,
      declines: 0,
      unchanged: 0,
      totalVolume: 0,
      preopenVolume: 0,
      stocks: []
    };

    for (const stock of sector.Stocks) {
      const stockAnalysis = await analyzeStock(stock, preopenData);
      analysis.stocks.push(stockAnalysis);

      // Count advances/declines
      if (stockAnalysis.change > 0) {
        analysis.advances++;
      } else if (stockAnalysis.change < 0) {
        analysis.declines++;
      } else {
        analysis.unchanged++;
      }

      analysis.totalVolume += stockAnalysis.volume || 0;
      analysis.preopenVolume += stockAnalysis.preopenVolume || 0;
    }

    analysis.adr = analysis.declines > 0 ? analysis.advances / analysis.declines : analysis.advances;
    sectorAnalysis[sector.Sector] = analysis;
  }

  // Calculate market summary
  const marketADR = totalDeclines > 0 ? totalAdvances / totalDeclines : totalAdvances;

  console.log(`📋 Analysis Summary:`);
  console.log(`   Market ADR: ${marketADR.toFixed(2)}`);
  console.log(`   Advances: ${totalAdvances}, Declines: ${totalDeclines}, Unchanged: ${totalUnchanged}`);
  console.log(`   Total Volume: ${totalVolume}, Pre-open Volume: ${totalPreopenVolume}`);

  return {
    summary: {
      marketADR: marketADR,
      marketAdvances: totalAdvances,
      marketDeclines: totalDeclines,
      marketUnchanged: totalUnchanged,
      totalVolume: totalVolume,
      totalPreopenVolume: totalPreopenVolume
    },
    industries: industryAnalysis,
    sectors: sectorAnalysis,
    analysisDate: date,
    dataSource: preopenData ? 'preopen' : 'current'
  };
}

// Function to analyze individual stock
async function analyzeStock(stock, preopenData) {
  const symbol = stock.Symbol;
  
  // Initialize with base data from JSON
  let stockAnalysis = {
    symbol: symbol,
    name: stock['Company Name'],
    marketCap: stock['Market Cap'] || 0,
    freeFloatMarketCap: stock['Free Float Market Cap'] || 0,
    change: 0,
    changePercent: 0,
    volume: 0,
    preopenVolume: 0,
    preopenPrice: 0,
    preopenChange: 0,
    preopenChangePercent: 0
  };

  // Get pre-open data if available
  if (preopenData && preopenData.stocks && preopenData.stocks[symbol]) {
    const preopenStock = preopenData.stocks[symbol];
    
    stockAnalysis.preopenPrice = preopenStock.finalPrice || preopenStock.iep || 0;
    stockAnalysis.preopenVolume = preopenStock.finalQuantity || preopenStock.totalTradedQuantity || 0;
    stockAnalysis.preopenChange = preopenStock.change || 0;
    stockAnalysis.preopenChangePercent = preopenStock.pChange || 0;
    
    // Use pre-open change for analysis
    stockAnalysis.change = preopenStock.change || 0;
    stockAnalysis.changePercent = preopenStock.pChange || 0;
    stockAnalysis.volume = preopenStock.finalQuantity || preopenStock.totalTradedQuantity || 0;
  } else {
    // Try to get current stock data from database if pre-open not available
    try {
      const stockSnapshot = await firestore
        .collection(COLLECTIONS.STOCKS)
        .where('symbol', '==', symbol)
        .limit(1)
        .get();

      if (!stockSnapshot.empty) {
        const currentStock = stockSnapshot.docs[0].data();
        stockAnalysis.change = currentStock.change || 0;
        stockAnalysis.changePercent = currentStock.pChange || 0;
        stockAnalysis.volume = currentStock.volume || 0;
      }
    } catch (error) {
      // Silent fail - use default values
    }
  }

  return stockAnalysis;
}

// Save analysis
router.post('/save', async (req, res) => {
  try {
    const analysisData = req.body;
    
    if (!analysisData || !analysisData.date) {
      return res.status(400).json({ 
        success: false, 
        error: 'Analysis data with date is required' 
      });
    }

    // Check if analysis already exists for this date
    const existingSnapshot = await firestore
      .collection(INTRADAY_ANALYSIS_COLLECTION)
      .where('date', '==', analysisData.date)
      .limit(1)
      .get();

    let docId;
    if (!existingSnapshot.empty) {
      // Update existing analysis
      docId = existingSnapshot.docs[0].id;
      await firestore.collection(INTRADAY_ANALYSIS_COLLECTION).doc(docId).update({
        ...analysisData,
        updatedAt: new Date().toISOString()
      });
    } else {
      // Create new analysis
      docId = uuidv4();
      await firestore.collection(INTRADAY_ANALYSIS_COLLECTION).doc(docId).set({
        id: docId,
        createdAt: new Date().toISOString(),
        ...analysisData
      });
    }

    res.json({ 
      success: true, 
      data: { id: docId, ...analysisData },
      message: 'Analysis saved successfully' 
    });

  } catch (error) {
    console.error('Error saving analysis:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get industry/sector structure
router.get('/structure', (req, res) => {
  try {
    const structure = {
      industries: industryData ? industryData.map(i => ({
        name: i.Industry,
        stockCount: i['Stock Count'],
        totalMarketCap: i['Total Market Cap']
      })) : [],
      sectors: sectorData ? sectorData.map(s => ({
        name: s.Sector,
        stockCount: s['Stock Count'],
        totalMarketCap: s['Total Market Cap']
      })) : []
    };

    res.json({ 
      success: true, 
      data: structure 
    });

  } catch (error) {
    console.error('Error getting structure:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Reload data endpoint (useful for development)
router.post('/reload-data', async (req, res) => {
  try {
    await initializeData();
    res.json({
      success: true,
      message: 'Data reloaded successfully',
      dataLoaded: {
        industries: industryData ? industryData.length : 0,
        sectors: sectorData ? sectorData.length : 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;