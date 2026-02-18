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
    // const navBar = document.querySelector('nav'); // NavBar removida por el usuario
    const reservasSection = document.querySelector('#reservas');

    if (reservasSection) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    if (fabButton) fabButton.classList.add('fab-hidden');
                    // if (navBar) navBar.style.transform = 'translateY(100%)'; 
                } else {
                    if (fabButton) fabButton.classList.remove('fab-hidden');
                    // if (navBar) navBar.style.transform = 'translateY(0)';
                }
            });
        }, { threshold: 0.1 });
        observer.observe(reservasSection);
    }

    // 3. ORDERING APP LOGIC
    // 3. ORDERING APP LOGIC
    const parts = window.location.pathname.split('/');
    // Como pediste, asumimos que la estructura es dominio.com/mesa/ID
    // parts[0] es vacío, parts[1] es 'mesa', parts[2] es el ID
    const tableId = (parts.length > 2 && parts[1] === 'mesa') ? parts[2] : null;

    if (tableId) {
        console.log(`Modo Pedido Activado: Mesa ${tableId}`);
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
    socket = io('https://fleiva-aplicacion.onrender.com');

    socket.emit('join_table', tableId);

    // Mostrar ID de mesa en el modal
    const tableDisplay = document.getElementById('table-display');
    if (tableDisplay) tableDisplay.textContent = `(Mesa ${tableId})`;

    // Inyectar botones "Agregar"
    const articles = document.querySelectorAll('.tarjeta-bebida');
    articles.forEach(article => {
        const title = article.querySelector('h3')?.innerText;
        const priceText = article.querySelector('.precio')?.innerText;

        // Priorizar data-name si existe (para diferenciar Botella/Lata/Trago)
        let fullName = article.getAttribute('data-name');

        if (!fullName) {
            // Fallback: Combinamos categoría y nombre
            const section = article.closest('section');
            const category = section ? section.querySelector('h2')?.innerText : '';
            fullName = category ? `${category} - ${title}` : title;
        }

        // Solo agregar botón si hay precio válido
        if (fullName && priceText && priceText.trim() !== '$') {
            // Limpiar botones previos si existen (evita duplicados si se llama init varias veces)
            const existingBtn = article.querySelector('.add-to-cart-btn');
            if (existingBtn) existingBtn.remove();

            const btn = document.createElement('button');
            btn.className = 'add-to-cart-btn';
            btn.innerText = 'Agregar';

            // Usamos una función anónima para capturar los valores actuales
            btn.onclick = function () {
                addToCart(fullName, priceText);

                // Feedback visual botón
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
        viewCartBtn.style.display = 'flex'; // Mostrar botón
        viewCartBtn.onclick = () => {
            cartOverlay.style.display = 'flex';
            renderCart();
        };
    }

    if (closeCartBtn) {
        closeCartBtn.onclick = () => {
            cartOverlay.style.display = 'none';
        }
    }

    // Cerrar al hacer click fuera del modal
    if (cartOverlay) {
        cartOverlay.onclick = (e) => {
            if (e.target === cartOverlay) cartOverlay.style.display = 'none';
        }
    }

    if (submitBtn) {
        submitBtn.onclick = submitOrder;
    }

    // Socket Listeners
    socket.on('order_confirmed', (data) => {
        alert(data.message);
        cart = []; // Limpiar carrito local
        updateCartCount();
        cartOverlay.style.display = 'none';
    });
}

function addToCart(name, priceStr) {
    // Parsear precio: "$5.000" -> 5000
    const price = parseInt(priceStr.replace(/\D/g, ''));

    const existingItem = cart.find(item => item.name === name);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ name, price, quantity: 1 });
    }

    // Animación visual de feedback
    updateCartCount();

    // Opcional: Mostrar una pequeña notificación toast
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
        // Animación de rebote
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
            row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; background: rgba(255,255,255,0.05); padding: 0.8rem; border-radius: 10px;';

            row.innerHTML = `
                <div style="flex: 1;">
                    <h4 style="margin: 0; color: white;">${item.name}</h4>
                    <span style="font-size: 0.9rem; color: #ccc;">$${item.price.toLocaleString()} x ${item.quantity}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <button onclick="changeQty(${index}, -1)" style="background: #6c0097; color: white; border: none; width: 25px; height: 25px; border-radius: 50%; cursor: pointer;">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="changeQty(${index}, 1)" style="background: #6c0097; color: white; border: none; width: 25px; height: 25px; border-radius: 50%; cursor: pointer;">+</button>
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
    if (cart.length === 0) return alert('El carrito está vacío');

    if (confirm('¿Confirmar pedido?')) {
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        socket.emit('place_order', {
            tableId: currentTableId,
            items: cart,
            total: total
        });
    }
}

// Exponer funciones al scope global para los onclick inline
window.addToCart = addToCart;
window.changeQty = changeQty;
window.removeFromCart = removeFromCart;
window.submitOrder = submitOrder;
