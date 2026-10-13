# Balance de campaña · economía y niveles individuales

## Decisiones que debe permitir

El jugador elige entre cubrir otra curva, mejorar una torre bien situada o ahorrar para un especialista. Cada torre conserva su propio nivel e inversión. Los magos deben destacar contra armaduras y los cañones contra grupos; su precio mayor no debe convertirlos en la mejor opción para todos los enemigos.

Cada misión empieza con 300 de oro y la salud máxima propia de su puerta (1000–3000), sin torres. No exige tres estrellas para avanzar. Se conservan la devolución del 70% al vender y los umbrales de estrellas: victoria / 60% / 90% de salud. Los guardados existentes conservan récords; completar las cuatro misiones anteriores abre la quinta, y las otras nuevas se desbloquean en orden.

## Precios y atributos

Las mejoras son pagos adicionales sobre una torre existente, hasta nivel 3. La tabla muestra daño por disparo, alcance en metros e intervalo entre ataques. El panel compara estos atributos antes de comprar; el radio de explosión también aparece para los cañones.

| Defensa | Construcción | Mejora a N2 / N3 | Daño N1 / N2 / N3 | Alcance N1 / N2 / N3 | Intervalo N1 / N2 / N3 |
| --- | ---: | ---: | --- | --- | --- |
| Arqueros | 100 | 80 / 140 | 18 / 30 / 48 | 4,5 / 4,8 / 5,1 | 0,70 / 0,65 / 0,60 s |
| Ballesta | 200 | 160 / 280 | 65 / 110 / 180 | 6,0 / 6,4 / 6,8 | 2,20 / 2,10 / 2,00 s |
| Mago | 350 | 250 / 450 | 95 / 155 / 245 | 4,8 / 5,1 / 5,4 | 1,30 / 1,20 / 1,10 s |
| Cañón | 500 | 350 / 600 | 110 / 180 / 280 | 4,6 / 4,9 / 5,2 | 2,40 / 2,25 / 2,10 s |

El cañón tiene radio de explosión 2,1 / 2,5 / 2,9 metros. Su daño individual por moneda es inferior al de los arqueros: necesita alcanzar grupos para justificar la inversión. La ballesta ignora el 80% de armadura física. El mago usa resistencia mágica, por lo que es especialmente eficaz contra bestias pero pierde parte de su ventaja contra guardianes resistentes a magia.

Ejemplos: con 100 de oro puedes comprar cobertura con un arquero nuevo o invertir 80 en uno ya situado. Al comenzar la segunda misión puedes elegir tres arqueros o un arquero y una ballesta. Magos y cañones requieren ahorrar oro de bajas y oleadas; una defensa demasiado pequeña puede perder salud mientras ahorras. Vender permite corregir una posición, pero pierde el 30% invertido.

Las prioridades se mantienen: arqueros frenan la primera línea; ballestas buscan amenazas de gran salud y armadura; magos buscan armadura vulnerable a magia; cañones apuntan a grupos. Alcance, movimiento, resistencias, proyectiles y explosiones se simulan realmente.

## Progresión de diez misiones

| Misión | Oleadas | Salud de puerta | Defensa nueva / reto |
| --- | ---: | ---: | --- |
| Aldea de los pinos | 5 | 1000 | Arqueros; cobertura frente a mejoras |
| Villa del mercado | 6 | 1200 | Ballesta; alcance y perforación |
| Ciudadela real | 7 | 1400 | Mago; ahorro y armaduras |
| El último bastión | 8 | 1600 | Cañón; grupos y daño de área |
| Bosque de los ecos | 8 | 1800 | Corredores en grupos |
| Villa de las caravanas | 8 | 2000 | Escoltas y bestias acorazadas |
| Fortaleza de la colina | 9 | 2200 | Curvas para cobertura y alcance |
| Aldea del viejo molino | 9 | 2400 | Hordas numerosas para artillería |
| Paso de los guardianes | 10 | 2700 | Guardianes escoltados |
| Castillo de la corona | 10 | 3000 | Ejército mixto y las cuatro defensas |


Las primeras oleadas de las misiones con especialistas caros dan margen para establecer cobertura y ahorrar. La presión aumenta después. Se conservan recompensas por baja de 10/11/26/60 y bonificación de oleada `25 + 5 × oleada`. Los puntos por baja son independientes del oro: 120/140/300/700 más el bono de puntuación de oleada.

## Asedio de la puerta

Los enemigos ya no desaparecen al terminar la ruta. Se detienen delante de la madera, permanecen como blancos y atacan hasta morir o destruir la puerta. Dos posiciones limitan el daño simultáneo; la fila sigue el camino y un atacante muerto libera su posición. El primer golpe necesita 0,45 s de preparación. Después se aplica el intervalo de cada unidad:

| Enemigo | Daño a la puerta por golpe | Intervalo |
| --- | ---: | ---: |
| Esbirro | 8 | 1,20 s |
| Corredor | 6 | 0,85 s |
| Bestia | 30 | 1,90 s |
| Guardián | 55 | 2,20 s |

El asedio añade una última oportunidad de defensa, pero una fila sin cobertura puede bloquear el avance de la oleada y terminar en derrota. La ruta se prolonga desde la cueva y sube hasta el portón. La construcción se concentra en 14–16 bases hexagonales repartidas junto al camino; la entrada y ambos flancos de la puerta cuentan con posiciones útiles. El plan de referencia exige alcance real a **ambas posiciones de ataque**, no solo al centro del castillo. Las decisiones durante una oleada siguen disponibles para el jugador.

El daño, precios, resistencias, recompensas y desbloqueos de las torres se conservan. La puerta gana resistencia con cada fortaleza; aumentar su vida no reemplaza el diseño de oleadas. Las misiones de caravanas, molino, guardianes y corona dan dos oleadas iniciales sin bestias para obtener oro antes de incorporar especialistas. La dificultad cambia con cantidades, composición, densidad, salud enemiga y geometría; la salud enemiga inicial no necesita crecer en todas las misiones. El crecimiento dentro de cada misión sigue siendo del 10% por oleada. Las estrellas se calculan con la salud restante de la puerta. Llegar o golpear no da oro: solo una baja real concede recompensa. Un superviviente impide completar la oleada y la victoria.

## Evidencia reproducible

`npm run balance` ejecuta 103 escenarios de referencia usando la simulación de producción. Compra en posiciones legales, usa únicamente oro inicial y ganado, toma decisiones durante preparación y reserva cobertura para las dos posiciones de ataque ante la puerta y combate a pasos de 20 ms. Excluye estrategias que requieren defensas todavía bloqueadas. No inventa daño, salud ni recompensas. Para obtener todos los resultados:

```sh
npm run --silent balance -- --json
```

Resultados de referencia con inversión mixta en las bases de cada misión:

| Misión: ampliar y mejorar | Salud final / máxima | Estrellas | Combate a 1× | Con preparación |
| --- | ---: | ---: | ---: | ---: |
| Aldea de los pinos | 1000 / 1000 | 3 | 187 s | 4.8 min |
| Villa del mercado | 1200 / 1200 | 3 | 245 s | 6.1 min |
| Ciudadela real | 1384 / 1400 | 3 | 402 s | 9 min |
| El último bastión | 1494 / 1600 | 3 | 393 s | 9.2 min |
| Bosque de los ecos | 1746 / 1800 | 3 | 418 s | 9.6 min |
| Villa de las caravanas | 1802 / 2000 | 3 | 385 s | 9.1 min |
| Fortaleza de la colina | 1696 / 2200 | 2 | 465 s | 10.8 min |
| Aldea del viejo molino | 2296 / 2400 | 3 | 493 s | 11.2 min |
| Paso de los guardianes | 2310 / 2700 | 2 | 551 s | 12.5 min |
| Castillo de la corona | 2722 / 3000 | 3 | 549 s | 12.5 min |

Los 103 escenarios terminan: 65 victorias y 38 derrotas. La apertura de tres arqueros sin reinvertir conserva 808 / 1000 de salud en la aldea y logra dos estrellas, pero las aperturas estáticas no completan las regiones posteriores.

Las pruebas comparan expansión y mejoras en las bases disponibles. Ambos planes mixtos pueden ganar; al menos un plan equilibrado conserva salud para dos estrellas y una estrategia legal con las armas desbloqueadas puede lograr tres en cada misión. El límite de bases hace más importantes las mejoras: el plan de expansión también reinvierte en ellas cuando la mayoría de bases están ocupadas y no puede financiar la siguiente compra. Las bases cercanas a la entrada, curvas y puerta favorecen decisiones diferentes. Se eliminó la antigua referencia de torres fuera de cobertura porque todas las nuevas bases están diseñadas para cubrir el camino. Sin defensas se pierde.

La ruta extendida y el remate de supervivientes añaden tiempo de combate. Las comprobaciones limitan los dos planes mixtos de prueba a una media de 65 segundos por oleada y ninguna oleada de referencia puede prolongarse más de 90 segundos. La tabla incluye combate y duración con todos los periodos de preparación. Las misiones nuevas duran alrededor de 9–13 minutos a 1× con ese plan, y menos al iniciar antes o usar 2×. Iniciar antes, usar 2×, pausar o tomar más tiempo para decidir modifica la duración. Las pruebas verifican además compras, precios de cada mejora, independencia entre torres, venta, bloqueo de armas, guardados anteriores y geometría real de los diez mapas. El navegador comprueba la comparación de mejoras, los cuatro desbloqueos y los encuadres de toda la campaña.

## Próxima revisión con jugadores

Las simulaciones verifican viabilidad y regresiones; no representan todas las posiciones ni la dificultad humana. Probar si un jugador nuevo entiende la diferencia entre ampliar y mejorar, si el ahorro para magia/artillería crea una decisión útil y si las misiones de nueve y diez oleadas resultan demasiado largas. Anotar salud final, torres, tiempo y la oleada donde la decisión fue interesante o frustrante. Afinar esos puntos antes de añadir monedas persistentes o XP.
