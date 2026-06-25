-- =====================================================
-- MRInativo: Migration Completa
-- Agrega todas las tablas faltantes + constraints + seed data
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- 1. TABLAS NUEVAS
-- =====================================================

-- Users (Auth + RBAC)
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

-- Pacientes
CREATE TABLE IF NOT EXISTS pacientes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    fecha_nacimiento VARCHAR(20),
    accession VARCHAR(50),
    hora VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_accession (accession)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Estudios (exams)
CREATE TABLE IF NOT EXISTS estudios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    paciente_id INT NOT NULL,
    user_id INT NOT NULL,
    protocolo_id INT NOT NULL,
    sala_id INT NULL,
    tipo_estudio VARCHAR(50) DEFAULT 'planificacion',
    estado ENUM('pending', 'active', 'completed', 'cancelled') DEFAULT 'pending',
    score_final DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (protocolo_id) REFERENCES protocolos(id) ON DELETE CASCADE,
    INDEX idx_estudios_user (user_id),
    INDEX idx_estudios_sala (sala_id),
    INDEX idx_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Parametros Secuencia
CREATE TABLE IF NOT EXISTS parametros_secuencia (
    id INT PRIMARY KEY AUTO_INCREMENT,
    estudio_id INT NOT NULL,
    secuencia_id INT DEFAULT 0,
    nombre_secuencia VARCHAR(100),
    tr DOUBLE PRECISION,
    te DOUBLE PRECISION,
    ti DOUBLE PRECISION DEFAULT 0,
    fov_read DOUBLE PRECISION,
    fov_phase DOUBLE PRECISION,
    slice_thickness DOUBLE PRECISION,
    slice_gap DOUBLE PRECISION,
    flip_angle DOUBLE PRECISION,
    matrix_size INT,
    nex DOUBLE PRECISION DEFAULT 1,
    phase_encoding VARCHAR(50),
    fat_sat TINYINT(1) DEFAULT 0,
    orientation VARCHAR(50),
    isocenter_x DOUBLE PRECISION DEFAULT 0,
    isocenter_y DOUBLE PRECISION DEFAULT 0,
    isocenter_z DOUBLE PRECISION DEFAULT 0,
    box_x DOUBLE PRECISION DEFAULT 0,
    box_y DOUBLE PRECISION DEFAULT 0,
    box_w DOUBLE PRECISION DEFAULT 0,
    box_h DOUBLE PRECISION DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (estudio_id) REFERENCES estudios(id) ON DELETE CASCADE,
    INDEX idx_parametros_estudio (estudio_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exam Results
CREATE TABLE IF NOT EXISTS exam_results (
    id INT PRIMARY KEY AUTO_INCREMENT,
    estudio_id INT NOT NULL,
    secuencia_nombre VARCHAR(100),
    score_total DECIMAL(5,2) NOT NULL,
    score_planificacion DECIMAL(5,2) NOT NULL,
    score_centraje DECIMAL(5,2) NOT NULL,
    score_contraste DECIMAL(5,2) NOT NULL,
    snr DECIMAL(5,2),
    contraste DECIMAL(5,2),
    ruido DECIMAL(5,2),
    artifacts DECIMAL(5,2),
    heatmap_data JSON,
    recomendaciones JSON,
    tiempo_total_segundos INT,
    errores_count INT DEFAULT 0,
    passed_count INT DEFAULT 0,
    total_checks INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (estudio_id) REFERENCES estudios(id) ON DELETE CASCADE,
    INDEX idx_estudio (estudio_id),
    INDEX idx_score (score_total)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Usuario XP
CREATE TABLE IF NOT EXISTS usuario_xp (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL UNIQUE,
    xp_total INT DEFAULT 0,
    nivel INT DEFAULT 1,
    racha_dias INT DEFAULT 0,
    ultimo_examen DATE,
    examenes_totales INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_usuario_xp (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Logros
CREATE TABLE IF NOT EXISTS logros (
    id INT PRIMARY KEY AUTO_INCREMENT,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    icono VARCHAR(50),
    xp_reward INT DEFAULT 100,
    categoria ENUM('secuencia', 'protocolo', 'tiempo', 'streak', 'especial') DEFAULT 'secuencia',
    criterio JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_codigo (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Usuario Logros
CREATE TABLE IF NOT EXISTS usuario_logros (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    logro_id INT NOT NULL,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (logro_id) REFERENCES logros(id) ON DELETE CASCADE,
    UNIQUE KEY unique_usuario_logro (usuario_id, logro_id),
    INDEX idx_usuario_logros (usuario_id),
    INDEX idx_logro_id (logro_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Evaluaciones Teoricas
CREATE TABLE IF NOT EXISTS evaluaciones_teoricas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    duracion_minutos INT DEFAULT 30,
    intentos_maximos INT DEFAULT 3,
    es_obligatoria BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Preguntas
CREATE TABLE IF NOT EXISTS preguntas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    evaluacion_id INT NOT NULL,
    pregunta TEXT NOT NULL,
    tipo ENUM('opcion_multiple', 'verdadero_falso', 'respuesta_corta') DEFAULT 'opcion_multiple',
    opciones JSON,
    respuesta_correcta TEXT NOT NULL,
    explicacion TEXT,
    peso INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (evaluacion_id) REFERENCES evaluaciones_teoricas(id) ON DELETE CASCADE,
    INDEX idx_evaluacion (evaluacion_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Resultados Pretest
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
    FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (evaluacion_id) REFERENCES evaluaciones_teoricas(id) ON DELETE CASCADE,
    INDEX idx_usuario (usuario_id),
    INDEX idx_evaluacion (evaluacion_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Salas (multiplayer sessions)
CREATE TABLE IF NOT EXISTS salas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    docente_id INT NOT NULL,
    estado ENUM('esperando', 'activa', 'finalizada') DEFAULT 'esperando',
    config_json JSON,
    started_at TIMESTAMP NULL,
    ended_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (docente_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_estado (estado),
    INDEX idx_docente (docente_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sala Participantes
CREATE TABLE IF NOT EXISTS sala_participantes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sala_id INT NOT NULL,
    usuario_id INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    score_acumulado DECIMAL(8,2) DEFAULT 0,
    examenes_completados INT DEFAULT 0,
    FOREIGN KEY (sala_id) REFERENCES salas(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_sala_usuario (sala_id, usuario_id),
    INDEX idx_sala (sala_id),
    INDEX idx_usuario (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Sessions (JWT blacklist)
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP NULL,
    FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token_hash),
    INDEX idx_expires (expires_at),
    INDEX idx_usuario_session (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 2. FOREIGN KEY CONSTRAINTS EN TABLAS EXISTENTES
-- =====================================================

ALTER TABLE protocolo_categorias
    ADD CONSTRAINT fk_pc_protocolo FOREIGN KEY (protocolo_id) REFERENCES protocolos(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_pc_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE;

ALTER TABLE indicaciones_protocolo
    ADD CONSTRAINT fk_ip_protocolo FOREIGN KEY (protocolo_id) REFERENCES protocolos(id) ON DELETE CASCADE;

ALTER TABLE contraindicaciones_protocolo
    ADD CONSTRAINT fk_cp_protocolo FOREIGN KEY (protocolo_id) REFERENCES protocolos(id) ON DELETE CASCADE;

ALTER TABLE preparacion_paciente
    ADD CONSTRAINT fk_pp_protocolo FOREIGN KEY (protocolo_id) REFERENCES protocolos(id) ON DELETE CASCADE;

ALTER TABLE posicionamiento_paciente
    ADD CONSTRAINT fk_posp_protocolo FOREIGN KEY (protocolo_id) REFERENCES protocolos(id) ON DELETE CASCADE;

-- =====================================================
-- 3. SEED DATA
-- =====================================================

-- Users (bcrypt hash de admin123/docente123/alumno123)
INSERT INTO users (id, email, password_hash, nombre, role) VALUES
(1, 'admin@facultad.edu', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.1M7S3xwJXMQV7lVxGy', 'Administrador', 'admin'),
(2, 'docente@facultad.edu', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.1M7S3xwJXMQV7lVxGy', 'Docente Demo', 'docente'),
(3, 'alumno@uni.edu', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.1M7S3xwJXMQV7lVxGy', 'Alumno Demo', 'estudiante');

-- Pacientes
INSERT INTO pacientes (nombre, fecha_nacimiento, accession, hora) VALUES
('vidOps', '15/03/1985', 'MR48291', '08:30'),
('johDoe', '22/07/1990', 'MR48292', '09:00'),
('marPop', '10/11/1978', 'MR48293', '09:30'),
('pamWin', '05/04/1995', 'MR48294', '10:00'),
('tomCru', '30/12/1982', 'MR48295', '10:30');

-- Logros
INSERT INTO logros (codigo, nombre, descripcion, icono, xp_reward, categoria, criterio) VALUES
('FIRST_EXAM', 'Primer Examen', 'Completaste tu primer examen', 'star', 50, 'especial', '{"exam_count": 1}'),
('T2_MASTER', 'Maestro T2', 'Obtén 95% o más en 5 exams T2', 'award', 200, 'secuencia', '{"sequence": "T2", "min_score": 95, "min_count": 5}'),
('PERFECT_SCORE', 'Perfección', 'Obtén 100% en cualquier examen', 'trophy', 300, 'especial', '{"score": 100}'),
('SPEED_RUN', 'Speed Runner', 'Completa un examen en menos de 5 minutos', 'zap', 150, 'tiempo', '{"max_minutes": 5}'),
('STREAK_7', 'Semana Perfecta', '7 días consecutivos de exámenes', 'flame', 500, 'streak', '{"days": 7}'),
('DWI_EXPERT', 'Experto DWI', 'Domina las secuencias de difusión', 'brain', 200, 'secuencia', '{"sequence": "DWI", "min_score": 90}'),
('NEURO_COMPLETE', 'Neuro Completo', 'Completa exams de todas las subcategorías neuro', 'brain', 400, 'protocolo', '{"category": "neuro"}'),
('STUDY_STREAK', 'Dedicación', '10 exámenes completados', 'target', 100, 'especial', '{"exam_count": 10}');

-- Usuario XP (inicializa para users existentes)
INSERT INTO usuario_xp (usuario_id, xp_total, nivel) VALUES
(1, 0, 1),
(2, 0, 1),
(3, 0, 1);

-- Evaluaciones Teoricas
INSERT INTO evaluaciones_teoricas (id, titulo, descripcion, duracion_minutos, es_obligatoria) VALUES
(1, 'Pre-Test Basal: Fundamentos de RMN', 'Evaluación de conocimientos básicos de resonancia magnética nuclear', 30, TRUE);

-- Preguntas
INSERT INTO preguntas (evaluacion_id, pregunta, tipo, opciones, respuesta_correcta, explicacion, peso) VALUES
(1, '¿Qué representa el tiempo de repetición (TR)?', 'opcion_multiple',
 '{"a": "Tiempo entre pulsos de excitación", "b": "Tiempo de eco", "c": "Tiempo de inversión", "d": "Tiempo de adquisición"}',
 'a', 'El TR (Tiempo de Repetición) es el tiempo entre dos pulsos de excitación consecutivos.', 2),

(1, '¿Cuál es el efecto del TR largo en la imagen?', 'opcion_multiple',
 '{"a": "Aumenta el contraste T1", "b": "Disminuye el T1", "c": "Elimina el contraste T1", "d": "No afecta el contraste"}',
 'c', 'Con TR largo (>1500ms), la magnetización longitudinal se recupera completamente, eliminando el contraste T1.', 2),

(1, '¿Qué secuencia es mejor para visualizar edema?', 'opcion_multiple',
 '{"a": "T1", "b": "T2 FLAIR", "c": "DWI", "d": "GRE"}',
 'b', 'T2 FLAIR suprime la señal del LCR y resalta el edema cerebral como áreas hiperintensas.', 2),

(1, 'El tiempo de eco (TE) largo favorece el contraste:', 'opcion_multiple',
 '{"a": "T1", "b": "T2", "c": "PD", "d": "Ninguna"}',
 'b', 'TE largo permite que tejidos con T2 largo mantengan su magnetización transversal, apareciendo brillantes en T2.', 2),

(1, '¿Qué tipo de contraste usa la secuencia DWI?', 'opcion_multiple',
 '{"a": "T1", "b": "T2", "c": "Difusión molecular", "d": "Susceptibilidad"}',
 'c', 'DWI (Diffusion Weighted Imaging) codifica el movimiento browniano de las moléculas de agua.', 2),

(1, '¿Cuál es la función del ángulo de flip?', 'opcion_multiple',
 '{"a": "Controlar el plano de corte", "b": "Determinar la cantidad de excitación", "c": "Ajustar el tiempo de eco", "d": "Modificar la frecuencia"}',
 'b', 'El ángulo de flip controla cuánta magnetización se voltea hacia el plano transversal, afectando SNR y contraste.', 2),

(1, 'En una secuencia FLAIR, ¿para qué se usa el TI?', 'opcion_multiple',
 '{"a": "Calcular el TR", "b": "Suprimir señal del LCR", "c": "Aumentar el TE", "d": "Reducir artifacts"}',
 'b', 'El TI (Tiempo de Inversión) en FLAIR se elige para que coincida con el T1 del LCR, suprimiendo su señal.', 2),

(1, '¿Qué representa el campo de visión (FOV)?', 'opcion_multiple',
 '{"a": "Grosor del slice", "b": "Área de cobertura en la imagen", "c": "Resolución de la imagen", "d": "Número de slices"}',
 'b', 'FOV (Field of View) es el área física que se cubre del paciente y se representa en la imagen.', 2),

(1, '¿Qué relación hay entre resolución y SNR?', 'opcion_multiple',
 '{"a": "Mayor resolución = Mayor SNR", "b": "Mayor resolución = Menor SNR", "c": "No hay relación", "d": "Depende del TR"}',
 'b', 'Mayor resolución (voxel más pequeño) captura menos señal, reduciendo la SNR.', 2),

(1, '¿Qué son las saturation bands?', 'opcion_multiple',
 '{"a": "Regiones que brillan más", "b": "Regiones sin señal por saturación", "c": "Bandas de ruido", "d": "Artifacts de movimiento"}',
 'b', 'Las SAT bands son pulsos de saturación que eliminan la señal de regiones específicas para reducir artifacts.', 1);

SET FOREIGN_KEY_CHECKS = 1;
