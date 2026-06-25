# SPEC.md — Sprint 2: WebSocket Persistencia + Achievements

**Fecha:** 2026-06-25
**Alcance:** Persistir sesiones WebSocket a DB + activar achievements

---

## 1. WebSocket Session Persistence

### Issue
Cuando un docente cierra una sesión (`CloseSession`), todo se pierde. No se persiste nada a la DB.

### Spec

Al cerrar una sesión (`DELETE /api/sessions/:id`), persistir a DB:

**Tabla `salas`:**
- INSERT con: `nombre`, `docente_id`, `protocolo_id`, `estado='finalizada'`, timestamps

**Tabla `sala_participantes`:**
- INSERT por cada participante con: `sala_id`, `usuario_id`, `score_acumulado`, `examenes_completados`

**Tabla `exam_results`:**
- Cada submission del student genera un exam_result

### Archivos a modificar

- `backend/internal/handlers/sessions.go` — CloseSession
- `backend/internal/websocket/hub.go` — cuando se cierra, extraer datos

### Cambios en CloseSession

```go
// Antes: solo cierra conexiones y borra de memoria

// Despues:
func CloseSession(c *fiber.Ctx) error {
    sessionID := c.Params("id")
    userID := c.Locals("user_id").(int)

    hub := c.Locals("hub").(*websocket.Hub)
    session, ok := hub.GetSession(sessionID)
    if !ok {
        return c.Status(404).JSON(...)
    }

    if session.TeacherID != userID {
        return c.Status(403).JSON(...)
    }

    // 1. Persistir a DB antes de cerrar
    persistSessionToDB(session)

    // 2. Cerrar conexiones
    hub.CloseSession(sessionID)

    return c.JSON(fiber.Map{"success": true})
}

func persistSessionToDB(session *Session) {
    // INSERT into salas
    // INSERT into sala_participantes por cada student
    // INSERT into exam_results por cada submission
}
```

---

## 2. Student Panel — Reconnection Logic

### Issue (S3)
Si el WebSocket del estudiante se cae, no hay forma de reconectar.

### Spec

Agregar logic de reconexión con exponential backoff:
- Si la conexión se pierde, esperar 1s, 2s, 4s, 8s... hasta 30s máximo
- Reintentar automáticamente
- Mostrar estado de "Reconectando..."

### Archivos a modificar

- `frontend/src/hooks/useSessionSocket.ts`
- `frontend/src/components/Student/PanelScreen.tsx`

### Cambios en useSessionSocket

```typescript
// Agregar estado de reconnect
const [reconnecting, setReconnecting] = useState(false);
let reconnectAttempts = 0;
const maxReconnectDelay = 30000;

const connect = useCallback((sessionIdOverride?: string) => {
    // ... existing connection logic ...

    ws.onclose = () => {
        if (!manuallyDisconnected) {
            setReconnecting(true);
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), maxReconnectDelay);
            reconnectAttempts++;
            setTimeout(() => {
                connect(sessionIdOverride);
            }, delay);
        }
    };
}, [...]);
```

---

## 3. Teacher — EndSession WebSocket Message

### Issue (T2)
No existe mensaje WebSocket `endSession`. El docente no puede cerrar la sesión desde el WS.

### Spec

Agregar mensaje `end` al protocolo WebSocket:
- Teacher envía `end` → servidor cierra la sesión
- Servidor notifica a todos los estudiantes con mensaje `session_ended`
- Servidor persiste la sesión a DB

### Archivos a modificar

- `backend/internal/websocket/handler.go` — agregar case `MSG_END`
- `backend/internal/websocket/hub.go` — `CloseSession` ya existe
- `frontend/src/hooks/useSessionSocket.ts` — agregar método `endSession`
- `frontend/src/components/Teacher/TeacherDashboard.tsx` — wire up botón "Finalizar"

### Cambios en handler.go

```go
case "end":
    // Verificar que es el teacher
    // Llamar persistSessionToDB(session)
    // Broadcast "session_ended" a todos
    // CloseSession(sessionID)
```

---

## 4. Achievements — Conectar al Exam Flow

### Issue (X1, X2)
`checkAchievements()` nunca se llama. La tabla `usuario_logros` nunca se llena.

### Spec

En `ExamHandler.Evaluate()`, después de calcular el score:
1. Llamar `checkAchievements(userID, examResult)`
2. Por cada achievement ganado, INSERT en `usuario_logros`

### Archivos a modificar

- `backend/internal/handlers/exams.go` — en Evaluate(), llamar a debriefingService

### Cambios en exams.go Evaluate()

```go
// Despues de calcular el score y actualizar XP
// Llamar achievements
achievements, err := h.debriefingService.CheckAchievements(userID, examID, score)
if err == nil {
    for _, achievement := range achievements {
        database.DB.Exec(`
            INSERT INTO usuario_logros (usuario_id, logro_id)
            SELECT ?, id FROM logros WHERE codigo = ?
        `, userID, achievement)
    }
}
```

---

## 5. Stats — Verificacion STAT1 y STAT2

**Ya corregido en Sprint 1:**
- STAT1: `score` → `score_total` ✅
- STAT2: UNION hack removido ✅

### Verificacion adicional

En `stats.go`, la query de `topStudents` usa `er.score_total` (correcto). Verificar que todo funcione.

---

## Checklist de Verificacion

### WebSocket Persistence ✅ IMPLEMENTED
- [x] `DELETE /api/sessions/:id` persiste a tabla `salas`
- [x] `DELETE /api/sessions/:id` persiste a tabla `sala_participantes`
- [x] Rankings se guardan correctamente

### Student Reconnect ✅ IMPLEMENTED
- [x] `reconnecting` state expuesto en hook
- [x] Reconnection automatica con exponential backoff
- [x] Maximo 30s entre intentos
- [x] `session_ended` handler en el hook
- [x] PanelScreen muestra "Reconectando..." cuando `reconnecting=true`

### Teacher EndSession ✅ IMPLEMENTED
- [x] `handleEnd` en backend (handler.go)
- [x] `endSession` method en useSessionSocket hook
- [x] Mensaje `session_ended` se envia a estudiantes
- [x] Boton "Finalizar" en UI TeacherDashboard (wire up completo)

### Achievements ✅ IMPLEMENTED
- [x] `CheckAchievements()` se llama en Evaluate
- [x] `usuario_logros` se llena cuando se ganan logros
- [ ] Dashboard muestra logros reales de DB (no hardcoded)

---

## Implementado en Sprint 2

### WebSocket Persistence
- `sessions.go`: Nueva funcion `persistSessionToDB()` que inserta en `salas` y `sala_participantes`
- `hub.go`: Nuevo metodo `GetSessionForPersistence()` para obtener datos sin cerrar
- DB: Agregada columna `protocolo_id` a tabla `salas`

### Student Reconnect
- `useSessionSocket.ts`: Agregados estados `reconnecting`, `manuallyDisconnectedRef`
- Exponential backoff: 1s, 2s, 4s... hasta 30s max
- Nuevo handler para `session_ended`
- Nuevo metodo `endSession()`
- `PanelScreen.tsx`: Muestra "Reconectando..." cuando `reconnecting=true`

### Teacher EndSession
- `hub.go`: Nuevas constantes `MSG_END` y `MSG_SESSION_ENDED`
- `handler.go`: Nueva funcion `handleEnd()` que broadcast `session_ended`
- `useSessionSocket.ts`: Metodo `endSession` que envia `end` via WS
- `TeacherDashboard.tsx`: Boton "Finalizar Sesion" con confirmacion

### Achievements
- `debriefing.go`: Metodo `checkAchievements` renombrado a `CheckAchievements` (exported)
- `exams.go`: Llama a `h.debriefingService.CheckAchievements()` despues de actualizar XP

---

## Pendiente de Implementar

1. **Dashboard**: Mostrar logros reales de DB (no hardcoded)

---

## Testing Sprint 2

### Test W1: Session Persistence
```bash
# 1. Login como docente y crear sala
# 2. Unirse como alumno
# 3. Cerrar sesion via DELETE /api/sessions/:id
# 4. Verificar en DB:
mysql -h sql.freedb.tech -u u_s0Fcu7 -p'e2IScBDSf2hJ' freedb_8y1bJuFu \
  -e "SELECT * FROM salas; SELECT * FROM sala_participantes;"
```

### Test S3: Student Reconnect
- Desconectar red mientras alumno esta conectado
- Verificar que aparece "Reconectando..."

### Test T2: Teacher EndSession
- Docente click "Finalizar Sesion"
- Verificar que estudiantes ven alert y son desconectados

### Test X1: Achievements
- Hacer examenes hasta ganar logro FIRST_EXAM
- Verificar en DB:
```bash
mysql -h sql.freedb.tech -u u_s0Fcu7 -p'e2IScBDSf2hJ' freedb_8y1bJuFu \
  -e "SELECT * FROM usuario_logros;"
```

---

## Testing Checklist

### Test W1: Session Persistence
1. Login como docente
2. Crear sala
3. Unirse como 2 alumnos
4. Hacer que los alumnos hagan submissions (si hay interfaz)
5. Cerrar sesion como docente
6. Verificar en DB:
```bash
mysql -h sql.freedb.tech -u u_s0Fcu7 -p'e2IScBDSf2hJ' freedb_8y1bJuFu \
  -e "SELECT * FROM salas; SELECT * FROM sala_participantes;"
```

### Test S3: Student Reconnect
1. Login como alumno
2. Unirse a sala
3. Simular caida de red (desconectar wifi)
4. Verificar que aparece "Reconectando..." (falta UI)
5. Reconectar wifi
6. Verificar que se reconecta automaticamente

### Test T2: Teacher End
1. Login como docente
2. Crear sala
3. Unirse como alumno
4. Docente click "Finalizar" (falta wire up)
5. Alumno debe ver mensaje de sesion terminada

### Test X1: Achievements
1. Login como alumno
2. Hacer examenes hasta ganar un logro
3. Verificar en DB:
```bash
mysql -h sql.freedb.tech -u u_s0Fcu7 -p'e2IScBDSf2hJ' freedb_8y1bJuFu \
  -e "SELECT * FROM usuario_logros;"
```
