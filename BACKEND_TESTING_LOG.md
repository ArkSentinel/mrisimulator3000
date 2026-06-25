# Log: Testing Backend - Session Issue

## Problema Observado

El backend `mri-server` arranca correctamente:
```
2026/06/25 14:06:40 Connected to MariaDB successfully
2026/06/25 14:06:40 Server starting on port 3000
┌───────────────────────────────────────────────────┐
│                   Fiber v2.52.0                   │
│               http://127.0.0.1:3000               │
│ Handlers ............ 86  Processes ........... 1 │
└───────────────────────────────────────────────────┘
[14:06:40] 200 - GET /api/health (   5.596048ms)
{"service":"mri-simulator-api","status":"ok"}
```

**PERO** el proceso se muere después de unos segundos. curl subsequentes fallan con `Connection refused`.

## Como Testear Manualmente

### Opcion 1: Terminal interactiva
```bash
# Terminal 1: Arrancar backend
cd /home/nicolas/Documentos/personales/MRInativo/backend
./mri-server

# Mantener esa terminal abierta. En otra terminal o en el browser...
```

### Opcion 2: nohup (recomendado si el proceso muere)
```bash
cd /home/nicolas/Documentos/personales/MRInativo/backend
nohup ./mri-server > /tmp/mri.log 2>&1 &
disown
sleep 2
curl http://localhost:3000/api/health
```

### Comandos para verificar (si el server esta corriendo)

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@facultad.edu","password":"admin123"}' | jq -r '.token')

# Test Health
curl http://localhost:3000/api/health

# Test Stats
curl -s http://localhost:3000/api/admin/stats -H "Authorization: Bearer $TOKEN" | jq

# Test Users
curl -s http://localhost:3000/api/admin/users -H "Authorization: Bearer $TOKEN" | jq

# Test Protocols
curl -s http://localhost:3000/api/protocols -H "Authorization: Bearer $TOKEN" | jq '.[0]'

# Test Create Exam
curl -s -X POST http://localhost:3000/api/exams \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"paciente_id":1,"protocolo_id":1,"params":[{"tr":1000,"te":100,"ti":0,"fov_read":240,"fov_phase":100,"slice_thickness":3,"slice_gap":0.3,"flip_angle":90,"matrix_size":256,"nex":1,"phase_encoding":"R>>L","fat_sat":false,"orientation":"AXIAL"}]}' | jq
```

## Testing Sprint 2 Features

### Test WebSocket Persistence
```bash
# 1. Crear una sesion
curl -s -X POST http://localhost:3000/api/sessions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"protocol_id":1}' | jq

# 2. Cerrar la sesion (esto debe persistir en DB)
curl -s -X DELETE http://localhost:3000/api/sessions/SESSION_ID \
  -H "Authorization: Bearer $TOKEN"

# 3. Verificar en DB
mysql -h sql.freedb.tech -u u_s0Fcu7 -p'e2IScBDSf2hJ' freedb_8y1bJuFu \
  -e "SELECT * FROM salas; SELECT * FROM sala_participantes;"
```

### Test Achievements (crear examenes primero)
```bash
# 1. Crear un examenes (repetir varias veces)
curl -s -X POST http://localhost:3000/api/exams \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paciente_id":1,"protocolo_id":1,"params":[...]}'

# 2. Evaluar el examen
curl -s -X POST http://localhost:3000/api/exams/1/evaluate \
  -H "Authorization: Bearer $TOKEN"

# 3. Verificar logros en DB
mysql -h sql.freedb.tech -u u_s0Fcu7 -p'e2IScBDSf2hJ' freedb_8y1bJuFu \
  -e "SELECT * FROM usuario_logros; SELECT * FROM usuario_xp;"
```

## Verificacion Rapida del Backend

Si el backend esta corriendo, estos endpoints deben responder:

| Endpoint | Response |
|----------|----------|
| `GET /api/health` | `{"service":"mri-simulator-api","status":"ok"}` |
| `POST /api/auth/login` | `{"token":"...","user":{...}}` |

## Nota Importante

El frontend (Vite) esta corriendo en puerto 5173. Para probar el flujo completo:
1. Abre http://localhost:5173
2. Login con `admin@facultad.edu` / `admin123`
3. Ve a Admin → Users para testear creacion de usuarios
4. Ve a Admin → Stats para testear stats
