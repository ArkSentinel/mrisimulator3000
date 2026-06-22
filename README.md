# MRInativo

## Requisitos

- [Docker](https://docs.docker.com/get-docker/) y [Docker Compose](https://docs.docker.com/compose/install/)
- Node.js >= 22.12.0
- Go 1.23 (solo si ejecutas el backend sin Docker)

---

## 1. Clonar e ir al proyecto

```bash
git clone <repo-url>
cd MRInativo
```

## 2. Variables de entorno

```bash
cp .env.example .env
```

Editar `.env` si es necesario (los valores por defecto funcionan para desarrollo local).

## 3. Iniciar backend (API + base de datos)

Con Docker (recomendado):

```bash
docker compose up -d
```

Esto levanta:
- **MariaDB** en `localhost:3306`
- **API** en `http://localhost:3000`

Sin Docker:

```bash
cd backend
cp .env.example .env   # si no existe
go mod download
go run ./cmd/server
```

## 4. Iniciar frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Se abre en `http://localhost:5173`.

## 5. Iniciar Minor Meridian (Astro)

```bash
cd minor-meridian
npm install
npm run dev
```

Se abre en `http://localhost:4321`.

---

## Resumen de servidores

| Servicio      | URL                             |
|---------------|---------------------------------|
| API           | `http://localhost:3000`         |
| Frontend      | `http://localhost:5173`         |
| Minor Meridian| `http://localhost:4321`         |
| MariaDB       | `localhost:3306`                |

## Comandos útiles

```bash
# Ver logs del backend
docker compose logs -f app

# Detener servicios
docker compose down

# Reconstruir backend tras cambios
docker compose up -d --build app
```
