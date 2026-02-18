const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const fs = require('fs');
const path = require('path');

// Importar productos base para inicializar inventario
const productsBase = require('./public/products.js');

// Servir archivos estáticos desde la carpeta public
app.use(express.static('public'));
app.use(express.json());

// Página principal (menú)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Mesas
app.get('/mesa/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Panel admin
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// --- PERSISTENCIA DE DATOS ---
const DATA_FILE = path.join(__dirname, 'data', 'store.json');

// Estructura inicial por si el archivo no existe o falla
let store = {
    activeOrders: {},
    dailyTotal: 0,
    history: [],
    inventory: {}
};

// Helper para aplanar productos y obtener solo nombres
function getProductList() {
    let list = [];
    productsBase.forEach(cat => {
        cat.items.forEach(item => list.push(item.name));
    });
    return list;
}

// Cargar datos al inicio
function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const fileData = fs.readFileSync(DATA_FILE, 'utf8');
            store = JSON.parse(fileData);
            console.log('Datos cargados correctamente.');

            // Asegurar que el inventario tenga todos los productos definidos
            const allProductNames = getProductList();
            let inventoryUpdated = false;

            if (!store.inventory) store.inventory = {};

            allProductNames.forEach(name => {
                if (store.inventory[name] === undefined) {
                    store.inventory[name] = 50; // Stock inicial por defecto
                    inventoryUpdated = true;
                }
            });

            if (inventoryUpdated) saveData();

        } else {
            console.log('Creando nuevo archivo de datos...');
            store.inventory = {};
            const allProductNames = getProductList();
            allProductNames.forEach(name => {
                store.inventory[name] = 50; // Stock inicial
            });
            saveData();
        }
    } catch (err) {
        console.error('Error cargando datos:', err);
    }
}

// Guardar datos
function saveData() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
    } catch (err) {
        console.error('Error guardando datos:', err);
    }
}

loadData();

io.on('connection', (socket) => {
    console.log('Un usuario se ha conectado');

    // MESA SE UNE
    socket.on('join_table', (tableId) => {
        socket.join(`table_${tableId}`);
        console.log(`Usuario unido a la mesa ${tableId}`);
    });

    // ADMIN SE UNE
    socket.on('join_admin', () => {
        socket.join('admin_room');
        console.log('Administrador conectado');
        // Enviar estado actual
        socket.emit('initial_data', {
            activeOrders: store.activeOrders,
            dailyTotal: store.dailyTotal
        });
    });

    // SOLICITUD DE HISTORIAL (Admin)
    socket.on('get_history', () => {
        // Enviamos el historial, ordenado del más reciente al más antiguo
        const sortedHistory = [...store.history].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        socket.emit('history_data', sortedHistory);
    });

    // GESTIÓN DE INVENTARIO (Admin)
    socket.on('get_inventory', () => {
        socket.emit('inventory_data', store.inventory);
    });

    socket.on('update_stock', (data) => {
        const { productName, newStock } = data;
        if (store.inventory[productName] !== undefined) {
            store.inventory[productName] = parseInt(newStock);
            saveData();
            // Reenviar a todos los admins (si hubiera varios)
            io.to('admin_room').emit('inventory_data', store.inventory);
        }
    });

    // NUEVO PEDIDO
    socket.on('place_order', (data) => {
        const { tableId, items, total } = data;

        // --- LOGICA DE INVENTARIO ---
        // Descontar stock
        items.forEach(item => {
            // Buscamos si el nombre del item contiene alguna key del inventario
            // Ejemplo: "Cervezas - Pilsen" contiene "Pilsen"
            const stockKey = Object.keys(store.inventory).find(key => item.name.includes(key));

            if (stockKey) {
                store.inventory[stockKey] -= item.quantity;
            } else {
                console.log(`Item no encontrado en inventario para descuento: ${item.name}`);
            }
        });

        // Inicializar array de la mesa si no existe
        if (!store.activeOrders[tableId]) {
            store.activeOrders[tableId] = [];
        }

        const newOrder = {
            items,
            total,
            timestamp: new Date()
        };

        store.activeOrders[tableId].push(newOrder);
        saveData(); // Persistir cambio

        console.log(`Pedido recibido en Mesa ${tableId}`);

        // Notificar al admin
        io.to('admin_room').emit('new_order', {
            tableId,
            items,
            total,
            timestamp: newOrder.timestamp
        });

        // También enviamos actualización de inventario al admin si está conectado
        io.to('admin_room').emit('inventory_data', store.inventory);

        // Confirmar al cliente
        socket.emit('order_confirmed', { success: true, message: '¡Pedido recibido en cocina!' });
    });

    // LIBERAR MESA (Cobrar)
    socket.on('clear_table', (tableId) => {
        if (store.activeOrders[tableId]) {
            // Calcular total de la mesa
            let tableOrders = store.activeOrders[tableId];
            let tableTotal = tableOrders.reduce((sum, order) => sum + (order.total || 0), 0);

            // Actualizar total del día
            store.dailyTotal += tableTotal;

            // Agregar al historial
            const historyEntry = {
                id: Date.now().toString(), // ID único simple
                tableId,
                total: tableTotal,
                itemsCount: tableOrders.length, // Cantidad de pedidos hechos
                timestamp: new Date(),
                detailedOrders: tableOrders // Guardamos qué pidieron exactamente
            };
            store.history.push(historyEntry);

            // Borrar de activos
            delete store.activeOrders[tableId];
            saveData();

            // Notificar admin
            io.to('admin_room').emit('table_cleared', {
                tableId,
                newDailyTotal: store.dailyTotal
            });

            console.log(`Mesa ${tableId} cobrada: $${tableTotal}`);
        }
    });

    // CERRAR DÍA (Resetear ganancias)
    socket.on('close_day', () => {
        const finalTotal = store.dailyTotal;
        const date = new Date().toLocaleDateString();

        // Podríamos guardar un registro de 'cierres' si quisiéramos, 
        // por ahora solo reseteamos el contador diario.
        // El historial de mesas se MANTIENE para consulta.

        store.dailyTotal = 0;
        saveData();

        // Notificar al admin con el monto final para el mensaje de WhatsApp
        // Y actualizar la vista a 0
        io.to('admin_room').emit('day_closed', {
            closedTotal: finalTotal,
            date: date
        });

        console.log(`Día cerrado. Total recaudado: $${finalTotal}`);
    });

    // CREAR MESA MANUALMENTE (Desde Admin)
    socket.on('create_table', (tableId) => {
        if (!store.activeOrders[tableId]) {
            store.activeOrders[tableId] = [];
            saveData();
            // Notificar a los admins para que rendericen la mesa vacía
            io.to('admin_room').emit('table_created', tableId);
            console.log(`Mesa manual creada: ${tableId}`);
        }
    });

    socket.on('disconnect', () => {
        // console.log('Usuario desconectado');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
