// config/firestore.js - Simplified for Gap News Storage Only
const { Firestore } = require('@google-cloud/firestore');

// Initialize Firestore
const firestore = new Firestore({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'your-project-id',
});

// Collection names - Keep existing + simple gap news
const COLLECTIONS = {
  // Existing Collections (keep all your existing ones)
  WEBHOOKS: 'webhooks',
  WEBHOOK_DATA: 'webhook_data',
  STOCK_SUCCESS: 'stock_success',
  STOCKS: 'stocks',
  PREOPEN_DATA: 'preopen_data',
  FINANCIAL_CALENDAR: 'financial_calendar',
  TOP_STOCKS_BY_SECTOR: 'top_stocks_by_sector',
  TOP_STOCKS_BY_INDUSTRY: 'top_stocks_by_industry',
  INTRADAY_ANALYSIS: 'intraday_analysis',
  DELIVERY_VOLUME_DATA: 'delivery_volume_data',
  
  // Simple Gap News Collection
  GAP_NEWS: 'gap_news' // Just one collection for gap news
};

// Simple news categories
const NEWS_CATEGORIES = {
  EARNINGS: 'EARNINGS',
  ORDERS: 'ORDERS',
  MANAGEMENT: 'MANAGEMENT',
  REGULATORY: 'REGULATORY',
  SECTOR: 'SECTOR',
  BLOCK_DEAL: 'BLOCK_DEAL',
  TECHNICAL: 'TECHNICAL',
  NO_NEWS: 'NO_NEWS'
};

// Sentiment types
const SENTIMENT_TYPES = {
  BULLISH: 'Bullish',
  BEARISH: 'Bearish', 
  NEUTRAL: 'Neutral'
};

// Simple helper functions
const GapNewsHelpers = {
  
  // Create simple gap news document
  createGapNewsDocument(stockData, newsData) {
    const now = new Date();
    return {
      id: require('uuid').v4(),
      
      // Stock info
      symbol: stockData.symbol?.toUpperCase(),
      companyName: stockData.companyName || stockData.symbol,
      gapPercent: stockData.gapPercent || 0,
      gapType: stockData.gapType || 'Unknown',
      
      // News info from AI
      headline: newsData.headline || 'No specific news found',
      reason: newsData.reason || 'Technical gap or sector movement',
      newsCategory: newsData.newsCategory || NEWS_CATEGORIES.NO_NEWS,
      sentiment: newsData.sentiment || SENTIMENT_TYPES.NEUTRAL,
      confidence: newsData.confidence || 'Medium',
      priceAction: newsData.priceAction || 'Monitor',
      
      // Metadata
      date: stockData.date,
      timestamp: now.toISOString(),
      source: 'Grok AI',
      status: 'ACTIVE',
      createdAt: now
    };
  },
  
  // Get gap news for specific stock
  async getGapNewsForStock(symbol, date) {
    const query = firestore.collection(COLLECTIONS.GAP_NEWS)
      .where('symbol', '==', symbol.toUpperCase())
      .where('date', '==', date)
      .limit(1);
    
    const snapshot = await query.get();
    return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  },
  
  // Store gap news
  async storeGapNews(gapNewsDoc) {
    await firestore.collection(COLLECTIONS.GAP_NEWS).add(gapNewsDoc);
  },
  
  // Get all gap news for date
  async getGapNewsByDate(date) {
    const query = firestore.collection(COLLECTIONS.GAP_NEWS)
      .where('date', '==', date)
      .orderBy('timestamp', 'desc');
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
};

module.exports = {
  firestore,
  COLLECTIONS,
  NEWS_CATEGORIES,
  SENTIMENT_TYPES,
  GapNewsHelpers
};
