// Script to initialize Firestore collections
const { firestore, COLLECTIONS } = require('../config/firestore');
const { v4: uuidv4 } = require('uuid');

async function initializeCollections() {
  console.log('Initializing Firestore collections...');
  
  try {
    // Initialize market indices
    const indicesSnapshot = await firestore.collection(COLLECTIONS.MARKET_INDICES).limit(1).get();
    
    if (indicesSnapshot.empty) {
      console.log('Creating default market indices...');
      
      // Create default broad indices
      const broadIndices = ['NIFTY', 'SENSEX', 'BANK NIFTY', 'NIFTY MIDCAP', 'NIFTY SMALLCAP'];
      for (const name of broadIndices) {
        const indexId = uuidv4();
        await firestore.collection(COLLECTIONS.MARKET_INDICES).doc(indexId).set({
          id: indexId,
          type: 'BROAD',
          name,
          active: true,
          createdAt: new Date().toISOString()
        });
        console.log(`Created broad index: ${name}`);
      }
      
      // Create default sector indices
      const sectorIndices = ['AUTO', 'BANKING', 'FMCG', 'IT', 'METAL', 'PHARMA', 'REALTY', 'ENERGY', 'FINANCE', 'MEDIA'];
      for (const name of sectorIndices) {
        const indexId = uuidv4();
        await firestore.collection(COLLECTIONS.MARKET_INDICES).doc(indexId).set({
          id: indexId,
          type: 'SECTOR',
          name,
          active: true,
          createdAt: new Date().toISOString()
        });
        console.log(`Created sector index: ${name}`);
      }
    } else {
      console.log('Market indices already exist');
    }
    
    // Create dummy documents for other collections to ensure they exist
    const collections = [
      { name: COLLECTIONS.MARKET_CONDITIONS, dummy: { initialized: true, date: '2000-01-01' } },
      { name: COLLECTIONS.STOCK_SUCCESS, dummy: { initialized: true, id: 'dummy' } },
      { name: COLLECTIONS.STOCKS, dummy: { initialized: true, symbol: 'DUMMY', companyName: 'Dummy Company' } } // Added stocks collection
    ];
    
    for (const { name, dummy } of collections) {
      const snapshot = await firestore.collection(name).limit(1).get();
      if (snapshot.empty) {
        await firestore.collection(name).doc('_init').set(dummy);
        console.log(`Initialized collection: ${name}`);
      }
    }
    
    console.log('Collections initialized successfully!');
    console.log('\nNext steps:');
    console.log('1. Place your stocks_with_industry.csv file in the project root');
    console.log('2. Run: npm run import-stocks');
    
    process.exit(0);
  } catch (error) {
    console.error('Error initializing collections:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initializeCollections();
}

module.exports = { initializeCollections };