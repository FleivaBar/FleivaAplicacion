document.addEventListener('DOMContentLoaded', () => {
    // 1. Particle Logic
    let particleContainer = document.getElementById('particle-container');
    if (!particleContainer) {
        particleContainer = document.createElement('div');
        particleContainer.id = 'particle-container';
        document.body.appendChild(particleContainer);
    }
    const particleCount = 50;
    for (let i = 0; i < particleCount; i++) {
        createParticle(particleContainer);
    }

    // 2. Scroll/Nav Hide Logic (REMOVED - Nav deleted)
    const fabButton = document.querySelector('.fab-whatsapp-float');
    const reservasSection = document.querySelector('#reservas');

    if (reservasSection) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    if (fabButton) fabButton.classList.add('fab-hidden');
                } else {
                    if (fabButton) fabButton.classList.remove('fab-hidden');
                }
            });
        }, { threshold: 0.1 });
        observer.observe(reservasSection);
    }

    // 3. ORDERING APP LOGIC
    const parts = window.location.pathname.split('/');
    const urlParams = new URLSearchParams(window.location.search);

    let tableId = null;
    if (parts.length > 2 && parts[1] === 'mesa') {
        tableId = decodeURIComponent(parts[2]);
    } else if (urlParams.has('table')) {
        tableId = urlParams.get('table');
    }

    if (tableId) {
        initOrderingSystem(tableId);
    }
});

function createParticle(container) {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const size = Math.random() * 4 + 2;
    const duration = Math.random() * 20 + 10;
    const delay = Math.random() * 5;

    particle.style.left = `${x}vw`;
    particle.style.top = `${y}vh`;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.animationDuration = `${duration}s`;
    particle.style.animationDelay = `-${delay}s`;

    container.appendChild(particle);
}

// --- ORDERING SYSTEM ---
let cart = [];
let socket;
let currentTableId;

function initOrderingSystem(tableId) {
    currentTableId = tableId;
    socket = io();

    socket.emit('join_table', tableId);

    const tableDisplay = document.getElementById('table-display');
    if (tableDisplay) tableDisplay.textContent = `(Mesa ${tableId})`;

    // Inyectar botones "Agregar"
    const articles = document.querySelectorAll('.tarjeta-bebida');
    articles.forEach(article => {
        const title = article.querySelector('h3')?.innerText;
        const priceText = article.querySelector('.precio')?.innerText;

        let fullName = article.getAttribute('data-name');

        if (!fullName) {
            const section = article.closest('section');
            const category = section ? section.querySelector('h2')?.innerText : '';
            fullName = category ? `${category} - ${title}` : title;
        }

        if (fullName && priceText && priceText.trim() !== '$') {
            const existingBtn = article.querySelector('.add-to-cart-btn');
            if (existingBtn) existingBtn.remove();

            const btn = document.createElement('button');
            btn.className = 'add-to-cart-btn';
            btn.innerText = 'Agregar';

            btn.onclick = function () {
                addToCart(fullName, priceText);
                const originalText = this.innerText;
                this.innerText = '✔';
                this.style.background = '#28a745';
                setTimeout(() => {
                    this.innerText = originalText;
                    this.style.background = '';
                }, 800);
            };

            article.appendChild(btn);
        }
    });

    // Configurar Botón Flotante y Modal
    const viewCartBtn = document.getElementById('view-cart-btn');
    const cartOverlay = document.getElementById('cart-overlay');
    const closeCartBtn = document.getElementById('close-cart');
    const submitBtn = document.getElementById('submit-order');

    if (viewCartBtn) {
        viewCartBtn.style.display = 'flex';
        viewCartBtn.onclick = () => {
            cartOverlay.style.display = 'flex';
            renderCart();
        };
    }

    if (closeCartBtn) {
        closeCartBtn.onclick = () => {
            cartOverlay.style.display = 'none';
        };
    }

    if (cartOverlay) {
        cartOverlay.onclick = (e) => {
            if (e.target === cartOverlay) cartOverlay.style.display = 'none';
        };
    }

    if (submitBtn) {
        submitBtn.onclick = submitOrder;
    }

    // Cuando el servidor confirma el pedido → mostrar pantalla de éxito
    socket.on('order_confirmed', (data) => {
        showConfirmView();
        cart = [];
        updateCartCount();
    });
}

function addToCart(name, priceStr) {
    const price = parseInt(priceStr.replace(/\D/g, ''));

    const existingItem = cart.find(item => item.name === name);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ name, price, quantity: 1 });
    }

    updateCartCount();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    renderCart();
    updateCartCount();
}

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const badge = document.getElementById('cart-count');
    if (badge) {
        badge.innerText = count;
        badge.style.transform = 'scale(1.5)';
        setTimeout(() => badge.style.transform = 'scale(1)', 200);
    }
}

function renderCart() {
    const container = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');

    if (!container) return;

    container.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        container.innerHTML = '<p class="empty-msg" style="text-align: center; color: #aaa; margin-top: 2rem;">Tu carrito está vacío</p>';
    } else {
        cart.forEach((item, index) => {
            total += item.price * item.quantity;

            const row = document.createElement('div');
            row.className = 'cart-item-row';

            row.innerHTML = `
                <div class="item-info">
                    <h4>${item.name}</h4>
                    <span>$${item.price.toLocaleString()} x ${item.quantity}</span>
                </div>
                <div class="item-controls">
                    <button class="qty-btn" onclick="changeQty(${index}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="qty-btn" onclick="changeQty(${index}, 1)">+</button>
                </div>
            `;
            container.appendChild(row);
        });
    }

    if (totalEl) totalEl.innerText = `$${total.toLocaleString()}`;
}

function changeQty(index, delta) {
    if (cart[index]) {
        cart[index].quantity += delta;
        if (cart[index].quantity <= 0) {
            cart.splice(index, 1);
        }
        renderCart();
        updateCartCount();
    }
}

function submitOrder() {
    if (cart.length === 0) {
        showClientToast('El carrito está vacío 🛒', 'warning');
        return;
    }

    if (!socket) {
        showClientToast('Sin conexión con el servidor. Recarga la página.', 'error');
        return;
    }

    if (!currentTableId) {
        showClientToast('No se detectó la mesa. Escanea el QR nuevamente.', 'error');
        return;
    }

    // Mostrar modal de confirmación en vez de confirm()
    showOrderConfirmModal();
}

// --- MODAL DE CONFIRMACIÓN DE PEDIDO (en vez de confirm()) ---
function showOrderConfirmModal() {
    // Crear overlay de confirmación si no existe
    let overlay = document.getElementById('order-confirm-modal');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'order-confirm-modal';
        overlay.className = 'order-confirm-overlay';
        overlay.innerHTML = `
            <div class="order-confirm-box">
                <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📋</div>
                <h3 style="margin: 0 0 0.5rem; color: var(--precio-color);">¿Confirmar pedido?</h3>
                <p style="color: #ccc; font-size: 0.9rem; margin-bottom: 1.5rem;">Se enviará a cocina y no podrás editarlo.</p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button id="confirm-yes-btn" class="submit-btn" style="flex:1; padding: 0.75rem;">Sí, enviar 🚀</button>
                    <button id="confirm-no-btn" class="submit-btn" style="flex:1; padding: 0.75rem; background: #444;">Cancelar</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('confirm-yes-btn').onclick = () => {
            overlay.style.display = 'none';
            doPlaceOrder();
        };
        document.getElementById('confirm-no-btn').onclick = () => {
            overlay.style.display = 'none';
        };
        overlay.onclick = (e) => {
            if (e.target === overlay) overlay.style.display = 'none';
        };
    }

    overlay.style.display = 'flex';
}

function doPlaceOrder() {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const notes = document.getElementById('order-notes')?.value.trim() || '';

    socket.emit('place_order', {
        tableId: currentTableId,
        items: cart,
        total: total,
        notes: notes
    });
}

// --- PANTALLA DE CONFIRMACIÓN POST-PEDIDO ---
function showConfirmView() {
    const cartView = document.getElementById('cart-view');
    const confirmView = document.getElementById('confirm-view');
    const summary = document.getElementById('confirm-items-summary');

    // Generar resumen de items pedidos
    if (summary && cart.length > 0) {
        summary.innerHTML = cart.map(item =>
            `<div class="confirm-item-tag">${item.quantity}x ${item.name} — $${(item.price * item.quantity).toLocaleString()}</div>`
        ).join('');
    }

    if (cartView) cartView.style.display = 'none';
    if (confirmView) confirmView.style.display = 'flex';

    // Limpiar notas
    const notesEl = document.getElementById('order-notes');
    if (notesEl) notesEl.value = '';
}

function closeConfirmView() {
    const cartView = document.getElementById('cart-view');
    const confirmView = document.getElementById('confirm-view');
    const overlay = document.getElementById('cart-overlay');

    if (cartView) cartView.style.display = 'block';
    if (confirmView) confirmView.style.display = 'none';
    if (overlay) overlay.style.display = 'none';

    renderCart();
}

// --- TOAST CLIENTE (en vez de alert) ---
function showClientToast(message, type = 'info') {
    const existing = document.getElementById('client-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'client-toast';
    toast.className = 'client-toast';

    const colors = {
        warning: '#ff9900',
        error: '#ff4444',
        info: 'var(--precio-color)'
    };

    toast.style.cssText = `
        position: fixed;
        top: 1.5rem;
        left: 50%;
        transform: translateX(-50%);
        background: #1a0025;
        border: 2px solid ${colors[type] || colors.info};
        border-radius: 12px;
        padding: 0.9rem 1.5rem;
        color: white;
        font-size: 0.95rem;
        z-index: 9999;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        animation: toastClientIn 0.3s ease;
        max-width: 85vw;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
}

// Exponer funciones al scope global para los onclick inline
window.addToCart = addToCart;
window.changeQty = changeQty;
window.removeFromCart = removeFromCart;
window.submitOrder = submitOrder;
window.closeConfirmView = closeConfirmView;
