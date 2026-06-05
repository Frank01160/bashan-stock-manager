// Configuration
const CONFIG = {
    API_URL: window.location.origin + '/api',
    SHOP_NAME: 'Bashan Animal Feeds',
    CURRENCY: 'KES',
    DATE_FORMAT: 'DD/MM/YYYY',
    TIME_FORMAT: 'HH:mm'
};

// Check if we're in development or production
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    CONFIG.API_URL = 'http://localhost:3000/api';
}