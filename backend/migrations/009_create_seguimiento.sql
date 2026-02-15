CREATE TABLE IF NOT EXISTS seguimiento (
  id SERIAL PRIMARY KEY,
  seguidor_id INTEGER NOT NULL,
  seguido_id INTEGER NOT NULL,
  creado_en TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_seguidor
    FOREIGN KEY (seguidor_id)
    REFERENCES usuario(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_seguido
    FOREIGN KEY (seguido_id)
    REFERENCES usuario(id)
    ON DELETE CASCADE,
  UNIQUE (seguidor_id, seguido_id)
);
