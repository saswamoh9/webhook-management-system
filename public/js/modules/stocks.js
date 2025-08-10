// Stocks Module
const StocksModule = {
    filterOptions: {},
    
    getHTML() {
        return `
            <div id="stocks" class="tab-content">
                <div class="card p-8">
                    <h2 class="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                        <i class="fas fa-chart-line mr-3 text-purple-600"></i>
                        Stock Management
                    </h2>
                    
                    <!-- Stock Statistics -->
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div class="stats-card rounded-lg p-6 text-center">
                            <h3 class="text-2xl font-bold" id="totalStocks">0</h3>
                            <p class="text-sm opacity-90">Total Stocks</p>
                        </div>
                        <div class="stats-card rounded-lg p-6 text-center">
                            <h3 class="text-2xl font-bold" id="totalSectors">0</h3>
                            <p class="text-sm opacity-90">Sectors</p>
                        </div>
                        <div class="stats-card rounded-lg p-6 text-center">
                            <h3 class="text-2xl font-bold" id="totalIndustries">0</h3>
                            <p class="text-sm opacity-90">Industries</p>
                        </div>
                        <div class="stats-card rounded-lg p-6 text-center">
                            <h3 class="text-2xl font-bold" id="totalMacroClasses">0</h3>
                            <p class="text-sm opacity-90">Macro Classes</p>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="mb-6 flex gap-3">
                        <button onclick="StocksModule.showAddStockModal()" class="btn-primary px-6 py-3 rounded-lg font-medium">
                            <i class="fas fa-plus mr-2"></i>Add Stock
                        </button>
                        <button onclick="StocksModule.showImportModal()" class="btn-primary px-6 py-3 rounded-lg font-medium">
                            <i class="fas fa-upload mr-2"></i>Import Stocks
                        </button>
                        <button onclick="StocksModule.exportStocks()" class="btn-primary px-6 py-3 rounded-lg font-medium">
                            <i class="fas fa-download mr-2"></i>Export CSV
                        </button>
                    </div>

                    <!-- Search Form -->
                    <div class="mb-6 p-6 bg-gray-50 rounded-lg">
                        <h3 class="text-lg font-semibold text-gray-700 mb-4">Search & Filter</h3>
                        <form id="stockSearchForm" class="space-y-4">
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Symbol</label>
                                    <input type="text" id="stockSearchSymbol" class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Enter symbol">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                                    <input type="text" id="stockSearchCompany" class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Enter company name">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Sector</label>
                                    <select id="stockSearchSector" class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg">
                                        <option value="">All Sectors</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Industry</label>
                                    <select id="stockSearchIndustry" class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg">
                                        <option value="">All Industries</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Basic Industry</label>
                                    <select id="stockSearchBasicIndustry" class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg">
                                        <option value="">All Basic Industries</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Macro Classification</label>
                                    <select id="stockSearchMacro" class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg">
                                        <option value="">All Classifications</option>
                                    </select>
                                </div>
                            </div>
                            <div class="flex gap-3">
                                <button type="submit" class="btn-primary px-6 py-3 rounded-lg font-medium">
                                    <i class="fas fa-search mr-2"></i>Search
                                </button>
                                <button type="button" onclick="StocksModule.clearSearch()" class="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100">
                                    <i class="fas fa-times mr-2"></i>Clear
                                </button>
                            </div>
                        </form>
                    </div>

                    <!-- Results Table -->
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-purple-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Symbol</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Company Name</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Sector</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Industry</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Basic Industry</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Macro Class</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="stocksTableBody" class="bg-white divide-y divide-gray-200">
                                <tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">Loading stocks...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Add/Edit Stock Modal -->
                ${this.getStockModal()}
                
                <!-- Import Modal -->
                ${this.getImportModal()}
            </div>
        `;
    },

    getStockModal() {
        return `
            <div id="stockModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 hidden flex items-center justify-center z-50">
                <div class="bg-white rounded-lg p-8 w-full max-w-2xl">
                    <h3 id="stockModalTitle" class="text-2xl font-bold text-gray-800 mb-6">Add Stock</h3>
                    <form id="stockForm">
                        <input type="hidden" id="stockId">
                        <div class="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Symbol *</label>
                                <input type="text" id="stockSymbol" class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg" required>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
                                <input type="text" id="stockCompanyName" class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg" required>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Sector</label>
                                <input type="text" id="stockSector" class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Industry</label>
                                <input type="text" id="stockIndustry" class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg">
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Basic Industry</label>
                                <input type="text" id="stockBasicIndustry" class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Macro Classification</label>
                                <input type="text" id="stockMacroClassification" class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg">
                            </div>
                        </div>
                        <div class="flex justify-end gap-3">
                            <button type="button" onclick="StocksModule.closeModal('stockModal')" class="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100">Cancel</button>
                            <button type="submit" class="btn-primary px-6 py-3 rounded-lg font-medium">Save Stock</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    },

    getImportModal() {
        return `
            <div id="importStockModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 hidden flex items-center justify-center z-50">
                <div class="bg-white rounded-lg p-8 w-full max-w-2xl">
                    <h3 class="text-2xl font-bold text-gray-800 mb-6">Import Stocks</h3>
                    <div class="mb-6">
                        <p class="text-gray-600 mb-4">Upload a CSV or Excel file with columns: Company Name, Symbol, Sector, Industry, Basic Industry, Macro Economic Classification</p>
                        <div id="stockFileUpload" class="border-4 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-purple-500 transition-colors cursor-pointer">
                            <i class="fas fa-cloud-upload-alt text-6xl text-gray-400 mb-4"></i>
                            <p class="text-gray-600 mb-4">Click to browse or drag and drop your file here</p>
                            <input type="file" id="stockFile" accept=".csv,.xlsx,.xls" class="hidden">
                        </div>
                        <div id="selectedStockFile" class="hidden mt-4">
                            <p class="text-gray-700">Selected file: <span id="stockFileName" class="font-semibold"></span></p>
                        </div>
                    </div>
                    <div class="flex justify-end gap-3">
                        <button type="button" onclick="StocksModule.closeModal('importStockModal')" class="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100">Cancel</button>
                        <button id="importStockBtn" onclick="StocksModule.importStocks()" disabled class="btn-primary px-6 py-3 rounded-lg font-medium">Import</button>
                    </div>
                </div>
            </div>
        `;
    },

    async initialize() {
        await this.loadFilterOptions();
        await this.loadStats();
        await this.searchStocks();
        this.setupEventListeners();
    },

    setupEventListeners() {
        // Search form
        document.getElementById('stockSearchForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.searchStocks();
        });

        // Stock form
        document.getElementById('stockForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveStock();
        });

        // File upload
        const fileUpload = document.getElementById('stockFileUpload');
        const fileInput = document.getElementById('stockFile');
        
        if (fileUpload && fileInput) {
            fileUpload.addEventListener('click', () => fileInput.click());
            
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    document.getElementById('stockFileName').textContent = file.name;
                    document.getElementById('selectedStockFile').classList.remove('hidden');
                    document.getElementById('importStockBtn').disabled = false;
                }
            });
        }
    },

    async loadFilterOptions() {
        try {
            const response = await fetch(`${API_BASE}/stocks/filter-options`);
            const result = await response.json();
            
            if (result.success) {
                this.filterOptions = result.data;
                this.populateDropdowns();
            }
        } catch (error) {
            console.error('Error loading filter options:', error);
        }
    },

    populateDropdowns() {
        const mappings = [
            { id: 'stockSearchSector', data: 'sectors', default: 'All Sectors' },
            { id: 'stockSearchIndustry', data: 'industries', default: 'All Industries' },
            { id: 'stockSearchBasicIndustry', data: 'basicIndustries', default: 'All Basic Industries' },
            { id: 'stockSearchMacro', data: 'macroEconomicClassifications', default: 'All Classifications' }
        ];

        mappings.forEach(({ id, data, default: defaultText }) => {
            const element = document.getElementById(id);
            if (element && this.filterOptions[data]) {
                element.innerHTML = `<option value="">${defaultText}</option>`;
                this.filterOptions[data].forEach(item => {
                    element.innerHTML += `<option value="${item}">${item}</option>`;
                });
            }
        });
    },

    async loadStats() {
        try {
            const response = await fetch(`${API_BASE}/stocks/stats/count`);
            const result = await response.json();
            
            if (result.success) {
                document.getElementById('totalStocks').textContent = result.data.count || 0;
            }

            if (this.filterOptions) {
                document.getElementById('totalSectors').textContent = this.filterOptions.sectors?.length || 0;
                document.getElementById('totalIndustries').textContent = this.filterOptions.industries?.length || 0;
                document.getElementById('totalMacroClasses').textContent = this.filterOptions.macroEconomicClassifications?.length || 0;
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    },

    async searchStocks() {
        try {
            showLoading();
            
            const searchData = {
                symbol: document.getElementById('stockSearchSymbol')?.value || '',
                companyName: document.getElementById('stockSearchCompany')?.value || '',
                sector: document.getElementById('stockSearchSector')?.value || '',
                industry: document.getElementById('stockSearchIndustry')?.value || '',
                basicIndustry: document.getElementById('stockSearchBasicIndustry')?.value || '',
                macroEconomicClassification: document.getElementById('stockSearchMacro')?.value || '',
                limit: 100,
                offset: 0
            };

            const response = await fetch(`${API_BASE}/stocks/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(searchData)
            });

            const result = await response.json();
            
            if (result.success) {
                this.displayStocks(result.data);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error searching stocks:', error);
            showError('Error searching stocks: ' + error.message);
        } finally {
            hideLoading();
        }
    },

    displayStocks(stocks) {
        const tbody = document.getElementById('stocksTableBody');
        
        if (stocks.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">No stocks found</td></tr>';
            return;
        }

        tbody.innerHTML = stocks.map(stock => `
            <tr class="table-row hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-600">${stock.symbol}</td>
                <td class="px-6 py-4 text-sm">${stock.companyName}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">${stock.sector || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">${stock.industry || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">${stock.basicIndustry || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">${stock.macroEconomicClassification || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <button onclick="StocksModule.editStock('${stock.id}')" class="text-blue-600 hover:text-blue-800 mr-2">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="StocksModule.deleteStock('${stock.id}', '${stock.symbol}')" class="text-red-600 hover:text-red-800">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },

    clearSearch() {
        ['stockSearchSymbol', 'stockSearchCompany', 'stockSearchSector', 
         'stockSearchIndustry', 'stockSearchBasicIndustry', 'stockSearchMacro'].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.value = '';
        });
        this.searchStocks();
    },

    showAddStockModal() {
        document.getElementById('stockModalTitle').textContent = 'Add Stock';
        document.getElementById('stockForm').reset();
        document.getElementById('stockId').value = '';
        document.getElementById('stockModal').classList.remove('hidden');
    },

    showImportModal() {
        document.getElementById('stockFile').value = '';
        document.getElementById('selectedStockFile').classList.add('hidden');
        document.getElementById('importStockBtn').disabled = true;
        document.getElementById('importStockModal').classList.remove('hidden');
    },

    closeModal(modalId) {
        document.getElementById(modalId).classList.add('hidden');
    },

    async saveStock() {
        const stockId = document.getElementById('stockId').value;
        const stockData = {
            companyName: document.getElementById('stockCompanyName').value,
            symbol: document.getElementById('stockSymbol').value,
            sector: document.getElementById('stockSector').value,
            industry: document.getElementById('stockIndustry').value,
            basicIndustry: document.getElementById('stockBasicIndustry').value,
            macroEconomicClassification: document.getElementById('stockMacroClassification').value
        };

        try {
            showLoading();
            
            const url = stockId ? `${API_BASE}/stocks/update/${stockId}` : `${API_BASE}/stocks/create`;
            const method = stockId ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(stockData)
            });

            const result = await response.json();
            
            if (result.success) {
                showSuccess(stockId ? 'Stock updated successfully!' : 'Stock added successfully!');
                this.closeModal('stockModal');
                await this.searchStocks();
                await this.loadStats();
                await this.loadFilterOptions();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            showError('Error saving stock: ' + error.message);
        } finally {
            hideLoading();
        }
    },

    async editStock(id) {
        try {
            showLoading();
            
            const response = await fetch(`${API_BASE}/stocks/${id}`);
            const result = await response.json();
            
            if (result.success) {
                const stock = result.data;
                document.getElementById('stockModalTitle').textContent = 'Edit Stock';
                document.getElementById('stockId').value = stock.id;
                document.getElementById('stockSymbol').value = stock.symbol;
                document.getElementById('stockCompanyName').value = stock.companyName;
                document.getElementById('stockSector').value = stock.sector || '';
                document.getElementById('stockIndustry').value = stock.industry || '';
                document.getElementById('stockBasicIndustry').value = stock.basicIndustry || '';
                document.getElementById('stockMacroClassification').value = stock.macroEconomicClassification || '';
                document.getElementById('stockModal').classList.remove('hidden');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            showError('Error loading stock: ' + error.message);
        } finally {
            hideLoading();
        }
    },

    async deleteStock(id, symbol) {
        if (!confirm(`Are you sure you want to delete stock ${symbol}?`)) return;
        
        try {
            showLoading();
            
            const response = await fetch(`${API_BASE}/stocks/delete/${id}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                showSuccess(`Stock ${symbol} deleted successfully!`);
                await this.searchStocks();
                await this.loadStats();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            showError('Error deleting stock: ' + error.message);
        } finally {
            hideLoading();
        }
    },

    async importStocks() {
        const fileInput = document.getElementById('stockFile');
        const file = fileInput?.files[0];
        
        if (!file) {
            showError('Please select a file to import');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            showLoading();
            
            const response = await fetch(`${API_BASE}/stocks/import`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            
            if (result.success) {
                showSuccess(result.message);
                this.closeModal('importStockModal');
                await this.searchStocks();
                await this.loadStats();
                await this.loadFilterOptions();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            showError('Error importing stocks: ' + error.message);
        } finally {
            hideLoading();
        }
    },

    async exportStocks() {
        showLoading();
        
        try {
            const response = await fetch(`${API_BASE}/stocks/export/csv`);
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `stocks_export_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                showSuccess('Stocks exported successfully!');
            } else {
                throw new Error('Export failed');
            }
        } catch (error) {
            showError('Error exporting stocks: ' + error.message);
        } finally {
            hideLoading();
        }
    }
};

// Make module globally available
window.StocksModule = StocksModule;