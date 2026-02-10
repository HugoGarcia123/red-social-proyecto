CREATE TABLE proyecto (
  id SERIAL PRIMARY KEY,

  -- Usuario creador del proyecto
  creador_id INTEGER NOT NULL,

  titulo VARCHAR(150) NOT NULL,
  descripcion TEXT,

  -- Estado del proyecto
  estado VARCHAR(20) NOT NULL DEFAULT 'idea',

  imagen_portada_url TEXT,
  busca_colaboradores BOOLEAN DEFAULT false,

  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_proyecto_creador
    FOREIGN KEY (creador_id)
    REFERENCES usuario(id)
);
