/**
 * Middleware para subir foto de perfil
 * Guarda el archivo en /uploads/users/{userId}/profile.jpg
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user.id; // id interno del usuario
    const dir = path.join('uploads', 'users', String(userId));

    // Crear carpeta si no existe
    fs.mkdirSync(dir, { recursive: true });

    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, 'profile.jpg'); // siempre se reemplaza
  }
});

const uploadProfile = multer({ storage });

module.exports = uploadProfile;
