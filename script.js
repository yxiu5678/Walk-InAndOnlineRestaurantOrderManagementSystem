let cart = {};
let orders = [];
let currentCategory = 'all';
let temporaryQuantities = {};
let userRole = null; // customer, staff
let loggedInUser = null;
let customerOrderType = null; // walkin, online
let isEditing = false;
let menuItems = [];

// --- Initial Load Functions ---

async function init() {
    await loadMenuFromAPI();
    userRole = localStorage.getItem('userRole');
    loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
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
        document.getElementById('mainAppBar').style.display = 'none';
        document.getElementById('customerNav').style.display = 'none';
    }
}

async function initStaff() {
    await loadMenuFromAPI();
    userRole = localStorage.getItem('userRole');
    loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));

    if (userRole && loggedInUser && userRole === 'staff') {
        document.getElementById('staff-order-menu-page').classList.add('active');
        document.getElementById('staffAppBar').style.display = 'flex';
        document.getElementById('staffNav').style.display = 'flex';
        document.getElementById('staffTableInfo').textContent = `Logged in as: ${loggedInUser.name}`;
        loadMenuItems('staff');
        loadStaffProfileData();
    } else {
        window.location.href = 'index.html';
    }
}

// --- Authentication and Role Management ---

function showLoginPage(role) {
    userRole = role;
    const loginHeader = document.getElementById('login-header');
    const registerBtn = document.getElementById('registerBtn');

    if (role === 'customer') {
        loginHeader.textContent = 'Customer Login';
        if (registerBtn) registerBtn.style.display = 'block';
        userRole = 'customer';
    } else if (role === 'staff') {
        loginHeader.textContent = 'Staff Login';
        if (registerBtn) registerBtn.style.display = 'none';
        userRole = 'staff';
    }
    showPage('login-page');
    // Clear login fields
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
}

function showRegisterPage() {
    document.getElementById('register-page').classList.add('active');
    document.getElementById('mainAppBar').style.display = 'none';

    document.getElementById('registerName').value = '';
    document.getElementById('registerEmail').value = '';
    document.getElementById('registerPhone').value = '';
    document.getElementById('registerPassword').value = '';
    document.getElementById('registerConfirmPassword').value = '';

    showPage('register-page');
}

function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (!email || !password || !userRole) {
        showToast('Please enter email, password, and select a role.', false);
        return;
    }

    const payload = {
        action: 'login',
        email: email,
        password: password,
        role: userRole
    };

    console.log('Posting to auth.php with payload:', JSON.stringify(payload));

    fetch('api/auth.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    })
        .then(response => response.json())
        .then(data => {
            console.log('Login response:', data);

            if (data.success) {
                showToast(data.message, true);
                loggedInUser = data.user;
                localStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));
                localStorage.setItem('userRole', userRole);

                if (userRole === 'customer') {
                    document.getElementById('login-page').classList.remove('active');
                    document.getElementById('customer-order-type-page').classList.add('active');
                    document.getElementById('mainAppBar').style.display = 'none';
                    document.getElementById('customerNav').style.display = 'none';
                } else if (userRole === 'staff') {
                    window.location.href = 'staff.html';
                }
            } else {
                showToast(data.message, false);
            }
        })
        .catch(error => {
            console.error('Login error:', error);
            showToast('An error occurred during login. Please try again.', false);
        });
}

async function registerCustomer() {
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const phone = document.getElementById('registerPhone').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;

    if (!name || !email || !phone || !password || !confirmPassword) {
        showToast('All fields are required.', 'error');
        return;
    }
    if (!email.includes('@') || !email.includes('.')) {
        showToast('Please enter a valid email address.', 'error');
        return;
    }
    if (password.length < 6) {
        showToast('Password must be at least 6 characters long.', 'error');
        return;
    }
    if (password !== confirmPassword) {
        showToast('Passwords do not match.', 'error');
        return;
    }
    if (!/^\d+$/.test(phone)) {
        showToast('Phone number should contain only digits.', 'error');
        return;
    }

    const payload = {
        action: 'register',
        name: name,
        email: email,
        phoneNumber: phone,
        password: password,
        role: 'customer'
    };

    try {
        const response = await fetch('api/auth.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        const textData = await response.text();
        console.log(textData);
        const data = JSON.parse(textData);

        if (data.success) {
            showToast('Registration successful! Please login.');
            showLoginPage('customer');
        } else {
            showToast(`Registration failed: ${data.message}`, 'error');
        }
    } catch (error) {
        console.error('Error during registration:', error);
        showToast('An error occurred during registration. Please try again.', 'error');
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
        tableInfo.style.display = 'block';
    } else if (customerOrderType === 'online') {
        appBarTitle.textContent = 'Az Kitchen | Online Order';
        tableInfo.style.display = 'none';
    }
}


function logout() {
    localStorage.clear();
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
            if (menuItems.length === 0) {
                loadMenuFromAPI().then(() => {
                    loadMenuItems();
                    loadRecommendedItems();
                });
            } else {
                loadMenuItems();
            }
            break;
        case 'profile-page':
            loadProfileData();
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
        case 'checkout-page':
            renderCart();
            if (loggedInUser && userRole === 'customer') {
                document.getElementById('checkoutEmail').value = loggedInUser.email || '';
                document.getElementById('checkoutName').value = loggedInUser.name || '';
                document.getElementById('checkoutPhone').value = loggedInUser.phoneNumber || '';
                document.getElementById('checkoutAddress').value = loggedInUser.address || '';
            }
            break;

    }
}

// --- Menu Page ---

async function loadMenuFromAPI() {
    try {
        const response = await fetch('api/meals.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'getMeals' })
        });

        const data = await response.json();

        if (data.success && data.meals) {
            menuItems = data.meals.map(meal => ({
                id: parseInt(meal.mealID),
                name: meal.name,
                price: parseFloat(meal.price),
                description: meal.description,
                category: meal.category,
                image: `api/meals.php?action=getMealImage&mealID=${meal.mealID}`
            }));
            console.log('Loaded menu items:', menuItems);
        } else {
            console.error('Failed to load meals:', data.message);
            showToast('Failed to load menu items', 'error');
        }
    } catch (error) {
        console.error('Error loading meals:', error);
        showToast('Error loading menu items', 'error');
    }
}

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

async function addToCartFromMenu(itemId, target = 'customer') {
    const numericItemId = parseInt(itemId);
    const qty = temporaryQuantities[numericItemId] || 1;

    console.log('Looking for item with ID:', numericItemId);
    console.log('Available menu items:', menuItems.map(m => ({ id: m.id, name: m.name })));

    const item = menuItems.find(m => m.id === numericItemId);

    if (!item) {
        console.error(`Error: Menu item with ID ${itemId} not found.`);
        console.log('Available IDs:', menuItems.map(m => m.id));
        showToast('Error: Selected menu item not found. Please refresh and try again.', 'error');
        return;
    }

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

        let existingOrderID = null;

        try {
            const checkOrderResponse = await fetch(`api/orders.php?action=getUncompletedOrderByTable&tableNo=${tableNumber}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const checkOrderData = await checkOrderResponse.json();

            if (checkOrderData.success && checkOrderData.order) {
                existingOrderID = checkOrderData.order.orderID;
                console.log(`Found existing uncompleted order for Table #${tableNumber}: OrderID ${existingOrderID}`);
            } else {
                console.log(`No uncompleted order found for Table #${tableNumber}. Will create new order.`);
            }
        } catch (error) {
            console.error('Error checking for existing order:', error);
            showToast('An error occurred while checking for existing orders.', 'error');
            return;
        }

        let payload;
        let apiEndpoint = 'api/orders.php';
        let successMessage = '';
        let orderIDToDisplay = '';

        if (existingOrderID) {
            payload = {
                action: 'updateOrderItems',
                orderID: existingOrderID,
                mealID: numericItemId,
                quantity: qty
            };
            successMessage = `Added ${qty} ${item.name} to existing order for Table #${tableNumber}`;
            orderIDToDisplay = existingOrderID;

        } else {
            // Create new order
            const orderItems = [{ mealID: numericItemId, quantity: qty }];
            payload = {
                action: 'addOrder',
                type: 'Walk-in',
                tableNo: tableNumber,
                total: calculateTotalForItems(orderItems),
                customerID: null,
                staffID: loggedInUser.staffID,
                items: orderItems
            };
            successMessage = `New order created for Table #${tableNumber} with ${qty} ${item.name}`;
        }

        try {
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            const data = await response.json();

            if (data.success) {
                // new order created or existing order updated successfully
                if (!existingOrderID) {
                    orderIDToDisplay = data.orderID;
                }
                showToast(`${successMessage} (Order #${orderIDToDisplay})`);
                loadStaffOrdersManagement();
            } else {
                showToast(`Failed to process order: ${data.message}`, 'error');
            }
        } catch (error) {
            console.error('Error processing staff order:', error);
            showToast('An error occurred while processing the order.', 'error');
        }

        temporaryQuantities = {};
        loadMenuItems(target);
    }
}



function loadRecommendedItems() {
    if (window.location.pathname.includes('staff.html')) return;

    if (menuItems.length === 0) {
        console.log('Menu items not loaded yet');
        return;
    }

    const recommendedItems = document.querySelector('.recommended-items');

    const recommendedIds = [1, 2, 4, 6, 8, 9, 10];

    const availableRecommendedItems = recommendedIds
        .map(id => menuItems.find(m => m.id === id))
        .filter(item => item !== undefined);

    if (availableRecommendedItems.length < 6) {
        const remainingItems = menuItems.filter(item =>
            !recommendedIds.includes(item.id)
        );

        const shuffled = remainingItems.sort(() => 0.5 - Math.random());
        const needed = 6 - availableRecommendedItems.length;
        availableRecommendedItems.push(...shuffled.slice(0, needed));
    }

    const recommendedHTML = availableRecommendedItems.map(item => {
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

function calculateTotalForCart() {
    let subtotal = 0;
    Object.entries(cart).forEach(([itemId, quantity]) => {
        const item = menuItems.find(m => m.id == itemId);
        subtotal += item.price * quantity;
    });
    return subtotal * 1.1;
}

function calculateTotalForItems(itemsArray) {
    let subtotal = 0;
    itemsArray.forEach(itemEntry => {
        const item = menuItems.find(m => m.id == itemEntry.mealID);
        if (item) {
            subtotal += item.price * itemEntry.quantity;
        } else {
            console.warn(`Item with mealID ${itemEntry.mealID} not found in menuItems`);
        }
    });
    return subtotal * 1.1;
}

async function placeWalkinOrder() {
    if (Object.keys(cart).length === 0) {
        showToast('Your cart is empty!', 'error');
        return;
    }

    let customerID = null;

    if (loggedInUser && userRole === 'customer') {
        customerID = loggedInUser.customerID;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const tableNo = urlParams.get('table') || '5';
    if (!tableNo) {
        showToast('Table number is required for walk-in orders.', 'error');
        return;
    }

    let existingOrderID = null;

    // Check for an existing uncompleted order for this table and customer
    let checkOrderUrl = `api/orders.php?action=getUncompletedOrderByTable&tableNo=${tableNo}`;
    if (customerID !== null) {
        checkOrderUrl += `&customerID=${customerID}`;
    }

    try {
        const checkOrderResponse = await fetch(checkOrderUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        const checkOrderData = await checkOrderResponse.json();

        if (checkOrderData.success && checkOrderData.order) {
            existingOrderID = checkOrderData.order.orderID;
            console.log(`Found existing uncompleted order for Table #${tableNo}, CustomerID ${customerID}: OrderID ${existingOrderID}`);
        } else {
            console.log(`No uncompleted order found. Will create new order for Table #${tableNo}, CustomerID ${customerID}.`);
        }
    } catch (error) {
        console.error('Error checking for existing order:', error);
        showToast('An error occurred while checking for existing orders.', 'error');
        return;
    }

    let orderCreatedOrUpdated = false;
    let finalOrderID = existingOrderID;

    if (existingOrderID) {
        // Update existing order
        try {
            for (const itemId in cart) {
                const numericItemId = parseInt(itemId);
                const quantity = cart[itemId];

                const payload = {
                    action: 'updateOrderItems',
                    orderID: existingOrderID,
                    mealID: numericItemId,
                    quantity: quantity
                };

                const response = await fetch('api/orders.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                });
                const data = await response.json();

                if (!data.success) {
                    console.error(`Failed to add/update item ${numericItemId} in order ${existingOrderID}: ${data.message}`);
                } else {
                    orderCreatedOrUpdated = true;
                }
            }
            if (orderCreatedOrUpdated) {
                showToast(`Your cart items have been added to existing Order #${existingOrderID} (Table #${tableNo})!`);
            } else {
                showToast('No new items were added or updated in the existing order.', 'warning');
            }
        } catch (error) {
            console.error('Error updating existing order:', error);
            showToast('An error occurred while updating your order.', 'error');
            return;
        }

    } else {
        // Create new order
        const orderItems = Object.keys(cart).map(itemId => ({
            mealID: parseInt(itemId),
            quantity: cart[itemId]
        }));

        const total = calculateTotalForItems(orderItems);

        const payload = {
            action: 'addOrder',
            type: 'Walk-in',
            tableNo: tableNo,
            total: total,
            customerID: customerID,
            staffID: null,
            items: orderItems
        };

        try {
            const response = await fetch('api/orders.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            const data = await response.json();

            if (data.success) {
                finalOrderID = data.orderID;
                showToast(`New Walk-in Order #${finalOrderID} created for Table #${tableNo}!`);
                orderCreatedOrUpdated = true;
            } else {
                showToast(`Failed to place new order: ${data.message}`, 'error');
            }
        } catch (error) {
            console.error('Error placing new order:', error);
            showToast('An error occurred while placing your new order.', 'error');
        }
    }

    if (orderCreatedOrUpdated) {
        cart = {};
        updateCartBadge();
        renderCart();
        window.location.hash = '#order-history-page';
    }
}

function renderCart() {

    const cartContent = document.getElementById('cartContent');

    if (!cartContent) {
        updateCartBadge();
        return;
    }

    const cartItems = Object.entries(cart);

    if (cartItems.length === 0) {
        cartContent.innerHTML = `
            <div class="empty-state">
                <div class="icon">🛒</div>
                <h3>Your cart is empty</h3>
                <p>Add some delicious items from our menu</p>
            </div>
        `;
        updateCartBadge();
        return;
    }

    let subtotal = 0;
    const itemsHTML = cartItems.map(([itemId, quantity]) => {
        const item = menuItems.find(m => m.id == itemId);
        if (!item) return '';

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

    updateCartBadge();
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
    document.getElementById('checkoutPhone').value = loggedInUser.phoneNumber || '';
    document.getElementById('checkoutAddress').value = loggedInUser.address || '';
}


async function makeOnlinePayment() {
    if (Object.keys(cart).length === 0) {
        showToast('Your cart is empty', 'error');
        return;
    }

    const customerName = document.getElementById('checkoutName').value;
    const customerEmail = document.getElementById('checkoutEmail').value;
    const customerPhone = document.getElementById('checkoutPhone').value;
    const shippingAddress = document.getElementById('checkoutAddress').value;
    const paymentMethod = document.getElementById('paymentMethod').value;

    if (!customerName || !customerPhone || !shippingAddress || !customerEmail) {
        showToast('Please fill in all required contact and address details, including email.', 'error');
        return;
    }

    const orderItemsForAPI = Object.entries(cart).map(([mealID, quantity]) => ({
        mealID: parseInt(mealID),
        quantity: quantity
    }));

    const totalCalculated = calculateTotalForCart();

    const orderPayload = {
        action: 'addOrder',
        type: 'Online',
        tableNo: null,
        total: totalCalculated,
        customerID: loggedInUser.customerID,
        staffID: null,
        items: orderItemsForAPI,
    };

    try {
        const orderResponse = await fetch('api/orders.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderPayload),
        });
        const orderData = await orderResponse.json();

        if (orderData.success) {
            const newOrderID = orderData.orderID;

            const contactPayload = {
                action: 'addContact',
                orderID: newOrderID,
                name: customerName,
                phone: customerPhone,
                email: customerEmail,
                address: shippingAddress
            };

            const contactResponse = await fetch('api/contact.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(contactPayload),
            });
            const contactData = await contactResponse.json();

            if (contactData.success) {

                const paymentPayload = {
                    action: 'addPayment',
                    orderID: newOrderID,
                    paymentMethod: paymentMethod,
                    amount: totalCalculated,
                    paymentStatus: 'Completed'
                };

                try {
                    const paymentResponse = await fetch('api/payments.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(paymentPayload),
                    });
                    const paymentData = await paymentResponse.json();

                    if (paymentData.success) {
                        showToast('Payment recorded successfully!');
                    } else {
                        console.error('Failed to record payment:', paymentData.message);
                        showToast(`Order placed, but failed to record payment: ${paymentData.message}`, 'warning');
                    }
                } catch (paymentError) {
                    console.error('Error recording payment:', paymentError);
                    showToast('Order placed, but an error occurred while recording payment.', 'warning');
                }

                const orderDetailsForEmail = Object.entries(cart).map(([mealID, quantity]) => {
                    const item = menuItems.find(m => m.id == mealID);
                    return {
                        name: item.name,
                        quantity: quantity,
                        price: item.price
                    };
                });

                const emailPayload = {
                    recipientEmail: customerEmail,
                    orderID: newOrderID,
                    orderType: 'Online Order',
                    orderTotal: totalCalculated,
                    orderStatus: 'Pending',
                    orderItems: orderDetailsForEmail
                };

                console.log('Sending email with payload:', emailPayload);

                try {
                    const emailResponse = await fetch('api/send_email.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(emailPayload),
                    });

                    const responseText = await emailResponse.text();
                    console.log('Raw email response:', responseText);

                    let emailData;
                    try {
                        emailData = JSON.parse(responseText);
                    } catch (parseError) {
                        console.error('Failed to parse email response as JSON:', parseError);
                        console.error('Response was:', responseText);
                        throw new Error('Invalid JSON response from email service');
                    }

                    if (emailData.success) {
                        showToast('Order confirmation email sent successfully!');
                    } else {
                        console.error('Failed to send email:', emailData.message);
                        showToast(`Order placed, but failed to send confirmation email: ${emailData.message}`, 'warning');
                    }
                } catch (emailError) {
                    console.error('Error sending email:', emailError);
                    showToast('Order placed, but an error occurred while sending confirmation email.', 'warning');
                }


                cart = {};
                updateCartBadge();
                showToast('Online Order placed and contact info saved successfully! Check your orders for details.');

                loggedInUser.name = customerName;
                loggedInUser.phoneNumber = customerPhone;
                loggedInUser.address = shippingAddress;
                localStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));

                setTimeout(() => {
                    const ordersNavItem = document.querySelector('.nav-item:nth-child(3)');
                    showPage('orders-page', ordersNavItem);
                }, 1500);

            } else {
                showToast(`Online Order placed, but failed to save contact info: ${contactData.message}`, 'error');
                console.error('Failed to save contact info:', contactData.message);
                cart = {};
                updateCartBadge();
                setTimeout(() => {
                    const ordersNavItem = document.querySelector('.nav-item:nth-child(3)');
                    showPage('orders-page', ordersNavItem);
                }, 1500);
            }

        } else {
            showToast(`Failed to place online order: ${orderData.message}`, 'error');
        }
    } catch (error) {
        console.error('Error placing online order or saving contact info:', error);
        showToast('An error occurred while placing your online order.', 'error');
    }
}


// --- Orders Page (Customer & Staff) ---

async function loadOrdersContent() {
    const ordersList = document.getElementById('ordersList');
    if (!ordersList) return;

    if (!loggedInUser || !loggedInUser.customerID) {
        ordersList.innerHTML = `<div class="empty-state"><h3>Please log in to view your orders.</h3></div>`;
        return;
    }

    try {
        const response = await fetch(`api/orders.php?action=getOrders&customerID=${loggedInUser.customerID}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        const data = await response.json();

        if (data.success && data.orders) {
            orders = data.orders;
        } else {
            console.error('Failed to load customer orders:', data.message);
            orders = [];
        }
    } catch (error) {
        console.error('Error loading customer orders:', error);
        orders = [];
    }

    if (orders.length === 0) {
        ordersList.innerHTML = `
                            <div class="empty-state">
                                <div class="icon">📝</div>
                                <h3>No orders yet</h3>
                                <p>Your order history will appear here</p>
                            </div>
                        `;
        return;
    }

    const ordersHTML = orders.map(order => {
        const itemsList = order.items.map(item => {
            return `${item.name} (${item.quantity})`;
        }).join(', ');

        let orderSpecificDetails = '';
        if (order.type === 'Online') {
            orderSpecificDetails = `
                <div class="order-details-row">
                    <span><strong>Order Type:</strong> Online Order</span>
                    <span><strong>Contact Name:</strong> ${order.onlineOrderDetails?.customerName || 'N/A'}</span>
                </div>
                <div class="order-details-row">
                    <span><strong>Phone:</strong> ${order.onlineOrderDetails?.customerPhone || 'N/A'}</span>
                    <span><strong>Email:</strong> ${order.onlineOrderDetails?.customerEmail || 'N/A'}</span>
                </div>
                <div class="order-details-row">
                    <span><strong>Address:</strong> ${order.onlineOrderDetails?.shippingAddress || 'N/A'}</span>
                </div>
            `;
        } else { // Walk-in
            orderSpecificDetails = `
                <div class="order-details-row">
                    <span><strong>Order Type:</strong> Walk-in Order</span>
                    <span><strong>Table:</strong> ${order.tableNo || 'N/A'}</span>
                </div>
            `;
        }


        return `
            <div class="order-card">
                <div class="order-header">
                    <div class="order-id">Order #${order.orderID}</div>
                    <div class="order-status status-${order.status.toLowerCase().replace(' ', '')}">
                        ${order.status}
                    </div>
                </div>
                <div class="order-items">Items: ${itemsList}</div>
                ${orderSpecificDetails}
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                    <div class="order-total">Total: RM${parseFloat(order.total).toFixed(2)}</div>
                    <div style="font-size: 0.8rem; color: #666;">Time: ${new Date(order.orderTimestamp).toLocaleString()}</div>
                </div>
            </div>
        `;
    }).join('');

    ordersList.innerHTML = ordersHTML;
}



async function loadStaffOrdersManagement() {
    const ordersList = document.getElementById('staffOrdersList');
    if (!ordersList) return;

    if (!loggedInUser || !loggedInUser.staffID) {
        ordersList.innerHTML = `<div class="empty-state"><h3>Please log in as staff to manage orders.</h3></div>`;
        return;
    }

    try {
        const response = await fetch(`api/orders.php?action=getOrders`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        const data = await response.json();

        if (data.success && data.orders) {
            orders = data.orders;
        } else {
            console.error('Failed to load staff orders:', data.message);
            orders = [];
        }
    } catch (error) {
        console.error('Error loading staff orders:', error);
        orders = [];
    }

    if (orders.length === 0) {
        ordersList.innerHTML = `
                            <div class="empty-state">
                                <div class="icon">📝</div>
                                <h3>No active orders</h3>
                                <p>New orders will appear here</p>
                            </div>
                        `;
        return;
    }

    const ordersHTML = orders.map(order => {
        const itemsList = order.items.map(item => {
            return `${item.name} (${item.quantity})`;
        }).join(', ');

        let orderContext = '';
        let contactInfoDisplay = '';

        if (order.type === 'Online') {
            orderContext = `(Online Order)`;

            if (order.onlineOrderDetails?.customerName) {
                contactInfoDisplay = `
                    <div class="order-details-row">
                        <span><strong>Customer:</strong> ${order.onlineOrderDetails.customerName}</span>
                        <span><strong>Phone:</strong> ${order.onlineOrderDetails.customerPhone || 'N/A'}</span>
                    </div>
                    <div class="order-details-row">
                        <span><strong>Email:</strong> ${order.onlineOrderDetails.customerEmail || 'N/A'}</span>
                        <span><strong>Address:</strong> ${order.onlineOrderDetails.shippingAddress || 'N/A'}</span>
                    </div>
                `;
            } else if (order.customerName) {

                contactInfoDisplay = `<div class="order-details-row"><span><strong>Customer:</strong> ${order.customerName}</span></div>`;
            }

        } else {
            orderContext = `(Table: ${order.tableNo || 'N/A'})`;
            if (order.customerName) {
                contactInfoDisplay = `<div class="order-details-row"><span><strong>Customer:</strong> ${order.customerName}</span></div>`;
            }
        }
        if (order.staffName) {
            orderContext += ` | Staff: ${order.staffName}`;
        }


        return `
            <div class="order-card">
                <div class="order-header">
                    <div class="order-id">Order #${order.orderID} ${orderContext}</div>
                    <div class="order-status status-${order.status.toLowerCase().replace(' ', '')}" id="orderStatusDisplay_${order.orderID}">
                        ${order.status}
                    </div>
                </div>
                <div class="order-items">Items: ${itemsList}</div>
                ${contactInfoDisplay}
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                    <div class="order-total">Total: RM${parseFloat(order.total).toFixed(2)}</div>
                    <div style="font-size: 0.8rem; color: #666;">Time: ${new Date(order.orderTimestamp).toLocaleString()}</div>
                </div>
                <div class="order-actions" style="margin-top: 15px; display: flex; gap: 10px;">
                    <select id="statusSelect_${order.orderID}" class="form-input" style="flex: 1;" disabled>
                        <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="In Progress" ${order.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                        <option value="Ready" ${order.status === 'Ready' ? 'selected' : ''}>Ready</option>
                        <option value="Completed" ${order.status === 'Completed' ? 'selected' : ''}>Completed</option>
                    </select>
                    <button class="action-btn edit-btn" onclick="toggleEditMode(${order.orderID})">Edit</button>
                    <button class="action-btn save-btn" id="saveButton_${order.orderID}" style="display:none;" onclick="saveSingleOrderStatus(${order.orderID})">Save</button>
                    <button class="action-btn delete-btn" style="background-color: #dc3545;" onclick="deleteOrder(${order.orderID})">Delete</button>
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
        const order = orders.find(o => o.orderID === orderId);
        if (order) {
            selectElement.value = order.status;
        }
    }
}

async function saveSingleOrderStatus(orderId) {
    const order = orders.find(o => o.orderID === orderId);
    const selectElement = document.getElementById(`statusSelect_${orderId}`);

    if (order && selectElement) {
        const newStatus = selectElement.value;
        if (newStatus !== order.status) {
            const payload = {
                action: 'updateOrderStatus',
                orderID: orderId,
                status: newStatus
            };

            try {
                const response = await fetch('api/orders.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                });
                const data = await response.json();

                if (data.success) {
                    order.status = newStatus;
                    showToast(`Order #${orderId} status updated to ${newStatus}`);
                    const statusDisplayElement = document.getElementById(`orderStatusDisplay_${order.orderID}`);
                    if (statusDisplayElement) {
                        statusDisplayElement.textContent = newStatus;
                        statusDisplayElement.className = `order-status status-${newStatus.toLowerCase().replace(' ', '')}`;
                    }
                } else {
                    showToast(`Failed to update status: ${data.message}`, 'error');
                }
            } catch (error) {
                console.error('Error updating order status:', error);
                showToast('An error occurred while updating order status.', 'error');
            }
        } else {
            showToast('No change in status for this order.', 'info');
        }
        toggleEditMode(orderId);
    }
}

async function deleteOrder(orderId) {

    showToast(`Deleting order #${orderId}...`, 'info');

    const payload = {
        action: 'deleteOrder',
        orderID: orderId
    };

    try {
        const response = await fetch('api/orders.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        const data = await response.json();

        if (data.success) {
            orders = orders.filter(order => order.orderID !== orderId);
            showToast(`Order #${orderId} deleted successfully.`);
            loadStaffOrdersManagement();
        } else {
            showToast(`Failed to delete order: ${data.message}`, 'error');
        }
    } catch (error) {
        console.error('Error deleting order:', error);
        showToast('An error occurred while deleting the order.', 'error');
    }
}


// --- Profile Page (Customer & Staff) ---

function toggleProfileEditUI(enableEditing) {
    let nameInput, emailInput, passwordInput, phoneInput;


    if (userRole === 'customer') {
        nameInput = document.getElementById('profileName');
        emailInput = document.getElementById('profileEmail');
        passwordInput = document.getElementById('profilePassword');
        phoneInput = document.getElementById('profilePhone');
    } else if (userRole === 'staff') {
        nameInput = document.getElementById('staffProfileName');
        emailInput = document.getElementById('staffProfileEmail');
        passwordInput = document.getElementById('staffProfilePassword');
        phoneInput = null;
    } else {
        console.error('Unknown user role:', userRole);
        return;
    }

    const editProfileBtn = document.getElementById('editProfileBtn');

    if (nameInput) nameInput.readOnly = !enableEditing;
    if (emailInput) emailInput.readOnly = !enableEditing;
    if (passwordInput) passwordInput.readOnly = !enableEditing;
    if (phoneInput) phoneInput.readOnly = !enableEditing;

    // Update button text and style
    if (editProfileBtn) {
        if (enableEditing) {
            editProfileBtn.textContent = 'Save Profile';
            editProfileBtn.style.backgroundColor = '#28a745';
        } else {
            editProfileBtn.textContent = 'Edit Profile';
            editProfileBtn.style.backgroundColor = '';
        }
        editProfileBtn.onclick = toggleProfileEdit;
    }

    isEditing = enableEditing;
    if (!enableEditing && passwordInput) {
        passwordInput.value = '';
    }
}

function loadProfileData() {
    if (loggedInUser && userRole === 'customer') {
        document.getElementById('profileName').value = loggedInUser.name || '';
        document.getElementById('profileEmail').value = loggedInUser.email || '';
        document.getElementById('profilePhone').value = loggedInUser.phoneNumber || '';
        document.getElementById('profilePassword').value = '';
        toggleProfileEditUI(false);
    } else if (loggedInUser && userRole === 'staff') {
        document.getElementById('profileName').value = loggedInUser.name || '';
        document.getElementById('profileEmail').value = loggedInUser.email || '';
        document.getElementById('profilePassword').value = '';
        const profilePhoneInput = document.getElementById('profilePhone');
        if (profilePhoneInput) {
            profilePhoneInput.value = loggedInUser.phoneNumber || '';
        }
        toggleProfileEditUI(false);
    }
}

function toggleProfileEdit() {
    if (!isEditing) {
        toggleProfileEditUI(true);
    } else {
        saveProfile();
    }
}

async function saveProfile() {
    if (!loggedInUser) {
        showToast('You must be logged in to save profile.', 'error');
        return;
    }

    let currentProfileName, currentProfileEmail, currentProfilePassword, currentProfilePhone;

    if (userRole === 'customer') {
        currentProfileName = document.getElementById('profileName').value;
        currentProfileEmail = document.getElementById('profileEmail').value;
        currentProfilePassword = document.getElementById('profilePassword').value;
        currentProfilePhone = document.getElementById('profilePhone').value;
    } else if (userRole === 'staff') {
        currentProfileName = document.getElementById('staffProfileName').value;
        currentProfileEmail = document.getElementById('staffProfileEmail').value;
        currentProfilePassword = document.getElementById('staffProfilePassword').value;
        currentProfilePhone = '';
    } else {
        showToast('Invalid user role.', 'error');
        return;
    }

    const payload = {
        action: 'updateProfile',
        role: userRole,
        ...(userRole === 'customer' && { customerID: loggedInUser.customerID }),
        ...(userRole === 'staff' && { staffID: loggedInUser.staffID }),
    };

    let hasChanges = false;

    if (currentProfileName !== loggedInUser.name) {
        payload.name = currentProfileName;
        hasChanges = true;
    }

    if (currentProfileEmail !== loggedInUser.email) {
        if (!currentProfileEmail.includes('@') || !currentProfileEmail.includes('.')) {
            showToast('Please enter a valid email address.', 'error');
            return;
        }
        payload.email = currentProfileEmail;
        hasChanges = true;
    }

    if (currentProfilePassword) {
        payload.password = currentProfilePassword;
        hasChanges = true;
    }

    if (userRole === 'customer') {
        if (currentProfilePhone !== loggedInUser.phoneNumber) {
            if (currentProfilePhone && !/^\d+$/.test(currentProfilePhone)) {
                showToast('Phone number should contain only digits.', 'error');
                return;
            }
            payload.phoneNumber = currentProfilePhone;
            hasChanges = true;
        }
    }

    if (!hasChanges) {
        showToast('No changes detected. Profile not updated.', 'info');
        toggleProfileEditUI(false);
        return;
    }

    try {
        const response = await fetch('api/auth.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        const data = await response.json();

        if (data.success) {
            if (payload.name !== undefined) loggedInUser.name = payload.name;
            if (payload.email !== undefined) loggedInUser.email = payload.email;
            if (userRole === 'customer' && payload.phoneNumber !== undefined) {
                loggedInUser.phoneNumber = payload.phoneNumber;
            }

            localStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));

            showToast(data.message);
            toggleProfileEditUI(false);
        } else {
            showToast(`Failed to update profile: ${data.message}`, 'error');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showToast('An error occurred while updating profile. Please try again.', 'error');
    }
}

async function updateCustomerAddressFromCheckout() {
    if (!loggedInUser || userRole !== 'customer') {
        showToast('You must be logged in as a customer to update your address.', 'error');
        return;
    }

    const newAddress = document.getElementById('checkoutAddress').value.trim();

    if (!newAddress) {
        showToast('Address cannot be empty.', 'error');
        return;
    }

    const payload = {
        action: 'updateProfile',
        role: 'customer',
        customerID: loggedInUser.customerID,
        address: newAddress
    };

    try {
        const response = await fetch('api/auth.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        const data = await response.json();

        if (data.success) {
            loggedInUser.address = newAddress;
            localStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));
            showToast('Address updated successfully!');
        } else {
            showToast(`Failed to update address: ${data.message}`, 'error');
        }
    } catch (error) {
        console.error('Error updating address:', error);
        showToast('An error occurred while updating address.', 'error');
    }
}

function loadStaffProfileData() {

    if (loggedInUser && userRole === 'staff') {
        document.getElementById('staffProfileName').value = loggedInUser.name;
        document.getElementById('staffProfileEmail').value = loggedInUser.email;
    }
}

async function saveStaffProfile() {
    if (loggedInUser && userRole === 'staff') {
        const newName = document.getElementById('staffProfileName').value;

        const payload = {
            action: 'register',
            email: loggedInUser.email,
            name: newName,
            role: userRole
        };

        try {
            const response = await fetch('api/auth.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            const data = await response.json();

            if (data.success) {
                loggedInUser.name = newName;
                localStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));
                showToast('Staff profile saved successfully!');
            } else {
                showToast(`Failed to save staff profile: ${data.message}`, 'error');
            }
        } catch (error) {
            console.error('Error saving staff profile:', error);
            showToast('An error occurred while saving staff profile.', 'error');
        }
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
