# The Last Bastion

Juego Tower Defense 3D de fantasía medieval, con construcción libre y una campaña de tres misiones. Three.js genera todo el escenario y los personajes mediante geometría low-poly. No requiere recursos externos, cuentas ni claves API.

## Ejecutar

Requisitos: Node.js 20.19+ o 22.12+ y un navegador de escritorio con WebGL 2 y aceleración por hardware. El entorno de desarrollo se ha validado con Node.js 24.

```sh
npm install
npm run dev
```

Abre en tu navegador la dirección que indique Vite. Para una instalación reproducible usa `npm ci`. La caché de npm se guarda en `.npm-cache/`, un directorio local ignorado por Git, para admitir entornos con el directorio personal de solo lectura.

```sh
npm test             # Pruebas de simulación independientes de WebGL
npm run build        # TypeScript estricto + compilación de producción
npm run preview      # Servir dist/ después de compilar
npm run test:browser # Interacción real en Chromium con Playwright
```

Las pruebas de navegador usan Chromium del sistema si existe en `/usr/bin/chromium`. En otros equipos ejecuta `npx playwright install chromium` o indica su ejecutable con `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. Playwright inicia Vite automáticamente para las pruebas. Las capturas se guardan en `test-results/`.

## Publicar en GitHub Pages, paso a paso

El código incluye dos automatizaciones: **Comprobar el juego** comprueba cada cambio en `main`; **Publicar The Last Bastion** compila y publica solo cuando tú la ejecutas. No necesitas Node.js en tu computadora para publicar desde GitHub.

1. Abre tu repositorio: https://github.com/Dabot11/LastBastion
2. En la barra superior del repositorio, pulsa **Settings** (Configuración).
3. En el menú lateral izquierdo, pulsa **Pages**.
4. En **Build and deployment → Source**, selecciona **GitHub Actions**. No elijas una carpeta ni una rama para servir los archivos originales.
5. Vuelve a la barra superior del repositorio y pulsa **Actions**.
6. En la lista de la izquierda, selecciona **Publicar The Last Bastion**.
7. Pulsa **Run workflow**, selecciona la rama **main** y confirma con el botón verde **Run workflow**.
8. Espera a que la ejecución termine con una marca verde. Abre esa ejecución para ver el enlace de la publicación, o vuelve a **Settings → Pages** y pulsa **Visit site**.

La dirección prevista, después de una publicación exitosa, es **https://dabot11.github.io/LastBastion/**. Este enlace no funciona hasta completar la primera publicación.

Para publicar actualizaciones, guarda el código actualizado en `main` y repite los pasos 5–8. La publicación es manual para que tú decidas cuándo cambiar la versión pública. Los archivos de `dist/` se generan automáticamente y no se suben al repositorio. Vite usa rutas de recursos relativas para que el juego cargue dentro de `/LastBastion/`.

Si no ves **Settings**, entra con una cuenta administradora del repositorio. Si GitHub indica que tu plan no admite Pages para un repositorio privado, necesitas un plan compatible o un repositorio público; revisa esa decisión antes de cambiar su visibilidad. Si no aparece la automatización en Actions, comprueba que los archivos `.github/workflows/` estén en la rama `main` y que Actions esté habilitado para el repositorio.

## Cómo jugar

Defiende un castillo de **1000 puntos de salud** usando tus **300 monedas iniciales**. Todos los enemigos salen del portal inferior derecho y siguen el mismo camino serpentino hasta el castillo superior izquierdo. El camino está hundido entre plataformas elevadas y no tiene bifurcaciones. No hay agua.

Selecciona una torre y mueve el cursor sobre el césped. La vista previa verde permite construir; la roja indica un obstáculo, el camino, falta de espacio o falta de oro. No hay casillas ni espacios de construcción predeterminados. El círculo muestra el alcance real.

| Defensa | Oro | Ventaja |
| --- | ---: | --- |
| Arqueros | 100 | Ataques rápidos contra enemigos pequeños |
| Ballesta | 150 | Gran alcance; ignora el 80% de la armadura física |
| Cañón | 200 | Explosiones que dañan a todos los enemigos de su radio |
| Mago | 150 | Magia que evita la resistencia física |

Haz clic en una torre construida para ver sus estadísticas, mejorarla hasta **nivel 3** o venderla por **el 70%** de lo invertido. Las mejoras aumentan daño, alcance y frecuencia; las del cañón también aumentan su radio de explosión.

Hay cuatro enemigos: esbirros, corredores rápidos, bestias acorazadas y guardianes con resistencia física y mágica. Cada misión tiene una composición propia y un final definido. Durante la preparación ves los enemigos de la próxima oleada y una sugerencia de defensa; los guardianes se anuncian antes de empezar y llegan con escoltas. Tienes 20 segundos de preparación entre oleadas y puedes iniciar la siguiente antes de tiempo. Al completar una oleada recibes una bonificación de oro.

Las defensas tienen prioridades diferentes: arqueros contra la primera línea, ballestas contra amenazas acorazadas, cañones contra grupos y magos contra armadura vulnerable a magia. Combinar posiciones y mejoras conserva más salud que abandonar las torres iniciales. Los ajustes de economía, enemigos y resultados están documentados en [BALANCE.md](BALANCE.md). Para repetir las simulaciones sin abrir WebGL, ejecuta `npm run balance`.

Cuando el castillo pierde toda su salud aparece **Game Over**. Resiste la última oleada y elimina todos los enemigos para ganar: verás estrellas, puntuación y el siguiente destino desbloqueado. Cada misión comienza de nuevo con 300 de oro, 1000 de salud y ninguna torre; el progreso de campaña permanece.

### Campaña y recompensas

| Misión | Oleadas | Escenario y defensas |
| --- | ---: | --- |
| Aldea de los pinos | 5 | Bosque; arqueros y ballestas |
| Villa del mercado | 6 | Camino vertical entre viviendas; añade cañones; un guardián final |
| Ciudadela real | 7 | Edificios de piedra, pinos y otra ruta; añade magos y varios guardianes |

Ganar una misión desbloquea la siguiente. Las estrellas premian el estado del castillo: **una** por ganar, **dos** conservando al menos 60% de salud y **tres** conservando al menos 90%. Puedes repetir cualquier misión desbloqueada para mejorar el resultado. El menú de campaña conserva la mejor puntuación y cantidad de estrellas de cada misión; una repetición peor no reduce tus marcas ni suma estrellas duplicadas.

El progreso se guarda en `localStorage` bajo `last-bastion-campaign-v1`. Sin almacenamiento disponible se conserva en memoria durante la sesión. No se sincroniza entre dispositivos. El antiguo récord de supervivencia, si existía, queda intacto en su clave anterior; las estrellas de campaña empiezan desde cero.

El oro solo sirve para construir y mejorar durante cada misión. XP, niveles de comandante y monedas persistentes se reservan para futuras iteraciones. El alcance y criterio de esas iteraciones están en [DESIGN.md](DESIGN.md).

### Controles

- **1–4:** seleccionar defensa; **clic izquierdo:** construir o seleccionar torre.
- **Escape / clic derecho:** cancelar la construcción o cerrar la selección.
- **Rueda:** zoom; **arrastrar:** desplazar la cámara cuando no estás construyendo.
- **Espacio:** pausar/reanudar; en pausa puedes construir, mejorar y vender.
- **1× / 2×:** velocidad de simulación; **M:** activar/silenciar efectos.
- **?:** guía de juego; **Restablecer vista:** encuadre inicial.

El juego se pausa al ocultar la pestaña. La guía también detiene la simulación. El sonido comienza silenciado y solo se activa tras una interacción.

## Estructura

```text
src/
  game/
    config.ts       Balance centralizado: costos, enemigos, daño y niveles
    path.ts         Ruta ordenada, distancias, obstáculos y construcción
    simulation.ts   Enemigos, oleadas, torres, proyectiles, victoria y economía
    missions.ts     Las tres misiones, mapas, armas y composición de oleadas
    progress.ts     Estrellas, desbloqueos y guardado de campaña
  scene/
    models.ts       Geometría y materiales reutilizables
    terrain.ts      Decoración, vegetación, castillo y portal
    landscape.ts    Valle continuo y paredes de cañón por contornos
    scenery.ts      Bosque, colinas, crestas rocosas y atalayas de fondo
    surfaces.ts     Relieve exterior, pigmento y sombras de contacto generados
    effects.ts      Partículas agrupadas, destellos y anillos de impacto
    view.ts         Renderizado, cámara, raycasting, vista previa y efectos
  audio.ts          Sonidos sintéticos con Web Audio
  ui.ts             HUD, tarjetas, mejoras, guía y pantalla de derrota
  main.ts           Controles, ciclo de pasos fijos y campaña persistente
  style.css         Interfaz adaptable
tests/
  simulation.test.ts
  balance.test.ts
  campaign.test.ts
  graphics.test.ts
  browser/game.spec.ts
scripts/
  balance-scenarios.ts  Estrategias legales y combate real reproducible
  balance-report.ts     Comparación de dificultad, economía y duración
```

La simulación no depende de Three.js ni del DOM. Usa pasos de 20 ms y tiempo transcurrido, con límite de recuperación para evitar saltos después de una interrupción prolongada. El renderizado agrupa escenario y cuerpos por material, reutiliza modelos y geometrías, construye el valle por contornos e instancia las rocas y hasta 200 partículas. El muestreo del suelo es más fino junto al camino y más espaciado en el paisaje lejano. Las sombras del escenario se actualizan al construir, vender o cambiar de mapa. El pigmento del terreno, las sombras de contacto y el mapa de brillo de antorchas y hechizos se generan con pequeñas texturas reutilizables. No se descargan texturas ni modelos externos.

## Aspecto visual

El campo de batalla forma parte de un valle que continúa más allá de la zona de construcción. No tiene una base rectangular ni paredes exteriores de tablero: el fondo incluye laderas con bosque, crestas rocosas, atalayas y niebla azul que suaviza la distancia. El suelo del área jugable sigue siendo llano y conserva las rutas y reglas de construcción de cada misión. Los pinos tienen ramas y copas irregulares; arbustos, flores, vallas y edificios añaden detalle a cada región.

El escenario ocupa toda la pantalla. Los recursos, controles y tarjetas de defensas aparecen en paneles flotantes. La cámara muestra más cerca el castillo y la entrada enemiga, con un ángulo que deja el recorrido fuera de las tarjetas en desktop. Se puede acercar o alejar con los botones **+ / −** o la rueda, arrastrar para explorar y **Restablecer vista** para recuperar el encuadre inicial.

El castillo y las torres tienen mampostería, banderas, almenas y armas reconocibles. Las torres reaccionan a los disparos y sus mejoras añaden adornos. Las flechas y virotes tienen puntas y plumas; los magos disparan orbes con estela; los cañones tienen destellos y ondas de explosión correspondientes al radio real de daño. Los enemigos se distinguen por sus cuerpos, armaduras, cuernos y tamaños.

Las pruebas geométricas usan raycasting sobre la superficie renderizada para comprobar que toda la ruta sigue hundida, que la base completa de una torre legal descansa sobre terreno elevado y que el valle continúa por los cuatro lados sin ampliar el área de construcción. Las pruebas de navegador comprueban además que ningún punto de las tres rutas quede detrás de un control en resoluciones de 900×700, 1280×720, 1440×960 y 1920×1080, y que el zoom y el restablecimiento funcionen.

## Validación y alcance

Las pruebas comprueban continuidad y ausencia de cruces de la ruta, movimiento a diferentes FPS, construcción válida a ambos lados, obstáculos, economía, niveles, venta, resistencias, adquisición de objetivos, disparos de las cuatro defensas, daño en área, recompensas únicas, oleadas finitas, daño al castillo, derrota, victoria, estrellas, persistencia, desbloqueos y estado de una nueva misión.

Las pruebas de navegador comprueban WebGL real, colocación con cursor, selección, mejoras, venta, falta de oro, pausa, velocidad, guía, combate con recompensa, adaptación a una ventana de escritorio pequeña, derrota real, victoria, guardado de las estrellas, desbloqueo de todas las misiones y defensas, cambio de mapa y reinicio completo.

Los gráficos son una interpretación procedural de la referencia; los personajes y animaciones son deliberadamente sencillos. El equilibrio de las tres misiones necesita sesiones reales de juego. No hay multijugador ni sincronización de progreso entre dispositivos. La experiencia está diseñada para escritorio, aunque la interfaz se adapta a ventanas pequeñas. El rendimiento depende de la GPU y WebGL disponibles.

Posibles mejoras: nuevos mapas con un único camino, efectos de estados, variedad de guardianes, opciones de calidad gráfica, accesibilidad adicional y un balance afinado con partidas reales.
