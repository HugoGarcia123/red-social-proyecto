CREATE TABLE IF NOT EXISTS publicacion (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL,
  contenido TEXT NOT NULL,
  imagen_url TEXT,
  creado_en TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_publicacion_usuario
    FOREIGN KEY (usuario_id)
    REFERENCES usuario(id)
    ON DELETE CASCADE
);
