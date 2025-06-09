let cart = JSON.parse(localStorage.getItem('cart')) || [];
let allBooks = [];
let cartBooks = [];
let cartEventInitialized = false;
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let currentPage = 1;
const booksPerPage = 8;
let authDropdownVisible = false;
let ordersDropdownVisible = false;

function toggleAuthDropdown() {
    const dropdown = document.getElementById('auth-dropdown');
    authDropdownVisible = !authDropdownVisible;
    dropdown.style.display = authDropdownVisible ? 'block' : 'none';
}
async function toggleOrdersDropdown() {
    const dropdown = document.getElementById('orders-dropdown');
    if (!dropdown) return;
    
    ordersDropdownVisible = !ordersDropdownVisible;
    dropdown.style.display = ordersDropdownVisible ? 'block' : 'none';
    
    if (ordersDropdownVisible) {
        try {
            const orders = await (currentUser.role === 'admin' || currentUser.role === 'employee' 
                ? loadAllOrders() 
                : loadUserOrders());
            renderOrders(orders);
        } catch (error) {
            console.error('Ошибка загрузки заказов:', error);
            const ordersList = document.getElementById('orders-list');
            if (ordersList) {
                ordersList.innerHTML = `<p class="error">Ошибка загрузки заказов: ${error.message}</p>`;
            }
        }
    }
}

function renderOrders(orders) {
    const ordersContainer = document.getElementById('orders-list');
    if (!ordersContainer) return;
    
    if (orders.length === 0) {
        ordersContainer.innerHTML = '<p>Нет заказов</p>';
        return;
    }
    
    let html = '';
    orders.forEach(order => {
        html += `
            <div class="order-item">
                <div class="order-header" onclick="toggleOrderDetails(${order.id})">
                    <span class="order-id">Заказ #${order.id}</span>
                    <span class="order-date">${new Date(order.order_date).toLocaleString()}</span>
                    <span class="order-status ${order.status}">${translateOrderStatus(order.status)}</span>
                    <span class="order-total">${order.total_amount.toFixed(2)} руб.</span>
                </div>
                <div class="order-details" id="order-details-${order.id}" style="display:none;">
                    <h5>Товары:</h5>
                    <ul class="order-items">
                        ${order.items.map(item => `
                            <li>
                                ${item.title} (${item.author_name}) - 
                                ${item.quantity} × ${item.price_at_purchase.toFixed(2)} руб.
                            </li>
                        `).join('')}
                    </ul>
                    ${currentUser.role === 'admin' || currentUser.role === 'employee' 
                        ? `<div class="order-actions">
                            <select id="status-select-${order.id}">
                                <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>В обработке</option>
                                <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Отправлен</option>
                                <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Доставлен</option>
                                <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Отменен</option>
                            </select>
                            <button onclick="updateOrderStatus(${order.id})">Обновить</button>
                        </div>`
                        : ''}
                </div>
            </div>
        `;
    });
    
    ordersContainer.innerHTML = html;
}