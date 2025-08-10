const express = require('express');
const router = express.Router();
const { firestore, COLLECTIONS } = require('../config/firestore'); // Adjust path as needed

// Define valid purposes
const VALID_PURPOSES = [
    'Board meeting Rescheduled',
    'Bonus',
    'Buyback',
    'Dividend',
    'Financial Results',
    'Fund Raising',
    'Other business matters',
    'Stock Split',
    'Stock split',
    'Voluntary Delisting',
    '2025 Q1 Result',
    '2025 Q2 Result',
    '2025 Q3 Result',
    '2025 Q4 Result'
];

// Function to split combined purposes
function splitPurposes(purposeString) {
    if (!purposeString) return [];
    return purposeString.split('/').map(p => p.trim()).filter(p => p);
}

// Function to validate if all purposes in a combined string are valid
function validateAllPurposes(purposeString) {
    const purposes = splitPurposes(purposeString);
    const invalidPurposes = purposes.filter(purpose => !VALID_PURPOSES.includes(purpose));
    return {
        isValid: invalidPurposes.length === 0,
        purposes: purposes,
        invalidPurposes: invalidPurposes
    };
}

// Health check
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Financial Calendar API is running',
        timestamp: new Date().toISOString(),
        validPurposes: VALID_PURPOSES
    });
});

// Get valid purposes
router.get('/purposes', (req, res) => {
    res.json({
        success: true,
        data: VALID_PURPOSES
    });
});

// Upload financial calendar data - HANDLES COMBINED PURPOSES
router.post('/upload', async (req, res) => {
    try {
        console.log('Financial calendar upload started');
        
        const { data: calendarData } = req.body;
        
        if (!Array.isArray(calendarData)) {
            return res.status(400).json({
                success: false,
                error: 'Data must be an array of calendar entries'
            });
        }
        
        const requiredFields = ['Symbol', 'Company', 'Purpose', 'Date'];
        const validEntries = [];
        const errors = [];
        const warnings = [];
        
        for (let i = 0; i < calendarData.length; i++) {
            const entry = calendarData[i];
            const entryIndex = i + 1;
            
            // Check required fields
            const missingFields = requiredFields.filter(field => !entry[field]);
            if (missingFields.length > 0) {
                errors.push(`Entry ${entryIndex}: Missing fields - ${missingFields.join(', ')}`);
                continue;
            }
            
            // Validate date format
            const dateRegex = /^\d{2}-[A-Za-z]{3}-\d{4}$/;
            if (!dateRegex.test(entry.Date)) {
                errors.push(`Entry ${entryIndex}: Invalid date format "${entry.Date}". Expected: DD-MMM-YYYY (e.g., 10-Jul-2025)`);
                continue;
            }
            
            // Handle purposes (single or combined)
            const purposeValidation = validateAllPurposes(entry.Purpose);
            
            if (!purposeValidation.isValid) {
                errors.push(`Entry ${entryIndex}: Invalid purposes in "${entry.Purpose}": ${purposeValidation.invalidPurposes.join(', ')}`);
                continue;
            }
            
            // If combined purposes, warn user about splitting
            if (purposeValidation.purposes.length > 1) {
                warnings.push(`Entry ${entryIndex}: "${entry.Purpose}" will be split into ${purposeValidation.purposes.length} separate entries`);
            }
            
            // Create entries for each purpose
            for (const purpose of purposeValidation.purposes) {
                // Check for duplicates
                try {
                    const existingQuery = await firestore
                        .collection(COLLECTIONS.FINANCIAL_CALENDAR)
                        .where('Symbol', '==', entry.Symbol.toUpperCase())
                        .where('Date', '==', entry.Date)
                        .where('Purpose', '==', purpose)
                        .limit(1)
                        .get();
                    
                    if (!existingQuery.empty) {
                        warnings.push(`Entry ${entryIndex}: Duplicate skipped for ${entry.Symbol} - ${purpose} on ${entry.Date}`);
                        continue;
                    }
                } catch (duplicateError) {
                    console.warn(`Duplicate check failed for entry ${entryIndex}:`, duplicateError.message);
                    // Continue anyway - better to have duplicates than miss entries
                }
                
                // Create the entry
                const entryData = {
                    Symbol: entry.Symbol.toUpperCase(),
                    Company: entry.Company.trim(),
                    Purpose: purpose,
                    Date: entry.Date,
                    originalPurpose: entry.Purpose, // Store original combined purpose
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                
                validEntries.push(entryData);
            }
        }
        
        console.log(`Processing complete: ${validEntries.length} valid entries, ${errors.length} errors, ${warnings.length} warnings`);
        
        if (validEntries.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid entries found after processing',
                details: errors,
                warnings: warnings,
                validPurposes: VALID_PURPOSES
            });
        }
        
        // Batch write to Firestore
        console.log('Starting batch write to Firestore...');
        let successCount = 0;
        const batchSize = 500; // Firestore batch limit
        
        for (let i = 0; i < validEntries.length; i += batchSize) {
            const batch = firestore.batch();
            const batchEntries = validEntries.slice(i, i + batchSize);
            
            batchEntries.forEach(entry => {
                const docRef = firestore.collection(COLLECTIONS.FINANCIAL_CALENDAR).doc();
                batch.set(docRef, entry);
            });
            
            await batch.commit();
            successCount += batchEntries.length;
            console.log(`Batch ${Math.floor(i / batchSize) + 1} completed: ${batchEntries.length} entries`);
        }
        
        console.log(`Upload completed: ${successCount} entries written to Firestore`);
        
        res.json({
            success: true,
            message: `Successfully processed ${successCount} entries from ${calendarData.length} input entries`,
            uploaded: successCount,
            totalInput: calendarData.length,
            errors: errors.length > 0 ? errors.slice(0, 20) : null, // Limit error display
            warnings: warnings.length > 0 ? warnings.slice(0, 20) : null, // Limit warning display
            summary: {
                totalProcessed: successCount,
                totalErrors: errors.length,
                totalWarnings: warnings.length,
                splitEntries: warnings.filter(w => w.includes('split')).length
            }
        });
        
    } catch (error) {
        console.error('Error in financial calendar upload:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to upload financial calendar data',
            details: error.message,
            stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
        });
    }
});

// Search with multi-purpose support
router.post('/search', async (req, res) => {
    try {
        console.log('Financial calendar search called with filters:', req.body);
        
        const filters = req.body;
        let query = firestore.collection(COLLECTIONS.FINANCIAL_CALENDAR);
        
        // Apply Firestore filters where possible
        if (filters.symbol && filters.symbol.trim()) {
            const symbolUpper = filters.symbol.toUpperCase();
            query = query.where('Symbol', '>=', symbolUpper)
                        .where('Symbol', '<=', symbolUpper + '\uf8ff');
        }
        
        // If only one purpose is selected, use Firestore filter
        if (filters.purposes && filters.purposes.length === 1) {
            query = query.where('Purpose', '==', filters.purposes[0]);
        }
        
        query = query.orderBy('Date', 'asc');
        
        const snapshot = await query.get();
        let results = [];
        
        snapshot.forEach(doc => {
            results.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`Initial query returned ${results.length} results`);
        
        // Apply client-side filters
        if (filters.company && filters.company.trim()) {
            const originalLength = results.length;
            results = results.filter(item => 
                item.Company.toLowerCase().includes(filters.company.toLowerCase())
            );
            console.log(`Company filter: ${originalLength} -> ${results.length} results`);
        }
        
        // Handle multiple purposes filter
        if (filters.purposes && Array.isArray(filters.purposes) && filters.purposes.length > 0) {
            if (filters.purposes.length > 1) { // Only apply if multiple purposes (single purpose already filtered above)
                const originalLength = results.length;
                results = results.filter(item => filters.purposes.includes(item.Purpose));
                console.log(`Purpose filter: ${originalLength} -> ${results.length} results`);
            }
        }
        
        // Date range filter
        if (filters.startDate && filters.endDate) {
            const originalLength = results.length;
            results = results.filter(item => {
                const itemDate = new Date(item.Date);
                const start = new Date(filters.startDate);
                const end = new Date(filters.endDate);
                return itemDate >= start && itemDate <= end;
            });
            console.log(`Date filter: ${originalLength} -> ${results.length} results`);
        }
        
        // Sort results by date and then by Symbol
        results.sort((a, b) => {
            const dateCompare = new Date(a.Date) - new Date(b.Date);
            if (dateCompare !== 0) return dateCompare;
            return a.Symbol.localeCompare(b.Symbol);
        });
        
        console.log(`Final results: ${results.length} entries`);
        
        res.json({
            success: true,
            data: results,
            filters: filters,
            total: results.length
        });
        
    } catch (error) {
        console.error('Error searching financial calendar:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search financial calendar data',
            details: error.message
        });
    }
});

// Get statistics with purpose breakdown
router.get('/stats', async (req, res) => {
    try {
        const snapshot = await firestore.collection(COLLECTIONS.FINANCIAL_CALENDAR).get();
        
        let totalCompanies = new Set();
        let upcomingResults = 0;
        let thisWeekResults = 0;
        let purposeBreakdown = {};
        
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        snapshot.forEach(doc => {
            const data = doc.data();
            totalCompanies.add(data.Company);
            
            // Purpose breakdown
            if (!purposeBreakdown[data.Purpose]) {
                purposeBreakdown[data.Purpose] = 0;
            }
            purposeBreakdown[data.Purpose]++;
            
            const entryDate = new Date(data.Date);
            if (entryDate >= today) {
                upcomingResults++;
            }
            if (entryDate >= today && entryDate <= nextWeek) {
                thisWeekResults++;
            }
        });
        
        res.json({
            success: true,
            data: {
                totalCompanies: totalCompanies.size,
                upcomingResults,
                thisWeekResults,
                totalEntries: snapshot.size,
                purposeBreakdown: purposeBreakdown
            }
        });
        
    } catch (error) {
        console.error('Error getting financial calendar stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get statistics',
            details: error.message
        });
    }
});

// Delete financial calendar entry
router.delete('/delete/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const doc = await firestore.collection(COLLECTIONS.FINANCIAL_CALENDAR).doc(id).get();
        
        if (!doc.exists) {
            return res.status(404).json({
                success: false,
                error: 'Financial calendar entry not found'
            });
        }
        
        await firestore.collection(COLLECTIONS.FINANCIAL_CALENDAR).doc(id).delete();
        
        res.json({
            success: true,
            message: 'Financial calendar entry deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting financial calendar entry:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete financial calendar entry',
            details: error.message
        });
    }
});

// Get all entries (for testing)
router.get('/list', async (req, res) => {
    try {
        const snapshot = await firestore
            .collection(COLLECTIONS.FINANCIAL_CALENDAR)
            .orderBy('Date', 'asc')
            .limit(100)
            .get();
        
        let results = [];
        snapshot.forEach(doc => {
            results.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        res.json({
            success: true,
            data: results,
            total: results.length
        });
        
    } catch (error) {
        console.error('Error fetching financial calendar list:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch financial calendar data',
            details: error.message
        });
    }
});

// Test endpoint to verify data processing
router.post('/test-upload', async (req, res) => {
    try {
        const { data: calendarData } = req.body;
        
        if (!Array.isArray(calendarData)) {
            return res.status(400).json({
                success: false,
                error: 'Data must be an array'
            });
        }
        
        // Just process the first few entries for testing
        const testEntries = calendarData.slice(0, 5);
        const results = [];
        
        testEntries.forEach((entry, index) => {
            const validation = validateAllPurposes(entry.Purpose);
            results.push({
                entry: entry,
                validation: validation,
                wouldCreate: validation.purposes.length,
                index: index + 1
            });
        });
        
        res.json({
            success: true,
            message: 'Test processing completed',
            results: results,
            validPurposes: VALID_PURPOSES
        });
        
    } catch (error) {
        console.error('Error in test upload:', error);
        res.status(500).json({
            success: false,
            error: 'Test failed',
            details: error.message
        });
    }
});

// Error handling middleware
router.use((error, req, res, next) => {
    console.error('Financial Calendar Route Error:', {
        error: error.message,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
    });
});

module.exports = router;