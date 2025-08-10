// =====================================================
// FILE: /public/js/modules/financial-calendar.js
// =====================================================

const FinancialCalendarModule = {
    events: [],
    currentDate: new Date(),

    getHTML() {
        return `
            <div id="financial-calendar" class="tab-content fade-in">
                <div class="card p-8">
                    <h2 class="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                        <i class="fas fa-calendar-alt mr-3 text-purple-600"></i>
                        Financial Calendar
                    </h2>
                    
                    <div class="mb-6">
                        <p class="text-gray-600 mb-4">Track important financial events, earnings announcements, and market holidays.</p>
                        
                        <!-- Calendar Controls -->
                        <div class="flex items-center gap-4 mb-6">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
                                <input type="date" id="calendarDate" class="input-field px-4 py-2 border border-gray-300 rounded-lg">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Event Type</label>
                                <select id="eventTypeFilter" class="input-field px-4 py-2 border border-gray-300 rounded-lg">
                                    <option value="">All Events</option>
                                    <option value="earnings">Earnings</option>
                                    <option value="dividends">Dividends</option>
                                    <option value="bonus">Bonus</option>
                                    <option value="rights">Rights Issue</option>
                                    <option value="ipo">IPO</option>
                                    <option value="holiday">Market Holiday</option>
                                </select>
                            </div>
                            <div class="pt-7">
                                <button onclick="FinancialCalendarModule.loadEvents()" class="btn-primary px-6 py-3 rounded-lg font-medium">
                                    <i class="fas fa-search mr-2"></i>Load Events
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Quick Stats -->
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div class="bg-blue-100 rounded-lg p-6 text-center">
                            <h3 class="text-2xl font-bold text-blue-700" id="todayEvents">0</h3>
                            <p class="text-sm text-blue-600">Today's Events</p>
                        </div>
                        <div class="bg-green-100 rounded-lg p-6 text-center">
                            <h3 class="text-2xl font-bold text-green-700" id="weekEvents">0</h3>
                            <p class="text-sm text-green-600">This Week</p>
                        </div>
                        <div class="bg-purple-100 rounded-lg p-6 text-center">
                            <h3 class="text-2xl font-bold text-purple-700" id="monthEvents">0</h3>
                            <p class="text-sm text-purple-600">This Month</p>
                        </div>
                        <div class="bg-orange-100 rounded-lg p-6 text-center">
                            <h3 class="text-2xl font-bold text-orange-700" id="upcomingEarnings">0</h3>
                            <p class="text-sm text-orange-600">Upcoming Earnings</p>
                        </div>
                    </div>

                    <!-- Events List -->
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-purple-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Date</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Company</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Event Type</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Details</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Time</th>
                                </tr>
                            </thead>
                            <tbody id="eventsTableBody" class="bg-white divide-y divide-gray-200">
                                <tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">No events scheduled</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    async initialize() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('calendarDate').value = today;
        await this.loadEvents();
        this.setupEventListeners();
    },

    setupEventListeners() {
        const dateInput = document.getElementById('calendarDate');
        const typeFilter = document.getElementById('eventTypeFilter');
        
        if (dateInput) {
            dateInput.addEventListener('change', () => this.loadEvents());
        }
        
        if (typeFilter) {
            typeFilter.addEventListener('change', () => this.loadEvents());
        }
    },

    async loadEvents() {
        showLoading();
        
        try {
            // This is a placeholder - you would integrate with a real financial calendar API
            const events = this.generateSampleEvents();
            this.displayEvents(events);
            this.updateStats(events);
            showSuccess('Financial calendar loaded');
        } catch (error) {
            showError('Error loading financial calendar: ' + error.message);
        } finally {
            hideLoading();
        }
    },

    generateSampleEvents() {
        // Sample events for demonstration
        const today = new Date();
        const events = [];
        
        // Generate sample events for the next 30 days
        for (let i = 0; i < 30; i++) {
            const eventDate = new Date(today);
            eventDate.setDate(today.getDate() + i);
            
            if (Math.random() > 0.7) { // 30% chance of having an event
                const companies = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'WIPRO', 'ITC', 'SBIN', 'BHARTIARTL'];
                const eventTypes = ['earnings', 'dividends', 'bonus', 'rights', 'ipo'];
                
                events.push({
                    date: eventDate.toISOString().split('T')[0],
                    company: companies[Math.floor(Math.random() * companies.length)],
                    eventType: eventTypes[Math.floor(Math.random() * eventTypes.length)],
                    details: 'Q3 Results Announcement',
                    time: '09:30 AM'
                });
            }
        }
        
        return events;
    },

    displayEvents(events) {
        const tbody = document.getElementById('eventsTableBody');
        
        if (events.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">No events found</td></tr>';
            return;
        }

        tbody.innerHTML = events.map(event => {
            const eventTypeColors = {
                earnings: 'bg-blue-100 text-blue-800',
                dividends: 'bg-green-100 text-green-800',
                bonus: 'bg-purple-100 text-purple-800',
                rights: 'bg-orange-100 text-orange-800',
                ipo: 'bg-red-100 text-red-800',
                holiday: 'bg-gray-100 text-gray-800'
            };
            
            return `
                <tr class="table-row hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm">${new Date(event.date).toLocaleDateString()}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">${event.company}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                        <span class="px-2 py-1 rounded-full text-xs ${eventTypeColors[event.eventType] || 'bg-gray-100 text-gray-800'}">${event.eventType.toUpperCase()}</span>
                    </td>
                    <td class="px-6 py-4 text-sm">${event.details}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">${event.time}</td>
                </tr>
            `;
        }).join('');
    },

    updateStats(events) {
        const today = new Date().toISOString().split('T')[0];
        const thisWeek = new Date();
        thisWeek.setDate(thisWeek.getDate() + 7);
        const thisMonth = new Date();
        thisMonth.setMonth(thisMonth.getMonth() + 1);

        const todayEvents = events.filter(e => e.date === today).length;
        const weekEvents = events.filter(e => new Date(e.date) <= thisWeek).length;
        const monthEvents = events.filter(e => new Date(e.date) <= thisMonth).length;
        const upcomingEarnings = events.filter(e => e.eventType === 'earnings' && new Date(e.date) >= new Date()).length;

        document.getElementById('todayEvents').textContent = todayEvents;
        document.getElementById('weekEvents').textContent = weekEvents;
        document.getElementById('monthEvents').textContent = monthEvents;
        document.getElementById('upcomingEarnings').textContent = upcomingEarnings;
    }
};

// Make module globally available
window.FinancialCalendarModule = FinancialCalendarModule;