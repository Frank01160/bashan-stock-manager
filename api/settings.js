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

// Get settings
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('shop_settings')
            .select('*')
            .single();
        
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update settings
router.put('/', verifyToken, async (req, res) => {
    try {
        const { shop_name, phone, address, owner_email, email_alerts, receipt_prefix } = req.body;
        
        const { data, error } = await supabase
            .from('shop_settings')
            .update({
                shop_name,
                phone,
                address,
                owner_email,
                email_alerts,
                receipt_prefix,
                updated_at: new Date()
            })
            .eq('id', (await supabase.from('shop_settings').select('id').single()).data.id)
            .select()
            .single();
        
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;