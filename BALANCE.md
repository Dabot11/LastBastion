# MVP de ballestas: balance y verificación

La defensa utiliza únicamente Precisión, Triple y Veneno. La campaña introduce las especializaciones gradualmente: Precisión en la misión 1, Triple en la 4 y Veneno en la 6. Se rediseñan las rutas y las bases manteniendo los diez identificadores de misión y sus guardados. La incendiaria y los niveles 4–5 quedan para una iteración posterior.

## Economía y cadencia

Cada misión comienza con 300 de oro. Dos ballestas de Precisión compran cobertura inmediata; una especialista deja menos margen para el inicio. Construir cubre otra curva y mejorar concentra potencia. Vender devuelve exactamente el 70% de lo invertido. Las mejoras son precios adicionales y afectan solo a la torre seleccionada.

| Ballesta | Precio | Mejoras N2 / N3 | Daño por virote N1 / N2 / N3 | Alcance N1 / N2 / N3 | Cadencia constante |
| --- | ---: | ---: | --- | --- | --- |
| Precisión | 150 | 110 / 200 | 65 / 90 / 120 | 6 / 6,4 / 6,8 m | 2,4 s |
| Triple | 200 | 150 / 250 | 40 / 60 / 85 | 5,2 / 5,6 / 6 m | 2,8 s |
| Veneno | 250 | 170 / 280 | 12 / 18 / 24 | 6 / 6,3 / 6,6 m | 2,7 s |

La Triple lanza dos virotes en N1–N2 y tres en N3, siempre a enemigos distintos. Contra uno aislado lanza un solo virote. Su ventaja depende de encontrar grupos; su daño individual y alcance son menores que los de Precisión. Cada descarga produce un único evento de disparo y un único sonido.

Veneno aplica 20 / 30 / 42 DPS durante 4 / 4,5 / 5 s. Este daño ignora el 75% de la armadura. Los virotes iniciales siguen siendo físicos. Una sola dosis está activa por enemigo: reaplicar conserva el DPS mayor y renueva la duración, sin sumar dosis ni reiniciar el reloj del próximo tick. El daño se integra con el tiempo real y se muestra cada medio segundo, incluyendo el resto final de una dosis. Un muerto concede oro una sola vez.

## Objetivos y resistencias

Cada ballesta tiene un selector propio: Primero, Más resistente o Puerta. Cambiarlo no cuesta oro, no altera el de otra torre y no provoca un disparo extra. Precisión y Triple empiezan en Primero; Veneno en Más resistente. Una dosis suficientemente activa reduce el interés de Veneno por repetirla, sin abandonar una amenaza pesada para perseguir un esbirro débil. Puerta prioriza atacantes activos y después el recorrido.

Las bestias tienen 70% de armadura y los guardianes 55%. Un virote físico de 100 causa 30 / 45 de daño; una dosis de Veneno de 100 causa 82,5 / 86,25. Los corredores, sin armadura y rápidos, favorecen daño inmediato y cobertura frente a desgaste lento.

## Campaña y asedio

La campaña sigue el ciclo de enseñar, practicar y combinar. Las primeras dos misiones solo tienen esbirros; los corredores aparecen en la tercera, Triple en la cuarta, Veneno y bestias en la sexta, y el primer guardián con escoltas en la sexta oleada de la octava misión. La misión 1 tiene 18 esbirros en tres oleadas de 4, 6 y 8, sin exigir reinversión durante el combate.

| Misión | Oleadas | Bases | Longitud de ruta | Salud enemiga inicial |
| --- | ---: | ---: | ---: | ---: |
| 1 | 3 | 4 | 45,8 | ×0,90 |
| 2 | 4 | 5 | 50,5 | ×0,98 |
| 3 | 4 | 6 | 55,8 | ×1,02 |
| 4 | 5 | 7 | 62,5 | ×1,04 |
| 5 | 5 | 8 | 70,5 | ×1,08 |
| 6 | 6 | 9 | 76,8 | ×1,09 |
| 7 | 6 | 10 | 83,1 | ×1,10 |
| 8 | 7 | 11 | 89,5 | ×1,11 |
| 9 | 8 | 12 | 92,5 | ×1,12 |
| 10 | 8 | 14 | 93,7 | ×1,13 |

Las primeras tres misiones tienen preparación manual sin límite, también entre oleadas. Desde la cuarta conservan los 20 segundos de preparación automática y la pausa táctica. Una base opcional iluminada junto a la puerta enseña a conservar salud para obtener estrellas. Las otras bases siguen disponibles y la recomendación desaparece al cubrir ambos flancos con el alcance real de una defensa. La ayuda puede omitirse; al repetir una misión completada no vuelve a mostrarse.

Más longitud no equivale por sí sola a más dificultad: aumenta la exposición a las defensas. Las oleadas, su densidad, las armaduras y el presupuesto se calibran junto con la geometría. Se mantienen las recompensas por baja y los precios para que el jugador aprenda una economía consistente.

La salud enemiga crece un 7% por oleada. Se conservan recompensas por baja de 10 / 11 / 26 / 60 y bono de oleada `25 + 5 × oleada`. El oro solo llega por bajas y oleadas reales. Las estrellas conservan sus umbrales: ganar / 60% / 90% de salud restante de la puerta.

| Atacante | Daño a la puerta | Intervalo |
| --- | ---: | ---: |
| Esbirro | 8 | 1,20 s |
| Corredor | 6 | 0,85 s |
| Bestia | 20 | 1,90 s |
| Guardián | 40 | 2,20 s |

La puerta tiene 1000–3000 de salud según la misión. Dos enemigos atacan a la vez, los demás esperan y todos siguen siendo objetivos. La cadencia más lenta exige adaptar el daño de asedio además de las oleadas. Los 4–14 hexágonos añaden gradualmente decisiones entre entrada, curvas y puerta; siempre se conservan dos bases legales en los flancos del castillo.

## Evidencia reproducible

`npm test` verifica impactos, resistencia, compras, prioridades independientes, separación de objetivos, una descarga por recarga, Veneno sin acumulación, expiración y daño independiente de la frecuencia de actualización. Incluye economía y estrategias de campaña con posiciones legales y solo oro ganado.

`npm run balance` compara inversiones fijas, una sola munición, expansión, mejoras y combinaciones. Las compras usan la API del juego y las posiciones realmente permitidas. Las estrategias activas reaccionan cada dos segundos, también durante combate como permite la interfaz; las aperturas fijas no reinvierten. `runScenario(mission, strategy, offset, true)` limita las compras a la preparación para comprobar la experiencia sin decisiones durante combate. La simulación usa pasos de 20 ms y no modifica oro, salud, daño ni bajas para fabricar victorias. Las comparaciones son referencias, no sustituyen pruebas con jugadores.

Las pruebas de navegador comprueban compras y mejoras nativas, selector de objetivos, modelos distintos, virotes separados, números y estado de Veneno, sonido grabado, preferencias, campaña y encuadre. Una escena de combate controlada sirve para observar efectos; los resultados de balance provienen de oleadas completas sin esas escenas de prueba.

## Resultados de referencia

Se completaron 104 escenarios: 61 victorias y 43 derrotas. Las aperturas fijas permiten superar la introducción, pero pierden desde la misión 4. Cada mapa tiene una estrategia legal que obtiene tres estrellas. Las primeras tres también alcanzan tres estrellas comprando solo entre oleadas.

| Misión | Estrategia de referencia | Salud final | Estrellas | Combate |
| --- | --- | ---: | ---: | ---: |
| pines | opening-precision | 1000 / 1000 | 3 | 44 s |
| market | precision | 1200 / 1200 | 3 | 127 s |
| citadel | precision | 1400 / 1400 | 3 | 142 s |
| siege | precision | 1600 / 1600 | 3 | 218 s |
| woodland | precision | 1800 / 1800 | 3 | 250 s |
| crossroads | poison-front | 1992 / 2000 | 3 | 323 s |
| watch | poison-front | 2200 / 2200 | 3 | 356 s |
| river | poison-front | 2400 / 2400 | 3 | 438 s |
| highlands | poison-front | 2700 / 2700 | 3 | 540 s |
| crown | poison-front | 2984 / 3000 | 3 | 538 s |

Los tiempos de combate excluyen preparación y pausas humanas. El informe no añade una duración fija a la preparación manual de las primeras tres misiones. La referencia pasa de 44 segundos de combate en la introducción a varios minutos en el cierre del capítulo. Las pruebas exigen oleadas de hasta 120 segundos para estrategias de dos o tres estrellas; los intentos de una estrella admiten hasta 150 segundos de limpieza de enemigos. Las estrategias son referencias deterministas, no tasas de victoria ni garantías de dificultad percibida. El siguiente ajuste debe apoyarse en partidas reales, especialmente errores de colocación, comprensión del siguiente paso y tiempo entre decisiones.
