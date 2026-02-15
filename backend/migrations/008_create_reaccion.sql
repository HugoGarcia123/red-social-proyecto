CREATE TABLE IF NOT EXISTS reaccion (
  id SERIAL PRIMARY KEY,
  publicacion_id INTEGER NOT NULL,
  usuario_id INTEGER NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  creado_en TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_reaccion_publicacion
    FOREIGN KEY (publicacion_id)
    REFERENCES publicacion(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_reaccion_usuario
    FOREIGN KEY (usuario_id)
    REFERENCES usuario(id)
    ON DELETE CASCADE,
  UNIQUE (publicacion_id, usuario_id)
);
