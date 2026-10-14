# The Last Bastion: MVP de campaña

El objetivo es defender el castillo. El mundo recorre diez aldeas, villas y fortalezas, hasta el castillo de la corona. Una misión termina con victoria o derrota, y cada victoria abre una decisión concreta: avanzar para conocer una nueva defensa o repetir para mejorar el resultado.

## Ciclo principal

Elegir una misión → preparar posiciones → defender sus oleadas → recibir estrellas y puntuación → desbloquear un destino → avanzar o repetir.

El MVP tiene diez misiones, planteadas como el primer capítulo de una campaña futura de hasta cincuenta. Las siguientes misiones se añadirán en una iteración posterior; este cambio conserva el alcance de diez. Cada una combina un mapa diferente, entre tres y ocho oleadas y un conjunto de defensas. Las primeras tres enseñan construcción, mejoras y corredores con Precisión; la cuarta introduce Triple, la sexta Veneno y bestias, y la octava guardianes. Las rutas crecen de 45,8 a 93,7 unidades y las bases de 4 a 14. La introducción permite preparar cada oleada sin límite de tiempo y recomienda proteger la puerta; la ayuda es opcional y todas las bases siguen disponibles. La incendiaria queda para una iteración posterior, con daño de zona para distinguirla del veneno. Una puerta más fuerte da margen ante ejércitos mayores; los umbrales de estrellas siguen siendo porcentajes, no cantidades fijas. El menú de construcción se oculta al seleccionar un arma, liberando terreno sin cambiar la cámara. La ruta sigue siendo única, los enemigos permanecen en ella y las ballestas ocupan bases hexagonales visibles junto al camino. La puerta de madera del castillo tiene entre 1000 y 3000 puntos de salud según la misión. Los enemigos que alcanzan la entrada se detienen y la golpean repetidamente; su destrucción termina la misión. Solo dos atacan simultáneamente, con una fila de espera en la aproximación. Mantener una defensa que cubra los dos flancos permite rematar supervivientes y ganar tiempo para reinvertir durante el combate. El camino sube al umbral de una fortaleza grande asentada sobre terreno elevado.

## Recompensas que sí están en el MVP

- **Oro de misión:** se gana al derrotar enemigos y superar oleadas; se gasta en torres y mejoras. Cada misión empieza con 300. No se acumula fuera de la partida.
- **Estrellas:** una por ganar, dos con al menos 60% de salud y tres con al menos 90%. Se conserva el mejor resultado de cada misión; el objetivo de perfección son treinta estrellas.
- **Nuevos destinos y armas:** basta ganar para avanzar. No se exigen tres estrellas. La aldea empieza con Precisión; El último bastión (misión 4) desbloquea Triple y Villa de las caravanas (misión 6), Veneno.
- **Puntuación personal:** se conserva la mejor de cada misión como objetivo secundario, sin sumar otra moneda.

Las estrellas explican el rendimiento; los desbloqueos cambian las opciones de juego. Se puede progresar con una defensa imperfecta y volver después para mejorarla. No hay pérdidas del progreso por dejar de jugar, contadores diarios, pagos, cajas aleatorias ni obligaciones de repetir.

## Qué medir antes de ampliar

El MVP sirve para comprobar si el jugador entiende cómo construir, llega a una victoria, nota diferencias entre armas y quiere probar la siguiente misión o mejorar sus estrellas. No permite afirmar que la experiencia sea adictiva sin observar partidas.

Registrar durante pruebas de juego, sin recopilar datos personales: misión elegida, tiempo aproximado, resultado, salud restante, torres usadas y una nota sobre el momento divertido o frustrante. Objetivo inicial orientativo: misiones de 4–8 minutos de juego activo, con pausa opcional para planificar. Los tiempos y la dificultad se ajustarán después de partidas reales.

Cada torre tiene tres niveles individuales, con precios y atributos propios. Los 300 de oro iniciales permiten dos ballestas de Precisión. Triple dispara a dos enemigos distintos y a tres en nivel 3. Veneno debilita armaduras con daño continuo, sin acumular dosis. Las mejoras no aceleran el disparo. Mejorar concentra daño en una posición, ampliar compra cobertura y ahorrar permite incorporar especialistas caros. El panel muestra el resultado de la próxima mejora antes de gastar.

Revisar primero que una estrategia razonable permita ganar la aldea, que varias combinaciones puedan ganar cada misión y que alcanzar tres estrellas requiera mejores posiciones, sin depender de una única combinación obligatoria. La primera revisión de números, criterios y resultados reproducibles está en [BALANCE.md](BALANCE.md); `npm run balance` permite repetirla. Las simulaciones se completan con pruebas de juego antes de seguir aumentando la dificultad.

## Iteraciones siguientes

1. **Balance y acabado:** ajustar cantidades, salud, recompensas y posiciones a partir de partidas; mejorar información de la próxima oleada, animaciones y lectura visual. Mantener el MVP pequeño hasta que las diez misiones funcionen bien.
2. **Variedad útil:** añadir una región de dos o tres misiones con cambios de estrategia, enemigos especiales y selección de defensas antes de jugar. Reutilizar los sistemas existentes.
3. **Un nivel de comandante, si aporta valor:** introducir XP por completar misiones y objetivos claros. El nivel debería desbloquear opciones, personalización o variantes; no exigir repetir la misma misión para poder avanzar.
4. **Pocos logros comprensibles:** por ejemplo, defender sin vender torres, conseguir tres estrellas o derrotar al primer guardián. Añadirlos cuando el jugador ya entiende la campaña.

Una moneda permanente o un árbol grande de mejoras solo se añadirá si resuelve una necesidad observada. Añadir XP, monedas, estrellas, logros y muchas estadísticas al mismo tiempo dificultaría aprender qué decisiones importan.

## Guardado y publicación

La campaña conserva estrellas y puntuación en el navegador. Cambiar de dispositivo o borrar los datos del sitio elimina ese guardado local; el juego funciona también con guardado bloqueado, manteniendo el progreso durante la sesión.

El código se actualiza en GitHub. La versión pública cambia al ejecutar **Publicar The Last Bastion** desde Actions en la rama `main`, después de que las verificaciones hayan pasado.

## Próxima iteración del arsenal

Validar las tres ballestas y la progresión de las diez misiones, comprobando que las primeras tres se completen con compras entre oleadas. Una incendiaria futura debería quemar una zona pequeña y castigar grupos; el veneno seguirá siendo desgaste contra armadura. Mantener tres niveles hasta validar estas decisiones con partidas reales. Evaluar cinco niveles y especializaciones después, sin aumentar la cadencia.
