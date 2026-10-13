# The Last Bastion

Juego Tower Defense 3D de fantasía medieval, con construcción libre y una campaña de diez misiones. Three.js genera todo el escenario y los personajes mediante modelos procedurales con materiales, mampostería y animaciones de combate. No requiere recursos externos, cuentas ni claves API.

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

Defiende la **puerta de madera del castillo, con 1000–3000 puntos de salud según la misión**, usando tus **300 monedas iniciales**. Los enemigos salen de una cueva en el extremo inferior derecho y recorren un camino único hasta el castillo superior izquierdo. El tramo final sube suavemente hasta el umbral: la fortaleza descansa sobre el terreno elevado, con una planta aproximadamente tres veces más ancha y profunda que antes. No hay bifurcaciones ni agua.

Al llegar, los enemigos permanecen vivos y atacan la puerta. Dos pueden golpear a la vez; los demás esperan sobre el camino y avanzan cuando se libera una posición. Las torres siguen disparándoles. Hay terreno despejado para construir en ambos flancos de la entrada; puedes construir, mejorar o vender también durante el combate. El daño por golpe y el intervalo son **8 / 1,2 s** para esbirros, **6 / 0,85 s** para corredores, **30 / 1,9 s** para bestias y **55 / 2,2 s** para guardianes. El primer golpe tiene una preparación de 0,45 s. Llegar a la puerta no concede oro ni cuenta como baja; la oleada termina al eliminar a todos los atacantes.

Los golpes generan números de daño, retroceso, destellos y astillas de madera. Los números de enemigos muestran la salud realmente perdida después de resistencias, limitada a la salud restante y redondeada para leerla. Los de la puerta aparecen en rojo. La madera muestra grietas al bajar del 65% y 30% de salud, y cae al llegar a cero.

Abre **Construir defensas** con su flecha o **B**. Las ilustraciones muestran el arma de cerca. Al elegir, el menú se oculta para liberar terreno; la selección permanece activa y puedes colocar varias torres. La cámara no se mueve al desplegarlo. El botón de oleada, el tiempo de preparación y una única barra de progreso están en el panel superior de oleada. El selector inferior ocupa una franja compacta; las instrucciones de construcción aparecen al elegir una defensa. Selecciona una torre y mueve el cursor sobre el césped. La vista previa verde permite construir; la roja indica un obstáculo, el camino, falta de espacio o falta de oro. No hay casillas ni espacios de construcción predeterminados. El círculo muestra el alcance real.

| Defensa | Oro | Ventaja |
| --- | ---: | --- |
| Arqueros | 100 | Ataques rápidos contra enemigos pequeños |
| Ballesta | 200 | Gran alcance; ignora el 80% de la armadura física |
| Mago | 350 | Magia que evita la resistencia física |
| Cañón | 500 | Explosiones que dañan a todos los enemigos de su radio |

Cada torre construida tiene su propio nivel, de **1 a 3**. Haz clic en ella para comparar los atributos actuales con los de la próxima mejora y ver su coste antes de comprar. Las mejoras aumentan daño, alcance y frecuencia; las del cañón también aumentan su radio de explosión. Puedes vender por **el 70%** de todo lo invertido en esa torre.

| Defensa | Construcción | Nivel 1 → 2 | Nivel 2 → 3 | Total hasta nivel 3 |
| --- | ---: | ---: | ---: | ---: |
| Arqueros | 100 | 80 | 140 | 320 |
| Ballesta | 200 | 160 | 280 | 640 |
| Mago | 350 | 250 | 450 | 1050 |
| Cañón | 500 | 350 | 600 | 1450 |

Los precios de mejora son incrementales. Otra torre cubre una posición nueva; mejorar concentra potencia en una posición que ya funciona. Magos y cañones cuestan más que el oro inicial: establece cobertura barata y ahorra recompensas para incorporarlos. Las defensas bloqueadas indican su misión; las disponibles sin suficiente oro indican cuánto falta.

Hay cuatro enemigos: esbirros, corredores rápidos, bestias acorazadas y guardianes con resistencia física y mágica. Cada misión tiene una composición propia y un final definido. Durante la preparación ves los enemigos de la próxima oleada y una sugerencia de defensa; los guardianes se anuncian antes de empezar y llegan con escoltas. Tienes 20 segundos de preparación entre oleadas y puedes iniciar la siguiente antes de tiempo. Al completar una oleada recibes una bonificación de oro.

Las defensas tienen prioridades diferentes: arqueros contra la primera línea, ballestas contra amenazas acorazadas, cañones contra grupos y magos contra armadura vulnerable a magia. Combinar posiciones y mejoras conserva más salud que abandonar las torres iniciales. Los ajustes de economía, enemigos y resultados están documentados en [BALANCE.md](BALANCE.md). Para repetir las simulaciones sin abrir WebGL, ejecuta `npm run balance`.

Cuando la puerta pierde toda su salud aparece **El castillo ha caído**. Resiste la última oleada y elimina todos los enemigos para ganar: verás estrellas, puntuación y el siguiente destino desbloqueado. Cada misión comienza de nuevo con 300 de oro, la salud máxima de su puerta y ninguna torre; el progreso de campaña permanece.

### Campaña y recompensas

| Misión | Oleadas | Salud de puerta | Escenario y reto |
| --- | ---: | ---: | --- |
| Aldea de los pinos | 5 | 1000 | Bosque; aprende a construir y mejorar arqueros |
| Villa del mercado | 6 | 1200 | Pueblo; desbloquea ballestas contra armaduras |
| Ciudadela real | 7 | 1400 | Ciudad; desbloquea magos contra bestias |
| El último bastión | 8 | 1600 | Fortaleza; desbloquea cañones contra grupos |
| Bosque de los ecos | 8 | 1800 | Bosque; muchos corredores |
| Villa de las caravanas | 8 | 2000 | Pueblo; armaduras y escoltas |
| Fortaleza de la colina | 9 | 2200 | Fortaleza; cobertura de curvas |
| Aldea del viejo molino | 9 | 2400 | Pueblo; hordas numerosas |
| Paso de los guardianes | 10 | 2700 | Bosque; guardianes y sus escoltas |
| Castillo de la corona | 10 | 3000 | Fortaleza; combina las cuatro defensas |


Ganar una misión desbloquea la siguiente. Las estrellas premian la salud de la puerta: **una** por ganar, **dos** conservando al menos 60% de salud y **tres** conservando al menos 90%. Puedes repetir cualquier misión desbloqueada para mejorar el resultado. El menú de campaña conserva la mejor puntuación y cantidad de estrellas de cada misión; una repetición peor no reduce tus marcas ni suma estrellas duplicadas.

El progreso se guarda en `localStorage` bajo `last-bastion-campaign-v1`. Sin almacenamiento disponible se conserva en memoria durante la sesión. No se sincroniza entre dispositivos. Los guardados de la campaña anterior conservan estrellas y puntuaciones. Si completaste las cuatro misiones, continúas desde Bosque de los ecos; las otras nuevas se abren al ganar la anterior. El total de la campaña es de 30 estrellas. La salud, las grietas y las estrellas usan siempre el máximo propio de la misión.

El oro solo sirve para construir y mejorar durante cada misión. XP, niveles de comandante y monedas persistentes se reservan para futuras iteraciones. El alcance y criterio de esas iteraciones están en [DESIGN.md](DESIGN.md).

### Controles

- **B / flecha Construir defensas:** abrir u ocultar el menú, sin mover la cámara.
- **1–4:** arqueros, ballesta, mago, cañón; **clic izquierdo:** construir o seleccionar torre.
- **Escape / clic derecho:** cancelar la construcción o cerrar la selección.
- **Rueda:** zoom; **arrastrar:** desplazar la cámara cuando no estás construyendo.
- **Espacio:** pausar/reanudar; en pausa puedes construir, mejorar y vender.
- **1× / 2×:** velocidad de simulación; **M:** activar/silenciar efectos.
- **?:** guía de juego; **Restablecer vista:** encuadre inicial.
- **Tab / Mayús + Tab:** recorrer los menús; **Enter / Espacio:** activar el botón enfocado. **Esc** cierra la ayuda o devuelve a la misión actual desde la campaña.

Puedes abrir la guía desde la campaña antes de empezar. Los menús mantienen el foco dentro de sus controles y dejan la batalla inactiva mientras están abiertos. Iniciar una oleada desde la pausa táctica reanuda la defensa.

El juego se pausa al ocultar la pestaña. La guía también detiene la simulación. El sonido comienza silenciado y solo se activa tras una interacción.

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
    terrain.ts      Decoración, vegetación y superficies de construcción
    fortress.ts     Castillo grande, puerta animable y cueva
    damage-labels.ts  Números de daño y salud de puerta proyectados sobre el mundo
    landscape.ts    Valle continuo y paredes de cañón por contornos
    scenery.ts      Bosque, colinas, crestas rocosas y atalayas de fondo
    surfaces.ts     Relieve exterior, pigmento y sombras de contacto generados
    effects.ts      Partículas agrupadas, destellos y anillos de impacto
    view.ts         Renderizado, cámara, raycasting, vista previa y efectos
    framing.ts      Encuadre del recorrido y límites reales del castillo
  audio.ts          Sonidos sintéticos con Web Audio
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

El castillo y las torres tienen mampostería, banderas, almenas y armas reconocibles. Las torres reaccionan a los disparos y sus mejoras añaden bandas, estandartes, remates y armas más grandes. Los iconos se renderizan como primeros planos del arma y su parapeto para reconocerla mejor. El suelo, camino y piedra usan texturas procedurales distintas con relieve de material; huellas de carros, pequeñas piedras y helechos añaden detalle sin cambiar colisiones ni posiciones legales. Las flechas y virotes tienen puntas y plumas; los magos disparan orbes con estela; los cañones tienen destellos y ondas de explosión correspondientes al radio real de daño. Los enemigos tienen rostro, correas, botas, armadura y armas diferenciadas; piernas y brazos se animan al caminar, preparar golpes, atacar y recibir impactos. El cañón tiene ruedas con radios, carro de madera, abrazaderas y boca metálica. La entrada enemiga es una boca oscura rodeada de roca erosionada y bosque. Los efectos y números respetan la pausa, velocidad y cambios de misión; se limita la cantidad de etiquetas simultáneas y se reutilizan sus elementos.

Las pruebas geométricas usan raycasting sobre la superficie renderizada para comprobar que la altura renderizada de toda la ruta coincide con el movimiento de enemigos, incluida la rampa hasta la puerta, que la base completa de una torre legal descansa sobre terreno elevado y que el valle continúa por los cuatro lados sin convertir el paisaje de fondo en zona de construcción. Las pruebas de navegador comprueban además que ningún punto de las diez rutas quede detrás de un control a 900×700 y 1440×960, con verificaciones adicionales de las primeras cuatro a 1280×720 y 1920×1080, y que el zoom y el restablecimiento funcionen. También se revisan los menús, resultados y acciones de torre a 390×844, la navegación con teclado, el retorno desde la ayuda y el inicio desde la pausa. Las pruebas del menú plegable colocan una torre en terreno que el menú abierto cubría, tanto en escritorio como en teléfono, comprueban que la cámara permanece estable y que funcionan los atajos y el foco de teclado.

## Validación y alcance

Las pruebas comprueban continuidad y ausencia de cruces de la ruta, movimiento a diferentes FPS, construcción válida a ambos lados, obstáculos, economía, niveles, venta, resistencias, adquisición de objetivos, disparos de las cuatro defensas, daño en área, recompensas únicas, oleadas finitas, asedio repetido por cada tipo de enemigo, turnos ante la puerta, bajas durante el asedio, daño mostrado sin exceso, derrota, victoria, estrellas, persistencia, desbloqueos y estado de una nueva misión.

Las pruebas de distribución revisan preparación, combate, construcción y selección a 1536×844 y 1920×1080. Las diez misiones mantienen su ruta visible al abrir los detalles de una torre. Las pruebas verifican los límites del castillo con su geometría real, la posición fija y transparente a clics de los avisos, el reinicio del encuadre y la coincidencia entre cursor y torre construida.

Las pruebas de navegador comprueban WebGL real, colocación con cursor, selección, mejoras, venta, falta de oro, pausa, velocidad, guía, combate con recompensa, adaptación a una ventana de escritorio pequeña, derrota real, victoria, guardado de las estrellas, desbloqueo de todas las misiones y defensas, cambio de mapa y reinicio completo.

Los gráficos son una interpretación procedural de la referencia; los personajes y animaciones son deliberadamente sencillos. El equilibrio de las diez misiones necesita sesiones reales de juego. No hay multijugador ni sincronización de progreso entre dispositivos. La experiencia está diseñada para escritorio, aunque la interfaz se adapta a ventanas pequeñas. El rendimiento depende de la GPU y WebGL disponibles.

Posibles mejoras: nuevos mapas con un único camino, efectos de estados, variedad de guardianes, opciones de calidad gráfica, accesibilidad adicional y un balance afinado con partidas reales.
