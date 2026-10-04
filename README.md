# Futuristic UI Mock-ups

Simple web-page versions of the screens in the Figma file "Futuristic UI Kit"
(https://www.figma.com/design/PaQMYwxyRCIgunC71iN9f1), viewed in a browser on this computer.

**Important:** the Figma file only has the kit's 8 sales pictures, not its editable parts.
Everything here is rebuilt by eye from those pictures, which are saved in `reference/`.

## What's in the kit

| Picture | What it shows |
|---|---|
| `frame-0` | Cover: a "Broadcast Design" news-style screen with a large globe in the middle, small maps of the USA and Africa, round number gauges (25, 40, 60, 75) and strips of bar charts |
| `frame-1` | The 4 ready-made full-screen layouts, stacked to show them off |
| `frame-2` | 36+ round pieces: wireframe globes, radar sweeps, progress rings, rings of tick marks |
| `frame-3` | A "Download" screen: a red banner across hazard stripes over a globe, with Error/Offline labels, sound-wave charts, level meters and three small radar dials |
| `frame-4` | 125+ simple line icons: crosshairs, arrows, warning signs, boxes, globes |
| `frame-5` | Example use: a rocket launch with side panels ("System Online", "Set Course", "Full Power") |
| `frame-6` | 36+ charts: sound waves, bar strips, dotted waves, heartbeat lines, grids of blinking squares, small dials |
| `frame-7` | Example use: the Download screen shown on an old laptop |

**Look:** near-black background, white hairline drawings, one bright red for anything
important, square tech-style capital letters, and a faint dotted grid behind everything.

## Running it

Double-click or run `./start.sh`. It starts a small local web server on port 8642 (Python's
built-in one, nothing to install) and opens the mock-ups in their own Chrome window.
Or open http://localhost:8642 in any browser while the server is running.

The window has one tab per Figma picture, in the same order. Number keys 1-8 also switch
tabs. On the Layouts tab, click a screen to open it full size, and click the Layouts tab
again to go back.

## How it's put together

- `index.html` is the tabbed window. Each tab loads one page from `screens/`.
- Every screen is laid out on a fixed 1600x950 board that stretches to fit the window.
- `js/parts.js` draws all the pieces (globes, radar dials, gauges, charts, icons, maps) as
  SVG line drawings. A page asks for a piece with `data-part="radar"` and the like, and
  adding `data-live` makes the piece keep changing.
- `styles/tokens.css` holds the colors and fonts; `styles/hud.css` holds the shared look.
