const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./api/auth');
const productRoutes = require('./api/products');
const salesRoutes = require('./api/sales');
const stockRoutes = require('./api/stock');
const reportRoutes = require('./api/reports');
const settingsRoutes = require('./api/settings');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/pos', (req, res) => {
    res.sendFile(path.join(__dirname, 'pos.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/products', (req, res) => {
    res.sendFile(path.join(__dirname, 'products.html'));
});

app.get('/sales', (req, res) => {
    res.sendFile(path.join(__dirname, 'sales.html'));
});

app.get('/report', (req, res) => {
    res.sendFile(path.join(__dirname, 'report.html'));
});

app.get('/stock', (req, res) => {
    res.sendFile(path.join(__dirname, 'stock.html'));
});

app.get('/stock-history', (req, res) => {
    res.sendFile(path.join(__dirname, 'stock-history.html'));
});

app.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'settings.html'));
});

app.listen(PORT, () => {
    console.log(`Bashan Stock Manager running on http://localhost:${PORT}`);
});