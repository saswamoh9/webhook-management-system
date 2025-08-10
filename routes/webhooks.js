const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const moment = require('moment-timezone');
const { firestore, COLLECTIONS } = require('../config/firestore');

// Create webhook
router.post('/create', async (req, res) => {
  try {
    const { name, stockSet, tags, possibleOutput, description } = req.body; // Added description
    const webhookId = uuidv4();
    // Force HTTPS for Cloud Run deployments
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : req.protocol;
    const webhookUrl = `${protocol}://${req.get('host')}/api/webhooks/receive/${webhookId}`;
    
    const webhook = {
      id: webhookId,
      name,
      stockSet, // 'NIFTY_500' or 'ANY_WEBHOOK'
      tags: tags || [],
      webhookUrl,
      possibleOutput: possibleOutput || '',
      description: description || '', // Added description field
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await firestore.collection(COLLECTIONS.WEBHOOKS).doc(webhookId).set(webhook);
    
    res.json({ success: true, data: webhook });
  } catch (error) {
    console.error('Error creating webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update webhook
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {
      ...req.body,
      updatedAt: new Date()
    };
    
    await firestore.collection(COLLECTIONS.WEBHOOKS).doc(id).update(updates);
    
    res.json({ success: true, message: 'Webhook updated successfully' });
  } catch (error) {
    console.error('Error updating webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete webhook
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await firestore.collection(COLLECTIONS.WEBHOOKS).doc(id).delete();
    
    res.json({ success: true, message: 'Webhook deleted successfully' });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all webhooks
router.get('/list', async (req, res) => {
  try {
    const snapshot = await firestore.collection(COLLECTIONS.WEBHOOKS)
      .orderBy('createdAt', 'desc')
      .get();
    const webhooks = [];
    
    snapshot.forEach(doc => {
      webhooks.push({ id: doc.id, ...doc.data() });
    });
    
    res.json({ success: true, data: webhooks });
  } catch (error) {
    console.error('Error listing webhooks:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single webhook
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await firestore.collection(COLLECTIONS.WEBHOOKS).doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Webhook not found' });
    }
    
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error('Error getting webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Webhook receiver endpoint
router.post('/receive/:webhookId', async (req, res) => {
  try {
    const { webhookId } = req.params;
    const data = req.body;
    
    // Get webhook details
    const webhookDoc = await firestore.collection(COLLECTIONS.WEBHOOKS).doc(webhookId).get();
    if (!webhookDoc.exists) {
      return res.status(404).json({ success: false, error: 'Webhook not found' });
    }
    
    const webhook = webhookDoc.data();
    
    // Parse stocks and trigger prices
    const stocks = data.stocks ? data.stocks.split(',') : [];
    const triggerPrices = data.trigger_prices ? data.trigger_prices.split(',').map(price => parseFloat(price)) : [];
    
    // Store data with IST date
    const istDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
    const dataId = uuidv4();
    
    const webhookData = {
      id: dataId,
      webhookId,
      webhookName: webhook.name,
      webhookDescription: webhook.description || '', // Include description
      stocks,
      triggerPrices,
      triggeredAt: data.triggered_at,
      scanName: data.scan_name,
      scanUrl: data.scan_url,
      alertName: data.alert_name,
      date: istDate,
      receivedAt: new Date(),
      tags: webhook.tags || [],
      stockSet: webhook.stockSet
    };
    
    await firestore.collection(COLLECTIONS.WEBHOOK_DATA).doc(dataId).set(webhookData);
    
    res.json({ success: true, message: 'Data received and stored successfully' });
  } catch (error) {
    console.error('Error receiving webhook data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update possible output
router.put('/:id/possible-output', async (req, res) => {
  try {
    const { id } = req.params;
    const { possibleOutput } = req.body;
    
    await firestore.collection(COLLECTIONS.WEBHOOKS).doc(id).update({
      possibleOutput,
      updatedAt: new Date()
    });
    
    res.json({ success: true, message: 'Possible output updated successfully' });
  } catch (error) {
    console.error('Error updating possible output:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all possible outputs
router.get('/possible-outputs/list', async (req, res) => {
  try {
    const snapshot = await firestore.collection(COLLECTIONS.WEBHOOKS).get();
    const outputs = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      outputs.push({
        webhookId: doc.id,
        webhookName: data.name,
        possibleOutput: data.possibleOutput || '',
        description: data.description || '' // Include description
      });
    });
    
    res.json({ success: true, data: outputs });
  } catch (error) {
    console.error('Error getting possible outputs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;