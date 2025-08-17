// public/js/modules/intraday-analysis.js

const IntradayAnalysisModule = {
    currentSubTab: 'adr', // 'adr' or 'volume'
    currentADRView: 'sector', // 'sector' or 'industry'
    currentVolumeView: 'sector', // 'sector' or 'industry'
    selectedDate: null,
    analysisData: null,
    
    getHTML() {
        return `
            <div class="space-y-6">
                <!-- Header -->
                <div class="card p-6">
                    <h2 class="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                        <i class="fas fa-chart-pie mr-3 text-blue-600"></i>
                        Intraday Sector/Industry Analysis
                    </h2>
                    
                    <!-- Date Filter and Actions -->
                    <div class="flex flex-wrap gap-4 mb-6 items-center">
                        <div class="flex items-center gap-2">
                            <label class="text-sm font-medium text-gray-700">Analysis Date:</label>
                            <input type="date" id="analysisDate" class="px-3 py-2 border border-gray-300 rounded-lg input-field" 
                                   value="${new Date().toISOString().split('T')[0]}"
                                   onchange="IntradayAnalysisModule.onDateChange()">
                        </div>
                        <button onclick="IntradayAnalysisModule.loadAnalysis()" 
                                class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                            <i class="fas fa-sync-alt mr-2"></i>Load Analysis
                        </button>
                        <button onclick="IntradayAnalysisModule.runFreshAnalysis()" 
                                class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                            <i class="fas fa-play mr-2"></i>Run Fresh Analysis
                        </button>
                    </div>
                    
                    <!-- Analysis Status -->
                    <div id="analysisStatus" class="mb-4 p-3 bg-gray-100 rounded-lg text-sm text-gray-600 hidden">
                        <i class="fas fa-info-circle mr-2"></i>
                        <span id="statusMessage"></span>
                    </div>
                    
                    <!-- Sub-Tab Navigation -->
                    <div class="flex gap-2 mb-6">
                        <button class="sub-tab-btn active" data-subtab="adr" onclick="IntradayAnalysisModule.switchSubTab('adr')">
                            <i class="fas fa-balance-scale mr-2"></i>Advance Decline Ratio
                        </button>
                        <button class="sub-tab-btn" data-subtab="volume" onclick="IntradayAnalysisModule.switchSubTab('volume')">
                            <i class="fas fa-chart-bar mr-2"></i>Volume Analysis
                        </button>
                    </div>
                    
                    <!-- Content Area -->
                    <div id="intradayContent">
                        <!-- Content will be loaded here -->
                    </div>
                </div>
            </div>
        `;
    },
    
    async initialize() {
        console.log('Initializing Intraday Analysis Module...');
        this.selectedDate = new Date().toISOString().split('T')[0];
        this.currentSubTab = 'adr';
        
        // Try to load existing analysis for today
        await this.loadAnalysis();
        
        // Load initial content
        await this.loadSubTabContent(this.currentSubTab);
    },
    
    onDateChange() {
        this.selectedDate = document.getElementById('analysisDate').value;
        this.showStatus('Date changed. Click "Load Analysis" to view data for this date.', 'info');
    },
    
    showStatus(message, type = 'info') {
        const statusDiv = document.getElementById('analysisStatus');
        const messageSpan = document.getElementById('statusMessage');
        
        if (!statusDiv || !messageSpan) return;
        
        statusDiv.classList.remove('hidden', 'bg-green-100', 'bg-red-100', 'bg-blue-100', 'bg-gray-100', 'bg-yellow-100');
        statusDiv.classList.add(
            type === 'success' ? 'bg-green-100' : 
            type === 'error' ? 'bg-red-100' : 
            type === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
        );
        
        messageSpan.textContent = message;
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            statusDiv.classList.add('hidden');
        }, 5000);
    },
    
    async loadAnalysis() {
        const date = document.getElementById('analysisDate').value;
        this.selectedDate = date;
        
        try {
            showLoading();
            
            const response = await fetch(`${API_BASE}/intraday-analysis/load`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date })
            });
            
            const result = await response.json();
            
            if (result.success && result.data) {
                this.analysisData = result.data;
                this.showStatus(`Analysis loaded for ${date}`, 'success');
                await this.loadSubTabContent(this.currentSubTab);
            } else {
                this.analysisData = null;
                this.showStatus(`No analysis found for ${date}. Run fresh analysis to generate data.`, 'warning');
                document.getElementById('intradayContent').innerHTML = `
                    <div class="text-center py-12 text-gray-500">
                        <i class="fas fa-database text-5xl mb-4"></i>
                        <p class="text-lg">No analysis data available for ${date}</p>
                        <p class="text-sm mt-2">Click "Run Fresh Analysis" to generate analysis for this date</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading analysis:', error);
            this.showStatus('Error loading analysis: ' + error.message, 'error');
        } finally {
            hideLoading();
        }
    },
    
    async runFreshAnalysis() {
        const date = document.getElementById('analysisDate').value;
        this.selectedDate = date;
        
        try {
            showLoading();
            this.showStatus('Running analysis using Industry/Sector JSON data... This may take a moment.', 'info');
            
            // Use the new endpoint that uses JSON data
            const response = await fetch(`${API_BASE}/intraday-analysis/run-analysis`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.analysisData = result.data;
                this.showStatus(result.message || 'Analysis completed successfully!', 'success');
                await this.loadSubTabContent(this.currentSubTab);
            } else {
                throw new Error(result.error || 'Failed to run analysis');
            }
            
        } catch (error) {
            console.error('Error running analysis:', error);
            this.showStatus('Error running analysis: ' + error.message, 'error');
        } finally {
            hideLoading();
        }
    },
    
    switchSubTab(subTab) {
        this.currentSubTab = subTab;
        
        // Update button states
        document.querySelectorAll('.sub-tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-subtab') === subTab) {
                btn.classList.add('active');
            }
        });
        
        // Load content
        this.loadSubTabContent(subTab);
    },
    
    async loadSubTabContent(subTab) {
        const contentDiv = document.getElementById('intradayContent');
        
        if (!this.analysisData) {
            contentDiv.innerHTML = `
                <div class="text-center py-12 text-gray-500">
                    <i class="fas fa-chart-line text-5xl mb-4"></i>
                    <p class="text-lg">No analysis data available</p>
                    <p class="text-sm mt-2">Run analysis first.</p>
                </div>
            `;
            return;
        }
        
        if (subTab === 'adr') {
            contentDiv.innerHTML = this.getADRContent();
            this.loadADRData();
        } else if (subTab === 'volume') {
            contentDiv.innerHTML = this.getVolumeContent();
            this.loadVolumeData();
        }
    },
    
    getADRContent() {
        return `
            <div class="space-y-6">
                <!-- Market Overview -->
                ${this.analysisData ? `
                <div class="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-4">
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div>
                            <p class="text-sm text-gray-600">Market ADR</p>
                            <p class="text-xl font-bold ${this.analysisData.summary.marketADR > 1 ? 'text-green-600' : 'text-red-600'}">
                                ${this.analysisData.summary.marketADR.toFixed(2)}
                            </p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600">Advances</p>
                            <p class="text-xl font-bold text-green-600">${this.analysisData.summary.marketAdvances}</p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600">Declines</p>
                            <p class="text-xl font-bold text-red-600">${this.analysisData.summary.marketDeclines}</p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600">Unchanged</p>
                            <p class="text-xl font-bold text-gray-600">${this.analysisData.summary.marketUnchanged}</p>
                        </div>
                    </div>
                    <div class="text-center mt-2">
                        <p class="text-xs text-gray-500">Data Source: ${this.analysisData.dataSource === 'preopen' ? 'Pre-Open Session' : 'Current Market Data'}</p>
                    </div>
                </div>
                ` : ''}
                
                <!-- View Toggle -->
                <div class="flex gap-2">
                    <button class="view-toggle-btn active" data-view="sector" onclick="IntradayAnalysisModule.switchADRView('sector')">
                        <i class="fas fa-industry mr-2"></i>Sector Wise
                    </button>
                    <button class="view-toggle-btn" data-view="industry" onclick="IntradayAnalysisModule.switchADRView('industry')">
                        <i class="fas fa-building mr-2"></i>Industry Wise
                    </button>
                </div>
                
                <!-- ADR Table -->
                <div id="adrTableContainer" class="bg-white rounded-lg shadow overflow-hidden">
                    <!-- Table will be loaded here -->
                </div>
            </div>
        `;
    },
    
    getVolumeContent() {
        return `
            <div class="space-y-6">
                <!-- Volume Overview -->
                ${this.analysisData ? `
                <div class="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 mb-4">
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                        <div>
                            <p class="text-sm text-gray-600">Total Volume</p>
                            <p class="text-xl font-bold text-blue-600">${this.formatVolume(this.analysisData.summary.totalVolume)}</p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600">Pre-Open Volume</p>
                            <p class="text-xl font-bold text-green-600">${this.formatVolume(this.analysisData.summary.totalPreopenVolume)}</p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600">Volume Ratio</p>
                            <p class="text-xl font-bold text-purple-600">
                                ${this.analysisData.summary.totalPreopenVolume > 0 ? 
                                  (this.analysisData.summary.totalVolume / this.analysisData.summary.totalPreopenVolume).toFixed(2) : 'N/A'}
                            </p>
                        </div>
                    </div>
                </div>
                ` : ''}
                
                <!-- View Toggle -->
                <div class="flex gap-2">
                    <button class="view-toggle-btn active" data-view="sector" onclick="IntradayAnalysisModule.switchVolumeView('sector')">
                        <i class="fas fa-industry mr-2"></i>Sector Wise
                    </button>
                    <button class="view-toggle-btn" data-view="industry" onclick="IntradayAnalysisModule.switchVolumeView('industry')">
                        <i class="fas fa-building mr-2"></i>Industry Wise
                    </button>
                </div>
                
                <!-- Volume Table -->
                <div id="volumeTableContainer" class="bg-white rounded-lg shadow overflow-hidden">
                    <!-- Table will be loaded here -->
                </div>
            </div>
        `;
    },
    
    switchADRView(view) {
        this.currentADRView = view;
        
        // Update button states
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-view') === view) {
                btn.classList.add('active');
            }
        });
        
        this.loadADRData();
    },
    
    switchVolumeView(view) {
        this.currentVolumeView = view;
        
        // Update button states
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-view') === view) {
                btn.classList.add('active');
            }
        });
        
        this.loadVolumeData();
    },
    
    loadADRData() {
        if (!this.analysisData) return;
        
        const container = document.getElementById('adrTableContainer');
        const data = this.currentADRView === 'sector' ? this.analysisData.sectors : this.analysisData.industries;
        
        // Convert object to array and sort by ADR
        const sortedData = Object.values(data).sort((a, b) => b.adr - a.adr);
        
        let tableHTML = `
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                ${this.currentADRView === 'sector' ? 'Sector' : 'Industry'}
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ADR</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Advances</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Declines</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unchanged</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stocks</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Market Cap (Cr)</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
        `;
        
        sortedData.forEach((item, index) => {
            const adrColor = item.adr > 1 ? 'text-green-600' : item.adr < 1 ? 'text-red-600' : 'text-gray-600';
            
            tableHTML += `
                <tr class="${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 cursor-pointer" 
                    onclick="IntradayAnalysisModule.showDetailModal('${item.name}', '${this.currentADRView}')">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${item.name}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-bold ${adrColor}">
                        ${item.adr.toFixed(2)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        ${item.advances}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                        ${item.declines}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        ${item.unchanged}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                        ${item.stockCount}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        ₹${this.formatNumber(item.totalMarketCap / 100)}
                    </td>
                </tr>
            `;
        });
        
        tableHTML += `
                    </tbody>
                </table>
            </div>
        `;
        
        container.innerHTML = tableHTML;
    },
    
    loadVolumeData() {
        if (!this.analysisData) return;
        
        const container = document.getElementById('volumeTableContainer');
        const data = this.currentVolumeView === 'sector' ? this.analysisData.sectors : this.analysisData.industries;
        
        // Convert object to array and sort by total volume
        const sortedData = Object.values(data).sort((a, b) => b.totalVolume - a.totalVolume);
        
        let tableHTML = `
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                ${this.currentVolumeView === 'sector' ? 'Sector' : 'Industry'}
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Volume</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pre-Open Volume</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volume Ratio</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stocks</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Volume/Stock</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
        `;
        
        sortedData.forEach((item, index) => {
            const volumeRatio = item.preopenVolume > 0 ? (item.totalVolume / item.preopenVolume).toFixed(2) : 'N/A';
            const avgVolumePerStock = item.stockCount > 0 ? this.formatVolume(item.totalVolume / item.stockCount) : '0';
            
            tableHTML += `
                <tr class="${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 cursor-pointer" 
                    onclick="IntradayAnalysisModule.showDetailModal('${item.name}', '${this.currentVolumeView}')">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${item.name}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                        ${this.formatVolume(item.totalVolume)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        ${this.formatVolume(item.preopenVolume)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-purple-600 font-medium">
                        ${volumeRatio}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        ${item.stockCount}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        ${avgVolumePerStock}
                    </td>
                </tr>
            `;
        });
        
        tableHTML += `
                    </tbody>
                </table>
            </div>
        `;
        
        container.innerHTML = tableHTML;
    },
    
    showDetailModal(name, type) {
        if (!this.analysisData) return;
        
        const data = type === 'sector' ? this.analysisData.sectors : this.analysisData.industries;
        const item = data[name];
        
        if (!item || !item.stocks) return;
        
        // Sort stocks by change percentage
        const sortedStocks = item.stocks.sort((a, b) => b.changePercent - a.changePercent);
        
        let stocksHTML = `
            <div class="overflow-x-auto max-h-96">
                <table class="min-w-full">
                    <thead class="bg-gray-50 sticky top-0">
                        <tr>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Symbol</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Change %</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Volume</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pre-Open Vol</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
        `;
        
        sortedStocks.forEach(stock => {
            const changeColor = stock.changePercent > 0 ? 'text-green-600' : 
                              stock.changePercent < 0 ? 'text-red-600' : 'text-gray-600';
            
            stocksHTML += `
                <tr class="hover:bg-gray-50">
                    <td class="px-4 py-2 text-sm font-medium text-gray-900">${stock.symbol}</td>
                    <td class="px-4 py-2 text-sm ${changeColor}">${stock.changePercent.toFixed(2)}%</td>
                    <td class="px-4 py-2 text-sm text-gray-600">${this.formatVolume(stock.volume)}</td>
                    <td class="px-4 py-2 text-sm text-gray-600">${this.formatVolume(stock.preopenVolume)}</td>
                </tr>
            `;
        });
        
        stocksHTML += `
                    </tbody>
                </table>
            </div>
        `;
        
        showModal(`${name} - Stock Details`, stocksHTML);
    },
    
    formatNumber(num) {
        if (num >= 100000) {
            return (num / 100000).toFixed(1) + 'L';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toFixed(0);
    },
    
    formatVolume(volume) {
        if (volume >= 10000000) {
            return (volume / 10000000).toFixed(1) + 'Cr';
        } else if (volume >= 100000) {
            return (volume / 100000).toFixed(1) + 'L';
        } else if (volume >= 1000) {
            return (volume / 1000).toFixed(1) + 'K';
        }
        return volume.toString();
    }
};

// Make the module globally available
window.IntradayAnalysisModule = IntradayAnalysisModule;