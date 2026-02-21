# 🍹 Fleiva Bar - Menú Digital

Sitio web y menú digital interactivo diseñado para **Fleiva Bar**. Este proyecto está enfocado en ofrecer una experiencia de usuario fluida y moderna ("Mobile First"), ideal para que los clientes accedan desde sus celulares escaneando un código QR en el establecimiento.

## ✨ Características Principales

*   **Diseño Mobile-First**: Navegación optimizada para celulares con barra inferior estilo App y botones táctiles.
*   **Scroll Horizontal Intuitivo**: Categorías de menú (Cervezas, Cócteles, etc.) con navegación por pestañas deslizables.
*   **Experiencia Premium**: Diseño visual con temática oscura/neón ("Dark Mode") y partículas flotantes animadas.
*   **Integración WhatsApp**: Botón flotante inteligente que permite reservas y pedidos directos al chat del bar.
*   **Gestión de Inventario y Pedidos**: Panel de administración en tiempo real con Socket.io.
*   **Persistencia en la Nube**: Configurado para usar MongoDB Atlas, evitando pérdida de datos en despliegues como Render.

## 🚀 Tecnologías Usadas

*   **Backend**: Node.js, Express, Socket.io, Mongoose.
*   **Frontend**: HTML5, CSS3 (Variables, Flexbox, Grid), JavaScript (Vanilla).
*   **Base de Datos**: MongoDB Atlas (vía Mongoose).

## ☁️ Configuración para Despliegue (Render / Heroku)

Para que los datos (pedidos, inventario, ventas) **no se borren** cuando la aplicación entre en modo sleep:

1.  Crea una cuenta gratuita en [MongoDB Atlas](https://www.mongodb.com/atlas/database).
2.  Crea un Cluster y obtén tu **Connection String** (URI).
3.  En el panel de control de **Render**, ve a la sección **Environment**.
4.  Agrega una variable de entorno llamada `MONGODB_URI` y pega tu cadena de conexión.
    *   Ejemplo: `mongodb+srv://admin:password@cluster0.abcde.mongodb.net/fleiva?retryWrites=true&w=majority`
5.  Despliega la aplicación. ¡Listo! Los datos ahora son permanentes.

## 📦 Uso Local

1.  Instala las dependencias: `npm install`
2.  Crea un archivo `.env` basado en `.env.example`.
3.  Inicia el servidor: `npm start` o `npm run dev`.

## 📍 Ubicación y Contacto

*   **WhatsApp**: [304 533 0576](https://wa.me/573045330576)
*   **Instagram**: [@fleiva_bar](https://www.instagram.com/fleiva_bar/)
*   **Ubicación**: [Ver en Google Maps](https://maps.app.goo.gl/81pxtm3gDZHwUZTC6)

---
Developed with 💜 & Code.
