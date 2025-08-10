// =====================================================
// FILE: /public/js/modules/stock-news.js
// =====================================================

const StockNewsModule = {
    news: [],
    currentSymbol: '',

    getHTML() {
        return `
            <div id="stock-news" class="tab-content fade-in">
                <div class="card p-8">
                    <h2 class="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                        <i class="fas fa-newspaper mr-3 text-purple-600"></i>
                        Stock News & Analysis
                    </h2>
                    
                    <!-- Search Section -->
                    <div class="mb-6 p-6 bg-gray-50 rounded-lg">
                        <h3 class="text-lg font-semibold text-gray-700 mb-4">Search News</h3>
                        <div class="flex gap-4">
                            <div class="flex-1">
                                <label class="block text-sm font-medium text-gray-700 mb-2">Stock Symbol</label>
                                <input type="text" id="newsSymbol" class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Enter stock symbol (e.g., RELIANCE)">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Category</label>
                                <select id="newsCategory" class="input-field px-4 py-2 border border-gray-300 rounded-lg">
                                    <option value="">All News</option>
                                    <option value="earnings">Earnings</option>
                                    <option value="announcements">Corporate Announcements</option>
                                    <option value="analyst">Analyst Reports</option>
                                    <option value="market">Market News</option>
                                </select>
                            </div>
                            <div class="pt-7">
                                <button onclick="StockNewsModule.searchNews()" class="btn-primary px-6 py-3 rounded-lg font-medium">
                                    <i class="fas fa-search mr-2"></i>Search
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Quick Actions -->
                    <div class="mb-6 flex gap-3">
                        <button onclick="StockNewsModule.loadTrendingNews()" class="btn-primary px-6 py-3 rounded-lg font-medium">
                            <i class="fas fa-fire mr-2"></i>Trending News
                        </button>
                        <button onclick="StockNewsModule.loadMarketNews()" class="btn-primary px-6 py-3 rounded-lg font-medium">
                            <i class="fas fa-chart-line mr-2"></i>Market News
                        </button>
                        <button onclick="StockNewsModule.loadEarningsNews()" class="btn-primary px-6 py-3 rounded-lg font-medium">
                            <i class="fas fa-dollar-sign mr-2"></i>Earnings News
                        </button>
                    </div>

                    <!-- News Grid -->
                    <div id="newsContainer" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <!-- News items will be loaded here -->
                    </div>

                    <!-- Load More Button -->
                    <div class="text-center mt-8">
                        <button id="loadMoreBtn" onclick="StockNewsModule.loadMoreNews()" class="btn-primary px-6 py-3 rounded-lg font-medium" style="display: none;">
                            <i class="fas fa-plus mr-2"></i>Load More News
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    async initialize() {
        await this.loadTrendingNews();
        this.setupEventListeners();
    },

    setupEventListeners() {
        const symbolInput = document.getElementById('newsSymbol');
        if (symbolInput) {
            symbolInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchNews();
                }
            });
        }
    },

    async searchNews() {
        const symbol = document.getElementById('newsSymbol').value.trim();
        const category = document.getElementById('newsCategory').value;
        
        if (!symbol) {
            showError('Please enter a stock symbol');
            return;
        }

        this.currentSymbol = symbol;
        showLoading();
        
        try {
            // This would integrate with a real news API
            const news = this.generateSampleNews(symbol, category);
            this.displayNews(news);
            showSuccess(`News loaded for ${symbol}`);
        } catch (error) {
            showError('Error loading news: ' + error.message);
        } finally {
            hideLoading();
        }
    },

    async loadTrendingNews() {
        showLoading();
        
        try {
            const news = this.generateSampleNews('TRENDING', '');
            this.displayNews(news);
            showSuccess('Trending news loaded');
        } catch (error) {
            showError('Error loading trending news: ' + error.message);
        } finally {
            hideLoading();
        }
    },

    async loadMarketNews() {
        showLoading();
        
        try {
            const news = this.generateSampleNews('MARKET', 'market');
            this.displayNews(news);
            showSuccess('Market news loaded');
        } catch (error) {
            showError('Error loading market news: ' + error.message);
        } finally {
            hideLoading();
        }
    },

    async loadEarningsNews() {
        showLoading();
        
        try {
            const news = this.generateSampleNews('EARNINGS', 'earnings');
            this.displayNews(news);
            showSuccess('Earnings news loaded');
        } catch (error) {
            showError('Error loading earnings news: ' + error.message);
        } finally {
            hideLoading();
        }
    },

    generateSampleNews(symbol, category) {
        // Sample news generator for demonstration
        const headlines = [
            'Company reports strong quarterly results',
            'New product launch expected to boost revenue',
            'Management guidance revised upward',
            'Stock reaches new 52-week high',
            'Analyst upgrades target price',
            'Major contract announcement',
            'Expansion into new markets',
            'Dividend announcement',
            'Share buyback program launched',
            'Partnership with industry leader'
        ];

        const companies = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'WIPRO', 'ITC', 'SBIN', 'BHARTIARTL'];
        const sources = ['Economic Times', 'Business Standard', 'Moneycontrol', 'CNBC TV18', 'Livemint'];

        const news = [];
        for (let i = 0; i < 12; i++) {
            const company = symbol === 'TRENDING' || symbol === 'MARKET' || symbol === 'EARNINGS' 
                ? companies[Math.floor(Math.random() * companies.length)]
                : symbol;
                
            news.push({
                id: i,
                headline: `${company}: ${headlines[Math.floor(Math.random() * headlines.length)]}`,
                summary: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
                source: sources[Math.floor(Math.random() * sources.length)],
                publishedAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
                category: category || ['earnings', 'announcements', 'analyst', 'market'][Math.floor(Math.random() * 4)],
                sentiment: ['positive', 'negative', 'neutral'][Math.floor(Math.random() * 3)],
                url: '#'
            });
        }

        return news;
    },

    displayNews(news) {
        const container = document.getElementById('newsContainer');
        
        if (news.length === 0) {
            container.innerHTML = '<div class="col-span-full text-center text-gray-500 py-8">No news found</div>';
            return;
        }

        const sentimentColors = {
            positive: 'text-green-600',
            negative: 'text-red-600',
            neutral: 'text-gray-600'
        };

        const categoryColors = {
            earnings: 'bg-blue-100 text-blue-800',
            announcements: 'bg-green-100 text-green-800',
            analyst: 'bg-purple-100 text-purple-800',
            market: 'bg-orange-100 text-orange-800'
        };

        container.innerHTML = news.map(item => `
            <div class="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                <div class="flex justify-between items-start mb-3">
                    <span class="px-2 py-1 rounded-full text-xs ${categoryColors[item.category] || 'bg-gray-100 text-gray-800'}">${item.category.toUpperCase()}</span>
                    <span class="text-xs ${sentimentColors[item.sentiment]}">
                        <i class="fas fa-circle mr-1"></i>${item.sentiment}
                    </span>
                </div>
                <h3 class="font-semibold text-gray-800 mb-2 line-clamp-2">${item.headline}</h3>
                <p class="text-gray-600 text-sm mb-3 line-clamp-3">${item.summary}</p>
                <div class="flex justify-between items-center text-xs text-gray-500">
                    <span>${item.source}</span>
                    <span>${new Date(item.publishedAt).toLocaleDateString()}</span>
                </div>
                <div class="mt-3">
                    <a href="${item.url}" class="text-purple-600 hover:text-purple-800 text-sm font-medium" target="_blank">
                        Read More <i class="fas fa-external-link-alt ml-1"></i>
                    </a>
                </div>
            </div>
        `).join('');

        // Show load more button if there are more items to load
        document.getElementById('loadMoreBtn').style.display = news.length >= 12 ? 'block' : 'none';
    },

    async loadMoreNews() {
        // Placeholder for loading more news
        showSuccess('Loading more news...');
    }
};

// Make module globally available
window.StockNewsModule = StockNewsModule;
