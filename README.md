# La Guaupelu de Lya · Web

Prototipo navegable con React, TypeScript, Vite, Tailwind CSS, React Router, Motion y componentes de composición basados en Radix/cva. La landing consulta el catálogo y el contacto con TanStack Query. Las citas de demostración se guardan en el navegador.

## Arranque

Requiere Node 22.14 o compatible y npm. Desde este directorio:

```sh
npm ci
npm run dev
```

Abrir `http://localhost:5173/`. Para ver los datos de la landing, arrancar también el backend con el perfil `local` en el puerto 8080. Vite reenvía la consulta pública a esa API. Para comprobar la entrega:

```sh
npm test
npm run build
npm run format:check
```

Para las pruebas de navegador: `npx playwright install webkit` y `npm run test:browser`. En Windows se utiliza Edge instalado para escritorio; en Linux instalar también Chromium con `npx playwright install chromium`. Las pruebas emplean perfiles limpios y datos ficticios, sin usar la sesión personal del navegador.

Las pruebas usan el ejecutor nativo de Node y su soporte experimental de TypeScript, sin Vitest. `npm run preview` sirve la compilación local. El despliegue está preparado con Docker/Nginx: ver [DEPLOY_RAILWAY.md](DEPLOY_RAILWAY.md). No se ha publicado desde esta sesión.

## Recorridos

- `/`: landing con logotipo facilitado, ilustración vectorial propia y contenido propuesto.
- `/registro` e `/iniciar-sesion`: alta y acceso de clientes mediante la API. La primera fase permite entrar con el correo pendiente de verificar.
- `/mi-espacio`: perfil de la cuenta autenticada y alta, consulta y edición de sus mascotas en la API. `/demo/mi-espacio` acompaña las citas de ejemplo.
- `/reservar`: mascota, cuidado, fecha/hora y confirmación. Tras confirmar, la cita aparece en ambas áreas.
- `/gestion`: agenda con día, semana y mes; detalle para rechazo con motivo, asistencia y validación. La asistencia solo se habilita al comenzar la cita y la no presentación al terminar su duración prevista.
- `/gestion/clientes`: directorio de clientes registrados y edición de las mismas mascotas que aparecen en Mi espacio. El filtro de revisión y el historial de ejemplo pertenecen al recorrido de la agenda de demostración.
- `/gestion/servicios`: alta, edición y desactivación de servicios base mediante la API. La landing y el formulario consultan los servicios publicados. Editar el catálogo conserva el precio y la duración de las citas de ejemplo ya creadas.
- `/gestion/configuracion`: horarios semanales, especies admitidas, antelación para cancelar y restablecimiento de datos.

## Límites de la demostración

El panel exige una cuenta de dueña y se abre desde `/acceso-gestion`. Las fichas y citas de demostración siguen almacenadas en el navegador. El catálogo y el contacto de la landing proceden de la API, con un catálogo inicial vacío hasta que se publiquen servicios aprobados.

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
