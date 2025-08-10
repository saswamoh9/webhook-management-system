// routes/stocks.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const Papa = require('papaparse');
const { v4: uuidv4 } = require('uuid');
const { firestore, COLLECTIONS } = require('../config/firestore');
const { 
  getTopStocksBySector, 
  getTopStocksByIndustry, 
  getTopStocksStats,
  generateTopStocksCollections
} = require('../scripts/generate-top-stocks');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'));
    }
  }
});

// Upload and import stock data from CSV/Excel (updated with Market Cap support)
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    let stockData = [];

    // Parse file based on type
    if (req.file.mimetype === 'text/csv') {
      const csvContent = req.file.buffer.toString('utf8');
      const parsed = Papa.parse(csvContent, { header: true });
      stockData = parsed.data;
    } else {
      // Excel file
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      stockData = XLSX.utils.sheet_to_json(worksheet);
    }

    if (stockData.length === 0) {
      return res.status(400).json({ success: false, error: 'File is empty or invalid' });
    }

    // Helper function to parse market cap values
    const parseMarketCap = (value) => {
      if (!value || value === '' || value === 'N/A') return 0;
      const numericValue = parseFloat(value.toString().replace(/,/g, ''));
      return isNaN(numericValue) ? 0 : numericValue;
    };

    // Process and store stock data
    const batch = firestore.batch();
    let importedCount = 0;
    let updatedCount = 0;
    let duplicateCount = 0;

    for (const row of stockData) {
      if (!row.Symbol || !row['Company Name']) continue;

      const symbol = row.Symbol.trim().toUpperCase();
      
      // Check if stock already exists
      const existingQuery = await firestore.collection(COLLECTIONS.STOCKS)
        .where('symbol', '==', symbol)
        .limit(1)
        .get();

      const stockDoc = {
        companyName: row['Company Name']?.trim() || '',
        symbol: symbol,
        macroEconomicClassification: row['Macro Economic Classification']?.trim() || '',
        sector: row.Sector?.trim() || '',
        industry: row.Industry?.trim() || '',
        basicIndustry: row['Basic Industry']?.trim() || '',
        marketCap: parseMarketCap(row['Market Cap']),
        freeFloatMarketCap: parseMarketCap(row['Free Float Market Cap']),
        updatedAt: new Date().toISOString()
      };

      if (!existingQuery.empty) {
        // Update existing record
        const existingDoc = existingQuery.docs[0];
        batch.update(existingDoc.ref, stockDoc);
        updatedCount++;
      } else {
        // Create new record
        const stockId = uuidv4();
        stockDoc.id = stockId;
        stockDoc.createdAt = new Date().toISOString();
        
        batch.set(firestore.collection(COLLECTIONS.STOCKS).doc(stockId), stockDoc);
        importedCount++;
      }

      // Commit in batches of 500 (Firestore limit)
      if ((importedCount + updatedCount) % 500 === 0) {
        await batch.commit();
      }
    }

    // Commit remaining documents
    if (importedCount > 0 || updatedCount > 0) {
      await batch.commit();
    }

    res.json({
      success: true,
      message: `Import completed. ${importedCount} stocks imported, ${updatedCount} updated, ${duplicateCount} duplicates skipped.`,
      data: { importedCount, updatedCount, duplicateCount, totalProcessed: stockData.length }
    });
  } catch (error) {
    console.error('Error importing stocks:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create or update stock (updated with Market Cap support)
router.post('/create', async (req, res) => {
  try {
    const { 
      companyName, 
      symbol, 
      macroEconomicClassification, 
      sector, 
      industry, 
      basicIndustry,
      marketCap,
      freeFloatMarketCap
    } = req.body;

    if (!companyName || !symbol) {
      return res.status(400).json({ success: false, error: 'Company name and symbol are required' });
    }

    const symbolUpper = symbol.trim().toUpperCase();

    // Check if stock already exists
    const existingQuery = await firestore.collection(COLLECTIONS.STOCKS)
      .where('symbol', '==', symbolUpper)
      .limit(1)
      .get();

    if (!existingQuery.empty) {
      return res.status(400).json({ success: false, error: 'Stock with this symbol already exists' });
    }

    const stockId = uuidv4();
    const stockDoc = {
      id: stockId,
      companyName: companyName.trim(),
      symbol: symbolUpper,
      macroEconomicClassification: macroEconomicClassification?.trim() || '',
      sector: sector?.trim() || '',
      industry: industry?.trim() || '',
      basicIndustry: basicIndustry?.trim() || '',
      marketCap: parseFloat(marketCap) || 0,
      freeFloatMarketCap: parseFloat(freeFloatMarketCap) || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await firestore.collection(COLLECTIONS.STOCKS).doc(stockId).set(stockDoc);

    res.json({ success: true, data: stockDoc });
  } catch (error) {
    console.error('Error creating stock:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update stock (updated with Market Cap support)
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      companyName, 
      symbol, 
      macroEconomicClassification, 
      sector, 
      industry, 
      basicIndustry,
      marketCap,
      freeFloatMarketCap
    } = req.body;

    if (!companyName || !symbol) {
      return res.status(400).json({ success: false, error: 'Company name and symbol are required' });
    }

    const symbolUpper = symbol.trim().toUpperCase();

    // Check if another stock with the same symbol exists
    const existingQuery = await firestore.collection(COLLECTIONS.STOCKS)
      .where('symbol', '==', symbolUpper)
      .get();

    const conflictingStock = existingQuery.docs.find(doc => doc.id !== id);
    if (conflictingStock) {
      return res.status(400).json({ success: false, error: 'Another stock with this symbol already exists' });
    }

    const updates = {
      companyName: companyName.trim(),
      symbol: symbolUpper,
      macroEconomicClassification: macroEconomicClassification?.trim() || '',
      sector: sector?.trim() || '',
      industry: industry?.trim() || '',
      basicIndustry: basicIndustry?.trim() || '',
      marketCap: parseFloat(marketCap) || 0,
      freeFloatMarketCap: parseFloat(freeFloatMarketCap) || 0,
      updatedAt: new Date().toISOString()
    };

    await firestore.collection(COLLECTIONS.STOCKS).doc(id).update(updates);

    res.json({ success: true, message: 'Stock updated successfully' });
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete stock
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if stock exists
    const stockDoc = await firestore.collection(COLLECTIONS.STOCKS).doc(id).get();
    if (!stockDoc.exists) {
      return res.status(404).json({ success: false, error: 'Stock not found' });
    }

    await firestore.collection(COLLECTIONS.STOCKS).doc(id).delete();

    res.json({ success: true, message: 'Stock deleted successfully' });
  } catch (error) {
    console.error('Error deleting stock:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search stocks (updated to include market cap filtering)
router.post('/search', async (req, res) => {
  try {
    const { 
      symbol, 
      companyName, 
      sector, 
      industry, 
      basicIndustry, 
      macroEconomicClassification,
      minMarketCap,
      maxMarketCap,
      limit = 50,
      offset = 0
    } = req.body;

    let query = firestore.collection(COLLECTIONS.STOCKS);

    // Apply filters
    if (symbol) {
      query = query.where('symbol', '>=', symbol.toUpperCase())
                   .where('symbol', '<=', symbol.toUpperCase() + '\uf8ff');
    }

    if (sector) {
      query = query.where('sector', '==', sector);
    }

    if (industry) {
      query = query.where('industry', '==', industry);
    }

    if (basicIndustry) {
      query = query.where('basicIndustry', '==', basicIndustry);
    }

    if (macroEconomicClassification) {
      query = query.where('macroEconomicClassification', '==', macroEconomicClassification);
    }

    // Apply pagination
    query = query.limit(parseInt(limit)).offset(parseInt(offset));

    const snapshot = await query.get();
    let results = [];

    snapshot.forEach(doc => {
      const data = { id: doc.id, ...doc.data() };
      
      // Additional filtering for company name (case-insensitive)
      if (companyName && !data.companyName.toLowerCase().includes(companyName.toLowerCase())) {
        return;
      }
      
      // Market cap filtering
      if (minMarketCap && data.marketCap < parseFloat(minMarketCap)) {
        return;
      }
      
      if (maxMarketCap && data.marketCap > parseFloat(maxMarketCap)) {
        return;
      }
      
      results.push(data);
    });

    // Sort results by market cap (descending) then by symbol
    results.sort((a, b) => {
      if (b.marketCap !== a.marketCap) {
        return b.marketCap - a.marketCap;
      }
      return a.symbol.localeCompare(b.symbol);
    });

    res.json({ success: true, data: results, count: results.length });
  } catch (error) {
    console.error('Error searching stocks:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all unique values for filters (updated with market cap stats)
router.get('/filter-options', async (req, res) => {
  try {
    const snapshot = await firestore.collection(COLLECTIONS.STOCKS).get();
    
    const sectors = new Set();
    const industries = new Set();
    const basicIndustries = new Set();
    const macroClassifications = new Set();
    let totalMarketCap = 0;
    let validMarketCapCount = 0;
    let maxMarketCap = 0;
    let minMarketCap = Infinity;

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.sector) sectors.add(data.sector);
      if (data.industry) industries.add(data.industry);
      if (data.basicIndustry) basicIndustries.add(data.basicIndustry);
      if (data.macroEconomicClassification) macroClassifications.add(data.macroEconomicClassification);
      
      if (data.marketCap && data.marketCap > 0) {
        totalMarketCap += data.marketCap;
        validMarketCapCount++;
        maxMarketCap = Math.max(maxMarketCap, data.marketCap);
        minMarketCap = Math.min(minMarketCap, data.marketCap);
      }
    });

    res.json({
      success: true,
      data: {
        sectors: Array.from(sectors).sort(),
        industries: Array.from(industries).sort(),
        basicIndustries: Array.from(basicIndustries).sort(),
        macroEconomicClassifications: Array.from(macroClassifications).sort(),
        marketCapStats: {
          total: totalMarketCap,
          count: validMarketCapCount,
          max: maxMarketCap === 0 ? 0 : maxMarketCap,
          min: minMarketCap === Infinity ? 0 : minMarketCap,
          average: validMarketCapCount > 0 ? totalMarketCap / validMarketCapCount : 0
        }
      }
    });
  } catch (error) {
    console.error('Error getting filter options:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single stock
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await firestore.collection(COLLECTIONS.STOCKS).doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Stock not found' });
    }

    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error('Error getting stock:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get stocks count and market cap stats
router.get('/stats/count', async (req, res) => {
  try {
    const snapshot = await firestore.collection(COLLECTIONS.STOCKS).get();
    
    let totalMarketCap = 0;
    let validMarketCapCount = 0;
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.marketCap && data.marketCap > 0) {
        totalMarketCap += data.marketCap;
        validMarketCapCount++;
      }
    });
    
    res.json({ 
      success: true, 
      data: { 
        count: snapshot.size,
        stocksWithMarketCap: validMarketCapCount,
        totalMarketCap: totalMarketCap
      } 
    });
  } catch (error) {
    console.error('Error getting stocks count:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export stocks to CSV (updated with Market Cap fields)
router.get('/export/csv', async (req, res) => {
  try {
    const snapshot = await firestore.collection(COLLECTIONS.STOCKS)
      .orderBy('symbol')
      .get();

    const stocks = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      stocks.push({
        'Company Name': data.companyName,
        'Symbol': data.symbol,
        'Macro Economic Classification': data.macroEconomicClassification,
        'Sector': data.sector,
        'Industry': data.industry,
        'Basic Industry': data.basicIndustry,
        'Market Cap': data.marketCap || 0,
        'Free Float Market Cap': data.freeFloatMarketCap || 0
      });
    });

    // Convert to CSV
    const csv = Papa.unparse(stocks);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="stocks_export.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting stocks:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// NEW APIs for Top Stocks Collections

// Get top stocks by sector
router.get('/top/sector/:sectorName?', async (req, res) => {
  try {
    const { sectorName } = req.params;
    const data = await getTopStocksBySector(sectorName);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getting top stocks by sector:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get top stocks by industry
router.get('/top/industry/:industryName?', async (req, res) => {
  try {
    const { industryName } = req.params;
    const data = await getTopStocksByIndustry(industryName);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getting top stocks by industry:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get top stocks statistics
router.get('/top/stats', async (req, res) => {
  try {
    const data = await getTopStocksStats();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getting top stocks stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Regenerate top stocks collections
router.post('/top/regenerate', async (req, res) => {
  try {
    await generateTopStocksCollections();
    res.json({ success: true, message: 'Top stocks collections regenerated successfully' });
  } catch (error) {
    console.error('Error regenerating top stocks:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get top companies across all sectors/industries
router.get('/top/overall', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const snapshot = await firestore.collection(COLLECTIONS.STOCKS)
      .where('marketCap', '>', 0)
      .orderBy('marketCap', 'desc')
      .limit(parseInt(limit))
      .get();

    const topStocks = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      topStocks.push({
        id: doc.id,
        symbol: data.symbol,
        companyName: data.companyName,
        sector: data.sector,
        industry: data.industry,
        marketCap: data.marketCap,
        freeFloatMarketCap: data.freeFloatMarketCap
      });
    });

    res.json({ success: true, data: topStocks });
  } catch (error) {
    console.error('Error getting top overall stocks:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/stocks/list - Only active stocks, sorted alphabetically
// GET /api/stocks/list
router.get('/list', async (req, res) => {
  try {
    const snapshot = await db.collection('stocks').get();

    if (snapshot.empty) {
      return res.json({ success: true, data: [] });
    }

    // Extract only the symbol field
    const symbols = snapshot.docs.map(doc => doc.data().symbol);

    res.json({ success: true, data: symbols });
  } catch (err) {
    console.error('Error fetching stock symbols:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});


module.exports = router;