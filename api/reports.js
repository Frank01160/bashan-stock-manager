const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Get daily report
router.get('/daily', async (req, res) => {
    try {
        const { date } = req.query;
        const reportDate = date || new Date().toISOString().split('T')[0];
        
        const { data: sales, error } = await supabase
            .from('sales')
            .select(`
                *,
                sale_items(*)
            `)
            .gte('sale_date', `${reportDate}T00:00:00`)
            .lte('sale_date', `${reportDate}T23:59:59`)
            .order('sale_date', { ascending: true });
        
        if (error) throw error;
        
        const summary = {
            total_sales: sales.length,
            total_revenue: sales.reduce((sum, sale) => sum + parseFloat(sale.total_amount), 0),
            cash_payments: sales.filter(s => s.payment_method === 'cash').reduce((sum, sale) => sum + parseFloat(sale.total_amount), 0),
            mpesa_payments: sales.filter(s => s.payment_method === 'mpesa').reduce((sum, sale) => sum + parseFloat(sale.total_amount), 0),
            total_discounts: sales.reduce((sum, sale) => sum + parseFloat(sale.discount_amount), 0)
        };
        
        res.json({ date: reportDate, summary, sales });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;