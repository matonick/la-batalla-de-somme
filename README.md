# La Batalla de Somme — layout 08 HUD restaurado

Corrección sobre layout 07:

- Se mantiene el panel lateral sin Percepción inmediata.
- Se restaura Estado emocional en la barra lateral.
- Se restauran Acciones rápidas en la barra lateral.
- Acciones rápidas solo muestra acciones contextuales; no incluye Investigar ni Cuaderno.
- El Registro reciente conserva tamaño fijo y no depende de barras de desplazamiento.
- Lugar, clima, hora, momento del día, caso activo y objetivo siguen encima del mapa.
- La leyenda de símbolos se mantiene encima del mapa.

## Probar

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Audio preparado

La carpeta `public/audio/` ya viene lista para agregar música y efectos. No hace falta tocar código si respetás estos nombres:

- `public/audio/ui/notebook_open.mp3`
- `public/audio/ui/notebook_close.mp3`
- `public/audio/ui/evidence_found.mp3`
- `public/audio/ui/dialogue_open.mp3`
- `public/audio/ui/dialogue_choice.mp3`
- `public/audio/ui/contradiction_detected.mp3`
- `public/audio/ui/save_game.mp3`
- `public/audio/ui/load_game.mp3`
- `public/audio/ui/pause_open.mp3`
- `public/audio/front/step_mud.mp3`
- `public/audio/front/bombardment_near.mp3`
- `public/audio/music/menu_theme.mp3`
- `public/audio/music/front_ambient_day.mp3`
- `public/audio/music/front_ambient_night.mp3`
- `public/audio/music/notebook_ambient.mp3`

El audio se puede activar desde Opciones. Si falta un archivo, el juego continúa sin error.
