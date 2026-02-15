CREATE TABLE IF NOT EXISTS comentario (
  id SERIAL PRIMARY KEY,
  publicacion_id INTEGER NOT NULL,
  usuario_id INTEGER NOT NULL,
  contenido TEXT NOT NULL,
  creado_en TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_comentario_publicacion
    FOREIGN KEY (publicacion_id)
    REFERENCES publicacion(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_comentario_usuario
    FOREIGN KEY (usuario_id)
    REFERENCES usuario(id)
    ON DELETE CASCADE
);
