// Script to analyze the CSV data structure with Market Cap support
const fs = require('fs');
const Papa = require('papaparse');
const path = require('path');

async function analyzeCsvData() {
  try {
    console.log('Stock Data CSV Analysis (with Market Cap)');
    console.log('=========================================\n');
    
    const csvPath = path.join(__dirname, '../stocks_with_market_cap.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.error('CSV file not found at:', csvPath);
      return;
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const parsed = Papa.parse(csvContent, { header: true });
    
    console.log(`Total records: ${parsed.data.length}`);
    console.log(`Parse errors: ${parsed.errors.length}`);
    
    if (parsed.errors.length > 0) {
      console.log('\nParse errors:');
      parsed.errors.forEach(error => console.log(error));
    }
    
    // Get column names
    const columns = parsed.meta.fields;
    console.log('\nColumns found:');
    columns.forEach((col, index) => {
      console.log(`${index + 1}. ${col}`);
    });
    
    // Show sample data
    console.log('\nSample records (first 3):');
    parsed.data.slice(0, 3).forEach((record, index) => {
      console.log(`\nRecord ${index + 1}:`);
      Object.entries(record).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
    });
    
    // Data validation
    console.log('\n=== Data Validation ===');
    
    const validRecords = parsed.data.filter(record => 
      record.Symbol && record['Company Name']
    );
    
    console.log(`Valid records (have Symbol and Company Name): ${validRecords.length}`);
    console.log(`Invalid records: ${parsed.data.length - validRecords.length}`);
    
    // Check for duplicates
    const symbols = validRecords.map(record => record.Symbol.trim().toUpperCase());
    const uniqueSymbols = new Set(symbols);
    const duplicates = symbols.length - uniqueSymbols.size;
    
    console.log(`Unique symbols: ${uniqueSymbols.size}`);
    console.log(`Duplicate symbols: ${duplicates}`);
    
    // Show duplicate symbols if any
    if (duplicates > 0) {
      const symbolCounts = {};
      symbols.forEach(symbol => {
        symbolCounts[symbol] = (symbolCounts[symbol] || 0) + 1;
      });
      
      const duplicateSymbols = Object.entries(symbolCounts)
        .filter(([symbol, count]) => count > 1);
      
      console.log('\nDuplicate symbols:');
      duplicateSymbols.forEach(([symbol, count]) => {
        console.log(`  ${symbol}: ${count} occurrences`);
      });
    }
    
    // Analyze data distribution
    console.log('\n=== Data Distribution ===');
    
    const sectors = {};
    const industries = {};
    const basicIndustries = {};
    const macroClassifications = {};
    
    validRecords.forEach(record => {
      const sector = record.Sector?.trim();
      const industry = record.Industry?.trim();
      const basicIndustry = record['Basic Industry']?.trim();
      const macroClass = record['Macro Economic Classification']?.trim();
      
      if (sector) sectors[sector] = (sectors[sector] || 0) + 1;
      if (industry) industries[industry] = (industries[industry] || 0) + 1;
      if (basicIndustry) basicIndustries[basicIndustry] = (basicIndustries[basicIndustry] || 0) + 1;
      if (macroClass) macroClassifications[macroClass] = (macroClassifications[macroClass] || 0) + 1;
    });
    
    console.log(`\nUnique Sectors: ${Object.keys(sectors).length}`);
    console.log('Top 10 sectors:');
    Object.entries(sectors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([sector, count]) => {
        console.log(`  ${sector}: ${count} stocks`);
      });
    
    console.log(`\nUnique Industries: ${Object.keys(industries).length}`);
    console.log('Top 10 industries:');
    Object.entries(industries)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([industry, count]) => {
        console.log(`  ${industry}: ${count} stocks`);
      });
    
    console.log(`\nUnique Basic Industries: ${Object.keys(basicIndustries).length}`);
    console.log(`Unique Macro Classifications: ${Object.keys(macroClassifications).length}`);
    
    console.log('\nMacro Classifications:');
    Object.entries(macroClassifications)
      .sort((a, b) => b[1] - a[1])
      .forEach(([classification, count]) => {
        console.log(`  ${classification}: ${count} stocks`);
      });
    
    // Market Cap Analysis
    console.log('\n=== Market Cap Analysis ===');
    
    const parseMarketCap = (value) => {
      if (!value || value === '' || value === 'N/A') return 0;
      const numericValue = parseFloat(value.toString().replace(/,/g, ''));
      return isNaN(numericValue) ? 0 : numericValue;
    };
    
    let totalMarketCap = 0;
    let totalFreeFloatMarketCap = 0;
    let validMarketCapRecords = 0;
    let validFreeFloatRecords = 0;
    const marketCapRanges = {
      'Large Cap (>20,000 Cr)': 0,
      'Mid Cap (5,000-20,000 Cr)': 0,
      'Small Cap (<5,000 Cr)': 0,
      'No Data': 0
    };
    
    validRecords.forEach(record => {
      const marketCap = parseMarketCap(record['Market Cap']);
      const freeFloatMarketCap = parseMarketCap(record['Free Float Market Cap']);
      
      if (marketCap > 0) {
        totalMarketCap += marketCap;
        validMarketCapRecords++;
        
        if (marketCap >= 20000) {
          marketCapRanges['Large Cap (>20,000 Cr)']++;
        } else if (marketCap >= 5000) {
          marketCapRanges['Mid Cap (5,000-20,000 Cr)']++;
        } else {
          marketCapRanges['Small Cap (<5,000 Cr)']++;
        }
      } else {
        marketCapRanges['No Data']++;
      }
      
      if (freeFloatMarketCap > 0) {
        totalFreeFloatMarketCap += freeFloatMarketCap;
        validFreeFloatRecords++;
      }
    });
    
    console.log(`Records with Market Cap data: ${validMarketCapRecords}/${validRecords.length}`);
    console.log(`Records with Free Float Market Cap data: ${validFreeFloatRecords}/${validRecords.length}`);
    console.log(`Total Market Cap: ₹${totalMarketCap.toLocaleString('en-IN')} Cr`);
    console.log(`Total Free Float Market Cap: ₹${totalFreeFloatMarketCap.toLocaleString('en-IN')} Cr`);
    
    console.log('\nMarket Cap Distribution:');
    Object.entries(marketCapRanges).forEach(([range, count]) => {
      const percentage = ((count / validRecords.length) * 100).toFixed(1);
      console.log(`  ${range}: ${count} stocks (${percentage}%)`);
    });
    
    // Top companies by Market Cap
    const companiesWithMarketCap = validRecords
      .map(record => ({
        company: record['Company Name'],
        symbol: record.Symbol,
        sector: record.Sector,
        marketCap: parseMarketCap(record['Market Cap'])
      }))
      .filter(company => company.marketCap > 0)
      .sort((a, b) => b.marketCap - a.marketCap);
    
    console.log('\nTop 10 Companies by Market Cap:');
    companiesWithMarketCap.slice(0, 10).forEach((company, index) => {
      console.log(`  ${index + 1}. ${company.company} (${company.symbol}): ₹${company.marketCap.toLocaleString('en-IN')} Cr`);
    });
    
    // Check for missing data
    console.log('\n=== Missing Data Analysis ===');
    
    let missingSector = 0;
    let missingIndustry = 0;
    let missingBasicIndustry = 0;
    let missingMacroClass = 0;
    let missingMarketCap = 0;
    let missingFreeFloatMarketCap = 0;
    
    validRecords.forEach(record => {
      if (!record.Sector?.trim()) missingSector++;
      if (!record.Industry?.trim()) missingIndustry++;
      if (!record['Basic Industry']?.trim()) missingBasicIndustry++;
      if (!record['Macro Economic Classification']?.trim()) missingMacroClass++;
      if (parseMarketCap(record['Market Cap']) === 0) missingMarketCap++;
      if (parseMarketCap(record['Free Float Market Cap']) === 0) missingFreeFloatMarketCap++;
    });
    
    console.log(`Records missing Sector: ${missingSector}`);
    console.log(`Records missing Industry: ${missingIndustry}`);
    console.log(`Records missing Basic Industry: ${missingBasicIndustry}`);
    console.log(`Records missing Macro Classification: ${missingMacroClass}`);
    console.log(`Records missing Market Cap: ${missingMarketCap}`);
    console.log(`Records missing Free Float Market Cap: ${missingFreeFloatMarketCap}`);
    
    // Sample import preview
    console.log('\n=== Import Preview ===');
    console.log('This is how the data will be stored in Firestore:');
    
    const sampleRecord = validRecords[0];
    const firestoreDoc = {
      id: 'uuid-generated',
      companyName: sampleRecord['Company Name']?.trim() || '',
      symbol: sampleRecord.Symbol?.trim().toUpperCase() || '',
      macroEconomicClassification: sampleRecord['Macro Economic Classification']?.trim() || '',
      sector: sampleRecord.Sector?.trim() || '',
      industry: sampleRecord.Industry?.trim() || '',
      basicIndustry: sampleRecord['Basic Industry']?.trim() || '',
      marketCap: parseMarketCap(sampleRecord['Market Cap']),
      freeFloatMarketCap: parseMarketCap(sampleRecord['Free Float Market Cap']),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log(JSON.stringify(firestoreDoc, null, 2));
    
    console.log('\n=== Analysis Complete ===');
    console.log('The CSV data looks ready for import!');
    console.log('Run "npm run import-stocks" to import this data.');
    console.log('Then run "npm run generate-top-stocks" to create top stocks collections.');
    
  } catch (error) {
    console.error('Error analyzing CSV:', error);
  }
}

// Run if called directly
if (require.main === module) {
  analyzeCsvData();
}

module.exports = { analyzeCsvData };