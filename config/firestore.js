const { Firestore } = require('@google-cloud/firestore');

// Initialize Firestore
const firestore = new Firestore({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'your-project-id',
});

// Collection names
const COLLECTIONS = {
  WEBHOOKS: 'webhooks',
  WEBHOOK_DATA: 'webhook_data',
  STOCK_SUCCESS: 'stock_success',
  STOCKS: 'stocks',
  PREOPEN_DATA: 'preopen_data',
  FINANCIAL_CALENDAR: 'financial_calendar', // Add this line
  STOCK_NEWS: 'stock_news', // New collection for stock news
  TOP_STOCKS_BY_SECTOR: 'top_stocks_by_sector',
  TOP_STOCKS_BY_INDUSTRY: 'top_stocks_by_industry',
};

module.exports = {
  firestore,
  COLLECTIONS
};