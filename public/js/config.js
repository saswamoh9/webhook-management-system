// API Configuration
const getApiBaseUrl = () => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:8080/api';
    }
    
    // Production - Update with your Cloud Run URL
    const CLOUD_RUN_URL = 'https://webhook-management-system-381316234458.us-central1.run.app';
    return CLOUD_RUN_URL + '/api';
};

const API_BASE = getApiBaseUrl();
console.log('🔗 API Base URL:', API_BASE);