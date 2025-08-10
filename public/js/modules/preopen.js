// js/modules/preopen.js - Corrected to use actual backend endpoints

const PreopenModule = {
    currentPreopenTab: 'overview',
    currentDate: null,
    preopenData: null,
    
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
                            <i class="fas fa-chart-area mr-2"></i>Gap Analysis
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
    
    async loadSpreadsContent() {
        try {
            showLoading();
            const response = await fetch(`${API_BASE}/preopen/analysis/spreads/${this.currentDate}?threshold=1.0`);
            const result = await response.json();
            hideLoading();
            
            const contentDiv = document.getElementById('preopenTabContent');
            
            if (!result.success || !result.data.stocks || result.data.stocks.length === 0) {
                contentDiv.innerHTML = '<p class="text-center text-gray-500 py-8">No low spread stocks found</p>';
                return;
            }
            
            // Store for TradingView
            this.spreadsData = result.data;
            
            contentDiv.innerHTML = `
                <div class="space-y-4">
                    <div class="flex justify-between items-center">
                        <h3 class="text-lg font-semibold text-gray-800 flex items-center">
                            <i class="fas fa-compress-alt mr-2 text-blue-500"></i>
                            Low Spread Stocks (≤ 1%)
                        </h3>
                        <button onclick="PreopenModule.copySpreadStocksToTradingView()" 
                                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            <i class="fas fa-copy mr-2"></i>Copy to TradingView
                        </button>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-blue-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">Symbol</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">Bid Price</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">Ask Price</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">Spread %</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">Change %</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">Volume</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${result.data.stocks.map(stock => `
                                    <tr class="hover:bg-gray-50">
                                        <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900">${stock.symbol}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-gray-600">₹${stock.bidPrice.toFixed(2)}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-gray-600">₹${stock.askPrice.toFixed(2)}</td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                                                ${stock.spread.toFixed(3)}%
                                            </span>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <span class="${stock.changePercent >= 0 ? 'text-green-600' : 'text-red-600'} font-medium">
                                                ${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%
                                            </span>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-gray-600">${(stock.volume / 1000).toFixed(0)}K</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } catch (error) {
            hideLoading();
            document.getElementById('preopenTabContent').innerHTML = `
                <p class="text-center text-red-500 py-8">Error loading spread analysis: ${error.message}</p>
            `;
        }
    },
    
    copySpreadStocksToTradingView() {
        if (!this.spreadsData || !this.spreadsData.stocks) {
            showError('No spread data available');
            return;
        }
        
        const symbols = this.spreadsData.stocks.map(s => 'NSE:' + s.symbol);
        this.copySymbolsToClipboard(symbols, 'Low Spread Stocks');
    },
    
    copySymbolsToClipboard(symbols, title) {
        const tradingViewFormat = symbols.join(',');
        
        navigator.clipboard.writeText(tradingViewFormat).then(() => {
            showSuccess(`Copied ${symbols.length} ${title} to clipboard!`);
            
            // Show instructions modal
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50';
            modal.innerHTML = `
                <div class="bg-white rounded-lg p-6 max-w-md mx-4">
                    <h3 class="text-lg font-semibold mb-4">✅ Symbols Copied!</h3>
                    <p class="text-gray-600 mb-4">${symbols.length} ${title} copied to clipboard</p>
                    <div class="p-3 bg-blue-50 rounded-lg text-sm">
                        <strong>To add to TradingView:</strong><br>
                        1. Open TradingView<br>
                        2. Click on Watchlist<br>
                        3. Click "..." menu → Import List<br>
                        4. Paste the copied symbols<br>
                        5. Click Import
                    </div>
                    <button onclick="this.closest('.fixed').remove()" 
                            class="mt-4 w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                        Got it!
                    </button>
                </div>
            `;
            document.body.appendChild(modal);
            
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.remove();
                }
            }, 10000);
        }).catch(err => {
            console.error('Failed to copy:', err);
            showError('Failed to copy to clipboard');
        });
    },
    
    async loadVolumeContent() {
        try {
            showLoading();
            const response = await fetch(`${API_BASE}/preopen/analysis/volume/${this.currentDate}`);
            const result = await response.json();
            hideLoading();
            
            const contentDiv = document.getElementById('preopenTabContent');
            
            if (!result.success || !result.data.stocks || result.data.stocks.length === 0) {
                contentDiv.innerHTML = '<p class="text-center text-gray-500 py-8">No volume data available</p>';
                return;
            }
            
            contentDiv.innerHTML = `
                <div class="space-y-4">
                    <h3 class="text-lg font-semibold text-gray-800 flex items-center">
                        <i class="fas fa-chart-bar mr-2 text-purple-500"></i>
                        High Volume Stocks
                    </h3>
                    ${result.data.note ? `<p class="text-sm text-gray-600 italic">${result.data.note}</p>` : ''}
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-purple-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Symbol</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Current Volume</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Price</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Change</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Turnover (Cr)</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${result.data.stocks.map(stock => `
                                    <tr class="hover:bg-gray-50">
                                        <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900">${stock.symbol}</td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <span class="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                                                ${(stock.currentVolume / 1000000).toFixed(2)}M
                                            </span>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-gray-600">₹${stock.price.toFixed(2)}</td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <span class="${stock.changePercent >= 0 ? 'text-green-600' : 'text-red-600'} font-medium">
                                                ${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%
                                            </span>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-gray-600">
                                            ₹${(stock.totalTurnover / 10000000).toFixed(2)}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } catch (error) {
            hideLoading();
            document.getElementById('preopenTabContent').innerHTML = `
                <p class="text-center text-red-500 py-8">Error loading volume analysis: ${error.message}</p>
            `;
        }
    },
    
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
            
            // Store data for TradingView export
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
                            Gap Analysis
                        </h3>
                        <button onclick="PreopenModule.copyGapsToTradingView()" 
                                class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                            <i class="fas fa-copy mr-2"></i>Copy All to TradingView
                        </button>
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
                                    <div class="bg-green-50 border border-green-200 rounded-lg p-2 hover:shadow-md transition-shadow">
                                        <div class="flex justify-between items-center">
                                            <span class="text-sm font-medium text-gray-800">${stock.symbol}</span>
                                            <span class="px-2 py-1 bg-green-600 text-white rounded text-xs font-semibold">
                                                +${stock.gap}%
                                            </span>
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
                                    <div class="bg-green-50 border border-green-200 rounded-lg p-2 hover:shadow-md transition-shadow">
                                        <div class="flex justify-between items-center">
                                            <span class="text-sm font-medium text-gray-800">${stock.symbol}</span>
                                            <span class="px-2 py-1 bg-green-500 text-white rounded text-xs font-semibold">
                                                +${stock.gap}%
                                            </span>
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
                                    <div class="bg-red-50 border border-red-200 rounded-lg p-2 hover:shadow-md transition-shadow">
                                        <div class="flex justify-between items-center">
                                            <span class="text-sm font-medium text-gray-800">${stock.symbol}</span>
                                            <span class="px-2 py-1 bg-red-500 text-white rounded text-xs font-semibold">
                                                ${stock.gap}%
                                            </span>
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
                                    <div class="bg-red-50 border border-red-200 rounded-lg p-2 hover:shadow-md transition-shadow">
                                        <div class="flex justify-between items-center">
                                            <span class="text-sm font-medium text-gray-800">${stock.symbol}</span>
                                            <span class="px-2 py-1 bg-red-600 text-white rounded text-xs font-semibold">
                                                ${stock.gap}%
                                            </span>
                                        </div>
                                    </div>
                                `).join('')}
                                ${strongGapDown.length === 0 ? '<p class="text-center text-gray-400 text-sm py-4">No stocks</p>' : ''}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Detailed Table for All Stocks -->
                    <div class="mt-6">
                        <h4 class="font-semibold text-gray-700 mb-3">Complete Gap Analysis</h4>
                        <div class="overflow-x-auto">
                            <table class="min-w-full divide-y divide-gray-200">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gap Type</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gap %</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Open Price</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prev Close</th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200">
                                    ${[
                                        ...result.data.strongGapUp.map(s => ({...s, type: 'Strong Gap Up'})),
                                        ...result.data.moderateGapUp.map(s => ({...s, type: 'Moderate Gap Up'})),
                                        ...result.data.moderateGapDown.map(s => ({...s, type: 'Moderate Gap Down'})),
                                        ...result.data.strongGapDown.map(s => ({...s, type: 'Strong Gap Down'}))
                                    ].slice(0, 20).map(stock => `
                                        <tr class="hover:bg-gray-50">
                                            <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900">${stock.symbol}</td>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <span class="px-2 py-1 rounded text-xs font-medium ${
                                                    stock.type.includes('Up') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }">
                                                    ${stock.type}
                                                </span>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <span class="${stock.gap >= 0 ? 'text-green-600' : 'text-red-600'} font-medium">
                                                    ${stock.gap >= 0 ? '+' : ''}${stock.gap}%
                                                </span>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap text-gray-600">₹${stock.open.toFixed(2)}</td>
                                            <td class="px-6 py-4 whitespace-nowrap text-gray-600">₹${stock.previousClose.toFixed(2)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
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
            
            // Show instructions modal
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50';
            modal.innerHTML = `
                <div class="bg-white rounded-lg p-6 max-w-md mx-4">
                    <h3 class="text-lg font-semibold mb-4">✅ Gap Analysis Copied!</h3>
                    <p class="text-gray-600 mb-4">${totalStocks} stocks copied in TradingView format</p>
                    <div class="p-3 bg-blue-50 rounded-lg text-sm mb-4">
                        <strong>Categories Included:</strong><br>
                        • Strong Gap Up (>3%): ${Math.min(7, this.gapAnalysisData.strongGapUp.length)} stocks<br>
                        • Moderate Gap Up (1-3%): ${Math.min(7, this.gapAnalysisData.moderateGapUp.length)} stocks<br>
                        • Moderate Gap Down (-1% to -3%): ${Math.min(7, this.gapAnalysisData.moderateGapDown.length)} stocks<br>
                        • Strong Gap Down (<-3%): ${Math.min(7, this.gapAnalysisData.strongGapDown.length)} stocks
                    </div>
                    <div class="p-3 bg-green-50 rounded-lg text-sm">
                        <strong>To add to TradingView:</strong><br>
                        1. Open TradingView<br>
                        2. Create/Open a Watchlist<br>
                        3. Click "..." menu → Import List<br>
                        4. Paste and click Import
                    </div>
                    <button onclick="this.closest('.fixed').remove()" 
                            class="mt-4 w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                        Got it!
                    </button>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Auto-close after 10 seconds
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.remove();
                }
            }, 10000);
        }).catch(err => {
            console.error('Failed to copy:', err);
            showError('Failed to copy to clipboard');
        });
    },
    
    copyToTradingView(type) {
        // This is now deprecated - use copyGapsToTradingView instead
        this.copyGapsToTradingView();
    },
    
    async loadIndustryContent() {
        try {
            showLoading();
            const response = await fetch(`${API_BASE}/preopen/analysis/industry/${this.currentDate}?level=sector`);
            const result = await response.json();
            hideLoading();
            
            const contentDiv = document.getElementById('preopenTabContent');
            
            if (!result.success || !result.data.analysis) {
                contentDiv.innerHTML = '<p class="text-center text-gray-500 py-8">No industry analysis available</p>';
                return;
            }
            
            contentDiv.innerHTML = `
                <div class="space-y-4">
                    <h3 class="text-lg font-semibold text-gray-800 flex items-center">
                        <i class="fas fa-industry mr-2 text-indigo-500"></i>
                        Sector Analysis
                    </h3>
                    
                    <!-- Summary -->
                    <div class="bg-indigo-50 rounded-lg p-4">
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <span class="text-gray-600">Most Bullish:</span>
                                <p class="font-semibold text-green-700">${result.data.summary.mostBullish}</p>
                            </div>
                            <div>
                                <span class="text-gray-600">Most Bearish:</span>
                                <p class="font-semibold text-red-700">${result.data.summary.mostBearish}</p>
                            </div>
                            <div>
                                <span class="text-gray-600">Top by Volume:</span>
                                <p class="font-semibold text-purple-700">${result.data.summary.topByVolume}</p>
                            </div>
                            <div>
                                <span class="text-gray-600">Top by Turnover:</span>
                                <p class="font-semibold text-blue-700">${result.data.summary.topByTurnover}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-indigo-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider">Sector</th>
                                    <th class="px-6 py-3 text-center text-xs font-medium text-indigo-700 uppercase tracking-wider">Stocks</th>
                                    <th class="px-6 py-3 text-center text-xs font-medium text-indigo-700 uppercase tracking-wider">Avg Change</th>
                                    <th class="px-6 py-3 text-center text-xs font-medium text-indigo-700 uppercase tracking-wider">Advances</th>
                                    <th class="px-6 py-3 text-center text-xs font-medium text-indigo-700 uppercase tracking-wider">Declines</th>
                                    <th class="px-6 py-3 text-center text-xs font-medium text-indigo-700 uppercase tracking-wider">Power</th>
                                    <th class="px-6 py-3 text-center text-xs font-medium text-indigo-700 uppercase tracking-wider">Turnover (Cr)</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${result.data.analysis.map(sector => `
                                    <tr class="hover:bg-gray-50">
                                        <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900">${sector.name}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-center text-gray-600">${sector.stockCount}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-center">
                                            <span class="${sector.avgChange >= 0 ? 'text-green-600' : 'text-red-600'} font-medium">
                                                ${sector.avgChange >= 0 ? '+' : ''}${sector.avgChange}%
                                            </span>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-center text-green-600">${sector.advances}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-center text-red-600">${sector.declines}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-center">
                                            <span class="px-2 py-1 rounded text-xs font-medium ${
                                                sector.buyerSellerPower === 'BUYER' ? 'bg-green-100 text-green-700' :
                                                sector.buyerSellerPower === 'SELLER' ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-gray-700'
                                            }">
                                                ${sector.powerText}
                                            </span>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-center text-gray-600">
                                            ₹${(sector.totalTurnover / 10000000).toFixed(2)}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } catch (error) {
            hideLoading();
            document.getElementById('preopenTabContent').innerHTML = `
                <p class="text-center text-red-500 py-8">Error loading industry analysis: ${error.message}</p>
            `;
        }
    },
    
    async loadImbalanceContent() {
        try {
            showLoading();
            const response = await fetch(`${API_BASE}/preopen/analysis/volume-imbalance/${this.currentDate}`);
            const result = await response.json();
            hideLoading();
            
            const contentDiv = document.getElementById('preopenTabContent');
            
            if (!result.success) {
                contentDiv.innerHTML = '<p class="text-center text-gray-500 py-8">No volume imbalance data available</p>';
                return;
            }
            
            // Store for TradingView
            this.imbalanceData = result.data;
            
            contentDiv.innerHTML = `
                <div class="space-y-6">
                    <div class="flex justify-between items-center">
                        <h3 class="text-lg font-semibold text-gray-800 flex items-center">
                            <i class="fas fa-balance-scale mr-2 text-teal-500"></i>
                            Volume Imbalance Analysis
                        </h3>
                        <div class="flex gap-2">
                            <button onclick="PreopenModule.copyImbalanceToTradingView('bid')" 
                                    class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                                <i class="fas fa-copy mr-2"></i>Bid Dominant
                            </button>
                            <button onclick="PreopenModule.copyImbalanceToTradingView('ask')" 
                                    class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                                <i class="fas fa-copy mr-2"></i>Ask Dominant
                            </button>
                        </div>
                    </div>
                    
                    <!-- Summary -->
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div class="bg-green-100 rounded-lg p-4">
                            <p class="text-sm text-green-700">Bid Dominant</p>
                            <p class="text-2xl font-bold text-green-800">${result.data.summary.totalBidDominant}</p>
                        </div>
                        <div class="bg-red-100 rounded-lg p-4">
                            <p class="text-sm text-red-700">Ask Dominant</p>
                            <p class="text-2xl font-bold text-red-800">${result.data.summary.totalAskDominant}</p>
                        </div>
                        <div class="bg-green-50 rounded-lg p-4">
                            <p class="text-sm text-green-600">Strong Bid (>50%)</p>
                            <p class="text-2xl font-bold text-green-700">${result.data.summary.strongBidImbalance}</p>
                        </div>
                        <div class="bg-red-50 rounded-lg p-4">
                            <p class="text-sm text-red-600">Strong Ask (>50%)</p>
                            <p class="text-2xl font-bold text-red-700">${result.data.summary.strongAskImbalance}</p>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <!-- Bid Dominant Stocks - Limited to 4 -->
                        <div>
                            <h4 class="font-semibold text-gray-700 mb-3 flex items-center">
                                <i class="fas fa-arrow-up mr-2 text-green-500"></i>Bid Dominant Stocks (Top 4)
                            </h4>
                            <div class="space-y-2">
                                ${result.data.bidDominantStocks.slice(0, 4).map(stock => `
                                    <div class="bg-green-50 border border-green-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                                        <div class="flex justify-between items-center mb-2">
                                            <span class="font-medium text-gray-800">${stock.symbol}</span>
                                            <span class="px-2 py-1 bg-green-600 text-white rounded text-xs font-semibold">
                                                ${stock.volumeImbalancePercent.toFixed(1)}% Bid
                                            </span>
                                        </div>
                                        <div class="text-xs text-gray-600">
                                            ${stock.bidAskVolumeRatioText} | Price: ₹${stock.lastPrice.toFixed(2)}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <!-- Ask Dominant Stocks - Limited to 4 -->
                        <div>
                            <h4 class="font-semibold text-gray-700 mb-3 flex items-center">
                                <i class="fas fa-arrow-down mr-2 text-red-500"></i>Ask Dominant Stocks (Top 4)
                            </h4>
                            <div class="space-y-2">
                                ${result.data.askDominantStocks.slice(0, 4).map(stock => `
                                    <div class="bg-red-50 border border-red-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                                        <div class="flex justify-between items-center mb-2">
                                            <span class="font-medium text-gray-800">${stock.symbol}</span>
                                            <span class="px-2 py-1 bg-red-600 text-white rounded text-xs font-semibold">
                                                ${stock.volumeImbalancePercent.toFixed(1)}% Ask
                                            </span>
                                        </div>
                                        <div class="text-xs text-gray-600">
                                            ${stock.bidAskVolumeRatioText} | Price: ₹${stock.lastPrice.toFixed(2)}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            hideLoading();
            document.getElementById('preopenTabContent').innerHTML = `
                <p class="text-center text-red-500 py-8">Error loading volume imbalance: ${error.message}</p>
            `;
        }
    },
    
    copyImbalanceToTradingView(type) {
        if (!this.imbalanceData) {
            showError('No imbalance data available');
            return;
        }
        
        let symbols = [];
        let title = '';
        
        if (type === 'bid') {
            symbols = this.imbalanceData.bidDominantStocks.map(s => 'NSE:' + s.symbol);
            title = 'Bid Dominant Stocks';
        } else {
            symbols = this.imbalanceData.askDominantStocks.map(s => 'NSE:' + s.symbol);
            title = 'Ask Dominant Stocks';
        }
        
        this.copySymbolsToClipboard(symbols, title);
    }
};

// Make module globally available
window.PreopenModule = PreopenModule;