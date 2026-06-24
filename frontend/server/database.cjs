const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'mri_console.db');
const db = new Database(dbPath);

db.exec(`
  -- ============================================
  -- TABLA: PACIENTES
  -- ============================================
  CREATE TABLE IF NOT EXISTS pacientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    fecha_nacimiento TEXT,
    accession TEXT,
    hora TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- ============================================
  -- TABLA: PROTOCOLOS (Se añade UNIQUE para evitar duplicados al scrapear)
  -- ============================================
  CREATE TABLE IF NOT EXISTS protocolos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE, 
    descripcion TEXT
  );

  -- ============================================
  -- TABLA: INDICACIONES (NUEVA)
  -- ============================================
  CREATE TABLE IF NOT EXISTS indicaciones_protocolo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    protocolo_id INTEGER,
    indicacion TEXT NOT NULL,
    FOREIGN KEY(protocolo_id) REFERENCES protocolos(id) ON DELETE CASCADE
  );

  -- ============================================
  -- TABLA: CONTRAINDICACIONES (NUEVA)
  -- ============================================
  CREATE TABLE IF NOT EXISTS contraindicaciones_protocolo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    protocolo_id INTEGER,
    contraindicacion TEXT NOT NULL,
    FOREIGN KEY(protocolo_id) REFERENCES protocolos(id) ON DELETE CASCADE
  );

  -- ============================================
  -- TABLA: PREPARACION DEL PACIENTE (NUEVA)
  -- ============================================
  CREATE TABLE IF NOT EXISTS preparacion_paciente (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    protocolo_id INTEGER,
    instruccion TEXT NOT NULL,
    FOREIGN KEY(protocolo_id) REFERENCES protocolos(id) ON DELETE CASCADE
  );

  -- ============================================
  -- TABLA: POSICIONAMIENTO (NUEVA)
  -- ============================================
  CREATE TABLE IF NOT EXISTS posicionamiento_paciente (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    protocolo_id INTEGER,
    instruccion TEXT NOT NULL,
    FOREIGN KEY(protocolo_id) REFERENCES protocolos(id) ON DELETE CASCADE
  );

  -- ============================================
  -- TABLA: SECUENCIAS
  -- ============================================
  CREATE TABLE IF NOT EXISTS secuencias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    protocolo_id INTEGER,
    nombre_secuencia TEXT NOT NULL,
    
    -- Valores por defecto
    tr_default REAL,
    te_default REAL,
    fov_default INTEGER,
    slice_thickness_default REAL,
    matrix_default TEXT,
    flip_default INTEGER,
    orientation_default TEXT,
    averages_default INTEGER,
    fat_suppression_default TEXT,
    phase_encoding_default TEXT,
    base_resolution_default INTEGER,
    phase_resolution_default INTEGER,
    phase_partial_fourier_default TEXT,
    phase_oversampling_default REAL,
    concatenations_default INTEGER,
    gradient_mode_default TEXT,
    multiband_factor_default INTEGER,
    
    -- Rangos para evaluación pedagógica
    tr_min REAL,
    tr_max REAL,
    te_min REAL,
    te_max REAL,
    slice_thickness REAL,
    flip_angle_min INTEGER,
    flip_angle_max INTEGER,
    phase_direction TEXT,
    matrix_size TEXT,
    fov_min INTEGER,
    fov_max INTEGER,
    gap_percentage INTEGER,
    nex INTEGER,
    
    FOREIGN KEY(protocolo_id) REFERENCES protocolos(id) ON DELETE CASCADE
  );

  -- ============================================
  -- TABLA: ESTUDIOS
  -- ============================================
  CREATE TABLE IF NOT EXISTS estudios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente_id INTEGER,
    protocolo_id INTEGER,
    secuencia_id INTEGER,
    tipo_estudio TEXT,
    nombre_secuencia TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(paciente_id) REFERENCES pacientes(id),
    FOREIGN KEY(protocolo_id) REFERENCES protocolos(id),
    FOREIGN KEY(secuencia_id) REFERENCES secuencias(id)
  );

  -- ============================================
  -- TABLA: PARAMETROS_SECUENCIA
  -- ============================================
  CREATE TABLE IF NOT EXISTS parametros_secuencia (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    estudio_id INTEGER,
    nombre_secuencia TEXT,
    tr REAL,
    te REAL,
    fov INTEGER,
    slice_thickness REAL,
    flip_angle INTEGER,
    phase_direction TEXT,
    matrix_size TEXT,
    gap_percentage INTEGER,
    nex INTEGER,
    box_x REAL,
    box_y REAL,
    box_w REAL,
    box_h REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(estudio_id) REFERENCES estudios(id)
  );
`);

// Seed data: Pacientes
const existingPatients = db.prepare('SELECT COUNT(*) as count FROM pacientes').get();
if (existingPatients.count === 0) {
  const insertPatient = db.prepare('INSERT INTO pacientes (nombre, fecha_nacimiento, accession, hora) VALUES (?, ?, ?, ?)');
  insertPatient.run('vidOps', '15/03/1985', 'MR48291', '08:30');
  insertPatient.run('johDoe', '22/07/1990', 'MR48292', '09:00');
  insertPatient.run('marPop', '10/11/1978', 'MR48293', '09:30');
  insertPatient.run('pamWin', '05/04/1995', 'MR48294', '10:00');
  insertPatient.run('tomCru', '30/12/1982', 'MR48295', '10:30');
  console.log('Seed patients inserted');
}

// Seed data: Protocolos
const existingProtocols = db.prepare('SELECT COUNT(*) as count FROM protocolos').get();
if (existingProtocols.count === 0) {
  const insertProtocol = db.prepare('INSERT INTO protocolos (nombre, descripcion) VALUES (?, ?)');
  const protocolResult = insertProtocol.run('Cerebro de Rutina', 'Protocolo estándar para estudio de encéfalo');
  const protocoloId = protocolResult.lastInsertRowid;

  // Indicaciones
  const insertIndicacion = db.prepare('INSERT INTO indicaciones_protocolo (protocolo_id, indicacion) VALUES (?, ?)');
  insertIndicacion.run(protocoloId, 'Dolor de cabeza crónico');
  insertIndicacion.run(protocoloId, 'Evaluación de lesiones ocupantes de espacio');
  insertIndicacion.run(protocoloId, 'Control postquirúrgico');
  insertIndicacion.run(protocoloId, 'Estudio de enfermedades neurodegenerativas');

  // Contraindicaciones
  const insertContra = db.prepare('INSERT INTO contraindicaciones_protocolo (protocolo_id, contraindicacion) VALUES (?, ?)');
  insertContra.run(protocoloId, 'Marcapasos cardiacos no compatibles con RM');
  insertContra.run(protocoloId, 'Clips aneurismales cerebrales antigos');
  insertContra.run(protocoloId, 'Implantes cocleares no compatibles');

  // Preparación del paciente
  const insertPrep = db.prepare('INSERT INTO preparacion_paciente (protocolo_id, instruccion) VALUES (?, ?)');
  insertPrep.run(protocoloId, 'Retirar objetos metálicos');
  insertPrep.run(protocoloId, 'Ayuno de 4 horas si se usa contraste');
  insertPrep.run(protocoloId, 'Presentar estudios previos si existen');

  // Posicionamiento
  const insertPos = db.prepare('INSERT INTO posicionamiento_paciente (protocolo_id, instruccion) VALUES (?, ?)');
  insertPos.run(protocoloId, 'Paciente en decúbito supino');
  insertPos.run(protocoloId, 'Cabeza centrada en线圈 craneal');
  insertPos.run(protocoloId, 'Alinear plano orbitomeatal');

  // Secuencias
  const insertSequence = db.prepare(`
    INSERT INTO secuencias (
      protocolo_id, nombre_secuencia,
      tr_default, te_default, fov_default, slice_thickness_default, matrix_default, flip_default,
      orientation_default, averages_default, fat_suppression_default, phase_encoding_default,
      base_resolution_default, phase_resolution_default, phase_partial_fourier_default,
      phase_oversampling_default, concatenations_default, gradient_mode_default, multiband_factor_default,
      tr_min, tr_max, te_min, te_max, slice_thickness, flip_angle_min, flip_angle_max,
      phase_direction, matrix_size, fov_min, fov_max, gap_percentage, nex
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // T1_SE_AXIAL
  insertSequence.run(
    protocoloId, 'T1_SE_AXIAL',
    500, 15, 220, 3.0, '256x256', 90,
    'Axial', 1, 'None', 'R >> L',
    256, 100, 'Off',
    0, 1, 'Normal', 1,
    400, 600, 10, 20, 3.0, 80, 100,
    'R >> L', '256x256', 200, 240, 10, 1
  );

  // T2_TSE_AXIAL
  insertSequence.run(
    protocoloId, 'T2_TSE_AXIAL',
    4000, 100, 220, 3.0, '320x320', 150,
    'Axial', 2, 'None', 'R >> L',
    320, 100, 'Off',
    0, 1, 'Normal', 1,
    3500, 5500, 80, 120, 3.0, 130, 150,
    'R >> L', '320x320', 200, 240, 10, 2
  );

  // FLAIR_AXIAL
  insertSequence.run(
    protocoloId, 'FLAIR_AXIAL',
    9000, 120, 220, 3.0, '256x256', 150,
    'Axial', 1, 'None', 'R >> L',
    256, 100, '7/8',
    0, 1, 'Normal', 1,
    8000, 10000, 100, 140, 3.0, 130, 150,
    'R >> L', '256x256', 200, 240, 10, 1
  );

  console.log('Seed data inserted: Protocolo Cerebro de Rutina');

  // Columna Cervical
  const insertProtocol2 = db.prepare('INSERT INTO protocolos (nombre, descripcion) VALUES (?, ?)');
  const protocolResult2 = insertProtocol2.run('Columna Cervical', 'Protocolo para estudio de columna cervical');
  const protocoloId2 = protocolResult2.lastInsertRowid;

  const insertIndicacion2 = db.prepare('INSERT INTO indicaciones_protocolo (protocolo_id, indicacion) VALUES (?, ?)');
  insertIndicacion2.run(protocoloId2, 'Dolor cervical crónico');
  insertIndicacion2.run(protocoloId2, 'Radiculopatía');

  const insertSequence2 = db.prepare(`
    INSERT INTO secuencias (
      protocolo_id, nombre_secuencia,
      tr_default, te_default, fov_default, slice_thickness_default, matrix_default, flip_default,
      orientation_default, averages_default, fat_suppression_default, phase_encoding_default,
      base_resolution_default, phase_resolution_default, phase_partial_fourier_default,
      phase_oversampling_default, concatenations_default, gradient_mode_default, multiband_factor_default,
      tr_min, tr_max, te_min, te_max, slice_thickness, flip_angle_min, flip_angle_max,
      phase_direction, matrix_size, fov_min, fov_max, gap_percentage, nex
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertSequence2.run(
    protocoloId2, 'T2_TSE_SAG',
    3500, 120, 180, 3.0, '320x320', 150,
    'Sagittal', 2, 'None', 'A >> P',
    320, 100, 'Off',
    0, 1, 'Normal', 1,
    3000, 4000, 100, 140, 3.0, 130, 150,
    'A >> P', '320x320', 160, 200, 10, 2
  );

  insertSequence2.run(
    protocoloId2, 'T1_TSE_TRA',
    600, 20, 180, 3.0, '320x320', 120,
    'Axial', 2, 'None', 'R >> L',
    320, 100, 'Off',
    0, 1, 'Normal', 1,
    500, 700, 15, 25, 3.0, 110, 130,
    'R >> L', '320x320', 160, 200, 10, 2
  );

  // Columna Lumbar
  const insertProtocol3 = db.prepare('INSERT INTO protocolos (nombre, descripcion) VALUES (?, ?)');
  const protocolResult3 = insertProtocol3.run('Columna Lumbar', 'Protocolo para estudio de columna lumbar');
  const protocoloId3 = protocolResult3.lastInsertRowid;

  const insertSequence3 = db.prepare(`
    INSERT INTO secuencias (
      protocolo_id, nombre_secuencia,
      tr_default, te_default, fov_default, slice_thickness_default, matrix_default, flip_default,
      orientation_default, averages_default, fat_suppression_default, phase_encoding_default,
      base_resolution_default, phase_resolution_default, phase_partial_fourier_default,
      phase_oversampling_default, concatenations_default, gradient_mode_default, multiband_factor_default,
      tr_min, tr_max, te_min, te_max, slice_thickness, flip_angle_min, flip_angle_max,
      phase_direction, matrix_size, fov_min, fov_max, gap_percentage, nex
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertSequence3.run(
    protocoloId3, 'T2_TSE_SAG',
    3500, 120, 250, 4.0, '320x320', 150,
    'Sagittal', 2, 'None', 'A >> P',
    320, 100, 'Off',
    0, 1, 'Normal', 1,
    3000, 4000, 100, 140, 4.0, 130, 150,
    'A >> P', '320x320', 220, 280, 10, 2
  );

  insertSequence3.run(
    protocoloId3, 'T1_TSE_TRA',
    600, 20, 250, 4.0, '320x320', 120,
    'Axial', 2, 'None', 'R >> L',
    320, 100, 'Off',
    0, 1, 'Normal', 1,
    500, 700, 15, 25, 4.0, 110, 130,
    'R >> L', '320x320', 220, 280, 10, 2
  );

  console.log('Additional protocols inserted: Columna Cervical, Columna Lumbar');
}

console.log('Database initialized at:', dbPath);

module.exports = db;