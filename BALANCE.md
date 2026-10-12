# Balance de campaña · economía y niveles individuales

## Decisiones que debe permitir

El jugador elige entre cubrir otra curva, mejorar una torre bien situada o ahorrar para un especialista. Cada torre conserva su propio nivel e inversión. Los magos deben destacar contra armaduras y los cañones contra grupos; su precio mayor no debe convertirlos en la mejor opción para todos los enemigos.

Cada misión empieza con 300 de oro y 1000 de salud en la puerta, sin torres. No exige tres estrellas para avanzar. Se conservan la devolución del 70% al vender y los umbrales de estrellas: victoria / 60% / 90% de salud. Los guardados existentes conservan récords y desbloquean el cuarto mapa al haber completado la ciudadela.

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

## Progresión de cuatro misiones

| Misión | Oleadas | Nueva defensa | Aprendizaje |
| --- | ---: | --- | --- |
| Aldea de los pinos | 5 | Arqueros | Cobertura frente a concentración de daño; sin armaduras |
| Villa del mercado | 6 | Ballesta | Alcance y perforación; primeras bestias y un guardián final |
| Ciudadela real | 7 | Mago | Ahorrar para magia sin abandonar la cobertura contra corredores |
| El último bastión | 8 | Cañón | Grupos densos y armaduras que requieren combinar funciones |

Las primeras oleadas de las misiones con especialistas caros dan margen para establecer cobertura y ahorrar. La presión aumenta después. Se conservan recompensas por baja de 10/11/26/60 y bonificación de oleada `25 + 5 × oleada`. Los puntos por baja son independientes del oro: 120/140/300/700 más el bono de puntuación de oleada.

## Asedio de la puerta

Los enemigos ya no desaparecen al terminar la ruta. Se detienen delante de la madera, permanecen como blancos y atacan hasta morir o destruir la puerta. Dos posiciones limitan el daño simultáneo; la fila sigue el camino y un atacante muerto libera su posición. El primer golpe necesita 0,45 s de preparación. Después se aplica el intervalo de cada unidad:

| Enemigo | Daño a la puerta por golpe | Intervalo |
| --- | ---: | ---: |
| Esbirro | 8 | 1,20 s |
| Corredor | 6 | 0,85 s |
| Bestia | 30 | 1,90 s |
| Guardián | 55 | 2,20 s |

El asedio añade una última oportunidad de defensa, pero una fila sin cobertura puede bloquear el avance de la oleada y terminar en derrota. La ruta se prolonga desde la cueva y sube hasta el portón. El terreno lateral de la entrada queda libre para construir; la superficie de construcción crece ligeramente en anchura para permitir ambos flancos. El plan de referencia exige alcance real a **ambas posiciones de ataque**, no solo al centro del castillo. Las decisiones durante una oleada siguen disponibles para el jugador.

La vida, daño, precios, resistencias, recompensas y desbloqueos de las torres se conservan. Las estrellas se calculan con la salud restante de la puerta. Llegar o golpear no da oro: solo una baja real concede recompensa. Un superviviente impide completar la oleada y la victoria.

## Evidencia reproducible

`npm run balance` ejecuta 41 escenarios de referencia usando la simulación de producción. Compra en posiciones legales, usa únicamente oro inicial y ganado, toma decisiones durante preparación y reserva cobertura para las dos posiciones de ataque ante la puerta y combate a pasos de 20 ms. Excluye estrategias que requieren defensas todavía bloqueadas. No inventa daño, salud ni recompensas. Para obtener todos los resultados:

```sh
npm run --silent balance -- --json
```

Resultados de referencia en la cuadrícula sin desplazamiento:

| Caso | Salud final / estrellas | Combate a 1× |
| --- | --- | ---: |
| Aldea: tres arqueros iniciales, sin reinvertir | 816 / 2 | 290 s |
| Aldea: ampliar y mejorar | 1000 / 3 | 192 s |
| Villa: ampliar y mejorar | 1000 / 3 | 230 s |
| Ciudadela: ampliar y mejorar | 1000 / 3 | 370 s |
| Último bastión: ampliar y mejorar | 928 / 3 | 415 s |

Las pruebas repiten dos políticas por misión en cuadrículas desplazadas 0 / 0,25 / 0,5 metros: todas ganan con al menos dos estrellas y tres estrellas son alcanzables en cada misión. Una política compra nuevas torres y otra permite mejoras, salvo la ciudadela, donde se compara la combinación estándar con una apertura que establece dos arqueros antes de ahorrar para magia. Sin torres o con cobertura ineficaz se pierde; abandonar la apertura no completa las regiones posteriores. Una política que concentra mejoras demasiado pronto puede obtener solo una estrella en el último bastión.

La ruta extendida y el remate de supervivientes añaden tiempo de combate. Las comprobaciones limitan las estrategias vencedoras a una media de 65 segundos por oleada y ninguna oleada de referencia puede prolongarse más de 90 segundos. El plan mixto dura 4,9 / 5,8 / 8,5 / 9,6 minutos al esperar todos los periodos de preparación. Iniciar antes, usar 2×, pausar o tomar más tiempo para decidir modifica la duración. Las pruebas verifican además compras, precios de cada mejora, independencia entre torres, venta, bloqueo de armas, guardados anteriores y geometría real del cuarto mapa. El navegador comprueba la comparación de mejoras, los cuatro desbloqueos y los encuadres de toda la campaña.

## Próxima revisión con jugadores

Las simulaciones verifican viabilidad y regresiones; no representan todas las posiciones ni la dificultad humana. Probar si un jugador nuevo entiende la diferencia entre ampliar y mejorar, si el ahorro para magia/artillería crea una decisión útil y si la cuarta misión resulta demasiado larga. Anotar salud final, torres, tiempo y la oleada donde la decisión fue interesante o frustrante. Afinar esos puntos antes de añadir monedas persistentes o XP.
