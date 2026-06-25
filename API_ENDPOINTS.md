# MRI Simulator API - Catastro de Endpoints

**Base URL:** `http://localhost:3000/api`
**WebSocket:** `ws://localhost:3000/ws`

---

## Leyenda

| Símbolo | Significado |
|---------|-------------|
| 🔓 | Público (sin auth) |
| 🔐 | Requiere JWT |
| 👑 | Requiere rol Admin |
| 📋 | Requiere rol Docente |
| 🏠 | In-memory (WebSocket hub) |
| 💾 | Persiste en DB |

---

## 1. SALUD

```
🔓 GET  /api/health                          → Estado del servicio
```

---

## 2. AUTENTICACIÓN `/api/auth`

```
🔓 POST /api/auth/login                       → Login (email, password) → { token, user }
🔓 POST /api/auth/register                    → Registro (email, password, nombre, role?)
🔐 GET  /api/auth/me                          → Perfil del usuario actual → { user, xp }
```

---

## 3. PROTOCOLOS (Lectura) `/api/protocols`

```
🔐 GET  /api/protocols/                      → Listar todos los protocolos
🔐 GET  /api/protocols/search?q=             → Buscar protocolos por nombre/descripción
🔐 GET  /api/protocols/:id                   → Obtener protocolo por ID (con secuencias)
🔐 GET  /api/protocols/:id/sequences          → Obtener secuencias de un protocolo
🔐 GET  /api/protocols/category/:categoryId   → Protocolos por categoría
```

---

## 4. CATEGORÍAS `/api/categories`

```
🔐 GET  /api/categories/                      → Árbol de categorías (con hijos)
```

---

## 5. ADMIN: USUARIOS `/api/admin/users`

```
👑 GET  /api/admin/users                      → Listar usuarios (filtro: ?role=, ?search=)
👑 POST /api/admin/users                      → Crear usuario (bcrypt hash automático)
👑 PUT  /api/admin/users/:id                  → Editar usuario (email, nombre, role)
👑 DELETE /api/admin/users/:id                → Eliminar usuario (previene eliminar admin#1)
👑 GET  /api/admin/students                   → Listar estudiantes (con XP y examenes_totales)
👑 GET  /api/admin/teachers                   → Listar docentes
```

---

## 6. ADMIN: PROTOCOLOS `/api/admin/protocols`

```
👑 GET    /api/admin/protocols/                              → Listar con búsqueda
👑 POST   /api/admin/protocols/                              → Crear protocolo
👑 PUT    /api/admin/protocols/:id                            → Editar protocolo
👑 DELETE /api/admin/protocols/:id                            → Eliminar protocolo (+ secuencias)
👑 GET    /api/admin/protocols/:id/sequences                  → Secuencias del protocolo
👑 POST   /api/admin/protocols/sequences                      → Crear secuencia
👑 PUT    /api/admin/protocols/sequences/:id                  → Editar secuencia
👑 DELETE /api/admin/protocols/sequences/:id                   → Eliminar secuencia
👑 POST   /api/admin/protocols/sequences/:id/copy?target_protocol_id= → Copiar secuencia
```

---

## 7. PACIENTES `/api/patients`

```
🔐 GET  /api/patients/                        → Listar pacientes
🔐 GET  /api/patients/:id                     → Obtener paciente
🔐 POST /api/patients/                        → Crear paciente
```

---

## 8. EXÁMENES `/api/exams`

```
🔐 POST /api/exams/                           → Crear examen (paciente_id, protocolo_id, params)
🔐 GET  /api/exams/my                         → Mis exámenes
🔐 GET  /api/exams/:id                        → Obtener examen
🔐 PUT  /api/exams/:id                        → Actualizar examen
🔐 POST /api/exams/:id/evaluate               → Evaluar examen (scoring)
🔐 GET  /api/exams/:id/results               → Resultados del examen
```

---

## 9. SESIONES (WebSocket) `/api/sessions`

```
🔐 POST   /api/sessions/                      → 🏠 Crear sesión in-memory → { id, pin }
🔐 GET    /api/sessions/                      → 🏠 Listar sesiones activas
🔐 GET    /api/sessions/:id                   → 🏠 Obtener sesión
🔐 POST   /api/sessions/:id/join              → 🏠 Unirse a sesión
🔐 POST   /api/sessions/:id/leave             → 🏠 Salir de sesión
🔐 POST   /api/sessions/:id/start            → 🏠 Iniciar sesión (docente)
🔐 PUT    /api/sessions/:id/phase            → 🏠 Cambiar fase (BRIEFING/SIMULATION/ACQUISITION)
🔐 GET    /api/sessions/:id/leaderboard      → 🏠 Rankings de la sesión
🔐 DELETE /api/sessions/:id                   → 🏠 Cerrar sesión
```

### WebSocket Endpoint

```
🔐 WS    /ws?session_id=&user_id=            → 🏠 Conexión WebSocket para tiempo real
```

---

## 10. ADMIN: STATS `/api/admin/stats`

```
👑 GET  /api/admin/stats                      → Estadísticas (users, exams, avg_score, sessions_today, top_students, recent_activity)
```

---

## Resumen por Tipo

| Tipo | Cantidad | Endpoints |
|------|----------|-----------|
| GET | 18 | health, me, protocolos x5, categories, admin/users x3, patients x2, sessions x5, stats |
| POST | 10 | login, register, admin/users, admin/protocols, admin/protocols/sequences, exams x2, sessions x3 |
| PUT | 3 | admin/users/:id, admin/protocols/:id, sessions/:id/phase |
| DELETE | 3 | admin/users/:id, admin/protocols/:id, admin/protocols/sequences/:id, sessions/:id |
| WS | 1 | /ws |

**Total: 35 endpoints + 1 WebSocket**

---

## Middlewares por Ruta

```
/api/health                  → ninguno
/api/auth/*                  → ninguno (login/register públicos)
/api/auth/me                 → AuthRequired
/api/admin/*                 → AuthRequired + RequireRole("admin")
/api/protocols/*             → AuthRequired
/api/categories/*            → AuthRequired
/api/patients/*              → AuthRequired
/api/exams/*                 → AuthRequired
/api/sessions/*              → AuthRequired
/api/admin/stats             → AuthRequired + RequireRole("admin")
```

---

## Tablas DB Involucradas

| Tabla | Uso |
|-------|-----|
| `users` | Auth, admin |
| `usuario_xp` | XP por usuario |
| `protocolos` | CRUD admin |
| `secuencias` | CRUD admin, lectura |
| `categorias` | Lectura |
| `protocolo_categorias` | Relación |
| `indicaciones_protocolo` | Metadata |
| `contraindicaciones_protocolo` | Metadata |
| `preparacion_paciente` | Metadata |
| `posicionamiento_paciente` | Metadata |
| `pacientes` | CRUD |
| `estudios` | Exámenes |
| `parametros_secuencia` | Params por examen |
| `exam_results` | Scoring |
| `salas` | ❌ NO SE USA (dead code) |
| `sala_participantes` | ❌ NO SE USA (dead code) |
| `user_sessions` | Stats |
| `logros` | Logros |
| `usuario_logros` | Progreso logros |
| `evaluaciones_teoricas` | Pre-tests |
| `preguntas` | Preguntas |
| `resultados_pretest` | Respuestas |

---

## Dead Code Detectado

1. **Tabla `salas`** → nunca se inserta desde Go (sesiones son in-memory)
2. **Tabla `sala_participantes`** → nunca se llena
3. **Middleware `sessions` en routes.go** → llama a `handlers.CreateSession` etc pero esas funciones usan WebSocket hub, no DB

---

## Próximos Pasos Sugeridos

1. [ ] Conectar tabla `salas` con `CreateSession` para persistencia
2. [ ] Llenar `sala_participantes` cuando alumnos se unen
3. [ ] Agregar pre-tests (`evaluaciones_teoricas`, `preguntas`, `resultados_pretest`)
4. [ ] Sistema de logros (`usuario_logros`)
5. [ ] XP y niveles (`usuario_xp`)
