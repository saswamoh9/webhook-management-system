// Main App Coordinator
let currentTab = 'webhooks';

// Initialize app on DOM load
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    console.log('🚀 Initializing Webhook Management System...');
    
    // Set today's date as default for date inputs
    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(input => {
        input.value = today;
    });
    
    // Initialize tab navigation
    initializeTabNavigation();
    
    // Load initial tab
    await loadTab('webhooks');
    
    // Initialize keyboard shortcuts
    initializeKeyboardShortcuts();
    
    console.log('✅ Initialization complete');
}

function initializeTabNavigation() {
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', async () => {
            const tabName = button.dataset.tab;
            
            // Update active tab button
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Load tab content
            await loadTab(tabName);
        });
    });
}

async function loadTab(tabName) {
    console.log(`📂 Loading tab: ${tabName}`);
    currentTab = tabName;
    
    const container = document.getElementById('tab-contents');
    
    // Show loading state
    container.innerHTML = '<div class="card p-8"><div class="text-center"><div class="loader border-4 border-gray-200 rounded-full w-12 h-12 mx-auto mb-4"></div>Loading...</div></div>';
    
    try {
        switch(tabName) {
            case 'webhooks':
                container.innerHTML = WebhooksModule.getHTML();
                await WebhooksModule.initialize();
                break;
                
            case 'stocks':
                container.innerHTML = StocksModule.getHTML();
                await StocksModule.initialize();
                break;
                
            case 'preopen':
                container.innerHTML = PreopenModule.getHTML();
                await PreopenModule.initialize();
                break;
                
            case 'intraday-analysis':
                container.innerHTML = IntradayAnalysisModule.getHTML();
                await IntradayAnalysisModule.initialize();
                break;
                
            case 'financial-calendar':
                container.innerHTML = FinancialCalendarModule.getHTML();
                await FinancialCalendarModule.initialize();
                break;
                
            case 'stock-news':
                container.innerHTML = StockNewsModule.getHTML();
                await StockNewsModule.initialize();
                break;
                
            case 'search':
                container.innerHTML = getSearchHTML();
                await initializeSearch();
                break;

            case 'delivery-volume':
                container.innerHTML = DeliveryVolumeModule.getHTML();
                await DeliveryVolumeModule.initialize();
                break;
                
            default:
                container.innerHTML = '<div class="card p-8"><p class="text-center text-gray-500">Tab not found</p></div>';
        }
    } catch (error) {
        console.error(`Error loading tab ${tabName}:`, error);
        showError(`Error loading ${tabName}: ${error.message}`);
        container.innerHTML = '<div class="card p-8"><p class="text-center text-red-500">Error loading content</p></div>';
    }
}

function getSearchHTML() {
    return `
        <div class="card p-8">
            <h2 class="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <i class="fas fa-search mr-3 text-purple-600"></i>
                Search Webhook Data
            </h2>
            
            <form id="searchForm" class="space-y-4 mb-8">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            <i class="fas fa-calendar mr-1"></i>Date
                        </label>
                        <input type="date" id="searchDate" class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            <i class="fas fa-webhook mr-1"></i>Webhook Name
                        </label>
                        <select id="searchWebhook" class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg">
                            <option value="">All Webhooks</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            <i class="fas fa-tag mr-1"></i>Tag
                        </label>
                        <select id="searchTag" class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg">
                            <option value="">All Tags</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            <i class="fas fa-qrcode mr-1"></i>Scanner Name
                        </label>
                        <select id="searchScanner" class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg">
                            <option value="">All Scanners</option>
                        </select>
                    </div>
                </div>
                <button type="submit" class="btn-primary px-6 py-3 rounded-lg font-medium">
                    <i class="fas fa-search mr-2"></i>Search
                </button>
            </form>

            <div id="searchResults" class="overflow-x-auto"></div>
        </div>
    `;
}

async function initializeSearch() {
    await loadSearchOptions();
    
    document.getElementById('searchForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await performSearch();
    });
}

async function loadSearchOptions() {
    try {
        // Load webhooks
        const webhooksResponse = await fetch(`${API_BASE}/webhooks/list`);
        const webhooks = await webhooksResponse.json();
        
        const webhookSelect = document.getElementById('searchWebhook');
        webhookSelect.innerHTML = '<option value="">All Webhooks</option>';
        webhooks.data.forEach(webhook => {
            webhookSelect.innerHTML += `<option value="${webhook.name}">${webhook.name}</option>`;
        });
        
        // Load tags
        const tagsResponse = await fetch(`${API_BASE}/data/tags`);
        const tags = await tagsResponse.json();
        
        const tagSelect = document.getElementById('searchTag');
        tagSelect.innerHTML = '<option value="">All Tags</option>';
        tags.data.forEach(tag => {
            tagSelect.innerHTML += `<option value="${tag}">${tag}</option>`;
        });
        
        // Load scanners
        const scannersResponse = await fetch(`${API_BASE}/data/scanners`);
        const scanners = await scannersResponse.json();
        
        const scannerSelect = document.getElementById('searchScanner');
        scannerSelect.innerHTML = '<option value="">All Scanners</option>';
        scanners.data.forEach(scanner => {
            scannerSelect.innerHTML += `<option value="${scanner}">${scanner}</option>`;
        });
    } catch (error) {
        console.error('Error loading search options:', error);
    }
}

async function performSearch() {
    const searchData = {
        date: document.getElementById('searchDate').value,
        webhookName: document.getElementById('searchWebhook').value,
        tag: document.getElementById('searchTag').value,
        scannerName: document.getElementById('searchScanner').value
    };
    
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE}/data/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(searchData)
        });
        
        const result = await response.json();
        if (result.success) {
            displaySearchResults(result.data);
        } else {
            showError('Error searching: ' + result.error);
        }
    } catch (error) {
        showError('Error: ' + error.message);
    } finally {
        hideLoading();
    }
}

function displaySearchResults(data) {
    const resultsDiv = document.getElementById('searchResults');
    
    if (data.length === 0) {
        resultsDiv.innerHTML = '<p class="text-gray-500 text-center py-8">No results found.</p>';
        return;
    }
    
    const table = `
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-purple-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Date</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Webhook</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Scanner</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Stocks</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Triggered At</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Actions</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                ${data.map(item => `
                    <tr class="table-row">
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${item.date}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">${item.webhookName}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${item.scanName}</td>
                        <td class="px-6 py-4 text-sm">
                            <div class="flex flex-wrap gap-1">
                                ${item.stocks.map(stock => `<span class="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">${stock}</span>`).join('')}
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${item.triggeredAt}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">
                            <button onclick="deleteSearchData('${item.id}')" class="text-red-600 hover:text-red-800 transition-colors">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    resultsDiv.innerHTML = table;
}

async function deleteSearchData(id) {
    if (!confirm('Are you sure you want to delete this data?')) return;
    
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE}/data/delete/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        if (result.success) {
            showSuccess('Data deleted successfully!');
            await performSearch();
        } else {
            showError('Error deleting data: ' + result.error);
        }
    } catch (error) {
        showError('Error: ' + error.message);
    } finally {
        hideLoading();
    }
}

function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // ESC key to close modals
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                if (!modal.classList.contains('hidden')) {
                    modal.classList.add('hidden');
                }
            });
        }
        
        // Ctrl/Cmd + S to save (prevent default)
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
        }
    });
}

function debugDOMElements() {
    console.log('🔍 DOM Debug Check:');
    console.log('- tab-contents exists:', !!document.getElementById('tab-contents'));
    console.log('- loadingSpinner exists:', !!document.getElementById('loadingSpinner'));
    console.log('- successToast exists:', !!document.getElementById('successToast'));
    console.log('- errorToast exists:', !!document.getElementById('errorToast'));
    
    const container = document.getElementById('tab-contents');
    if (container) {
        console.log('- tab-contents innerHTML length:', container.innerHTML.length);
        console.log('- tab-contents current content:', container.innerHTML.substring(0, 100));
    }
}

// 🔍 DEBUG: Check if modules are available
function debugModules() {
    console.log('🔍 Module Debug Check:');
    const modules = ['WebhooksModule', 'StocksModule', 'PreopenModule', 'IntradayAnalysisModule', 'FinancialCalendarModule', 'StockNewsModule'];
    
    modules.forEach(moduleName => {
        const module = window[moduleName];
        console.log(`- ${moduleName}:`, {
            exists: !!module,
            hasGetHTML: !!(module && typeof module.getHTML === 'function'),
            hasInitialize: !!(module && typeof module.initialize === 'function')
        });
        
        if (module && typeof module.getHTML === 'function') {
            try {
                const html = module.getHTML();
                console.log(`  ${moduleName}.getHTML() returns ${html.length} characters`);
            } catch (error) {
                console.error(`  ${moduleName}.getHTML() error:`, error);
            }
        }
    });
}

// 🔍 DEBUG: Check utility functions
function debugUtilities() {
    console.log('🔍 Utility Functions Check:');
    console.log('- showLoading exists:', typeof showLoading === 'function');
    console.log('- hideLoading exists:', typeof hideLoading === 'function');
    console.log('- showSuccess exists:', typeof showSuccess === 'function');
    console.log('- showError exists:', typeof showError === 'function');
    console.log('- apiFetch exists:', typeof apiFetch === 'function');
    console.log('- API_BASE:', typeof API_BASE !== 'undefined' ? API_BASE : 'undefined');
}

// 🔍 COMPLETE DEBUG FUNCTION
function fullDebug() {
    console.log('='.repeat(50));
    console.log('🚨 FULL DEBUG ANALYSIS');
    console.log('='.repeat(50));
    
    debugDOMElements();
    console.log('');
    debugModules();
    console.log('');
    debugUtilities();
    console.log('');
    
    // Try to manually load webhooks content
    console.log('🔧 Manual Content Load Test:');
    const container = document.getElementById('tab-contents');
    if (container) {
        container.innerHTML = `
            <div class="card p-8" style="background: white; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);">
                <h2 style="font-size: 1.5rem; font-weight: bold; color: #374151; margin-bottom: 1.5rem;">
                    🔧 Debug Test Content
                </h2>
                <p style="color: #6b7280;">If you can see this, the DOM manipulation is working!</p>
                <div style="margin-top: 1rem; padding: 1rem; background: #f3f4f6; border-radius: 8px;">
                    <strong>Current time:</strong> ${new Date().toLocaleString()}
                </div>
            </div>
        `;
        console.log('✅ Manual content injection successful');
    } else {
        console.error('❌ tab-contents container not found!');
    }
}

// Make functions globally available
window.deleteSearchData = deleteSearchData;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.showSuccess = showSuccess;
window.showError = showError;