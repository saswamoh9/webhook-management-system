// server.js - Updated with Stock News Routes
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware - Increased limits for enhanced pre-open data
app.use(cors());
app.use(express.json({ limit: '2mb' })); // Increased from 50mb to handle enhanced data
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Import routes
const webhooksRoutes = require('./routes/webhooks');
const stocksRoutes = require('./routes/stocks');
const preopenRoutes = require('./routes/preopen'); // New pre-open routes
const financialCalendarRoutes = require('./routes/financial-calendar');
const stockNewsRoutes = require('./routes/stock-news'); // New stock news routes
const intradayAnalysisRoutes = require('./routes/intraday-analysis'); // New intraday analysis routes

// API Routes
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/stocks', stocksRoutes);
app.use('/api/preopen', preopenRoutes); // New pre-open API
app.use('/api/financial-calendar', financialCalendarRoutes);
app.use('/api/stock-news', stockNewsRoutes); // New stock news API
app.use('/api/intraday-analysis', intradayAnalysisRoutes); // New intraday analysis API

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Webhook Management System is running',
    timestamp: new Date().toISOString(),
    features: [
      'Webhook Management',
      'Stock Management',
      'Enhanced Pre-Open Data Storage',
      'Financial Results Calendar',
      'Stock News Analysis with AI',
      'Intraday Sector/Industry Analysis' // Add this line
    ]
  });
});

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    message: err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Route not found' 
  });
});

// Start server
// Start server
app.listen(PORT, () => {
  console.log(`🚀 Webhook Management System running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔍 Health Check: http://localhost:${PORT}/health`);
  console.log(`📡 Pre-Open API: http://localhost:${PORT}/api/preopen/health`);
  console.log(`📰 Stock News API: http://localhost:${PORT}/api/stock-news/health`);
  console.log(`📈 Intraday Analysis API: http://localhost:${PORT}/api/intraday-analysis/health`);
  console.log('\n🎯 Pre-Open Data Storage Features:');
  console.log('   - Enhanced data reception from NSE collector');
  console.log('   - Automatic duplicate removal');
  console.log('   - Daily data storage with spread analysis');
  console.log('   - Historical data tracking');
  console.log('   - Automatic cleanup (30-day retention)');
  console.log('\n📰 Stock News Features:');
  console.log('   - AI-powered news analysis with Grok');
  console.log('   - Sentiment classification (Bullish/Bearish/Neutral)');
  console.log('   - Duplicate news detection');
  console.log('   - Sector-wise sentiment analysis');
  console.log('   - Historical news tracking');
  console.log('\n📈 Intraday Analysis Features:');
  console.log('   - Sector/Industry Advance Decline Ratio');
  console.log('   - Volume Analysis with 20-day comparison');
  console.log('   - Historical analysis storage by date');
  console.log('   - Date-based filtering and retrieval');
  console.log('   - Automatic pre-open data integration');
  console.log('\n⚡ Ready to receive enhanced NSE pre-open data!');
});

module.exports = app;