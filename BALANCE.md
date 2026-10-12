# Balance de campaña · primera iteración

## Objetivos

La aldea enseña a colocar defensas y permite avanzar con errores. Conservar tres estrellas requiere reinvertir el oro. La villa añade presión de grupos y armaduras; la ciudadela pide combinar cobertura, mejoras y prioridades de ataque. Debe haber varias formas de ganar, sin una receta obligatoria ni una posición exacta.

Se mantienen 300 de oro inicial, 1000 de salud del castillo, cinco/seis/siete oleadas, mejoras hasta nivel 3, devolución del 70% al vender y los mismos umbrales de estrellas. Los guardados anteriores se conservan.

## Cambios

- Las oleadas tienen un intervalo explícito entre enemigos: la presión aumenta dentro de cada misión. La aldea presenta corredores en la segunda oleada y armaduras en la tercera. La villa reserva sus primeros grupos para probar el cañón. La ciudadela comienza sin una bestia antes de que el jugador pueda invertir.
- Esbirros, corredores, bestias y guardianes avanzan más rápido. La salud aumenta un 10% entre oleadas, con ajustes moderados por región. Los guardianes aparecen con escoltas después de ellos para evitar un final separado del resto de la batalla.
- Los arqueros frenan al enemigo más avanzado. Las ballestas priorizan amenazas según armadura y salud máxima. Los magos priorizan armadura vulnerable a magia. Los cañones buscan grupos donde la explosión pueda hacer más daño; en empate se elige al enemigo más avanzado. Las reglas de alcance, proyectiles, resistencias y explosión siguen siendo reales.
- El cañón pasa de 48 a 58 de daño y dispara cada 1,8 segundos; el mago pasa de 34 a 45 cada 1,05 segundos. Arqueros y ballestas disparan cada 0,7 y 2,2 segundos. Sus precios y mejoras permanecen iguales.
- El oro por enemigo pasa a 10/11/26/60 y la bonificación por oleada a `25 + 5 × oleada`. Los puntos por baja siguen siendo 120/140/300/700, más el bono de oleada correspondiente: se separa el ajuste económico de los récords de puntuación.
- Durante la preparación se muestran la composición de la próxima oleada, un consejo de defensa y el aviso de guardián antes de gastar oro.

## Evidencia reproducible

`npm run balance` juega 33 escenarios de referencia usando la simulación de producción. Solo construye en ubicaciones legales y usa oro inicial y ganado. Las decisiones se hacen entre oleadas, no se inventan daño ni recompensas, y el combate avanza en pasos de 20 ms. Las estrategias comparan abrir y no invertir más, comprar un solo tipo, expandirse, mejorar antes o combinar defensas. Para obtener JSON sin el encabezado de npm:

```bash
npm run --silent balance -- --json
```

Comparación con `e1e9ae7`, usando el mismo planificador, mapa y posiciones de referencia:

| Caso | Antes: salud / estrellas | Después: salud / estrellas |
| --- | --- | --- |
| Aldea: dos ballestas iniciales, sin reinvertir | 1000 / 3 | 565 / 1 |
| Aldea: combinar y mejorar | 1000 / 3 | 1000 / 3 |
| Villa: tres arqueros iniciales, sin reinvertir | 240 / 1 | Derrota |
| Villa: combinar y mejorar | 1000 / 3 | 1000 / 3 |
| Ciudadela: solo arqueros, reinvirtiendo | 1000 / 3 | 220 / 1 |
| Ciudadela: combinar y mejorar | 1000 / 3 | 1000 / 3 |

En el plan mixto de referencia, el combate dura aproximadamente 157/148/193 segundos en aldea/villa/ciudadela. Esperando todos los periodos de preparación, las misiones durarían 4,3/4,5/5,5 minutos a velocidad 1×. La ciudadela pasaba de 252 segundos de combate a 193 con ese plan. Iniciar oleadas antes, usar 2× o pausar modifica el tiempo de una partida.

Las pruebas repiten dos combinaciones por misión sobre tres cuadrículas desplazadas 0/0,25/0,5 metros. Todas ganan con al menos dos estrellas; tres estrellas siguen siendo alcanzables. También verifican derrota sin cobertura, que una apertura abandonada no complete las regiones posteriores y las prioridades de blancos mediante disparos reales. El navegador juega cuatro oleadas completas de la ciudadela con compras y proyectiles reales para comprobar el aviso del siguiente guardián.

## Próxima revisión con jugadores

Las simulaciones detectan regresiones y comprueban viabilidad; no estiman la dificultad para personas ni cubren todas las posiciones posibles. Antes de volver a tocar números, probar la aldea con una persona nueva y la ciudadela con alguien que ya conoce las defensas. Anotar resultado, salud, tiempo, armas usadas y en qué oleada apareció una decisión interesante o frustrante. El objetivo orientativo es una partida de 4–6 minutos con posiciones razonables; una defensa poco eficaz puede alargarla.

Revisar primero si el jugador entiende las previsiones, reinvierte a tiempo, siente que cañón y magia aportan algo y quiere repetir para mejorar estrellas. Evitar añadir XP o una moneda permanente hasta validar estas decisiones.
