const products = [
    {
        category: "Cervezas",
        items: [
            { name: "Pilsen (Botella)", price: 5000 },
            { name: "Poker (Botella)", price: 5000 },
            { name: "Aguila (Botella)", price: 5000 },
            { name: "Light (Botella)", price: 5000 },
            { name: "Club Colombia (Botella)", price: 6000 },
            { name: "Corona (Botella)", price: 9000 },
            { name: "3 Cordilleras (Botella)", price: 9000 },
            { name: "BBC (Botella)", price: 9000 },
            { name: "Andina (Latón)", price: 5000 },
            { name: "Pilsen (Latón)", price: 6500 },
            { name: "Poker (Latón)", price: 6500 },
            { name: "Aguila (Latón)", price: 6500 },
            { name: "Club Colombia (Latón)", price: 7000 },
            { name: "Heineken (Latón)", price: 7000 }
        ]
    },
    {
        category: "Micheladas",
        items: [
            { name: "Michelada Corona", price: 10000 },
            { name: "Michelada Heineken", price: 8000 },
            { name: "Michelada Club Colombia", price: 8000 },
            { name: "Michelada BBC", price: 10000 },
            { name: "Michelada 3 Cordilleras", price: 10000 },
            { name: "Michelada Pilsen", price: 7000 },
            { name: "Michelada Aguila", price: 7000 },
            { name: "Michelada Poker", price: 7000 },
            { name: "Michelada Light", price: 7000 },
            { name: "Michelada Andina", price: 6000 },
            { name: "Michelada de soda", price: 5000 }
        ]
    },
    {
        category: "Micheladas de soda (Saborizadas)",
        items: [
            { name: "Michelada Saborizada Corona", price: 12000 },
            { name: "Michelada Saborizada Heineken", price: 10000 },
            { name: "Michelada Saborizada Club Colombia", price: 10000 },
            { name: "Michelada Saborizada BBC", price: 12000 },
            { name: "Michelada Saborizada 3 Cordilleras", price: 12000 },
            { name: "Michelada Saborizada Nacionales", price: 9000 },
            { name: "Michelada Saborizada Andina", price: 8000 }
        ]
    },
    {
        category: "Sodas saborizadas",
        items: [
            { name: "Soda Cereza", price: 8000 }
        ]
    },
    {
        category: "Tragos",
        items: [
            { name: "Aguardiente (Trago)", price: 4000 },
            { name: "Aguardiente amarillo (Trago)", price: 5000 },
            { name: "Ron (Trago)", price: 5000 },
            { name: "Ron Bacardí (Trago)", price: 6000 },
            { name: "Tequila Jimador (Trago)", price: 10000 },
            { name: "Tequila José Cuervo (Trago)", price: 8000 },
            { name: "Brandy (Trago)", price: 6000 },
            { name: "Shot Vodka Smirnoff", price: 7000 },
            { name: "Shot Vodka Absolut", price: 6000 },
            { name: "Jack Daniels Honey (Trago)", price: 10000 },
            { name: "Jack Daniels No. 7 (Trago)", price: 10000 },
            { name: "Jägermeister (Trago)", price: 10000 }
        ]
    },
    {
        category: "Licores",
        items: [
            { name: "Media aguardiente Azul", price: 45000 },
            { name: "Media aguardiente Verde", price: 40000 },
            { name: "Media aguardiente Rojo", price: 45000 },
            { name: "Botella aguardiente Amarillo", price: 95000 },
            { name: "Media Ron Caldas esencial", price: 45000 },
            { name: "Media Ron Medellín", price: 45000 },
            { name: "Media Ron Caldas tradicional", price: 50000 },
            { name: "Botella Ron Caldas tradicional", price: 100000 },
            { name: "Botella Ron Caldas esencial", price: 95000 },
            { name: "Botella Ron Medellín", price: 95000 },
            { name: "Botella Jimador reposado", price: 190000 },
            { name: "Botella José Cuervo", price: 140000 },
            { name: "Whisky Jack Daniels No. 7", price: 200000 },
            { name: "Botella Baileys", price: 150000 },
            { name: "Botella Jägermeister", price: 190000 },
            { name: "Botella Vodka Smirnoff", price: 150000 },
            { name: "Botella Ron Bacardí Añejo", price: 95000 },
            { name: "Botella Ron Bacardí Blanco", price: 100000 },
            { name: "Media de Brandy Domecq", price: 55000 }
        ]
    },
    {
        category: "Cigarrillos",
        items: [
            { name: "Cigarrillo (Unidad)", price: 1000 },
            { name: "Medio Lucky - Malboro", price: 10000 },
            { name: "Medio Bostón", price: 9000 }
        ]
    }
];

if (typeof module !== 'undefined') {
    module.exports = products;
}
