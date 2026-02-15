CREATE TABLE IF NOT EXISTS proyecto (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  imagen_url TEXT,
  creado_en TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_proyecto_usuario
    FOREIGN KEY (usuario_id)
    REFERENCES usuario(id)
    ON DELETE CASCADE
);
