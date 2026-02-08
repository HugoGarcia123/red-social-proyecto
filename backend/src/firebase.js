const admin = require('firebase-admin');
const fs = require('fs');

// Leemos el archivo de la cuenta de servicio
const serviceAccount = JSON.parse(
  fs.readFileSync('/app/firebase-service-account.json', 'utf8')
);

// Inicializamos Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Exportamos admin para usarlo en middlewares
module.exports = admin;
