# SPEC.md — Sprint 1: Criticos

**Fecha:** 2026-06-25
**Alcance:** 4 fixes criticos que bloquean uso basico

---

## 1. Fix Student Panel Navigation

### Issue
`PanelScreen.tsx:74-78` — Cuando la fase cambia a SIMULATION o ACQUISITION, navega a `/scheduler` en vez de `/console`.

### Spec
- Cuando el backend envia `phase_change` con fase `SIMULATION` o `ACQUISITION`, el student debe navegar a `/console`
- La fase `PODIUM` indica fin de sesion — debe mostrar pantalla de resultados
- La fase `BRIEFING` — mantener en panel actual

### Files a modificar
- `frontend/src/components/Student/PanelScreen.tsx`

### Cambios
```typescript
// Antes
const handlePhaseChange = useCallback((phase: Phase) => {
  if (phase === 'SIMULATION' || phase === 'ACQUISITION') {
    navigate('/scheduler');  // ❌ WRONG
  }
}, [navigate]);

// Despues
const handlePhaseChange = useCallback((phase: Phase) => {
  if (phase === 'SIMULATION' || phase === 'ACQUISITION') {
    navigate('/console');  // ✅ CORRECTO
  } else if (phase === 'PODIUM') {
    navigate('/dashboard'); // o mostrar resultados
  }
}, [navigate]);
```

---

## 2. Fix Exam System — Console Save

### Issue
`ConsoleScreen.tsx:569` llama a `fetch('http://localhost:3001/api/exams/save')` que no existe. El payload tampoco matchea.

### Spec
- El boton "Save Exam" debe llamar a `POST /api/exams` (via api.ts o fetch directo)
- El payload debe seguir el formato que el backend espera:
```typescript
{
  paciente_id: number,
  protocolo_id: number,
  params: [{
    tr: number,
    te: number,
    ti: number,
    fov_read: number,
    fov_phase: number,
    slice_thickness: number,
    slice_gap: number,
    flip_angle: number,
    matrix_size: number,
    nex: number,
    phase_encoding: string,
    fat_sat: boolean,
    orientation: string
  }]
}
```
- Usar el mismo puerto 3000 (Go API), no 3001

### Endpoint correcto
`POST http://localhost:3000/api/exams` con Authorization header

### Files a modificar
- `frontend/src/components/Console/ConsoleScreen.tsx`

### Cambios
1. Cambiar endpoint de `http://localhost:3001/api/exams/save` a `http://localhost:3000/api/exams`
2. Reestructurar payload para que matchee con el formato del backend
3. Agregar Authorization header con Bearer token

---

## 3. Fix Admin UsersTab — Create User Response

### Issue
`UsersTab.tsx:33-46` — `POST /api/auth/register` retorna `{token, user}` pero el codigo espera solo un objeto User flat.

### Spec
- El admin crea usuarios via `POST /api/admin/users` (NO via `/auth/register`)
- `/auth/register` es para auto-registro de usuarios
- El admin tab debe usar `/api/admin/users` con `POST`

### Files a modificar
- `frontend/src/components/Admin/tabs/UsersTab.tsx`

### Cambios
```typescript
// Antes (line 33)
const res = await fetch('http://localhost:3000/api/auth/register', {...});

// Despues
const res = await fetch('http://localhost:3000/api/admin/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('mri_token')}`
  },
  body: JSON.stringify({
    email: newUser.email,
    password: newUser.password,
    nombre: newUser.nombre,
    role: newUser.role
  })
});
```

---

## 4. Fix Stats — Wrong Column Name

### Issue
`stats.go:45` usa `score` pero la columna es `score_total`.

### Spec
- La query debe usar `score_total` en vez de `score`
- Verificar que todas las demas columnas sean correctas

### Files a modificar
- `backend/internal/handlers/stats.go`

### Cambios
```go
// Antes (line 45)
database.DB.QueryRow("SELECT AVG(score) FROM exam_results WHERE score IS NOT NULL").Scan(&avgScore)

// Despues
database.DB.QueryRow("SELECT AVG(score_total) FROM exam_results WHERE score_total IS NOT NULL").Scan(&avgScore)
```

---

## Checklist de Verificacion

- [ ] Student Panel navega a `/console` en SIMULATION/ACQUISITION
- [ ] Student Panel muestra resultados en PODIUM
- [ ] Console "Save Exam" llama `POST /api/exams` en puerto 3000
- [ ] Console payload matchea formato del backend
- [ ] Admin UsersTab usa `/api/admin/users` para crear usuarios
- [ ] Stats usa `score_total` no `score`
- [ ] TypeScript compile sin errores
- [ ] Go binary rebuild

---

## Dependencias

Ninguna — todos son fixes independientes.

---

## Testing Checklist

### Prerequisitos
```bash
# Terminal 1 - Backend
cd backend && ./mri-server

# Terminal 2 - Frontend
cd frontend && npm run dev

# Login inicial
admin@facultad.edu / admin123
```

### Test 1: Student Panel Navigation
1. Login como docente: `docente@facultad.edu` / `admin123`
2. Ir a Teacher Dashboard
3. Seleccionar protocolo "Cerebro" (o cualquiera)
4. Click "Crear Nueva Sala"
5. Copiar el PIN generado
6. Login como alumno: `alumno@uni.edu` / `admin123`
7. Ir a Panel (o Student)
8. Ingresar PIN y click "Unirse a la Sala"
9. Verificar que aparece en la lista de jugadores
10. Volver a Teacher Dashboard y click "Iniciar"
11. **VERIFICAR**: Alumno debe navegar a `/console` (NO a `/scheduler`)
12. **VERIFICAR**: Si el docente termina la sesion, alumno debe ver algo (no quedar colgado)

**Pasos manuales:**
- Teacher: http://localhost:5173/teacher-dashboard
- Student: http://localhost:5173/panel

### Test 2: Console Save Exam
1. Login como alumno: `alumno@uni.edu` / `admin123`
2. Ir a Console (o Simulator)
3. Seleccionar un protocolo
4. Modificar algunos parametros (TR, TE, etc)
5. Click "Save Exam" o similar boton
6. **VERIFICAR**: No debe dar error 404 ni "Server not running"
7. **VERIFICAR**: El mensaje debe decir "Exam saved!" o similar

**Pasos manuales:**
- Console: http://localhost:5173/console
- Endpoint directo (si se quiere probar via curl):
```bash
curl -X POST http://localhost:3000/api/exams \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"paciente_id":1,"protocolo_id":1,"params":[{"tr":1000,"te":100,"ti":0,"fov_read":240,"fov_phase":100,"slice_thickness":3,"slice_gap":0.3,"flip_angle":90,"matrix_size":256,"nex":1,"phase_encoding":"R>>L","fat_sat":false,"orientation":"AXIAL"}]}'
```

### Test 3: Admin Create User
1. Login como admin: `admin@facultad.edu` / `admin123`
2. Ir a Admin Panel
3. Ir a tab "Users"
4. Click "+ Add User"
5. Llenar: email, password, nombre, role
6. Click "Save"
7. **VERIFICAR**: El usuario nuevo aparece en la lista
8. **VERIFICAR**: Sin errores en consola

**Pasos manuales:**
- Admin: http://localhost:5173/admin → Users tab

### Test 4: Stats Query
1. Login como admin: `admin@facultad.edu` / `admin123`
2. Ir a Admin Panel
3. Ir a tab "Stats"
4. **VERIFICAR**: No hay errores SQL en backend
5. **VERIFICAR**: "Total Users" muestra 3 (admin, docente, alumno)
6. **VERIFICAR**: "Sessions Today" muestra 0 o numero real (no 1 por UNION hack)

**Verificar via curl:**
```bash
curl http://localhost:3000/api/admin/stats \
  -H "Authorization: Bearer <TOKEN>"
```

### Test 5: Verificacion SQL Directa (opcional)
```bash
mysql -h sql.freedb.tech -u u_s0Fcu7 -p'e2IScBDSf2hJ' freedb_8y1bJuFu \
  -e "SELECT AVG(score_total) FROM exam_results; SELECT COUNT(*) FROM user_sessions WHERE DATE(created_at) = CURDATE();"
```

---

## Criterios de Exito Sprint 1

- [ ] Test 1: Student Panel navega a `/console` ✅/❌
- [ ] Test 2: Console save exam funciona sin 404 ✅/❌
- [ ] Test 3: Admin create user aparece en lista ✅/❌
- [ ] Test 4: Stats muestra datos sin errores ✅/❌

**Si todos los tests pasan → Proceder con Sprint 2**
**Si algun test falla → Documentar issue y arreglar antes de continuar**
