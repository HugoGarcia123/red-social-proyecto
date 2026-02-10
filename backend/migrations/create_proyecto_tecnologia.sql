CREATE TABLE proyecto_tecnologia (
  proyecto_id INTEGER NOT NULL,
  tecnologia_id INTEGER NOT NULL,

  PRIMARY KEY (proyecto_id, tecnologia_id),

  CONSTRAINT fk_pt_proyecto
    FOREIGN KEY (proyecto_id)
    REFERENCES proyecto(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_pt_tecnologia
    FOREIGN KEY (tecnologia_id)
    REFERENCES tecnologia(id)
    ON DELETE CASCADE
);
