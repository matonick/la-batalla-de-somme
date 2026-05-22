# Audio para La Batalla de Somme

Colocá tus archivos `.mp3` respetando estos nombres. Si falta un archivo, el juego no se rompe; simplemente no reproduce ese sonido.

## UI

- `ui/notebook_open.mp3`
- `ui/notebook_close.mp3`
- `ui/evidence_found.mp3`
- `ui/dialogue_open.mp3`
- `ui/dialogue_choice.mp3`
- `ui/contradiction_detected.mp3`
- `ui/save_game.mp3`
- `ui/load_game.mp3`
- `ui/pause_open.mp3`

## Frente / mapa

### Pasos por terreno

- `front/step_mud.mp3`: barro común (`.`).
- `front/step_wood.mp3`: tablones húmedos (`=`).
- `front/step_water_mud.mp3`: charco o barro profundo (`~`).
- `front/step_trench_edge.mp3`: borde de trinchera o paso irregular (`+`).
- `front/step_default.mp3`: respaldo para terrenos caminables no catalogados.

### Bombardeos

- `front/bombardment_near.mp3`: explosión cercana.
- `front/bombardment_distant.mp3`: artillería lejana o retumbar de fondo.

## Música / ambiente

- `music/menu_theme.mp3`
- `music/front_ambient_day.mp3`
- `music/front_ambient_night.mp3`
- `music/notebook_ambient.mp3`

## Notas técnicas

- El audio queda activado por defecto. Desde **Opciones** se puede desactivar o volver a activar sonido y música.
- Los pasos se eligen automáticamente según el tile de destino.
- El bombardeo usa sonido cercano o lejano según `bombardmentEffect.intensity`.
