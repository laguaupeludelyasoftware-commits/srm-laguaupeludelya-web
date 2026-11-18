# Prototipo web en Railway

Conectar el repositorio al servicio frontend. En repositorio independiente usar su raíz; si incluye ambos proyectos, Root Directory será `srm-laguaupeludelya-web`.

El Dockerfile compila con Node 22 y `npm ci`, y sirve dist con Nginx. No usar `npm run dev` ni `npm run preview` como Start Command. Quitar overrides anteriores para utilizar el comando del contenedor. `railway.json` configura `/health` como healthcheck.

Nginx escucha en PORT, con valor inicial 8080. La imagen oficial sustituye la variable al arrancar. `nginx/default.conf.template` resuelve rutas SPA a index.html, permitiendo abrir directamente y recargar `/gestion/clientes`. Los assets inexistentes devuelven 404.

Este frontend no necesita credenciales PostgreSQL ni claves RSA. Sigue siendo una demostración con datos locales por navegador y origen, sin sincronización entre equipos. El panel es público de forma intencionada para revisar el prototipo. No introducir datos personales reales.

Coloca la web y la API en el mismo proyecto y entorno de Railway. En **Variables** del frontend, configura `BACKEND_URL` con el origen HTTP interno de la API, sin barra final. Si el servicio se llama `srm-laguaupeludelya-api` y escucha en `8080`, usa:

```text
BACKEND_URL=http://${{srm-laguaupeludelya-api.RAILWAY_PRIVATE_DOMAIN}}:8080
```

Sustituye el nombre y el puerto por los del servicio real. Si has definido `PORT` como variable del backend, puedes usar `${{srm-laguaupeludelya-api.PORT}}`. Nginx lee `BACKEND_URL` al arrancar y reenvía `/api/public/business` a la API privada. Mantén el origen de la web en `APP_CORS_ALLOWED_ORIGINS` del backend. Las reservas y el panel siguen usando los datos de demostración del navegador.

Después de desplegar, abre `/api/public/business` **en el dominio de la web**. Debe devolver JSON con el contacto. Un `503` indica que falta `BACKEND_URL` y un `502` indica que Nginx no pudo resolver o alcanzar la API o que esta cerró la conexión. Si recibes HTML, revisa que la web esté sirviendo el despliegue que incluye el proxy.

Tras desplegar, revisar landing y logotipo, apertura directa/recarga de `/gestion/clientes` y `/reservar`, persistencia/restablecimiento y diseño en móvil/iPad real. Hay 35 pruebas Playwright correctas de tamaños móviles, tablet y escritorio, sin sustituir la comprobación en el dispositivo. Los contenedores no se han ejecutado localmente porque Docker Engine no estaba disponible; la compilación Vite se verifica por separado.
