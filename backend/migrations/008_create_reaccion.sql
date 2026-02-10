CREATE TABLE IF NOT EXISTS reaccion (
  id SERIAL PRIMARY KEY,

  publicacion_id INTEGER NOT NULL,
  usuario_id INTEGER NOT NULL,

  -- Tipo de reacción (catálogo lógico)
  tipo SMALLINT NOT NULL,

  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_reaccion_publicacion
    FOREIGN KEY (publicacion_id)
    REFERENCES publicacion(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_reaccion_usuario
    FOREIGN KEY (usuario_id)
    REFERENCES usuario(id),

  -- Regla CLAVE: 1 reacción por usuario por publicación
  CONSTRAINT unique_reaccion_usuario_publicacion
    UNIQUE (publicacion_id, usuario_id)
);
