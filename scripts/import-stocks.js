// Script to import initial stock data from CSV file with Market Cap support
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const { v4: uuidv4 } = require('uuid');
const { firestore, COLLECTIONS } = require('../config/firestore');

async function importStocksFromCSV() {
  try {
    console.log('Starting stock data import with Market Cap...');
    
    // Read CSV file
    const csvPath = path.join(__dirname, '../stocks_with_market_cap.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.error('CSV file not found at:', csvPath);
      console.log('Please ensure stocks_with_market_cap.csv is in the project root directory');
      process.exit(1);
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    console.log('CSV file loaded successfully');
    
    // Parse CSV
    const parsed = Papa.parse(csvContent, { header: true });
    
    if (parsed.errors.length > 0) {
      console.error('CSV parsing errors:', parsed.errors);
    }
    
    const stockData = parsed.data.filter(row => row.Symbol && row['Company Name']); // Filter out empty rows
    console.log(`Found ${stockData.length} stock records to import`);
    
    // Check if any stocks already exist
    const existingStocksSnapshot = await firestore.collection(COLLECTIONS.STOCKS).limit(1).get();
    
    if (!existingStocksSnapshot.empty) {
      console.log('Stock data already exists in database');
      const answer = await promptUser('Do you want to continue and update existing records? (y/n): ');
      if (answer.toLowerCase() !== 'y') {
        console.log('Import cancelled');
        process.exit(0);
      }
    }
    
    // Process and store stock data in batches
    const batchSize = 500; // Firestore batch limit
    let totalImported = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    
    for (let i = 0; i < stockData.length; i += batchSize) {
      const batch = firestore.batch();
      const batchData = stockData.slice(i, i + batchSize);
      let batchImported = 0;
      let batchUpdated = 0;
      let batchSkipped = 0;
      
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(stockData.length / batchSize)}...`);
      
      for (const row of batchData) {
        const symbol = row.Symbol.trim().toUpperCase();
        
        // Parse market cap values (handle both string and number formats)
        const parseMarketCap = (value) => {
          if (!value || value === '' || value === 'N/A') return 0;
          // Remove commas and convert to number
          const numericValue = parseFloat(value.toString().replace(/,/g, ''));
          return isNaN(numericValue) ? 0 : numericValue;
        };
        
        const marketCap = parseMarketCap(row['Market Cap']);
        const freeFloatMarketCap = parseMarketCap(row['Free Float Market Cap']);
        
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
          marketCap: marketCap, // New field
          freeFloatMarketCap: freeFloatMarketCap, // New field
          updatedAt: new Date().toISOString()
        };
        
        if (!existingQuery.empty) {
          // Update existing record
          const existingDoc = existingQuery.docs[0];
          batch.update(existingDoc.ref, stockDoc);
          batchUpdated++;
        } else {
          // Create new record
          const stockId = uuidv4();
          stockDoc.id = stockId;
          stockDoc.createdAt = new Date().toISOString();
          
          batch.set(firestore.collection(COLLECTIONS.STOCKS).doc(stockId), stockDoc);
          batchImported++;
        }
      }
      
      // Commit batch if there are any documents to process
      if (batchImported > 0 || batchUpdated > 0) {
        await batch.commit();
        console.log(`Batch committed: ${batchImported} imported, ${batchUpdated} updated, ${batchSkipped} skipped`);
      } else {
        console.log(`Batch skipped: all ${batchSkipped} records already exist`);
      }
      
      totalImported += batchImported;
      totalUpdated += batchUpdated;
      totalSkipped += batchSkipped;
      
      // Small delay to avoid overwhelming Firestore
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n=== Import Complete ===');
    console.log(`Total records processed: ${stockData.length}`);
    console.log(`Successfully imported: ${totalImported}`);
    console.log(`Successfully updated: ${totalUpdated}`);
    console.log(`Skipped (errors): ${totalSkipped}`);
    
    // Display some statistics
    await displayStats();
    
    console.log('\nNext step: Run "npm run generate-top-stocks" to create top stocks collections');
    
    process.exit(0);
  } catch (error) {
    console.error('Error importing stocks:', error);
    process.exit(1);
  }
}

async function displayStats() {
  try {
    console.log('\n=== Database Statistics ===');
    
    // Get total count
    const totalSnapshot = await firestore.collection(COLLECTIONS.STOCKS).get();
    console.log(`Total stocks in database: ${totalSnapshot.size}`);
    
    // Get unique sectors, industries, etc.
    const sectors = new Set();
    const industries = new Set();
    const basicIndustries = new Set();
    const macroClassifications = new Set();
    let totalMarketCap = 0;
    let stocksWithMarketCap = 0;
    
    totalSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.sector) sectors.add(data.sector);
      if (data.industry) industries.add(data.industry);
      if (data.basicIndustry) basicIndustries.add(data.basicIndustry);
      if (data.macroEconomicClassification) macroClassifications.add(data.macroEconomicClassification);
      
      if (data.marketCap && data.marketCap > 0) {
        totalMarketCap += data.marketCap;
        stocksWithMarketCap++;
      }
    });
    
    console.log(`Unique sectors: ${sectors.size}`);
    console.log(`Unique industries: ${industries.size}`);
    console.log(`Unique basic industries: ${basicIndustries.size}`);
    console.log(`Unique macro classifications: ${macroClassifications.size}`);
    console.log(`Stocks with Market Cap data: ${stocksWithMarketCap}`);
    console.log(`Total Market Cap: ₹${totalMarketCap.toLocaleString('en-IN')} Cr`);
    
    // Show top 5 sectors by market cap
    const sectorMarketCaps = {};
    totalSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.sector && data.marketCap > 0) {
        sectorMarketCaps[data.sector] = (sectorMarketCaps[data.sector] || 0) + data.marketCap;
      }
    });
    
    const topSectorsByMarketCap = Object.entries(sectorMarketCaps)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    console.log('\nTop 5 sectors by Market Cap:');
    topSectorsByMarketCap.forEach(([sector, marketCap]) => {
      console.log(`  ${sector}: ₹${marketCap.toLocaleString('en-IN')} Cr`);
    });
    
  } catch (error) {
    console.error('Error displaying statistics:', error);
  }
}

function promptUser(question) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

// Run if called directly
if (require.main === module) {
  console.log('Stock Data Import Utility (with Market Cap)');
  console.log('==========================================\n');
  importStocksFromCSV();
}

module.exports = { importStocksFromCSV };