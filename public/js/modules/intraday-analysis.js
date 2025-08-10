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
        
        // If no analysis exists for today, run fresh analysis
        if (!this.analysisData) {
            await this.runFreshAnalysis();
        }
    },
    
    onDateChange() {
        this.selectedDate = document.getElementById('analysisDate').value;
        this.showStatus('Date changed. Click "Load Analysis" to view data for this date.', 'info');
    },
    
    showStatus(message, type = 'info') {
        const statusDiv = document.getElementById('analysisStatus');
        const messageSpan = document.getElementById('statusMessage');
        
        statusDiv.classList.remove('hidden', 'bg-green-100', 'bg-red-100', 'bg-blue-100', 'bg-gray-100');
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
            
            // Correct endpoint: /api/intraday-analysis/load
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
            this.showStatus('Running analysis... This may take a moment.', 'info');
            
            // Fetch current stock data from stocks collection
            const stocksResponse = await fetch(`${API_BASE}/stocks/list`);
            const stocksResult = await stocksResponse.json();
            
            if (!stocksResult.success) {
                throw new Error('Failed to load stock data');
            }
            
            // Fetch pre-open data from existing preopen endpoint
            const preopenResponse = await fetch(`${API_BASE}/preopen/data/${date}`);
            const preopenResult = await preopenResponse.json();
            
            let preopenData = null;
            if (preopenResult.success) {
                preopenData = preopenResult.data;
            } else {
                this.showStatus(`No pre-open data available for ${date}. Analysis will use current data only.`, 'warning');
            }
            
            // Perform analysis
            const analysis = await this.performAnalysis(stocksResult.data, preopenData, date);
            
            this.analysisData = analysis;
            
            // Save the analysis
            await this.saveAnalysis();
            
            this.showStatus('Analysis completed successfully!', 'success');
            await this.loadSubTabContent(this.currentSubTab);
            
        } catch (error) {
            console.error('Error running analysis:', error);
            this.showStatus('Error running analysis: ' + error.message, 'error');
        } finally {
            hideLoading();
        }
    },
    
    async performAnalysis(stocks, preopenData, date) {
        // Group stocks by sector and industry
        const sectorGroups = {};
        const industryGroups = {};
        
        stocks.forEach(stock => {
            // Process sector groups
            if (!sectorGroups[stock.sector]) {
                sectorGroups[stock.sector] = {
                    name: stock.sector,
                    stocks: [],
                    advances: 0,
                    declines: 0,
                    unchanged: 0,
                    totalVolume: 0,
                    preopenVolume: 0
                };
            }
            sectorGroups[stock.sector].stocks.push(stock);
            
            // Process industry groups
            if (!industryGroups[stock.industry]) {
                industryGroups[stock.industry] = {
                    name: stock.industry,
                    stocks: [],
                    advances: 0,
                    declines: 0,
                    unchanged: 0,
                    totalVolume: 0,
                    preopenVolume: 0
                };
            }
            industryGroups[stock.industry].stocks.push(stock);
            
            // Count advances/declines
            const change = stock.change || 0;
            if (change > 0) {
                sectorGroups[stock.sector].advances++;
                industryGroups[stock.industry].advances++;
            } else if (change < 0) {
                sectorGroups[stock.sector].declines++;
                industryGroups[stock.industry].declines++;
            } else {
                sectorGroups[stock.sector].unchanged++;
                industryGroups[stock.industry].unchanged++;
            }
            
            // Add current volume
            sectorGroups[stock.sector].totalVolume += (stock.volume || 0);
            industryGroups[stock.industry].totalVolume += (stock.volume || 0);
        });
        
        // Add pre-open volume data if available  
        if (preopenData && preopenData.stocks) {
            // preopenData.stocks contains the array from preopen_data collection
            preopenData.stocks.forEach(preopenStock => {
                const stock = stocks.find(s => s.symbol === preopenStock.symbol);
                if (stock) {
                    // Use finalQuantity from preopen data
                    const preopenVolume = preopenStock.finalQuantity || preopenStock.volume || 0;
                    
                    if (sectorGroups[stock.sector]) {
                        sectorGroups[stock.sector].preopenVolume += preopenVolume;
                    }
                    if (industryGroups[stock.industry]) {
                        industryGroups[stock.industry].preopenVolume += preopenVolume;
                    }
                }
            });
        }
        
        // Calculate ADR and volume ratios for sectors
        const sectorAnalysis = Object.values(sectorGroups).map(sector => ({
            name: sector.name,
            advances: sector.advances,
            declines: sector.declines,
            unchanged: sector.unchanged,
            adr: sector.declines > 0 ? sector.advances / sector.declines : sector.advances,
            totalStocks: sector.stocks.length,
            currentVolume: sector.totalVolume,
            avgPreOpenVolume: sector.preopenVolume, // This will be updated with 20-day average
            volumeRatio: sector.preopenVolume > 0 ? sector.totalVolume / sector.preopenVolume : 'NA',
            stocks: sector.stocks.map(s => ({
                symbol: s.symbol,
                name: s.name,
                price: s.price,
                change: s.change,
                volume: s.volume
            }))
        }));
        
        // Calculate ADR and volume ratios for industries
        const industryAnalysis = Object.values(industryGroups).map(industry => ({
            name: industry.name,
            advances: industry.advances,
            declines: industry.declines,
            unchanged: industry.unchanged,
            adr: industry.declines > 0 ? industry.advances / industry.declines : industry.advances,
            totalStocks: industry.stocks.length,
            currentVolume: industry.totalVolume,
            avgPreOpenVolume: industry.preopenVolume, // This will be updated with 20-day average
            volumeRatio: industry.preopenVolume > 0 ? industry.totalVolume / industry.preopenVolume : 'NA',
            stocks: industry.stocks.map(s => ({
                symbol: s.symbol,
                name: s.name,
                price: s.price,
                change: s.change,
                volume: s.volume
            }))
        }));
        
        // Get 20-day average pre-open volume if available
        await this.fetch20DayAverageVolume(sectorAnalysis, industryAnalysis, date);
        
        return {
            date,
            timestamp: new Date().toISOString(),
            sectorAnalysis,
            industryAnalysis,
            summary: {
                totalSectors: sectorAnalysis.length,
                totalIndustries: industryAnalysis.length,
                totalStocks: stocks.length,
                marketAdvances: stocks.filter(s => s.change > 0).length,
                marketDeclines: stocks.filter(s => s.change < 0).length,
                marketUnchanged: stocks.filter(s => s.change === 0).length,
                marketADR: stocks.filter(s => s.change < 0).length > 0 ? 
                          stocks.filter(s => s.change > 0).length / stocks.filter(s => s.change < 0).length : 
                          stocks.filter(s => s.change > 0).length
            }
        };
    },
    
    async fetch20DayAverageVolume(sectorAnalysis, industryAnalysis, currentDate) {
        try {
            // Use your backend's 20-day average endpoint
            const response = await fetch(`${API_BASE}/intraday-analysis/preopen-20day-average`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    endDate: currentDate,
                    groupBy: ['sector', 'industry']
                })
            });
            
            const result = await response.json();
            
            if (result.success && result.data) {
                // Update sector analysis with 20-day average
                if (result.data.sectorAverages) {
                    sectorAnalysis.forEach(sector => {
                        const avgData = result.data.sectorAverages[sector.name];
                        if (avgData) {
                            sector.avgPreOpenVolume = avgData.avgVolume;
                            sector.volumeRatio = avgData.avgVolume > 0 ? 
                                sector.currentVolume / avgData.avgVolume : 'NA';
                        }
                    });
                }
                
                // Update industry analysis with 20-day average
                if (result.data.industryAverages) {
                    industryAnalysis.forEach(industry => {
                        const avgData = result.data.industryAverages[industry.name];
                        if (avgData) {
                            industry.avgPreOpenVolume = avgData.avgVolume;
                            industry.volumeRatio = avgData.avgVolume > 0 ? 
                                industry.currentVolume / avgData.avgVolume : 'NA';
                        }
                    });
                }
                
                console.log(`Updated with 20-day average from ${result.data.daysAnalyzed} days`);
            }
        } catch (error) {
            console.error('Error fetching 20-day average:', error);
            // Continue with single-day data if 20-day average fails
        }
    },
    
    async saveAnalysis() {
        if (!this.analysisData) {
            this.showStatus('No analysis data to save', 'warning');
            return;
        }
        
        try {
            showLoading();
            
            // Correct endpoint: /api/intraday-analysis/save
            const response = await fetch(`${API_BASE}/intraday-analysis/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.analysisData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showStatus('Analysis saved successfully!', 'success');
            } else {
                throw new Error(result.error || 'Failed to save analysis');
            }
        } catch (error) {
            console.error('Error saving analysis:', error);
            this.showStatus('Error saving analysis: ' + error.message, 'error');
        } finally {
            hideLoading();
        }
    },
    
    async switchSubTab(subTab) {
        this.currentSubTab = subTab;
        
        // Update button states
        document.querySelectorAll('.sub-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.subtab === subTab);
        });
        
        await this.loadSubTabContent(subTab);
    },
    
    async loadSubTabContent(subTab) {
        const contentDiv = document.getElementById('intradayContent');
        
        if (!this.analysisData) {
            contentDiv.innerHTML = `
                <div class="text-center py-12 text-gray-500">
                    <i class="fas fa-chart-pie text-5xl mb-4"></i>
                    <p>No analysis data available. Run analysis first.</p>
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
                
                <!-- Sort Options -->
                <div class="flex items-center gap-4">
                    <label class="text-sm font-medium text-gray-700">Sort By:</label>
                    <select id="adrSortSelect" class="px-3 py-2 border border-gray-300 rounded-lg" onchange="IntradayAnalysisModule.sortADRData()">
                        <option value="name">Name</option>
                        <option value="adr-desc">ADR (High to Low)</option>
                        <option value="adr-asc">ADR (Low to High)</option>
                        <option value="advance-desc">Advances (High to Low)</option>
                        <option value="decline-desc">Declines (High to Low)</option>
                    </select>
                </div>
                
                <!-- Data Table -->
                <div id="adrDataTable" class="overflow-x-auto">
                    <!-- Table will be loaded here -->
                </div>
            </div>
        `;
    },
    
    getVolumeContent() {
        return `
            <div class="space-y-6">
                <!-- View Toggle -->
                <div class="flex gap-2">
                    <button class="view-toggle-btn active" data-view="sector" onclick="IntradayAnalysisModule.switchVolumeView('sector')">
                        <i class="fas fa-industry mr-2"></i>Sector Wise
                    </button>
                    <button class="view-toggle-btn" data-view="industry" onclick="IntradayAnalysisModule.switchVolumeView('industry')">
                        <i class="fas fa-building mr-2"></i>Industry Wise
                    </button>
                </div>
                
                <!-- Sort Options -->
                <div class="flex items-center gap-4">
                    <label class="text-sm font-medium text-gray-700">Sort By:</label>
                    <select id="volumeSortSelect" class="px-3 py-2 border border-gray-300 rounded-lg" onchange="IntradayAnalysisModule.sortVolumeData()">
                        <option value="name">Name</option>
                        <option value="ratio-desc">Volume Ratio (High to Low)</option>
                        <option value="ratio-asc">Volume Ratio (Low to High)</option>
                        <option value="volume-desc">Current Volume (High to Low)</option>
                    </select>
                </div>
                
                <!-- Data Table -->
                <div id="volumeDataTable" class="overflow-x-auto">
                    <!-- Table will be loaded here -->
                </div>
            </div>
        `;
    },
    
    async switchADRView(view) {
        this.currentADRView = view;
        
        // Update button states
        document.querySelectorAll('.view-toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        this.loadADRData();
    },
    
    async switchVolumeView(view) {
        this.currentVolumeView = view;
        
        // Update button states
        document.querySelectorAll('.view-toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        this.loadVolumeData();
    },
    
    loadADRData() {
        const data = this.currentADRView === 'sector' ? 
                     this.analysisData.sectorAnalysis : 
                     this.analysisData.industryAnalysis;
        
        this.adrData = data;
        this.displayADRData(data);
    },
    
    displayADRData(data) {
        const tableDiv = document.getElementById('adrDataTable');
        
        if (!data || data.length === 0) {
            tableDiv.innerHTML = '<p class="text-center py-8 text-gray-500">No data available</p>';
            return;
        }
        
        const tableHTML = `
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-blue-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">
                            ${this.currentADRView === 'sector' ? 'Sector' : 'Industry'}
                        </th>
                        <th class="px-6 py-3 text-center text-xs font-medium text-blue-700 uppercase tracking-wider">
                            Advances
                        </th>
                        <th class="px-6 py-3 text-center text-xs font-medium text-blue-700 uppercase tracking-wider">
                            Declines
                        </th>
                        <th class="px-6 py-3 text-center text-xs font-medium text-blue-700 uppercase tracking-wider">
                            Unchanged
                        </th>
                        <th class="px-6 py-3 text-center text-xs font-medium text-blue-700 uppercase tracking-wider">
                            ADR
                        </th>
                        <th class="px-6 py-3 text-center text-xs font-medium text-blue-700 uppercase tracking-wider">
                            Total Stocks
                        </th>
                        <th class="px-6 py-3 text-center text-xs font-medium text-blue-700 uppercase tracking-wider">
                            Action
                        </th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${data.map(item => {
                        const adrColor = item.adr > 1 ? 'text-green-600' : item.adr < 1 ? 'text-red-600' : 'text-gray-600';
                        const adrBg = item.adr > 1 ? 'bg-green-50' : item.adr < 1 ? 'bg-red-50' : 'bg-gray-50';
                        
                        return `
                            <tr class="hover:bg-gray-50 transition-colors">
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    ${item.name}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-center">
                                    <span class="px-2 py-1 bg-green-100 text-green-700 rounded">${item.advances}</span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-center">
                                    <span class="px-2 py-1 bg-red-100 text-red-700 rounded">${item.declines}</span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-center">
                                    <span class="px-2 py-1 bg-gray-100 text-gray-700 rounded">${item.unchanged}</span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-center">
                                    <span class="px-3 py-1 ${adrBg} ${adrColor} rounded font-semibold">
                                        ${item.adr.toFixed(2)}
                                    </span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">
                                    ${item.totalStocks}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-center">
                                    <button onclick="IntradayAnalysisModule.showStocksPopup('${item.name}', '${this.currentADRView}')" 
                                            class="text-blue-600 hover:text-blue-800 transition-colors">
                                        <i class="fas fa-eye"></i> View Stocks
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
        
        tableDiv.innerHTML = tableHTML;
    },
    
    loadVolumeData() {
        const data = this.currentVolumeView === 'sector' ? 
                     this.analysisData.sectorAnalysis : 
                     this.analysisData.industryAnalysis;
        
        this.volumeData = data;
        this.displayVolumeData(data);
    },
    
    displayVolumeData(data) {
        const tableDiv = document.getElementById('volumeDataTable');
        
        if (!data || data.length === 0) {
            tableDiv.innerHTML = '<p class="text-center py-8 text-gray-500">No data available</p>';
            return;
        }
        
        const tableHTML = `
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-purple-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">
                            ${this.currentVolumeView === 'sector' ? 'Sector' : 'Industry'}
                        </th>
                        <th class="px-6 py-3 text-center text-xs font-medium text-purple-700 uppercase tracking-wider">
                            Current Volume
                        </th>
                        <th class="px-6 py-3 text-center text-xs font-medium text-purple-700 uppercase tracking-wider">
                            20D Avg Pre-Open Volume
                        </th>
                        <th class="px-6 py-3 text-center text-xs font-medium text-purple-700 uppercase tracking-wider">
                            Volume Ratio
                        </th>
                        <th class="px-6 py-3 text-center text-xs font-medium text-purple-700 uppercase tracking-wider">
                            Status
                        </th>
                        <th class="px-6 py-3 text-center text-xs font-medium text-purple-700 uppercase tracking-wider">
                            Action
                        </th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${data.map(item => {
                        const ratio = item.volumeRatio;
                        const ratioDisplay = ratio === 'NA' ? 'NA' : ratio.toFixed(2);
                        const ratioColor = ratio === 'NA' ? 'text-gray-500' : 
                                         ratio > 1.5 ? 'text-green-600' : 
                                         ratio < 0.7 ? 'text-red-600' : 'text-yellow-600';
                        const ratioBg = ratio === 'NA' ? 'bg-gray-50' :
                                       ratio > 1.5 ? 'bg-green-50' : 
                                       ratio < 0.7 ? 'bg-red-50' : 'bg-yellow-50';
                        const status = ratio === 'NA' ? 'No Data' :
                                      ratio > 1.5 ? 'High Volume' :
                                      ratio < 0.7 ? 'Low Volume' : 'Normal';
                        
                        return `
                            <tr class="hover:bg-gray-50 transition-colors">
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    ${item.name}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-center">
                                    ${item.currentVolume.toLocaleString()}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-center">
                                    ${item.avgPreOpenVolume === 'NA' || !item.avgPreOpenVolume ? 'NA' : item.avgPreOpenVolume.toLocaleString()}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-center">
                                    <span class="px-3 py-1 ${ratioBg} ${ratioColor} rounded font-semibold">
                                        ${ratio === 'NA' ? 'NA' : ratioDisplay + 'x'}
                                    </span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-center">
                                    <span class="px-2 py-1 ${ratioBg} ${ratioColor} rounded text-xs">
                                        ${status}
                                    </span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-center">
                                    <button onclick="IntradayAnalysisModule.showStocksPopup('${item.name}', '${this.currentVolumeView}')" 
                                            class="text-purple-600 hover:text-purple-800 transition-colors">
                                        <i class="fas fa-eye"></i> View Stocks
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
        
        tableDiv.innerHTML = tableHTML;
    },
    
    sortADRData() {
        const sortBy = document.getElementById('adrSortSelect').value;
        let sortedData = [...this.adrData];
        
        switch(sortBy) {
            case 'name':
                sortedData.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'adr-desc':
                sortedData.sort((a, b) => b.adr - a.adr);
                break;
            case 'adr-asc':
                sortedData.sort((a, b) => a.adr - b.adr);
                break;
            case 'advance-desc':
                sortedData.sort((a, b) => b.advances - a.advances);
                break;
            case 'decline-desc':
                sortedData.sort((a, b) => b.declines - a.declines);
                break;
        }
        
        this.displayADRData(sortedData);
    },
    
    sortVolumeData() {
        const sortBy = document.getElementById('volumeSortSelect').value;
        let sortedData = [...this.volumeData];
        
        switch(sortBy) {
            case 'name':
                sortedData.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'ratio-desc':
                sortedData.sort((a, b) => {
                    const aRatio = a.volumeRatio === 'NA' ? -1 : a.volumeRatio;
                    const bRatio = b.volumeRatio === 'NA' ? -1 : b.volumeRatio;
                    return bRatio - aRatio;
                });
                break;
            case 'ratio-asc':
                sortedData.sort((a, b) => {
                    const aRatio = a.volumeRatio === 'NA' ? 999999 : a.volumeRatio;
                    const bRatio = b.volumeRatio === 'NA' ? 999999 : b.volumeRatio;
                    return aRatio - bRatio;
                });
                break;
            case 'volume-desc':
                sortedData.sort((a, b) => b.currentVolume - a.currentVolume);
                break;
        }
        
        this.displayVolumeData(sortedData);
    },
    
    showStocksPopup(name, type) {
        const data = type === 'sector' ? 
                     this.analysisData.sectorAnalysis : 
                     this.analysisData.industryAnalysis;
        
        const category = data.find(item => item.name === name);
        if (!category || !category.stocks) {
            showError('No stocks found for ' + name);
            return;
        }
        
        this.displayStocksModal(name, type, category.stocks);
    },
    
    displayStocksModal(name, type, stocks) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('stocksModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'stocksModal';
            modal.className = 'fixed inset-0 bg-gray-900 bg-opacity-50 hidden items-center justify-center z-50';
            document.body.appendChild(modal);
        }
        
        // Sort stocks by change percentage
        stocks.sort((a, b) => (b.change || 0) - (a.change || 0));
        
        const modalHTML = `
            <div class="bg-white rounded-lg shadow-xl max-w-4xl max-h-[80vh] overflow-hidden mx-4">
                <div class="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
                    <div class="flex justify-between items-center">
                        <h3 class="text-xl font-bold">
                            <i class="fas fa-list mr-2"></i>
                            Stocks in ${name} (${type === 'sector' ? 'Sector' : 'Industry'})
                        </h3>
                        <button onclick="IntradayAnalysisModule.closeStocksModal()" class="text-white hover:text-gray-200">
                            <i class="fas fa-times text-2xl"></i>
                        </button>
                    </div>
                    <p class="mt-2 text-sm opacity-90">
                        Analysis Date: ${this.selectedDate} | Total Stocks: ${stocks.length}
                    </p>
                </div>
                
                <div class="p-6 overflow-y-auto max-h-[60vh]">
                    ${stocks.length === 0 ? 
                        '<p class="text-center text-gray-500 py-8">No stocks found</p>' :
                        `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            ${stocks.map(stock => `
                                <div class="border rounded-lg p-4 hover:shadow-lg transition-shadow ${
                                    stock.change > 0 ? 'border-green-200' : 
                                    stock.change < 0 ? 'border-red-200' : 
                                    'border-gray-200'
                                }">
                                    <div class="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 class="font-semibold text-gray-800">${stock.symbol}</h4>
                                            <p class="text-xs text-gray-500">${stock.name || stock.symbol}</p>
                                        </div>
                                        <span class="px-2 py-1 rounded text-xs ${
                                            stock.change > 0 ? 'bg-green-100 text-green-700' : 
                                            stock.change < 0 ? 'bg-red-100 text-red-700' : 
                                            'bg-gray-100 text-gray-700'
                                        }">
                                            ${stock.change > 0 ? '+' : ''}${stock.change?.toFixed(2) || '0.00'}%
                                        </span>
                                    </div>
                                    <div class="space-y-1 text-sm">
                                        <div class="flex justify-between">
                                            <span class="text-gray-600">Price:</span>
                                            <span class="font-medium">₹${stock.price?.toFixed(2) || 'N/A'}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-gray-600">Volume:</span>
                                            <span class="font-medium">${stock.volume?.toLocaleString() || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>`
                    }
                </div>
            </div>
        `;
        
        modal.innerHTML = modalHTML;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    },
    
    closeStocksModal() {
        const modal = document.getElementById('stocksModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    }
};

// Make module globally available
window.IntradayAnalysisModule = IntradayAnalysisModule;