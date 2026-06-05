// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 2
    }).format(amount);
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatTime(date) {
    return new Date(date).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function generateReceiptHTML(saleData, settings) {
    const { receipt_number, sale_date, total_amount, discount_amount, payment_method, sale_items } = saleData;
    const shopName = settings?.shop_name || 'Bashan Animal Feeds';
    const phone = settings?.phone || '';
    const address = settings?.address || '';
    
    let itemsHTML = sale_items.map(item => `
        <tr>
            <td>${item.product_name}</td>
            <td>${item.quantity} ${item.unit || 'kg'}</td>
            <td>${formatCurrency(item.unit_price)}</td>
            <td>${formatCurrency(item.subtotal)}</td>
        </tr>
    `).join('');
    
    return `
        <div class="receipt">
            <h2>${shopName}</h2>
            ${address ? `<p>${address}</p>` : ''}
            ${phone ? `<p>Tel: ${phone}</p>` : ''}
            <hr>
            <p><strong>Receipt #:</strong> ${receipt_number}</p>
            <p><strong>Date:</strong> ${formatDate(sale_date)} ${formatTime(sale_date)}</p>
            <hr>
            <table class="table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHTML}
                </tbody>
            </table>
            <hr>
            ${discount_amount > 0 ? `<p><strong>Discount:</strong> ${formatCurrency(discount_amount)}</p>` : ''}
            <p><strong>Total:</strong> ${formatCurrency(total_amount)}</p>
            <p><strong>Payment:</strong> ${payment_method === 'cash' ? '💵 Cash' : '📱 M-Pesa'}</p>
            <hr>
            <p>Thank you for your business!</p>
        </div>
    `;
}

function downloadPDF(elementId, filename) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const element = document.getElementById(elementId);
    
    doc.html(element, {
        callback: function(doc) {
            doc.save(filename);
        },
        x: 10,
        y: 10,
        width: 180
    });
}

function downloadExcel(data, filename, sheetName = 'Report') {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename);
}

function printElement(elementId) {
    const printContent = document.getElementById(elementId).innerHTML;
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    location.reload();
}