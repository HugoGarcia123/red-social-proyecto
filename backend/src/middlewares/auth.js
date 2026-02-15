const admin = require('../firebase');
const pool = require('../db');


/**
 * Middleware de autenticación
 * Valida el token Firebase enviado en el header Authorization
 */
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);

    const firebase_uid = decodedToken.uid;
    const email = decodedToken.email;

    // 🔎 Buscar usuario en DB
    let result = await pool.query(
      'SELECT id FROM usuario WHERE firebase_uid = $1',
      [firebase_uid]
    );

    let userId;

    if (result.rows.length === 0) {
      // 👤 Si no existe, crearlo
      const insert = await pool.query(
        'INSERT INTO usuario (firebase_uid, email) VALUES ($1, $2) RETURNING id',
        [firebase_uid, email]
      );
      userId = insert.rows[0].id;
    } else {
      userId = result.rows[0].id;
    }

    // ✅ Ahora sí tenemos ID real
    req.user = {
      id: userId,
      firebase_uid,
      email,
    };

    next();

  } catch (error) {
  console.error("AUTH ERROR REAL:", error);
  return res.status(401).json({ error: error.message });
}

}


module.exports = authMiddleware;
