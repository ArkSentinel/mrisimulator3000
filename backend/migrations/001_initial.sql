-- =====================================================
-- ScRmhoot v2: Schema de Migración
--包含: Usuarios, Categorías jerárquicas, Exam Results
-- =====================================================

-- =====================================================
-- 1. TABLA DE USUARIOS (Auth + RBAC)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    role ENUM('estudiante', 'docente', 'admin') NOT NULL DEFAULT 'estudiante',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Usuario admin por defecto: admin@facultad.edu / admin123
INSERT INTO users (email, password_hash, nombre, role) VALUES
('admin@facultad.edu', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.1M7S3xwJXMQV7lVxGy', 'Administrador', 'admin');

-- =====================================================
-- 2. CATEGORÍAS JERÁRQUICAS (MRI Anatomical Regions)
-- =====================================================
CREATE TABLE IF NOT EXISTS categorias (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    nombre_corto VARCHAR(50),
    padre_id INT NULL,
    orden INT DEFAULT 0,
    icono VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (padre_id) REFERENCES categorias(id) ON DELETE SET NULL,
    INDEX idx_padre (padre_id),
    INDEX idx_orden (orden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 3. RELACIÓN PROTOCOLO-CATEGORÍA (Many-to-Many)
-- =====================================================
CREATE TABLE IF NOT EXISTS protocolo_categorias (
    protocolo_id INT,
    categoria_id INT,
    es_primaria BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (protocolo_id, categoria_id),
    FOREIGN KEY (protocolo_id) REFERENCES protocolos(id) ON DELETE CASCADE,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 4. TABLA DE SESIONES SALA (Instanciación de Sala)
-- =====================================================
CREATE TABLE IF NOT EXISTS salas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    docente_id INT NOT NULL,
    estado ENUM('esperando', 'activa', 'finalizada') DEFAULT 'esperando',
    config_json JSON,
    started_at TIMESTAMP NULL,
    ended_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (docente_id) REFERENCES users(id),
    INDEX idx_estado (estado),
    INDEX idx_docente (docente_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sala_participantes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sala_id INT NOT NULL,
    usuario_id INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    score_acumulado DECIMAL(8,2) DEFAULT 0,
    examenes_completados INT DEFAULT 0,
    FOREIGN KEY (sala_id) REFERENCES salas(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES users(id),
    UNIQUE KEY unique_sala_usuario (sala_id, usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 5. TABLA DE RESULTADOS DETALLADOS POR EXAMEN
-- =====================================================
CREATE TABLE IF NOT EXISTS exam_results (
    id INT PRIMARY KEY AUTO_INCREMENT,
    estudio_id INT NOT NULL,
    secuencia_nombre VARCHAR(100),
    -- Scores ponderados
    score_total DECIMAL(5,2) NOT NULL,
    score_planificacion DECIMAL(5,2) NOT NULL,  -- 30%
    score_centraje DECIMAL(5,2) NOT NULL,        -- 30%
    score_contraste DECIMAL(5,2) NOT NULL,       -- 40%
    -- Métricas de calidad
    snr DECIMAL(5,2),
    contraste DECIMAL(5,2),
    ruido DECIMAL(5,2),
    artifacts DECIMAL(5,2),
    -- Heatmap de errores (vector JSON)
    heatmap_data JSON,
    -- Recomendaciones
    recomendaciones JSON,
    -- Metadatos
    tiempo_total_segundos INT,
    errores_count INT DEFAULT 0,
    passed_count INT DEFAULT 0,
    total_checks INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (estudio_id) REFERENCES estudios(id) ON DELETE CASCADE,
    INDEX idx_estudio (estudio_id),
    INDEX idx_score (score_total)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 6. PRE-TEST Y EVALUACIONES TEÓRICAS
-- =====================================================
CREATE TABLE IF NOT EXISTS evaluaciones_teoricas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    duracion_minutos INT DEFAULT 30,
    intentos_maximos INT DEFAULT 3,
    es_obligatoria BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS preguntas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    evaluacion_id INT NOT NULL,
    pregunta TEXT NOT NULL,
    tipo ENUM('opcion_multiple', 'verdadero_falso', 'respuesta_corta') DEFAULT 'opcion_multiple',
    opciones JSON,
    respuesta_correcta TEXT NOT NULL,
    explicacion TEXT,
    peso INT DEFAULT 1,
    FOREIGN KEY (evaluacion_id) REFERENCES evaluaciones_teoricas(id) ON DELETE CASCADE,
    INDEX idx_evaluacion (evaluacion_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS resultados_pretest (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    evaluacion_id INT NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    respuestas JSON,
    tiempo_tomado_segundos INT,
    aprobo BOOLEAN DEFAULT FALSE,
    attempt_number INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES users(id),
    FOREIGN KEY (evaluacion_id) REFERENCES evaluaciones_teoricas(id),
    INDEX idx_usuario (usuario_id),
    INDEX idx_evaluacion (evaluacion_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 7. ACHIEVEMENTS / LOGROS
-- =====================================================
CREATE TABLE IF NOT EXISTS logros (
    id INT PRIMARY KEY AUTO_INCREMENT,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    icono VARCHAR(50),
    xp_reward INT DEFAULT 100,
    categoria ENUM('secuencia', 'protocolo', 'tiempo', 'streak', 'especial') DEFAULT 'secuencia',
    criterio JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS usuario_logros (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    logro_id INT NOT NULL,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (logro_id) REFERENCES logros(id) ON DELETE CASCADE,
    UNIQUE KEY unique_usuario_logro (usuario_id, logro_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 8. XP Y PROGRESIÓN
-- =====================================================
CREATE TABLE IF NOT EXISTS usuario_xp (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL UNIQUE,
    xp_total INT DEFAULT 0,
    nivel INT DEFAULT 1,
    racha_dias INT DEFAULT 0,
    ultimo_examen DATE,
    examenes_totales INT DEFAULT 0,
    FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inicializar XP para usuarios existentes
INSERT INTO usuario_xp (usuario_id, xp_total, nivel)
SELECT id, 0, 1 FROM users;

-- =====================================================
-- 9. SESSIONS (JWT Blacklist para logout)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP NULL,
    FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token_hash),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- POBLAR CATEGORÍAS JERÁRQUICAS
-- =====================================================
INSERT INTO categorias (id, nombre, nombre_corto, padre_id, orden, icono) VALUES
-- Nivel 1: Regiones principales
(1, 'NEURO', 'Neuro', NULL, 1, 'brain'),
(2, 'MSK', 'MSK', NULL, 2, 'bone'),
(3, 'BODY', 'Body', NULL, 3, 'body'),
(4, 'VASCULAR', 'Vascular', NULL, 4, 'heart'),

-- Nivel 2: Subregiones Neuro
(10, 'Cerebro', 'Cerebro', 1, 1, NULL),
(11, 'Columna', 'Columna', 1, 2, NULL),
(12, 'Cabeza y Cuello', 'Cabeza/Cuello', 1, 3, NULL),

-- Nivel 3: Cerebro
(20, 'Fosa Posterior', 'Fosa Posterior', 10, 1, NULL),
(21, 'Parénquima Cerebral', 'Parénquima', 10, 2, NULL),
(22, 'Hipotálamo y Silla Turca', 'Hipotálamo', 10, 3, NULL),
(23, 'Epilepsia', 'Epilepsia', 10, 4, NULL),
(24, 'Esclerosis Múltiple', 'EM', 10, 5, NULL),

-- Nivel 3: Columna
(30, 'Columna Cervical', 'Cervical', 11, 1, NULL),
(31, 'Columna Torácica', 'Torácica', 11, 2, NULL),
(32, 'Columna Lumbar', 'Lumbar', 11, 3, NULL),
(33, 'Medula Espinal', 'Médula', 11, 4, NULL),

-- Nivel 3: Cabeza y Cuello
(40, 'Orbitas', 'Orbitas', 12, 1, NULL),
(41, 'Oídos (IAM)', 'IAM', 12, 2, NULL),
(42, 'Articulación Temporomandibular (ATM)', 'ATM', 12, 3, NULL),
(43, 'Senos Paranasales', 'Senos', 12, 4, NULL),
(44, 'Partes Blandas del Cuello', 'Cuello', 12, 5, NULL),
(45, 'Plexo Braquial', 'Plexo', 12, 6, NULL),
(46, 'Glándulas Salivales (Sialografía)', 'Salivales', 12, 7, NULL),

-- Nivel 2: MSK
(50, 'Miembro Superior', 'MSup', 2, 1, NULL),
(51, 'Miembro Inferior', 'MInf', 2, 2, NULL),
(52, 'Pelvis y Cadera', 'Pelvis', 2, 3, NULL),
(53, 'Tórax Óseo', 'Tórax', 2, 4, NULL),

-- Nivel 3: MSK Miembro Superior
(60, 'Hombro', 'Hombro', 50, 1, NULL),
(61, 'Codo', 'Codo', 50, 2, NULL),
(62, 'Muñeca y Mano', 'Muñeca', 50, 3, NULL),
(63, 'Antebrazo', 'Antebrazo', 50, 4, NULL),
(64, 'Brazo', 'Brazo', 50, 5, NULL),

-- Nivel 3: MSK Miembro Inferior
(70, 'Rodilla', 'Rodilla', 51, 1, NULL),
(71, 'Tobillo y Pie', 'Tobillo', 51, 2, NULL),
(72, 'Cadera', 'Cadera', 51, 3, NULL),
(73, 'Muslo', 'Muslo', 51, 4, NULL),
(74, 'Pierna', 'Pierna', 51, 5, NULL),

-- Nivel 3: MSK Pelvis
(80, 'Sacro y Cóccix', 'Sacro', 52, 1, NULL),
(81, 'Artrografía de Cadera', 'Artro Cadera', 52, 2, NULL),

-- Nivel 2: BODY
(90, 'Abdomen', 'Abdomen', 3, 1, NULL),
(91, 'Pelvis', 'Pelvis', 3, 2, NULL),
(92, 'Mama', 'Mama', 3, 3, NULL),

-- Nivel 3: Abdomen
(100, 'Hígado', 'Hígado', 90, 1, NULL),
(101, 'Riñones y Vías Urinarias', 'Riñones', 90, 2, NULL),
(102, 'Páncreas', 'Páncreas', 90, 3, NULL),
(103, 'Vía Biliar (MRCP)', 'MRCP', 90, 4, NULL),
(104, 'Suprarrenales', 'Suprarrenales', 90, 5, NULL),
(105, 'Intestino Delgado', 'I. Delgado', 90, 6, NULL),
(106, 'Abdomen General', 'Abdomen Gen', 90, 7, NULL),

-- Nivel 3: Pelvis
(110, 'Próstata', 'Próstata', 91, 1, NULL),
(111, 'Recto y Canal Anal', 'Recto', 91, 2, NULL),
(112, 'Ginecológico', 'Gineco', 91, 3, NULL),
(113, 'Uretral', 'Uretral', 91, 4, NULL),
(114, 'Testículos', 'Testículos', 91, 5, NULL),
(115, 'Pene', 'Pene', 91, 6, NULL),
(116, 'Obstétrico', 'Obstétrico', 91, 7, NULL),
(117, 'Urografía', 'Urografía', 91, 8, NULL),

-- Nivel 3: Mama
(120, 'Mama con Implantes', 'Implantes', 92, 1, NULL),
(121, 'Mama Biopsia', 'Biopsia', 92, 2, NULL),

-- Nivel 2: VASCULAR
(130, 'MRA Cerebral', 'MRA Cerebral', 4, 1, NULL),
(131, 'MRA Cuello', 'MRA Cuello', 4, 2, NULL),
(132, 'MRA Renal', 'MRA Renal', 4, 3, NULL),
(133, 'MRA Miembros', 'MRA Miembros', 4, 4, NULL),
(134, 'Angiografía de Cuerpo Entero', 'Cuerpo Entero', 4, 5, NULL);

-- =====================================================
-- LOGROS PREDEFINIDOS
-- =====================================================
INSERT INTO logros (codigo, nombre, descripcion, icono, xp_reward, categoria, criterio) VALUES
('FIRST_EXAM', 'Primer Examen', 'Completaste tu primer examen', 'star', 50, 'especial', '{"exam_count": 1}'),
('T2_MASTER', 'Maestro T2', 'Obtén 95% o más en 5 exams T2', 'award', 200, 'secuencia', '{"sequence": "T2", "min_score": 95, "min_count": 5}'),
('PERFECT_SCORE', 'Perfección', 'Obtén 100% en cualquier examen', 'trophy', 300, 'especial', '{"score": 100}'),
('SPEED_RUN', 'Speed Runner', 'Completa un examen en menos de 5 minutos', 'zap', 150, 'tiempo', '{"max_minutes": 5}'),
('STREAK_7', 'Semana Perfecta', '7 días consecutivos de exámenes', 'flame', 500, 'streak', '{"days": 7}'),
('DWI_EXPERT', 'Experto DWI', 'Domina las secuencias de difusión', 'brain', 200, 'secuencia', '{"sequence": "DWI", "min_score": 90}'),
('NEURO_COMPLETE', 'Neuro Completo', 'Completa exams de todas las subcategorías neuro', 'brain', 400, 'protocolo', '{"category": "neuro"}'),
('STUDY_STREAK', 'Dedicación', '10 exámenes completados', 'target', 100, 'especial', '{"exam_count": 10}');

-- =====================================================
-- EVALUACIÓN PRE-TEST BASAL (Preguntas de ejemplo)
-- =====================================================
INSERT INTO evaluaciones_teoricas (titulo, descripcion, duracion_minutos, es_obligatoria) VALUES
('Pre-Test Basal: Fundamentos de RMN', 'Evaluación de conocimientos básicos de resonancia magnética nuclear', 30, TRUE);

INSERT INTO preguntas (evaluacion_id, pregunta, tipo, opciones, respuesta_correcta, explicacion, peso) VALUES
(1, '¿Qué representa el tiempo de repetición (TR)?', 'opcion_multiple', '{"a": "Tiempo entre pulsos de excitación", "b": "Tiempo de eco", "c": "Tiempo de inversión", "d": "Tiempo de adquisición"}', 'a', 'El TR (Tiempo de Repetición) es el tiempo entre dos pulsos de excitación consecutivos en una secuencia de pulso.', 2),

(1, '¿Cuál es el efecto del TR largo en la imagen?', 'opcion_multiple', '{"a": "Aumenta el contraste T1", "b": "Disminuye el T1", "c": "Elimina el contraste T1", "d": "No afecta el contraste"}', 'c', 'Con TR largo (mayor a 1500ms), la magnetización longitudinal se recupera completamente antes del siguiente pulso, eliminando el contraste T1.', 2),

(1, '¿Qué secuencia es mejor para visualizar edema?', 'opcion_multiple', '{"a": "T1", "b": "T2 FLAIR", "c": "DWI", "d": "GRE"}', 'b', 'T2 FLAIR suprime el señal del LCR y resalta el edema cerebral como áreas hiperintensas.', 2),

(1, 'El tiempo de eco (TE) largo favorece el contraste:', 'opcion_multiple', '{"a": "T1", "b": "T2", "c": "PD", "d": "Ninguna"}', 'b', 'TE largo permite que los tejidos con T2 largo (como el agua) mantengan su magnetización transversal, apareciendo brillantes en T2.', 2),

(1, '¿Qué tipo de contraste usa la secuencia DWI?', 'opcion_multiple', '{"a": "T1", "b": "T2", "c": "Difusión molecular", "d": "Susceptibilidad"}', 'c', 'DWI (Diffusion Weighted Imaging) codifica el movimiento browniano de las moléculas de agua.', 2),

(1, '¿Cuál es la función del ángulo de flip?', 'opcion_multiple', '{"a": "Controlar el plano de corte", "b": "Determinar la cantidad de excitación", "c": "Ajustar el tiempo de eco", "d": "Modificar la frecuencia"}', 'b', 'El ángulo de flip controla cuánta magnetización se voltea hacia el plano transversal, afectando SNR y contraste.', 2),

(1, 'En una secuencia FLAIR, ¿para qué se usa el TI?', 'opcion_multiple', '{"a": "Calcular el TR", "b": "Suprimir señal del LCR", "c": "Aumentar el TE", "d": "Reducir artifacts"}', 'b', 'El TI (Tiempo de Inversión) en FLAIR se elige para que coincida con el T1 del LCR, suprimiendo su señal.', 2),

(1, '¿Qué representa el campo de visión (FOV)?', 'opcion_multiple', '{"a": "Grosor del slice", "b": "Área de cobertura en la imagen", "c": "Resolución de la imagen", "d": "Número de slices"}', 'b', 'FOV (Field of View) es el área física que se cubre en el paciente y se representa en la imagen.', 2),

(1, '¿Qué relación hay entre resolución y SNR?', 'opcion_multiple', '{"a": "Mayor resolución = Mayor SNR", "b": "Mayor resolución = Menor SNR", "c": "No hay relación", "d": "Depende del TR"}', 'b', 'Mayor resolución (matriz más grande, voxel más pequeño) captura menos señal, reduciendo la SNR.', 2),

(1, '¿Qué son las saturation bands (bandas de saturación)?', 'opcion_multiple', '{"a": "Regiones que brillan más", "b": "Regiones sin señal por saturación", "c": "Bandas de ruido", "d": "Artifacts de movimiento"}', 'b', 'Las SAT bands son pulsos de saturación que eliminan la señal de regiones específicas para reducir artifacts.', 1);

-- =====================================================
-- ACTUALIZAR ESTRUCTURA DE ESTUDIOS PARA XP
-- =====================================================
ALTER TABLE estudios ADD COLUMN IF NOT EXISTS user_id INT AFTER protocolo_id;
ALTER TABLE estudios ADD COLUMN IF NOT EXISTS sala_id INT NULL AFTER user_id;
ALTER TABLE estudios ADD COLUMN IF NOT EXISTS score_final DECIMAL(5,2) AFTER estado;

CREATE INDEX IF NOT EXISTS idx_estudios_user ON estudios(user_id);
CREATE INDEX IF NOT EXISTS idx_estudios_sala ON estudios(sala_id);

-- =====================================================
-- PROCEDIMIENTO: Mapear protocolos existentes a categorías
-- =====================================================
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS mapear_protocolos_categorias()
BEGIN
    -- Neuro Cerebro
    INSERT IGNORE INTO protocolo_categorias (protocolo_id, categoria_id, es_primaria)
    SELECT p.id, 21, TRUE FROM protocolos p
    WHERE p.anatomical_region LIKE '%Brain%' OR p.anatomical_region LIKE '%Cerebr%';

    -- Fosa Posterior
    INSERT IGNORE INTO protocolo_categorias (protocolo_id, categoria_id, es_primaria)
    SELECT p.id, 20, TRUE FROM protocolos p
    WHERE p.anatomical_region LIKE '%posterior fossa%' OR p.anatomical_region LIKE '%IAM%';

    -- Columna
    INSERT IGNORE INTO protocolo_categorias (protocolo_id, categoria_id, es_primaria)
    SELECT p.id, 11, TRUE FROM protocolos p
    WHERE p.anatomical_region LIKE '%Spine%' OR p.anatomical_region LIKE '%Columna%'
    OR p.anatomical_region LIKE '%Cervical%' OR p.anatomical_region LIKE '%Lumbar%';

    -- Orbitas
    INSERT IGNORE INTO protocolo_categorias (protocolo_id, categoria_id, es_primaria)
    SELECT p.id, 40, TRUE FROM protocolos p
    WHERE p.anatomical_region LIKE '%Orbit%';

    -- MSK - Rodilla
    INSERT IGNORE INTO protocolo_categorias (protocolo_id, categoria_id, es_primaria)
    SELECT p.id, 70, TRUE FROM protocolos p
    WHERE p.anatomical_region LIKE '%Knee%';

    -- MSK - Hombro
    INSERT IGNORE INTO protocolo_categorias (protocolo_id, categoria_id, es_primaria)
    SELECT p.id, 60, TRUE FROM protocolos p
    WHERE p.anatomical_region LIKE '%Shoulder%';

    -- MSK - Cadera
    INSERT IGNORE INTO protocolo_categorias (protocolo_id, categoria_id, es_primaria)
    SELECT p.id, 72, TRUE FROM protocolos p
    WHERE p.anatomical_region LIKE '%Hip%' OR p.anatomical_region LIKE '%Arthrogram%';

    -- Body - Hígado
    INSERT IGNORE INTO protocolo_categorias (protocolo_id, categoria_id, es_primaria)
    SELECT p.id, 100, TRUE FROM protocolos p
    WHERE p.anatomical_region LIKE '%Liver%';

    -- Body - Riñones
    INSERT IGNORE INTO protocolo_categorias (protocolo_id, categoria_id, es_primaria)
    SELECT p.id, 101, TRUE FROM protocolos p
    WHERE p.anatomical_region LIKE '%Kidney%' OR p.anatomical_region LIKE '%Renal%';

    -- Body - Mama
    INSERT IGNORE INTO protocolo_categorias (protocolo_id, categoria_id, es_primaria)
    SELECT p.id, 92, TRUE FROM protocolos p
    WHERE p.anatomical_region LIKE '%Breast%';

    -- Vascular MRA
    INSERT IGNORE INTO protocolo_categorias (protocolo_id, categoria_id, es_primaria)
    SELECT p.id, 130, TRUE FROM protocolos p
    WHERE p.anatomical_region LIKE '%MRA%' OR p.anatomical_region LIKE '%Angio%';
END//

DELIMITER ;

-- Ejecutar mapeo
CALL mapear_protocolos_categorias();
