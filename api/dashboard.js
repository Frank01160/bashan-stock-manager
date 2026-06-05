document.addEventListener('DOMContentLoaded', async () => {
    if (!isLoggedIn()) {
        window.location.href = '/login';
        return;
    }
    
    await loadDashboard();
});

async function loadDashboard() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('currentDate').textContent = `Today: ${formatDate(today)}`;
    
    try {
        const settings = await getSettings();
        document.getElementById('shopName').textContent = settings.shop_name;
        
        const report = await getDailyReport(today);
        
        // Update summary cards
        document.getElementById('revenue').textContent = formatCurrency(report.summary.total_revenue);
        document.getElementById('salesCount').textContent = report.summary.total_sales;
        document.getElementById('cashAmount').textContent = formatCurrency(report.summary.cash_payments);
        document.getElementById('mpesaAmount').textContent = formatCurrency(report.summary.mpesa_payments);
        
        // Load low stock alerts
        const products = await getProducts();
        const lowStockProducts = products.filter(p => p.current_stock <= p.low_stock_threshold && p.low_stock_threshold > 0);
        
        const alertsContainer = document.getElementById('lowStockAlerts');
        if (lowStockProducts.length > 0) {
            alertsContainer.innerHTML = lowStockProducts.map(p => `
                <div class="alert-item">
                    <span class="badge badge-warning">⚠ Low</span>
                    ${p.name} - ${p.current_stock} ${p.unit} remaining (Threshold: ${p.low_stock_threshold} ${p.unit})
                </div>
            `).join('');
        }
        
        // Load recent sales
        const recentSales = report.sales.slice(-5).reverse();
        const tbody = document.querySelector('#recentSales tbody');
        tbody.innerHTML = recentSales.map(sale => `
            <tr>
                <td>${sale.receipt_number}</td>
                <td>${formatTime(sale.sale_date)}</td>
                <td>${sale.sale_items.length} items</td>
                <td>${formatCurrency(sale.total_amount)}</td>
                <td>${sale.payment_method === 'cash' ? '💵 Cash' : '📱 M-Pesa'}</td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}