CREATE TABLE seguimiento (
  id SERIAL PRIMARY KEY,

  seguidor_id INTEGER NOT NULL,

  -- Uno de estos dos debe tener valor (no ambos)
  usuario_seguido_id INTEGER,
  proyecto_seguido_id INTEGER,

  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_seguimiento_seguidor
    FOREIGN KEY (seguidor_id)
    REFERENCES usuario(id),

  CONSTRAINT fk_seguimiento_usuario
    FOREIGN KEY (usuario_seguido_id)
    REFERENCES usuario(id),

  CONSTRAINT fk_seguimiento_proyecto
    FOREIGN KEY (proyecto_seguido_id)
    REFERENCES proyecto(id),

  -- Evita seguir dos veces lo mismo
  CONSTRAINT unique_seguimiento_usuario
    UNIQUE (seguidor_id, usuario_seguido_id),

  CONSTRAINT unique_seguimiento_proyecto
    UNIQUE (seguidor_id, proyecto_seguido_id),

  -- Regla lógica: solo uno puede ser distinto de NULL
  CONSTRAINT check_seguimiento_objetivo
    CHECK (
      (usuario_seguido_id IS NOT NULL AND proyecto_seguido_id IS NULL)
      OR
      (usuario_seguido_id IS NULL AND proyecto_seguido_id IS NOT NULL)
    )
);
