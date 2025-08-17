// Enhanced Webhooks Module with Sub-tabs
const WebhooksModule = {
    webhooks: [],
    currentSubTab: 'manage',

    getHTML() {
        return `
            <div id="webhooks" class="tab-content fade-in">
                <!-- Statistics Cards -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div class="stats-card rounded-lg p-6 text-center">
                        <i class="fas fa-webhook text-3xl mb-2"></i>
                        <h3 class="text-2xl font-bold" id="totalWebhooks">0</h3>
                        <p class="text-sm opacity-90">Total Webhooks</p>
                    </div>
                    <div class="stats-card rounded-lg p-6 text-center">
                        <i class="fas fa-database text-3xl mb-2"></i>
                        <h3 class="text-2xl font-bold" id="totalData">0</h3>
                        <p class="text-sm opacity-90">Data Received</p>
                    </div>
                    <div class="stats-card rounded-lg p-6 text-center">
                        <i class="fas fa-calendar-day text-3xl mb-2"></i>
                        <h3 class="text-2xl font-bold" id="todayData">0</h3>
                        <p class="text-sm opacity-90">Today's Data</p>
                    </div>
                    <div class="stats-card rounded-lg p-6 text-center">
                        <i class="fas fa-chart-line text-3xl mb-2"></i>
                        <h3 class="text-2xl font-bold" id="activeTemplates">0</h3>
                        <p class="text-sm opacity-90">Active Templates</p>
                    </div>
                </div>

                <!-- Sub-tabs Navigation -->
                <div class="bg-white rounded-lg shadow-md mb-6">
                    <div class="flex border-b border-gray-200">
                        <button class="sub-tab-btn active px-6 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none focus:text-purple-600 border-b-2 border-transparent hover:border-gray-300 focus:border-purple-600" 
                                data-subtab="manage" onclick="WebhooksModule.switchSubTab('manage')">
                            <i class="fas fa-cogs mr-2"></i>Manage Webhooks
                        </button>
                        <button class="sub-tab-btn px-6 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none focus:text-purple-600 border-b-2 border-transparent hover:border-gray-300 focus:border-purple-600" 
                                data-subtab="search" onclick="WebhooksModule.switchSubTab('search')">
                            <i class="fas fa-search mr-2"></i>Search Data
                        </button>
                    </div>
                </div>

                <!-- Sub-tab Content -->
                <div id="webhook-subtab-content">
                    ${this.getManageWebhooksHTML()}
                </div>
            </div>
        `;
    },

    getManageWebhooksHTML() {
        return `
            <div class="card p-8">
                <h2 class="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                    <i class="fas fa-webhook mr-3 text-purple-600"></i>
                    Manage Webhooks
                </h2>
                
                <!-- Create Webhook Form -->
                <div class="bg-white rounded-lg shadow-md p-6 mb-8">
                    <h3 id="webhookFormTitle" class="text-lg font-semibold mb-4 flex items-center">
                        <i class="fas fa-plus mr-2 text-purple-600"></i>Create New Webhook
                    </h3>
                    
                    <form id="webhookForm" onsubmit="event.preventDefault(); WebhooksModule.saveWebhook();" class="space-y-4">
                        <input type="hidden" id="webhookId">
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label for="webhookName" class="block text-sm font-medium text-gray-700 mb-2">
                                    <i class="fas fa-tag mr-1"></i>Webhook Name
                                </label>
                                <input type="text" id="webhookName" name="webhookName" required 
                                       class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                       placeholder="Enter webhook name">
                            </div>
                            
                            <div>
                                <label for="stockSet" class="block text-sm font-medium text-gray-700 mb-2">
                                    <i class="fas fa-layer-group mr-1"></i>Stock Set
                                </label>
                                <select id="stockSet" name="stockSet" required class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                                    <option value="">Select Stock Set</option>
                                    <option value="NIFTY_500">NIFTY 500</option>
                                    <option value="ANY_WEBHOOK">Any Webhook</option>
                                </select>
                            </div>
                        </div>
                        
                        <div>
                            <label for="webhookDescription" class="block text-sm font-medium text-gray-700 mb-2">
                                <i class="fas fa-info-circle mr-1"></i>Description (Optional)
                            </label>
                            <textarea id="webhookDescription" name="webhookDescription" rows="2"
                                      class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                      placeholder="Brief description of this webhook's purpose"></textarea>
                        </div>
                        
                        <div>
                            <label for="webhookTags" class="block text-sm font-medium text-gray-700 mb-2">
                                <i class="fas fa-tags mr-1"></i>Tags (comma separated)
                            </label>
                            <input type="text" id="webhookTags" name="webhookTags"
                                   class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                   placeholder="e.g., breakout, momentum, earnings">
                        </div>
                        
                        <div>
                            <label for="possibleOutput" class="block text-sm font-medium text-gray-700 mb-2">
                                <i class="fas fa-comment-alt mr-1"></i>Expected Output (Optional)
                            </label>
                            <textarea id="possibleOutput" name="possibleOutput" rows="2"
                                      class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                      placeholder="Describe what kind of data this webhook will receive"></textarea>
                        </div>
                        
                        <button type="submit" class="btn-primary px-6 py-3 rounded-lg font-medium">
                            <i class="fas fa-save mr-2"></i>Save Webhook
                        </button>
                    </form>
                </div>

                <!-- Webhooks List -->
                <div id="webhooksList">
                    <div class="text-center py-8">
                        <div class="loader border-4 border-gray-200 rounded-full w-12 h-12 mx-auto mb-4"></div>
                        Loading webhooks...
                    </div>
                </div>
            </div>
        `;
    },

    getSearchDataHTML() {
        return `
            <div class="card p-8">
                <h2 class="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                    <i class="fas fa-search mr-3 text-purple-600"></i>
                    Search Webhook Data
                </h2>
                
                <!-- Search Form -->
                <div class="bg-white rounded-lg shadow-md p-6 mb-8">
                    <form id="webhookSearchForm" onsubmit="event.preventDefault(); WebhooksModule.performSearch();" class="space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <!-- Date Search -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    <i class="fas fa-calendar-alt mr-1"></i>Search by Date
                                </label>
                                <select id="dateSearchType" class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent" onchange="WebhooksModule.toggleDateInputs()">
                                    <option value="single">Single Date</option>
                                    <option value="range">Date Range</option>
                                    <option value="all">All Dates</option>
                                </select>
                            </div>
                            
                            <!-- Single Date Input -->
                            <div id="singleDateGroup">
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    <i class="fas fa-calendar-day mr-1"></i>Select Date
                                </label>
                                <input type="date" id="searchDate" class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                            </div>
                            
                            <!-- Webhook Name -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    <i class="fas fa-webhook mr-1"></i>Webhook Name
                                </label>
                                <select id="searchWebhook" class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                                    <option value="">All Webhooks</option>
                                </select>
                            </div>
                            
                            <!-- Scanner Name -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    <i class="fas fa-qrcode mr-1"></i>Scanner Name
                                </label>
                                <select id="searchScanner" class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                                    <option value="">All Scanners</option>
                                </select>
                            </div>
                        </div>
                        
                        <!-- Date Range Inputs (Initially Hidden) -->
                        <div id="dateRangeGroup" class="grid grid-cols-1 md:grid-cols-2 gap-4" style="display: none;">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    <i class="fas fa-calendar-week mr-1"></i>Start Date
                                </label>
                                <input type="date" id="startDate" class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    <i class="fas fa-calendar-week mr-1"></i>End Date
                                </label>
                                <input type="date" id="endDate" class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                            </div>
                        </div>
                        
                        <!-- Additional Filters -->
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    <i class="fas fa-tags mr-1"></i>Tag Filter
                                </label>
                                <select id="searchTag" class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                                    <option value="">All Tags</option>
                                </select>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    <i class="fas fa-layer-group mr-1"></i>Stock Set
                                </label>
                                <select id="searchStockSet" class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                                    <option value="">All Stock Sets</option>
                                    <option value="NIFTY_500">NIFTY 500</option>
                                    <option value="ANY_WEBHOOK">Any Webhook</option>
                                </select>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    <i class="fas fa-sort-amount-down mr-1"></i>Results Limit
                                </label>
                                <select id="searchLimit" class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                                    <option value="50">50 Results</option>
                                    <option value="100">100 Results</option>
                                    <option value="200">200 Results</option>
                                    <option value="500">500 Results</option>
                                </select>
                            </div>
                        </div>
                        
                        <!-- Search Buttons -->
                        <div class="flex gap-4 pt-4">
                            <button type="submit" class="btn-primary px-6 py-3 rounded-lg font-medium">
                                <i class="fas fa-search mr-2"></i>Search Data
                            </button>
                            <button type="button" onclick="WebhooksModule.clearSearch()" class="btn-secondary px-6 py-3 rounded-lg font-medium">
                                <i class="fas fa-times mr-2"></i>Clear Filters
                            </button>
                            <button type="button" onclick="WebhooksModule.exportResults()" class="btn-secondary px-6 py-3 rounded-lg font-medium" id="exportBtn" style="display: none;">
                                <i class="fas fa-download mr-2"></i>Export Results
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Search Results -->
                <div id="searchResults" class="space-y-4">
                    <div class="text-center py-8 text-gray-500">
                        <i class="fas fa-search text-4xl mb-4"></i>
                        <p>Use the search form above to find webhook data</p>
                    </div>
                </div>
            </div>
        `;
    },

    async initialize() {
        await this.loadStats();
        if (this.currentSubTab === 'manage') {
            await this.loadWebhooks();
        } else if (this.currentSubTab === 'search') {
            await this.loadSearchOptions();
        }
    },

    switchSubTab(subtab) {
        this.currentSubTab = subtab;
        
        // Update active sub-tab button
        document.querySelectorAll('.sub-tab-btn').forEach(btn => {
            btn.classList.remove('active', 'border-purple-600', 'text-purple-600');
            btn.classList.add('border-transparent');
        });
        
        const activeBtn = document.querySelector(`[data-subtab="${subtab}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active', 'border-purple-600', 'text-purple-600');
            activeBtn.classList.remove('border-transparent');
        }
        
        // Load appropriate content
        const contentDiv = document.getElementById('webhook-subtab-content');
        if (subtab === 'manage') {
            contentDiv.innerHTML = this.getManageWebhooksHTML();
            this.loadWebhooks();
        } else if (subtab === 'search') {
            contentDiv.innerHTML = this.getSearchDataHTML();
            this.loadSearchOptions();
        }
    },

    toggleDateInputs() {
        const dateType = document.getElementById('dateSearchType').value;
        const singleGroup = document.getElementById('singleDateGroup');
        const rangeGroup = document.getElementById('dateRangeGroup');
        
        if (dateType === 'single') {
            singleGroup.style.display = 'block';
            rangeGroup.style.display = 'none';
        } else if (dateType === 'range') {
            singleGroup.style.display = 'none';
            rangeGroup.style.display = 'grid';
        } else {
            singleGroup.style.display = 'none';
            rangeGroup.style.display = 'none';
        }
    },

    async loadSearchOptions() {
        try {
            // Load webhooks for dropdown
            const webhooksResponse = await fetch(`${API_BASE}/webhooks/list`);
            const webhooks = await webhooksResponse.json();
            
            const webhookSelect = document.getElementById('searchWebhook');
            if (webhookSelect) {
                webhookSelect.innerHTML = '<option value="">All Webhooks</option>';
                webhooks.data.forEach(webhook => {
                    webhookSelect.innerHTML += `<option value="${webhook.name}">${webhook.name}</option>`;
                });
            }
            
            // Load unique scanners and tags from webhook data
            const dataResponse = await fetch(`${API_BASE}/data/search-options`);
            if (dataResponse.ok) {
                const options = await dataResponse.json();
                
                // Populate scanner dropdown
                const scannerSelect = document.getElementById('searchScanner');
                if (scannerSelect && options.scanners) {
                    scannerSelect.innerHTML = '<option value="">All Scanners</option>';
                    options.scanners.forEach(scanner => {
                        scannerSelect.innerHTML += `<option value="${scanner}">${scanner}</option>`;
                    });
                }
                
                // Populate tags dropdown
                const tagSelect = document.getElementById('searchTag');
                if (tagSelect && options.tags) {
                    tagSelect.innerHTML = '<option value="">All Tags</option>';
                    options.tags.forEach(tag => {
                        tagSelect.innerHTML += `<option value="${tag}">${tag}</option>`;
                    });
                }
            }
            
            // Set default date to today
            const today = new Date().toISOString().split('T')[0];
            const searchDate = document.getElementById('searchDate');
            if (searchDate) {
                searchDate.value = today;
            }
            
        } catch (error) {
            console.error('Error loading search options:', error);
        }
    },

    async performSearch() {
        showLoading();
        
        try {
            const dateType = document.getElementById('dateSearchType').value;
            const searchParams = new URLSearchParams();
            
            // Date parameters
            if (dateType === 'single') {
                const date = document.getElementById('searchDate').value;
                if (date) searchParams.append('date', date);
            } else if (dateType === 'range') {
                const startDate = document.getElementById('startDate').value;
                const endDate = document.getElementById('endDate').value;
                if (startDate) searchParams.append('startDate', startDate);
                if (endDate) searchParams.append('endDate', endDate);
            }
            
            // Other filters
            const webhook = document.getElementById('searchWebhook').value;
            const scanner = document.getElementById('searchScanner').value;
            const tag = document.getElementById('searchTag').value;
            const stockSet = document.getElementById('searchStockSet').value;
            const limit = document.getElementById('searchLimit').value;
            
            if (webhook) searchParams.append('webhook', webhook);
            if (scanner) searchParams.append('scanner', scanner);
            if (tag) searchParams.append('tag', tag);
            if (stockSet) searchParams.append('stockSet', stockSet);
            if (limit) searchParams.append('limit', limit);
            
            const response = await fetch(`${API_BASE}/data/search?${searchParams}`);
            const result = await response.json();
            
            if (result.success) {
                this.displaySearchResults(result.data);
                document.getElementById('exportBtn').style.display = result.data.length > 0 ? 'block' : 'none';
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            showError('Error searching data: ' + error.message);
        } finally {
            hideLoading();
        }
    },

    displaySearchResults(data) {
        const resultsDiv = document.getElementById('searchResults');
        
        if (!data || data.length === 0) {
            resultsDiv.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-search text-4xl mb-4"></i>
                    <p>No data found matching your search criteria</p>
                </div>
            `;
            return;
        }
        
        const resultsHTML = `
            <div class="bg-white rounded-lg shadow-md overflow-hidden">
                <div class="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <div class="flex justify-between items-center">
                        <h3 class="text-lg font-semibold text-gray-800">
                            <i class="fas fa-chart-bar mr-2"></i>Search Results
                        </h3>
                        <span class="text-sm text-gray-600">${data.length} results found</span>
                    </div>
                </div>
                
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Webhook</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scanner</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stocks</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Triggered At</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${data.map(item => `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.date}</td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="text-sm font-medium text-gray-900">${item.webhookName}</div>
                                        ${item.webhookDescription ? `<div class="text-sm text-gray-500">${item.webhookDescription}</div>` : ''}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.scanName || 'N/A'}</td>
                                    <td class="px-6 py-4 text-sm text-gray-900">
                                        <div class="flex flex-wrap gap-1">
                                            ${(item.stocks || []).slice(0, 3).map(stock => 
                                                `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">${stock}</span>`
                                            ).join('')}
                                            ${(item.stocks || []).length > 3 ? `<span class="text-xs text-gray-500">+${(item.stocks || []).length - 3} more</span>` : ''}
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.triggeredAt || 'N/A'}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button onclick="WebhooksModule.viewDetails('${item.id}')" class="text-purple-600 hover:text-purple-900 mr-3">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        <button onclick="WebhooksModule.deleteSearchData('${item.id}')" class="text-red-600 hover:text-red-900">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        resultsDiv.innerHTML = resultsHTML;
    },

    clearSearch() {
        document.getElementById('webhookSearchForm').reset();
        document.getElementById('dateSearchType').value = 'single';
        this.toggleDateInputs();
        
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('searchDate').value = today;
        
        // Clear results
        document.getElementById('searchResults').innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-search text-4xl mb-4"></i>
                <p>Use the search form above to find webhook data</p>
            </div>
        `;
        
        document.getElementById('exportBtn').style.display = 'none';
    },

    async viewDetails(id) {
        try {
            const response = await fetch(`${API_BASE}/data/${id}`);
            const result = await response.json();
            
            if (result.success) {
                const data = result.data;
                const modalHTML = `
                    <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" id="detailModal">
                        <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
                            <div class="mt-3">
                                <div class="flex justify-between items-center mb-4">
                                    <h3 class="text-lg font-bold text-gray-900">Webhook Data Details</h3>
                                    <button onclick="document.getElementById('detailModal').remove()" class="text-gray-400 hover:text-gray-600">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                                <div class="space-y-4">
                                    <div class="grid grid-cols-2 gap-4">
                                        <div>
                                            <strong>Date:</strong> ${data.date}
                                        </div>
                                        <div>
                                            <strong>Webhook:</strong> ${data.webhookName}
                                        </div>
                                        <div>
                                            <strong>Scanner:</strong> ${data.scanName || 'N/A'}
                                        </div>
                                        <div>
                                            <strong>Triggered At:</strong> ${data.triggeredAt || 'N/A'}
                                        </div>
                                    </div>
                                    ${data.webhookDescription ? `<div><strong>Description:</strong> ${data.webhookDescription}</div>` : ''}
                                    <div>
                                        <strong>Stocks:</strong>
                                        <div class="flex flex-wrap gap-2 mt-2">
                                            ${(data.stocks || []).map(stock => 
                                                `<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">${stock}</span>`
                                            ).join('')}
                                        </div>
                                    </div>
                                    ${data.triggerPrices && data.triggerPrices.length > 0 ? `
                                        <div>
                                            <strong>Trigger Prices:</strong> ${data.triggerPrices.join(', ')}
                                        </div>
                                    ` : ''}
                                    ${data.tags && data.tags.length > 0 ? `
                                        <div>
                                            <strong>Tags:</strong>
                                            <div class="flex flex-wrap gap-2 mt-2">
                                                ${data.tags.map(tag => 
                                                    `<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">${tag}</span>`
                                                ).join('')}
                                            </div>
                                        </div>
                                    ` : ''}
                                    <div class="text-sm text-gray-500">
                                        <strong>Received At:</strong> ${new Date(data.receivedAt).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                document.body.insertAdjacentHTML('beforeend', modalHTML);
            }
        } catch (error) {
            showError('Error loading details: ' + error.message);
        }
    },

    async deleteSearchData(id) {
        if (!confirm('Are you sure you want to delete this webhook data?')) return;
        
        showLoading();
        
        try {
            const response = await fetch(`${API_BASE}/data/delete/${id}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            if (result.success) {
                showSuccess('Data deleted successfully!');
                await this.performSearch(); // Refresh search results
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            showError('Error deleting data: ' + error.message);
        } finally {
            hideLoading();
        }
    },

    async exportResults() {
        // Implementation for exporting search results
        try {
            const searchParams = new URLSearchParams(location.search);
            const response = await fetch(`${API_BASE}/data/export?${searchParams}`);
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `webhook-data-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                showSuccess('Data exported successfully!');
            } else {
                throw new Error('Export failed');
            }
        } catch (error) {
            showError('Error exporting data: ' + error.message);
        }
    },

    async loadStats() {
        try {
            const response = await fetch(`${API_BASE}/webhooks/stats`);
            const result = await response.json();
            
            if (result.success) {
                document.getElementById('totalWebhooks').textContent = result.data.totalWebhooks || 0;
                document.getElementById('totalData').textContent = result.data.totalData || 0;
                document.getElementById('todayData').textContent = result.data.todayData || 0;
                document.getElementById('activeTemplates').textContent = result.data.activeTemplates || 0;
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    },

    async loadWebhooks() {
        showLoading();
        
        try {
            const response = await apiFetch(`${API_BASE}/webhooks/list`);
            const result = await response.json();
            
            if (result.success) {
                this.webhooks = result.data;
                this.displayWebhooks();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            showError('Error loading webhooks: ' + error.message);
        } finally {
            hideLoading();
        }
    },

    displayWebhooks() {
        const container = document.getElementById('webhooksList');
        
        if (!this.webhooks || this.webhooks.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-webhook text-4xl mb-4"></i>
                    <p>No webhooks found. Create your first webhook above.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.webhooks.map(webhook => `
            <div class="bg-white rounded-lg shadow-md p-6 mb-4">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <h3 class="text-lg font-semibold text-gray-800 mb-2">
                            <i class="fas fa-webhook mr-2 text-purple-600"></i>${webhook.name}
                        </h3>
                        ${webhook.description ? `<p class="text-sm text-gray-600 mt-1 italic">
                            <i class="fas fa-info-circle mr-1"></i>${webhook.description}
                        </p>` : ''}
                        <p class="text-sm text-gray-600 mt-1">
                            <i class="fas fa-layer-group mr-1"></i>Stock Set: ${webhook.stockSet}
                        </p>
                        <p class="text-sm text-gray-600 mt-1">
                            <i class="fas fa-tags mr-1"></i>Tags: ${webhook.tags.join(', ') || 'None'}
                        </p>
                        <div class="flex items-center mt-2">
                            <p class="text-sm text-gray-600">
                                <i class="fas fa-link mr-1"></i>URL: 
                                <code class="bg-gray-100 px-2 py-1 rounded text-xs">${webhook.webhookUrl}</code>
                            </p>
                            <button onclick="WebhooksModule.copyUrl('${webhook.webhookUrl}')" class="ml-2 text-purple-600 hover:text-purple-800 transition-colors" title="Copy URL">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                        ${webhook.possibleOutput ? `<p class="text-sm text-gray-700 mt-2 italic">
                            <i class="fas fa-comment-alt mr-1"></i>"${webhook.possibleOutput}"
                        </p>` : ''}
                        <p class="text-xs text-gray-500 mt-2">
                            <i class="fas fa-clock mr-1"></i>Created: ${new Date(webhook.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                    <div class="flex gap-2 ml-4">
                        <button onclick="WebhooksModule.editWebhook('${webhook.id}')" class="text-blue-600 hover:text-blue-800 transition-colors">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="WebhooksModule.deleteWebhook('${webhook.id}')" class="text-red-600 hover:text-red-800 transition-colors">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    },

    async saveWebhook() {
        const webhookId = document.getElementById('webhookId').value;
        const webhookData = {
            name: document.getElementById('webhookName').value,
            stockSet: document.getElementById('stockSet').value,
            tags: document.getElementById('webhookTags').value.split(',').map(tag => tag.trim()).filter(tag => tag),
            possibleOutput: document.getElementById('possibleOutput').value,
            description: document.getElementById('webhookDescription').value
        };
        
        showLoading();
        
        try {
            const url = webhookId ? `${API_BASE}/webhooks/update/${webhookId}` : `${API_BASE}/webhooks/create`;
            const method = webhookId ? 'PUT' : 'POST';
            
            const response = await apiFetch(url, {
                method: method,
                body: JSON.stringify(webhookData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showSuccess(webhookId ? 'Webhook updated successfully!' : 'Webhook created successfully!');
                document.getElementById('webhookForm').reset();
                document.getElementById('webhookId').value = '';
                document.getElementById('webhookFormTitle').innerHTML = '<i class="fas fa-plus mr-2 text-purple-600"></i>Create New Webhook';
                await this.loadWebhooks();
                await this.loadStats();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            showError('Error saving webhook: ' + error.message);
        } finally {
            hideLoading();
        }
    },

    copyUrl(url) {
        navigator.clipboard.writeText(url).then(() => {
            showSuccess('Webhook URL copied to clipboard!');
        }).catch(() => {
            showError('Failed to copy URL');
        });
    },

    async editWebhook(id) {
        try {
            const webhook = this.webhooks.find(w => w.id === id);
            if (webhook) {
                document.getElementById('webhookFormTitle').innerHTML = '<i class="fas fa-edit mr-2 text-purple-600"></i>Edit Webhook';
                document.getElementById('webhookId').value = webhook.id;
                document.getElementById('webhookName').value = webhook.name;
                document.getElementById('stockSet').value = webhook.stockSet;
                document.getElementById('webhookDescription').value = webhook.description || '';
                document.getElementById('webhookTags').value = webhook.tags.join(', ');
                document.getElementById('possibleOutput').value = webhook.possibleOutput || '';
                
                // Scroll to form
                document.getElementById('webhookForm').scrollIntoView({ behavior: 'smooth' });
            }
        } catch (error) {
            showError('Error loading webhook: ' + error.message);
        }
    },

    async deleteWebhook(id) {
        if (!confirm('Are you sure you want to delete this webhook?')) return;
        
        showLoading();
        
        try {
            const response = await apiFetch(`${API_BASE}/webhooks/delete/${id}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            if (result.success) {
                showSuccess('Webhook deleted successfully!');
                await this.loadWebhooks();
                await this.loadStats();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            showError('Error deleting webhook: ' + error.message);
        } finally {
            hideLoading();
        }
    }
};

// Make module globally available
window.WebhooksModule = WebhooksModule;