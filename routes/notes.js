const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const moment = require('moment-timezone');
const { firestore, COLLECTIONS } = require('../config/firestore');

// Add note
router.post('/add', async (req, res) => {
  try {
    const { stock, note, date, webhookId } = req.body;
    const noteId = uuidv4();
    const noteDate = date || moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
    
    const noteData = {
      id: noteId,
      stock,
      note,
      date: noteDate,
      webhookId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await firestore.collection(COLLECTIONS.NOTES).doc(noteId).set(noteData);
    
    res.json({ success: true, data: noteData });
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update note
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    
    await firestore.collection(COLLECTIONS.NOTES).doc(id).update({
      note,
      updatedAt: new Date()
    });
    
    res.json({ success: true, message: 'Note updated successfully' });
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete note
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await firestore.collection(COLLECTIONS.NOTES).doc(id).delete();
    
    res.json({ success: true, message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get notes by stock
router.get('/by-stock/:stock', async (req, res) => {
  try {
    const { stock } = req.params;
    const snapshot = await firestore.collection(COLLECTIONS.NOTES)
      .where('stock', '==', stock)
      .orderBy('date', 'desc')
      .get();
    
    const notes = [];
    snapshot.forEach(doc => {
      notes.push({ id: doc.id, ...doc.data() });
    });
    
    res.json({ success: true, data: notes });
  } catch (error) {
    console.error('Error getting notes by stock:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get stocks with notes
router.get('/stocks-with-notes', async (req, res) => {
  try {
    const snapshot = await firestore.collection(COLLECTIONS.NOTES).get();
    const stocksMap = new Map();
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (!stocksMap.has(data.stock)) {
        stocksMap.set(data.stock, []);
      }
      stocksMap.get(data.stock).push({
        id: doc.id,
        date: data.date,
        note: data.note,
        webhookId: data.webhookId
      });
    });
    
    // Convert map to array and sort
    const stocksWithNotes = Array.from(stocksMap.entries())
      .map(([stock, notes]) => ({
        stock,
        notes: notes.sort((a, b) => b.date.localeCompare(a.date))
      }))
      .sort((a, b) => a.stock.localeCompare(b.stock));
    
    res.json({ success: true, data: stocksWithNotes });
  } catch (error) {
    console.error('Error getting stocks with notes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Batch add/update notes
router.post('/batch', async (req, res) => {
  try {
    const { notes } = req.body; // Array of { stock, note, date, webhookId }
    const batch = firestore.batch();
    const results = [];
    
    for (const noteData of notes) {
      // Check if note already exists for this stock, date, and webhook
      const existingQuery = await firestore.collection(COLLECTIONS.NOTES)
        .where('stock', '==', noteData.stock)
        .where('date', '==', noteData.date)
        .where('webhookId', '==', noteData.webhookId)
        .get();
      
      if (existingQuery.empty) {
        // Create new note
        const noteId = uuidv4();
        const newNote = {
          id: noteId,
          ...noteData,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        batch.set(firestore.collection(COLLECTIONS.NOTES).doc(noteId), newNote);
        results.push({ action: 'created', noteId });
      } else {
        // Update existing note
        const doc = existingQuery.docs[0];
        batch.update(doc.ref, {
          note: noteData.note,
          updatedAt: new Date()
        });
        results.push({ action: 'updated', noteId: doc.id });
      }
    }
    
    await batch.commit();
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Error batch processing notes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;