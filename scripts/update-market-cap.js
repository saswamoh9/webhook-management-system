// Create new file: scripts/update-market-cap.js

const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const { firestore, COLLECTIONS } = require('../config/firestore');

// Helper function to normalize company names for matching
function normalizeCompanyName(name) {
    if (!name) return '';
    return name
        .toLowerCase()
        .replace(/\s+ltd\.?$/i, '')
        .replace(/\s+limited$/i, '')
        .replace(/\s+inc\.?$/i, '')
        .replace(/\s+corporation$/i, '')
        .replace(/\s+corp\.?$/i, '')
        .replace(/\s+pvt\.?$/i, '')
        .replace(/\s+private$/i, '')
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// Helper function to parse market cap values
function parseMarketCap(value) {
    if (!value || value === '-' || value === 'N/A') return null;
    
    // Remove commas and convert to number
    const numStr = value.toString().replace(/,/g, '');
    const num = parseFloat(numStr);
    
    return isNaN(num) ? null : num;
}

// Helper function to categorize market cap
function getMarketCapCategory(totalMarketCap) {
    if (!totalMarketCap) return null;
    
    const capInCrores = totalMarketCap;
    
    if (capInCrores >= 20000) return 'Large Cap';
    if (capInCrores >= 5000) return 'Mid Cap';
    if (capInCrores >= 1000) return 'Small Cap';
    return 'Micro Cap';
}

async function updateStocksMarketCap() {
    try {
        console.log('🚀 Starting market cap update process...\n');
        
        // Read the CSV file
        const csvPath = path.join(__dirname, '../stocks_with_market_cap.csv');
        
        if (!fs.existsSync(csvPath)) {
            console.error('❌ CSV file not found at:', csvPath);
            console.log('Please ensure stocks_with_market_cap.csv is in the project root directory');
            process.exit(1);
        }
        
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        console.log('✅ CSV file loaded successfully');
        
        // Parse CSV
        const parsed = Papa.parse(csvContent, { 
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => header.trim()
        });
        
        if (parsed.errors.length > 0) {
            console.warn('⚠️  CSV parsing warnings:', parsed.errors);
        }
        
        const marketCapData = parsed.data.filter(row => 
            row['Company Name'] && row['Company Name'].trim()
        );
        
        console.log(`📊 Found ${marketCapData.length} market cap records\n`);
        
        // Get all existing stocks from database
        console.log('📡 Fetching existing stocks from database...');
        const stocksSnapshot = await firestore.collection(COLLECTIONS.STOCKS).get();
        const existingStocks = [];
        
        stocksSnapshot.forEach(doc => {
            existingStocks.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`📦 Found ${existingStocks.length} existing stocks in database\n`);
        
        // Create mapping for faster lookups
        const marketCapMap = new Map();
        marketCapData.forEach(row => {
            const normalizedName = normalizeCompanyName(row['Company Name']);
            if (normalizedName) {
                marketCapMap.set(normalizedName, {
                    originalName: row['Company Name'],
                    totalMarketCap: parseMarketCap(row['Total Market Cap (In Crores)']),
                    freeFloatMarketCap: parseMarketCap(row['Free Float Market Cap (In Crores)']),
                    status: row['Status'] || ''
                });
            }
        });
        
        console.log('🔍 Starting matching process...\n');
        
        let updated = 0;
        let notFound = 0;
        let errors = 0;
        const updateResults = [];
        
        // Process stocks in batches
        const batchSize = 50;
        for (let i = 0; i < existingStocks.length; i += batchSize) {
            const batch = existingStocks.slice(i, i + batchSize);
            
            console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(existingStocks.length / batchSize)}...`);
            
            for (const stock of batch) {
                try {
                    const normalizedStockName = normalizeCompanyName(stock.companyName);
                    const marketCapInfo = marketCapMap.get(normalizedStockName);
                    
                    if (marketCapInfo) {
                        // Prepare update data
                        const updateData = {
                            totalMarketCap: marketCapInfo.totalMarketCap,
                            freeFloatMarketCap: marketCapInfo.freeFloatMarketCap,
                            marketCapCategory: getMarketCapCategory(marketCapInfo.totalMarketCap),
                            marketCapStatus: marketCapInfo.status,
                            marketCapUpdatedAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        };
                        
                        // Update the stock in Firestore
                        await firestore.collection(COLLECTIONS.STOCKS)
                            .doc(stock.id)
                            .update(updateData);
                        
                        updated++;
                        updateResults.push({
                            symbol: stock.symbol,
                            companyName: stock.companyName,
                            matchedWith: marketCapInfo.originalName,
                            totalMarketCap: marketCapInfo.totalMarketCap,
                            freeFloatMarketCap: marketCapInfo.freeFloatMarketCap,
                            category: getMarketCapCategory(marketCapInfo.totalMarketCap),
                            status: 'updated'
                        });
                        
                        console.log(`✅ ${stock.symbol} (${stock.companyName}) → ₹${marketCapInfo.totalMarketCap} Cr`);
                    } else {
                        notFound++;
                        updateResults.push({
                            symbol: stock.symbol,
                            companyName: stock.companyName,
                            status: 'not_found'
                        });
                        
                        console.log(`❓ ${stock.symbol} (${stock.companyName}) - No market cap data found`);
                    }
                } catch (error) {
                    errors++;
                    console.error(`❌ Error updating ${stock.symbol}:`, error.message);
                    updateResults.push({
                        symbol: stock.symbol,
                        companyName: stock.companyName,
                        status: 'error',
                        error: error.message
                    });
                }
            }
            
            // Small delay to avoid overwhelming Firestore
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Generate detailed report
        console.log('\n' + '='.repeat(60));
        console.log('📋 MARKET CAP UPDATE REPORT');
        console.log('='.repeat(60));
        console.log(`📊 Total stocks processed: ${existingStocks.length}`);
        console.log(`✅ Successfully updated: ${updated}`);
        console.log(`❓ Not found in market cap data: ${notFound}`);
        console.log(`❌ Errors: ${errors}`);
        console.log(`📈 Success rate: ${((updated / existingStocks.length) * 100).toFixed(1)}%`);
        
        // Show category breakdown
        const categoryBreakdown = {};
        updateResults.forEach(result => {
            if (result.category) {
                categoryBreakdown[result.category] = (categoryBreakdown[result.category] || 0) + 1;
            }
        });
        
        if (Object.keys(categoryBreakdown).length > 0) {
            console.log('\n📊 Market Cap Categories:');
            Object.entries(categoryBreakdown).forEach(([category, count]) => {
                console.log(`   ${category}: ${count} stocks`);
            });
        }
        
        // Save detailed report to file
        const reportPath = path.join(__dirname, `../market_cap_update_report_${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            summary: {
                totalProcessed: existingStocks.length,
                updated,
                notFound,
                errors,
                successRate: (updated / existingStocks.length) * 100
            },
            categoryBreakdown,
            detailedResults: updateResults
        }, null, 2));
        
        console.log(`\n📁 Detailed report saved to: ${reportPath}`);
        
        // Show some examples of unmatched stocks
        const unmatched = updateResults.filter(r => r.status === 'not_found').slice(0, 10);
        if (unmatched.length > 0) {
            console.log('\n❓ Some unmatched stocks (first 10):');
            unmatched.forEach(stock => {
                console.log(`   • ${stock.symbol}: ${stock.companyName}`);
            });
            
            if (notFound > 10) {
                console.log(`   ... and ${notFound - 10} more`);
            }
        }
        
        console.log('\n🎉 Market cap update process completed!');
        console.log('💡 Tip: Check the detailed report file for full results\n');
        
        process.exit(0);
        
    } catch (error) {
        console.error('💥 Fatal error in market cap update:', error);
        process.exit(1);
    }
}

// Manual matching function for difficult cases
async function manualMatch(symbol, marketCapDataCompanyName) {
    try {
        // Find the market cap data
        const csvPath = path.join(__dirname, '../stocks_with_market_cap.csv');
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
        
        const marketCapRecord = parsed.data.find(row => 
            row['Company Name'] === marketCapDataCompanyName
        );
        
        if (!marketCapRecord) {
            console.log(`❌ Market cap data not found for: ${marketCapDataCompanyName}`);
            return;
        }
        
        // Find and update the stock
        const stockQuery = await firestore.collection(COLLECTIONS.STOCKS)
            .where('symbol', '==', symbol.toUpperCase())
            .get();
        
        if (stockQuery.empty) {
            console.log(`❌ Stock not found for symbol: ${symbol}`);
            return;
        }
        
        const stockDoc = stockQuery.docs[0];
        const updateData = {
            totalMarketCap: parseMarketCap(marketCapRecord['Total Market Cap (In Crores)']),
            freeFloatMarketCap: parseMarketCap(marketCapRecord['Free Float Market Cap (In Crores)']),
            marketCapCategory: getMarketCapCategory(parseMarketCap(marketCapRecord['Total Market Cap (In Crores)'])),
            marketCapStatus: marketCapRecord['Status'] || '',
            marketCapUpdatedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        await stockDoc.ref.update(updateData);
        
        console.log(`✅ Manually updated ${symbol} with market cap data from "${marketCapDataCompanyName}"`);
        
    } catch (error) {
        console.error(`❌ Error in manual match:`, error);
    }
}

// Run if called directly
if (require.main === module) {
    console.log('Market Cap Update Utility');
    console.log('========================\n');
    
    const args = process.argv.slice(2);
    
    if (args[0] === 'manual' && args[1] && args[2]) {
        // Manual matching: npm run update-market-cap manual RELIANCE "Reliance Industries Limited"
        manualMatch(args[1], args[2]);
    } else {
        // Automatic matching
        updateStocksMarketCap();
    }
}

module.exports = { updateStocksMarketCap, manualMatch };