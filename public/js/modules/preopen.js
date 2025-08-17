// js/modules/preopen.js - Updated with Gap News Fetch Button

const PreopenModule = {
    currentPreopenTab: 'overview',
    currentDate: null,
    preopenData: null,
    newsFetchInProgress: false,
    
    getHTML() {
        return `
            <div class="space-y-6">
                <!-- Pre-Open Analysis Header -->
                <div class="card p-6">
                    <h2 class="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                        <i class="fas fa-sun mr-3 text-yellow-500"></i>
                        Pre-Open Market Analysis
                    </h2>
                    
                    <!-- Date Selection -->
                    <div class="flex items-center gap-4 mb-6">
                        <label class="text-sm font-medium text-gray-700">Analysis Date:</label>
                        <input type="date" id="preopenDate" class="px-3 py-2 border border-gray-300 rounded-lg input-field" 
                               value="${new Date().toISOString().split('T')[0]}"
                               onchange="PreopenModule.onDateChange()">
                        <button onclick="PreopenModule.loadData()" 
                                class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                            <i class="fas fa-sync-alt mr-2"></i>Load Data
                        </button>
                    </div>
                    
                    <!-- Tab Navigation -->
                    <div class="flex flex-wrap gap-2 mb-6">
                        <button class="preopen-tab-btn px-4 py-2 rounded-lg font-medium bg-blue-500 text-white" 
                                data-tab="overview" onclick="PreopenModule.switchTab('overview')">
                            <i class="fas fa-chart-line mr-2"></i>Overview
                        </button>
                        <button class="preopen-tab-btn px-4 py-2 rounded-lg font-medium bg-gray-200 text-gray-700" 
                                data-tab="spreads" onclick="PreopenModule.switchTab('spreads')">
                            <i class="fas fa-compress-alt mr-2"></i>Low Spreads
                        </button>
                        <button class="preopen-tab-btn px-4 py-2 rounded-lg font-medium bg-gray-200 text-gray-700" 
                                data-tab="volume" onclick="PreopenModule.switchTab('volume')">
                            <i class="fas fa-chart-bar mr-2"></i>Volume Analysis
                        </button>
                        <button class="preopen-tab-btn px-4 py-2 rounded-lg font-medium bg-gray-200 text-gray-700" 
                                data-tab="gaps" onclick="PreopenModule.switchTab('gaps')">
                            <i class="fas fa-chart-area mr-2"></i>Gap Analysis with News
                        </button>
                        <button class="preopen-tab-btn px-4 py-2 rounded-lg font-medium bg-gray-200 text-gray-700" 
                                data-tab="industry" onclick="PreopenModule.switchTab('industry')">
                            <i class="fas fa-industry mr-2"></i>Industry Analysis
                        </button>
                        <button class="preopen-tab-btn px-4 py-2 rounded-lg font-medium bg-gray-200 text-gray-700" 
                                data-tab="imbalance" onclick="PreopenModule.switchTab('imbalance')">
                            <i class="fas fa-balance-scale mr-2"></i>Volume Imbalance
                        </button>
                    </div>
                    
                    <!-- Tab Content -->
                    <div id="preopenTabContent">
                        <!-- Content will be loaded here -->
                    </div>
                </div>
            </div>
        `;
    },
    
    async initialize() {
        console.log('Initializing Pre-Open Module...');
        this.currentDate = new Date().toISOString().split('T')[0];
        await this.loadData();
        this.switchTab('overview');
    },
    
    onDateChange() {
        this.currentDate = document.getElementById('preopenDate').value;
    },
    
    async loadData() {
        const date = document.getElementById('preopenDate').value;
        this.currentDate = date;
        
        try {
            showLoading();
            
            // Load preopen data for the selected date
            const response = await fetch(`${API_BASE}/preopen/data/${date}`);
            const result = await response.json();
            
            if (result.success) {
                this.preopenData = result.data;
                showSuccess(`Data loaded for ${date}`);
                // Refresh current tab
                this.switchTab(this.currentPreopenTab);
            } else {
                this.preopenData = null;
                showError(result.error || `No data available for ${date}`);
                document.getElementById('preopenTabContent').innerHTML = `
                    <div class="text-center py-12 text-gray-500">
                        <i class="fas fa-database text-5xl mb-4"></i>
                        <p class="text-lg">No pre-open data available for ${date}</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading pre-open data:', error);
            showError('Error loading pre-open data: ' + error.message);
        } finally {
            hideLoading();
        }
    },
    
    switchTab(tabName) {
        this.currentPreopenTab = tabName;
        
        // Update tab button styles
        document.querySelectorAll('.preopen-tab-btn').forEach(btn => {
            if (btn.dataset.tab === tabName) {
                btn.className = 'preopen-tab-btn px-4 py-2 rounded-lg font-medium bg-blue-500 text-white';
            } else {
                btn.className = 'preopen-tab-btn px-4 py-2 rounded-lg font-medium bg-gray-200 text-gray-700';
            }
        });
        
        // Load tab content
        const contentDiv = document.getElementById('preopenTabContent');
        
        if (!this.preopenData) {
            contentDiv.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <p>Please load data first</p>
                </div>
            `;
            return;
        }
        
        switch(tabName) {
            case 'overview':
                this.loadOverviewContent();
                break;
            case 'spreads':
                this.loadSpreadsContent();
                break;
            case 'volume':
                this.loadVolumeContent();
                break;
            case 'gaps':
                this.loadGapsContent();
                break;
            case 'industry':
                this.loadIndustryContent();
                break;
            case 'imbalance':
                this.loadImbalanceContent();
                break;
        }
    },
    
    loadOverviewContent() {
        const contentDiv = document.getElementById('preopenTabContent');
        
        if (!this.preopenData || !this.preopenData.stocks) {
            contentDiv.innerHTML = '<p class="text-center text-gray-500 py-8">No data available</p>';
            return;
        }
        
        const stocks = this.preopenData.stocks || [];
        const gainers = stocks.filter(s => s.pChange > 0);
        const losers = stocks.filter(s => s.pChange < 0);
        const unchanged = stocks.filter(s => s.pChange === 0);
        
        // Get top gainers and losers
        const topGainers = [...gainers].sort((a, b) => b.pChange - a.pChange).slice(0, 5);
        const topLosers = [...losers].sort((a, b) => a.pChange - b.pChange).slice(0, 5);
        const mostActive = [...stocks].sort((a, b) => (b.finalQuantity || 0) - (a.finalQuantity || 0)).slice(0, 10);
        
        contentDiv.innerHTML = `
            <div class="space-y-6">
                <!-- Statistics Overview -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div class="stats-card p-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-white text-opacity-80 text-sm">Total Stocks</p>
                                <p class="text-2xl font-bold text-white">${this.preopenData.totalStocks}</p>
                            </div>
                            <i class="fas fa-list text-3xl text-white text-opacity-50"></i>
                        </div>
                    </div>
                    <div class="stats-card p-4" style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-white text-opacity-80 text-sm">Gainers</p>
                                <p class="text-2xl font-bold text-white">${this.preopenData.advances}</p>
                            </div>
                            <i class="fas fa-arrow-up text-3xl text-white text-opacity-50"></i>
                        </div>
                    </div>
                    <div class="stats-card p-4" style="background: linear-gradient(135deg, #f56565 0%, #ed8936 100%);">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-white text-opacity-80 text-sm">Losers</p>
                                <p class="text-2xl font-bold text-white">${this.preopenData.declines}</p>
                            </div>
                            <i class="fas fa-arrow-down text-3xl text-white text-opacity-50"></i>
                        </div>
                    </div>
                    <div class="stats-card p-4" style="background: linear-gradient(135deg, #4299e1 0%, #9f7aea 100%);">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-white text-opacity-80 text-sm">Unchanged</p>
                                <p class="text-2xl font-bold text-white">${this.preopenData.unchanged}</p>
                            </div>
                            <i class="fas fa-equals text-3xl text-white text-opacity-50"></i>
                        </div>
                    </div>
                </div>
                
                <!-- Top Gainers and Losers -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Top Gainers -->
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <i class="fas fa-rocket mr-2 text-green-500"></i>Top Gainers
                        </h3>
                        <div class="space-y-2">
                            ${topGainers.map(stock => `
                                <div class="bg-green-50 border border-green-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                                    <div class="flex justify-between items-center">
                                        <div>
                                            <p class="font-semibold text-gray-800">${stock.symbol}</p>
                                            <p class="text-sm text-gray-600">₹${(stock.lastPrice || stock.finalPrice || 0).toFixed(2)}</p>
                                        </div>
                                        <div class="text-right">
                                            <p class="text-green-600 font-semibold">+${stock.pChange.toFixed(2)}%</p>
                                            <p class="text-xs text-gray-500">Vol: ${((stock.finalQuantity || 0) / 1000).toFixed(0)}K</p>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- Top Losers -->
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <i class="fas fa-chart-down mr-2 text-red-500"></i>Top Losers
                        </h3>
                        <div class="space-y-2">
                            ${topLosers.map(stock => `
                                <div class="bg-red-50 border border-red-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                                    <div class="flex justify-between items-center">
                                        <div>
                                            <p class="font-semibold text-gray-800">${stock.symbol}</p>
                                            <p class="text-sm text-gray-600">₹${(stock.lastPrice || stock.finalPrice || 0).toFixed(2)}</p>
                                        </div>
                                        <div class="text-right">
                                            <p class="text-red-600 font-semibold">${stock.pChange.toFixed(2)}%</p>
                                            <p class="text-xs text-gray-500">Vol: ${((stock.finalQuantity || 0) / 1000).toFixed(0)}K</p>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <!-- Most Active Stocks -->
                <div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <i class="fas fa-fire mr-2 text-orange-500"></i>Most Active Stocks
                    </h3>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volume</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Turnover (Cr)</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${mostActive.map(stock => `
                                    <tr class="hover:bg-gray-50">
                                        <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900">${stock.symbol}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-gray-600">₹${(stock.lastPrice || stock.finalPrice || 0).toFixed(2)}</td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <span class="${stock.pChange >= 0 ? 'text-green-600' : 'text-red-600'} font-medium">
                                                ${stock.pChange >= 0 ? '+' : ''}${stock.pChange.toFixed(2)}%
                                            </span>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-gray-600">${((stock.finalQuantity || 0) / 1000000).toFixed(2)}M</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-gray-600">₹${((stock.totalTurnover || 0) / 10000000).toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },
    
    // Keep all your existing methods for spreads, volume, industry, imbalance...
    // I'll focus on the updated gaps content below
    
    async loadGapsContent() {
        try {
            showLoading();
            const response = await fetch(`${API_BASE}/preopen/analysis/gaps/${this.currentDate}`);
            const result = await response.json();
            hideLoading();
            
            const contentDiv = document.getElementById('preopenTabContent');
            
            if (!result.success) {
                contentDiv.innerHTML = '<p class="text-center text-gray-500 py-8">No gap analysis data available</p>';
                return;
            }
            
            // Store data for operations
            this.gapAnalysisData = result.data;
            
            // Limit to 7 stocks per category and sort by change percentage
            const strongGapUp = result.data.strongGapUp.slice(0, 7);
            const moderateGapUp = result.data.moderateGapUp.slice(0, 7);
            const moderateGapDown = result.data.moderateGapDown.slice(0, 7);
            const strongGapDown = result.data.strongGapDown.slice(0, 7);
            
            contentDiv.innerHTML = `
                <div class="space-y-6">
                    <div class="flex justify-between items-center">
                        <h3 class="text-lg font-semibold text-gray-800 flex items-center">
                            <i class="fas fa-chart-area mr-2 text-orange-500"></i>
                            Gap Analysis with AI News
                        </h3>
                        <div class="flex gap-2">
                            <button onclick="PreopenModule.copyGapsToTradingView()" 
                                    class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                                <i class="fas fa-copy mr-2"></i>Copy to TradingView
                            </button>
                            <button onclick="PreopenModule.fetchGapNews()" 
                                    id="fetchGapNewsBtn"
                                    class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                    ${this.newsFetchInProgress ? 'disabled' : ''}>
                                <i class="fas fa-newspaper mr-2"></i>
                                <span id="fetchNewsText">Fetch Gap News</span>
                            </button>
                        </div>
                    </div>
                    
                    <!-- News Fetch Progress -->
                    <div id="newsFetchProgress" class="hidden bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div class="flex items-center space-x-4 mb-3">
                            <div class="flex-shrink-0">
                                <div class="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                            <div class="flex-1">
                                <h4 class="font-semibold text-blue-900">Fetching Gap News...</h4>
                                <span id="newsProgressText" class="text-blue-700 text-sm">Starting...</span>
                            </div>
                            <div class="text-right">
                                <div class="text-sm text-blue-600 font-medium" id="newsProgressCount">0/0</div>
                            </div>
                        </div>
                        <div class="bg-blue-100 rounded-lg p-3 max-h-32 overflow-y-auto" id="newsProgressLog">
                            <!-- Progress messages will appear here -->
                        </div>
                    </div>
                    
                    <!-- Summary Cards -->
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div class="bg-green-100 rounded-lg p-4">
                            <p class="text-sm text-green-700">Strong Gap Up (>3%)</p>
                            <p class="text-2xl font-bold text-green-800">${result.data.summary.strongGapUpCount}</p>
                        </div>
                        <div class="bg-green-50 rounded-lg p-4">
                            <p class="text-sm text-green-600">Moderate Gap Up (1-3%)</p>
                            <p class="text-2xl font-bold text-green-700">${result.data.summary.moderateGapUpCount}</p>
                        </div>
                        <div class="bg-red-50 rounded-lg p-4">
                            <p class="text-sm text-red-600">Moderate Gap Down (-1% to -3%)</p>
                            <p class="text-2xl font-bold text-red-700">${result.data.summary.moderateGapDownCount}</p>
                        </div>
                        <div class="bg-red-100 rounded-lg p-4">
                            <p class="text-sm text-red-700">Strong Gap Down (<-3%)</p>
                            <p class="text-2xl font-bold text-red-800">${result.data.summary.strongGapDownCount}</p>
                        </div>
                    </div>
                    
                    <!-- Gap Tables - 4 Columns with max 7 stocks each -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <!-- Strong Gap Up (>3%) -->
                        <div>
                            <h4 class="font-semibold text-gray-700 mb-3 text-sm">Strong Gap Up (>3%)</h4>
                            <div class="space-y-1">
                                ${strongGapUp.map(stock => `
                                    <div class="bg-green-50 border border-green-200 rounded-lg p-2 hover:shadow-md transition-shadow cursor-pointer"
                                         onclick="PreopenModule.showGapNewsPopup('${stock.symbol}', '${this.currentDate}')">
                                        <div class="flex justify-between items-center">
                                            <span class="text-sm font-medium text-gray-800">${stock.symbol}</span>
                                            <span class="px-2 py-1 bg-green-600 text-white rounded text-xs font-semibold">
                                                +${stock.gap}%
                                            </span>
                                        </div>
                                        <div class="text-xs text-gray-500 mt-1">
                                            <span id="newsStatus_${stock.symbol}">Click for news</span>
                                        </div>
                                    </div>
                                `).join('')}
                                ${strongGapUp.length === 0 ? '<p class="text-center text-gray-400 text-sm py-4">No stocks</p>' : ''}
                            </div>
                        </div>
                        
                        <!-- Moderate Gap Up (1-3%) -->
                        <div>
                            <h4 class="font-semibold text-gray-700 mb-3 text-sm">Moderate Gap Up (1-3%)</h4>
                            <div class="space-y-1">
                                ${moderateGapUp.map(stock => `
                                    <div class="bg-green-50 border border-green-200 rounded-lg p-2 hover:shadow-md transition-shadow cursor-pointer"
                                         onclick="PreopenModule.showGapNewsPopup('${stock.symbol}', '${this.currentDate}')">
                                        <div class="flex justify-between items-center">
                                            <span class="text-sm font-medium text-gray-800">${stock.symbol}</span>
                                            <span class="px-2 py-1 bg-green-500 text-white rounded text-xs font-semibold">
                                                +${stock.gap}%
                                            </span>
                                        </div>
                                        <div class="text-xs text-gray-500 mt-1">
                                            <span id="newsStatus_${stock.symbol}">Click for news</span>
                                        </div>
                                    </div>
                                `).join('')}
                                ${moderateGapUp.length === 0 ? '<p class="text-center text-gray-400 text-sm py-4">No stocks</p>' : ''}
                            </div>
                        </div>
                        
                        <!-- Moderate Gap Down (-1% to -3%) -->
                        <div>
                            <h4 class="font-semibold text-gray-700 mb-3 text-sm">Moderate Gap Down (-1% to -3%)</h4>
                            <div class="space-y-1">
                                ${moderateGapDown.map(stock => `
                                    <div class="bg-red-50 border border-red-200 rounded-lg p-2 hover:shadow-md transition-shadow cursor-pointer"
                                         onclick="PreopenModule.showGapNewsPopup('${stock.symbol}', '${this.currentDate}')">
                                        <div class="flex justify-between items-center">
                                            <span class="text-sm font-medium text-gray-800">${stock.symbol}</span>
                                            <span class="px-2 py-1 bg-red-500 text-white rounded text-xs font-semibold">
                                                ${stock.gap}%
                                            </span>
                                        </div>
                                        <div class="text-xs text-gray-500 mt-1">
                                            <span id="newsStatus_${stock.symbol}">Click for news</span>
                                        </div>
                                    </div>
                                `).join('')}
                                ${moderateGapDown.length === 0 ? '<p class="text-center text-gray-400 text-sm py-4">No stocks</p>' : ''}
                            </div>
                        </div>
                        
                        <!-- Strong Gap Down (<-3%) -->
                        <div>
                            <h4 class="font-semibold text-gray-700 mb-3 text-sm">Strong Gap Down (<-3%)</h4>
                            <div class="space-y-1">
                                ${strongGapDown.map(stock => `
                                    <div class="bg-red-50 border border-red-200 rounded-lg p-2 hover:shadow-md transition-shadow cursor-pointer"
                                         onclick="PreopenModule.showGapNewsPopup('${stock.symbol}', '${this.currentDate}')">
                                        <div class="flex justify-between items-center">
                                            <span class="text-sm font-medium text-gray-800">${stock.symbol}</span>
                                            <span class="px-2 py-1 bg-red-600 text-white rounded text-xs font-semibold">
                                                ${stock.gap}%
                                            </span>
                                        </div>
                                        <div class="text-xs text-gray-500 mt-1">
                                            <span id="newsStatus_${stock.symbol}">Click for news</span>
                                        </div>
                                    </div>
                                `).join('')}
                                ${strongGapDown.length === 0 ? '<p class="text-center text-gray-400 text-sm py-4">No stocks</p>' : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            hideLoading();
            document.getElementById('preopenTabContent').innerHTML = `
                <p class="text-center text-red-500 py-8">Error loading gap analysis: ${error.message}</p>
            `;
        }
    },

    async fetchGapNews() {
        if (this.newsFetchInProgress) {
            showError('News fetch already in progress');
            return;
        }

        if (!this.gapAnalysisData) {
            showError('No gap data available. Please load preopen data first.');
            return;
        }

        this.newsFetchInProgress = true;
        const btn = document.getElementById('fetchGapNewsBtn');
        const btnText = document.getElementById('fetchNewsText');
        const progressDiv = document.getElementById('newsFetchProgress');
        
        btn.disabled = true;
        btnText.textContent = 'Fetching...';
        progressDiv.classList.remove('hidden');
        
        try {
            // Collect all gap stocks
            const allGapStocks = [
                ...this.gapAnalysisData.strongGapUp.slice(0, 7).map(s => ({...s, gapType: 'Strong Up'})),
                ...this.gapAnalysisData.moderateGapUp.slice(0, 7).map(s => ({...s, gapType: 'Moderate Up'})),
                ...this.gapAnalysisData.moderateGapDown.slice(0, 7).map(s => ({...s, gapType: 'Moderate Down'})),
                ...this.gapAnalysisData.strongGapDown.slice(0, 7).map(s => ({...s, gapType: 'Strong Down'}))
            ];

            if (allGapStocks.length === 0) {
                showError('No gap stocks found for news fetching');
                return;
            }

            console.log(`📰 Starting news fetch for ${allGapStocks.length} gap stocks`);

            // Start the SSE fetch
            const response = await fetch('/api/stock-news/fetch-gap-news-batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stocks: allGapStocks,
                    date: this.currentDate
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim() && line.startsWith('data: '));

                for (const line of lines) {
                    try {
                        const data = JSON.parse(line.substring(6)); // Remove 'data: '
                        this.handleNewsProgress(data);
                    } catch (e) {
                        console.warn('Failed to parse SSE data:', line);
                    }
                }
            }

        } catch (error) {
            console.error('News fetch error:', error);
            showError('News fetch failed: ' + error.message);
            this.addNewsProgressLog(`❌ Error: ${error.message}`);
        } finally {
            this.newsFetchInProgress = false;
            btn.disabled = false;
            btnText.textContent = 'Fetch Gap News';
            
            setTimeout(() => {
                progressDiv.classList.add('hidden');
            }, 5000);
        }
    },

    handleNewsProgress(data) {
        const progressText = document.getElementById('newsProgressText');
        const progressCount = document.getElementById('newsProgressCount');
        
        switch(data.type) {
            case 'start':
                progressText.textContent = data.message;
                progressCount.textContent = `0/${data.total}`;
                this.addNewsProgressLog('🚀 ' + data.message);
                break;
                
            case 'progress':
                progressText.textContent = data.message;
                progressCount.textContent = `${data.current}/${data.total}`;
                this.addNewsProgressLog('🔄 ' + data.message);
                break;
                
            case 'stock_complete':
                const statusElement = document.getElementById(`newsStatus_${data.symbol}`);
                if (statusElement) {
                    if (data.status === 'cached') {
                        statusElement.textContent = '📋 Cached';
                        statusElement.className = 'text-xs text-blue-600 mt-1';
                    } else {
                        statusElement.textContent = '✅ News available';
                        statusElement.className = 'text-xs text-green-600 mt-1';
                    }
                }
                this.addNewsProgressLog(`✅ ${data.symbol}: ${data.headline || 'News fetched'}`);
                break;
                
            case 'stock_error':
                const errorStatusElement = document.getElementById(`newsStatus_${data.symbol}`);
                if (errorStatusElement) {
                    errorStatusElement.textContent = '❌ Error';
                    errorStatusElement.className = 'text-xs text-red-600 mt-1';
                }
                this.addNewsProgressLog(`❌ ${data.symbol}: ${data.message}`);
                break;
                
            case 'complete':
                progressText.textContent = data.message;
                this.addNewsProgressLog('🎉 ' + data.message);
                showSuccess(`News fetch completed! ${data.summary.successful}/${data.summary.total} successful`);
                break;
                
            case 'error':
                progressText.textContent = data.message;
                this.addNewsProgressLog('❌ ' + data.message);
                showError(data.message);
                break;
        }
    },

    addNewsProgressLog(message) {
        const logDiv = document.getElementById('newsProgressLog');
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = 'text-xs text-gray-700 py-1 border-b border-blue-200 last:border-b-0';
        logEntry.innerHTML = `<span class="text-blue-400">${timestamp}</span> ${message}`;
        logDiv.appendChild(logEntry);
        logDiv.scrollTop = logDiv.scrollHeight;
    },

    async showGapNewsPopup(symbol, date) {
        try {
            showLoading();
            const response = await fetch(`/api/stock-news/gap-news/${symbol}/${date}`);
            const result = await response.json();
            hideLoading();
            
            if (result.success) {
                const news = result.data;
                this.createGapNewsPopup(news);
            } else {
                // Show no news popup
                this.createNoNewsPopup(symbol, date);
            }
        } catch (error) {
            hideLoading();
            showError('Error fetching gap news: ' + error.message);
        }
    },

    createGapNewsPopup(news) {
        // Remove existing popup
        const existingPopup = document.getElementById('gapNewsPopup');
        if (existingPopup) {
            existingPopup.remove();
        }
        
        const popup = document.createElement('div');
        popup.id = 'gapNewsPopup';
        popup.className = 'fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4';
        popup.innerHTML = `
            <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h2 class="text-xl font-bold text-gray-900">${news.symbol} Gap News</h2>
                            <p class="text-sm text-gray-600">${news.companyName || news.symbol}</p>
                        </div>
                        <button onclick="document.getElementById('gapNewsPopup').remove()" 
                                class="text-gray-400 hover:text-gray-600">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <!-- Gap Information -->
                    <div class="bg-gray-50 rounded-lg p-4 mb-4">
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <span class="text-gray-600">Gap:</span>
                                <p class="font-semibold ${news.gapPercent > 0 ? 'text-green-600' : 'text-red-600'}">
                                    ${news.gapPercent > 0 ? '+' : ''}${news.gapPercent}%
                                </p>
                            </div>
                            <div>
                                <span class="text-gray-600">Type:</span>
                                <p class="font-semibold">${news.gapType}</p>
                            </div>
                            <div>
                                <span class="text-gray-600">Confidence:</span>
                                <p class="font-semibold">${news.confidence}</p>
                            </div>
                            <div>
                                <span class="text-gray-600">Sentiment:</span>
                                <p class="font-semibold ${this.getSentimentColorText(news.sentiment)}">${news.sentiment}</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- News Content -->
                    <div class="space-y-4">
                        <div>
                            <h3 class="font-semibold text-gray-800 mb-2">Headline</h3>
                            <p class="text-gray-700">${news.headline}</p>
                        </div>
                        
                        <div>
                            <h3 class="font-semibold text-gray-800 mb-2">Reason</h3>
                            <p class="text-gray-700">${news.reason}</p>
                        </div>
                        
                        ${news.details ? `
                        <div>
                            <h3 class="font-semibold text-gray-800 mb-2">Details</h3>
                            <p class="text-gray-700">${news.details}</p>
                        </div>
                        ` : ''}
                        
                        <div>
                            <h3 class="font-semibold text-gray-800 mb-2">Price Action</h3>
                            <p class="text-gray-700">${news.priceAction}</p>
                        </div>
                        
                        <div class="text-xs text-gray-500 pt-4 border-t">
                            <p>Category: ${news.newsCategory}</p>
                            <p>Source: ${news.source}</p>
                            <p>Date: ${news.date}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Close on backdrop click
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                popup.remove();
            }
        });
    },

    createNoNewsPopup(symbol, date) {
        // Remove existing popup
        const existingPopup = document.getElementById('gapNewsPopup');
        if (existingPopup) {
            existingPopup.remove();
        }
        
        const popup = document.createElement('div');
        popup.id = 'gapNewsPopup';
        popup.className = 'fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4';
        popup.innerHTML = `
            <div class="bg-white rounded-lg max-w-md w-full">
                <div class="p-6 text-center">
                    <div class="flex justify-between items-start mb-4">
                        <h2 class="text-xl font-bold text-gray-900">${symbol} Gap News</h2>
                        <button onclick="document.getElementById('gapNewsPopup').remove()" 
                                class="text-gray-400 hover:text-gray-600">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <div class="text-center py-8">
                        <i class="fas fa-newspaper text-4xl text-gray-400 mb-4"></i>
                        <h3 class="text-lg font-semibold text-gray-800 mb-2">No News Available</h3>
                        <p class="text-gray-600 mb-4">
                            No AI-analyzed news found for <strong>${symbol}</strong> on ${date}.
                        </p>
                        <p class="text-sm text-gray-500 mb-4">
                            This could mean:
                        </p>
                        <ul class="text-sm text-gray-500 text-left space-y-1 mb-6">
                            <li>• News hasn't been fetched yet for this stock</li>
                            <li>• No specific news was found for this gap</li>
                            <li>• The gap was due to technical or sector movements</li>
                        </ul>
                        <button onclick="PreopenModule.fetchGapNews()" 
                                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            <i class="fas fa-sync mr-2"></i>Fetch Gap News
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Close on backdrop click
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                popup.remove();
            }
        });
    },

    getSentimentColorText(sentiment) {
        const colors = {
            'Bullish': 'text-green-600',
            'Bearish': 'text-red-600',
            'Neutral': 'text-gray-600'
        };
        return colors[sentiment] || 'text-gray-600';
    },
    
    copyGapsToTradingView() {
        if (!this.gapAnalysisData) {
            showError('No gap analysis data available');
            return;
        }
        
        // Format exactly as TradingView expects with max 7 stocks per category
        const strongGapUp = this.gapAnalysisData.strongGapUp
            .slice(0, 7)
            .map(s => 'NSE:' + s.symbol)
            .join(',');
        
        const moderateGapUp = this.gapAnalysisData.moderateGapUp
            .slice(0, 7)
            .map(s => 'NSE:' + s.symbol)
            .join(',');
        
        const moderateGapDown = this.gapAnalysisData.moderateGapDown
            .slice(0, 7)
            .map(s => 'NSE:' + s.symbol)
            .join(',');
        
        const strongGapDown = this.gapAnalysisData.strongGapDown
            .slice(0, 7)
            .map(s => 'NSE:' + s.symbol)
            .join(',');
        
        // Build the TradingView format string
        let tradingViewFormat = '';
        
        if (strongGapUp) {
            tradingViewFormat += '###STRONG GAP UP,' + strongGapUp;
        }
        
        if (moderateGapUp) {
            if (tradingViewFormat) tradingViewFormat += ',';
            tradingViewFormat += '###MODERATE GAP UP,' + moderateGapUp;
        }
        
        if (moderateGapDown) {
            if (tradingViewFormat) tradingViewFormat += ',';
            tradingViewFormat += '###MODERATE GAP DOWN,' + moderateGapDown;
        }
        
        if (strongGapDown) {
            if (tradingViewFormat) tradingViewFormat += ',';
            tradingViewFormat += '###STRONG GAP DOWN,' + strongGapDown;
        }
        
        // Copy to clipboard
        navigator.clipboard.writeText(tradingViewFormat).then(() => {
            const totalStocks = 
                Math.min(7, this.gapAnalysisData.strongGapUp.length) +
                Math.min(7, this.gapAnalysisData.moderateGapUp.length) +
                Math.min(7, this.gapAnalysisData.moderateGapDown.length) +
                Math.min(7, this.gapAnalysisData.strongGapDown.length);
            
            showSuccess(`Copied ${totalStocks} gap stocks to clipboard in TradingView format!`);
        }).catch(err => {
            console.error('Failed to copy:', err);
            showError('Failed to copy to clipboard');
        });
    },
    
    // Keep all your existing methods for spreads, volume, industry, imbalance
    // (I'll skip including them here to keep the response concise, but they remain unchanged)
    
    async loadSpreadsContent() {
        // Your existing spreads content code...
    },
    
    async loadVolumeContent() {
        // Your existing volume content code...
    },
    
    async loadIndustryContent() {
        // Your existing industry content code...
    },
    
    async loadImbalanceContent() {
        // Your existing imbalance content code...
    }
};

// Make module globally available
window.PreopenModule = PreopenModule;