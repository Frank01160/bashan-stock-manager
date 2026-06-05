const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.owner = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Add stock
router.post('/add', verifyToken, async (req, res) => {
    try {
        const { product_id, quantity, notes } = req.body;
        
        const { data: product } = await supabase
            .from('products')
            .select('current_stock')
            .eq('id', product_id)
            .single();
        
        const newStock = parseFloat(product.current_stock) + parseFloat(quantity);
        
        await supabase
            .from('products')
            .update({ current_stock: newStock, updated_at: new Date() })
            .eq('id', product_id);
        
        const { data: movement } = await supabase
            .from('stock_movements')
            .insert([{
                product_id,
                movement_type: 'restock',
                quantity_change: quantity,
                new_quantity: newStock,
                notes
            }])
            .select()
            .single();
        
        res.json({ success: true, movement });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Remove stock
router.post('/remove', verifyToken, async (req, res) => {
    try {
        const { product_id, quantity, reason, notes } = req.body;
        
        const { data: product } = await supabase
            .from('products')
            .select('current_stock')
            .eq('id', product_id)
            .single();
        
        const newStock = parseFloat(product.current_stock) - parseFloat(quantity);
        
        if (newStock < 0) {
            return res.status(400).json({ error: 'Insufficient stock' });
        }
        
        await supabase
            .from('products')
            .update({ current_stock: newStock, updated_at: new Date() })
            .eq('id', product_id);
        
        const { data: movement } = await supabase
            .from('stock_movements')
            .insert([{
                product_id,
                movement_type: reason || 'damage',
                quantity_change: -quantity,
                new_quantity: newStock,
                notes
            }])
            .select()
            .single();
        
        res.json({ success: true, movement });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get stock movement history
router.get('/history', verifyToken, async (req, res) => {
    try {
        const { product_id, from, to, type } = req.query;
        
        let query = supabase
            .from('stock_movements')
            .select(`
                *,
                products:product_id(name, unit)
            `)
            .order('created_at', { ascending: false });
        
        if (product_id) {
            query = query.eq('product_id', product_id);
        }
        if (from) {
            query = query.gte('created_at', from);
        }
        if (to) {
            query = query.lte('created_at', to);
        }
        if (type && type !== 'all') {
            query = query.eq('movement_type', type);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
