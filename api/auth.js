const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const { data: owner, error } = await supabase
            .from('owner_account')
            .select('*')
            .eq('email', email)
            .single();
        
        if (error || !owner) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const validPassword = await bcrypt.compare(password, owner.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign(
            { id: owner.id, email: owner.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({ token, owner: { id: owner.id, email: owner.email } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Register (first-time setup)
router.post('/register', async (req, res) => {
    try {
        const { email, password, businessName } = req.body;
        
        // Check if owner already exists
        const { data: existing } = await supabase
            .from('owner_account')
            .select('id')
            .single();
        
        if (existing) {
            return res.status(400).json({ error: 'Owner account already exists' });
        }
        
        const passwordHash = await bcrypt.hash(password, 10);
        
        const { data: owner, error } = await supabase
            .from('owner_account')
            .insert([{ email, password_hash: passwordHash, business_name: businessName }])
            .select()
            .single();
        
        if (error) throw error;
        
        const token = jwt.sign(
            { id: owner.id, email: owner.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({ token, owner: { id: owner.id, email: owner.email } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Verify token
router.get('/verify', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ valid: true, owner: decoded });
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

module.exports = router;