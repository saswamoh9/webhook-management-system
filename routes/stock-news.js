// routes/stock-news.js - Simplified for Individual Stock News Fetching
const express = require('express');
const router = express.Router();
const axios = require('axios');
const moment = require('moment-timezone');

// Import simplified configuration
const { 
  firestore, 
  COLLECTIONS, 
  NEWS_CATEGORIES, 
  SENTIMENT_TYPES,
  GapNewsHelpers 
} = require('../config/firestore');

// AI API configuration
const GROK_API_KEY = process.env.GROK_API_KEY;
const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';

// ============================================
// TEST GROK API CONNECTION
// ============================================
router.get('/test-grok', async (req, res) => {
  try {
    if (!GROK_API_KEY) {
      return res.status(400).json({
        success: false,
        error: 'Grok API key not configured'
      });
    }

    console.log('🧪 Testing Grok API connection...');

    const testResponse = await axios.post(
      GROK_API_URL,
      {
        messages: [
          {
            role: 'user',
            content: 'Reply with just "API connection successful" and nothing else.'
          }
        ],
        model: 'grok-4',
        stream: false
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROK_API_KEY}`
        },
        timeout: 30000
      }
    );

    const content = testResponse.data.choices[0].message.content.trim();
    
    res.json({
      success: true,
      message: 'Grok API connection successful',
      response: content,
      model: testResponse.data.model,
      usage: testResponse.data.usage
    });

  } catch (error) {
    console.error('🔥 Grok API test failed:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Grok API test failed',
      details: error.response?.data || error.message
    });
  }
});

// ============================================
// HEALTH CHECK
// ============================================
router.get('/health', async (req, res) => {
  try {
    res.json({ 
      success: true, 
      message: 'Stock News API - Simple Gap News Fetching',
      hasGrokKey: !!GROK_API_KEY,
      grokModel: 'grok-4',
      endpoints: [
        'GET /test-grok - Test Grok API connection',
        'POST /fetch-stock-news - Fetch news for single stock', 
        'POST /fetch-gap-news-batch - Fetch news for multiple stocks',
        'GET /gap-news/:symbol/:date - Get existing news',
        'GET /gap-news-date/:date - Get all news for date'
      ],
      version: '4.0.0-simplified'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// FETCH NEWS FOR SINGLE STOCK
// ============================================
router.post('/fetch-stock-news', async (req, res) => {
  try {
    const { symbol, gapPercent, gapType, date, companyName, sector } = req.body;
    
    if (!symbol || !gapPercent || !date) {
      return res.status(400).json({
        success: false,
        error: 'Symbol, gapPercent, and date are required'
      });
    }

    if (!GROK_API_KEY) {
      return res.status(400).json({
        success: false,
        error: 'Grok API key not configured'
      });
    }

    console.log(`📰 Fetching news for ${symbol} (${gapPercent}% gap)`);

    // Check if news already exists
    const existingNews = await GapNewsHelpers.getGapNewsForStock(symbol, date);
    if (existingNews) {
      console.log(`📋 News already exists for ${symbol}`);
      return res.json({
        success: true,
        data: existingNews,
        cached: true
      });
    }

    // Create prompt for single stock
    const prompt = createSingleStockPrompt(symbol, gapPercent, gapType, companyName, sector, date);
    
    // Call Grok AI
    const aiResponse = await callGrokAPI(prompt);
    
    // Create and store news document
    const stockData = { symbol, gapPercent, gapType, date, companyName, sector };
    const gapNewsDoc = GapNewsHelpers.createGapNewsDocument(stockData, aiResponse);
    
    await GapNewsHelpers.storeGapNews(gapNewsDoc);
    
    console.log(`✅ News fetched and stored for ${symbol}`);
    
    res.json({
      success: true,
      data: gapNewsDoc,
      cached: false
    });
    
  } catch (error) {
    console.error('Error fetching stock news:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================
// BATCH FETCH NEWS FOR MULTIPLE STOCKS
// ============================================
router.post('/fetch-gap-news-batch', async (req, res) => {
  const { stocks, date } = req.body;
  
  if (!stocks || !Array.isArray(stocks) || stocks.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Stocks array is required'
    });
  }

  if (!GROK_API_KEY) {
    return res.status(400).json({
      success: false,
      error: 'Grok API key not configured'
    });
  }

  console.log(`📰 Starting batch news fetch for ${stocks.length} stocks`);

  // Set up SSE response for real-time updates
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  const sendUpdate = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const results = [];
    const startTime = Date.now();

    sendUpdate({
      type: 'start',
      message: `Starting news fetch for ${stocks.length} gap stocks...`,
      total: stocks.length
    });

    // Process stocks one by one
    for (let i = 0; i < stocks.length; i++) {
      const stock = stocks[i];
      
      try {
        sendUpdate({
          type: 'progress',
          message: `Fetching news for ${stock.symbol} (${i + 1}/${stocks.length})...`,
          current: i + 1,
          total: stocks.length,
          symbol: stock.symbol
        });

        // Check if news already exists
        const existingNews = await GapNewsHelpers.getGapNewsForStock(stock.symbol, date);
        
        if (existingNews) {
          console.log(`📋 Using cached news for ${stock.symbol}`);
          results.push({ symbol: stock.symbol, success: true, cached: true, data: existingNews });
          
          sendUpdate({
            type: 'stock_complete',
            symbol: stock.symbol,
            status: 'cached',
            message: `News already available for ${stock.symbol}`
          });
        } else {
          // Fetch new news
          const prompt = createSingleStockPrompt(
            stock.symbol, 
            stock.gap, 
            stock.gapType, 
            stock.companyName || stock.symbol,
            stock.sector || 'Unknown',
            date
          );
          
          const aiResponse = await callGrokAPI(prompt);
          
          // Store the news
          const stockData = { 
            symbol: stock.symbol, 
            gapPercent: stock.gap, 
            gapType: stock.gapType, 
            date,
            companyName: stock.companyName || stock.symbol,
            sector: stock.sector || 'Unknown'
          };
          const gapNewsDoc = GapNewsHelpers.createGapNewsDocument(stockData, aiResponse);
          
          await GapNewsHelpers.storeGapNews(gapNewsDoc);
          
          results.push({ symbol: stock.symbol, success: true, cached: false, data: gapNewsDoc });
          
          sendUpdate({
            type: 'stock_complete',
            symbol: stock.symbol,
            status: 'fetched',
            message: `News fetched for ${stock.symbol}`,
            headline: aiResponse.headline
          });
          
          console.log(`✅ News fetched for ${stock.symbol}: ${aiResponse.headline}`);
        }

        // Small delay between requests to avoid rate limiting
        if (i < stocks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`❌ Error fetching news for ${stock.symbol}:`, error);
        results.push({ symbol: stock.symbol, success: false, error: error.message });
        
        sendUpdate({
          type: 'stock_error',
          symbol: stock.symbol,
          message: `Error fetching news for ${stock.symbol}: ${error.message}`
        });
      }
    }

    const duration = Math.floor((Date.now() - startTime) / 1000);
    const successCount = results.filter(r => r.success).length;
    
    sendUpdate({
      type: 'complete',
      message: `News fetch completed! ${successCount}/${stocks.length} successful`,
      results: results,
      duration: `${duration}s`,
      summary: {
        total: stocks.length,
        successful: successCount,
        cached: results.filter(r => r.cached).length,
        errors: results.filter(r => !r.success).length
      }
    });

    console.log(`🎉 Batch news fetch completed: ${successCount}/${stocks.length} successful in ${duration}s`);

  } catch (error) {
    console.error('❌ Batch fetch error:', error);
    sendUpdate({
      type: 'error',
      message: `Batch fetch failed: ${error.message}`
    });
  }

  res.end();
});

// ============================================
// GET NEWS FOR SINGLE STOCK
// ============================================
router.get('/gap-news/:symbol/:date', async (req, res) => {
  try {
    const { symbol, date } = req.params;
    const gapNews = await GapNewsHelpers.getGapNewsForStock(symbol, date);
    
    if (!gapNews) {
      return res.status(404).json({
        success: false,
        error: `No gap news found for ${symbol} on ${date}`
      });
    }
    
    res.json({
      success: true,
      data: gapNews
    });
    
  } catch (error) {
    console.error('Get gap news error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// GET ALL GAP NEWS FOR DATE
// ============================================
router.get('/gap-news-date/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const gapNews = await GapNewsHelpers.getGapNewsByDate(date);
    
    res.json({
      success: true,
      data: gapNews,
      count: gapNews.length
    });
    
  } catch (error) {
    console.error('Get gap news by date error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function createSingleStockPrompt(symbol, gapPercent, gapType, companyName, sector, date) {
  return `
Analyze why this Indian stock is gapping in preopen trading on ${date}:

Stock: ${symbol} (${companyName})
Gap: ${gapPercent > 0 ? '+' : ''}${gapPercent}% (${gapType})
Sector: ${sector}

Search for specific news from past 24 hours that could explain this gap:

1. EARNINGS/RESULTS: Quarterly results, guidance updates
2. ORDERS: Major order wins/losses (>₹100 Cr)  
3. MANAGEMENT: Management changes, appointments
4. REGULATORY: SEBI actions, regulatory approvals/penalties
5. BLOCK_DEALS: Large block/bulk transactions (>₹50 Cr)
6. SECTOR NEWS: Sector-specific developments affecting this stock
7. TECHNICAL: Major breakouts/breakdowns with fundamental backing

IMPORTANT: Only provide reasons based on actual verifiable news. If no specific news found, state "No specific news identified" and explain likely technical/sector reasons.

Format as JSON:
{
  "headline": "Brief news headline if found, otherwise 'No specific news identified'",
  "reason": "Specific reason for gap in 1-2 sentences",
  "newsCategory": "EARNINGS/ORDERS/MANAGEMENT/REGULATORY/BLOCK_DEAL/SECTOR/TECHNICAL/NO_NEWS",
  "sentiment": "Bullish/Bearish/Neutral",
  "confidence": "High/Medium/Low",
  "priceAction": "Continue/Reversal/Monitor",
  "details": "Additional context if any"
}`;
}

async function callGrokAPI(prompt) {
  const requestStartTime = Date.now();
  
  try {
    const response = await axios.post(
      GROK_API_URL,
      {
        messages: [
          {
            role: 'user',
            content: `You are an Indian stock market analyst. Provide factual, concise analysis based only on verifiable news. Always return valid JSON format.

${prompt}`
          }
        ],
        model: 'grok-4',
        stream: false
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROK_API_KEY}`
        },
        timeout: 60000
      }
    );
    
    const content = response.data.choices[0].message.content.trim();
    const parsedResponse = parseJSON(content);
    
    console.log(`🤖 Grok API call successful (${Date.now() - requestStartTime}ms)`);
    console.log(`📊 Token usage: ${response.data.usage?.total_tokens || 'N/A'} total tokens`);
    
    return parsedResponse;
    
  } catch (error) {
    console.error('🔥 Grok API Error:', error.message);
    
    // Return fallback response
    return {
      headline: 'Error fetching news',
      reason: 'Unable to fetch news due to API error',
      newsCategory: NEWS_CATEGORIES.NO_NEWS,
      sentiment: SENTIMENT_TYPES.NEUTRAL,
      confidence: 'Low',
      priceAction: 'Monitor',
      details: 'API error occurred during news fetch'
    };
  }
}

function parseJSON(content) {
  try {
    // Clean the content
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    return JSON.parse(cleanContent);
  } catch (error) {
    // Try to extract JSON from content
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        // Fallback response
        return {
          headline: 'Unable to parse AI response',
          reason: 'Technical gap - no specific news identified',
          newsCategory: NEWS_CATEGORIES.TECHNICAL,
          sentiment: SENTIMENT_TYPES.NEUTRAL,
          confidence: 'Low',
          priceAction: 'Monitor',
          details: 'JSON parsing error'
        };
      }
    }
    
    // Final fallback
    return {
      headline: 'No specific news identified',
      reason: 'Technical gap or sector movement',
      newsCategory: NEWS_CATEGORIES.NO_NEWS,
      sentiment: SENTIMENT_TYPES.NEUTRAL,
      confidence: 'Low',
      priceAction: 'Monitor',
      details: 'No verifiable news found'
    };
  }
}

module.exports = router;