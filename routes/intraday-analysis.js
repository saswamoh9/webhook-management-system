// routes/intraday-analysis.js
const express = require('express');
const router = express.Router();
const { firestore, COLLECTIONS } = require('../config/firestore');
const { v4: uuidv4 } = require('uuid');

// Add collection name for intraday analysis
const INTRADAY_ANALYSIS_COLLECTION = 'intraday_analysis';

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Intraday Analysis API is running',
    timestamp: new Date().toISOString()
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
      await firestore
        .collection(INTRADAY_ANALYSIS_COLLECTION)
        .doc(docId)
        .update({
          ...analysisData,
          updatedAt: new Date().toISOString()
        });
    } else {
      // Create new analysis
      docId = uuidv4();
      await firestore
        .collection(INTRADAY_ANALYSIS_COLLECTION)
        .doc(docId)
        .set({
          ...analysisData,
          createdAt: new Date().toISOString()
        });
    }

    res.json({ 
      success: true, 
      id: docId,
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

// Get pre-open data by date
router.post('/preopen-by-date', async (req, res) => {
  try {
    const { date } = req.body;
    
    if (!date) {
      return res.status(400).json({ 
        success: false, 
        error: 'Date is required' 
      });
    }

    // Query pre-open data for the specific date
    const snapshot = await firestore
      .collection(COLLECTIONS.PREOPEN_DATA)
      .where('date', '==', date)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.json({ 
        success: true, 
        data: null,
        message: `No pre-open data found for date: ${date}` 
      });
    }

    const preopenDoc = snapshot.docs[0];
    const preopenData = {
      id: preopenDoc.id,
      ...preopenDoc.data()
    };

    res.json({ 
      success: true, 
      data: preopenData 
    });

  } catch (error) {
    console.error('Error loading pre-open data:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get 20-day average pre-open volume
router.post('/preopen-20day-average', async (req, res) => {
  try {
    const { endDate, groupBy } = req.body;
    
    if (!endDate) {
      return res.status(400).json({ 
        success: false, 
        error: 'End date is required' 
      });
    }

    // Calculate start date (20 days before end date)
    const end = new Date(endDate);
    const start = new Date(end);
    start.setDate(start.getDate() - 20);
    
    const startDateStr = start.toISOString().split('T')[0];
    const endDateStr = end.toISOString().split('T')[0];

    // Query pre-open data for the last 20 days
    const snapshot = await firestore
      .collection(COLLECTIONS.PREOPEN_DATA)
      .where('date', '>=', startDateStr)
      .where('date', '<=', endDateStr)
      .orderBy('date', 'desc')
      .limit(20)
      .get();

    if (snapshot.empty) {
      return res.json({ 
        success: true, 
        data: {
          sectorAverages: {},
          industryAverages: {}
        },
        message: 'No pre-open data found for the specified period' 
      });
    }

    // Get stocks collection for sector/industry mapping
    const stocksSnapshot = await firestore
      .collection(COLLECTIONS.STOCKS)
      .get();
    
    const stockMap = {};
    stocksSnapshot.docs.forEach(doc => {
      const stock = doc.data();
      stockMap[stock.symbol] = {
        sector: stock.sector,
        industry: stock.industry
      };
    });

    // Calculate averages
    const sectorVolumes = {};
    const industryVolumes = {};
    let dayCount = 0;

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      
      // Check both 'data' and 'stocks' fields as different versions might use different field names
      const stocksArray = data.data || data.stocks;
      
      if (stocksArray && Array.isArray(stocksArray)) {
        dayCount++;
        
        stocksArray.forEach(stock => {
          const stockInfo = stockMap[stock.symbol];
          if (stockInfo) {
            // Use finalQuantity as primary field, fallback to volume
            const volume = stock.finalQuantity || stock.volume || 0;
            
            // Accumulate sector volumes
            if (stockInfo.sector) {
              if (!sectorVolumes[stockInfo.sector]) {
                sectorVolumes[stockInfo.sector] = 0;
              }
              sectorVolumes[stockInfo.sector] += volume;
            }
            
            // Accumulate industry volumes
            if (stockInfo.industry) {
              if (!industryVolumes[stockInfo.industry]) {
                industryVolumes[stockInfo.industry] = 0;
              }
              industryVolumes[stockInfo.industry] += volume;
            }
          }
        });
      }
    });

    // Calculate averages
    const sectorAverages = {};
    const industryAverages = {};

    if (dayCount > 0) {
      Object.keys(sectorVolumes).forEach(sector => {
        sectorAverages[sector] = {
          avgVolume: Math.round(sectorVolumes[sector] / dayCount),
          dayCount: dayCount
        };
      });

      Object.keys(industryVolumes).forEach(industry => {
        industryAverages[industry] = {
          avgVolume: Math.round(industryVolumes[industry] / dayCount),
          dayCount: dayCount
        };
      });
    }

    res.json({ 
      success: true, 
      data: {
        sectorAverages,
        industryAverages,
        periodStart: startDateStr,
        periodEnd: endDateStr,
        daysAnalyzed: dayCount
      }
    });

  } catch (error) {
    console.error('Error calculating 20-day average:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get all available analysis dates
router.get('/available-dates', async (req, res) => {
  try {
    const snapshot = await firestore
      .collection(INTRADAY_ANALYSIS_COLLECTION)
      .select('date')
      .orderBy('date', 'desc')
      .get();

    const dates = snapshot.docs.map(doc => doc.data().date);
    
    res.json({ 
      success: true, 
      dates: [...new Set(dates)] // Remove duplicates
    });

  } catch (error) {
    console.error('Error fetching available dates:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Delete old analysis (cleanup endpoint)
router.delete('/cleanup', async (req, res) => {
  try {
    const { daysToKeep = 30 } = req.body;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    const snapshot = await firestore
      .collection(INTRADAY_ANALYSIS_COLLECTION)
      .where('date', '<', cutoffDateStr)
      .get();

    const batch = firestore.batch();
    let deleteCount = 0;

    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
      deleteCount++;
    });

    if (deleteCount > 0) {
      await batch.commit();
    }

    res.json({ 
      success: true, 
      message: `Deleted ${deleteCount} old analysis records older than ${cutoffDateStr}` 
    });

  } catch (error) {
    console.error('Error cleaning up old analysis:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;