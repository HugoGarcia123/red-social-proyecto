CREATE TABLE usuario (
  id SERIAL PRIMARY KEY,

  firebase_uid VARCHAR(128) UNIQUE NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,

  nombre VARCHAR(100),
  foto_perfil_url TEXT,
  bio TEXT,

  -- Relación con la tabla rol
  rol_id SMALLINT NOT NULL DEFAULT 0,

  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_usuario_rol
    FOREIGN KEY (rol_id)
    REFERENCES rol(id)
);
