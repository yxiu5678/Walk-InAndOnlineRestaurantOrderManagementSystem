let cart = {};
let orders = [];
let orderCounter = 1001;
let currentCategory = 'all';
let temporaryQuantities = {};
let userRole = null; // customer, staff
let loggedInUser = null;
let customerOrderType = null; // walkin, online

const menuItems = [
    { id: 1, name: "Grilled Salmon", price: 24.99, description: "Fresh Atlantic salmon grilled to perfection with herbs and lemon", category: "Main Course", image: "images/grilled-salmon.jpg" },
    { id: 2, name: "Beef Tenderloin", price: 32.99, description: "Premium cut beef tenderloin with garlic mashed potatoes", category: "Main Course", image: "images/beef-tenderloin.jpg" },
    { id: 3, name: "Caesar Salad", price: 12.99, description: "Crisp romaine lettuce with parmesan cheese and croutons", category: "Salad", image: "images/caeser-salad.jpg" },
    { id: 4, name: "Truffle Pasta", price: 18.99, description: "Handmade pasta with truffle cream sauce and wild mushrooms", category: "Pasta", image: "images/truffle-pasta.jpg" },
    { id: 5, name: "Chocolate Lava Cake", price: 8.99, description: "Warm chocolate cake with molten center and vanilla ice cream", category: "Dessert", image: "images/chocolate-lava-cake.jpg" },
    { id: 6, name: "Margherita Pizza", price: 16.99, description: "Traditional pizza with fresh mozzarella and basil", category: "Pizza", image: "images/margherita-pizza.jpg" },
    { id: 7, name: "Greek Salad", price: 14.99, description: "Fresh vegetables with feta cheese and olive oil dressing", category: "Salad", image: "images/greek-salad.jpg" },
    { id: 8, name: "Chicken Alfredo", price: 21.99, description: "Creamy alfredo pasta with grilled chicken breast", category: "Pasta", image: "images/chicken-alfredo.jpg" },
    { id: 9, name: "Iced Coffee", price: 8.99, description: "Freshly brewed coffee with ice and milk", category: "Drinks", image: "images/iced-coffee.jpg" },
    { id: 10, name: "Fresh Orange Juice", price: 6.99, description: "Freshly squeezed orange juice", category: "Drinks", image: "images/orange-juice.jpg" },
    { id: 11, name: "Mango Smoothie", price: 9.99, description: "Blended mango with yogurt and honey", category: "Drinks", image: "images/mango-smoothie.jpg" },
    { id: 12, name: "Green Tea", price: 4.99, description: "Premium Japanese green tea", category: "Drinks", image: "images/green-tea.jpg" },
    { id: 13, name: "Coca-Cola", price: 3.99, description: "Classic Coca-Cola", category: "Drinks", image: "images/coca-cola.jpg" }
];

const users = {
    'abc@gmail.com': { password: 'abc123', name: 'ABC Customer', role: 'customer', phone: '0123456789', address: '123 Main St, Anytown, 12345' },
    'staff1@gmail.com': { password: 'abc123', name: 'Staff One', role: 'staff' }
};

// --- Initial Load Functions ---

function init() {
    loadOrders();
    userRole = sessionStorage.getItem('userRole');
    loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser'));
    customerOrderType = sessionStorage.getItem('customerOrderType');

    const urlParams = new URLSearchParams(window.location.search);
    const table = urlParams.get('table') || '5';
    document.getElementById('tableInfo').textContent = `Table #${table}`;

    if (userRole && loggedInUser) {
        if (userRole === 'customer') {
            document.getElementById('role-selection-page').classList.remove('active');
            document.getElementById('login-page').classList.remove('active');

            if (customerOrderType) {
                document.getElementById('customer-order-type-page').classList.remove('active');
                document.getElementById('menu-page').classList.add('active');
                document.getElementById('mainAppBar').style.display = 'flex';
                document.getElementById('customerNav').style.display = 'flex';
                updateAppBarForCustomerOrderType();
                loadMenuItems();
                loadRecommendedItems();
                updateCartBadge();
                loadProfileData();
            } else {
                document.getElementById('customer-order-type-page').classList.add('active');
                document.getElementById('mainAppBar').style.display = 'none';
                document.getElementById('customerNav').style.display = 'none';
            }

        } else {
            window.location.href = 'staff.html';
        }
    } else {
        document.getElementById('role-selection-page').classList.add('active');
        document.getElementById('mainAppBar').style.display = 'none'; // Hide app bar 
        document.getElementById('customerNav').style.display = 'none'; // Hide nav bar 
    }
}

function initStaff() {
    loadOrders();
    userRole = sessionStorage.getItem('userRole');
    loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser'));

    if (userRole && loggedInUser && userRole === 'staff') {
        document.getElementById('staff-order-menu-page').classList.add('active');
        document.getElementById('staffAppBar').style.display = 'flex'; r
        document.getElementById('staffNav').style.display = 'flex';
        document.getElementById('staffTableInfo').textContent = `Logged in as: ${loggedInUser.name}`;
        loadMenuItems('staff');
        loadStaffProfileData();
    } else {
        window.location.href = 'index.html';
    }
}


// --- Authentication and Role Management ---

let currentLoginRole = '';

function showLoginPage(role) {
    currentLoginRole = role;
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById('login-page').classList.add('active');
    document.getElementById('login-header').textContent = `${role.charAt(0).toUpperCase() + role.slice(1)} Login`;
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
}

function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (users[email] && users[email].password === password && users[email].role === currentLoginRole) {
        userRole = users[email].role;
        loggedInUser = {
            email: email,
            name: users[email].name,
            role: userRole,
            phone: users[email].phone || '',
            address: users[email].address || ''
        };

        sessionStorage.setItem('userRole', userRole);
        sessionStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));
        showToast(`Welcome, ${loggedInUser.name}!`);

        if (userRole === 'customer') {
            document.getElementById('login-page').classList.remove('active');
            document.getElementById('customer-order-type-page').classList.add('active');
            document.getElementById('mainAppBar').style.display = 'none';
            document.getElementById('customerNav').style.display = 'none';
        } else { // Staff login
            window.location.href = 'staff.html';
        }
    } else {
        showToast('Invalid credentials or role mismatch', 'error');
    }
}

function selectOrderType(type) {
    customerOrderType = type;
    sessionStorage.setItem('customerOrderType', type);

    document.getElementById('customer-order-type-page').classList.remove('active');
    document.getElementById('menu-page').classList.add('active');
    document.getElementById('mainAppBar').style.display = 'flex';
    document.getElementById('customerNav').style.display = 'flex';

    updateAppBarForCustomerOrderType();
    loadMenuItems();
    loadRecommendedItems();
    updateCartBadge();
    loadProfileData();
}

function updateAppBarForCustomerOrderType() {
    const appBarTitle = document.getElementById('mainAppBar').querySelector('h1');
    const tableInfo = document.getElementById('tableInfo');

    if (customerOrderType === 'walkin') {
        appBarTitle.textContent = 'Az Kitchen | Walk-in Order';
        tableInfo.style.display = 'block'; // Show table info for walk-in
    } else if (customerOrderType === 'online') {
        appBarTitle.textContent = 'Az Kitchen | Online Order';
        tableInfo.style.display = 'none'; // Hide table info for online
    }
}


function logout() {
    sessionStorage.clear();
    cart = {};
    userRole = null;
    loggedInUser = null;
    customerOrderType = null;
    showToast('Logged out successfully!');
    if (window.location.pathname.includes('staff.html')) {
        window.location.href = 'index.html';
    } else {
        document.getElementById('mainAppBar').style.display = 'none';
        document.getElementById('customerNav').style.display = 'none';
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.getElementById('role-selection-page').classList.add('active');
    }
}


// --- General Page Navigation ---

function showPage(pageId, navItem) {

    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.querySelectorAll('#customerNav .nav-item').forEach(item => {
        item.classList.remove('active');
    });

    if (navItem) {
        navItem.classList.add('active');
    }

    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    switch (pageId) {
        case 'cart-page':
            loadCartContent();
            break;
        case 'orders-page':
            loadOrdersContent();
            break;
        case 'menu-page':
            loadMenuItems();
            break;
        case 'profile-page':
            loadProfileData();
            break;
        case 'checkout-page':
            loadCheckoutPage();
            break;
    }
}

function showStaffPage(pageId, navItem) {

    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.querySelectorAll('#staffNav .nav-item').forEach(item => {
        item.classList.remove('active');
    });

    if (navItem) {
        navItem.classList.add('active');
    }

    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    switch (pageId) {
        case 'staff-order-menu-page':
            loadMenuItems('staff');
            break;
        case 'staff-manage-orders-page':
            loadStaffOrdersManagement();
            break;
        case 'staff-profile-page':
            loadStaffProfileData();
            break;
    }
}

// --- Menu Page ---

function loadMenuItems(target = 'customer') {
    const menuGrid = target === 'customer' ? document.getElementById('menuGrid') : document.getElementById('staffMenuGrid');
    if (!menuGrid) return;

    const filteredItems = currentCategory === 'all'
        ? menuItems
        : menuItems.filter(item => item.category === currentCategory);

    const menuHTML = filteredItems.map(item => {
        const tempQty = temporaryQuantities[item.id] || 1;

        return `
            <div class="menu-item" data-id="${item.id}">
                <div class="item-image">
                    <img src="${item.image}" alt="${item.name}" style="width:100%;height:100%;object-fit:cover;">
                </div>
                <div class="item-content">
                    <div class="item-header">
                        <div class="item-name">${item.name}</div>
                        <div class="item-price">RM${item.price.toFixed(2)}</div>
                    </div>
                    <div class="item-description">${item.description}</div>
                    <br>
                    <div class="quantity-controls">
                        <div class="quantity-selector">
                            <button class="quantity-btn" onclick="changeTemporaryQuantity(${item.id}, -1, '${target}')" ${tempQty === 1 ? 'disabled' : ''}>-</button>
                            <span class="quantity-display">${tempQty}</span>
                            <button class="quantity-btn" onclick="changeTemporaryQuantity(${item.id}, 1, '${target}')">+</button>
                        </div>
                        <button class="add-to-cart" onclick="addToCartFromMenu(${item.id}, '${target}')">Add to Cart</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    menuGrid.innerHTML = menuHTML;
}

function changeTemporaryQuantity(itemId, change, target = 'customer') {
    if (!temporaryQuantities[itemId]) {
        temporaryQuantities[itemId] = 1;
    }

    const newQty = Math.max(1, temporaryQuantities[itemId] + change);
    temporaryQuantities[itemId] = newQty;

    const menuItemElement = document.querySelector(`${target === 'customer' ? '#menuGrid' : '#staffMenuGrid'} .menu-item[data-id="${itemId}"]`);
    if (menuItemElement) {
        const quantityDisplay = menuItemElement.querySelector('.quantity-display');
        const decreaseBtn = menuItemElement.querySelector('.quantity-btn:first-child');

        if (quantityDisplay) {
            quantityDisplay.textContent = newQty;
        }
        if (decreaseBtn) {
            decreaseBtn.disabled = newQty === 1;
        }
    }
}

function addToCartFromMenu(itemId, target = 'customer') {
    const qty = temporaryQuantities[itemId] || 1;
    const item = menuItems.find(m => m.id === itemId);

    if (target === 'customer') {
        cart[itemId] = (cart[itemId] || 0) + qty;
        updateCartBadge();
        showToast(`${qty} ${item.name} added to cart`);
    } else if (target === 'staff') {
        const tableNumber = document.getElementById('staffOrderTableNumber').value;
        if (!tableNumber) {
            showToast('Please enter a table number', 'error');
            return;
        }

        // Find an existing active order for this table
        let activeOrder = orders.find(order =>
            order.table == tableNumber &&
            ['Pending', 'In Progress', 'Ready'].includes(order.status)
        );

        if (activeOrder) {
            // Add item to existing order
            activeOrder.items[itemId] = (activeOrder.items[itemId] || 0) + qty;
            activeOrder.total = calculateTotal(activeOrder.items);
            showToast(`${qty} ${item.name} added to Order #${activeOrder.id} for Table #${tableNumber}`);
        } else {
            // Create a new order
            const newOrderItems = { [itemId]: qty };
            const newOrder = {
                id: orderCounter++,
                table: tableNumber,
                items: newOrderItems,
                total: calculateTotal(newOrderItems),
                status: 'Pending',
                timestamp: new Date().toLocaleString(),
                staffName: loggedInUser.name,
                customerName: `Table ${tableNumber}`
            };
            orders.push(newOrder);
            showToast(`New Order #${newOrder.id} created for Table #${tableNumber} with ${qty} ${item.name}`);
        }
        saveOrders();

        temporaryQuantities = {};
    }

    loadMenuItems(target);
}

function loadRecommendedItems() {

    if (window.location.pathname.includes('staff.html')) return;

    const recommendedItems = document.querySelector('.recommended-items');
    const recommendedIds = [1, 2, 4, 6, 8, 9, 10];

    const recommendedHTML = recommendedIds.map(id => {
        const item = menuItems.find(m => m.id === id);
        if (!item) return '';

        return `
            <div class="recommended-item">
                <div class="item-image">
                    <img src="${item.image}" alt="${item.name}">
                </div>
                <div class="item-info">
                    <div class="item-name">${item.name}</div>
                    <div class="item-price">RM${item.price.toFixed(2)}</div>
                </div>
                <button class="add-to-cart" onclick="addToCartFromMenu(${item.id})">Add to Cart</button>
            </div>
        `;
    }).join('');

    recommendedItems.innerHTML = recommendedHTML;
}

function filterCategory(category, element, target = 'customer') {
    currentCategory = category;
    document.querySelectorAll('.category-chip').forEach(chip => chip.classList.remove('active'));
    element.classList.add('active');
    loadMenuItems(target);
}


// --- Cart Page (Customer) ---

function updateCartBadge() {
    const totalItems = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
    const badge = document.getElementById('cartBadge');

    if (totalItems > 0) {
        badge.textContent = totalItems;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

function loadCartContent() {
    const cartContent = document.getElementById('cartContent');
    const cartItems = Object.entries(cart);

    if (cartItems.length === 0) {
        cartContent.innerHTML = `
                            <div class="empty-state">
                                <div class="icon">🛒</div>
                                <h3>Your cart is empty</h3>
                                <p>Add some delicious items from our menu</p>
                            </div>
                        `;
        return;
    }

    let subtotal = 0;
    const itemsHTML = cartItems.map(([itemId, quantity]) => {
        const item = menuItems.find(m => m.id == itemId);
        const itemTotal = item.price * quantity;
        subtotal += itemTotal;
        return `
            <div class="cart-item">
                <div class="cart-item-image">
                    <img src="${item.image}" alt="${item.name}">
                </div>
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">RM${item.price.toFixed(2)} x ${quantity}</div>
                </div>
                <div class="quantity-selector">
                    <button class="quantity-btn" onclick="updateCartItemQuantity(${item.id}, -1)">-</button>
                    <span class="quantity-display">${quantity}</span>
                    <button class="quantity-btn" onclick="updateCartItemQuantity(${item.id}, 1)">+</button>
                </div>
            </div>
        `;
    }).join('');

    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    let actionButtonHTML;
    if (customerOrderType === 'walkin') {
        actionButtonHTML = `<button class="checkout-btn" onclick="placeWalkinOrder()">Place Order - RM${total.toFixed(2)}</button>`;
    } else { // 'online'
        actionButtonHTML = `<button class="checkout-btn" onclick="showCheckoutPage()">Checkout - RM${total.toFixed(2)}</button>`;
    }


    cartContent.innerHTML = `
                        <div class="cart-items">
                            ${itemsHTML}
                        </div>
                        <div class="cart-summary">
                            <div class="summary-row">
                                <span>Subtotal</span>
                                <span>RM${subtotal.toFixed(2)}</span>
                            </div>
                            <div class="summary-row">
                                <span>Tax (10%)</span>
                                <span>RM${tax.toFixed(2)}</span>
                            </div>
                            <div class="summary-row total">
                                <span>Total</span>
                                 <span>RM${total.toFixed(2)}</span>
                            </div>
                            ${actionButtonHTML}
                        </div>
                    `;
}

function updateCartItemQuantity(itemId, change) {
    if (!cart[itemId]) return;

    const newQty = cart[itemId] + change;
    if (newQty <= 0) {
        delete cart[itemId];
    } else {
        cart[itemId] = newQty;
    }

    loadCartContent();
    updateCartBadge();
}

function calculateTotal(itemsInCart) {
    let subtotal = 0;
    Object.entries(itemsInCart).forEach(([itemId, quantity]) => {
        const item = menuItems.find(m => m.id == itemId);
        subtotal += item.price * quantity;
    });
    return subtotal * 1.1;
}

function placeWalkinOrder() {
    if (Object.keys(cart).length === 0) {
        showToast('Your cart is empty', 'error');
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const table = urlParams.get('table') || '5';

    const order = {
        id: orderCounter++,
        type: 'Walk-in',
        table: table,
        items: { ...cart },
        total: calculateTotal(cart),
        status: 'Pending',
        timestamp: new Date().toLocaleString(),
        customerName: loggedInUser.name || 'Walk-in Customer'
    };

    orders.push(order);
    cart = {};
    updateCartBadge();
    showToast('Order placed successfully! 🎉');
    saveOrders();

    setTimeout(() => {
        const ordersNavItem = document.querySelector('.nav-item:nth-child(3)');
        showPage('orders-page', ordersNavItem);
    }, 1500);
}

function showCheckoutPage() {
    if (Object.keys(cart).length === 0) {
        showToast('Your cart is empty', 'error');
        return;
    }
    const checkoutPageNav = null;
    showPage('checkout-page', checkoutPageNav);

    document.getElementById('checkoutName').value = loggedInUser.name || '';
    document.getElementById('checkoutEmail').value = loggedInUser.email || '';
    document.getElementById('checkoutPhone').value = loggedInUser.phone || '';
    document.getElementById('checkoutAddress').value = loggedInUser.address || '';
}


function makeOnlinePayment() {
    if (Object.keys(cart).length === 0) {
        showToast('Your cart is empty', 'error');
        return;
    }

    const customerName = document.getElementById('checkoutName').value;
    const customerEmail = document.getElementById('checkoutEmail').value;
    const customerPhone = document.getElementById('checkoutPhone').value;
    const shippingAddress = document.getElementById('checkoutAddress').value;
    const paymentMethod = document.getElementById('paymentMethod').value;

    if (!customerName || !customerPhone || !shippingAddress) {
        showToast('Please fill in all required contact and address details.', 'error');
        return;
    }

    const order = {
        id: orderCounter++,
        type: 'Online',
        table: 'Online',
        items: { ...cart },
        total: calculateTotal(cart),
        status: 'Pending',
        timestamp: new Date().toLocaleString(),
        customerName: customerName,
        customerEmail: customerEmail,
        customerPhone: customerPhone,
        shippingAddress: shippingAddress,
        paymentMethod: paymentMethod
    };

    orders.push(order);
    cart = {};
    updateCartBadge();
    showToast('Online Order placed successfully! Check your orders for details.');
    saveOrders();

    loggedInUser.name = customerName;
    loggedInUser.phone = customerPhone;
    loggedInUser.address = shippingAddress;
    sessionStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));
    if (users[loggedInUser.email]) {
        users[loggedInUser.email].name = customerName;
        users[loggedInUser.email].phone = customerPhone;
        users[loggedInUser.email].address = shippingAddress;
    }


    setTimeout(() => {
        const ordersNavItem = document.querySelector('.nav-item:nth-child(3)');
        showPage('orders-page', ordersNavItem);
    }, 1500);
}


// --- Orders Page (Customer & Staff) ---

function loadOrdersContent() {

    const ordersList = document.getElementById('ordersList');
    if (!ordersList) return;

    const customerOrders = orders.filter(order => order.customerName === loggedInUser.name);

    if (customerOrders.length === 0) {
        ordersList.innerHTML = `
                            <div class="empty-state">
                                <div class="icon">📋</div>
                                <h3>No orders yet</h3>
                                <p>Your order history will appear here</p>
                            </div>
                        `;
        return;
    }

    const ordersHTML = customerOrders.slice().reverse().map(order => {
        const itemsList = Object.entries(order.items).map(([itemId, quantity]) => {
            const item = menuItems.find(m => m.id == itemId);
            return `${item.name} (${quantity})`;
        }).join(', ');

        let orderSpecificDetails = '';
        if (order.type === 'Online') {
            orderSpecificDetails = `
                <div class="order-details-row">
                    <span><strong>Order Type:</strong> Online</span>
                    <span><strong>Payment:</strong> ${order.paymentMethod || 'N/A'}</span>
                </div>
                <div class="order-details-row">
                    <span><strong>Address:</strong> ${order.shippingAddress || 'N/A'}</span>
                </div>
            `;
        } else { // Walk-in
            orderSpecificDetails = `
                <div class="order-details-row">
                    <span><strong>Order Type:</strong> Walk-in</span>
                    <span><strong>Table:</strong> ${order.table || 'N/A'}</span>
                </div>
            `;
        }


        return `
            <div class="order-card">
                <div class="order-header">
                    <div class="order-id">Order #${order.id}</div>
                    <div class="order-status status-${order.status.toLowerCase().replace(' ', '')}">
                        ${order.status}
                    </div>
                </div>
                <div class="order-items">${itemsList}</div>
                ${orderSpecificDetails}
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                    <div class="order-total">RM${order.total.toFixed(2)}</div>
                    <div style="font-size: 0.8rem; color: #666;">${order.timestamp}</div>
                </div>
            </div>
        `;
    }).join('');

    ordersList.innerHTML = ordersHTML;
}

function loadStaffOrdersManagement() {
    const ordersList = document.getElementById('staffOrdersList');
    if (!ordersList) return;

    if (orders.length === 0) {
        ordersList.innerHTML = `
                            <div class="empty-state">
                                <div class="icon">📋</div>
                                <h3>No active orders</h3>
                                <p>New orders will appear here</p>
                            </div>
                        `;
        return;
    }

    const ordersHTML = orders.slice().reverse().map(order => {
        const itemsList = Object.entries(order.items).map(([itemId, quantity]) => {
            const item = menuItems.find(m => m.id == itemId);
            return `${item.name} (${quantity})`;
        }).join(', ');

        let orderContext = '';
        if (order.type === 'Online') {
            orderContext = `(Online Order | Payment: ${order.paymentMethod || 'N/A'})`;
        } else {
            orderContext = `(Table: ${order.table})`;
        }
        if (order.staffName) {
            orderContext += ` | Staff: ${order.staffName}`;
        }


        return `
            <div class="order-card">
                <div class="order-header">
                    <div class="order-id">Order #${order.id} ${orderContext}</div>
                    <div class="order-status status-${order.status.toLowerCase().replace(' ', '')}" id="orderStatusDisplay_${order.id}">
                        ${order.status}
                    </div>
                </div>
                <div class="order-items">${itemsList}</div>
                 ${order.type === 'Online' && order.shippingAddress ? `<div class="order-details-row"><strong>Address:</strong> ${order.shippingAddress}</div>` : ''}
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                    <div class="order-total">RM${order.total.toFixed(2)}</div>
                    <div style="font-size: 0.8rem; color: #666;">${order.timestamp}</div>
                </div>
                <div class="order-actions" style="margin-top: 15px; display: flex; gap: 10px;">
                    <select id="statusSelect_${order.id}" class="form-input" style="flex: 1;" disabled>
                        <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="In Progress" ${order.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                        <option value="Ready" ${order.status === 'Ready' ? 'selected' : ''}>Ready</option>
                        <option value="Completed" ${order.status === 'Completed' ? 'selected' : ''}>Completed</option>
                    </select>
                    <button class="action-btn edit-btn" onclick="toggleEditMode(${order.id})">Edit</button>
                    <button class="action-btn save-btn" id="saveButton_${order.id}" style="display:none;" onclick="saveSingleOrderStatus(${order.id})">Save</button>
                    <button class="action-btn delete-btn" style="background-color: #dc3545;" onclick="deleteOrder(${order.id})">Delete</button>
                </div>
            </div>
        `;
    }).join('');

    ordersList.innerHTML = ordersHTML;
}

function toggleEditMode(orderId) {
    const selectElement = document.getElementById(`statusSelect_${orderId}`);
    const saveButton = document.getElementById(`saveButton_${orderId}`);
    const editButton = document.querySelector(`.order-card .action-btn.edit-btn[onclick*='${orderId}']`);

    if (selectElement.disabled) {
        selectElement.disabled = false;
        saveButton.style.display = 'block';
        editButton.textContent = 'Cancel';
        editButton.style.backgroundColor = '#6c757d';
    } else {
        selectElement.disabled = true;
        saveButton.style.display = 'none';
        editButton.textContent = 'Edit';
        editButton.style.backgroundColor = '';
        const order = orders.find(o => o.id === orderId);
        if (order) {
            selectElement.value = order.status;
        }
    }
}

function saveSingleOrderStatus(orderId) {
    const order = orders.find(o => o.id === orderId);
    const selectElement = document.getElementById(`statusSelect_${orderId}`);

    if (order && selectElement) {
        const newStatus = selectElement.value;
        if (newStatus !== order.status) {
            order.status = newStatus;
            saveOrders();
            showToast(`Order #${orderId} status updated to ${newStatus}`);
            const statusDisplayElement = document.getElementById(`orderStatusDisplay_${order.id}`);
            if (statusDisplayElement) {
                statusDisplayElement.textContent = newStatus;
                statusDisplayElement.className = `order-status status-${newStatus.toLowerCase().replace(' ', '')}`;
            }
        } else {
            showToast('No change in status for this order.', 'info');
        }
        toggleEditMode(orderId);
    }
}

function deleteOrder(orderId) {
    if (confirm(`Are you sure you want to delete Order #${orderId}? This cannot be undone.`)) {
        const initialOrderCount = orders.length;
        orders = orders.filter(order => order.id !== orderId);
        if (orders.length < initialOrderCount) {
            saveOrders();
            showToast(`Order #${orderId} deleted successfully.`);
            loadStaffOrdersManagement();
        } else {
            showToast('Failed to delete order.', 'error');
        }
    }
}


// --- Profile Page (Customer & Staff) ---

function loadProfileData() {

    if (loggedInUser && userRole === 'customer') {
        document.getElementById('profileName').value = loggedInUser.name;
        document.getElementById('profileEmail').value = loggedInUser.email;
        document.getElementById('profilePhone').value = loggedInUser.phone || '';
    }
}

function saveProfile() {

    if (loggedInUser && userRole === 'customer') {
        loggedInUser.name = document.getElementById('profileName').value;
        loggedInUser.phone = document.getElementById('profilePhone').value;
        // Update user data in the dummy users object
        if (users[loggedInUser.email]) {
            users[loggedInUser.email].name = loggedInUser.name;
            users[loggedInUser.email].phone = loggedInUser.phone;
        }
        sessionStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));
        showToast('Profile saved successfully!');
    }
}

function loadStaffProfileData() {

    if (loggedInUser && userRole === 'staff') {
        document.getElementById('staffProfileName').value = loggedInUser.name;
        document.getElementById('staffProfileEmail').value = loggedInUser.email;
    }
}

function saveStaffProfile() {

    if (loggedInUser && userRole === 'staff') {
        loggedInUser.name = document.getElementById('staffProfileName').value;
        users[loggedInUser.email].name = loggedInUser.name;
        sessionStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));
        showToast('Staff profile saved successfully!');
    }
}


// --- Local Storage ---

function saveOrders() {
    localStorage.setItem('azKitchenOrders', JSON.stringify(orders));
    localStorage.setItem('orderCounter', orderCounter);
}

function loadOrders() {
    const storedOrders = localStorage.getItem('azKitchenOrders');
    if (storedOrders) {
        orders = JSON.parse(storedOrders);
    } else {

        orders.push(
            { id: 1001, type: 'Walk-in', table: '5', items: { 1: 1, 3: 2 }, total: 49.97, status: 'Ready', timestamp: new Date(Date.now() - 86400000).toLocaleString(), customerName: 'ABC Customer' },
            { id: 1002, type: 'Online', table: 'Online', items: { 6: 1, 9: 1 }, total: 29.58, status: 'Pending', timestamp: new Date(Date.now() - 172800000).toLocaleString(), customerName: 'ABC Customer', customerEmail: 'abc@gmail.com', customerPhone: '0123456789', shippingAddress: '123 Main St, Anytown, 12345', paymentMethod: 'Credit Card' }
        );
    }

    const storedOrderCounter = localStorage.getItem('orderCounter');
    if (storedOrderCounter) {
        orderCounter = parseInt(storedOrderCounter);
    } else {
        orderCounter = 1003;
    }
}


// --- Toast Notification ---
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.backgroundColor = type === 'error' ? '#dc3545' : '#28a745';
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}