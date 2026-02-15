CREATE TABLE IF NOT EXISTS colaboracion (
  id SERIAL PRIMARY KEY,
  proyecto_id INTEGER NOT NULL,
  usuario_id INTEGER NOT NULL,
  rol VARCHAR(100),
  creado_en TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_colaboracion_proyecto
    FOREIGN KEY (proyecto_id)
    REFERENCES proyecto(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_colaboracion_usuario
    FOREIGN KEY (usuario_id)
    REFERENCES usuario(id)
    ON DELETE CASCADE
);
