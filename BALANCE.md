# MVP de ballestas: balance y verificación

La defensa utiliza únicamente Precisión, Triple y Veneno. Las primeras tres misiones introducen cada especialización. Los diez mapas y sus guardados se conservan; las otras siete misiones adaptan sus oleadas al nuevo arsenal. La incendiaria y los niveles 4–5 quedan para una iteración posterior.

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

Precisión se desbloquea en la aldea; Triple en la villa y Veneno en la ciudadela. Las primeras dos misiones enseñan cobertura y grupos. La tercera añade armaduras y el guardián con escoltas. Las demás conservan sus rutas, bases, cantidades de oleadas y salud de puerta, ajustando la presencia de unidades pesadas y su salud al tiempo real de exposición en cada mapa. Los especialistas sustituyen funciones de armas anteriores; no se conserva la presión pensada para magia y explosiones.

La salud enemiga crece un 7% por oleada. Se conservan recompensas por baja de 10 / 11 / 26 / 60 y bono de oleada `25 + 5 × oleada`. El oro solo llega por bajas y oleadas reales. Las estrellas conservan sus umbrales: ganar / 60% / 90% de salud restante de la puerta.

| Atacante | Daño a la puerta | Intervalo |
| --- | ---: | ---: |
| Esbirro | 8 | 1,20 s |
| Corredor | 6 | 0,85 s |
| Bestia | 20 | 1,90 s |
| Guardián | 40 | 2,20 s |

La puerta tiene 1000–3000 de salud según la misión. Dos enemigos atacan a la vez, los demás esperan y todos siguen siendo objetivos. La cadencia más lenta exige adaptar el daño de asedio además de las oleadas. Los 14–16 hexágonos mantienen decisiones entre entrada, curvas y puerta; el mapa y su geometría no cambian.

## Evidencia reproducible

`npm test` verifica impactos, resistencia, compras, prioridades independientes, separación de objetivos, una descarga por recarga, Veneno sin acumulación, expiración y daño independiente de la frecuencia de actualización. Incluye economía y estrategias de campaña con posiciones legales y solo oro ganado.

`npm run balance` compara inversiones fijas, una sola munición, expansión, mejoras y combinaciones. Las compras usan la API del juego y las posiciones realmente permitidas. Las estrategias activas reaccionan cada dos segundos, también durante combate como permite la interfaz; las aperturas fijas no reinvierten. La simulación usa pasos de 20 ms y no modifica oro, salud, daño ni bajas para fabricar victorias. Las comparaciones son referencias, no sustituyen pruebas con jugadores.

Las pruebas de navegador comprueban compras y mejoras nativas, selector de objetivos, modelos distintos, virotes separados, números y estado de Veneno, sonido grabado, preferencias, campaña y encuadre. Una escena de combate controlada sirve para observar efectos; los resultados de balance provienen de oleadas completas sin esas escenas de prueba.

## Resultados de referencia

Se completaron 114 escenarios: 53 victorias y 61 derrotas. Las aperturas sin reinversión pierden; cada mapa tiene una combinación legal con tres estrellas.

| Misión | Combinación | Salud final | Estrellas | Combate |
| --- | --- | ---: | ---: | ---: |
| pines | mixed | 1000 / 1000 | 3 | 188 s |
| market | mixed | 1200 / 1200 | 3 | 282 s |
| citadel | mixed-expand | 1320 / 1400 | 3 | 435 s |
| siege | poison-front | 1480 / 1600 | 3 | 449 s |
| woodland | mixed-expand | 1800 / 1800 | 3 | 437 s |
| crossroads | poison-front | 1840 / 2000 | 3 | 408 s |
| watch | poison-front | 2120 / 2200 | 3 | 516 s |
| river | poison-front | 2400 / 2400 | 3 | 563 s |
| highlands | poison-front | 2480 / 2700 | 3 | 530 s |
| crown | mixed-expand | 2968 / 3000 | 3 | 549 s |

Los tiempos de combate excluyen preparación y pausas humanas. Las pruebas permiten construir y mejorar durante una oleada, como el juego. Una sola munición puede ganar algunos mapas, pero la combinación preserva mejor la puerta ante armaduras; estas referencias no son una garantía de dificultad percibida.
