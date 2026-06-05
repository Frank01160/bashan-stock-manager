const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Supabase setup
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// ============================================
// AUTH ROUTES
// ============================================

app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, businessName } = req.body;
        const passwordHash = await bcrypt.hash(password, 10);
        
        const { data: owner, error } = await supabase
            .from('owner_account')
            .insert([{ email, password_hash: passwordHash, business_name: businessName }])
            .select()
            .single();
        
        if (error) throw error;
        
        const token = jwt.sign({ id: owner.id, email: owner.email }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, owner: { id: owner.id, email: owner.email } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const { data: owner, error } = await supabase
            .from('owner_account')
            .select('*')
            .eq('email', email)
            .single();
        
        if (error || !owner) return res.status(401).json({ error: 'Invalid credentials' });
        
        const validPassword = await bcrypt.compare(password, owner.password_hash);
        if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });
        
        const token = jwt.sign({ id: owner.id, email: owner.email }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, owner: { id: owner.id, email: owner.email } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// PRODUCTS ROUTES
// ============================================

app.get('/api/products', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*, categories:category_id(name)')
            .order('name');
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/products', async (req, res) => {
    try {
        const { name, category_id, description, unit, unit_price, current_stock, low_stock_threshold } = req.body;
        const { data, error } = await supabase
            .from('products')
            .insert([{ name, category_id, description, unit, unit_price, current_stock, low_stock_threshold }])
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/products/:id', async (req, res) => {
    try {
        const { name, category_id, description, unit, unit_price, low_stock_threshold } = req.body;
        const { data, error } = await supabase
            .from('products')
            .update({ name, category_id, description, unit, unit_price, low_stock_threshold })
            .eq('id', req.params.id)
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        const { error } = await supabase.from('products').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// SALES ROUTES
// ============================================

app.post('/api/sales', async (req, res) => {
    try {
        const { items, total_amount, discount_amount, payment_method } = req.body;
        
        const { data: settings } = await supabase.from('shop_settings').select('*').single();
        const receiptNumber = `${settings.receipt_prefix}${new Date().getFullYear()}-${String(settings.next_receipt_number).padStart(4, '0')}`;
        
        const { data: sale, error } = await supabase
            .from('sales')
            .insert([{ receipt_number: receiptNumber, total_amount, discount_amount, payment_method }])
            .select()
            .single();
        
        if (error) throw error;
        
        for (const item of items) {
            await supabase.from('sale_items').insert([{
                sale_id: sale.id,
                product_id: item.product_id,
                product_name: item.product_name,
                quantity: item.quantity,
                unit_price: item.unit_price,
                subtotal: item.subtotal
            }]);
            
            const { data: product } = await supabase.from('products').select('current_stock').eq('id', item.product_id).single();
            const newStock = product.current_stock - item.quantity;
            
            await supabase.from('products').update({ current_stock: newStock }).eq('id', item.product_id);
            await supabase.from('stock_movements').insert([{
                product_id: item.product_id,
                movement_type: 'sale',
                quantity_change: -item.quantity,
                new_quantity: newStock,
                reference: receiptNumber
            }]);
        }
        
        await supabase.from('shop_settings').update({ next_receipt_number: settings.next_receipt_number + 1 }).eq('id', settings.id);
        
        res.json({ sale, receipt_number: receiptNumber, items });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/sales', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('sales')
            .select('*, sale_items(*)')
            .order('sale_date', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// STOCK ROUTES
// ============================================

app.post('/api/stock/add', async (req, res) => {
    try {
        const { product_id, quantity, notes } = req.body;
        const { data: product } = await supabase.from('products').select('current_stock').eq('id', product_id).single();
        const newStock = parseFloat(product.current_stock) + parseFloat(quantity);
        await supabase.from('products').update({ current_stock: newStock }).eq('id', product_id);
        await supabase.from('stock_movements').insert([{
            product_id, movement_type: 'restock', quantity_change: quantity, new_quantity: newStock, notes
        }]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/stock/remove', async (req, res) => {
    try {
        const { product_id, quantity, reason, notes } = req.body;
        const { data: product } = await supabase.from('products').select('current_stock').eq('id', product_id).single();
        const newStock = parseFloat(product.current_stock) - parseFloat(quantity);
        if (newStock < 0) return res.status(400).json({ error: 'Insufficient stock' });
        await supabase.from('products').update({ current_stock: newStock }).eq('id', product_id);
        await supabase.from('stock_movements').insert([{
            product_id, movement_type: reason || 'damage', quantity_change: -quantity, new_quantity: newStock, notes
        }]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/stock/history', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('stock_movements')
            .select('*, products:product_id(name, unit)')
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// REPORTS ROUTES
// ============================================

app.get('/api/reports/daily', async (req, res) => {
    try {
        const { date } = req.query;
        const reportDate = date || new Date().toISOString().split('T')[0];
        
        const { data: sales, error } = await supabase
            .from('sales')
            .select('*, sale_items(*)')
            .gte('sale_date', `${reportDate}T00:00:00`)
            .lte('sale_date', `${reportDate}T23:59:59`)
            .order('sale_date', { ascending: true });
        
        if (error) throw error;
        
        res.json({
            date: reportDate,
            summary: {
                total_sales: sales.length,
                total_revenue: sales.reduce((sum, s) => sum + parseFloat(s.total_amount), 0),
                cash_payments: sales.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + parseFloat(s.total_amount), 0),
                mpesa_payments: sales.filter(s => s.payment_method === 'mpesa').reduce((sum, s) => sum + parseFloat(s.total_amount), 0),
                total_discounts: sales.reduce((sum, s) => sum + parseFloat(s.discount_amount), 0)
            },
            sales
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// SETTINGS ROUTES
// ============================================

app.get('/api/settings', async (req, res) => {
    try {
        const { data, error } = await supabase.from('shop_settings').select('*').single();
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/settings', async (req, res) => {
    try {
        const settings = await supabase.from('shop_settings').select('id').single();
        const { data, error } = await supabase
            .from('shop_settings')
            .update(req.body)
            .eq('id', settings.data.id)
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// SERVE HTML PAGES
// ============================================

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/pos', (req, res) => res.sendFile(path.join(__dirname, 'pos.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));
app.get('/products', (req, res) => res.sendFile(path.join(__dirname, 'products.html')));
app.get('/sales', (req, res) => res.sendFile(path.join(__dirname, 'sales.html')));
app.get('/report', (req, res) => res.sendFile(path.join(__dirname, 'report.html')));
app.get('/stock', (req, res) => res.sendFile(path.join(__dirname, 'stock.html')));
app.get('/stock-history', (req, res) => res.sendFile(path.join(__dirname, 'stock-history.html')));
app.get('/settings', (req, res) => res.sendFile(path.join(__dirname, 'settings.html')));

// ============================================
// START SERVER
// ============================================

app.listen(3000, () => console.log('Server running on port 3000'));

module.exports = app;
