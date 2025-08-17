// js/modules/deliveryVolume.js - Delivery Volume Analysis Module

const DeliveryVolumeModule = {
    currentDeliveryTab: 'overview',
    currentDate: null,
    deliveryData: null,
    
    getHTML() {
        return `
            <div class="space-y-6">
                <!-- Delivery Volume Analysis Header -->
                <div class="card p-6">
                    <h2 class="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                        <i class="fas fa-truck-loading mr-3 text-blue-500"></i>
                        Traded & Delivery Volume Analysis
                    </h2>
                    
                    <!-- Date Selection -->
                    <div class="flex items-center gap-4 mb-6">
                        <label class="text-sm font-medium text-gray-700">Analysis Date:</label>
                        <input type="date" id="deliveryDate" class="px-3 py-2 border border-gray-300 rounded-lg input-field" 
                               value="${new Date().toISOString().split('T')[0]}"
                               onchange="DeliveryVolumeModule.onDateChange()">
                        <button onclick="DeliveryVolumeModule.loadData()" 
                                class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                            <i class="fas fa-sync-alt mr-2"></i>Load Data
                        </button>
                        <button onclick="DeliveryVolumeModule.exportToCSV()" 
                                class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                            <i class="fas fa-download mr-2"></i>Export CSV
                        </button>
                    </div>
                    
                    <!-- Tab Navigation -->
                    <div class="flex flex-wrap gap-2 mb-6">
                        <button class="delivery-tab-btn px-4 py-2 rounded-lg font-medium bg-blue-500 text-white" 
                                data-tab="overview" onclick="DeliveryVolumeModule.switchTab('overview')">
                            <i class="fas fa-chart-line mr-2"></i>Overview
                        </button>
                        <button class="delivery-tab-btn px-4 py-2 rounded-lg font-medium bg-gray-200 text-gray-700" 
                                data-tab="top-delivery" onclick="DeliveryVolumeModule.switchTab('top-delivery')">
                            <i class="fas fa-percentage mr-2"></i>Top Delivery %
                        </button>
                        <button class="delivery-tab-btn px-4 py-2 rounded-lg font-medium bg-gray-200 text-gray-700" 
                                data-tab="volume-analysis" onclick="DeliveryVolumeModule.switchTab('volume-analysis')">
                            <i class="fas fa-chart-bar mr-2"></i>Volume Analysis
                        </button>
                        <button class="delivery-tab-btn px-4 py-2 rounded-lg font-medium bg-gray-200 text-gray-700" 
                                data-tab="search" onclick="DeliveryVolumeModule.switchTab('search')">
                            <i class="fas fa-search mr-2"></i>Search Securities
                        </button>
                        <button class="delivery-tab-btn px-4 py-2 rounded-lg font-medium bg-gray-200 text-gray-700" 
                                data-tab="filters" onclick="DeliveryVolumeModule.switchTab('filters')">
                            <i class="fas fa-filter mr-2"></i>Advanced Filters
                        </button>
                    </div>
                    
                    <!-- Tab Content -->
                    <div id="deliveryTabContent">
                        <!-- Content will be loaded here -->
                    </div>
                </div>
            </div>
        `;
    },
    
    async initialize() {
        console.log('Initializing Delivery Volume Module...');
        this.currentDate = new Date().toISOString().split('T')[0];
        await this.loadData();
        this.switchTab('overview');
    },
    
    onDateChange() {
        this.currentDate = document.getElementById('deliveryDate').value;
    },
    
    async loadData() {
        const date = document.getElementById('deliveryDate').value;
        this.currentDate = date;
        
        try {
            showLoading();
            
            // Load delivery volume data for the selected date
            const response = await fetch(`${API_BASE}/delivery-volume/data/${date}`);
            const result = await response.json();
            
            if (result.success) {
                this.deliveryData = result.data;
                showSuccess(`Delivery volume data loaded for ${date}`);
                // Refresh current tab
                this.switchTab(this.currentDeliveryTab);
            } else {
                this.deliveryData = null;
                showError(result.error || `No delivery volume data available for ${date}`);
                document.getElementById('deliveryTabContent').innerHTML = `
                    <div class="text-center py-12 text-gray-500">
                        <i class="fas fa-database text-5xl mb-4"></i>
                        <p class="text-lg">No delivery volume data available for ${date}</p>
                        <p class="text-sm mt-2">Make sure your NSE scraper has run for this date</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading delivery volume data:', error);
            showError('Error loading delivery volume data: ' + error.message);
        } finally {
            hideLoading();
        }
    },
    
    switchTab(tabName) {
        this.currentDeliveryTab = tabName;
        
        // Update tab button styles
        document.querySelectorAll('.delivery-tab-btn').forEach(btn => {
            if (btn.dataset.tab === tabName) {
                btn.className = 'delivery-tab-btn px-4 py-2 rounded-lg font-medium bg-blue-500 text-white';
            } else {
                btn.className = 'delivery-tab-btn px-4 py-2 rounded-lg font-medium bg-gray-200 text-gray-700';
            }
        });
        
        // Load tab content
        const contentDiv = document.getElementById('deliveryTabContent');
        
        if (!this.deliveryData) {
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
            case 'top-delivery':
                this.loadTopDeliveryContent();
                break;
            case 'volume-analysis':
                this.loadVolumeAnalysisContent();
                break;
            case 'search':
                this.loadSearchContent();
                break;
            case 'filters':
                this.loadFiltersContent();
                break;
        }
    },
    
    loadOverviewContent() {
        const contentDiv = document.getElementById('deliveryTabContent');
        
        if (!this.deliveryData || !this.deliveryData.securities) {
            contentDiv.innerHTML = '<p class="text-center text-gray-500 py-8">No data available</p>';
            return;
        }
        
        const securities = this.deliveryData.securities || [];
        const summary = this.deliveryData.summary || {};
        
        // Calculate additional stats
        const highDelivery = securities.filter(s => parseFloat(s.deliveryPercentage) >= 50);
        const veryHighDelivery = securities.filter(s => parseFloat(s.deliveryPercentage) >= 70);
        const topByVolume = [...securities].sort((a, b) => b.totalTradedVolume - a.totalTradedVolume).slice(0, 10);
        const topByDelivery = [...securities].sort((a, b) => parseFloat(b.deliveryPercentage) - parseFloat(a.deliveryPercentage)).slice(0, 10);
        
        contentDiv.innerHTML = `
            <div class="space-y-6">
                <!-- Statistics Overview -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div class="stats-card p-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-white text-opacity-80 text-sm">Total Securities</p>
                                <p class="text-2xl font-bold text-white">${this.deliveryData.totalSecurities}</p>
                            </div>
                            <i class="fas fa-list text-3xl text-white text-opacity-50"></i>
                        </div>
                    </div>
                    <div class="stats-card p-4" style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-white text-opacity-80 text-sm">Avg Delivery %</p>
                                <p class="text-2xl font-bold text-white">${summary.avgDeliveryPercentage}%</p>
                            </div>
                            <i class="fas fa-percentage text-3xl text-white text-opacity-50"></i>
                        </div>
                    </div>
                    <div class="stats-card p-4" style="background: linear-gradient(135deg, #f56565 0%, #ed8936 100%);">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-white text-opacity-80 text-sm">High Delivery (>50%)</p>
                                <p class="text-2xl font-bold text-white">${highDelivery.length}</p>
                            </div>
                            <i class="fas fa-truck text-3xl text-white text-opacity-50"></i>
                        </div>
                    </div>
                    <div class="stats-card p-4" style="background: linear-gradient(135deg, #4299e1 0%, #9f7aea 100%);">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-white text-opacity-80 text-sm">Market Delivery %</p>
                                <p class="text-2xl font-bold text-white">${summary.marketDeliveryRatio}%</p>
                            </div>
                            <i class="fas fa-chart-pie text-3xl text-white text-opacity-50"></i>
                        </div>
                    </div>
                </div>
                
                <!-- Top Delivery % and Volume -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Top Delivery Percentage -->
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <i class="fas fa-trophy mr-2 text-yellow-500"></i>Top Delivery % Stocks
                        </h3>
                        <div class="space-y-2">
                            ${topByDelivery.map(stock => `
                                <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                                    <div class="flex justify-between items-center">
                                        <div>
                                            <p class="font-semibold text-gray-800">${stock.symbol}</p>
                                            <p class="text-sm text-gray-600">₹${(stock.lastPrice || 0).toFixed(2)}</p>
                                        </div>
                                        <div class="text-right">
                                            <p class="text-blue-600 font-semibold">${stock.deliveryPercentage}%</p>
                                            <p class="text-xs text-gray-500">Vol: ${this.formatNumber(stock.quantityTraded)}</p>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- Top Volume Stocks -->
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <i class="fas fa-chart-bar mr-2 text-purple-500"></i>Top Volume Stocks
                        </h3>
                        <div class="space-y-2">
                            ${topByVolume.map(stock => `
                                <div class="bg-purple-50 border border-purple-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                                    <div class="flex justify-between items-center">
                                        <div>
                                            <p class="font-semibold text-gray-800">${stock.symbol}</p>
                                            <p class="text-sm text-gray-600">Delivery: ${stock.deliveryPercentage}%</p>
                                        </div>
                                        <div class="text-right">
                                            <p class="text-purple-600 font-semibold">${this.formatNumber(stock.totalTradedVolume)}</p>
                                            <p class="text-xs text-gray-500">₹${this.formatCurrency(stock.totalTradedValue)}</p>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <!-- Market Summary Table -->
                <div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <i class="fas fa-fire mr-2 text-orange-500"></i>Market Summary - Top 15 Securities
                    </h3>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery %</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Price</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change %</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity Traded</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery Qty</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Traded Value (Cr)</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${securities.slice(0, 15).map(stock => `
                                    <tr class="hover:bg-gray-50">
                                        <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900">${stock.symbol}</td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <span class="px-2 py-1 rounded text-xs font-semibold ${this.getDeliveryColorClass(parseFloat(stock.deliveryPercentage))}">
                                                ${stock.deliveryPercentage}%
                                            </span>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-gray-600">₹${(stock.lastPrice || 0).toFixed(2)}</td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <span class="${(stock.pChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'} font-medium">
                                                ${(stock.pChange || 0) >= 0 ? '+' : ''}${(stock.pChange || 0).toFixed(2)}%
                                            </span>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-gray-600">${this.formatNumber(stock.quantityTraded)}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-gray-600">${this.formatNumber(stock.deliveryQuantity)}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-gray-600">₹${this.formatCurrency(stock.totalTradedValue / 10000000)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },
    
    async loadTopDeliveryContent() {
        try {
            showLoading();
            const response = await fetch(`${API_BASE}/delivery-volume/analysis/top-delivery/${this.currentDate}?minPercent=30&limit=50`);
            const result = await response.json();
            hideLoading();
            
            const contentDiv = document.getElementById('deliveryTabContent');
            
            if (!result.success || !result.data.topDeliveryStocks || result.data.topDeliveryStocks.length === 0) {
                contentDiv.innerHTML = '<p class="text-center text-gray-500 py-8">No high delivery stocks found</p>';
                return;
            }
            
            // Store for TradingView
            this.topDeliveryData = result.data;
            
            const stocks = result.data.topDeliveryStocks;
            const veryHigh = stocks.filter(s => s.deliveryPercentage >= 70);
            const high = stocks.filter(s => s.deliveryPercentage >= 50 && s.deliveryPercentage < 70);
            const moderate = stocks.filter(s => s.deliveryPercentage >= 30 && s.deliveryPercentage < 50);
            
            contentDiv.innerHTML = `
                <div class="space-y-6">
                    <div class="flex justify-between items-center">
                        <h3 class="text-lg font-semibold text-gray-800 flex items-center">
                            <i class="fas fa-percentage mr-2 text-blue-500"></i>
                            Top Delivery % Stocks (≥30%)
                        </h3>
                        <div class="flex gap-2">
                            <button onclick="DeliveryVolumeModule.copyDeliveryStocksToTradingView('all')" 
                                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                <i class="fas fa-copy mr-2"></i>Copy All
                            </button>
                            <button onclick="DeliveryVolumeModule.copyDeliveryStocksToTradingView('high')" 
                                    class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                                <i class="fas fa-copy mr-2"></i>Copy >70%
                            </button>
                        </div>
                    </div>
                    
                    <!-- Summary Cards -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="bg-green-100 rounded-lg p-4">
                            <p class="text-sm text-green-700">Very High Delivery (≥70%)</p>
                            <p class="text-2xl font-bold text-green-800">${veryHigh.length}</p>
                        </div>
                        <div class="bg-blue-100 rounded-lg p-4">
                            <p class="text-sm text-blue-700">High Delivery (50-70%)</p>
                            <p class="text-2xl font-bold text-blue-800">${high.length}</p>
                        </div>
                        <div class="bg-yellow-100 rounded-lg p-4">
                            <p class="text-sm text-yellow-700">Moderate Delivery (30-50%)</p>
                            <p class="text-2xl font-bold text-yellow-800">${moderate.length}</p>
                        </div>
                    </div>
                    
                    <!-- Delivery Categories -->
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <!-- Very High Delivery -->
                        <div>
                            <h4 class="font-semibold text-gray-700 mb-3 flex items-center">
                                <i class="fas fa-crown mr-2 text-green-500"></i>Very High Delivery (≥70%)
                            </h4>
                            <div class="space-y-2 max-h-96 overflow-y-auto">
                                ${veryHigh.slice(0, 15).map(stock => `
                                    <div class="bg-green-50 border border-green-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                                        <div class="flex justify-between items-center mb-1">
                                            <span class="font-medium text-gray-800">${stock.symbol}</span>
                                            <span class="px-2 py-1 bg-green-600 text-white rounded text-xs font-semibold">
                                                ${stock.deliveryPercentage}%
                                            </span>
                                        </div>
                                        <div class="text-xs text-gray-600">
                                            ₹${stock.lastPrice.toFixed(2)} | Vol: ${this.formatNumber(stock.quantityTraded)}
                                        </div>
                                    </div>
                                `).join('')}
                                ${veryHigh.length === 0 ? '<p class="text-center text-gray-400 text-sm py-4">No stocks</p>' : ''}
                            </div>
                        </div>
                        
                        <!-- High Delivery -->
                        <div>
                            <h4 class="font-semibold text-gray-700 mb-3 flex items-center">
                                <i class="fas fa-star mr-2 text-blue-500"></i>High Delivery (50-70%)
                            </h4>
                            <div class="space-y-2 max-h-96 overflow-y-auto">
                                ${high.slice(0, 15).map(stock => `
                                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                                        <div class="flex justify-between items-center mb-1">
                                            <span class="font-medium text-gray-800">${stock.symbol}</span>
                                            <span class="px-2 py-1 bg-blue-600 text-white rounded text-xs font-semibold">
                                                ${stock.deliveryPercentage}%
                                            </span>
                                        </div>
                                        <div class="text-xs text-gray-600">
                                            ₹${stock.lastPrice.toFixed(2)} | Vol: ${this.formatNumber(stock.quantityTraded)}
                                        </div>
                                    </div>
                                `).join('')}
                                ${high.length === 0 ? '<p class="text-center text-gray-400 text-sm py-4">No stocks</p>' : ''}
                            </div>
                        </div>
                        
                        <!-- Moderate Delivery -->
                        <div>
                            <h4 class="font-semibold text-gray-700 mb-3 flex items-center">
                                <i class="fas fa-chart-line mr-2 text-yellow-500"></i>Moderate Delivery (30-50%)
                            </h4>
                            <div class="space-y-2 max-h-96 overflow-y-auto">
                                ${moderate.slice(0, 15).map(stock => `
                                    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                                        <div class="flex justify-between items-center mb-1">
                                            <span class="font-medium text-gray-800">${stock.symbol}</span>
                                            <span class="px-2 py-1 bg-yellow-600 text-white rounded text-xs font-semibold">
                                                ${stock.deliveryPercentage}%
                                            </span>
                                        </div>
                                        <div class="text-xs text-gray-600">
                                            ₹${stock.lastPrice.toFixed(2)} | Vol: ${this.formatNumber(stock.quantityTraded)}
                                        </div>
                                    </div>
                                `).join('')}
                                ${moderate.length === 0 ? '<p class="text-center text-gray-400 text-sm py-4">No stocks</p>' : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            hideLoading();
            document.getElementById('deliveryTabContent').innerHTML = `
                <p class="text-center text-red-500 py-8">Error loading top delivery analysis: ${error.message}</p>
            `;
        }
    },
    
    loadVolumeAnalysisContent() {
        const contentDiv = document.getElementById('deliveryTabContent');
        
        if (!this.deliveryData || !this.deliveryData.securities) {
            contentDiv.innerHTML = '<p class="text-center text-gray-500 py-8">No volume data available</p>';
            return;
        }
        
        const securities = this.deliveryData.securities || [];
        
        // Analyze volume patterns
        const highVolumeStocks = [...securities]
            .filter(s => s.totalTradedVolume > 0)
            .sort((a, b) => b.totalTradedVolume - a.totalTradedVolume)
            .slice(0, 20);
            
        const highValueStocks = [...securities]
            .filter(s => s.totalTradedValue > 0)
            .sort((a, b) => b.totalTradedValue - a.totalTradedValue)
            .slice(0, 20);
            
        const highDeliveryHighVolume = securities
            .filter(s => parseFloat(s.deliveryPercentage) >= 50 && s.totalTradedVolume > 100000)
            .sort((a, b) => parseFloat(b.deliveryPercentage) - parseFloat(a.deliveryPercentage))
            .slice(0, 15);
        
        contentDiv.innerHTML = `
            <div class="space-y-6">
                <h3 class="text-lg font-semibold text-gray-800 flex items-center">
                    <i class="fas fa-chart-bar mr-2 text-purple-500"></i>
                    Volume Analysis
                </h3>
                
                <!-- Volume Categories -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- High Volume Stocks -->
                    <div>
                        <h4 class="font-semibold text-gray-700 mb-3 flex items-center">
                            <i class="fas fa-volume-high mr-2 text-purple-500"></i>Top Volume Stocks
                        </h4>
                        <div class="space-y-2 max-h-80 overflow-y-auto">
                            ${highVolumeStocks.map(stock => `
                                <div class="bg-purple-50 border border-purple-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                                    <div class="flex justify-between items-center">
                                        <div>
                                            <p class="font-semibold text-gray-800">${stock.symbol}</p>
                                            <p class="text-sm text-gray-600">Delivery: ${stock.deliveryPercentage}%</p>
                                        </div>
                                        <div class="text-right">
                                            <p class="text-purple-600 font-semibold">${this.formatNumber(stock.totalTradedVolume)}</p>
                                            <p class="text-xs text-gray-500">₹${(stock.lastPrice || 0).toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- High Value Stocks -->
                    <div>
                        <h4 class="font-semibold text-gray-700 mb-3 flex items-center">
                            <i class="fas fa-dollar-sign mr-2 text-green-500"></i>Top Value Stocks
                        </h4>
                        <div class="space-y-2 max-h-80 overflow-y-auto">
                            ${highValueStocks.map(stock => `
                                <div class="bg-green-50 border border-green-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                                    <div class="flex justify-between items-center">
                                        <div>
                                            <p class="font-semibold text-gray-800">${stock.symbol}</p>
                                            <p class="text-sm text-gray-600">Delivery: ${stock.deliveryPercentage}%</p>
                                        </div>
                                        <div class="text-right">
                                            <p class="text-green-600 font-semibold">₹${this.formatCurrency(stock.totalTradedValue / 10000000)}Cr</p>
                                            <p class="text-xs text-gray-500">Vol: ${this.formatNumber(stock.totalTradedVolume)}</p>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <!-- High Delivery + High Volume Combination -->
                <div>
                    <div class="flex justify-between items-center mb-4">
                        <h4 class="font-semibold text-gray-700 flex items-center">
                            <i class="fas fa-gem mr-2 text-indigo-500"></i>High Delivery + High Volume (≥50% delivery, >1L volume)
                        </h4>
                        <button onclick="DeliveryVolumeModule.copyHighDeliveryVolumeToTradingView()" 
                                class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                            <i class="fas fa-copy mr-2"></i>Copy to TradingView
                        </button>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-indigo-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider">Symbol</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider">Delivery %</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider">Volume</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider">Delivery Qty</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider">Price</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider">Change %</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider">Value (Cr)</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${highDeliveryHighVolume.map(stock => `
                                    <tr class="hover:bg-gray-50">
                                        <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900">${stock.symbol}</td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <span class="px-2 py-1 rounded text-xs font-semibold ${this.getDeliveryColorClass(parseFloat(stock.deliveryPercentage))}">
                                                ${stock.deliveryPercentage}%
                                            </span>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-gray-600">${this.formatNumber(stock.quantityTraded)}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-gray-600">${this.formatNumber(stock.deliveryQuantity)}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-gray-600">₹${stock.lastPrice.toFixed(2)}</td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <span class="${stock.pChange >= 0 ? 'text-green-600' : 'text-red-600'} font-medium">
                                                ${stock.pChange >= 0 ? '+' : ''}${stock.pChange.toFixed(2)}%
                                            </span>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-gray-600">₹${this.formatCurrency(stock.totalTradedValue / 10000000)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },
    
    loadSearchContent() {
        const contentDiv = document.getElementById('deliveryTabContent');
        
        contentDiv.innerHTML = `
            <div class="space-y-6">
                <h3 class="text-lg font-semibold text-gray-800 flex items-center">
                    <i class="fas fa-search mr-2 text-green-500"></i>
                    Search Securities
                </h3>
                
                <!-- Search Controls -->
                <div class="bg-gray-50 rounded-lg p-4">
                    <div class="flex gap-4 items-end">
                        <div class="flex-1">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Search Symbol</label>
                            <input type="text" id="searchSymbol" placeholder="Enter symbol (e.g., RELIANCE, TCS)"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg input-field"
                                   onkeypress="if(event.key==='Enter') DeliveryVolumeModule.searchSymbol()">
                        </div>
                        <button onclick="DeliveryVolumeModule.searchSymbol()" 
                                class="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                            <i class="fas fa-search mr-2"></i>Search
                        </button>
                        <button onclick="DeliveryVolumeModule.clearSearch()" 
                                class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
                            <i class="fas fa-times mr-2"></i>Clear
                        </button>
                    </div>
                </div>
                
                <!-- Search Results -->
                <div id="searchResults">
                    <div class="text-center py-8 text-gray-500">
                        <i class="fas fa-search text-4xl mb-4"></i>
                        <p>Enter a symbol to search</p>
                    </div>
                </div>
                
                <!-- Quick Search Buttons -->
                <div class="bg-blue-50 rounded-lg p-4">
                    <h4 class="font-semibold text-gray-700 mb-3">Quick Search</h4>
                    <div class="flex flex-wrap gap-2">
                        ${['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'LT', 'ITC', 'HINDUNILVR', 'BAJFINANCE'].map(symbol => `
                            <button onclick="DeliveryVolumeModule.quickSearch('${symbol}')" 
                                    class="px-3 py-1 bg-white border border-blue-200 rounded text-sm hover:bg-blue-100 transition-colors">
                                ${symbol}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    },
    
    loadFiltersContent() {
        const contentDiv = document.getElementById('deliveryTabContent');
        
        contentDiv.innerHTML = `
            <div class="space-y-6">
                <h3 class="text-lg font-semibold text-gray-800 flex items-center">
                    <i class="fas fa-filter mr-2 text-indigo-500"></i>
                    Advanced Filters
                </h3>
                
                <!-- Filter Controls -->
                <div class="bg-gray-50 rounded-lg p-6">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Min Delivery %</label>
                            <input type="number" id="minDeliveryPercent" placeholder="e.g., 30" min="0" max="100" step="1"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg input-field">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Min Volume</label>
                            <input type="number" id="minVolume" placeholder="e.g., 100000" min="0" step="1000"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg input-field">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Min Price (₹)</label>
                            <input type="number" id="minPrice" placeholder="e.g., 100" min="0" step="1"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg input-field">
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Max Delivery %</label>
                            <input type="number" id="maxDeliveryPercent" placeholder="e.g., 100" min="0" max="100" step="1"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg input-field">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Min Change %</label>
                            <input type="number" id="minChangePercent" placeholder="e.g., -5" step="0.1"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg input-field">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Max Change %</label>
                            <input type="number" id="maxChangePercent" placeholder="e.g., 10" step="0.1"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg input-field">
                        </div>
                    </div>
                    
                    <div class="flex gap-4">
                        <button onclick="DeliveryVolumeModule.applyFilters()" 
                                class="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors">
                            <i class="fas fa-filter mr-2"></i>Apply Filters
                        </button>
                        <button onclick="DeliveryVolumeModule.clearFilters()" 
                                class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
                            <i class="fas fa-times mr-2"></i>Clear All
                        </button>
                        <button onclick="DeliveryVolumeModule.copyFilteredToTradingView()" 
                                class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                            <i class="fas fa-copy mr-2"></i>Copy Filtered
                        </button>
                    </div>
                </div>
                
                <!-- Filtered Results -->
                <div id="filteredResults">
                    <div class="text-center py-8 text-gray-500">
                        <i class="fas fa-filter text-4xl mb-4"></i>
                        <p>Apply filters to see results</p>
                    </div>
                </div>
            </div>
        `;
    },
    
    searchSymbol() {
        const symbol = document.getElementById('searchSymbol').value.trim().toUpperCase();
        if (!symbol) {
            showError('Please enter a symbol to search');
            return;
        }
        
        this.quickSearch(symbol);
    },
    
    quickSearch(symbol) {
        document.getElementById('searchSymbol').value = symbol;
        
        if (!this.deliveryData || !this.deliveryData.securities) {
            document.getElementById('searchResults').innerHTML = `
                <div class="text-center py-8 text-red-500">
                    <p>No data loaded. Please load data first.</p>
                </div>
            `;
            return;
        }
        
        const security = this.deliveryData.securities.find(s => 
            s.symbol.toLowerCase() === symbol.toLowerCase()
        );
        
        const resultsDiv = document.getElementById('searchResults');
        
        if (!security) {
            resultsDiv.innerHTML = `
                <div class="text-center py-8 text-red-500">
                    <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                    <p class="text-lg">Symbol ${symbol} not found</p>
                    <p class="text-sm">Check if the symbol is correct or data is available for ${this.currentDate}</p>
                </div>
            `;
            return;
        }
        
        resultsDiv.innerHTML = `
            <div class="bg-white border border-gray-200 rounded-lg p-6">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h4 class="text-xl font-bold text-gray-800">${security.symbol}</h4>
                        <p class="text-sm text-gray-600">${security.series} Series</p>
                    </div>
                    <div class="text-right">
                        <span class="px-3 py-1 rounded-lg text-sm font-semibold ${this.getDeliveryColorClass(parseFloat(security.deliveryPercentage))}">
                            ${security.deliveryPercentage}% Delivery
                        </span>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div class="text-center p-3 bg-blue-50 rounded-lg">
                        <p class="text-xs text-blue-600 uppercase">Last Price</p>
                        <p class="text-lg font-bold text-blue-800">₹${security.lastPrice.toFixed(2)}</p>
                    </div>
                    <div class="text-center p-3 bg-gray-50 rounded-lg">
                        <p class="text-xs text-gray-600 uppercase">Change</p>
                        <p class="text-lg font-bold ${security.pChange >= 0 ? 'text-green-600' : 'text-red-600'}">
                            ${security.pChange >= 0 ? '+' : ''}${security.pChange.toFixed(2)}%
                        </p>
                    </div>
                    <div class="text-center p-3 bg-purple-50 rounded-lg">
                        <p class="text-xs text-purple-600 uppercase">Volume</p>
                        <p class="text-lg font-bold text-purple-800">${this.formatNumber(security.quantityTraded)}</p>
                    </div>
                    <div class="text-center p-3 bg-green-50 rounded-lg">
                        <p class="text-xs text-green-600 uppercase">Delivery</p>
                        <p class="text-lg font-bold text-green-800">${this.formatNumber(security.deliveryQuantity)}</p>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="text-center p-3 bg-yellow-50 rounded-lg">
                        <p class="text-xs text-yellow-600 uppercase">Open</p>
                        <p class="text-sm font-medium text-yellow-800">₹${security.open.toFixed(2)}</p>
                    </div>
                    <div class="text-center p-3 bg-red-50 rounded-lg">
                        <p class="text-xs text-red-600 uppercase">Day High</p>
                        <p class="text-sm font-medium text-red-800">₹${security.dayHigh.toFixed(2)}</p>
                    </div>
                    <div class="text-center p-3 bg-green-50 rounded-lg">
                        <p class="text-xs text-green-600 uppercase">Day Low</p>
                        <p class="text-sm font-medium text-green-800">₹${security.dayLow.toFixed(2)}</p>
                    </div>
                    <div class="text-center p-3 bg-indigo-50 rounded-lg">
                        <p class="text-xs text-indigo-600 uppercase">Value (Cr)</p>
                        <p class="text-sm font-medium text-indigo-800">₹${this.formatCurrency(security.totalTradedValue / 10000000)}</p>
                    </div>
                </div>
            </div>
        `;
    },
    
    clearSearch() {
        document.getElementById('searchSymbol').value = '';
        document.getElementById('searchResults').innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-search text-4xl mb-4"></i>
                <p>Enter a symbol to search</p>
            </div>
        `;
    },
    
    applyFilters() {
        if (!this.deliveryData || !this.deliveryData.securities) {
            showError('No data loaded. Please load data first.');
            return;
        }
        
        const minDelivery = parseFloat(document.getElementById('minDeliveryPercent').value) || 0;
        const maxDelivery = parseFloat(document.getElementById('maxDeliveryPercent').value) || 100;
        const minVolume = parseFloat(document.getElementById('minVolume').value) || 0;
        const minPrice = parseFloat(document.getElementById('minPrice').value) || 0;
        const minChange = parseFloat(document.getElementById('minChangePercent').value) || -100;
        const maxChange = parseFloat(document.getElementById('maxChangePercent').value) || 100;
        
        const filtered = this.deliveryData.securities.filter(stock => {
            const delivery = parseFloat(stock.deliveryPercentage);
            const volume = stock.quantityTraded || 0;
            const price = stock.lastPrice || 0;
            const change = stock.pChange || 0;
            
            return delivery >= minDelivery && 
                   delivery <= maxDelivery && 
                   volume >= minVolume && 
                   price >= minPrice && 
                   change >= minChange && 
                   change <= maxChange;
        });
        
        // Store filtered results for TradingView export
        this.filteredData = filtered;
        
        const resultsDiv = document.getElementById('filteredResults');
        
        if (filtered.length === 0) {
            resultsDiv.innerHTML = `
                <div class="text-center py-8 text-yellow-600">
                    <i class="fas fa-filter text-4xl mb-4"></i>
                    <p class="text-lg">No securities match your filters</p>
                    <p class="text-sm">Try adjusting your criteria</p>
                </div>
            `;
            return;
        }
        
        // Sort by delivery percentage descending
        filtered.sort((a, b) => parseFloat(b.deliveryPercentage) - parseFloat(a.deliveryPercentage));
        
        resultsDiv.innerHTML = `
            <div class="space-y-4">
                <div class="flex justify-between items-center">
                    <h4 class="font-semibold text-gray-700">
                        Filtered Results (${filtered.length} securities)
                    </h4>
                    <button onclick="DeliveryVolumeModule.copyFilteredToTradingView()" 
                            class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                        <i class="fas fa-copy mr-2"></i>Copy to TradingView
                    </button>
                </div>
                
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-indigo-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider">Symbol</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider">Delivery %</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider">Price</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider">Change %</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider">Volume</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider">Delivery Qty</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider">Value (Cr)</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${filtered.slice(0, 50).map(stock => `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900">${stock.symbol}</td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span class="px-2 py-1 rounded text-xs font-semibold ${this.getDeliveryColorClass(parseFloat(stock.deliveryPercentage))}">
                                            ${stock.deliveryPercentage}%
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-gray-600">₹${stock.lastPrice.toFixed(2)}</td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span class="${stock.pChange >= 0 ? 'text-green-600' : 'text-red-600'} font-medium">
                                            ${stock.pChange >= 0 ? '+' : ''}${stock.pChange.toFixed(2)}%
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-gray-600">${this.formatNumber(stock.quantityTraded)}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-gray-600">${this.formatNumber(stock.deliveryQuantity)}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-gray-600">₹${this.formatCurrency(stock.totalTradedValue / 10000000)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                ${filtered.length > 50 ? `<p class="text-center text-sm text-gray-500 mt-4">Showing top 50 results of ${filtered.length} total</p>` : ''}
            </div>
        `;
    },
    
    clearFilters() {
        document.getElementById('minDeliveryPercent').value = '';
        document.getElementById('maxDeliveryPercent').value = '';
        document.getElementById('minVolume').value = '';
        document.getElementById('minPrice').value = '';
        document.getElementById('minChangePercent').value = '';
        document.getElementById('maxChangePercent').value = '';
        
        document.getElementById('filteredResults').innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-filter text-4xl mb-4"></i>
                <p>Apply filters to see results</p>
            </div>
        `;
        
        this.filteredData = null;
    },
    
    copyDeliveryStocksToTradingView(type) {
        if (!this.topDeliveryData) {
            showError('No delivery data available');
            return;
        }
        
        let symbols = [];
        let title = '';
        
        if (type === 'all') {
            symbols = this.topDeliveryData.topDeliveryStocks.map(s => 'NSE:' + s.symbol);
            title = 'High Delivery Stocks';
        } else if (type === 'high') {
            symbols = this.topDeliveryData.topDeliveryStocks
                .filter(s => s.deliveryPercentage >= 70)
                .map(s => 'NSE:' + s.symbol);
            title = 'Very High Delivery Stocks (≥70%)';
        }
        
        this.copySymbolsToClipboard(symbols, title);
    },
    
    copyHighDeliveryVolumeToTradingView() {
        if (!this.deliveryData || !this.deliveryData.securities) {
            showError('No delivery data available');
            return;
        }
        
        const highDeliveryHighVolume = this.deliveryData.securities
            .filter(s => parseFloat(s.deliveryPercentage) >= 50 && s.totalTradedVolume > 100000)
            .map(s => 'NSE:' + s.symbol);
        
        this.copySymbolsToClipboard(highDeliveryHighVolume, 'High Delivery + High Volume');
    },
    
    copyFilteredToTradingView() {
        if (!this.filteredData || this.filteredData.length === 0) {
            showError('No filtered data available. Apply filters first.');
            return;
        }
        
        const symbols = this.filteredData.map(s => 'NSE:' + s.symbol);
        this.copySymbolsToClipboard(symbols, 'Filtered Delivery Stocks');
    },
    
    copySymbolsToClipboard(symbols, title) {
        if (symbols.length === 0) {
            showError(`No ${title} available`);
            return;
        }
        
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
    
    exportToCSV() {
        if (!this.deliveryData || !this.deliveryData.securities) {
            showError('No data available to export');
            return;
        }
        
        const securities = this.deliveryData.securities;
        const headers = [
            'Symbol', 'Series', 'Delivery %', 'Quantity Traded', 'Delivery Quantity', 
            'Last Price', 'Change %', 'Open', 'Day High', 'Day Low', 
            'Total Traded Value', 'Previous Close', '365d Change %'
        ];
        
        const csvData = securities.map(stock => [
            stock.symbol,
            stock.series,
            stock.deliveryPercentage,
            stock.quantityTraded,
            stock.deliveryQuantity,
            stock.lastPrice,
            stock.pChange,
            stock.open,
            stock.dayHigh,
            stock.dayLow,
            stock.totalTradedValue,
            stock.previousClose,
            stock.perChange365d
        ]);
        
        const csvContent = [headers, ...csvData]
            .map(row => row.join(','))
            .join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `delivery_volume_${this.currentDate}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        showSuccess(`Exported ${securities.length} securities to CSV`);
    },
    
    // Utility functions
    formatNumber(num) {
        if (num >= 10000000) return (num / 10000000).toFixed(2) + 'Cr';
        if (num >= 100000) return (num / 100000).toFixed(2) + 'L';
        if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
        return num?.toFixed(0) || '0';
    },
    
    formatCurrency(num) {
        return (num || 0).toFixed(2);
    },
    
    getDeliveryColorClass(percentage) {
        if (percentage >= 70) return 'bg-green-600 text-white';
        if (percentage >= 50) return 'bg-blue-600 text-white';
        if (percentage >= 30) return 'bg-yellow-600 text-white';
        return 'bg-red-600 text-white';
    }
};

// Make module globally available
window.DeliveryVolumeModule = DeliveryVolumeModule;