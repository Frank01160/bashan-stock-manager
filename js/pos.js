// POS Main Logic
let cart = [];
let products = [];
let currentCategory = 'all';
let shopSettings = {};

// Initialize POS
document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    await loadProducts();
    await loadCategories();
    setupEventListeners();
});

async function loadSettings() {
    try {
        shopSettings = await getSettings();
        document.querySelector('.header h1').textContent = `🏪 ${shopSettings.shop_name}`;
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function loadProducts() {
    try {
        products = await getProducts();
        renderProducts();
    } catch (error) {
        showToast('Error loading products', 'error');
    }
}

async function loadCategories() {
    try {
        const response = await fetchAPI('/products');
        // Since we don't have a separate categories endpoint, extract from products
        const categories = [...new Set(products.map(p => p.categories?.name || 'Other'))];
        
        const tabsContainer = document.getElementById('categoryTabs');
        tabsContainer.innerHTML = '<button class="category-tab active" data-category="all">All</button>';
        
        categories.forEach(cat => {
            const button = document.createElement('button');
            button.className = 'category-tab';
            button.dataset.category = cat;
            button.textContent = cat;
            tabsContainer.appendChild(button);
        });
        
        // Add category click handlers
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                currentCategory = e.target.dataset.category;
                renderProducts();
            });
        });
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function renderProducts() {
    const grid = document.getElementById('productsGrid');
    let filteredProducts = products;
    
    if (currentCategory !== 'all') {
        filteredProducts = products.filter(p => (p.categories?.name || 'Other') === currentCategory);
    }
    
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (searchTerm) {
        filteredProducts = filteredProducts.filter(p => 
            p.name.toLowerCase().includes(searchTerm) ||
            p.description?.toLowerCase().includes(searchTerm)
        );
    }
    
    grid.innerHTML = filteredProducts.map(product => `
        <div class="product-card ${product.current_stock <= product.low_stock_threshold && product.low_stock_threshold > 0 ? 'low-stock' : ''}" 
             onclick="openQuantityModal('${product.id}')">
            <h3>${product.name}</h3>
            <p class="stock-info">${product.current_stock} ${product.unit} available</p>
            <p class="price">KES ${product.unit_price}/${product.unit}</p>
            ${product.current_stock <= product.low_stock_threshold && product.low_stock_threshold > 0 ? 
                '<span class="low-stock-badge">⚠ Low Stock</span>' : ''}
        </div>
    `).join('');
}

let selectedProduct = null;

function openQuantityModal(productId) {
    selectedProduct = products.find(p => p.id === productId);
    if (!selectedProduct) return;
    
    document.getElementById('modalProductName').textContent = selectedProduct.name;
    document.getElementById('modalProductInfo').textContent = 
        `Available: ${selectedProduct.current_stock} ${selectedProduct.unit} | Price: KES ${selectedProduct.unit_price}/${selectedProduct.unit}`;
    document.getElementById('modalUnit').textContent = selectedProduct.unit;
    document.getElementById('modalQuantity').value = 1;
    document.getElementById('modalQuantity').max = selectedProduct.current_stock;
    
    document.getElementById('quantityModal').classList.add('active');
}

function setupEventListeners() {
    // Search
    document.getElementById('searchInput').addEventListener('input', renderProducts);
    
    // Modal
    document.getElementById('modalAddBtn').addEventListener('click', addToCart);
    document.getElementById('modalCancelBtn').addEventListener('click', () => {
        document.getElementById('quantityModal').classList.remove('active');
    });
    
    // Cart
    document.getElementById('completeSaleBtn').addEventListener('click', completeSale);
    document.getElementById('clearCartBtn').addEventListener('click', clearCart);
    document.getElementById('discountInput').addEventListener('input', updateCartDisplay);
    
    // Receipt actions
    document.getElementById('downloadReceiptBtn').addEventListener('click', downloadReceipt);
    document.getElementById('printReceiptBtn').addEventListener('click', printReceipt);
    document.getElementById('newSaleBtn').addEventListener('click', () => {
        document.getElementById('receiptModal').classList.remove('active');
        clearCart();
    });
    
    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });
}

function addToCart() {
    const quantity = parseFloat(document.getElementById('modalQuantity').value);
    if (!quantity || quantity <= 0) {
        showToast('Please enter a valid quantity', 'error');
        return;
    }
    
    if (quantity > selectedProduct.current_stock) {
        showToast('Insufficient stock!', 'error');
        return;
    }
    
    const existingItem = cart.find(item => item.product_id === selectedProduct.id);
    if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > selectedProduct.current_stock) {
            showToast('Insufficient stock for combined quantity!', 'error');
            return;
        }
        existingItem.quantity = newQuantity;
        existingItem.subtotal = existingItem.quantity * existingItem.unit_price;
    } else {
        cart.push({
            product_id: selectedProduct.id,
            product_name: selectedProduct.name,
            quantity: quantity,
            unit_price: selectedProduct.unit_price,
            subtotal: quantity * selectedProduct.unit_price,
            unit: selectedProduct.unit
        });
    }
    
    document.getElementById('quantityModal').classList.remove('active');
    updateCartDisplay();
    showToast('Item added to cart', 'success');
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartDisplay();
}

function updateCartDisplay() {
    const cartContainer = document.getElementById('cartItems');
    const summaryContainer = document.getElementById('cartSummary');
    
    if (cart.length === 0) {
        cartContainer.innerHTML = '<p class="empty-cart">No items in cart</p>';
        summaryContainer.style.display = 'none';
        return;
    }
    
    summaryContainer.style.display = 'block';
    
    cartContainer.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.product_name}</div>
                <div class="cart-item-details">${item.quantity} ${item.unit} × KES ${item.unit_price}</div>
            </div>
            <div class="cart-item-total">KES ${item.subtotal.toFixed(2)}</div>
            <button class="remove-item" onclick="removeFromCart(${index})">×</button>
        </div>
    `).join('');
    
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const discount = parseFloat(document.getElementById('discountInput').value) || 0;
    const total = subtotal - discount;
    
    document.getElementById('subtotal').textContent = `KES ${subtotal.toFixed(2)}`;
    document.getElementById('total').textContent = `KES ${total.toFixed(2)}`;
}

function clearCart() {
    cart = [];
    document.getElementById('discountInput').value = 0;
    updateCartDisplay();
}

async function completeSale() {
    if (cart.length === 0) {
        showToast('Cart is empty!', 'error');
        return;
    }
    
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const discount = parseFloat(document.getElementById('discountInput').value) || 0;
    const total = subtotal - discount;
    
    if (total < 0) {
        showToast('Discount cannot exceed subtotal!', 'error');
        return;
    }
    
    const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
    
    const saleData = {
        items: cart,
        total_amount: total,
        discount_amount: discount,
        payment_method: paymentMethod
    };
    
    try {
        const result = await recordSale(saleData);
        showReceipt(result);
        clearCart();
        await loadProducts(); // Refresh stock levels
        showToast('Sale completed successfully!', 'success');
    } catch (error) {
        showToast('Error completing sale: ' + error.message, 'error');
    }
}

function showReceipt(saleData) {
    const receiptHTML = generateReceiptHTML(saleData, shopSettings);
    document.getElementById('receiptContent').innerHTML = receiptHTML;
    document.getElementById('receiptModal').classList.add('active');
    
    // Store sale data for download
    document.getElementById('receiptModal').dataset.saleData = JSON.stringify(saleData);
}

function downloadReceipt() {
    const saleData = JSON.parse(document.getElementById('receiptModal').dataset.saleData);
    const filename = `Receipt_${saleData.receipt_number}.pdf`;
    downloadPDF('receiptContent', filename);
    showToast('Receipt downloaded!', 'success');
}

function printReceipt() {
    printElement('receiptContent');
    document.getElementById('receiptModal').classList.remove('active');
}