const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

// Importar productos base para inicializar inventario
const productsBase = require('./public/products.js');

// Servir archivos estáticos desde la carpeta public
app.use(express.json());

// 👉 esto SIEMPRE funciona en producción
app.use(express.static(path.resolve(__dirname, 'public')));

// FRONT
app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public/index.html'));
});

app.get('/mesa/:id', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public/index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public/admin.html'));
});

// --- PERSISTENCIA DE DATOS CON MONGODB ---
const MONGODB_URI = process.env.MONGODB_URI;

// Definir Esquema para el Store
const storeSchema = new mongoose.Schema({
    activeOrders: { type: Object, default: {} },
    dailyTotal: { type: Number, default: 0 },
    dailyExpenses: { type: Number, default: 0 },
    history: { type: Array, default: [] },
    expenses: { type: Array, default: [] },
    inventory: { type: Object, default: {} }
}, { minimize: false, timestamps: true });

const StoreModel = mongoose.model('Store', storeSchema);

// Estructura inicial en memoria
let store = {
    activeOrders: {},
    dailyTotal: 0,
    dailyExpenses: 0,
    history: [],
    expenses: [],
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
async function loadData() {
    if (!MONGODB_URI) {
        console.warn('⚠️ No se detectó MONGODB_URI. Los datos NO se guardarán permanentemente.');
        return;
    }

    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado a MongoDB Atlas');

        let dbStore = await StoreModel.findOne();

        if (dbStore) {
            // Unir datos de DB con la estructura inicial por si hay campos nuevos
            store = { ...store, ...dbStore.toObject() };
            console.log('✅ Datos cargados desde MongoDB');
        } else {
            console.log('🆕 No se encontró registro inicial en MongoDB, creando uno...');
            const initialStore = new StoreModel(store);
            await initialStore.save();
        }

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

        if (inventoryUpdated) await saveData();

    } catch (err) {
        console.error('❌ Error conectando o cargando desde MongoDB:', err);
    }
}

// Guardar datos
async function saveData() {
    if (!MONGODB_URI) return;
    try {
        // Actualizamos el único documento en la colección Store
        await StoreModel.findOneAndUpdate({}, store, { upsert: true });
        // console.log('💾 Datos guardados en MongoDB.');
    } catch (err) {
        console.error('❌ Error guardando en MongoDB:', err);
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

    // CONFIGURACIÓN: Contraseña del Admin
    const ADMIN_PASSWORD = "fleiva2026"; // <--- CAMBIA ESTO SI QUIERES

    // ADMIN SE UNE
    socket.on('join_admin', () => {
        socket.join('admin_room');
        console.log('Administrador conectado');
        // Enviar estado actual
        socket.emit('initial_data', {
            activeOrders: store.activeOrders,
            dailyTotal: store.dailyTotal,
            dailyExpenses: store.dailyExpenses || 0,
            expenses: store.expenses || []
        });
    });

    // VERIFICAR CONTRASEÑA
    socket.on('verify_password', (password) => {
        if (password === ADMIN_PASSWORD) {
            socket.emit('password_correct');
        } else {
            socket.emit('password_incorrect');
        }
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
        const { tableId, items, total, notes } = data;

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
            notes: notes || '',
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
            notes: notes || '',
            timestamp: newOrder.timestamp
        });

        // Confirmar al cliente que el pedido fue recibido
        socket.emit('order_confirmed', { tableId });

        // También enviamos actualización de inventario al admin si está conectado
        io.to('admin_room').emit('inventory_data', store.inventory);
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
        const finalExpenses = store.dailyExpenses || 0;
        const netTotal = finalTotal - finalExpenses;
        const date = new Date().toLocaleDateString();
        const expensesList = store.expenses || [];

        // Resetear contadores diarios (el historial de mesas y gastos se MANTIENE)
        store.dailyTotal = 0;
        store.dailyExpenses = 0;
        store.expenses = [];
        saveData();

        // Notificar al admin con el monto final para el mensaje de WhatsApp
        io.to('admin_room').emit('day_closed', {
            closedTotal: finalTotal,
            closedExpenses: finalExpenses,
            netTotal: netTotal,
            expensesList: expensesList,
            date: date
        });

        console.log(`Día cerrado. Ventas: $${finalTotal} | Gastos: $${finalExpenses} | Neto: $${netTotal}`);
    });

    // AGREGAR GASTO
    socket.on('add_expense', (data) => {
        const { description, amount } = data;
        if (!description || !amount || amount <= 0) return;

        const expense = {
            id: Date.now().toString(),
            description: description.trim(),
            amount: parseFloat(amount),
            timestamp: new Date()
        };

        if (!store.expenses) store.expenses = [];
        if (!store.dailyExpenses) store.dailyExpenses = 0;

        store.expenses.push(expense);
        store.dailyExpenses += expense.amount;
        saveData();

        io.to('admin_room').emit('expense_added', {
            expense,
            dailyExpenses: store.dailyExpenses
        });

        console.log(`Gasto registrado: ${description} - $${amount}`);
    });

    // ELIMINAR GASTO
    socket.on('delete_expense', (expenseId) => {
        if (!store.expenses) return;
        const idx = store.expenses.findIndex(e => e.id === expenseId);
        if (idx !== -1) {
            const removed = store.expenses.splice(idx, 1)[0];
            store.dailyExpenses = Math.max(0, (store.dailyExpenses || 0) - removed.amount);
            saveData();
            io.to('admin_room').emit('expense_deleted', {
                expenseId,
                dailyExpenses: store.dailyExpenses
            });
            console.log(`Gasto eliminado: ${removed.description}`);
        }
    });

    // OBTENER GASTOS
    socket.on('get_expenses', () => {
        socket.emit('expenses_data', {
            expenses: store.expenses || [],
            dailyExpenses: store.dailyExpenses || 0
        });
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

    // MODIFICAR UN PEDIDO (Admin) - restaura inventario de items viejos y descuenta los nuevos
    socket.on('update_order', (data) => {
        const { tableId, orderIndex, items, total, notes } = data;
        const orders = store.activeOrders[tableId];
        if (!orders || orderIndex < 0 || orderIndex >= orders.length) return;

        const oldOrder = orders[orderIndex];
        // Restaurar inventario de los items que se quitan
        (oldOrder.items || []).forEach(item => {
            const stockKey = Object.keys(store.inventory).find(key => item.name.includes(key));
            if (stockKey) {
                store.inventory[stockKey] = (store.inventory[stockKey] || 0) + item.quantity;
            }
        });
        // Descontar inventario de los items nuevos
        (items || []).forEach(item => {
            const stockKey = Object.keys(store.inventory).find(key => item.name.includes(key));
            if (stockKey) {
                store.inventory[stockKey] = Math.max(0, (store.inventory[stockKey] || 0) - item.quantity);
            }
        });

        orders[orderIndex] = {
            items: items || [],
            total: total || 0,
            notes: notes || '',
            timestamp: oldOrder.timestamp || new Date()
        };
        const grandTotal = orders.reduce((sum, o) => sum + (o.total || 0), 0);
        saveData();

        io.to('admin_room').emit('table_orders_updated', {
            tableId,
            orders: store.activeOrders[tableId],
            grandTotal
        });
        io.to('admin_room').emit('inventory_data', store.inventory);
        console.log(`Pedido modificado: Mesa ${tableId}, pedido #${orderIndex + 1}`);
    });

    // ELIMINAR UN PEDIDO DE UNA MESA (Admin) - restaura inventario
    socket.on('remove_order', (data) => {
        const { tableId, orderIndex } = data;
        const orders = store.activeOrders[tableId];
        if (!orders || orderIndex < 0 || orderIndex >= orders.length) return;

        const removed = orders[orderIndex];
        (removed.items || []).forEach(item => {
            const stockKey = Object.keys(store.inventory).find(key => item.name.includes(key));
            if (stockKey) {
                store.inventory[stockKey] = (store.inventory[stockKey] || 0) + item.quantity;
            }
        });
        orders.splice(orderIndex, 1);
        if (orders.length === 0) {
            delete store.activeOrders[tableId];
        }
        const grandTotal = orders.length ? orders.reduce((sum, o) => sum + (o.total || 0), 0) : 0;
        saveData();

        io.to('admin_room').emit('table_orders_updated', {
            tableId,
            orders: orders.length ? store.activeOrders[tableId] : [],
            grandTotal
        });
        io.to('admin_room').emit('inventory_data', store.inventory);
        console.log(`Pedido eliminado: Mesa ${tableId}, pedido #${orderIndex + 1}`);
    });

    socket.on('disconnect', () => {
        // console.log('Usuario desconectado');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
