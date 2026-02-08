# Imagen base con Node
FROM node:20-alpine

# Carpeta de trabajo dentro del contenedor
WORKDIR /app

# Copiamos package.json primero (buena práctica)
COPY package*.json ./

# Instalamos dependencias
RUN npm install

# Copiamos el resto del código
COPY . .

# Puerto que usa la app
EXPOSE 3000

# Comando para arrancar el servidor
CMD ["node", "index.js"]
