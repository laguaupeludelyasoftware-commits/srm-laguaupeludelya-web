# Prototipo web en Railway

Conectar el repositorio al servicio frontend. En repositorio independiente usar su raíz; si incluye ambos proyectos, Root Directory será `srm-laguaupeludelya-web`.

El Dockerfile compila con Node 22 y `npm ci`, y sirve dist con Nginx. No usar `npm run dev` ni `npm run preview` como Start Command. Quitar overrides anteriores para utilizar el comando del contenedor. `railway.json` configura `/health` como healthcheck.

Nginx escucha en PORT, con valor inicial 8080. La imagen oficial sustituye la variable al arrancar. `nginx/default.conf.template` resuelve rutas SPA a index.html, permitiendo abrir directamente y recargar `/gestion/clientes`. Los assets inexistentes devuelven 404.

Este frontend no necesita credenciales PostgreSQL ni claves RSA. Sigue siendo una demostración con datos locales por navegador y origen, sin sincronización entre equipos. El panel es público de forma intencionada para revisar el prototipo. No introducir datos personales reales.

Para conectar la landing, configurar `VITE_API_BASE_URL` en el servicio web con la URL pública HTTPS del backend, antes de compilar. La API debe incluir el origen de la web en `APP_CORS_ALLOWED_ORIGINS`. Las reservas y el panel siguen usando los datos de demostración del navegador. Las variables VITE quedan visibles en el código compilado.

Tras desplegar, revisar landing y logotipo, apertura directa/recarga de `/gestion/clientes` y `/reservar`, persistencia/restablecimiento y diseño en móvil/iPad real. Hay 35 pruebas Playwright correctas de tamaños móviles, tablet y escritorio, sin sustituir la comprobación en el dispositivo. Los contenedores no se han ejecutado localmente porque Docker Engine no estaba disponible; la compilación Vite se verifica por separado.
