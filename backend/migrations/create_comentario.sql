CREATE TABLE IF NOT EXISTS comentario (
  id SERIAL PRIMARY KEY,

  -- Publicación a la que pertenece
  publicacion_id INTEGER NOT NULL,

  -- Autor del comentario
  autor_id INTEGER NOT NULL,

  contenido_texto TEXT NOT NULL,

  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_comentario_publicacion
    FOREIGN KEY (publicacion_id)
    REFERENCES publicacion(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_comentario_autor
    FOREIGN KEY (autor_id)
    REFERENCES usuario(id)
);
