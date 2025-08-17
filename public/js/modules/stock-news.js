// public/js/modules/stock-news.js - Direct Replacement (Optimized Version)
const StockNewsModule = {
    currentDate: new Date().toISOString().split('T')[0],
    analysisInProgress: false,
    currentTab: 'comprehensive-news',
    
    getHTML() {
        return `
            <div id="stock-news" class="tab-content fade-in">
                <div class="card p-8">
                    <h2 class="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                        <i class="fas fa-newspaper mr-3 text-purple-600"></i>
                        Stock News & Analysis
                    </h2>
                    
                    <!-- API Status -->
                    <div id="apiStatus" class="mb-4 p-3 rounded-lg hidden"></div>
                    
                    <!-- Morning News Control Panel -->
                    <div class="mb-6 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            
                            <!-- Morning News Analysis -->
                            <div class="lg:col-span-2">
                                <h3 class="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                                    <i class="fas fa-sun mr-2 text-yellow-500"></i>
                                    Morning News Analysis
                                </h3>
                                <p class="text-sm text-gray-600 mb-4">
                                    Priority-based news analysis: Immediate stock movers + Sector analysis
                                </p>
                                <div class="flex flex-col sm:flex-row gap-3">
                                    <button onclick="StockNewsModule.runMorningNewsAnalysis()" 
                                            id="morningNewsBtn"
                                            class="btn-primary px-6 py-3 rounded-lg font-medium flex-1 transition-all duration-200">
                                        <i class="fas fa-play mr-2"></i>
                                        <span id="morningBtnText">Run Morning News Analysis</span>
                                    </button>
                                    <button onclick="StockNewsModule.stopAnalysis()" 
                                            id="stopAnalysisBtn"
                                            class="btn-secondary px-4 py-3 rounded-lg font-medium hidden">
                                        <i class="fas fa-stop mr-2"></i>
                                        Stop
                                    </button>
                                </div>
                                
                                <!-- Expected Time Notice -->
                                <div class="mt-3 p-3 bg-yellow-100 rounded-lg border border-yellow-200">
                                    <div class="flex items-center text-sm text-yellow-800">
                                        <i class="fas fa-clock mr-2"></i>
                                        <span>Expected completion: 3-4 minutes (Grok + ChatGPT processing)</span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Gap Analysis -->
                            <div>
                                <h3 class="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                                    <i class="fas fa-chart-gap mr-2 text-blue-500"></i>
                                    Gap Analysis
                                </h3>
                                <p class="text-sm text-gray-600 mb-4">
                                    Analyze preopen gaps (Run after 9:10 AM)
                                </p>
                                <div class="mb-3">
                                    <input type="date" id="gapAnalysisDate" 
                                           class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg"
                                           value="${new Date().toISOString().split('T')[0]}">
                                </div>
                                <button onclick="StockNewsModule.runGapAnalysis()" 
                                        id="gapAnalysisBtn"
                                        class="btn-primary px-6 py-3 rounded-lg font-medium w-full">
                                    <i class="fas fa-search mr-2"></i>
                                    Analyze Gaps
                                </button>
                            </div>
                        </div>
                        
                        <!-- Analysis Progress Display -->
                        <div id="analysisProgress" class="hidden mt-6">
                            <div class="bg-white rounded-lg border border-blue-200 p-4">
                                <div class="flex items-center space-x-4 mb-4">
                                    <div class="flex-shrink-0">
                                        <div class="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                    <div class="flex-1">
                                        <h4 class="font-semibold text-blue-900" id="analysisTitle">Running Analysis...</h4>
                                        <span id="progressText" class="text-blue-700 text-sm">Initializing...</span>
                                    </div>
                                    <div class="text-right">
                                        <div class="text-sm text-blue-600 font-medium" id="elapsedTime">00:00</div>
                                        <div class="text-xs text-blue-500">Elapsed</div>
                                    </div>
                                </div>
                                
                                <!-- Progress Bar -->
                                <div class="w-full bg-blue-100 rounded-full h-3 mb-3">
                                    <div id="progressBar" class="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500" style="width: 0%"></div>
                                </div>
                                
                                <!-- Phase Indicators -->
                                <div class="flex justify-between text-xs text-blue-600">
                                    <span id="phase1Status" class="flex items-center">
                                        <i class="fas fa-circle mr-1"></i>Phase 1: Comprehensive
                                    </span>
                                    <span id="phase2Status" class="flex items-center opacity-50">
                                        <i class="fas fa-circle mr-1"></i>Phase 2: Targeted
                                    </span>
                                    <span id="phase3Status" class="flex items-center opacity-50">
                                        <i class="fas fa-circle mr-1"></i>Storage Complete
                                    </span>
                                </div>
                                
                                <!-- Live Progress Log -->
                                <div class="mt-4 bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto" id="progressLog">
                                    <!-- Progress messages will appear here -->
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Main Content Tabs -->
                    <div class="mb-6">
                        <div class="flex flex-wrap space-x-1 bg-gray-100 p-1 rounded-lg">
                            <button onclick="StockNewsModule.switchTab('comprehensive-news')" 
                                    id="tab-comprehensive-news" 
                                    class="tab-btn flex-1 py-3 px-4 rounded-md font-medium transition-colors bg-white text-blue-600 shadow-sm">
                                <i class="fas fa-newspaper mr-2"></i>
                                <span class="hidden sm:inline">High Impact News</span>
                                <span class="sm:hidden">News</span>
                            </button>
                            <button onclick="StockNewsModule.switchTab('sector-news')" 
                                    id="tab-sector-news" 
                                    class="tab-btn flex-1 py-3 px-4 rounded-md font-medium transition-colors text-gray-600 hover:text-gray-900">
                                <i class="fas fa-industry mr-2"></i>
                                <span class="hidden sm:inline">Sector News</span>
                                <span class="sm:hidden">Sectors</span>
                            </button>
                            <button onclick="StockNewsModule.switchTab('gap-analysis')" 
                                    id="tab-gap-analysis" 
                                    class="tab-btn flex-1 py-3 px-4 rounded-md font-medium transition-colors text-gray-600 hover:text-gray-900">
                                <i class="fas fa-chart-gap mr-2"></i>
                                <span class="hidden sm:inline">Gap Analysis</span>
                                <span class="sm:hidden">Gaps</span>
                            </button>
                            <button onclick="StockNewsModule.switchTab('search')" 
                                    id="tab-search" 
                                    class="tab-btn flex-1 py-3 px-4 rounded-md font-medium transition-colors text-gray-600 hover:text-gray-900">
                                <i class="fas fa-search mr-2"></i>
                                <span class="hidden sm:inline">Search</span>
                                <span class="sm:hidden">Search</span>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Tab Content Container -->
                    <div id="tabContent" class="min-h-[400px]">
                        <!-- Content will be loaded here -->
                    </div>
                </div>
            </div>
        `;
    },

    async initialize() {
        this.currentDate = new Date().toISOString().split('T')[0];
        await this.checkApiHealth();
        await this.loadTabContent('comprehensive-news');
        this.setupEventListeners();
    },

    setupEventListeners() {
        // Auto-refresh every 5 minutes when not analyzing
        setInterval(() => {
            if (!this.analysisInProgress) {
                this.loadTabContent(this.currentTab);
            }
        }, 5 * 60 * 1000);
    },

    async checkApiHealth() {
        try {
            const response = await fetch('/api/stock-news/health');
            const data = await response.json();
            
            const statusDiv = document.getElementById('apiStatus');
            if (data.success) {
                const hasGrok = data.hasGrokKey;
                const hasOpenAI = data.hasOpenAIKey;
                
                if (hasGrok && hasOpenAI) {
                    statusDiv.className = 'mb-4 p-3 rounded-lg bg-green-100 text-green-800 border border-green-200';
                    statusDiv.innerHTML = `
                        <div class="flex items-center justify-between">
                            <span><i class="fas fa-check-circle mr-2"></i>API Status: Ready (v${data.version || '2.0'})</span>
                            <div class="flex space-x-3 text-sm">
                                <span class="bg-green-200 px-2 py-1 rounded">Grok ✅</span>
                                <span class="bg-green-200 px-2 py-1 rounded">ChatGPT ✅</span>
                            </div>
                        </div>
                    `;
                } else {
                    statusDiv.className = 'mb-4 p-3 rounded-lg bg-yellow-100 text-yellow-800 border border-yellow-200';
                    statusDiv.innerHTML = `
                        <div class="flex items-center justify-between">
                            <span><i class="fas fa-exclamation-triangle mr-2"></i>API Status: Limited</span>
                            <div class="flex space-x-3 text-sm">
                                <span class="bg-yellow-200 px-2 py-1 rounded">Grok ${hasGrok ? '✅' : '❌'}</span>
                                <span class="bg-yellow-200 px-2 py-1 rounded">ChatGPT ${hasOpenAI ? '✅' : '❌'}</span>
                            </div>
                        </div>
                    `;
                }
            } else {
                statusDiv.className = 'mb-4 p-3 rounded-lg bg-red-100 text-red-800 border border-red-200';
                statusDiv.innerHTML = `<i class="fas fa-exclamation-triangle mr-2"></i>API Error: ${data.error}`;
            }
            statusDiv.classList.remove('hidden');
            
        } catch (error) {
            console.error('API health check failed:', error);
        }
    },

    async runMorningNewsAnalysis() {
        if (this.analysisInProgress) {
            showError('Analysis already in progress. Please wait...');
            return;
        }

        this.analysisInProgress = true;
        const progressDiv = document.getElementById('analysisProgress');
        const btn = document.getElementById('morningNewsBtn');
        const stopBtn = document.getElementById('stopAnalysisBtn');
        const btnText = document.getElementById('morningBtnText');
        
        // Update UI
        progressDiv.classList.remove('hidden');
        btn.disabled = true;
        stopBtn.classList.remove('hidden');
        btnText.textContent = 'Analysis Running...';
        
        // Start elapsed time counter
        const startTime = Date.now();
        const timeInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            document.getElementById('elapsedTime').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);

        try {
            document.getElementById('analysisTitle').textContent = 'Morning News Analysis (Priority-Based)';
            document.getElementById('progressText').textContent = 'Initializing priority-based analysis...';
            this.updateProgressBar(5);
            this.addProgressLog('🚀 Starting optimized morning news analysis...');

            // Use the new optimized endpoint
            const response = await fetch('/api/stock-news/morning-news-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: this.currentDate })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let progress = 10;

            while (true) {
                const { done, value } = await reader.read();
                if (done || !this.analysisInProgress) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim());

                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        
                        if (data.progress) {
                            document.getElementById('progressText').textContent = data.progress;
                            this.addProgressLog(data.progress);
                            
                            // Update progress based on phase
                            if (data.progress.includes('PHASE 1')) {
                                this.updatePhaseStatus('phase1Status', 'active');
                                progress = Math.min(progress + 5, 40);
                            } else if (data.progress.includes('✅ Grok comprehensive')) {
                                progress = 50;
                            } else if (data.progress.includes('✅ OpenAI comprehensive')) {
                                progress = 60;
                            } else if (data.progress.includes('PHASE 2')) {
                                this.updatePhaseStatus('phase1Status', 'completed');
                                this.updatePhaseStatus('phase2Status', 'active');
                                progress = 70;
                            } else if (data.progress.includes('✅ Phase 2')) {
                                progress = 85;
                            } else if (data.progress.includes('COMPLETED')) {
                                this.updatePhaseStatus('phase2Status', 'completed');
                                this.updatePhaseStatus('phase3Status', 'completed');
                                progress = 100;
                            }
                            
                            this.updateProgressBar(progress);
                        }
                        
                        if (data.result) {
                            clearInterval(timeInterval);
                            const result = data.result;
                            
                            this.addProgressLog('✅ Analysis completed successfully!');
                            this.addProgressLog(`📊 Found ${result.summary.totalNewsItems} news items across ${result.summary.sectorsAnalyzed || 0} sectors`);
                            
                            showSuccess(`Morning analysis completed! Found ${result.summary.totalNewsItems} news items.`);
                            
                            // Refresh current tab to show new data
                            await this.loadTabContent(this.currentTab);
                            
                            setTimeout(() => {
                                progressDiv.classList.add('hidden');
                                this.resetProgressUI();
                            }, 3000);
                        }
                    } catch (e) {
                        // Skip non-JSON lines
                        console.debug('Skipping non-JSON line:', line);
                    }
                }
            }

        } catch (error) {
            clearInterval(timeInterval);
            console.error('Morning analysis failed:', error);
            this.addProgressLog(`❌ Error: ${error.message}`);
            showError('Morning analysis failed: ' + error.message);
            
            setTimeout(() => {
                progressDiv.classList.add('hidden');
                this.resetProgressUI();
            }, 3000);
        } finally {
            this.analysisInProgress = false;
        }
    },

    stopAnalysis() {
        this.analysisInProgress = false;
        this.addProgressLog('🛑 Analysis stopped by user');
        document.getElementById('progressText').textContent = 'Analysis stopped';
        
        setTimeout(() => {
            document.getElementById('analysisProgress').classList.add('hidden');
            this.resetProgressUI();
        }, 2000);
    },

    resetProgressUI() {
        const btn = document.getElementById('morningNewsBtn');
        const stopBtn = document.getElementById('stopAnalysisBtn');
        const btnText = document.getElementById('morningBtnText');
        
        btn.disabled = false;
        stopBtn.classList.add('hidden');
        btnText.textContent = 'Run Morning News Analysis';
        
        // Reset progress indicators
        this.updateProgressBar(0);
        this.updatePhaseStatus('phase1Status', 'pending');
        this.updatePhaseStatus('phase2Status', 'pending');
        this.updatePhaseStatus('phase3Status', 'pending');
        
        document.getElementById('progressLog').innerHTML = '';
        document.getElementById('elapsedTime').textContent = '00:00';
    },

    updateProgressBar(percentage) {
        document.getElementById('progressBar').style.width = `${percentage}%`;
    },

    updatePhaseStatus(phaseId, status) {
        const element = document.getElementById(phaseId);
        element.classList.remove('opacity-50', 'text-green-600', 'text-blue-600');
        
        switch(status) {
            case 'active':
                element.classList.add('text-blue-600');
                element.querySelector('i').className = 'fas fa-spinner fa-spin mr-1';
                break;
            case 'completed':
                element.classList.add('text-green-600');
                element.querySelector('i').className = 'fas fa-check-circle mr-1';
                break;
            case 'pending':
            default:
                element.classList.add('opacity-50');
                element.querySelector('i').className = 'fas fa-circle mr-1';
                break;
        }
    },

    addProgressLog(message) {
        const logDiv = document.getElementById('progressLog');
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = 'text-xs text-gray-600 py-1 border-b border-gray-200 last:border-b-0';
        logEntry.innerHTML = `<span class="text-gray-400">${timestamp}</span> ${message}`;
        logDiv.appendChild(logEntry);
        logDiv.scrollTop = logDiv.scrollHeight;
    },

    async runGapAnalysis() {
        const date = document.getElementById('gapAnalysisDate').value;
        const btn = document.getElementById('gapAnalysisBtn');
        
        showLoading();
        btn.disabled = true;
        
        try {
            // Use the new optimized gap analysis endpoint
            const response = await fetch('/api/stock-news/gap-analysis-news', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showSuccess(`Gap analysis completed for ${data.data.totalGapsAnalyzed} stocks`);
                await this.switchTab('gap-analysis');
            } else {
                showError(data.error);
            }
            
        } catch (error) {
            console.error('Gap analysis failed:', error);
            showError('Gap analysis failed: ' + error.message);
        } finally {
            hideLoading();
            btn.disabled = false;
        }
    },

    async switchTab(tab) {
        this.currentTab = tab;
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.className = 'tab-btn flex-1 py-3 px-4 rounded-md font-medium transition-colors text-gray-600 hover:text-gray-900';
        });
        document.getElementById(`tab-${tab}`).className = 'tab-btn flex-1 py-3 px-4 rounded-md font-medium transition-colors bg-white text-blue-600 shadow-sm';
        
        await this.loadTabContent(tab);
    },

    async loadTabContent(tab) {
        const contentDiv = document.getElementById('tabContent');
        
        switch(tab) {
            case 'comprehensive-news':
                await this.loadComprehensiveNews(contentDiv);
                break;
            case 'sector-news':
                await this.loadSectorNews(contentDiv);
                break;
            case 'gap-analysis':
                await this.loadGapAnalysis(contentDiv);
                break;
            case 'search':
                this.loadSearchTab(contentDiv);
                break;
        }
    },

    async loadComprehensiveNews(container) {
        try {
            // Use the new optimized search endpoint
            const response = await fetch(`/api/stock-news/search-news`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    date: this.currentDate, 
                    newsType: 'HIGH_IMPACT_NEWS' 
                })
            });
            
            const result = await response.json();
            
            if (result.data && result.data.length > 0) {
                this.displayComprehensiveNews(container, result.data);
            } else {
                container.innerHTML = `
                    <div class="text-center py-12 text-gray-500">
                        <i class="fas fa-newspaper text-4xl mb-4 opacity-50"></i>
                        <p class="text-lg mb-2">No high impact news available for ${this.currentDate}</p>
                        <p class="text-sm">Click "Run Morning News Analysis" to fetch latest priority news</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading comprehensive news:', error);
            container.innerHTML = '<div class="text-red-600 text-center py-8">Error loading news</div>';
        }
    },

    displayComprehensiveNews(container, newsData) {
        // Sort by priority (1 = highest) and impact
        const sortedNews = newsData.sort((a, b) => {
            const priorityA = a.priority || 2;
            const priorityB = b.priority || 2;
            if (priorityA !== priorityB) return priorityA - priorityB;
            return (b.impact === 'High' ? 1 : 0) - (a.impact === 'High' ? 1 : 0);
        });
        
        const highImpactCount = newsData.filter(n => n.impact === 'High').length;
        const priority1Count = newsData.filter(n => n.priority === 1).length;
        
        container.innerHTML = `
            <div class="space-y-4">
                <div class="flex flex-wrap justify-between items-center mb-4 gap-2">
                    <h3 class="text-lg font-semibold text-gray-800">High Impact News - ${this.currentDate}</h3>
                    <div class="flex flex-wrap gap-2">
                        <span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                            ${newsData.length} Total
                        </span>
                        <span class="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                            ${priority1Count} Priority 1
                        </span>
                        <span class="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                            ${highImpactCount} High Impact
                        </span>
                    </div>
                </div>
                
                ${sortedNews.map(news => `
                    <div class="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow bg-white">
                        <div class="flex items-start justify-between mb-3">
                            <div class="flex-1">
                                <div class="flex flex-wrap items-center gap-2 mb-2">
                                    <span class="font-bold text-lg text-gray-900">${news.symbol || 'MARKET'}</span>
                                    <span class="px-2 py-1 rounded-full text-xs font-medium ${this.getNewsTypeColor(news.newsType)}">${news.newsType || 'NEWS'}</span>
                                    <span class="px-2 py-1 rounded-full text-xs font-medium ${this.getImpactColor(news.impact)}">${news.impact || 'Medium'} Impact</span>
                                    ${news.priority === 1 ? '<span class="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">Priority 1</span>' : ''}
                                    ${news.confidence ? `<span class="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">${news.confidence} Confidence</span>` : ''}
                                </div>
                                <h4 class="font-semibold text-gray-900 mb-2">${news.headline}</h4>
                                ${news.details ? `<p class="text-gray-600 text-sm mb-3">${news.details}</p>` : ''}
                                <div class="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                    <span><i class="fas fa-building mr-1"></i>${news.companyName || news.symbol}</span>
                                    ${news.expectedMove ? `<span><i class="fas fa-chart-line mr-1"></i>Expected: ${news.expectedMove}</span>` : ''}
                                    ${news.timing ? `<span><i class="fas fa-clock mr-1"></i>${news.timing}</span>` : ''}
                                    ${news.source ? `<span><i class="fas fa-link mr-1"></i>${news.source}</span>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    async loadSectorNews(container) {
        try {
            const response = await fetch(`/api/stock-news/search-news`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    date: this.currentDate, 
                    newsType: 'TARGETED_STOCK_NEWS' 
                })
            });
            
            const result = await response.json();
            
            if (result.data && result.data.length > 0) {
                this.displaySectorNews(container, result.data);
            } else {
                container.innerHTML = `
                    <div class="text-center py-12 text-gray-500">
                        <i class="fas fa-industry text-4xl mb-4 opacity-50"></i>
                        <p class="text-lg mb-2">No sector-specific news available for ${this.currentDate}</p>
                        <p class="text-sm">Sector news is generated during Phase 2 of morning analysis</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading sector news:', error);
            container.innerHTML = '<div class="text-red-600 text-center py-8">Error loading sector news</div>';
        }
    },

    displaySectorNews(container, newsData) {
        // Group news by sector
        const newsBySector = newsData.reduce((acc, news) => {
            const sector = news.sector || 'Other';
            if (!acc[sector]) acc[sector] = [];
            acc[sector].push(news);
            return acc;
        }, {});
        
        container.innerHTML = `
            <div class="space-y-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold text-gray-800">Sector-Specific News - ${this.currentDate}</h3>
                    <span class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        ${Object.keys(newsBySector).length} Sectors
                    </span>
                </div>
                
                ${Object.entries(newsBySector).map(([sector, sectorNews]) => `
                    <div class="bg-white border border-gray-200 rounded-lg p-5">
                        <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                            <i class="fas fa-industry mr-2 text-blue-500"></i>
                            ${sector} (${sectorNews.length} stocks)
                        </h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            ${sectorNews.map(news => `
                                <div class="border border-gray-100 rounded p-3 hover:bg-gray-50">
                                    <div class="flex justify-between items-start mb-2">
                                        <span class="font-bold text-blue-600">${news.symbol}</span>
                                        <span class="px-2 py-1 rounded text-xs font-medium ${this.getImpactColor(news.impact)}">${news.impact}</span>
                                    </div>
                                    <p class="text-sm text-gray-700 mb-2">${news.headline}</p>
                                    <div class="text-xs text-gray-500">
                                        <span class="mr-3">${news.newsType}</span>
                                        ${news.timing ? `<span>${news.timing}</span>` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    async loadGapAnalysis(container) {
        try {
            const response = await fetch(`/api/stock-news/search-news`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    date: this.currentDate, 
                    newsType: 'GAP_SPECIFIC_NEWS' 
                })
            });
            
            const result = await response.json();
            
            if (result.data && result.data.length > 0) {
                this.displayGapAnalysis(container, result.data);
            } else {
                container.innerHTML = `
                    <div class="text-center py-12 text-gray-500">
                        <i class="fas fa-chart-gap text-4xl mb-4 opacity-50"></i>
                        <p class="text-lg mb-2">No gap analysis available for ${this.currentDate}</p>
                        <p class="text-sm">Run gap analysis after 9:10 AM when preopen data is available</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading gap analysis:', error);
            container.innerHTML = '<div class="text-red-600 text-center py-8">Error loading gap analysis</div>';
        }
    },

    displayGapAnalysis(container, gapData) {
        // Group by gap categories based on gapPercent
        const gapsByCategory = gapData.reduce((acc, gap) => {
            let category;
            if (gap.gapPercent > 3) category = 'Strong Up (>3%)';
            else if (gap.gapPercent >= 1) category = 'Moderate Up (1-3%)';
            else if (gap.gapPercent <= -3) category = 'Strong Down (<-3%)';
            else if (gap.gapPercent <= -1) category = 'Moderate Down (-1 to -3%)';
            else category = 'Minor Gaps';
            
            if (!acc[category]) acc[category] = [];
            acc[category].push(gap);
            return acc;
        }, {});
        
        container.innerHTML = `
            <div class="space-y-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold text-gray-800">Gap Analysis - ${this.currentDate}</h3>
                    <span class="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                        ${gapData.length} Gaps Analyzed
                    </span>
                </div>
                
                ${Object.entries(gapsByCategory).map(([category, gaps]) => {
                    const colorClass = this.getGapCategoryColor(category);
                    return `
                        <div class="${colorClass} border rounded-lg p-4">
                            <h4 class="font-semibold mb-3">${category} (${gaps.length} stocks)</h4>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                ${gaps.map(gap => `
                                    <div class="bg-white rounded p-3 border">
                                        <div class="flex justify-between items-start mb-2">
                                            <span class="font-bold">${gap.symbol}</span>
                                            <span class="font-semibold ${gap.gapPercent > 0 ? 'text-green-600' : 'text-red-600'}">
                                                ${gap.gapPercent > 0 ? '+' : ''}${gap.gapPercent}%
                                            </span>
                                        </div>
                                        <p class="text-sm text-gray-700 mb-2">${gap.primaryReason || gap.details}</p>
                                        ${gap.newsEvents && gap.newsEvents.length > 0 ? `
                                            <div class="text-xs text-gray-600 mb-2">
                                                <strong>Events:</strong> ${gap.newsEvents.join(', ')}
                                            </div>
                                        ` : ''}
                                        <div class="flex items-center justify-between text-xs">
                                            <span class="px-2 py-1 bg-gray-100 rounded">
                                                ${gap.confidence || 'Medium'} Confidence
                                            </span>
                                            ${gap.expectedAction ? `<span class="text-gray-600">${gap.expectedAction}</span>` : ''}
                                        </div>
                                        ${gap.tradingStrategy ? `
                                            <div class="mt-2 text-xs text-gray-600 italic">
                                                Strategy: ${gap.tradingStrategy}
                                            </div>
                                        ` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    },

    loadSearchTab(container) {
        container.innerHTML = `
            <div class="space-y-6">
                <div class="bg-gray-50 border rounded-lg p-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">Search News Database</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Date</label>
                            <input type="date" id="searchDate" 
                                   class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg"
                                   value="${this.currentDate}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Symbol</label>
                            <input type="text" id="searchSymbol" 
                                   class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg"
                                   placeholder="e.g., TCS, RELIANCE">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">News Type</label>
                            <select id="searchNewsType" class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg">
                                <option value="">All Types</option>
                                <option value="EARNINGS">Earnings</option>
                                <option value="M&A">M&A</option>
                                <option value="ORDERS">Orders</option>
                                <option value="MANAGEMENT">Management</option>
                                <option value="REGULATORY">Regulatory</option>
                                <option value="BREAKOUT">Breakout</option>
                                <option value="TECHNICAL">Technical</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Impact</label>
                            <select id="searchImpact" class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg">
                                <option value="">All Impacts</option>
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                            </select>
                        </div>
                    </div>
                    <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Keyword Search</label>
                            <input type="text" id="searchKeyword" 
                                   class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg"
                                   placeholder="Search in headlines, details...">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Sector</label>
                            <input type="text" id="searchSector" 
                                   class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg"
                                   placeholder="e.g., Information Technology">
                        </div>
                    </div>
                    <div class="mt-4 flex space-x-3">
                        <button onclick="StockNewsModule.searchNews()" 
                                class="btn-primary px-6 py-3 rounded-lg font-medium">
                            <i class="fas fa-search mr-2"></i>Search
                        </button>
                        <button onclick="StockNewsModule.clearSearch()" 
                                class="btn-secondary px-6 py-3 rounded-lg font-medium">
                            <i class="fas fa-eraser mr-2"></i>Clear
                        </button>
                    </div>
                </div>
                
                <div id="searchResults">
                    <div class="text-center py-8 text-gray-500">
                        <i class="fas fa-search text-3xl mb-3 opacity-50"></i>
                        <p>Enter search criteria and click Search to find news</p>
                    </div>
                </div>
            </div>
        `;
    },

    async searchNews() {
        const searchParams = {
            date: document.getElementById('searchDate').value,
            symbol: document.getElementById('searchSymbol').value,
            newsType: document.getElementById('searchNewsType').value,
            impact: document.getElementById('searchImpact').value,
            keyword: document.getElementById('searchKeyword').value,
            sector: document.getElementById('searchSector').value
        };
        
        // Remove empty parameters
        Object.keys(searchParams).forEach(key => {
            if (!searchParams[key]) delete searchParams[key];
        });
        
        showLoading();
        
        try {
            const response = await fetch('/api/stock-news/search-news', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(searchParams)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.displaySearchResults(result.data, result.count);
                if (result.count > 0) {
                    showSuccess(`Found ${result.count} news items`);
                }
            } else {
                showError('Search failed');
            }
            
        } catch (error) {
            console.error('Search error:', error);
            showError('Search failed: ' + error.message);
        } finally {
            hideLoading();
        }
    },

    displaySearchResults(results, count) {
        const resultsDiv = document.getElementById('searchResults');
        
        if (!results || results.length === 0) {
            resultsDiv.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-search text-3xl mb-3 opacity-50"></i>
                    <p>No results found for the search criteria</p>
                </div>
            `;
            return;
        }
        
        resultsDiv.innerHTML = `
            <div class="space-y-3">
                <h4 class="font-semibold text-gray-800">Search Results (${count})</h4>
                ${results.map(item => `
                    <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
                        <div class="flex items-start justify-between">
                            <div class="flex-1">
                                <div class="flex flex-wrap items-center gap-2 mb-2">
                                    <span class="font-bold">${item.symbol || 'MARKET'}</span>
                                    <span class="px-2 py-1 rounded text-xs font-medium ${this.getNewsTypeColor(item.newsType)}">${item.newsType || 'NEWS'}</span>
                                    <span class="px-2 py-1 rounded text-xs font-medium ${this.getImpactColor(item.impact)}">${item.impact || 'Medium'}</span>
                                    <span class="text-sm text-gray-500">${new Date(item.timestamp).toLocaleString()}</span>
                                    ${item.sector ? `<span class="text-xs text-blue-600">${item.sector}</span>` : ''}
                                </div>
                                <h5 class="font-medium text-gray-900 mb-1">${item.headline}</h5>
                                ${item.details ? `<p class="text-gray-600 text-sm">${item.details}</p>` : ''}
                                ${item.primaryReason ? `<p class="text-gray-600 text-sm mt-1"><strong>Reason:</strong> ${item.primaryReason}</p>` : ''}
                                ${item.gapPercent ? `<p class="text-gray-600 text-sm mt-1"><strong>Gap:</strong> ${item.gapPercent > 0 ? '+' : ''}${item.gapPercent}%</p>` : ''}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    clearSearch() {
        document.getElementById('searchDate').value = this.currentDate;
        document.getElementById('searchSymbol').value = '';
        document.getElementById('searchNewsType').value = '';
        document.getElementById('searchImpact').value = '';
        document.getElementById('searchKeyword').value = '';
        document.getElementById('searchSector').value = '';
        
        document.getElementById('searchResults').innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-search text-3xl mb-3 opacity-50"></i>
                <p>Enter search criteria and click Search to find news</p>
            </div>
        `;
    },

    // Helper functions
    getNewsTypeColor(type) {
        const colors = {
            'EARNINGS': 'bg-green-100 text-green-800',
            'M&A': 'bg-purple-100 text-purple-800',
            'ORDERS': 'bg-blue-100 text-blue-800',
            'MANAGEMENT': 'bg-yellow-100 text-yellow-800',
            'REGULATORY': 'bg-red-100 text-red-800',
            'BREAKOUT': 'bg-indigo-100 text-indigo-800',
            'BREAKDOWN': 'bg-orange-100 text-orange-800',
            'POLICY': 'bg-teal-100 text-teal-800',
            'TECHNICAL': 'bg-gray-100 text-gray-800'
        };
        return colors[type] || 'bg-gray-100 text-gray-800';
    },

    getImpactColor(impact) {
        const colors = {
            'High': 'bg-red-100 text-red-800',
            'Medium': 'bg-yellow-100 text-yellow-800',
            'Low': 'bg-green-100 text-green-800'
        };
        return colors[impact] || 'bg-gray-100 text-gray-800';
    },

    getGapCategoryColor(category) {
        if (category.includes('Strong Up')) return 'bg-green-50 border-green-200 text-green-900';
        if (category.includes('Moderate Up')) return 'bg-blue-50 border-blue-200 text-blue-900';
        if (category.includes('Moderate Down')) return 'bg-yellow-50 border-yellow-200 text-yellow-900';
        if (category.includes('Strong Down')) return 'bg-red-50 border-red-200 text-red-900';
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
};

// Make module globally available (keep your existing pattern)
window.StockNewsModule = StockNewsModule;