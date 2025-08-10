const express = require('express');
const router = express.Router();
const moment = require('moment-timezone');
const { firestore, COLLECTIONS } = require('../config/firestore');

// Generate report from template
router.post('/generate/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const { date } = req.body;
    const targetDate = date || moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
    
    // Get template
    const templateDoc = await firestore.collection(COLLECTIONS.TEMPLATES).doc(templateId).get();
    if (!templateDoc.exists) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    
    const template = templateDoc.data();
    if (template.type !== 'REPORT') {
      return res.status(400).json({ success: false, error: 'Invalid template type' });
    }
    
    // Get webhook data for the specified date
    const dataQuery = firestore.collection(COLLECTIONS.WEBHOOK_DATA)
      .where('date', '==', targetDate)
      .where('webhookId', 'in', template.webhookIds);
    
    const dataSnapshot = await dataQuery.get();
    
    // Get possible outputs for all webhooks
    const webhookDocs = await Promise.all(
      template.webhookIds.map(id => 
        firestore.collection(COLLECTIONS.WEBHOOKS).doc(id).get()
      )
    );
    
    const possibleOutputs = {};
    webhookDocs.forEach(doc => {
      if (doc.exists) {
        const data = doc.data();
        possibleOutputs[doc.id] = data.possibleOutput || 'No output configured';
      }
    });
    
    // Generate report data
    const reportData = [];
    dataSnapshot.forEach(doc => {
      const data = doc.data();
      data.stocks.forEach(stock => {
        reportData.push({
          webhook: data.webhookName,
          stock: stock,
          possibleOutput: possibleOutputs[data.webhookId] || 'No output configured',
          scanName: data.scanName,
          triggeredAt: data.triggeredAt
        });
      });
    });
    
    // Sort by webhook name and stock
    reportData.sort((a, b) => {
      if (a.webhook !== b.webhook) {
        return a.webhook.localeCompare(b.webhook);
      }
      return a.stock.localeCompare(b.stock);
    });
    
    res.json({
      success: true,
      data: {
        templateName: template.name,
        date: targetDate,
        report: reportData,
        totalStocks: reportData.length,
        webhooksUsed: template.webhookIds.length
      }
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get report summary
router.get('/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate || moment().tz('Asia/Kolkata').subtract(7, 'days').format('YYYY-MM-DD');
    const end = endDate || moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
    
    // Get webhook data within date range
    const dataQuery = firestore.collection(COLLECTIONS.WEBHOOK_DATA)
      .where('date', '>=', start)
      .where('date', '<=', end);
    
    const dataSnapshot = await dataQuery.get();
    
    // Generate summary statistics
    const summary = {
      totalAlerts: dataSnapshot.size,
      dateRange: { start, end },
      byWebhook: {},
      byScanner: {},
      byDate: {},
      topStocks: {}
    };
    
    dataSnapshot.forEach(doc => {
      const data = doc.data();
      
      // Count by webhook
      summary.byWebhook[data.webhookName] = (summary.byWebhook[data.webhookName] || 0) + 1;
      
      // Count by scanner
      summary.byScanner[data.scanName] = (summary.byScanner[data.scanName] || 0) + 1;
      
      // Count by date
      summary.byDate[data.date] = (summary.byDate[data.date] || 0) + 1;
      
      // Count stock occurrences
      data.stocks.forEach(stock => {
        summary.topStocks[stock] = (summary.topStocks[stock] || 0) + 1;
      });
    });
    
    // Sort top stocks and take top 20
    summary.topStocks = Object.entries(summary.topStocks)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .reduce((acc, [stock, count]) => {
        acc[stock] = count;
        return acc;
      }, {});
    
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Error getting report summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export report as CSV
router.post('/export/csv/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const { date } = req.body;
    const targetDate = date || moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
    
    // Generate report data (reuse logic from generate endpoint)
    const reportResult = await generateReportData(templateId, targetDate);
    
    if (!reportResult.success) {
      return res.status(400).json(reportResult);
    }
    
    // Convert to CSV
    const headers = ['Webhook', 'Stock', 'Possible Output', 'Scanner', 'Triggered At'];
    const rows = reportResult.data.report.map(row => [
      row.webhook,
      row.stock,
      row.possibleOutput,
      row.scanName,
      row.triggeredAt
    ]);
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });
    
    // Send CSV file
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 
      `attachment; filename="report_${reportResult.data.templateName}_${targetDate}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to generate report data
async function generateReportData(templateId, targetDate) {
  // Get template
  const templateDoc = await firestore.collection(COLLECTIONS.TEMPLATES).doc(templateId).get();
  if (!templateDoc.exists) {
    return { success: false, error: 'Template not found' };
  }
  
  const template = templateDoc.data();
  if (template.type !== 'REPORT') {
    return { success: false, error: 'Invalid template type' };
  }
  
  // Get webhook data
  const dataQuery = firestore.collection(COLLECTIONS.WEBHOOK_DATA)
    .where('date', '==', targetDate)
    .where('webhookId', 'in', template.webhookIds);
  
  const dataSnapshot = await dataQuery.get();
  
  // Get possible outputs
  const webhookDocs = await Promise.all(
    template.webhookIds.map(id => 
      firestore.collection(COLLECTIONS.WEBHOOKS).doc(id).get()
    )
  );
  
  const possibleOutputs = {};
  webhookDocs.forEach(doc => {
    if (doc.exists) {
      const data = doc.data();
      possibleOutputs[doc.id] = data.possibleOutput || 'No output configured';
    }
  });
  
  // Generate report
  const reportData = [];
  dataSnapshot.forEach(doc => {
    const data = doc.data();
    data.stocks.forEach(stock => {
      reportData.push({
        webhook: data.webhookName,
        stock: stock,
        possibleOutput: possibleOutputs[data.webhookId] || 'No output configured',
        scanName: data.scanName,
        triggeredAt: data.triggeredAt
      });
    });
  });
  
  return {
    success: true,
    data: {
      templateName: template.name,
      date: targetDate,
      report: reportData
    }
  };
}

module.exports = router;