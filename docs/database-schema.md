# Estructura de Base de Datos - MRI Console

## Tablas

### categorias

```sql
CREATE TABLE `categorias` (
  `id` int NOT NULL AUTO_INCREMENT
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL
  `nombre_corto` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL
  `padre_id` int DEFAULT NULL
  `orden` int DEFAULT '0'
  `icono` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
  PRIMARY KEY (`id`)
  KEY `idx_padre` (`padre_id`)
  KEY `idx_orden` (`orden`)
  CONSTRAINT `categorias_ibfk_1` FOREIGN KEY (`padre_id`) REFERENCES `categorias` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=135 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

_64 filas_

### contraindicaciones_protocolo

```sql
CREATE TABLE `contraindicaciones_protocolo` (
  `id` int NOT NULL AUTO_INCREMENT
  `protocolo_id` int DEFAULT NULL
  `contraindicacion` text COLLATE utf8mb4_unicode_ci NOT NULL
  PRIMARY KEY (`id`)
  KEY `protocolo_id` (`protocolo_id`)
  CONSTRAINT `contraindicaciones_protocolo_ibfk_1` FOREIGN KEY (`protocolo_id`) REFERENCES `protocolos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

_7 filas_

### estudios

```sql
CREATE TABLE `estudios` (
  `id` int NOT NULL AUTO_INCREMENT
  `paciente_id` int DEFAULT NULL
  `user_id` int DEFAULT NULL
  `protocolo_id` int DEFAULT NULL
  `sala_id` int DEFAULT NULL
  `tipo_estudio` text COLLATE utf8mb4_unicode_ci
  `estado` enum('pending','active','completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'pending'
  `score_final` decimal(5,2) DEFAULT NULL
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  PRIMARY KEY (`id`)
  KEY `paciente_id` (`paciente_id`)
  KEY `protocolo_id` (`protocolo_id`)
  KEY `idx_user` (`user_id`)
  KEY `idx_sala` (`sala_id`)
  CONSTRAINT `estudios_ibfk_1` FOREIGN KEY (`paciente_id`) REFERENCES `pacientes` (`id`)
  CONSTRAINT `estudios_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
  CONSTRAINT `estudios_ibfk_3` FOREIGN KEY (`protocolo_id`) REFERENCES `protocolos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

_0 filas_

### evaluaciones_teoricas

```sql
CREATE TABLE `evaluaciones_teoricas` (
  `id` int NOT NULL AUTO_INCREMENT
  `titulo` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL
  `descripcion` text COLLATE utf8mb4_unicode_ci
  `duracion_minutos` int DEFAULT '30'
  `intentos_maximos` int DEFAULT '3'
  `es_obligatoria` tinyint(1) DEFAULT '1'
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

_1 filas_

### exam_results

```sql
CREATE TABLE `exam_results` (
  `id` int NOT NULL AUTO_INCREMENT
  `estudio_id` int NOT NULL
  `secuencia_nombre` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL
  `score_total` decimal(5,2) NOT NULL
  `score_planificacion` decimal(5,2) NOT NULL
  `score_centraje` decimal(5,2) NOT NULL
  `score_contraste` decimal(5,2) NOT NULL
  `snr` decimal(5,2) DEFAULT NULL
  `contraste` decimal(5,2) DEFAULT NULL
  `ruido` decimal(5,2) DEFAULT NULL
  `artifacts` decimal(5,2) DEFAULT NULL
  `heatmap_data` json DEFAULT NULL
  `recomendaciones` json DEFAULT NULL
  `tiempo_total_segundos` int DEFAULT NULL
  `errores_count` int DEFAULT '0'
  `passed_count` int DEFAULT '0'
  `total_checks` int DEFAULT '0'
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
  PRIMARY KEY (`id`)
  KEY `idx_estudio` (`estudio_id`)
  KEY `idx_score` (`score_total`)
  CONSTRAINT `exam_results_ibfk_1` FOREIGN KEY (`estudio_id`) REFERENCES `estudios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

_0 filas_

### indicaciones_protocolo

```sql
CREATE TABLE `indicaciones_protocolo` (
  `id` int NOT NULL AUTO_INCREMENT
  `protocolo_id` int DEFAULT NULL
  `indicacion` text COLLATE utf8mb4_unicode_ci NOT NULL
  PRIMARY KEY (`id`)
  KEY `protocolo_id` (`protocolo_id`)
  CONSTRAINT `indicaciones_protocolo_ibfk_1` FOREIGN KEY (`protocolo_id`) REFERENCES `protocolos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

_9 filas_

### logros

```sql
CREATE TABLE `logros` (
  `id` int NOT NULL AUTO_INCREMENT
  `codigo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL
  `descripcion` text COLLATE utf8mb4_unicode_ci
  `icono` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL
  `xp_reward` int DEFAULT '100'
  `categoria` enum('secuencia','protocolo','tiempo','streak','especial') COLLATE utf8mb4_unicode_ci DEFAULT 'secuencia'
  `criterio` json DEFAULT NULL
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
  PRIMARY KEY (`id`)
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

_8 filas_

### pacientes

```sql
CREATE TABLE `pacientes` (
  `id` int NOT NULL AUTO_INCREMENT
  `nombre` text COLLATE utf8mb4_unicode_ci
  `fecha_nacimiento` text COLLATE utf8mb4_unicode_ci
  `accession` text COLLATE utf8mb4_unicode_ci
  `hora` text COLLATE utf8mb4_unicode_ci
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

_5 filas_

### parametros_secuencia

```sql
CREATE TABLE `parametros_secuencia` (
  `id` int NOT NULL AUTO_INCREMENT
  `estudio_id` int NOT NULL
  `secuencia_id` int DEFAULT NULL
  `nombre_secuencia` text COLLATE utf8mb4_unicode_ci
  `tr` double DEFAULT NULL
  `te` double DEFAULT NULL
  `ti` double DEFAULT NULL
  `fov_read` double DEFAULT NULL
  `fov_phase` double DEFAULT NULL
  `slice_thickness` double DEFAULT NULL
  `slice_gap` double DEFAULT NULL
  `flip_angle` double DEFAULT NULL
  `matrix_size` int DEFAULT NULL
  `nex` double DEFAULT NULL
  `phase_encoding` text COLLATE utf8mb4_unicode_ci
  `fat_sat` tinyint(1) DEFAULT '0'
  `orientation` text COLLATE utf8mb4_unicode_ci
  `isocenter_x` double DEFAULT '0'
  `isocenter_y` double DEFAULT '0'
  `isocenter_z` double DEFAULT '0'
  `box_x` double DEFAULT NULL
  `box_y` double DEFAULT NULL
  `box_w` double DEFAULT NULL
  `box_h` double DEFAULT NULL
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
  PRIMARY KEY (`id`)
  KEY `estudio_id` (`estudio_id`)
  KEY `secuencia_id` (`secuencia_id`)
  CONSTRAINT `parametros_secuencia_ibfk_1` FOREIGN KEY (`estudio_id`) REFERENCES `estudios` (`id`)
  CONSTRAINT `parametros_secuencia_ibfk_2` FOREIGN KEY (`secuencia_id`) REFERENCES `secuencias` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

_0 filas_

### posicionamiento_paciente

```sql
CREATE TABLE `posicionamiento_paciente` (
  `id` int NOT NULL AUTO_INCREMENT
  `protocolo_id` int DEFAULT NULL
  `instruccion` text COLLATE utf8mb4_unicode_ci NOT NULL
  PRIMARY KEY (`id`)
  KEY `protocolo_id` (`protocolo_id`)
  CONSTRAINT `posicionamiento_paciente_ibfk_1` FOREIGN KEY (`protocolo_id`) REFERENCES `protocolos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

_7 filas_

### preguntas

```sql
CREATE TABLE `preguntas` (
  `id` int NOT NULL AUTO_INCREMENT
  `evaluacion_id` int NOT NULL
  `pregunta` text COLLATE utf8mb4_unicode_ci NOT NULL
  `tipo` enum('opcion_multiple','verdadero_falso','respuesta_corta') COLLATE utf8mb4_unicode_ci DEFAULT 'opcion_multiple'
  `opciones` json DEFAULT NULL
  `respuesta_correcta` text COLLATE utf8mb4_unicode_ci NOT NULL
  `explicacion` text COLLATE utf8mb4_unicode_ci
  `peso` int DEFAULT '1'
  PRIMARY KEY (`id`)
  KEY `idx_evaluacion` (`evaluacion_id`)
  CONSTRAINT `preguntas_ibfk_1` FOREIGN KEY (`evaluacion_id`) REFERENCES `evaluaciones_teoricas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

_10 filas_

### preparacion_paciente

```sql
CREATE TABLE `preparacion_paciente` (
  `id` int NOT NULL AUTO_INCREMENT
  `protocolo_id` int DEFAULT NULL
  `instruccion` text COLLATE utf8mb4_unicode_ci NOT NULL
  PRIMARY KEY (`id`)
  KEY `protocolo_id` (`protocolo_id`)
  CONSTRAINT `preparacion_paciente_ibfk_1` FOREIGN KEY (`protocolo_id`) REFERENCES `protocolos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

_7 filas_

### protocolo_categorias

```sql
CREATE TABLE `protocolo_categorias` (
  `protocolo_id` int NOT NULL
  `categoria_id` int NOT NULL
  `es_primaria` tinyint(1) DEFAULT '1'
  PRIMARY KEY (`protocolo_id`,`categoria_id`)
  KEY `categoria_id` (`categoria_id`)
  CONSTRAINT `protocolo_categorias_ibfk_1` FOREIGN KEY (`protocolo_id`) REFERENCES `protocolos` (`id`) ON DELETE CASCADE
  CONSTRAINT `protocolo_categorias_ibfk_2` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

_6 filas_

### protocolos

```sql
CREATE TABLE `protocolos` (
  `id` int NOT NULL AUTO_INCREMENT
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL
  `descripcion` text COLLATE utf8mb4_unicode_ci
  `anatomical_region` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL
  `indications` text COLLATE utf8mb4_unicode_ci
  `source_url` text COLLATE utf8mb4_unicode_ci
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
  PRIMARY KEY (`id`)
  UNIQUE KEY `uq_nombre` (`nombre`(191))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

_3 filas_

### resultados_pretest

```sql
CREATE TABLE `resultados_pretest` (
  `id` int NOT NULL AUTO_INCREMENT
  `usuario_id` int NOT NULL
  `evaluacion_id` int NOT NULL
  `score` decimal(5,2) NOT NULL
  `respuestas` json DEFAULT NULL
  `tiempo_tomado_segundos` int DEFAULT NULL
  `aprobo` tinyint(1) DEFAULT '0'
  `attempt_number` int DEFAULT '1'
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
  PRIMARY KEY (`id`)
  KEY `idx_usuario` (`usuario_id`)
  KEY `idx_evaluacion` (`evaluacion_id`)
  CONSTRAINT `resultados_pretest_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `users` (`id`)
  CONSTRAINT `resultados_pretest_ibfk_2` FOREIGN KEY (`evaluacion_id`) REFERENCES `evaluaciones_teoricas` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

_0 filas_

### sala_participantes

```sql
CREATE TABLE `sala_participantes` (
  `id` int NOT NULL AUTO_INCREMENT
  `sala_id` int NOT NULL
  `usuario_id` int NOT NULL
  `joined_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
  `score_acumulado` decimal(8,2) DEFAULT '0.00'
  `examenes_completados` int DEFAULT '0'
  PRIMARY KEY (`id`)
  UNIQUE KEY `unique_sala_usuario` (`sala_id`,`usuario_id`)
  KEY `usuario_id` (`usuario_id`)
  CONSTRAINT `sala_participantes_ibfk_1` FOREIGN KEY (`sala_id`) REFERENCES `salas` (`id`) ON DELETE CASCADE
  CONSTRAINT `sala_participantes_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

_0 filas_

### salas

```sql
CREATE TABLE `salas` (
  `id` int NOT NULL AUTO_INCREMENT
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL
  `docente_id` int NOT NULL
  `estado` enum('esperando','activa','finalizada') COLLATE utf8mb4_unicode_ci DEFAULT 'esperando'
  `config_json` json DEFAULT NULL
  `started_at` timestamp NULL DEFAULT NULL
  `ended_at` timestamp NULL DEFAULT NULL
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
  PRIMARY KEY (`id`)
  KEY `idx_estado` (`estado`)
  KEY `idx_docente` (`docente_id`)
  CONSTRAINT `salas_ibfk_1` FOREIGN KEY (`docente_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

_0 filas_

### secuencias

```sql
CREATE TABLE `secuencias` (
  `id` int NOT NULL AUTO_INCREMENT
  `protocolo_id` int NOT NULL
  `nombre_secuencia` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL
  `plane` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL
  `planning_instructions` text COLLATE utf8mb4_unicode_ci
  `technical_parameters` json DEFAULT NULL
  `tr_default` double DEFAULT NULL
  `te_default` double DEFAULT NULL
  `fov_default` int DEFAULT NULL
  `slice_thickness_default` double DEFAULT NULL
  `matrix_default` text COLLATE utf8mb4_unicode_ci
  `flip_default` int DEFAULT NULL
  `orientation_default` text COLLATE utf8mb4_unicode_ci
  `averages_default` int DEFAULT NULL
  `fat_suppression_default` text COLLATE utf8mb4_unicode_ci
  `phase_encoding_default` text COLLATE utf8mb4_unicode_ci
  `base_resolution_default` int DEFAULT NULL
  `phase_resolution_default` int DEFAULT NULL
  `phase_partial_fourier_default` text COLLATE utf8mb4_unicode_ci
  `phase_oversampling_default` double DEFAULT NULL
  `concatenations_default` int DEFAULT NULL
  `gradient_mode_default` text COLLATE utf8mb4_unicode_ci
  `multiband_factor_default` int DEFAULT NULL
  `tr_min` double DEFAULT NULL
  `tr_max` double DEFAULT NULL
  `te_min` double DEFAULT NULL
  `te_max` double DEFAULT NULL
  `slice_thickness` double DEFAULT NULL
  `flip_angle_min` int DEFAULT NULL
  `flip_angle_max` int DEFAULT NULL
  `phase_direction` text COLLATE utf8mb4_unicode_ci
  `matrix_size` text COLLATE utf8mb4_unicode_ci
  `fov_min` int DEFAULT NULL
  `fov_max` int DEFAULT NULL
  `gap_percentage` int DEFAULT NULL
  `nex` int DEFAULT NULL
  PRIMARY KEY (`id`)
  KEY `protocolo_id` (`protocolo_id`)
  CONSTRAINT `secuencias_ibfk_1` FOREIGN KEY (`protocolo_id`) REFERENCES `protocolos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

_7 filas_

### user_sessions

```sql
CREATE TABLE `user_sessions` (
  `id` int NOT NULL AUTO_INCREMENT
  `usuario_id` int NOT NULL
  `token_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL
  `expires_at` timestamp NOT NULL
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
  `revoked_at` timestamp NULL DEFAULT NULL
  PRIMARY KEY (`id`)
  KEY `usuario_id` (`usuario_id`)
  KEY `idx_token` (`token_hash`)
  KEY `idx_expires` (`expires_at`)
  CONSTRAINT `user_sessions_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

_0 filas_

### users

```sql
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL
  `role` enum('estudiante','docente','admin') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'estudiante'
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  PRIMARY KEY (`id`)
  UNIQUE KEY `email` (`email`)
  KEY `idx_email` (`email`)
  KEY `idx_role` (`role`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

_3 filas_

### usuario_logros

```sql
CREATE TABLE `usuario_logros` (
  `id` int NOT NULL AUTO_INCREMENT
  `usuario_id` int NOT NULL
  `logro_id` int NOT NULL
  `earned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
  PRIMARY KEY (`id`)
  UNIQUE KEY `unique_usuario_logro` (`usuario_id`,`logro_id`)
  KEY `logro_id` (`logro_id`)
  CONSTRAINT `usuario_logros_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
  CONSTRAINT `usuario_logros_ibfk_2` FOREIGN KEY (`logro_id`) REFERENCES `logros` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

_0 filas_

### usuario_xp

```sql
CREATE TABLE `usuario_xp` (
  `id` int NOT NULL AUTO_INCREMENT
  `usuario_id` int NOT NULL
  `xp_total` int DEFAULT '0'
  `nivel` int DEFAULT '1'
  `racha_dias` int DEFAULT '0'
  `ultimo_examen` date DEFAULT NULL
  `examenes_totales` int DEFAULT '0'
  PRIMARY KEY (`id`)
  UNIQUE KEY `usuario_id` (`usuario_id`)
  CONSTRAINT `usuario_xp_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

_3 filas_

