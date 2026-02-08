const admin = require('../firebase');

/**
 * Middleware de autenticación
 * Valida el token Firebase enviado en el header Authorization
 */
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  // Verificamos que exista el token
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  // Extraemos el token
  const token = authHeader.split(' ')[1];

  try {
    // Firebase valida el token
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Guardamos info del usuario en el request
    req.user = {
      firebase_uid: decodedToken.uid,
      email: decodedToken.email,
    };

    // Continuamos al endpoint
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

module.exports = authMiddleware;
