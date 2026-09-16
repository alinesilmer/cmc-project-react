# CMC · Frontend

Frontend del Colegio Médico de Corrientes. Un único bundle de Vite sirve dos aplicaciones:

- **Panel de gestión** (`/panel/*`): facturación, liquidación y pagos, padrones, nomenclador, validaciones de obras sociales, reportes y administración de usuarios.
- **Sitio institucional** (el resto de las rutas): inicio, noticias, servicios, convenios y un panel de edición de noticias.

El backend es un repositorio aparte: **cmc_api** (FastAPI + MySQL).

## Stack

| Área | Tecnología |
|---|---|
| Base | React 19, TypeScript 5.8, Vite 7 |
| Ruteo | React Router 7, rutas con `lazy()` |
| Datos | Axios (`src/app/lib/http.ts`) y TanStack Query |
| UI | MUI 7, SCSS Modules, framer-motion, lucide-react |
| Documentos | exceljs (escritura), xlsx/SheetJS (lectura), jsPDF, pdfjs-dist |
| Gráficos | Recharts (solo en Reportes) |

## Requisitos

- Node 20 (la versión que usa CI)
- La API `cmc_api` corriendo en `http://127.0.0.1:8000` para desarrollo

## Puesta en marcha

```bash
npm ci
npm run dev        # http://127.0.0.1:5173
```

En desarrollo, Vite hace de proxy de `/api`, `/auth` y `/uploads` hacia `127.0.0.1:8000` (ver `vite.config.ts`), así que no hace falta configurar la URL de la API.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Build de producción en `dist/` |
| `npm run typecheck` | Chequeo de tipos con `tsc` |
| `npm run lint` | ESLint |
| `npm run preview` | Sirve el build localmente |

`npm run build` no chequea tipos: correr `typecheck` antes de subir cambios.

## Variables de entorno

Se leen en tiempo de build (`import.meta.env`). Los archivos `.env.*` no se versionan.

| Variable | Uso |
|---|---|
| `VITE_API_URL` | URL base de la API en producción. En desarrollo se ignora y se usa el proxy. |
| `VITE_URL_BASE_LEGACY` | URL del sistema legacy, para el acceso SSO desde el sitio. |
| `VITE_API_URL_BASE` | URL de la API para el cliente del panel de noticias (`src/website/lib/api.ts`). |

## Estructura

```
src/
├── main.tsx              Providers: Router, React Query, tema MUI, Auth
├── routes.tsx            Rutas del panel y montaje del sitio institucional
├── app/                  Panel de gestión
│   ├── auth/             Sesión, tokens, guards de ruta y permisos
│   ├── components/       Componentes compartidos (atoms, molecules)
│   ├── config/           Configuración por ambiente
│   ├── hooks/            Hooks compartidos (notificaciones, formularios)
│   ├── lib/              Cliente HTTP, fechas, exportación, paginado
│   ├── pages/            Una carpeta por pantalla o dominio
│   ├── styles/           Variables y estilos globales SCSS
│   ├── types/            Tipos compartidos
│   └── utils/            Validaciones y parsers de precios
└── website/              Sitio institucional
    ├── router.tsx
    ├── app/              Páginas del sitio
    ├── components/
    └── lib/              Clientes de API del sitio
```

Las pantallas grandes siguen este patrón dentro de `pages/<Dominio>/`: `*.api.ts` (llamadas), `*.types.ts` (tipos), `use*.ts` (hooks) y el componente de página.

## Convenciones

- **HTTP**: usar siempre los helpers de `src/app/lib/http.ts` (`getJSON`, `postJSON`, `postForm`, etc.). La instancia agrega el token, renueva la sesión ante un 401 y reintenta la request. No usar `fetch` ni crear otra instancia de axios.
- **Permisos**: proteger rutas con `RequireScope` y ocultar acciones con `usePermisos()`. Los scopes vienen del backend.
- **Estilos**: SCSS Modules por componente, con las variables de `src/app/styles/variables.scss`.
- **Rutas**: toda página nueva se registra en `src/routes.tsx` con `lazy()`.

## Autenticación

1. `POST /auth/login` devuelve el access token (en `sessionStorage`) y deja el refresh token en una cookie httpOnly, más una cookie `csrf_token` que el refresh reenvía como `X-CSRF-Token`.
2. Ante un 401, el interceptor de `http.ts` llama a `refreshSession()` (`auth/session.ts`), que serializa el refresh entre requests y pestañas.
3. Si el refresh falla, `forceLogout()` limpia la sesión y avisa a las otras pestañas.

## Deploy

Cada push a `master` dispara `.github/workflows/main.yml`:

1. `npm ci` y `npm run build` con las variables de producción.
2. Empaqueta `dist/` en un `.tgz` y lo copia al VPS por SCP.
3. Lo descomprime en el volumen `web_dist` y recarga Caddy.
