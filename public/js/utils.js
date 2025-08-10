// Utility Functions
function showLoading() {
    document.getElementById('loadingSpinner').classList.remove('hidden');
    document.getElementById('loadingSpinner').classList.add('flex');
}

function hideLoading() {
    document.getElementById('loadingSpinner').classList.add('hidden');
    document.getElementById('loadingSpinner').classList.remove('flex');
}

function showSuccess(message) {
    const toast = document.getElementById('successToast');
    document.getElementById('successMessage').textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

function showError(message) {
    const toast = document.getElementById('errorToast');
    document.getElementById('errorMessage').textContent = message;
    toast.classList.remove('hidden');
    const timeout = message.includes('connect') || message.includes('API') ? 8000 : 5000;
    setTimeout(() => toast.classList.add('hidden'), timeout);
}

function formatNumber(num) {
    if (!num) return '0';
    return new Intl.NumberFormat('en-IN').format(num);
}

function formatCrores(num) {
    return (num / 10000000).toFixed(2);
}

// Enhanced fetch wrapper with retry logic
async function apiFetch(url, options = {}) {
    const maxRetries = 2;
    let lastError;
    
    for (let i = 0; i <= maxRetries; i++) {
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return response;
        } catch (error) {
            lastError = error;
            
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                console.error(`🔴 Network error (attempt ${i + 1}/${maxRetries + 1})`);
                
                if (i === maxRetries) {
                    throw new Error('Cannot connect to server. Please check if the backend is running.');
                }
                
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            } else {
                throw error;
            }
        }
    }
    
    throw lastError;
}