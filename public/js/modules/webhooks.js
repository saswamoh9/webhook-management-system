///public/js/modules/webhooks.js
const WebhooksModule = {
    webhooks: [],

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

                <div class="card p-8">
                    <h2 class="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                        <i class="fas fa-webhook mr-3 text-purple-600"></i>
                        Manage Webhooks
                    </h2>
                    
                    <!-- Create Webhook Form -->
                    <div class="mb-8 p-6 bg-gray-50 rounded-lg">
                        <h3 class="text-lg font-semibold text-gray-700 mb-4" id="webhookFormTitle">
                            <i class="fas fa-plus mr-2 text-purple-600"></i>Create New Webhook
                        </h3>
                        <form id="webhookForm" class="space-y-4">
                            <input type="hidden" id="webhookId">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">
                                        <i class="fas fa-tag mr-1"></i>Webhook Name
                                    </label>
                                    <input type="text" id="webhookName" class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg" required>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">
                                        <i class="fas fa-layer-group mr-1"></i>Stock Set
                                    </label>
                                    <select id="stockSet" class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg">
                                        <option value="NIFTY_500">NIFTY 500</option>
                                        <option value="ANY_WEBHOOK">Any Webhook</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    <i class="fas fa-info-circle mr-1"></i>Description
                                </label>
                                <textarea id="webhookDescription" class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg" rows="2" placeholder="Brief description of this webhook"></textarea>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    <i class="fas fa-tags mr-1"></i>Tags (comma-separated)
                                </label>
                                <input type="text" id="webhookTags" class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="tag1, tag2, tag3">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    <i class="fas fa-comment-alt mr-1"></i>Possible Output
                                </label>
                                <textarea id="possibleOutput" class="input-field w-full px-4 py-2 border border-gray-300 rounded-lg" rows="3" placeholder="e.g., CPR UP and 1st candle down So You can Buy"></textarea>
                            </div>
                            <button type="submit" class="btn-primary px-6 py-3 rounded-lg font-medium">
                                <i class="fas fa-plus mr-2"></i>Create Webhook
                            </button>
                        </form>
                    </div>

                    <!-- Webhooks List -->
                    <div>
                        <h3 class="text-lg font-semibold text-gray-700 mb-4">Existing Webhooks</h3>
                        <div id="webhooksList" class="space-y-4">
                            <!-- Webhooks will be loaded here -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    async initialize() {
        await this.loadWebhooks();
        await this.loadStats();
        this.setupEventListeners();
    },

    setupEventListeners() {
        const form = document.getElementById('webhookForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveWebhook();
            });
        }
    },

    async loadStats() {
        try {
            // Load webhooks count
            const webhooksResponse = await apiFetch(`${API_BASE}/webhooks/list`);
            const webhooks = await webhooksResponse.json();
            if (webhooks.success) {
                document.getElementById('totalWebhooks').textContent = webhooks.data.length;
            }

            // Load other stats...
            // You can add more stat loading here
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    },

    async loadWebhooks() {
        try {
            const response = await apiFetch(`${API_BASE}/webhooks/list`);
            const result = await response.json();
            
            if (result.success) {
                this.webhooks = result.data;
                this.displayWebhooks(result.data);
            }
        } catch (error) {
            console.error('Error loading webhooks:', error);
            showError('Error loading webhooks: ' + error.message);
        }
    },

    displayWebhooks(webhooks) {
        const container = document.getElementById('webhooksList');
        if (!container) return;

        if (webhooks.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">No webhooks created yet.</p>';
            return;
        }

        container.innerHTML = webhooks.map(webhook => `
            <div class="webhook-card rounded-lg p-6">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <h4 class="font-semibold text-lg text-gray-800">${webhook.name}</h4>
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
                                <code class="bg-white bg-opacity-50 px-2 py-1 rounded text-xs">${webhook.webhookUrl}</code>
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
                await this.loadWebhooks();
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
            const response = await apiFetch(`${API_BASE}/webhooks/${id}`);
            const result = await response.json();
            
            if (result.success) {
                const webhook = result.data;
                document.getElementById('webhookFormTitle').innerHTML = '<i class="fas fa-edit mr-2 text-purple-600"></i>Edit Webhook';
                document.getElementById('webhookId').value = webhook.id;
                document.getElementById('webhookName').value = webhook.name;
                document.getElementById('stockSet').value = webhook.stockSet;
                document.getElementById('webhookDescription').value = webhook.description || '';
                document.getElementById('webhookTags').value = webhook.tags.join(', ');
                document.getElementById('possibleOutput').value = webhook.possibleOutput || '';
            } else {
                throw new Error(result.error);
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