// scripts/debug-startup.js - Database connection and data debug script
const { firestore, COLLECTIONS, testFirestoreConnection, checkCollections } = require('../config/firestore');

async function runDiagnostics() {
  console.log('🚀 Starting Webhook Management System Diagnostics...\n');
  
  // 1. Test Firestore Connection
  console.log('📊 STEP 1: Testing Firestore Connection');
  console.log('=' .repeat(50));
  
  const connectionOk = await testFirestoreConnection();
  if (!connectionOk) {
    console.log('❌ Firestore connection failed. Check your credentials and project ID.');
    process.exit(1);
  }
  
  // 2. Check Collections
  console.log('\n📁 STEP 2: Checking Collections');
  console.log('=' .repeat(50));
  await checkCollections();
  
  // 3. Check Environment Variables
  console.log('\n🔧 STEP 3: Environment Variables');
  console.log('=' .repeat(50));
  console.log(`GOOGLE_CLOUD_PROJECT: ${process.env.GOOGLE_CLOUD_PROJECT || '❌ Not set'}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`PORT: ${process.env.PORT || '8080'}`);
  
  // 4. Test Pre-open Data Specifically
  console.log('\n📈 STEP 4: Pre-open Data Analysis');
  console.log('=' .repeat(50));
  await checkPreopenData();
  
  // 5. Create Sample Data if Empty
  console.log('\n🎯 STEP 5: Sample Data Creation');
  console.log('=' .repeat(50));
  await createSampleDataIfNeeded();
  
  console.log('\n✅ Diagnostics completed!');
  console.log('\n🌐 You can now start your server and visit:');
  console.log(`   - Main App: http://localhost:${process.env.PORT || 8080}`);
  console.log(`   - Health Check: http://localhost:${process.env.PORT || 8080}/health`);
  console.log(`   - Pre-open Debug: http://localhost:${process.env.PORT || 8080}/api/preopen/debug`);
}

async function checkPreopenData() {
  try {
    // Check pre-open data collection
    const preopenSnapshot = await firestore.collection(COLLECTIONS.PREOPEN_DATA).limit(5).get();
    console.log(`📊 Pre-open data documents: ${preopenSnapshot.size}`);
    
    if (preopenSnapshot.size > 0) {
      console.log('📋 Recent pre-open data:');
      preopenSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`   ${index + 1}. Date: ${data.date}, Stocks: ${data.data?.length || 'N/A'}, Format: ${data.dataFormat || 'legacy'}`);
      });
    } else {
      console.log('⚠️  No pre-open data found');
    }
    
    // Check specific date that was failing
    const failingDate = '2025-07-29';
    const specificSnapshot = await firestore.collection(COLLECTIONS.PREOPEN_DATA)
      .where('date', '==', failingDate)
      .get();
    
    console.log(`🔍 Data for ${failingDate}: ${specificSnapshot.size} documents`);
    
  } catch (error) {
    console.error('❌ Error checking pre-open data:', error);
  }
}

async function createSampleDataIfNeeded() {
  try {
    // Check if we have any webhook data
    const webhookSnapshot = await firestore.collection(COLLECTIONS.WEBHOOKS).limit(1).get();
    
    if (webhookSnapshot.empty) {
      console.log('🎯 Creating sample webhook...');
      await createSampleWebhook();
    } else {
      console.log('✅ Webhooks exist');
    }
    
    // Check if we have pre-open data for today
    const today = new Date().toISOString().split('T')[0];
    const todaySnapshot = await firestore.collection(COLLECTIONS.PREOPEN_DATA)
      .where('date', '==', today)
      .get();
    
    if (todaySnapshot.empty) {
      console.log('🎯 Creating sample pre-open data for today...');
      await createSamplePreopenData(today);
    } else {
      console.log('✅ Today\'s pre-open data exists');
    }
    
    // Create data for the failing date
    const failingDate = '2025-07-29';
    const failingSnapshot = await firestore.collection(COLLECTIONS.PREOPEN_DATA)
      .where('date', '==', failingDate)
      .get();
    
    if (failingSnapshot.empty) {
      console.log(`🎯 Creating sample pre-open data for ${failingDate}...`);
      await createSamplePreopenData(failingDate);
    } else {
      console.log(`✅ Pre-open data for ${failingDate} exists`);
    }
    
  } catch (error) {
    console.error('❌ Error creating sample data:', error);
  }
}

async function createSampleWebhook() {
  const sampleWebhook = {
    id: 'sample-webhook-001',
    name: 'Sample CPR Breakout',
    stockSet: 'NIFTY_500',
    tags: ['cpr', 'breakout', 'sample'],
    possibleOutput: 'CPR breakout detected - Consider buying on pullback',
    description: 'Sample webhook for CPR breakout strategy',
    webhookUrl: 'https://webhook-management-system.com/webhook/sample-webhook-001',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  await firestore.collection(COLLECTIONS.WEBHOOKS).doc(sampleWebhook.id).set(sampleWebhook);
  console.log('✅ Sample webhook created');
}

async function createSamplePreopenData(date) {
  const sampleStocks = [
    {
      symbol: 'RELIANCE',
      metadata: {
        symbol: 'RELIANCE',
        lastPrice: 2850.50,
        pChange: 1.25,
        previousClose: 2815.25,
        finalQuantity: 125000,
        totalTurnover: 356000000
      },
      detail: {
        preOpenMarket: {
          totalBuyQuantity: 75000,
          totalSellQuantity: 50000,
          preopen: [
            { price: 2850, buyQty: 25000, sellQty: 0 },
            { price: 2855, buyQty: 0, sellQty: 15000 }
          ]
        }
      }
    },
    {
      symbol: 'TCS',
      metadata: {
        symbol: 'TCS',
        lastPrice: 4125.75,
        pChange: -0.85,
        previousClose: 4161.25,
        finalQuantity: 89000,
        totalTurnover: 367000000
      },
      detail: {
        preOpenMarket: {
          totalBuyQuantity: 40000,
          totalSellQuantity: 65000,
          preopen: [
            { price: 4125, buyQty: 20000, sellQty: 0 },
            { price: 4120, buyQty: 0, sellQty: 25000 }
          ]
        }
      }
    },
    {
      symbol: 'HDFCBANK',
      metadata: {
        symbol: 'HDFCBANK',
        lastPrice: 1675.30,
        pChange: 0.45,
        previousClose: 1667.75,
        finalQuantity: 156000,
        totalTurnover: 261000000
      },
      detail: {
        preOpenMarket: {
          totalBuyQuantity: 85000,
          totalSellQuantity: 71000,
          preopen: [
            { price: 1675, buyQty: 35000, sellQty: 0 },
            { price: 1680, buyQty: 0, sellQty: 20000 }
          ]
        }
      }
    },
    {
      symbol: 'INFY',
      metadata: {
        symbol: 'INFY',
        lastPrice: 1789.60,
        pChange: 2.15,
        previousClose: 1752.10,
        finalQuantity: 98000,
        totalTurnover: 175000000
      },
      detail: {
        preOpenMarket: {
          totalBuyQuantity: 60000,
          totalSellQuantity: 38000,
          preopen: [
            { price: 1789, buyQty: 30000, sellQty: 0 },
            { price: 1795, buyQty: 0, sellQty: 15000 }
          ]
        }
      }
    },
    {
      symbol: 'ICICIBANK',
      metadata: {
        symbol: 'ICICIBANK',
        lastPrice: 1245.80,
        pChange: -1.35,
        previousClose: 1262.85,
        finalQuantity: 142000,
        totalTurnover: 177000000
      },
      detail: {
        preOpenMarket: {
          totalBuyQuantity: 65000,
          totalSellQuantity: 87000,
          preopen: [
            { price: 1245, buyQty: 25000, sellQty: 0 },
            { price: 1240, buyQty: 0, sellQty: 30000 }
          ]
        }
      }
    }
  ];
  
  const docId = `preopen_${date}_sample`;
  const docData = {
    date,
    data: sampleStocks,
    timestamp: new Date().toISOString(),
    dataFormat: 'legacy',
    createdAt: new Date(),
    filteredCount: sampleStocks.length,
    source: 'sample_data_creation'
  };
  
  await firestore.collection(COLLECTIONS.PREOPEN_DATA).doc(docId).set(docData);
  console.log(`✅ Sample pre-open data created for ${date}`);
}

// Run diagnostics if this script is executed directly
if (require.main === module) {
  runDiagnostics().catch(error => {
    console.error('❌ Diagnostics failed:', error);
    process.exit(1);
  });
}

module.exports = { runDiagnostics };