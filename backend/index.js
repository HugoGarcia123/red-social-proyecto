// Importamos Express para crear el servidor
const express = require('express');

// Importamos la conexión a la base de datos
const pool = require('./src/db');

// Middleware de autenticación Firebase
const authMiddleware = require('./src/middlewares/auth');

// Creamos la app Express
const app = express();
const PORT = 3000;

// Permite recibir JSON en requests
app.use(express.json());

/**
 * Endpoint de salud del sistema
 * Verifica que:
 * 1. El backend está vivo
 * 2. PostgreSQL responde correctamente
 */
app.get('/health', async (req, res) => {
  try {
    // Consulta mínima para validar conexión
    await pool.query('SELECT 1');
    res.send('OK');
  } catch (error) {
    res.status(500).send('DB ERROR');
  }
});

/**
 * Endpoint protegido
 * Sirve para validar que Firebase Auth funciona
 */
app.post('/usuarios/me', authMiddleware, async (req, res) => {
  res.json({
    mensaje: 'Usuario autenticado correctamente',
    user: req.user,
  });
});



/**
 * Crear un nuevo proyecto
 * Solo usuarios autenticados
 */
app.post('/proyectos', authMiddleware, async (req, res) => {
  const { titulo, descripcion, busca_colaboradores } = req.body;
  const { firebase_uid } = req.user;

  try {
    // 1. Obtener el usuario interno
    const userResult = await pool.query(
      'SELECT id FROM usuario WHERE firebase_uid = $1',
      [firebase_uid]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const creadorId = userResult.rows[0].id;

    // 2. Crear el proyecto
    const proyectoResult = await pool.query(
      `
      INSERT INTO proyecto (creador_id, titulo, descripcion, busca_colaboradores)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [creadorId, titulo, descripcion, busca_colaboradores ?? false]
    );

    res.status(201).json(proyectoResult.rows[0]);
  } catch (error) {
    console.error('❌ Error creando proyecto', error);
    res.status(500).json({ error: 'Error al crear proyecto' });
  }
});



/**
 * Obtener todos los proyectos
 */
app.get('/proyectos', async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT 
        p.id,
        p.titulo,
        p.descripcion,
        p.estado,
        p.fecha_creacion,
        u.nombre AS creador_nombre
      FROM proyecto p
      JOIN usuario u ON p.creador_id = u.id
      ORDER BY p.fecha_creacion DESC
      `
    );

    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error obteniendo proyectos', error);
    res.status(500).json({ error: 'Error al obtener proyectos' });
  }
});

/**
 * Obtener un proyecto por ID
 * Endpoint público
 */
app.get('/proyectos/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT
        p.id,
        p.titulo,
        p.descripcion,
        p.estado,
        p.busca_colaboradores,
        p.fecha_creacion,
        u.nombre AS creador_nombre,
        u.email AS creador_email
      FROM proyecto p
      JOIN usuario u ON p.creador_id = u.id
      WHERE p.id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error obteniendo proyecto', error);
    res.status(500).json({ error: 'Error al obtener proyecto' });
  }
});

/**
 * Editar un proyecto
 * Solo el creador puede hacerlo
 */
app.put('/proyectos/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { titulo, descripcion, estado, busca_colaboradores } = req.body;
  const { firebase_uid } = req.user;

  try {
    // 1. Obtener usuario interno
    const userResult = await pool.query(
      'SELECT id FROM usuario WHERE firebase_uid = $1',
      [firebase_uid]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuarioId = userResult.rows[0].id;

    // 2. Obtener proyecto
    const proyectoResult = await pool.query(
      'SELECT creador_id FROM proyecto WHERE id = $1',
      [id]
    );

    if (proyectoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    // 3. Validar permisos
    if (proyectoResult.rows[0].creador_id !== usuarioId) {
      return res.status(403).json({ error: 'No tienes permiso para editar este proyecto' });
    }

    // 4. Actualizar proyecto
    const updatedProject = await pool.query(
      `
      UPDATE proyecto
      SET
        titulo = COALESCE($1, titulo),
        descripcion = COALESCE($2, descripcion),
        estado = COALESCE($3, estado),
        busca_colaboradores = COALESCE($4, busca_colaboradores),
        fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
      `,
      [titulo, descripcion, estado, busca_colaboradores, id]
    );

    res.json(updatedProject.rows[0]);
  } catch (error) {
    console.error('❌ Error actualizando proyecto', error);
    res.status(500).json({ error: 'Error al actualizar proyecto' });
  }
});

/**
 * Asignar tecnologías a un proyecto
 * Solo el creador puede hacerlo
 */
app.post('/proyectos/:id/tecnologias', authMiddleware, async (req, res) => {
  const { id: proyectoId } = req.params;
  const { tecnologias } = req.body; // array de tecnologia_id
  const { firebase_uid } = req.user;

  if (!Array.isArray(tecnologias) || tecnologias.length === 0) {
    return res.status(400).json({ error: 'Debes enviar un arreglo de tecnologías' });
  }

  try {
    // 1. Obtener usuario interno
    const userResult = await pool.query(
      'SELECT id FROM usuario WHERE firebase_uid = $1',
      [firebase_uid]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuarioId = userResult.rows[0].id;

    // 2. Verificar proyecto y permisos
    const proyectoResult = await pool.query(
      'SELECT creador_id FROM proyecto WHERE id = $1',
      [proyectoId]
    );

    if (proyectoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    if (proyectoResult.rows[0].creador_id !== usuarioId) {
      return res.status(403).json({ error: 'No tienes permiso para modificar este proyecto' });
    }

    // 3. Insertar relaciones (evitando duplicados)
    for (const tecnologiaId of tecnologias) {
      await pool.query(
        `
        INSERT INTO proyecto_tecnologia (proyecto_id, tecnologia_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
        `,
        [proyectoId, tecnologiaId]
      );
    }

    res.json({ mensaje: 'Tecnologías asignadas correctamente' });
  } catch (error) {
    console.error('❌ Error asignando tecnologías', error);
    res.status(500).json({ error: 'Error al asignar tecnologías' });
  }
});

/**
 * Obtener tecnologías asociadas a un proyecto
 * Endpoint público
 */
app.get('/proyectos/:id/tecnologias', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT t.id, t.nombre, t.slug
      FROM proyecto_tecnologia pt
      JOIN tecnologia t ON pt.tecnologia_id = t.id
      WHERE pt.proyecto_id = $1
      `,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error obteniendo tecnologías', error);
    res.status(500).json({ error: 'Error al obtener tecnologías' });
  }
});


/**
 * Crear una publicación
 * Puede o no estar ligada a un proyecto
 */
app.post('/publicaciones', authMiddleware, async (req, res) => {
  const { contenido_texto, proyecto_id } = req.body;
  const { firebase_uid } = req.user;

  if (!contenido_texto || contenido_texto.trim() === '') {
    return res.status(400).json({ error: 'El contenido no puede estar vacío' });
  }

  try {
    // 1. Obtener usuario interno
    const userResult = await pool.query(
      'SELECT id FROM usuario WHERE firebase_uid = $1',
      [firebase_uid]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const autorId = userResult.rows[0].id;

    // 2. Crear publicación
    const result = await pool.query(
      `
      INSERT INTO publicacion (autor_id, proyecto_id, contenido_texto)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [autorId, proyecto_id ?? null, contenido_texto]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error creando publicación', error);
    res.status(500).json({ error: 'Error al crear publicación' });
  }
});


/**
 * Feed global de publicaciones
 */
app.get('/publicaciones', async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        p.id,
        p.contenido_texto,
        p.fecha_creacion,

        u.id AS autor_id,
        u.nombre AS autor_nombre,

        pr.id AS proyecto_id,
        pr.titulo AS proyecto_titulo
      FROM publicacion p
      JOIN usuario u ON p.autor_id = u.id
      LEFT JOIN proyecto pr ON p.proyecto_id = pr.id
      ORDER BY p.fecha_creacion DESC
      `
    );

    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error obteniendo publicaciones', error);
    res.status(500).json({ error: 'Error al obtener publicaciones' });
  }
});



// Levantamos el servidor
app.listen(PORT, () => {
  console.log(`🚀 Backend corriendo en http://localhost:${PORT}`);
});
