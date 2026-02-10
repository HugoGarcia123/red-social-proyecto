CREATE TABLE colaboracion (
  id SERIAL PRIMARY KEY,

  proyecto_id INTEGER NOT NULL,

  rol_buscado VARCHAR(100) NOT NULL,
  descripcion TEXT,

  -- abierta | cerrada
  estado VARCHAR(20) DEFAULT 'abierta',

  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_colaboracion_proyecto
    FOREIGN KEY (proyecto_id)
    REFERENCES proyecto(id)
    ON DELETE CASCADE
);
