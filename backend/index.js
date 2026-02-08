// Importamos Express para crear el servidor
const express = require('express');

// Importamos la conexión a la base de datos
const pool = require('./src/db');

// Middleware de autenticación Firebase
const authMiddleware = require('./src/middlewares/auth');

const uploadProfile = require('./src/middlewares/uploadProfile');

// Creamos la app Express
const app = express();
const PORT = 3000;

// Permite recibir JSON en requests
app.use(express.json());

// Permite servir archivos estáticos (imágenes)
app.use('/uploads', express.static('uploads'));

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


/**
 * Crear un comentario en una publicación
 */
app.post('/publicaciones/:id/comentarios', authMiddleware, async (req, res) => {
  const { id: publicacionId } = req.params;
  const { contenido_texto } = req.body;
  const { firebase_uid } = req.user;

  if (!contenido_texto || contenido_texto.trim() === '') {
    return res.status(400).json({ error: 'El comentario no puede estar vacío' });
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

    // 2. Verificar que la publicación exista
    const pubResult = await pool.query(
      'SELECT id FROM publicacion WHERE id = $1',
      [publicacionId]
    );

    if (pubResult.rows.length === 0) {
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }

    // 3. Crear comentario
    const result = await pool.query(
      `
      INSERT INTO comentario (publicacion_id, autor_id, contenido_texto)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [publicacionId, autorId, contenido_texto]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error creando comentario', error);
    res.status(500).json({ error: 'Error al crear comentario' });
  }
});


/**
 * Obtener comentarios de una publicación
 * Endpoint público
 */
app.get('/publicaciones/:id/comentarios', async (req, res) => {
  const { id: publicacionId } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT
        c.id,
        c.contenido_texto,
        c.fecha_creacion,

        u.id AS autor_id,
        u.nombre AS autor_nombre
      FROM comentario c
      JOIN usuario u ON c.autor_id = u.id
      WHERE c.publicacion_id = $1
      ORDER BY c.fecha_creacion ASC
      `,
      [publicacionId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error obteniendo comentarios', error);
    res.status(500).json({ error: 'Error al obtener comentarios' });
  }
});


/**
 * Crear o actualizar reacción en una publicación
 */
app.post('/publicaciones/:id/reacciones', authMiddleware, async (req, res) => {
  const { id: publicacionId } = req.params;
  const { tipo } = req.body;
  const { firebase_uid } = req.user;

  if (![0, 1, 2].includes(tipo)) {
    return res.status(400).json({ error: 'Tipo de reacción inválido' });
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

    // 2. Insertar o actualizar reacción
    const result = await pool.query(
      `
      INSERT INTO reaccion (publicacion_id, usuario_id, tipo)
      VALUES ($1, $2, $3)
      ON CONFLICT (publicacion_id, usuario_id)
      DO UPDATE SET tipo = EXCLUDED.tipo
      RETURNING *
      `,
      [publicacionId, usuarioId, tipo]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error reaccionando', error);
    res.status(500).json({ error: 'Error al reaccionar' });
  }
});


/**
 * Eliminar reacción de una publicación
 */
app.delete('/publicaciones/:id/reacciones', authMiddleware, async (req, res) => {
  const { id: publicacionId } = req.params;
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

    // 2. Eliminar reacción
    await pool.query(
      `
      DELETE FROM reaccion
      WHERE publicacion_id = $1 AND usuario_id = $2
      `,
      [publicacionId, usuarioId]
    );

    res.json({ mensaje: 'Reacción eliminada' });
  } catch (error) {
    console.error('❌ Error eliminando reacción', error);
    res.status(500).json({ error: 'Error al eliminar reacción' });
  }
});


/**
 * Obtener conteo de reacciones por tipo
 */
app.get('/publicaciones/:id/reacciones', async (req, res) => {
  const { id: publicacionId } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT tipo, COUNT(*) AS total
      FROM reaccion
      WHERE publicacion_id = $1
      GROUP BY tipo
      `,
      [publicacionId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error obteniendo reacciones', error);
    res.status(500).json({ error: 'Error al obtener reacciones' });
  }
});


/**
 * Seguir a un usuario
 */
app.post('/usuarios/:id/seguir', authMiddleware, async (req, res) => {
  const { id: usuarioSeguidoId } = req.params;
  const { firebase_uid } = req.user;

  try {
    // Usuario autenticado
    const userResult = await pool.query(
      'SELECT id FROM usuario WHERE firebase_uid = $1',
      [firebase_uid]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const seguidorId = userResult.rows[0].id;

    // Insertar seguimiento
    await pool.query(
      `
      INSERT INTO seguimiento (seguidor_id, usuario_seguido_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      `,
      [seguidorId, usuarioSeguidoId]
    );

    res.json({ mensaje: 'Ahora sigues a este usuario' });
  } catch (error) {
    console.error('❌ Error siguiendo usuario', error);
    res.status(500).json({ error: 'Error al seguir usuario' });
  }
});


/**
 * Seguir un proyecto
 */
app.post('/proyectos/:id/seguir', authMiddleware, async (req, res) => {
  const { id: proyectoId } = req.params;
  const { firebase_uid } = req.user;

  try {
    const userResult = await pool.query(
      'SELECT id FROM usuario WHERE firebase_uid = $1',
      [firebase_uid]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const seguidorId = userResult.rows[0].id;

    await pool.query(
      `
      INSERT INTO seguimiento (seguidor_id, proyecto_seguido_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      `,
      [seguidorId, proyectoId]
    );

    res.json({ mensaje: 'Ahora sigues este proyecto' });
  } catch (error) {
    console.error('❌ Error siguiendo proyecto', error);
    res.status(500).json({ error: 'Error al seguir proyecto' });
  }
});


/**
 * Dejar de seguir a un usuario
 */
app.delete('/usuarios/:id/seguir', authMiddleware, async (req, res) => {
  const { id: usuarioSeguidoId } = req.params;
  const { firebase_uid } = req.user;

  try {
    const userResult = await pool.query(
      'SELECT id FROM usuario WHERE firebase_uid = $1',
      [firebase_uid]
    );

    const seguidorId = userResult.rows[0].id;

    await pool.query(
      `
      DELETE FROM seguimiento
      WHERE seguidor_id = $1 AND usuario_seguido_id = $2
      `,
      [seguidorId, usuarioSeguidoId]
    );

    res.json({ mensaje: 'Has dejado de seguir al usuario' });
  } catch (error) {
    console.error('❌ Error al dejar de seguir usuario', error);
    res.status(500).json({ error: 'Error al dejar de seguir' });
  }
});


/**
 * Obtener usuarios y proyectos que sigo
 */
app.get('/seguimientos', authMiddleware, async (req, res) => {
  const { firebase_uid } = req.user;

  try {
    const userResult = await pool.query(
      'SELECT id FROM usuario WHERE firebase_uid = $1',
      [firebase_uid]
    );

    const seguidorId = userResult.rows[0].id;

    const result = await pool.query(
      `
      SELECT
        s.id,
        u.nombre AS usuario_seguido,
        p.titulo AS proyecto_seguido
      FROM seguimiento s
      LEFT JOIN usuario u ON s.usuario_seguido_id = u.id
      LEFT JOIN proyecto p ON s.proyecto_seguido_id = p.id
      WHERE s.seguidor_id = $1
      `,
      [seguidorId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error obteniendo seguimientos', error);
    res.status(500).json({ error: 'Error al obtener seguimientos' });
  }
});


/**
 * Crear una colaboración en un proyecto
 * Solo el creador del proyecto
 */
app.post('/proyectos/:id/colaboraciones', authMiddleware, async (req, res) => {
  const { id: proyectoId } = req.params;
  const { rol_buscado, descripcion } = req.body;
  const { firebase_uid } = req.user;

  try {
    // Usuario interno
    const userResult = await pool.query(
      'SELECT id FROM usuario WHERE firebase_uid = $1',
      [firebase_uid]
    );
    const usuarioId = userResult.rows[0].id;

    // Verificar creador
    const proyectoResult = await pool.query(
      'SELECT creador_id FROM proyecto WHERE id = $1',
      [proyectoId]
    );

    if (proyectoResult.rows[0].creador_id !== usuarioId) {
      return res.status(403).json({ error: 'No puedes crear colaboraciones en este proyecto' });
    }

    const result = await pool.query(
      `
      INSERT INTO colaboracion (proyecto_id, rol_buscado, descripcion)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [proyectoId, rol_buscado, descripcion]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error creando colaboración', error);
    res.status(500).json({ error: 'Error al crear colaboración' });
  }
});


/**
 * Postularse a una colaboración
 */
app.post('/colaboraciones/:id/postular', authMiddleware, async (req, res) => {
  const { id: colaboracionId } = req.params;
  const { mensaje_opcional } = req.body;
  const { firebase_uid } = req.user;

  try {
    const userResult = await pool.query(
      'SELECT id FROM usuario WHERE firebase_uid = $1',
      [firebase_uid]
    );
    const usuarioId = userResult.rows[0].id;

    const result = await pool.query(
      `
      INSERT INTO postulacion (colaboracion_id, usuario_id, mensaje_opcional)
      VALUES ($1, $2, $3)
      ON CONFLICT DO NOTHING
      RETURNING *
      `,
      [colaboracionId, usuarioId, mensaje_opcional]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Ya estás postulado a esta colaboración' });
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error postulándose', error);
    res.status(500).json({ error: 'Error al postularse' });
  }
});


/**
 * Aceptar o rechazar una postulación
 * Solo el creador del proyecto
 */
app.put('/postulaciones/:id', authMiddleware, async (req, res) => {
  const { id: postulacionId } = req.params;
  const { estado } = req.body; // aceptada | rechazada
  const { firebase_uid } = req.user;

  if (!['aceptada', 'rechazada'].includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }

  try {
    // Usuario interno
    const userResult = await pool.query(
      'SELECT id FROM usuario WHERE firebase_uid = $1',
      [firebase_uid]
    );
    const usuarioId = userResult.rows[0].id;

    // Verificar permisos (join en cascada)
    const permisoResult = await pool.query(
      `
      SELECT p.creador_id
      FROM postulacion po
      JOIN colaboracion c ON po.colaboracion_id = c.id
      JOIN proyecto p ON c.proyecto_id = p.id
      WHERE po.id = $1
      `,
      [postulacionId]
    );

    if (permisoResult.rows[0].creador_id !== usuarioId) {
      return res.status(403).json({ error: 'No tienes permiso para decidir esta postulación' });
    }

    const result = await pool.query(
      `
      UPDATE postulacion
      SET estado = $1
      WHERE id = $2
      RETURNING *
      `,
      [estado, postulacionId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error actualizando postulación', error);
    res.status(500).json({ error: 'Error al actualizar postulación' });
  }
});


/**
 * Subir o actualizar foto de perfil
 */
app.post(
  '/usuarios/me/foto',
  authMiddleware,
  uploadProfile.single('foto'),
  async (req, res) => {
    try {
      const userId = req.user.id;

      const fotoUrl = `/uploads/users/${userId}/profile.jpg`;

      // Guardar URL en la DB
      await pool.query(
        'UPDATE usuario SET foto_perfil_url = $1 WHERE id = $2',
        [fotoUrl, userId]
      );

      res.json({ foto_perfil_url: fotoUrl });
    } catch (error) {
      console.error('❌ Error subiendo foto', error);
      res.status(500).json({ error: 'Error al subir foto' });
    }
  }
);



// Levantamos el servidor
app.listen(PORT, () => {
  console.log(`🚀 Backend corriendo en http://localhost:${PORT}`);
});
