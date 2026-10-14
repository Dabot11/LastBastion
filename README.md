# The Last Bastion

Juego Tower Defense 3D de fantasía medieval defendido exclusivamente por ballestas, con bases estratégicas de construcción y una campaña de diez misiones. Three.js genera todo el escenario y los personajes mediante modelos procedurales con materiales, mampostería y animaciones de combate. No requiere recursos externos, cuentas ni claves API.

Captura del MVP: [ballesta de Veneno, objetivos y daño continuo](docs/crossbows.png).

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

## Publicación automática en GitHub Pages

Cada cambio que se sube a `main` activa **Publicar The Last Bastion**: instala las dependencias, ejecuta las pruebas, compila el juego y publica el resultado en GitHub Pages. Si las pruebas o la compilación fallan, conserva la versión publicada. **Comprobar el juego** también valida los cambios y las propuestas de cambios antes de integrarlas. No necesitas ejecutar **Run workflow** para publicar actualizaciones.

La configuración inicial, que solo se hace una vez, está en **Settings → Pages → Build and deployment → Source → GitHub Actions**. El repositorio LastBastion ya utiliza esta configuración.

El juego se publica en **https://dabot11.github.io/LastBastion/**. Para revisar una actualización, abre **Actions → Publicar The Last Bastion** y comprueba que la ejecución del cambio termine con una marca verde. Cada ejecución incluye el enlace al sitio publicado.

También puedes volver a publicar la versión actual desde **Actions → Publicar The Last Bastion → Run workflow → main** si necesitas repetir una ejecución. Este control es opcional. Los archivos de `dist/` se generan automáticamente y no se suben al repositorio. Vite usa rutas de recursos relativas para que el juego cargue dentro de `/LastBastion/`.

Si no ves **Settings**, entra con una cuenta administradora del repositorio. Si GitHub indica que tu plan no admite Pages para un repositorio privado, necesitas un plan compatible o un repositorio público; revisa esa decisión antes de cambiar su visibilidad. Si no aparece la automatización en Actions, comprueba que los archivos `.github/workflows/` estén en la rama `main` y que Actions esté habilitado para el repositorio.

## Cómo jugar

Defiende la **puerta de madera del castillo, con 1000–3000 puntos de salud según la misión**, usando tus **300 monedas iniciales**. Los enemigos salen de una cueva en el extremo inferior derecho y recorren un camino único hasta el castillo superior izquierdo. El tramo final sube suavemente hasta el umbral: la fortaleza descansa sobre el terreno elevado, con una planta aproximadamente tres veces más ancha y profunda que antes. No hay bifurcaciones ni agua.

Al llegar, los enemigos permanecen vivos y atacan la puerta. Dos pueden golpear a la vez; los demás esperan sobre el camino y avanzan cuando se libera una posición. Las torres siguen disparándoles. Hay terreno despejado para construir en ambos flancos de la entrada; puedes construir, mejorar o vender también durante el combate. El daño por golpe y el intervalo son **8 / 1,2 s** para esbirros, **6 / 0,85 s** para corredores, **20 / 1,9 s** para bestias y **40 / 2,2 s** para guardianes. El primer golpe tiene una preparación de 0,45 s. Llegar a la puerta no concede oro ni cuenta como baja; la oleada termina al eliminar a todos los atacantes.

Los golpes generan números de daño, retroceso, destellos y astillas de madera. Los números de enemigos muestran la salud realmente perdida después de resistencias, limitada a la salud restante y redondeada para leerla. Los de la puerta aparecen en rojo. La madera muestra grietas al bajar del 65% y 30% de salud, y cae al llegar a cero.

Abre **Construir defensas** con su flecha o **B**, o pulsa una base hexagonal vacía para abrir el selector. Al elegir una defensa, el menú se oculta y puedes construir en las bases disponibles. La campaña aumenta de 4 a 14 bases de piedra por misión, repartidas junto a la entrada, las curvas y el castillo, con árboles y rocas entre ellas. La vista previa se ajusta al centro de la base: ✓ permite la compra; X explica ocupación, bloqueo o falta de oro. Vender libera la misma base. El círculo azul discontinuo muestra el alcance real. El HUD y el selector siguen compactos; la oleada y su preparación se controlan desde el panel superior.


La ayuda inicial recomienda una base junto a la puerta, sin bloquear otras ubicaciones, y señala el siguiente paso: construir, elegir Precisión e iniciar la oleada. En la misión 2 enseña a mejorar. Se puede omitir y no aparece al repetir una misión completada. Las primeras tres misiones esperan hasta que pulses **Iniciar oleada**, tanto al comenzar como entre oleadas; a partir de la cuarta, la preparación vuelve a durar 20 segundos. Los detalles de estadísticas y objetivos siguen disponibles bajo **Ver detalles y objetivos** durante la introducción.

| Ballesta | Oro | Función |
| --- | ---: | --- |
| Precisión | 150 | Un virote potente e inmediato; buen alcance para rematar y defender la puerta |
| Triple | 200 | Dos virotes a enemigos distintos; tres al alcanzar el nivel 3 |
| Veneno | 250 | Daño continuo que ignora el 75% de la armadura; coloca una al principio del recorrido |

Cada ballesta tiene su propio nivel, de **1 a 3**. Las mejoras aumentan potencia y alcance, conservando la cadencia: Precisión dispara cada **2,4 s**, Triple cada **2,8 s** y Veneno cada **2,7 s**. El panel compara los atributos antes de comprar y muestra el daño por **virote**, la cantidad de objetivos de Triple y el daño y duración del Veneno. Una Triple no dirige varios virotes al mismo enemigo aislado. Puedes vender por **el 70%** de todo lo invertido.

| Ballesta | Construcción | Nivel 1 → 2 | Nivel 2 → 3 | Total hasta nivel 3 |
| --- | ---: | ---: | ---: | ---: |
| Precisión | 150 | 110 | 200 | 460 |
| Triple | 200 | 150 | 250 | 600 |
| Veneno | 250 | 170 | 280 | 700 |

Los 300 de oro iniciales permiten dos ballestas de Precisión. Elegir una especialista deja menos cobertura inmediata. Cada mejora es un pago adicional: ampliar cubre otra curva; mejorar refuerza una posición existente. Las defensas bloqueadas indican su misión y las disponibles sin suficiente oro indican cuánto falta.

El Veneno dura **4 / 4,5 / 5 s** y hace **20 / 30 / 42 de daño por segundo** antes de resistencia. Los números verdes se agrupan cada medio segundo y muestran salud realmente perdida. Una gota verde junto a la barra identifica el estado. Reaplicar conserva la dosis activa más potente y renueva su duración; no suma dosis ni retrasa el próximo tick. Expira también después de salir del alcance de la ballesta. En objetivo «Más resistente», una dosis activa reduce la prioridad de ese enemigo para repartir el veneno entre otras amenazas resistentes.

Hay cuatro enemigos: esbirros, corredores rápidos, bestias acorazadas y guardianes con armadura resistente. Cada misión tiene una composición propia y un final definido. Durante la preparación ves los enemigos de la próxima oleada y una sugerencia de defensa; los guardianes se anuncian antes de empezar y llegan con escoltas. En las primeras tres misiones inicias cada oleada cuando quieras; desde la cuarta tienes 20 segundos de preparación y puedes comenzar antes de tiempo. Al completar una oleada recibes una bonificación de oro.

Las bases permanecen visibles durante la partida y su borde se ilumina al elegir una defensa. La compra usa la misma lógica que el preview y siempre coloca la torre en el centro. Los tres niveles evolucionan de piedra sencilla a refuerzos de acero y después marfil y oro, con una base más robusta, armas más grandes y un escudo numerado. La mejora produce un destello, partículas y un pulso de construcción, también en pausa táctica. El panel muestra una imagen del nivel actual.

Cada defensa permite elegir **Primero**, **Más resistente** o **Puerta** desde su panel. Precisión y Triple empiezan apuntando al más avanzado; Veneno prioriza salud y armadura. «Puerta» atiende primero a quienes la están golpeando. Los ajustes y simulaciones de economía, enemigos y resultados están en [BALANCE.md](BALANCE.md); ejecuta `npm run balance` para repetirlos.

Cuando la puerta pierde toda su salud aparece **El castillo ha caído**. Resiste la última oleada y elimina todos los enemigos para ganar: verás estrellas, puntuación y el siguiente destino desbloqueado. Cada misión comienza de nuevo con 300 de oro, la salud máxima de su puerta y ninguna torre; el progreso de campaña permanece.

### Campaña y recompensas

| Misión | Oleadas | Salud de puerta | Escenario y reto |
| --- | ---: | ---: | --- |
| Aldea de los pinos | 3 | 1000 | 4 bases; Ruta casi recta; construir Precisión junto a la puerta |
| Villa del mercado | 4 | 1200 | 5 bases; Una curva amplia; mejorar con el oro ganado |
| Ciudadela real | 4 | 1400 | 6 bases; Curvas suaves; primeros corredores |
| El último bastión | 5 | 1600 | 7 bases; Desbloquea Triple contra grupos |
| Bosque de los ecos | 5 | 1800 | 8 bases; Practicar cobertura contra grupos rápidos |
| Villa de las caravanas | 6 | 2000 | 9 bases; Desbloquea Veneno; primeras bestias |
| Fortaleza de la colina | 6 | 2200 | 10 bases; Cobertura de curvas y mejoras |
| Aldea del viejo molino | 7 | 2400 | 11 bases; Primer guardián con escoltas |
| Paso de los guardianes | 8 | 2700 | 12 bases; Combinar grupos, armaduras y guardianes |
| Castillo de la corona | 8 | 3000 | 14 bases; Desafío del primer capítulo |


Ganar una misión desbloquea la siguiente. Las estrellas premian la salud de la puerta: **una** por ganar, **dos** conservando al menos 60% de salud y **tres** conservando al menos 90%. Puedes repetir cualquier misión desbloqueada para mejorar el resultado. El menú de campaña conserva la mejor puntuación y cantidad de estrellas de cada misión; una repetición peor no reduce tus marcas ni suma estrellas duplicadas.

El progreso se guarda en `localStorage` bajo `last-bastion-campaign-v1`. Sin almacenamiento disponible se conserva en memoria durante la sesión. No se sincroniza entre dispositivos. Los guardados de la campaña anterior conservan estrellas y puntuaciones. Si completaste las cuatro misiones, continúas desde Bosque de los ecos; las otras nuevas se abren al ganar la anterior. El total de la campaña es de 30 estrellas. La salud, las grietas y las estrellas usan siempre el máximo propio de la misión.

El oro solo sirve para construir y mejorar durante cada misión. XP, niveles de comandante y monedas persistentes se reservan para futuras iteraciones. El alcance y criterio de esas iteraciones están en [DESIGN.md](DESIGN.md).

### Controles

- **B / flecha Construir defensas:** abrir u ocultar el menú, sin mover la cámara.
- **1–3:** Precisión, Triple y Veneno; **clic izquierdo:** construir o seleccionar torre.
- **Escape / clic derecho:** cancelar la construcción o cerrar la selección.
- **Rueda:** zoom; **arrastrar:** desplazar la cámara cuando no estás construyendo.
- **Espacio:** pausar/reanudar; en pausa puedes construir, mejorar y vender.
- **1× / 2×:** velocidad de simulación; **M:** activar/silenciar efectos.
- **?:** guía de juego; **Restablecer vista:** encuadre inicial.
- **Tab / Mayús + Tab:** recorrer los menús; **Enter / Espacio:** activar el botón enfocado. **Esc** cierra la ayuda o devuelve a la misión actual desde la campaña.

Puedes abrir la guía desde la campaña antes de empezar. Los menús mantienen el foco dentro de sus controles y dejan la batalla inactiva mientras están abiertos. Iniciar una oleada desde la pausa táctica reanuda la defensa.

El juego se pausa y el audio se silencia al ocultar la pestaña. La guía detiene la simulación. Activa el sonido con el altavoz o **M**: las tres ballestas usan una suelta mecánica grabada, corta y con variaciones pequeñas de tono y volumen. Triple produce **un solo sonido por descarga**, no uno por virote. Los ticks de Veneno no repiten voces de dolor. Los efectos limitan sonidos simultáneos y evitan disparos demasiado próximos. Hay impactos, pasos, voces distintas de los cuatro enemigos y señales de construcción, mejora y resultados. La música ambiental original sigue disponible. En **Ayuda → Sonido del valle** puedes apagar solo la música y ajustar el volumen; esas preferencias se guardan. La muestra se incluye en el juego, sin servicios externos. Las fuentes y licencias aparecen en [CREDITS.md](CREDITS.md), también accesible desde la ayuda.

## Estructura

```text
src/
  game/
    config.ts       Balance centralizado: costos, enemigos, daño y niveles
    path.ts         Ruta ordenada, distancias, obstáculos y construcción
    simulation.ts   Enemigos, oleadas, torres, proyectiles, victoria y economía
    missions.ts     Las diez misiones, mapas, armas y composición de oleadas
    progress.ts     Estrellas, desbloqueos y guardado de campaña
  scene/
    models.ts       Geometría y materiales reutilizables
    terrain.ts      Decoración, vegetación y superficies del terreno
    construction.ts  Bases hexagonales, selección y preview
    fortress.ts     Castillo grande, puerta animable y cueva
    damage-labels.ts  Números de daño y salud de puerta proyectados sobre el mundo
    landscape.ts    Valle continuo y paredes de cañón por contornos
    scenery.ts      Bosque, colinas, crestas rocosas y atalayas de fondo
    surfaces.ts     Relieve exterior, pigmento y sombras de contacto generados
    effects.ts      Partículas agrupadas, destellos y anillos de impacto
    view.ts         Renderizado, cámara, raycasting, vista previa y efectos
    framing.ts      Encuadre del recorrido y límites reales del castillo
  audio.ts          Mezcla Web Audio, música, volumen y voces
  audio/sound-design.ts  Diseño sonoro y composición ambiental originales
  illustrations.ts  Vistas de los mapas reales e ilustración del castillo
  ui.ts             Campaña, HUD, mejoras, ayuda y resultados de batalla
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

## Interfaz y aspecto visual

Campaña, ayuda, mejoras, victoria y derrota comparten paneles azules, acentos dorados, botones y tipografía. Los recursos y controles se alinean en una franja superior compacta; la oleada reúne allí inicio, temporizador y progreso, y las mejoras se muestran en un panel lateral. Los avisos de construcción y acciones inválidas comparten una zona superior central debajo del HUD, de tamaño fijo y sin interceptar clics. En móvil los detalles de torre quedan debajo de esa zona para mantener visibles sus acciones. La campaña muestra una vista de cada ruta y sus obstáculos reales, la defensa que incorpora y el estado de desbloqueo. El acceso principal permite empezar o continuar la misión actual. Al completar la campaña reconoce la victoria y propone repetir la misión con menos estrellas; la ayuda presenta cuatro pasos visuales. Las victorias destacan estrellas y nuevas defensas, y las derrotas ofrecen un consejo según las torres construidas.

La información de oro, salud y oleadas tiene mayor contraste. Las defensas bloqueadas muestran un candado y su misión; las disponibles sin oro conservan sus precios e indican cuánto falta. El panel de cada torre compara atributos y mantiene sus acciones de mejorar y vender accesibles al desplazarse por las estadísticas en pantallas pequeñas. Los avisos temporales evitan superponerse a la pausa o los detalles de torre.

El campo de batalla forma parte de un valle que continúa más allá de la zona de construcción. No tiene una base rectangular ni paredes exteriores de tablero: el fondo incluye laderas con bosque, crestas rocosas, atalayas y niebla azul que suaviza la distancia. El suelo del área jugable sigue siendo llano y conserva las rutas y reglas de construcción de cada misión. Los pinos tienen ramas y copas irregulares; arbustos, flores, vallas y edificios añaden detalle a cada región.

El escenario ocupa toda la pantalla. Los recursos, controles y tarjetas de defensas aparecen en paneles flotantes. La cámara mide el HUD compacto y el selector inferior, y centra el recorrido jugable dentro del espacio disponible. Conserva completo el castillo usando sus vértices reales antes de agruparlos para el renderizado, y reserva espacio para la entrada de la cueva y los flancos de construcción. El encuadre conserva el mismo ángulo y no modifica el terreno, el recorrido ni las colisiones. Restablecer vista recupera ese encuadre, también después de desplazar o acercar la cámara. Se puede acercar o alejar con los botones **+ / −** o la rueda, arrastrar para explorar y **Restablecer vista** para recuperar el encuadre inicial.

El castillo y las torres tienen mampostería, banderas, almenas y armas reconocibles. Las torres reaccionan a los disparos y sus mejoras añaden bandas, estandartes, remates y armas más grandes. Los iconos se renderizan como primeros planos del arma y su parapeto para reconocerla mejor. El suelo, camino y piedra usan texturas procedurales distintas con relieve de material; huellas de carros, pequeñas piedras y helechos añaden detalle sin cambiar colisiones ni posiciones legales. Las flechas y virotes tienen puntas y plumas; las variantes tienen mecanismos, colores y virotes distintos, con recarga visible y efectos verdes de Veneno. Los enemigos tienen rostro, correas, botas, armadura y armas diferenciadas; piernas y brazos se animan al caminar, preparar golpes, atacar y recibir impactos. La entrada enemiga es una boca oscura rodeada de roca erosionada y bosque. Los efectos y números respetan la pausa, velocidad y cambios de misión; se limita la cantidad de etiquetas simultáneas y se reutilizan sus elementos.

Las pruebas geométricas usan raycasting sobre la superficie renderizada para comprobar que la altura renderizada de toda la ruta coincide con el movimiento de enemigos, incluida la rampa hasta la puerta, que la base completa de una torre legal descansa sobre terreno elevado y que el valle continúa por los cuatro lados sin convertir el paisaje de fondo en zona de construcción. Las pruebas de navegador comprueban además que ningún punto de las diez rutas quede detrás de un control a 900×700 y 1440×960, con verificaciones adicionales de las primeras cuatro a 1280×720 y 1920×1080, y que el zoom y el restablecimiento funcionen. También se revisan los menús, resultados y acciones de torre a 390×844, la navegación con teclado, el retorno desde la ayuda y el inicio desde la pausa. Las pruebas del menú plegable colocan una torre en terreno que el menú abierto cubría, tanto en escritorio como en teléfono, comprueban que la cámara permanece estable y que funcionan los atajos y el foco de teclado.

## Validación y alcance

Las pruebas comprueban continuidad y ausencia de cruces de la ruta, movimiento a diferentes FPS, construcción válida a ambos lados, obstáculos, economía, niveles, venta, resistencias, adquisición de objetivos, descargas de las tres ballestas, objetivos distintos y Veneno sin acumulación, recompensas únicas, oleadas finitas, asedio repetido por cada tipo de enemigo, turnos ante la puerta, bajas durante el asedio, daño mostrado sin exceso, derrota, victoria, estrellas, persistencia, desbloqueos y estado de una nueva misión.

Las pruebas de distribución revisan preparación, combate, construcción y selección a 1536×844 y 1920×1080. Las diez misiones mantienen su ruta visible al abrir los detalles de una torre. Las pruebas verifican los límites del castillo con su geometría real, la posición fija y transparente a clics de los avisos, el reinicio del encuadre y la coincidencia entre cursor y torre construida.

Las pruebas comprueban las bases de las diez misiones, su separación, cobertura de diferentes tramos y apoyo completo sobre el terreno. Verifican compras dentro del hexágono, rechazo de terreno sin base, ocupación única, venta y reutilización. En navegador se revisan los tres niveles, su escudo e imagen, el fin de la animación durante la pausa, las compras exactas, el audio real y la persistencia de música y volumen, en laptop, pantalla completa y teléfono. Las pruebas de audio comprueban señales distintas, margen de amplitud y continuidad del bucle estéreo.

Las pruebas de navegador comprueban WebGL real, colocación con cursor, selección, mejoras, venta, falta de oro, pausa, velocidad, guía, combate con recompensa, adaptación a una ventana de escritorio pequeña, derrota real, victoria, guardado de las estrellas, desbloqueo de todas las misiones y defensas, cambio de mapa y reinicio completo.

Los gráficos son una interpretación procedural de la referencia; los personajes y animaciones son deliberadamente sencillos. El equilibrio de las diez misiones necesita sesiones reales de juego. No hay multijugador ni sincronización de progreso entre dispositivos. La experiencia está diseñada para escritorio, aunque la interfaz se adapta a ventanas pequeñas. El rendimiento depende de la GPU y WebGL disponibles.

Posibles mejoras: nuevos mapas con un único camino, efectos de estados, variedad de guardianes, opciones de calidad gráfica, accesibilidad adicional y un balance afinado con partidas reales.
