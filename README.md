# MCP-MRISimulator - Simulador de Consola MRI

Sistema de entrenamiento para operación de consola MRI. Incluye frontend React + Vite, backend Go con Fiber, y base de datos MariaDB remota.

---

## Requisitos Previos

### Todos los sistemas operativos

| Software | Versión mínima | Instalación |
|----------|---------------|-------------|
| [Git](https://git-scm.com/) | 2.x | [git-scm.com](https://git-scm.com/downloads) |
| [Node.js](https://nodejs.org/) | 22.12.0 | [nodejs.org](https://nodejs.org/) |
| [Go](https://go.dev/) | 1.21 | [go.dev/dl](https://go.dev/dl/) |

### macOS

```bash
# Con Homebrew
brew install git node go
```

### Windows

```powershell
# Con Winget
winget install Git.Git
winget install OpenJS.NodeJS
winget install GoTeam.Go
```

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install git nodejs npm golang-go
```

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone <repo-url>
cd MRInativo
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # ya tiene la config de la BD remota

go mod download
go run ./cmd/server
```

El backend se inicia en `http://localhost:3000`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

El frontend se inicia en `http://localhost:5173`.

---

## Estructura del Proyecto

```
MRInativo/
├── backend/              # API Go + Fiber
│   ├── cmd/server/      # Punto de entrada
│   ├── internal/
│   │   ├── config/       # Configuración
│   │   ├── database/    # Conexión MariaDB
│   │   ├── handlers/     # Controladores HTTP
│   │   ├── middleware/   # Auth, logging
│   │   ├── models/       # Modelos de datos
│   │   └── services/    # Lógica de negocio
│   └── .env              # Variables de entorno
├── frontend/             # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/   # Componentes React
│   │   ├── hooks/        # Custom hooks
│   │   ├── context/      # React Context
│   │   └── pages/        # Páginas
│   └── package.json
├── docs/                 # Documentación
│   └── database-schema.md
└── README.md
```

---

## Credenciales de Prueba

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | admin@facultad.edu | admin123 |
| Admin | admin2@facultad.edu | admin123 |
| Admin | admin3@facultad.edu | admin123 |
| Docente | docente@facultad.edu | docente123 |
| Docente | docente2@facultad.edu | docente123 |
| Docente | docente3@facultad.edu | docente123 |
| Alumno | alumno@uni.edu | alumno123 |
| Alumno | alumno2@uni.edu | alumno123 |
| Alumno | alumno3@uni.edu | alumno123 |

---

## URLs de Servicios

| Servicio | URL |
|----------|-----|
| Frontend | `http://localhost:5173` |
| API | `http://localhost:3000` |
| Documentación BD | `docs/database-schema.md` |

---

## Comandos Útiles

```bash
# Backend
go run ./cmd/server          # Iniciar
go build ./...               # Compilar

# Frontend
npm run dev                  # Desarrollo
npm run build                # Producción
npm run lint                 # Linting
```

---

## Solución de Problemas

### Puerto ya en uso

**macOS/Linux:**
```bash
lsof -i :3000    # encontrar proceso
kill -9 <PID>
```

**Windows:**
```powershell
netstat -ano | findstr :3000
taskkill /F /PID <PID>
```

### Error de conexión a BD

Verifica que el servicio de base de datos remota esté accesible. Los valores en `.env` ya están configurados para la base de datos de desarrollo.

### Problemas con node_modules

```bash
rm -rf node_modules package-lock.json
npm install
```
