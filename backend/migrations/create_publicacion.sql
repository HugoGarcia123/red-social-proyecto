CREATE TABLE publicacion (
  id SERIAL PRIMARY KEY,

  -- Autor de la publicación
  autor_id INTEGER NOT NULL,

  -- Proyecto opcional
  proyecto_id INTEGER,

  contenido_texto TEXT NOT NULL,

  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_edicion TIMESTAMP,

  CONSTRAINT fk_publicacion_autor
    FOREIGN KEY (autor_id)
    REFERENCES usuario(id),

  CONSTRAINT fk_publicacion_proyecto
    FOREIGN KEY (proyecto_id)
    REFERENCES proyecto(id)
    ON DELETE SET NULL
);
