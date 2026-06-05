const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Middleware to verify owner token
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

// Get all products (no auth needed for POS)
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('products')
            .select(`
                *,
                categories:category_id(name)
            `)
            .order('name');
        
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single product
router.get('/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*, categories:category_id(name)')
            .eq('id', req.params.id)
            .single();
        
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add product (owner only)
router.post('/', verifyToken, async (req, res) => {
    try {
        const { name, category_id, description, unit, unit_price, current_stock, low_stock_threshold } = req.body;
        
        const { data, error } = await supabase
            .from('products')
            .insert([{
                name,
                category_id,
                description,
                unit,
                unit_price,
                current_stock,
                low_stock_threshold
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        // Record stock movement if initial stock > 0
        if (current_stock > 0) {
            await supabase.from('stock_movements').insert([{
                product_id: data.id,
                movement_type: 'restock',
                quantity_change: current_stock,
                new_quantity: current_stock,
                notes: 'Initial stock'
            }]);
        }
        
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update product (owner only)
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const { name, category_id, description, unit, unit_price, low_stock_threshold } = req.body;
        
        const { data, error } = await supabase
            .from('products')
            .update({
                name,
                category_id,
                description,
                unit,
                unit_price,
                low_stock_threshold,
                updated_at: new Date()
            })
            .eq('id', req.params.id)
            .select()
            .single();
        
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete product (owner only)
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', req.params.id);
        
        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;