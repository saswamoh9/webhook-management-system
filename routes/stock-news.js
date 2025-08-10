const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const moment = require('moment-timezone');
const { firestore, COLLECTIONS } = require('../config/firestore');

// Grok AI configuration
const GROK_API_KEY = process.env.GROK_API_KEY;
const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';
const GROK_MODEL = process.env.GROK_MODEL || 'grok-4-0709'; // Using Grok 4.0 as requested

// Test endpoint
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Stock News API is working',
    hasApiKey: !!GROK_API_KEY,
    model: GROK_MODEL
  });
});

// 8:00 AM - Morning Market Analysis
router.post('/morning-analysis', async (req, res) => {
  try {
    if (!GROK_API_KEY) {
      return res.status(400).json({ 
        success: false, 
        error: 'Grok API key not configured. Please set GROK_API_KEY in environment variables.' 
      });
    }

    const analysisDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
    console.log(`📰 Running morning analysis for ${analysisDate}`);
    
    // Step 1: General Market & Sector Analysis
    const marketPrompt = `
    Analyze Indian stock market for ${analysisDate}:
    
    1. GLOBAL CUES:
       - US markets overnight (DOW, NASDAQ, S&P)
       - Asian markets morning (Nikkei, Hang Seng, Shanghai)
       - Commodity trends (Crude Oil, Gold, Silver)
       - Dollar index & INR movement
       - FII/DII data if available
    
    2. SECTOR ANALYSIS for each major sector:
       - IT, Banking, Auto, Pharma, FMCG, Metal, Realty, Energy, Infrastructure, Telecom
       - Sentiment: Bullish/Bearish/Neutral
       - Key news/events affecting sector
       - Expected impact level (High/Medium/Low)
       - Top 5 stocks to watch in each sector
    
    3. MAJOR EVENTS:
       - Government policy announcements
       - RBI/SEBI regulations
       - International events affecting India
       - Major corporate actions (results, mergers, etc.)
       - Economic data releases
    
    4. KEY RISKS:
       - Geopolitical risks
       - Market risks
       - Sector-specific risks
    
    Format as JSON with structure:
    {
      "marketSentiment": "Bullish/Bearish/Neutral",
      "marketOutlook": "Brief 50-word outlook",
      "keyEvents": [{"event": "", "impact": "", "affectedSectors": []}],
      "globalCues": {
        "usMarkets": {"sentiment": "", "keyPoints": ""},
        "asianMarkets": {"sentiment": "", "keyPoints": ""},
        "commodities": {"crude": "", "gold": "", "trend": ""},
        "currency": {"usdInr": "", "movement": ""}
      },
      "sectorAnalysis": {
        "IT": { 
          "sentiment": "Bullish/Bearish/Neutral", 
          "events": [""], 
          "impact": "High/Medium/Low", 
          "topStocks": ["SYMBOL1", "SYMBOL2"], 
          "keyNews": ""
        }
      },
      "risks": [{"type": "", "description": "", "severity": ""}],
      "recommendations": [""]
    }`;
    
    // Call Grok API
    const marketAnalysis = await callGrokAPI(marketPrompt, 'grok-4-0709');
    
    // Store market analysis
    const analysisId = uuidv4();
    await firestore.collection(COLLECTIONS.STOCK_NEWS).doc(analysisId).set({
      id: analysisId,
      type: 'MARKET_ANALYSIS',
      date: analysisDate,
      timestamp: new Date().toISOString(),
      data: marketAnalysis.data,
      createdAt: new Date()
    });
    
    // Step 2: Fetch news for top stocks from bullish sectors
    const bullishSectors = Object.entries(marketAnalysis.data.sectorAnalysis)
      .filter(([_, data]) => data.sentiment === 'Bullish')
      .map(([sector, data]) => ({ sector, topStocks: data.topStocks }));
    
    await fetchSectorLeaderNews(bullishSectors, analysisDate);
    
    res.json({ 
      success: true, 
      message: 'Morning analysis completed',
      data: {
        analysisId,
        marketSentiment: marketAnalysis.data.marketSentiment,
        sectorsAnalyzed: Object.keys(marketAnalysis.data.sectorAnalysis).length,
        bullishSectors: bullishSectors.length
      }
    });
    
  } catch (error) {
    console.error('❌ Error in morning analysis:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.response?.data || 'Unknown error'
    });
  }
});

// Gap Analysis Integration (9:00-9:15 AM)
router.post('/gap-analysis', async (req, res) => {
  try {
    const analysisDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
    console.log(`📊 Running gap analysis for ${analysisDate}`);
    
    // Fetch preopen data
    const preopenResponse = await fetch(`http://localhost:${process.env.PORT || 8080}/api/preopen/analysis/gaps/${analysisDate}`);
    const preopenData = await preopenResponse.json();
    
    if (!preopenData.success) {
      return res.status(400).json({ 
        success: false, 
        error: 'No preopen data available for gap analysis' 
      });
    }
    
    // Get stock details from Firestore for sector/industry mapping
    const stocksSnapshot = await firestore.collection(COLLECTIONS.STOCKS).get();
    const stockMap = new Map();
    
    stocksSnapshot.forEach(doc => {
      const stock = doc.data();
      stockMap.set(stock.symbol, {
        companyName: stock.companyName,
        sector: stock.sector,
        industry: stock.industry
      });
    });
    
    // Combine all significant gap stocks
    const significantGaps = [
      ...preopenData.data.strongGapUp.map(s => ({ ...s, gapType: 'STRONG_UP' })),
      ...preopenData.data.strongGapDown.map(s => ({ ...s, gapType: 'STRONG_DOWN' })),
      ...preopenData.data.moderateGap.filter(s => Math.abs(s.gap) > 1.5).map(s => ({ 
        ...s, 
        gapType: s.gap > 0 ? 'MODERATE_UP' : 'MODERATE_DOWN' 
      }))
    ];
    
    // Process in batches
    const batchSize = 10;
    const results = [];
    
    for (let i = 0; i < significantGaps.length; i += batchSize) {
      const batch = significantGaps.slice(i, i + batchSize);
      
      // Enrich with stock details
      const enrichedBatch = batch.map(stock => {
        const details = stockMap.get(stock.symbol) || {};
        return {
          ...stock,
          companyName: details.companyName || stock.symbol,
          sector: details.sector || 'Unknown',
          industry: details.industry || 'Unknown'
        };
      });
      
      const gapPrompt = `
      Analyze why these stocks are gapping in pre-market trading:
      
      ${enrichedBatch.map(stock => `
      ${stock.symbol} (${stock.companyName}):
      - Gap: ${stock.gap > 0 ? '+' : ''}${stock.gap}%
      - Type: ${stock.gapType}
      - Sector: ${stock.sector}
      - Pre-open Price: ₹${stock.open}
      `).join('\n')}
      
      For each stock, provide:
      1. PRIMARY REASON for gap (be specific - earnings, news, orders, block deals, sector movement)
      2. If company-specific news exists, mention it
      3. If no specific news, relate to sector/market sentiment
      4. Confidence level in the reason (High/Medium/Low)
      5. Expected price action (Continue/Reversal/Consolidation)
      6. Key levels to watch
      
      Format as JSON array:
      [{
        "symbol": "",
        "reason": "Specific reason for gap",
        "newsType": "EARNINGS/ORDER/MANAGEMENT/SECTOR/TECHNICAL/BLOCK_DEAL/OTHER",
        "headline": "Brief news headline if any",
        "confidence": "High/Medium/Low",
        "priceAction": "Continue/Reversal/Consolidation",
        "keyLevels": {"support": 0, "resistance": 0},
        "additionalInfo": ""
      }]`;
      
      const response = await callGrokAPI(gapPrompt, 'grok-4-0709');
      
      // Store gap analysis results
      for (const gapStock of response.data) {
        const newsId = uuidv4();
        const stockInfo = enrichedBatch.find(s => s.symbol === gapStock.symbol);
        
        await firestore.collection(COLLECTIONS.STOCK_NEWS).doc(newsId).set({
          id: newsId,
          type: 'GAP_ANALYSIS',
          symbol: gapStock.symbol,
          companyName: stockInfo?.companyName || '',
          sector: stockInfo?.sector || '',
          industry: stockInfo?.industry || '',
          gapPercent: stockInfo?.gap || 0,
          gapType: stockInfo?.gapType || '',
          reason: gapStock.reason,
          newsType: gapStock.newsType,
          headline: gapStock.headline,
          confidence: gapStock.confidence,
          priceAction: gapStock.priceAction,
          keyLevels: gapStock.keyLevels,
          additionalInfo: gapStock.additionalInfo,
          date: analysisDate,
          timestamp: new Date().toISOString(),
          createdAt: new Date()
        });
        
        results.push({
          symbol: gapStock.symbol,
          gap: stockInfo?.gap,
          reason: gapStock.reason,
          confidence: gapStock.confidence
        });
      }
    }
    
    res.json({ 
      success: true, 
      message: `Gap analysis completed for ${results.length} stocks`,
      data: {
        totalGaps: significantGaps.length,
        analyzed: results.length,
        strongUps: preopenData.data.strongGapUp.length,
        strongDowns: preopenData.data.strongGapDown.length,
        results: results.slice(0, 20) // Top 20 for response
      }
    });
    
  } catch (error) {
    console.error('❌ Error in gap analysis:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Fetch sector leader news
async function fetchSectorLeaderNews(bullishSectors, date) {
  console.log(`📈 Fetching news for sector leaders from ${bullishSectors.length} bullish sectors`);
  
  for (const { sector, topStocks } of bullishSectors) {
    if (!topStocks || topStocks.length === 0) continue;
    
    // Get stock details
    const stockDetails = [];
    for (const symbol of topStocks.slice(0, 5)) { // Top 5 only
      const stockQuery = await firestore.collection(COLLECTIONS.STOCKS)
        .where('symbol', '==', symbol)
        .limit(1)
        .get();
      
      if (!stockQuery.empty) {
        stockDetails.push(stockQuery.docs[0].data());
      }
    }
    
    if (stockDetails.length === 0) continue;
    
    const prompt = `
    Brief news check for ${sector} sector leaders:
    ${stockDetails.map(s => `${s.symbol} (${s.companyName})`).join(', ')}
    
    For each stock, check for:
    - Recent orders/contracts announcements
    - Quarterly results or guidance
    - Management changes
    - Regulatory approvals
    - Any negative news (penalties, raids, downgrades)
    - Technical breakouts if significant
    
    Keep it concise - max 75 words per stock.
    
    Format as JSON array:
    [{
      "symbol": "",
      "sentiment": "Bullish/Bearish/Neutral",
      "headline": "Brief headline",
      "keyPoint": "Most important point",
      "impact": "High/Medium/Low"
    }]`;
    
    try {
      const response = await callGrokAPI(prompt, 'grok-4-0709');
      
      // Store sector leader news
      for (const news of response.data) {
        const newsId = uuidv4();
        const stockInfo = stockDetails.find(s => s.symbol === news.symbol);
        
        await firestore.collection(COLLECTIONS.STOCK_NEWS).doc(newsId).set({
          id: newsId,
          type: 'SECTOR_LEADER',
          symbol: news.symbol,
          companyName: stockInfo?.companyName || '',
          sector: sector,
          industry: stockInfo?.industry || '',
          sentiment: news.sentiment,
          headline: news.headline,
          keyPoint: news.keyPoint,
          impact: news.impact,
          date: date,
          timestamp: new Date().toISOString(),
          createdAt: new Date()
        });
      }
    } catch (error) {
      console.error(`Error fetching news for ${sector} sector:`, error);
    }
  }
}

// Optimized Grok API caller
async function callGrokAPI(prompt, model = 'grok-4-0709') {
  const maxRetries = 3;
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🤖 Calling Grok API (attempt ${attempt}/${maxRetries})...`);
      
      const response = await axios.post(
        GROK_API_URL,
        {
          model,
          messages: [
            {
              role: 'system',
              content: 'You are a concise Indian stock market analyst. Focus on actionable insights and avoid speculation. Always provide information in the exact JSON format requested.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          stream: false,
          temperature: 0.7,
          max_tokens: 1500
        },
        {
          headers: {
            'Authorization': `Bearer ${GROK_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
      
      if (!response?.data?.choices?.[0]?.message?.content) {
        throw new Error('Invalid response structure from Grok API');
      }
      
      const content = response.data.choices[0].message.content;
      
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Grok response');
      }
      
      const parsedData = JSON.parse(jsonMatch[0]);
      console.log(`✅ Grok API call successful`);
      
      return { data: parsedData };
      
    } catch (error) {
      lastError = error;
      
      if (error.response?.status === 429 && attempt < maxRetries) {
        console.log(`⏳ Rate limit hit, waiting before retry...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        continue;
      }
      
      if (error.response?.status === 404) {
        console.error('Model not found:', error.response.data);
        throw new Error(`Model ${model} not accessible. Please check your API access.`);
      }
      
      if (attempt === maxRetries) {
        console.error('All retry attempts failed:', error.message);
        throw error;
      }
      
      // Wait before retry for other errors
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  
  throw lastError;
}

// Search news by multiple criteria
router.post('/search', async (req, res) => {
  try {
    const { 
      type, // MARKET_ANALYSIS, GAP_ANALYSIS, SECTOR_LEADER
      date,
      symbol,
      sector,
      sentiment,
      gapType,
      newsType
    } = req.body;
    
    let query = firestore.collection(COLLECTIONS.STOCK_NEWS);
    
    if (type) {
      query = query.where('type', '==', type);
    }
    
    if (date) {
      query = query.where('date', '==', date);
    }
    
    if (symbol) {
      query = query.where('symbol', '==', symbol);
    }
    
    if (sector) {
      query = query.where('sector', '==', sector);
    }
    
    if (sentiment) {
      query = query.where('sentiment', '==', sentiment);
    }
    
    if (gapType) {
      query = query.where('gapType', '==', gapType);
    }
    
    if (newsType) {
      query = query.where('newsType', '==', newsType);
    }
    
    const snapshot = await query.orderBy('timestamp', 'desc').limit(100).get();
    
    const results = [];
    snapshot.forEach(doc => {
      results.push({ id: doc.id, ...doc.data() });
    });
    
    res.json({ 
      success: true, 
      data: results,
      count: results.length 
    });
    
  } catch (error) {
    console.error('Error searching news:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get today's market summary
router.get('/market-summary/:date?', async (req, res) => {
  try {
    const date = req.params.date || moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
    
    // Get market analysis
    const marketQuery = await firestore.collection(COLLECTIONS.STOCK_NEWS)
      .where('type', '==', 'MARKET_ANALYSIS')
      .where('date', '==', date)
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();
    
    if (marketQuery.empty) {
      return res.status(404).json({ 
        success: false, 
        error: 'No market analysis found for this date' 
      });
    }
    
    const marketAnalysis = marketQuery.docs[0].data();
    
    // Get gap analysis summary
    const gapQuery = await firestore.collection(COLLECTIONS.STOCK_NEWS)
      .where('type', '==', 'GAP_ANALYSIS')
      .where('date', '==', date)
      .get();
    
    const gapSummary = {
      total: gapQuery.size,
      strongUps: 0,
      strongDowns: 0,
      highConfidence: 0
    };
    
    gapQuery.forEach(doc => {
      const data = doc.data();
      if (data.gapType === 'STRONG_UP') gapSummary.strongUps++;
      if (data.gapType === 'STRONG_DOWN') gapSummary.strongDowns++;
      if (data.confidence === 'High') gapSummary.highConfidence++;
    });
    
    res.json({ 
      success: true, 
      data: {
        date,
        marketAnalysis: marketAnalysis.data,
        gapSummary,
        lastUpdated: marketAnalysis.timestamp
      }
    });
    
  } catch (error) {
    console.error('Error getting market summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Event-driven news fetch (for intraday unusual movements)
router.post('/event-driven', async (req, res) => {
  try {
    const { stocks } = req.body; // Array of { symbol, changePercent, volumeSpike, reason }
    
    if (!stocks || !Array.isArray(stocks) || stocks.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Please provide stocks array' 
      });
    }
    
    const prompt = `
    Quick analysis for these stocks showing unusual activity:
    
    ${stocks.map(s => `
    ${s.symbol}:
    - Change: ${s.changePercent}%
    - Volume spike: ${s.volumeSpike}x average
    - Trigger: ${s.reason}
    `).join('\n')}
    
    Provide brief reason for movement (max 50 words each).
    Check for: Circuit hits, block deals, news breaks, technical levels.
    
    Format as JSON array:
    [{
      "symbol": "",
      "likelyReason": "",
      "newsIfAny": "",
      "action": "MONITOR/INVESTIGATE/IGNORE"
    }]`;
    
    const response = await callGrokAPI(prompt, 'grok-3-mini'); // Use cheaper model for quick checks
    
    res.json({ 
      success: true, 
      data: response.data 
    });
    
  } catch (error) {
    console.error('Error in event-driven analysis:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete old news data
router.delete('/cleanup', async (req, res) => {
  try {
    const { daysToKeep = 30 } = req.body;
    const cutoffDate = moment().subtract(daysToKeep, 'days').format('YYYY-MM-DD');
    
    const snapshot = await firestore.collection(COLLECTIONS.STOCK_NEWS)
      .where('date', '<', cutoffDate)
      .get();
    
    const batch = firestore.batch();
    let deleteCount = 0;
    
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
      deleteCount++;
    });
    
    if (deleteCount > 0) {
      await batch.commit();
    }
    
    res.json({ 
      success: true, 
      message: `Deleted ${deleteCount} old news records` 
    });
    
  } catch (error) {
    console.error('Error cleaning up news:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;