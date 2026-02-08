// Cliente oficial de PostgreSQL para Node
const { Pool } = require('pg');

// Creamos el pool usando variables de entorno
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Se ejecuta cuando se conecta correctamente
pool.on('connect', () => {
  console.log('✅ Conectado a PostgreSQL');
});

// Manejo global de errores de la DB
pool.on('error', (err) => {
  console.error('❌ Error en PostgreSQL', err);
});

// Exportamos el pool para usarlo en otros archivos
module.exports = pool;
