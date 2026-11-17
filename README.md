# La Guaupelu de Lya · Web

Primer prototipo local navegable. React, TypeScript, Vite, Tailwind CSS, React Router, Motion y componentes de composición basados en Radix/cva (patrón shadcn/ui). TanStack Query está preparado como proveedor para la futura integración; las pantallas actuales utilizan un adaptador local.

## Arranque

Requiere Node 22.14 o compatible y npm. Desde este directorio:

```sh
npm ci
npm run dev
```

Abrir `http://localhost:5173/`. Puerto fijo: si ya está ocupado, detener primero el proceso que lo utiliza. Para comprobar la entrega:

```sh
npm test
npm run build
npm run format:check
```

Para las pruebas de navegador: `npx playwright install webkit` y `npm run test:browser`. En Windows se utiliza Edge instalado para escritorio; en Linux instalar también Chromium con `npx playwright install chromium`. Las pruebas emplean perfiles limpios y datos ficticios, sin usar la sesión personal del navegador.

Las pruebas usan el ejecutor nativo de Node y su soporte experimental de TypeScript, sin Vitest. `npm run preview` sirve la compilación local. El despliegue está preparado con Docker/Nginx: ver [DEPLOY_RAILWAY.md](DEPLOY_RAILWAY.md). No se ha publicado desde esta sesión.

## Recorridos

- `/`: landing con logotipo facilitado, ilustración vectorial propia y contenido propuesto.
- `/registro`: registro de ejemplo y verificación simulada. No envía correos ni guarda contraseñas.
- `/mi-espacio`: Clara y Nala son la cuenta inicial de demostración; registro permite crear otra cuenta ficticia. Mascotas, citas y cancelación.
- `/reservar`: mascota, cuidado, fecha/hora y confirmación. Tras confirmar, la cita aparece en ambas áreas.
- `/gestion`: agenda con día, semana y mes; detalle para rechazo con motivo, asistencia y validación. La asistencia solo se habilita al comenzar la cita y la no presentación al terminar su duración prevista.
- `/gestion/clientes`: búsqueda, filtro de revisión, ficha, mascotas, historial interno de tratamientos y alta manual validada. La invitación es simulada.
- `/gestion/servicios`: alta/edición/desactivación de servicios, precios base, duración y especies. Editar catálogo no reescribe citas anteriores.
- `/gestion/configuracion`: horarios semanales, especies admitidas, antelación para cancelar y restablecimiento de datos.

## Límites de la demostración

**No es el MVP terminado ni un sistema seguro para datos reales.** El selector de áreas es público y no hay autenticación, autorización de servidor ni integración con la API. Todos los datos son ficticios y el aviso de demostración permanece visible.

Los cambios se almacenan en `localStorage`, clave `lya-demo-v1`. El panel permite restablecer únicamente esa colección. Si el navegador no permite guardar, se muestra un aviso y se sigue en memoria. No introducir información personal ni contraseñas reales.

Se simula una profesional y una cita a la vez, sin pausas, recursos ni excepciones por fecha. Huecos cada 30 minutos con duraciones configurables. No es una decisión definitiva sobre la operación del negocio. Las fechas usan la zona del navegador; la API futura debe definir y comprobar Europe/Madrid y la concurrencia real.

La cuenta inicial tiene correo verificado pero validación presencial pendiente. Se aplica una cita futura confirmada por cuenta y la política acordada: primera cancelación en plazo permite otro intento, segunda cancelación/tardía/no presentación requiere revisión; rechazos del negocio no cuentan. Valor inicial: 8 horas. Para clientes ya validados no se aplica el bloqueo inicial. La política definitiva de cancelación posterior a la validación está pendiente.

En este prototipo los cambios de antelación se aplican a las próximas acciones sobre cualquier cita. La política de producción para citas ya reservadas se decidirá aparte. No hay reprogramación, motor tarifario por peso/manto, recuperación de contraseña, notificaciones ni editor de permisos.

No se proporcionan datos de contacto inventados ni enlaces de WhatsApp ficticios. Las fuentes tipográficas se solicitan a Google Fonts, con alternativas locales. El contenido público definitivo y la estrategia de indexación están pendientes.

## Organización

- `src/domain`: contratos y reglas puras del prototipo con pruebas de límites.
- `src/data`: ejemplos y adaptador de estado local reemplazable por API.
- `src/components`: identidad, layouts y primitivas accesibles compartidas.
- `src/features`: landing, cliente, reservas y gestión.
- `src/styles.css`: tokens visuales, estilos por área, adaptación y movimiento reducido.

Documentación de funciones y componentes en español. Prettier mantiene formato consistente. Las decisiones y escenarios están en `../OpenSpec/changes/prototipo-web-inicial/`.

## Verificación y pendientes de entorno

El intento inicial con CUA falló (`Computer Use native pipe is unavailable`). Posteriormente se añadió verificación Playwright: 35 pruebas correctas con WebKit para tamaños de móvil/iPad y Edge para escritorio; incluye navegación, reserva/cancelación, agenda, fichas, controles táctiles y configuración. Se revisaron capturas de móvil, iPad y PC. Falta la comprobación final en un iPad físico: emular tamaño, tacto y motor no reproduce todo el hardware/Safari real.

La prioridad es móvil para clientes e iPad para la dueña, conservando el escritorio. `src/styles-responsive.css` contiene ajustes táctiles y de distribución: objetivos principales de 44px, entradas a 16px para evitar zoom de iOS, navegación tablet, clientes en tarjetas móviles y agenda semanal con scroll contenido. En móvil el mes se explora mediante una lista de días que abre su agenda diaria.

La instalación detectó avisos en herramientas de desarrollo transitivas de Vite relacionados con `picomatch`. No se aplican degradaciones forzadas de Vite para ocultarlos; revisar versiones corregidas antes de exponer el servidor de desarrollo. El servidor se limita a localhost. Las dependencias de ejecución se comprueban por separado con `npm audit --omit=dev`.
