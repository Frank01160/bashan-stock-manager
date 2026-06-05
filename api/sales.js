const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Record a sale (no auth - POS)
router.post('/', async (req, res) => {
    try {
        const { items, total_amount, discount_amount, payment_method } = req.body;
        
        // Get next receipt number
        const { data: settings } = await supabase
            .from('shop_settings')
            .select('receipt_prefix, next_receipt_number')
            .single();
        
        const receiptNumber = `${settings.receipt_prefix}${new Date().getFullYear()}-${String(settings.next_receipt_number).padStart(4, '0')}`;
        
        // Create sale record
        const { data: sale, error: saleError } = await supabase
            .from('sales')
            .insert([{
                receipt_number: receiptNumber,
                total_amount,
                discount_amount,
                payment_method
            }])
            .select()
            .single();
        
        if (saleError) throw saleError;
        
        // Insert sale items and update stock
        for (const item of items) {
            // Insert sale item
            await supabase.from('sale_items').insert([{
                sale_id: sale.id,
                product_id: item.product_id,
                product_name: item.product_name,
                quantity: item.quantity,
                unit_price: item.unit_price,
                subtotal: item.subtotal
            }]);
            
            // Get current stock
            const { data: product } = await supabase
                .from('products')
                .select('current_stock')
                .eq('id', item.product_id)
                .single();
            
            const newStock = product.current_stock - item.quantity;
            
            // Update product stock
            await supabase
                .from('products')
                .update({ current_stock: newStock, updated_at: new Date() })
                .eq('id', item.product_id);
            
            // Record stock movement
            await supabase.from('stock_movements').insert([{
                product_id: item.product_id,
                movement_type: 'sale',
                quantity_change: -item.quantity,
                new_quantity: newStock,
                reference: receiptNumber
            }]);
            
            // Check low stock and send alert
            const { data: updatedProduct } = await supabase
                .from('products')
                .select('*, categories:category_id(name)')
                .eq('id', item.product_id)
                .single();
            
            if (updatedProduct.current_stock <= updatedProduct.low_stock_threshold && updatedProduct.low_stock_threshold > 0) {
                // Check if email alerts are enabled
                const { data: shopSettings } = await supabase
                    .from('shop_settings')
                    .select('email_alerts, owner_email')
                    .single();
                
                if (shopSettings.email_alerts && shopSettings.owner_email) {
                    // Trigger email alert (you'd implement actual email sending)
                    console.log(`Low stock alert: ${updatedProduct.name} has ${updatedProduct.current_stock} ${updatedProduct.unit} remaining`);
                }
            }
        }
        
        // Update receipt number
        await supabase
            .from('shop_settings')
            .update({ next_receipt_number: settings.next_receipt_number + 1 })
            .eq('id', settings.id);
        
        res.json({ 
            sale, 
            receipt_number: receiptNumber,
            items: items 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get sales history
router.get('/', async (req, res) => {
    try {
        const { from, to, payment_method } = req.query;
        
        let query = supabase
            .from('sales')
            .select(`
                *,
                sale_items(*)
            `)
            .order('sale_date', { ascending: false });
        
        if (from) {
            query = query.gte('sale_date', from);
        }
        if (to) {
            query = query.lte('sale_date', to);
        }
        if (payment_method && payment_method !== 'all') {
            query = query.eq('payment_method', payment_method);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single sale
router.get('/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('sales')
            .select('*, sale_items(*)')
            .eq('id', req.params.id)
            .single();
        
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;