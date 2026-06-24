# MCP-MRISimulator - Consola MRI

## Resumen de la Consola

La Consola MRI (`/console`) es el núcleo del simulador. Permite configurar secuencias, manipular el FOV en 3D, y ejecutar escaneos simulados.

---

## Arquitectura de la Interfaz

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CONSOLA MRI                                 │
├──────────────────┬──────────────────────────────────────────────────┤
│                  │                                                   │
│  SIDEBAR (320px) │              ÁREA PRINCIPAL                      │
│  - Protocolos    │                                                   │
│  - Lista Seq.    │    ┌────────────────────────────────────────┐   │
│  - Paciente      │    │         ViewportGrid (3 panes)         │   │
│  - Scan Controls │    │   AXIAL  │  CORONAL  │  SAGITTAL     │   │
│  - Save Exam     │    │          │            │               │   │
│  - Control Btns  │    └────────────────────────────────────────┘   │
│                  │    ┌────────────────────────────────────────┐   │
│                  │    │         ParamTabs + ParamForm           │   │
│                  │    │  Routine | Contrast | Geometry | ...   │   │
│                  │    └────────────────────────────────────────┘   │
└──────────────────┴──────────────────────────────────────────────────┘
```

---

## Componentes

### 1. Sidebar (320px, shrink-0)

#### Protocol Selector
- Dropdown con protocolos del backend
- `GET /api/protocols`

#### Sequence List
- Drag-and-drop reordering
- Estados: Running (amarillo), Ready (verde), Completed (azul), Idle (gris)
- Click derecho: Open, Repeat, Copy&Go, Delete

#### Scan Controls
- Barra de progreso (amarilla)
- Skip (⏩), Stop (⏹)

#### Save Exam
- `POST /api/exams/save`

#### Control Buttons
```
┌────┬────┬────┬────┬────┬──────────────────┐
│ 🗑 │ ⏭ │ ⏹ │ ⏸ │ ▶  │      Copy&Go      │
└────┴────┴────┴────┴────┴──────────────────┘
```

### 2. ViewportGrid (3 Viewports)

```
┌─────────────────┬─────────────────┬─────────────────┐
│                 │                 │                 │
│   AXIAL VIEW    │  CORONAL VIEW   │  SAGITTAL VIEW  │
│   [Corte X-Y]   │   [Corte X-Z]   │   [Corte Y-Z]   │
│                 │                 │                 │
│  R←───→L       │  R←───→L       │  A←───→P       │
└─────────────────┴─────────────────┴─────────────────┘
```

#### Cámaras Three.js
- **Axial:** Position (0, 0, 200), looking at origin (plano X-Y)
- **Coronal:** Position (0, 200, 0), looking at origin (plano X-Z)
- **Sagittal:** Position (200, 0, 0), looking at origin (plano Y-Z)

#### FOV Box
- Caja amarilla wireframe
- 8 esferas blancas en esquinas = handles para resize
- Líneas amarillas = posición de slices

#### Interacción FOV
| Acción | Plano Restringido |
|--------|-------------------|
| Axial drag/resize | X-Y |
| Coronal drag/resize | X-Z |
| Sagittal drag/resize | Y-Z |

### 3. Parameter Tabs

```
┌────────┬──────────┬───────────┬──────────┬─────────┬────────┬──────────┐
│Routine │ Contrast │Resolution │Geometry  │Sat Bands│ System │ Sequence │
└────────┴──────────┴───────────┴──────────┴─────────┴────────┴──────────┘
```

#### Routine
- Slice Group, Slices, Slice Thick, Distance Fact
- Orientation, FoV Read, FoV Phase

#### Contrast
- TR, TE, Flip Angle
- Averages/NEX, Fat Suppress
- b-value, Case (DWI)

#### Resolution
- Base Res, Phase Res
- Phase PF (Partial Fourier)

#### Geometry
- Phase Enc Dir, Phase Oversamp, Concat

#### Sat Bands
- Gestor de bandas de saturación

#### System
- Coil Elements, Gradient Mode
- Multi-band, Window/Level

#### Sequence (readonly)
- Info: nombre, tiempo scan, SAR

---

## Archivos Clave

| Archivo | Función |
|---------|---------|
| `ConsoleScreen.tsx` | Layout principal, estado, handlers |
| `ViewportGrid.tsx` | 3 viewports Three.js |
| `SequenceList.tsx` | Lista draggable de secuencias |
| `ControlButtons.tsx` | Botones inferiores |
| `ParamTabs.tsx` | Pestañas de parámetros |
| `ParamForm.tsx` | Formularios por pestaña |
| `fovMath.ts` | Cálculos de FOV |
| `atlas.ts` | Texturas de cerebro |
| `mri-filter.frag.ts` | Shader GLSL |

---

## Lo Que Está Completo

- [x] Protocolos y secuencias desde backend
- [x] Parámetros completos en todas las pestañas
- [x] 3 Viewports con cámaras ortográficas
- [x] FOV drag/resize restringido al plano
- [x] Shader MRI: T1, T2, FLAIR, DWI
- [x] SequenceList con drag-and-drop
- [x] Scan progress bar

---

## Lo Que Falta (Multiplayer)

### 🔴 Crítico

- [ ] **Integración WebSocket en ConsoleScreen**
  - `useSessionSocket` existe pero no se usa en ConsoleScreen
  - Necesario para recibir `phase_change` y enviar `submit`

- [ ] **Envío de submit al completar planificación**
  - Cuando estudiante presiona "Start Scan"
  - Debe enviar `submit` via WS con scoring:
    ```typescript
    submitSequence(sequenceName, p_geo, p_ant, p_param, timeMs)
    ```

- [ ] **BloqueoOverlay en ConsoleScreen**
  - Mostrar overlay al enviar planificación
  - Variantes: waiting, paused, timeout, error, debriefing

- [ ] **Sincronización de fases**
  - Escuchar `phase_change` del docente
  - Solo permitir interacción en fase SIMULATION
  - Mostrar UI de espera en otras fases

- [ ] **Cálculo de scoring (p_geo, p_ant, p_param)**
  - Falta función para calcular scores de geografía, anatomía, parámetros
  - Backend espera estos valores en submit

### 🟡 Parcialmente Implementado

- [ ] **FOV geometry sync con scoring**
  - Calcular `p_geo` basado en posición del FOV vs posición correcta

- [ ] **Antenna/Coil scoring (p_ant)**
  - Verificar selección correcta de antena para la región

- [ ] **Parameter range validation (p_param)**
  - Comparar TR/TE/flip con rangos correctos para la secuencia

- [ ] **Setup Warnings integrados al scoring**
  - Actualmente `checkRequiresSetup` solo muestra warnings
  - Deberían afectar el score final

### 🟢 Pendiente de Diseño

- [ ] **UX para espera síncrona**
  - Qué muestra el estudiante mientras espera
  - Timer de countdown

- [ ] **UX para debriefing**
  - Cómo presenta el docente los resultados
  - Heatmap de errores

---

## Flujo Multiplayer Deseado

```
DOCENTE (TeacherDashboard)          ESTUDIANTE (ConsoleScreen)
────────────────────────────────    ────────────────────────────────
1. Crea sesión (PIN)          ←
                                 2. Se une con PIN (/panel)
3. Ve estudiantes conectándose
                                 4. /verification (stepper 3 pasos)
                                 5. Completado → /panel
                                 6. Ve "Esperando inicio..."
────────────────────────────────
7. Presiona START
   → phase_change: SIMULATION
                                 → phase_change recibido
                                 → Navigate a /scheduler
────────────────────────────────
8. Ve progreso en tiempo real
   - student_ready
   - submissions
                                 9. Planifica secuencia
                                 10. Presiona "Start Scan"
                                 11. BloqueoOverlay (waiting)
                                 12. submit via WS
────────────────────────────────
13. Presiona PAUSE
   → pause message
                                 → BloqueoOverlay (paused)
────────────────────────────────
14. Presiona RESUME
   → resume message
                                 → Overlay cae
                                 → Continúa o nueva secuencia
────────────────────────────────
15. Presiona PODIUM
   → phase_change: PODIUM
   → leaderboard final
                                 → phase_change recibido
                                 → Overlay cae
                                 → Navigate a /panel
                                 → Ve leaderboard
```

---

## API WebSocket - ConsoleScreen

### Mensajes Recibidos (Server → Client)

```typescript
// Cambio de fase
{ type: 'phase_change', payload: { phase, timer } }

// Pausa (del docente)
{ type: 'pause' }

// Resumen (del docente)
{ type: 'resume' }

// Error
{ type: 'error', payload: { code, message } }
```

### Mensajes Enviados (Client → Server)

```typescript
// Submit de planificación
{
  type: 'submit',
  payload: {
    session_id: string,
    sequence_name: string,
    p_geo: number,      // 0.0 - 1.0
    p_ant: number,      // 0.0 - 1.0
    p_param: number,     // 0.0 - 1.0
    time_ms: number
  }
}

// Student ready
{ type: 'student_ready' }
```

---

## Tareas de Implementación

### Fase 1: WebSocket en ConsoleScreen
- [ ] Importar y usar `useSessionSocket` hook
- [ ] Obtener `sessionId` del estado global o URL
- [ ] Conectar con `role='student'`
- [ ] Escuchar `phase_change`, `pause`, `resume`

### Fase 2: BloqueoOverlay
- [ ] Importar `BloqueoOverlay`
- [ ] Crear estado `bloqueo: { visible, reason, message }`
- [ ] Mostrar en `phase === 'ACQUISITION'` o después de submit

### Fase 3: Submit con Scoring
- [ ] Crear función `calculateScores(params, fovBox)`
- [ ] Implementar `calculateP_geo`: FOV position accuracy
- [ ] Implementar `calculateP_ant`: Antenna selection
- [ ] Implementar `calculateP_param`: TR/TE/flip in range
- [ ] Enviar submit en "Start Scan"

### Fase 4: Control de Fases
- [ ] Solo permitir cambios en fase SIMULATION
- [ ] Mostrar UI apropiado en BRIEFING (caso clínico)
- [ ] Mostrar UI apropiado en ACQUISITION (espera)
- [ ] Mostrar UI apropiado en PODIUM (resultados)

### Fase 5: Integración Completa
- [ ] Test end-to-end con TeacherDashboard
- [ ] Verificar scoring calculation
- [ ] UX de debriefing

---

## Parámetros de Scoring

### p_geo (Geographic Score)
- Posición del FOV en el plano
- Centrado vs descentrado
- Rango: 0.7 - 1.0

### p_ant (Antenna Score)
- Selección correcta de antena:
  - Head: Head Coil
  - Body: Body Array
  - Spine: Spine Array
  - Cardiac: Cardiac Coil
- Rango: 0.0 - 1.0

### p_param (Parameter Score)
Comparación con valores ideales:
| Secuencia | TR ideal | TE ideal | Flip ideal |
|-----------|----------|----------|------------|
| T1 | 400-600 | 10-20 | 70-90 |
| T2 | 3000-5000 | 80-120 | 90-150 |
| FLAIR | 8000-12000 | 80-120 | 90-180 |
| DWI | 3000-6000 | 50-100 | 90-180 |

---

## Notas Técnicas

### Viewport Orientation → FOV Plane
```
Axial:    restrictionPlane = (0, 0, 1) → move in X-Y
Coronal:  restrictionPlane = (0, 1, 0) → move in X-Z
Sagittal: restrictionPlane = (1, 0, 0) → move in Y-Z
```

### FOV ↔ Params Sync
```
depth = slices * (sliceThickness + gap)
phase = fovRead * (fovPhase / 100)
```

### Scoring Formula (Backend)
```go
m_tiempo = 1.0 - ((time-15)/45 * 0.5)  // 1.0 at 15s, 0.5 at 60s+
P_total = (0.30 * p_geo + 0.30 * p_ant + 0.40 * p_param) * m_tiempo
```

---

## Testing

```bash
# Backend
cd /home/nicolas/Documentos/personales/MRInativo/backend
DB_HOST=127.0.0.1 DB_PORT=3306 DB_USER=mriuser DB_PASSWORD=mripass DB_NAME=mri_console ./mri-server

# Frontend
cd /home/nicolas/Documentos/personales/MRInativo/frontend
npm run dev
```

### Credenciales
- Admin: admin@facultad.edu / admin123
- Docente: docente@facultad.edu / docente123
- Alumno: alumno@uni.edu / alumno123
