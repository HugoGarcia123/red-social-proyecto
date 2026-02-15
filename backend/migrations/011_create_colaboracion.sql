CREATE TABLE IF NOT EXISTS postulacion (
  id SERIAL PRIMARY KEY,
  proyecto_id INTEGER NOT NULL,
  usuario_id INTEGER NOT NULL,
  mensaje TEXT,
  estado VARCHAR(50) DEFAULT 'pendiente',
  creado_en TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_postulacion_proyecto
    FOREIGN KEY (proyecto_id)
    REFERENCES proyecto(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_postulacion_usuario
    FOREIGN KEY (usuario_id)
    REFERENCES usuario(id)
    ON DELETE CASCADE,
  UNIQUE (proyecto_id, usuario_id)
);
