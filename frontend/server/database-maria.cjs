const mysql = require('mysql2/promise');

let pool = null;
let initPromise = null;

async function ensureInit() {
  if (pool) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    console.log('MariaDB: initializing database...');
    const tempConn = await mysql.createConnection({
      host: 'localhost',
      user: 'opencode',
      password: '12345',
    });

    await tempConn.execute('CREATE DATABASE IF NOT EXISTS mri_console CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    await tempConn.execute('USE mri_console');

    const tables = [
      `CREATE TABLE IF NOT EXISTS pacientes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre TEXT, fecha_nacimiento TEXT, accession TEXT, hora TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS protocolos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre TEXT NOT NULL, descripcion TEXT,
        UNIQUE KEY uq_nombre (nombre(255))
      )`,
      `CREATE TABLE IF NOT EXISTS indicaciones_protocolo (
        id INT AUTO_INCREMENT PRIMARY KEY,
        protocolo_id INT, indicacion TEXT NOT NULL,
        FOREIGN KEY(protocolo_id) REFERENCES protocolos(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS contraindicaciones_protocolo (
        id INT AUTO_INCREMENT PRIMARY KEY,
        protocolo_id INT, contraindicacion TEXT NOT NULL,
        FOREIGN KEY(protocolo_id) REFERENCES protocolos(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS preparacion_paciente (
        id INT AUTO_INCREMENT PRIMARY KEY,
        protocolo_id INT, instruccion TEXT NOT NULL,
        FOREIGN KEY(protocolo_id) REFERENCES protocolos(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS posicionamiento_paciente (
        id INT AUTO_INCREMENT PRIMARY KEY,
        protocolo_id INT, instruccion TEXT NOT NULL,
        FOREIGN KEY(protocolo_id) REFERENCES protocolos(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS secuencias (
        id INT AUTO_INCREMENT PRIMARY KEY,
        protocolo_id INT, nombre_secuencia TEXT NOT NULL,
        tr_default REAL, te_default REAL, fov_default INT,
        slice_thickness_default REAL, matrix_default TEXT, flip_default INT,
        orientation_default TEXT, averages_default INT,
        fat_suppression_default TEXT, phase_encoding_default TEXT,
        base_resolution_default INT, phase_resolution_default INT,
        phase_partial_fourier_default TEXT, phase_oversampling_default REAL,
        concatenations_default INT, gradient_mode_default TEXT, multiband_factor_default INT,
        plane TEXT, planning_instructions TEXT, technical_parameters JSON,
        tr_min REAL, tr_max REAL, te_min REAL, te_max REAL,
        slice_thickness REAL, flip_angle_min INT, flip_angle_max INT,
        phase_direction TEXT, matrix_size TEXT,
        fov_min INT, fov_max INT, gap_percentage INT, nex INT,
        FOREIGN KEY(protocolo_id) REFERENCES protocolos(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS estudios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        paciente_id INT, protocolo_id INT, secuencia_id INT,
        tipo_estudio TEXT, nombre_secuencia TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(paciente_id) REFERENCES pacientes(id),
        FOREIGN KEY(protocolo_id) REFERENCES protocolos(id),
        FOREIGN KEY(secuencia_id) REFERENCES secuencias(id)
      )`,
      `CREATE TABLE IF NOT EXISTS parametros_secuencia (
        id INT AUTO_INCREMENT PRIMARY KEY,
        estudio_id INT, nombre_secuencia TEXT,
        tr REAL, te REAL, fov INT, slice_thickness REAL,
        flip_angle INT, phase_direction TEXT, matrix_size TEXT,
        gap_percentage INT, nex INT,
        box_x REAL, box_y REAL, box_w REAL, box_h REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(estudio_id) REFERENCES estudios(id)
      )`,
    ];

    for (const sql of tables) {
      await tempConn.execute(sql);
    }

    // Seed pacientes
    const [pRows] = await tempConn.execute('SELECT COUNT(*) as count FROM pacientes');
    if (pRows[0].count === 0) {
      await tempConn.execute("INSERT INTO pacientes (nombre, fecha_nacimiento, accession, hora) VALUES ('vidOps', '15/03/1985', 'MR48291', '08:30')");
      await tempConn.execute("INSERT INTO pacientes (nombre, fecha_nacimiento, accession, hora) VALUES ('johDoe', '22/07/1990', 'MR48292', '09:00')");
      await tempConn.execute("INSERT INTO pacientes (nombre, fecha_nacimiento, accession, hora) VALUES ('marPop', '10/11/1978', 'MR48293', '09:30')");
      await tempConn.execute("INSERT INTO pacientes (nombre, fecha_nacimiento, accession, hora) VALUES ('pamWin', '05/04/1995', 'MR48294', '10:00')");
      await tempConn.execute("INSERT INTO pacientes (nombre, fecha_nacimiento, accession, hora) VALUES ('tomCru', '30/12/1982', 'MR48295', '10:30')");
    }

    // Seed protocolos
    const [prRows] = await tempConn.execute('SELECT COUNT(*) as count FROM protocolos');
    if (prRows[0].count === 0) {
      const jsonPath = require('path').join(__dirname, '..', 'data', 'protocolos_mri.json');
      if (require('fs').existsSync(jsonPath)) {
        const data = JSON.parse(require('fs').readFileSync(jsonPath, 'utf-8'));
        const seqSql = `INSERT INTO secuencias (protocolo_id, nombre_secuencia, tr_default, te_default, fov_default, slice_thickness_default,
          matrix_default, flip_default, orientation_default, averages_default, fat_suppression_default, phase_encoding_default,
          base_resolution_default, phase_resolution_default, phase_partial_fourier_default, phase_oversampling_default,
          concatenations_default, gradient_mode_default, multiband_factor_default, plane, planning_instructions, technical_parameters,
          tr_min, tr_max, te_min, te_max, slice_thickness, flip_angle_min, flip_angle_max, phase_direction, matrix_size, fov_min, fov_max, gap_percentage, nex)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        for (const protocolo of data) {
          const protocoloNombre = protocolo.anatomical_region || 'Protocolo sin nombre';
          const protocoloDesc = protocolo.indications ? protocolo.indications.replace(/\|/g, ', ').trim() : '';
          const [r] = await tempConn.execute(
            'INSERT INTO protocolos (nombre, descripcion) VALUES (?, ?)',
            [protocoloNombre, protocoloDesc]
          );
          const pid = r.insertId;

          for (const seq of protocolo.sequences) {
            const s = seq.technical_parameters || {};
            const toNum = (v) => (v === null || v === undefined || v === '') ? null : (isNaN(parseFloat(String(v).replace(/[^\d.]/g, ''))) ? null : parseFloat(String(v).replace(/[^\d.]/g, '')));

            await tempConn.execute(seqSql, [
              pid, seq.sequence_name,
              toNum(s.tr_default), toNum(s.te_default), toNum(s.fov_default),
              toNum(s.slice_thickness_default) || toNum(seq.slice_thickness),
              s.matrix_default || null, toNum(s.flip_default),
              s.orientation_default || seq.plane || null, toNum(s.averages_default) || toNum(s.nex),
              s.fat_suppression_default || null, s.phase_encoding_default || null,
              toNum(s.base_resolution_default), toNum(s.phase_resolution_default),
              s.phase_partial_fourier_default || null, toNum(s.phase_oversampling_default),
              toNum(s.concatenations_default), s.gradient_mode_default || null, toNum(s.multiband_factor_default),
              seq.plane || null, seq.planning_instructions || null, JSON.stringify(s),
              toNum(s.tr_min), toNum(s.tr_max), toNum(s.te_min), toNum(s.te_max),
              toNum(seq.slice_thickness), toNum(s.flip_angle_min), toNum(s.flip_angle_max),
              s.phase_direction || null, s.matrix_size || null,
              toNum(s.fov_min), toNum(s.fov_max), toNum(s.gap_percentage), toNum(s.nex)
            ]);
          }
        }
        console.log(`Imported ${data.length} protocols from protocolos_mri.json`);
      } else {
        // Fallback seed data
        const [r1] = await tempConn.execute("INSERT INTO protocolos (nombre, descripcion) VALUES ('Cerebro de Rutina', 'Protocolo estandar para estudio de encefalo')");
        const p1 = r1.insertId;

        const seqSql = `INSERT INTO secuencias (protocolo_id, nombre_secuencia, tr_default, te_default, fov_default, slice_thickness_default,
          matrix_default, flip_default, orientation_default, averages_default, fat_suppression_default, phase_encoding_default,
          base_resolution_default, phase_resolution_default, phase_partial_fourier_default, phase_oversampling_default,
          concatenations_default, gradient_mode_default, multiband_factor_default, plane,
          tr_min, tr_max, te_min, te_max, slice_thickness, flip_angle_min, flip_angle_max, phase_direction, matrix_size, fov_min, fov_max, gap_percentage, nex)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        await tempConn.execute(seqSql, [p1, 'T1_SE_AXIAL', 500, 15, 220, 3.0, '256x256', 90, 'Axial', 1, 'None', 'R >> L', 256, 100, 'Off', 0, 1, 'Normal', 1, null, 400, 600, 10, 20, 3.0, 80, 100, 'R >> L', '256x256', 200, 240, 10, 1]);
        await tempConn.execute(seqSql, [p1, 'T2_TSE_AXIAL', 4000, 100, 220, 3.0, '320x320', 150, 'Axial', 2, 'None', 'R >> L', 320, 100, 'Off', 0, 1, 'Normal', 1, null, 3500, 5500, 80, 120, 3.0, 130, 150, 'R >> L', '320x320', 200, 240, 10, 2]);
        await tempConn.execute(seqSql, [p1, 'FLAIR_AXIAL', 9000, 120, 220, 3.0, '256x256', 150, 'Axial', 1, 'None', 'R >> L', 256, 100, '7/8', 0, 1, 'Normal', 1, null, 8000, 10000, 100, 140, 3.0, 130, 150, 'R >> L', '256x256', 200, 240, 10, 1]);
      }
    }

    await tempConn.end();

    pool = mysql.createPool({
      host: 'localhost',
      user: 'opencode',
      password: '12345',
      database: 'mri_console',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    console.log('MariaDB initialized successfully');
  })();

  initPromise = initPromise.catch(err => {
    console.error('MariaDB init failed:', err.message);
    initPromise = null;
    pool = null;
    throw err;
  });

  return initPromise;
}

const db = {
  prepare: (sql) => ({
    all: async (params = []) => {
      await ensureInit();
      const [results] = await pool.execute(sql, params);
      return results || [];
    },
    get: async (params = []) => {
      await ensureInit();
      const [results] = await pool.execute(sql, params);
      return results[0] || null;
    },
    run: async (params = []) => {
      await ensureInit();
      const [result] = await pool.execute(sql, params);
      return { lastInsertRowid: result.insertId, changes: result.affectedRows };
    },
  }),
  exec: async (sql) => {
    await ensureInit();
    const [results] = await pool.execute(sql);
    return results;
  },
  close: async () => {
    await ensureInit();
    await pool.end();
  },
};

module.exports = db;
