// API calls
async function fetchAPI(endpoint, method = 'GET', data = null) {
    const url = `${CONFIG.API_URL}${endpoint}`;
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    // Add auth token if exists
    const token = localStorage.getItem('ownerToken');
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, options);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'API Error');
        }
        
        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Product APIs
async function getProducts() {
    return await fetchAPI('/products');
}

async function addProduct(productData) {
    return await fetchAPI('/products', 'POST', productData);
}

async function updateProduct(id, productData) {
    return await fetchAPI(`/products/${id}`, 'PUT', productData);
}

async function deleteProduct(id) {
    return await fetchAPI(`/products/${id}`, 'DELETE');
}

// Sales APIs
async function recordSale(saleData) {
    return await fetchAPI('/sales', 'POST', saleData);
}

async function getSales(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return await fetchAPI(`/sales?${params}`);
}

// Stock APIs
async function addStock(stockData) {
    return await fetchAPI('/stock/add', 'POST', stockData);
}

async function removeStock(stockData) {
    return await fetchAPI('/stock/remove', 'POST', stockData);
}

async function getStockHistory(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return await fetchAPI(`/stock/history?${params}`);
}

// Report APIs
async function getDailyReport(date) {
    return await fetchAPI(`/reports/daily?date=${date}`);
}

// Settings APIs
async function getSettings() {
    return await fetchAPI('/settings');
}

async function updateSettings(settingsData) {
    return await fetchAPI('/settings', 'PUT', settingsData);
}

// Auth APIs
async function login(email, password) {
    const result = await fetchAPI('/auth/login', 'POST', { email, password });
    if (result.token) {
        localStorage.setItem('ownerToken', result.token);
        localStorage.setItem('ownerData', JSON.stringify(result.owner));
    }
    return result;
}

function logout() {
    localStorage.removeItem('ownerToken');
    localStorage.removeItem('ownerData');
    window.location.href = '/login';
}

function isLoggedIn() {
    return !!localStorage.getItem('ownerToken');
}