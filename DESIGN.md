# The Last Bastion: MVP de campaña

El objetivo es defender el castillo. El mundo pasa de una aldea a una villa y finalmente a una ciudadela. Una misión termina con victoria o derrota, y cada victoria abre una decisión concreta: avanzar para conocer una nueva defensa o repetir para mejorar el resultado.

## Ciclo principal

Elegir una misión → preparar posiciones → defender sus oleadas → recibir estrellas y puntuación → desbloquear un destino → avanzar o repetir.

La primera versión tiene tres misiones. Cada una combina un mapa diferente, entre cinco y siete oleadas y un conjunto de defensas. La ruta sigue siendo única, los enemigos permanecen en ella y las torres se colocan libremente. El castillo tiene 1000 puntos de salud. Su destrucción termina la misión.

## Recompensas que sí están en el MVP

- **Oro de misión:** se gana al derrotar enemigos y superar oleadas; se gasta en torres y mejoras. Cada misión empieza con 300. No se acumula fuera de la partida.
- **Estrellas:** una por ganar, dos con al menos 60% de salud y tres con al menos 90%. Se conserva el mejor resultado de cada misión; el objetivo de perfección son nueve estrellas.
- **Nuevos destinos y armas:** basta ganar para avanzar. No se exigen tres estrellas. La villa añade cañones y la ciudadela añade magos.
- **Puntuación personal:** se conserva la mejor de cada misión como objetivo secundario, sin sumar otra moneda.

Las estrellas explican el rendimiento; los desbloqueos cambian las opciones de juego. Se puede progresar con una defensa imperfecta y volver después para mejorarla. No hay pérdidas del progreso por dejar de jugar, contadores diarios, pagos, cajas aleatorias ni obligaciones de repetir.

## Qué medir antes de ampliar

El MVP sirve para comprobar si el jugador entiende cómo construir, llega a una victoria, nota diferencias entre armas y quiere probar la siguiente misión o mejorar sus estrellas. No permite afirmar que la experiencia sea adictiva sin observar partidas.

Registrar durante pruebas de juego, sin recopilar datos personales: misión elegida, tiempo aproximado, resultado, salud restante, torres usadas y una nota sobre el momento divertido o frustrante. Objetivo inicial orientativo: misiones de 3–6 minutos de juego activo, con pausa opcional para planificar. Los tiempos y la dificultad se ajustarán después de partidas reales.

Revisar primero que una estrategia razonable permita ganar la aldea, que varias combinaciones puedan ganar cada misión y que alcanzar tres estrellas requiera mejores posiciones, sin depender de una única combinación obligatoria.

## Iteraciones siguientes

1. **Balance y acabado:** ajustar cantidades, salud, recompensas y posiciones a partir de partidas; mejorar información de la próxima oleada, animaciones y lectura visual. Mantener el MVP pequeño hasta que las tres misiones funcionen bien.
2. **Variedad útil:** añadir una región de dos o tres misiones con cambios de estrategia, enemigos especiales y selección de defensas antes de jugar. Reutilizar los sistemas existentes.
3. **Un nivel de comandante, si aporta valor:** introducir XP por completar misiones y objetivos claros. El nivel debería desbloquear opciones, personalización o variantes; no exigir repetir la misma misión para poder avanzar.
4. **Pocos logros comprensibles:** por ejemplo, defender sin vender torres, conseguir tres estrellas o derrotar al primer guardián. Añadirlos cuando el jugador ya entiende la campaña.

Una moneda permanente o un árbol grande de mejoras solo se añadirá si resuelve una necesidad observada. Añadir XP, monedas, estrellas, logros y muchas estadísticas al mismo tiempo dificultaría aprender qué decisiones importan.

## Guardado y publicación

La campaña conserva estrellas y puntuación en el navegador. Cambiar de dispositivo o borrar los datos del sitio elimina ese guardado local; el juego funciona también con guardado bloqueado, manteniendo el progreso durante la sesión.

El código se actualiza en GitHub. La versión pública cambia al ejecutar **Publicar The Last Bastion** desde Actions en la rama `main`, después de que las verificaciones hayan pasado.
