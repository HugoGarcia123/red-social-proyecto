CREATE TABLE postulacion (
  id SERIAL PRIMARY KEY,

  colaboracion_id INTEGER NOT NULL,
  usuario_id INTEGER NOT NULL,

  -- pendiente | aceptada | rechazada
  estado VARCHAR(20) DEFAULT 'pendiente',

  mensaje_opcional TEXT,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_postulacion_colaboracion
    FOREIGN KEY (colaboracion_id)
    REFERENCES colaboracion(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_postulacion_usuario
    FOREIGN KEY (usuario_id)
    REFERENCES usuario(id),

  -- Un usuario no puede postularse dos veces a la misma colaboración
  CONSTRAINT unique_postulacion
    UNIQUE (colaboracion_id, usuario_id)
);
