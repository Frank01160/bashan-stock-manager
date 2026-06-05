let currentReportData = null;

document.addEventListener('DOMContentLoaded', () => {
    // Check if owner is logged in
    if (isLoggedIn()) {
        document.getElementById('dashboardLink').style.display = 'inline-flex';
    }
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('reportDate').value = today;
    loadReport();
});

async function loadReport() {
    const date = document.getElementById('reportDate').value;
    
    try {
        currentReportData = await getDailyReport(date);
        renderReport(currentReportData);
    } catch (error) {
        showToast('Error loading report', 'error');
    }
}

function navigateDate(days) {
    const dateInput = document.getElementById('reportDate');
    const currentDate = new Date(dateInput.value);
    currentDate.setDate(currentDate.getDate() + days);
    dateInput.value = currentDate.toISOString().split('T')[0];
    loadReport();
}

function renderReport(data) {
    const { date, summary, sales } = data;
    
    const html = `
        <div class="grid grid-4">
            <div class="card stat-card">
                <h3>💰 Total Revenue</h3>
                <p>${formatCurrency(summary.total_revenue)}</p>
            </div>
            <div class="card stat-card">
                <h3>🏷️ Total Sales</h3>
                <p>${summary.total_sales} transactions</p>
            </div>
            <div class="card stat-card">
                <h3>💵 Cash</h3>
                <p>${formatCurrency(summary.cash_payments)}</p>
            </div>
            <div class="card stat-card">
                <h3>📱 M-Pesa</h3>
                <p>${formatCurrency(summary.mpesa_payments)}</p>
            </div>
        </div>
        
        <div class="card">
            <h3>Sales Details - ${formatDate(date)}</h3>
            <div class="table-responsive">
                <table class="table" id="reportTable">
                    <thead>
                        <tr>
                            <th>Receipt #</th>
                            <th>Time</th>
                            <th>Products Sold</th>
                            <th>Total</th>
                            <th>Payment</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sales.map(sale => `
                            <tr>
                                <td>${sale.receipt_number}</td>
                                <td>${formatTime(sale.sale_date)}</td>
                                <td>
                                    ${sale.sale_items.map(item => 
                                        `${item.product_name} (${item.quantity})`
                                    ).join('<br>')}
                                    ${sale.discount_amount > 0 ? `<br><small>Discount: -${formatCurrency(sale.discount_amount)}</small>` : ''}
                                </td>
                                <td>${formatCurrency(sale.total_amount)}</td>
                                <td>${sale.payment_method === 'cash' ? '💵 Cash' : '📱 M-Pesa'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    document.getElementById('reportContent').innerHTML = html;
}

function downloadReportPDF() {
    const filename = `Daily_Report_${document.getElementById('reportDate').value}.pdf`;
    downloadPDF('reportContent', filename);
    showToast('Report downloaded as PDF', 'success');
}

function downloadReportExcel() {
    if (!currentReportData) return;
    
    const excelData = [];
    currentReportData.sales.forEach(sale => {
        sale.sale_items.forEach(item => {
            excelData.push({
                'Receipt Number': sale.receipt_number,
                'Date': formatDate(sale.sale_date),
                'Time': formatTime(sale.sale_date),
                'Product': item.product_name,
                'Quantity': item.quantity,
                'Unit Price': item.unit_price,
                'Subtotal': item.subtotal,
                'Total Sale': sale.total_amount,
                'Discount': sale.discount_amount,
                'Payment Method': sale.payment_method
            });
        });
    });
    
    const filename = `Daily_Report_${document.getElementById('reportDate').value}.xlsx`;
    downloadExcel(excelData, filename, 'Daily Report');
    showToast('Report downloaded as Excel', 'success');
}