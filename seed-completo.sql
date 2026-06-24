-- =====================================================
-- MRInativo — Seed Completo
-- Borra todos los datos existentes e inserta fresh data
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE resultados_pretest;
TRUNCATE TABLE preguntas;
TRUNCATE TABLE evaluaciones_teoricas;
TRUNCATE TABLE usuario_logros;
TRUNCATE TABLE logros;
TRUNCATE TABLE protocolo_categorias;
TRUNCATE TABLE sala_participantes;
TRUNCATE TABLE salas;
TRUNCATE TABLE user_sessions;
TRUNCATE TABLE usuario_xp;
TRUNCATE TABLE exam_results;
TRUNCATE TABLE parametros_secuencia;
TRUNCATE TABLE estudios;
TRUNCATE TABLE secuencias;
TRUNCATE TABLE posicionamiento_paciente;
TRUNCATE TABLE preparacion_paciente;
TRUNCATE TABLE contraindicaciones_protocolo;
TRUNCATE TABLE indicaciones_protocolo;
TRUNCATE TABLE protocolos;
TRUNCATE TABLE categorias;
TRUNCATE TABLE pacientes;
TRUNCATE TABLE users;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- 1. USUARIOS
-- =====================================================
INSERT INTO users (id, email, password_hash, nombre, role) VALUES
(1, 'admin@facultad.edu', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.1M7S3xwJXMQV7lVxGy', 'Administrador', 'admin'),
(2, 'docente@facultad.edu', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.1M7S3xwJXMQV7lVxGy', 'Docente Demo', 'docente'),
(3, 'alumno@uni.edu', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.1M7S3xwJXMQV7lVxGy', 'Alumno Demo', 'estudiante');

-- =====================================================
-- 2. PACIENTES
-- =====================================================
INSERT INTO pacientes (nombre, fecha_nacimiento, accession, hora) VALUES
('vidOps', '15/03/1985', 'MR48291', '08:30'),
('johDoe', '22/07/1990', 'MR48292', '09:00'),
('marPop', '10/11/1978', 'MR48293', '09:30'),
('pamWin', '05/04/1995', 'MR48294', '10:00'),
('tomCru', '30/12/1982', 'MR48295', '10:30');

-- =====================================================
-- 3. CATEGORÍAS JERÁRQUICAS
-- =====================================================
INSERT INTO categorias (id, nombre, nombre_corto, padre_id, orden, icono) VALUES
-- Nivel 1
(1, 'NEURO', 'Neuro', NULL, 1, 'brain'),
(2, 'MSK', 'MSK', NULL, 2, 'bone'),
(3, 'BODY', 'Body', NULL, 3, 'body'),
(4, 'VASCULAR', 'Vascular', NULL, 4, 'heart'),
-- Nivel 2: Neuro
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
-- 4. PROTOCOLOS
-- =====================================================
INSERT INTO protocolos (id, nombre, descripcion, anatomical_region, indications, source_url) VALUES
(1, 'Cerebro de Rutina', 'Protocolo estándar para estudio de encéfalo', 'Brain', 'Dolor de cabeza crónico|Evaluación de lesiones|Control postquirúrgico|Enfermedades neurodegenerativas', NULL),
(2, 'Columna Cervical', 'Protocolo para estudio de columna cervical', 'Spine Cervical', 'Dolor cervical crónico|Radiculopatía', NULL),
(3, 'Columna Lumbar', 'Protocolo para estudio de columna lumbar', 'Spine Lumbar', 'Lumbalgia|Ciática|Estenosis de canal', NULL);

-- =====================================================
-- 5. TABLAS AUXILIARES DE PROTOCOLOS
-- =====================================================
INSERT INTO indicaciones_protocolo (protocolo_id, indicacion) VALUES
(1, 'Dolor de cabeza crónico'),
(1, 'Evaluación de lesiones ocupantes de espacio'),
(1, 'Control postquirúrgico'),
(1, 'Estudio de enfermedades neurodegenerativas'),
(2, 'Dolor cervical crónico'),
(2, 'Radiculopatía'),
(3, 'Lumbalgia'),
(3, 'Ciática'),
(3, 'Estenosis de canal');

INSERT INTO contraindicaciones_protocolo (protocolo_id, contraindicacion) VALUES
(1, 'Marcapasos cardiacos no compatibles con RM'),
(1, 'Clips aneurismales cerebrales antiguos'),
(1, 'Implantes cocleares no compatibles'),
(2, 'Marcapasos cardiacos no compatibles con RM'),
(2, 'Implantes metálicos no compatibles'),
(3, 'Marcapasos cardiacos no compatibles con RM'),
(3, 'Implantes metálicos no compatibles');

INSERT INTO preparacion_paciente (protocolo_id, instruccion) VALUES
(1, 'Retirar objetos metálicos'),
(1, 'Ayuno de 4 horas si se usa contraste'),
(1, 'Presentar estudios previos si existen'),
(2, 'Retirar objetos metálicos'),
(2, 'Cuestionario de seguridad RM'),
(3, 'Retirar objetos metálicos'),
(3, 'Cuestionario de seguridad RM');

INSERT INTO posicionamiento_paciente (protocolo_id, instruccion) VALUES
(1, 'Paciente en decúbito supino'),
(1, 'Cabeza centrada en bobina craneal'),
(1, 'Alinear plano orbitomeatal'),
(2, 'Paciente en decúbito supino'),
(2, 'Cuello centrado en bobina cervical'),
(3, 'Paciente en decúbito supino'),
(3, 'Columna lumbar centrada en bobina espinal');

-- =====================================================
-- 6. SECUENCIAS
-- =====================================================
INSERT INTO secuencias (protocolo_id, nombre_secuencia, plane,
  tr_default, te_default, fov_default, slice_thickness_default, matrix_default, flip_default,
  orientation_default, averages_default, fat_suppression_default, phase_encoding_default,
  base_resolution_default, phase_resolution_default, phase_partial_fourier_default,
  phase_oversampling_default, concatenations_default, gradient_mode_default, multiband_factor_default,
  tr_min, tr_max, te_min, te_max, slice_thickness, flip_angle_min, flip_angle_max,
  phase_direction, matrix_size, fov_min, fov_max, gap_percentage, nex)
VALUES
-- Cerebro de Rutina: T1_SE_AXIAL
(1, 'T1_SE_AXIAL', 'Axial',
  500, 15, 220, 3.0, '256x256', 90,
  'Axial', 1, 'None', 'R >> L',
  256, 100, 'Off',
  0, 1, 'Normal', 1,
  400, 600, 10, 20, 3.0, 80, 100,
  'R >> L', '256x256', 200, 240, 10, 1),
-- Cerebro de Rutina: T2_TSE_AXIAL
(1, 'T2_TSE_AXIAL', 'Axial',
  4000, 100, 220, 3.0, '320x320', 150,
  'Axial', 2, 'None', 'R >> L',
  320, 100, 'Off',
  0, 1, 'Normal', 1,
  3500, 5500, 80, 120, 3.0, 130, 150,
  'R >> L', '320x320', 200, 240, 10, 2),
-- Cerebro de Rutina: FLAIR_AXIAL
(1, 'FLAIR_AXIAL', 'Axial',
  9000, 120, 220, 3.0, '256x256', 150,
  'Axial', 1, 'None', 'R >> L',
  256, 100, '7/8',
  0, 1, 'Normal', 1,
  8000, 10000, 100, 140, 3.0, 130, 150,
  'R >> L', '256x256', 200, 240, 10, 1),
-- Columna Cervical: T2_TSE_SAG
(2, 'T2_TSE_SAG', 'Sagittal',
  3500, 120, 180, 3.0, '320x320', 150,
  'Sagittal', 2, 'None', 'A >> P',
  320, 100, 'Off',
  0, 1, 'Normal', 1,
  3000, 4000, 100, 140, 3.0, 130, 150,
  'A >> P', '320x320', 160, 200, 10, 2),
-- Columna Cervical: T1_TSE_TRA
(2, 'T1_TSE_TRA', 'Axial',
  600, 20, 180, 3.0, '320x320', 120,
  'Axial', 2, 'None', 'R >> L',
  320, 100, 'Off',
  0, 1, 'Normal', 1,
  500, 700, 15, 25, 3.0, 110, 130,
  'R >> L', '320x320', 160, 200, 10, 2),
-- Columna Lumbar: T2_TSE_SAG
(3, 'T2_TSE_SAG', 'Sagittal',
  3500, 120, 250, 4.0, '320x320', 150,
  'Sagittal', 2, 'None', 'A >> P',
  320, 100, 'Off',
  0, 1, 'Normal', 1,
  3000, 4000, 100, 140, 4.0, 130, 150,
  'A >> P', '320x320', 220, 280, 10, 2),
-- Columna Lumbar: T1_TSE_TRA
(3, 'T1_TSE_TRA', 'Axial',
  600, 20, 250, 4.0, '320x320', 120,
  'Axial', 2, 'None', 'R >> L',
  320, 100, 'Off',
  0, 1, 'Normal', 1,
  500, 700, 15, 25, 4.0, 110, 130,
  'R >> L', '320x320', 220, 280, 10, 2);

-- =====================================================
-- 7. PROTOCOLO-CATEGORÍAS
-- =====================================================
INSERT INTO protocolo_categorias (protocolo_id, categoria_id, es_primaria) VALUES
(1, 21, TRUE),  -- Cerebro -> Parénquima
(1, 10, TRUE),  -- Cerebro -> Cerebro
(2, 30, TRUE),  -- Columna Cervical
(2, 11, TRUE),  -- Columna
(3, 32, TRUE),  -- Columna Lumbar
(3, 11, TRUE);  -- Columna

-- =====================================================
-- 8. LOGROS
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
-- 9. XP INICIAL PARA USUARIOS
-- =====================================================
INSERT INTO usuario_xp (usuario_id, xp_total, nivel) VALUES
(1, 0, 1),
(2, 0, 1),
(3, 0, 1);

-- =====================================================
-- 10. EVALUACIÓN PRE-TEST
-- =====================================================
INSERT INTO evaluaciones_teoricas (id, titulo, descripcion, duracion_minutos, es_obligatoria) VALUES
(1, 'Pre-Test Basal: Fundamentos de RMN', 'Evaluación de conocimientos básicos de resonancia magnética nuclear', 30, TRUE);

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
