// Script to generate top 5 stocks by market cap per sector and industry
const { v4: uuidv4 } = require('uuid');
const { firestore, COLLECTIONS } = require('../config/firestore');

async function generateTopStocksCollections() {
  try {
    console.log('Generating Top Stocks Collections by Market Cap...');
    console.log('==================================================\n');
    
    // Get all stocks from the database
    const stocksSnapshot = await firestore.collection(COLLECTIONS.STOCKS).get();
    
    if (stocksSnapshot.empty) {
      console.error('No stocks found in database. Please import stocks first.');
      process.exit(1);
    }
    
    const stocks = [];
    stocksSnapshot.forEach(doc => {
      const data = doc.data();
      // Only include stocks with valid market cap data
      if (data.marketCap && data.marketCap > 0) {
        stocks.push(data);
      }
    });
    
    console.log(`Found ${stocks.length} stocks with Market Cap data`);
    
    // Generate top stocks by sector
    await generateTopStocksBySector(stocks);
    
    // Generate top stocks by industry
    await generateTopStocksByIndustry(stocks);
    
    console.log('\n=== Top Stocks Collections Generated Successfully ===');
    process.exit(0);
  } catch (error) {
    console.error('Error generating top stocks collections:', error);
    process.exit(1);
  }
}

async function generateTopStocksBySector(stocks) {
  console.log('\nGenerating Top 5 Stocks by Sector...');
  
  // Group stocks by sector
  const stocksBySector = {};
  
  stocks.forEach(stock => {
    const sector = stock.sector?.trim();
    if (sector && sector !== '') {
      if (!stocksBySector[sector]) {
        stocksBySector[sector] = [];
      }
      stocksBySector[sector].push(stock);
    }
  });
  
  console.log(`Found ${Object.keys(stocksBySector).length} unique sectors`);
  
  // Clear existing top stocks by sector collection
  const existingSectorDocs = await firestore.collection(COLLECTIONS.TOP_STOCKS_BY_SECTOR).get();
  const deleteBatch = firestore.batch();
  
  existingSectorDocs.forEach(doc => {
    deleteBatch.delete(doc.ref);
  });
  
  if (!existingSectorDocs.empty) {
    await deleteBatch.commit();
    console.log(`Cleared ${existingSectorDocs.size} existing sector records`);
  }
  
  // Generate top 5 stocks for each sector
  const batch = firestore.batch();
  let totalSectorRecords = 0;
  
  for (const [sector, sectorStocks] of Object.entries(stocksBySector)) {
    // Sort by market cap (descending) and take top 5
    const topStocks = sectorStocks
      .sort((a, b) => b.marketCap - a.marketCap)
      .slice(0, 5)
      .map((stock, index) => ({
        rank: index + 1,
        symbol: stock.symbol,
        companyName: stock.companyName,
        marketCap: stock.marketCap,
        freeFloatMarketCap: stock.freeFloatMarketCap || 0,
        industry: stock.industry || '',
        basicIndustry: stock.basicIndustry || ''
      }));
    
    const docId = uuidv4();
    const sectorDoc = {
      id: docId,
      sector: sector,
      totalStocksInSector: sectorStocks.length,
      totalSectorMarketCap: sectorStocks.reduce((sum, stock) => sum + stock.marketCap, 0),
      topStocks: topStocks,
      generatedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    
    batch.set(firestore.collection(COLLECTIONS.TOP_STOCKS_BY_SECTOR).doc(docId), sectorDoc);
    totalSectorRecords++;
    
    console.log(`  ${sector}: ${topStocks.length} top stocks (${sectorStocks.length} total stocks)`);
    console.log(`    Top stock: ${topStocks[0].companyName} (₹${topStocks[0].marketCap.toLocaleString('en-IN')} Cr)`);
  }
  
  await batch.commit();
  console.log(`✓ Created ${totalSectorRecords} sector records in ${COLLECTIONS.TOP_STOCKS_BY_SECTOR} collection`);
}

async function generateTopStocksByIndustry(stocks) {
  console.log('\nGenerating Top 5 Stocks by Industry...');
  
  // Group stocks by industry
  const stocksByIndustry = {};
  
  stocks.forEach(stock => {
    const industry = stock.industry?.trim();
    if (industry && industry !== '') {
      if (!stocksByIndustry[industry]) {
        stocksByIndustry[industry] = [];
      }
      stocksByIndustry[industry].push(stock);
    }
  });
  
  console.log(`Found ${Object.keys(stocksByIndustry).length} unique industries`);
  
  // Clear existing top stocks by industry collection
  const existingIndustryDocs = await firestore.collection(COLLECTIONS.TOP_STOCKS_BY_INDUSTRY).get();
  const deleteBatch = firestore.batch();
  
  existingIndustryDocs.forEach(doc => {
    deleteBatch.delete(doc.ref);
  });
  
  if (!existingIndustryDocs.empty) {
    await deleteBatch.commit();
    console.log(`Cleared ${existingIndustryDocs.size} existing industry records`);
  }
  
  // Generate top 5 stocks for each industry
  const batch = firestore.batch();
  let totalIndustryRecords = 0;
  
  for (const [industry, industryStocks] of Object.entries(stocksByIndustry)) {
    // Sort by market cap (descending) and take top 5
    const topStocks = industryStocks
      .sort((a, b) => b.marketCap - a.marketCap)
      .slice(0, 5)
      .map((stock, index) => ({
        rank: index + 1,
        symbol: stock.symbol,
        companyName: stock.companyName,
        marketCap: stock.marketCap,
        freeFloatMarketCap: stock.freeFloatMarketCap || 0,
        sector: stock.sector || '',
        basicIndustry: stock.basicIndustry || ''
      }));
    
    const docId = uuidv4();
    const industryDoc = {
      id: docId,
      industry: industry,
      totalStocksInIndustry: industryStocks.length,
      totalIndustryMarketCap: industryStocks.reduce((sum, stock) => sum + stock.marketCap, 0),
      topStocks: topStocks,
      generatedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    
    batch.set(firestore.collection(COLLECTIONS.TOP_STOCKS_BY_INDUSTRY).doc(docId), industryDoc);
    totalIndustryRecords++;
    
    console.log(`  ${industry}: ${topStocks.length} top stocks (${industryStocks.length} total stocks)`);
    console.log(`    Top stock: ${topStocks[0].companyName} (₹${topStocks[0].marketCap.toLocaleString('en-IN')} Cr)`);
  }
  
  await batch.commit();
  console.log(`✓ Created ${totalIndustryRecords} industry records in ${COLLECTIONS.TOP_STOCKS_BY_INDUSTRY} collection`);
}

// Function to get top stocks by sector (for API use)
async function getTopStocksBySector(sectorName = null) {
  try {
    let query = firestore.collection(COLLECTIONS.TOP_STOCKS_BY_SECTOR);
    
    if (sectorName) {
      query = query.where('sector', '==', sectorName);
    }
    
    const snapshot = await query.get();
    const results = [];
    
    snapshot.forEach(doc => {
      results.push({ id: doc.id, ...doc.data() });
    });
    
    return results.sort((a, b) => b.totalSectorMarketCap - a.totalSectorMarketCap);
  } catch (error) {
    console.error('Error getting top stocks by sector:', error);
    throw error;
  }
}

// Function to get top stocks by industry (for API use)
async function getTopStocksByIndustry(industryName = null) {
  try {
    let query = firestore.collection(COLLECTIONS.TOP_STOCKS_BY_INDUSTRY);
    
    if (industryName) {
      query = query.where('industry', '==', industryName);
    }
    
    const snapshot = await query.get();
    const results = [];
    
    snapshot.forEach(doc => {
      results.push({ id: doc.id, ...doc.data() });
    });
    
    return results.sort((a, b) => b.totalIndustryMarketCap - a.totalIndustryMarketCap);
  } catch (error) {
    console.error('Error getting top stocks by industry:', error);
    throw error;
  }
}

// Function to get overall statistics
async function getTopStocksStats() {
  try {
    const [sectorSnapshot, industrySnapshot] = await Promise.all([
      firestore.collection(COLLECTIONS.TOP_STOCKS_BY_SECTOR).get(),
      firestore.collection(COLLECTIONS.TOP_STOCKS_BY_INDUSTRY).get()
    ]);
    
    return {
      totalSectors: sectorSnapshot.size,
      totalIndustries: industrySnapshot.size,
      lastGenerated: sectorSnapshot.docs.length > 0 ? 
        sectorSnapshot.docs[0].data().generatedAt : null
    };
  } catch (error) {
    console.error('Error getting top stocks stats:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  generateTopStocksCollections();
}

module.exports = { 
  generateTopStocksCollections,
  getTopStocksBySector,
  getTopStocksByIndustry,
  getTopStocksStats
};