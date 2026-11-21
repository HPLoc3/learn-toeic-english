# Image credits

The scene images used by the animated lessons are composed from two parts:

- People and the items they hold: the characters (a barista, an office worker,
  a man in a navy suit and a flower-shop owner) are original characters created
  by the site owner with an AI image-generation tool, then cut out from their
  original backgrounds. The items they hold or sit at (takeaway cup, mug,
  notebook and pen, phone, handbags, bouquet, and the table and chairs of the
  meeting scene) come from those same AI images.
- Backgrounds and props (cafe, office, lobby, street and flower-shop rooms, the
  counters including the nam-serve and trio-line counters, desk, laptop, flower
  shelf): drawn procedurally in flat style by `tools/compose-scenes.py`
  (Pillow only), so no third-party artwork is used.

No third-party characters, brands, logos or other third-party intellectual
property are used or imitated.

Files are produced with `tools/compose-scenes.py` (cut-outs + drawn backgrounds,
1600x900) and `tools/make-scenes.py` (resized to 800x450 and 1600x900, WebP,
metadata stripped). This file is not precached by the service worker.

The Unit 3 and Unit 4 scene images are whole AI-generated pictures made by the site owner, not cut-out composites of separate parts. The Unit 3 and Unit 4 outro pictures are 3x2 grids of the six scenes of the unit, composed by `tools/make-outro-grid.py`.

Status: Unit 1 and Unit 2 scene images are final art (date 2026-11-19). The Unit 2 exercise and game pictures tf1, mc2 and mc3 (assets/img/l02/pic) and the Unit 1 exercise and game pictures tf1, tf2, mc2, mc3 and mc4 (assets/img/l01/pic) are owner-generated characters (original characters, AI image tool, plain light-grey background) cut out by tools/cut-people.py and placed on backgrounds drawn procedurally by tools/compose-scenes.py (park, garden, street, supermarket, painted room, cafe, meeting room, warehouse); the other Unit 2 exercise pictures (shake-hands lesson picture, tf2, mc1/mc5, mc4/mc8) reuse the Unit 2 scene images duo-shake, duo-meeting, duo-walk and duo-flowers. The Unit 1 exercise mc5 reuses the Unit 1 scene image hanh-wear. The Unit 1 focus and mc1 pictures (assets/img/l01/pic/focus-800.webp, mc1-800.webp) are new compositions made by tools/compose-scenes.py: the AI-generated people cut-outs nam-pour and mai-type (site owner, original characters) placed on a kitchen background with a fruit bowl, and on the office desk with a mug, papers and a lamp, all drawn procedurally; the 1600x900 versions are not shipped. Unit 3 scene images (assets/img/l03/scene, assets/img-hd/l03) are final art (date 2026-11-21): the six scenes obj-table, obj-boxes, obj-bike, obj-cars, obj-lamp and obj-books are whole AI-generated pictures made by the site owner (original objects and settings), and the outro obj-outro is a 3x2 grid of those six scenes composed by tools/make-outro-grid.py. No unit has placeholder images or placeholder text left. The Unit 3 SVG exercise pictures are original flat vector drawings. Unit 4 scene images (assets/img/l04/scene, assets/img-hd/l04) are final art (date 2026-11-19): the six scenes are whole AI-generated original scenery pictures made by the site owner (no people, no text, no third-party artwork), and the outro grid scn-outro is composed from those six pictures by tools/make-outro-grid.py. The Unit 4 SVG exercise pictures are original flat vector drawings.

| file | tool | date | notes |
|---|---|---|---|
| assets/img/l01/scene/nam-pour-800.webp | AI-generated people by the site owner (original characters); background and props drawn by tools/compose-scenes.py | 2026-11-19 | Unit 1, scene nam-pour, 800x450 |
| assets/img-hd/l01/nam-pour-1600.webp | AI-generated people by the site owner (original characters); background and props drawn by tools/compose-scenes.py | 2026-11-19 | Unit 1, scene nam-pour, 1600x900 |
| assets/img/l01/scene/nam-wipe-800.webp | AI-generated people by the site owner (original characters); background and props drawn by tools/compose-scenes.py | 2026-11-19 | Unit 1, scene nam-wipe, 800x450 |
| assets/img-hd/l01/nam-wipe-1600.webp | AI-generated people by the site owner (original characters); background and props drawn by tools/compose-scenes.py | 2026-11-19 | Unit 1, scene nam-wipe, 1600x900 |
| assets/img/l01/scene/mai-look-800.webp | AI-generated people by the site owner (original characters); background and props drawn by tools/compose-scenes.py | 2026-11-19 | Unit 1, scene mai-look, 800x450 |
| assets/img-hd/l01/mai-look-1600.webp | AI-generated people by the site owner (original characters); background and props drawn by tools/compose-scenes.py | 2026-11-19 | Unit 1, scene mai-look, 1600x900 |
| assets/img/l01/scene/mai-type-800.webp | AI-generated people by the site owner (original characters); background and props drawn by tools/compose-scenes.py | 2026-11-19 | Unit 1, scene mai-type, 800x450 |
| assets/img-hd/l01/mai-type-1600.webp | AI-generated people by the site owner (original characters); background and props drawn by tools/compose-scenes.py | 2026-11-19 | Unit 1, scene mai-type, 1600x900 |
| assets/img/l01/scene/hanh-wear-800.webp | AI-generated people by the site owner (original characters); background and props drawn by tools/compose-scenes.py | 2026-11-19 | Unit 1, scene hanh-wear, 800x450 |
| assets/img-hd/l01/hanh-wear-1600.webp | AI-generated people by the site owner (original characters); background and props drawn by tools/compose-scenes.py | 2026-11-19 | Unit 1, scene hanh-wear, 1600x900 |
| assets/img/l01/scene/hanh-point-800.webp | AI-generated people by the site owner (original characters); background and props drawn by tools/compose-scenes.py | 2026-11-19 | Unit 1, scene hanh-point, 800x450 |
| assets/img-hd/l01/hanh-point-1600.webp | AI-generated people by the site owner (original characters); background and props drawn by tools/compose-scenes.py | 2026-11-19 | Unit 1, scene hanh-point, 1600x900 |
| assets/img/l01/scene/duo-cafe-800.webp | AI-generated people by the site owner (original characters); background and props drawn by tools/compose-scenes.py | 2026-11-19 | Unit 1, outro duo-cafe, 800x450 |
| assets/img-hd/l01/duo-cafe-1600.webp | AI-generated people by the site owner (original characters); background and props drawn by tools/compose-scenes.py | 2026-11-19 | Unit 1, outro duo-cafe, 1600x900 |
| assets/img/l01/pic/focus-800.webp | AI-generated person by the site owner (original character, cut-out nam-pour); kitchen background and fruit bowl drawn by tools/compose-scenes.py | 2026-11-21 | Unit 1, focus exercise/game picture, 800x450 |
| assets/img/l01/pic/mc1-800.webp | AI-generated person by the site owner (original character, cut-out mai-type); office background, laptop, mug, papers and lamp drawn by tools/compose-scenes.py | 2026-11-21 | Unit 1, exercise mc1/game picture, 800x450 |
| assets/img/l01/pic/tf1-800.webp | AI-generated people by the site owner (original character: woman on a park bench (cut-out l01-tf1)); park with a tree and an old-style street lamp, path and grass drawn by tools/compose-scenes.py | 2026-11-21 | Unit 1, exercise tf1/game picture, 800x450 |
| assets/img/l01/pic/tf2-800.webp | AI-generated people by the site owner (original character: gardener with a watering can and three pots (cut-out l01-tf2)); garden with a fence, soil, border flowers, a shovel stuck upright in the soil and the water stream drawn by tools/compose-scenes.py | 2026-11-21 | Unit 1, exercise tf2/game picture, 800x450 |
| assets/img/l01/pic/mc2-800.webp | AI-generated people by the site owner (original character: cyclist with helmet and backpack (cut-out l01-mc2)); street with shops, trees, sidewalk, road and one plain road sign drawn by tools/compose-scenes.py | 2026-11-21 | Unit 1, exercise mc2/game picture, 800x450 |
| assets/img/l01/pic/mc3-800.webp | AI-generated people by the site owner (original character: woman pushing a shopping cart (cut-out l01-mc3)); supermarket aisle with tall shelves of plain colour-block products and floor drawn by tools/compose-scenes.py | 2026-11-21 | Unit 1, exercise mc3/game picture, 800x450 |
| assets/img/l01/pic/mc4-800.webp | AI-generated people by the site owner (original character: man painting from a ladder (cut-out l01-mc4)); half-painted wall, window, floor and a drop cloth drawn by tools/compose-scenes.py | 2026-11-21 | Unit 1, exercise mc4/game picture, 800x450 |
| assets/img/l02/scene/duo-shake-800.webp | AI-generated people by the site owner (original characters); background and props drawn by tools/compose-scenes.py | 2026-11-19 | Unit 2, scene duo-shake, 800x450 |
| assets/img-hd/l02/duo-shake-1600.webp | AI-generated people by the site owner (original characters); background and props drawn by tools/compose-scenes.py | 2026-11-19 | Unit 2, scene duo-shake, 1600x900 |
| assets/img/l02/scene/duo-meeting-800.webp | AI-generated people by the site owner (original characters); background and props drawn by tools/compose-scenes.py | 2026-11-19 | Unit 2, scene duo-meeting, 800x450. The table, chairs, notebook and mug are part of the AI-generated people image. |
| assets/img-hd/l02/duo-meeting-1600.webp | AI-generated people by the site owner (original characters); background and props drawn by tools/compose-scenes.py | 2026-11-19 | Unit 2, scene duo-meeting, 1600x900. The table, chairs, notebook and mug are part of the AI-generated people image. |
| assets/img/l02/scene/trio-line-800.webp | AI-generated people by the site owner (original characters); background and props drawn by tools/compose-scenes.py | 2026-11-19 | Unit 2, scene trio-line, 800x450 |
| assets/img-hd/l02/trio-line-1600.webp | AI-generated people by the site owner (original characters); background and props drawn by tools/compose-scenes.py | 2026-11-19 | Unit 2, scene trio-line, 1600x900 |
| assets/img/l02/scene/nam-serve-800.webp | AI-generated people by the site owner (original characters); background and props drawn by tools/compose-scenes.py | 2026-11-19 | Unit 2, scene nam-serve, 800x450 |
| assets/img-hd/l02/nam-serve-1600.webp | AI-generated people by the site owner (original characters); background and props drawn by tools/compose-scenes.py | 2026-11-19 | Unit 2, scene nam-serve, 1600x900 |
| assets/img/l02/scene/duo-flowers-800.webp | AI-generated people by the site owner (original characters); background and props drawn by tools/compose-scenes.py | 2026-11-19 | Unit 2, scene duo-flowers, 800x450 |
| assets/img-hd/l02/duo-flowers-1600.webp | AI-generated people by the site owner (original characters); background and props drawn by tools/compose-scenes.py | 2026-11-19 | Unit 2, scene duo-flowers, 1600x900 |
| assets/img/l02/scene/duo-walk-800.webp | AI-generated people by the site owner (original characters); background and props drawn by tools/compose-scenes.py | 2026-11-19 | Unit 2, scene duo-walk, 800x450 |
| assets/img-hd/l02/duo-walk-1600.webp | AI-generated people by the site owner (original characters); background and props drawn by tools/compose-scenes.py | 2026-11-19 | Unit 2, scene duo-walk, 1600x900 |
| assets/img/l02/scene/group-outro-800.webp | AI-generated people by the site owner (original characters); background and props drawn by tools/compose-scenes.py | 2026-11-19 | Unit 2, outro group-outro, 800x450 |
| assets/img-hd/l02/group-outro-1600.webp | AI-generated people by the site owner (original characters); background and props drawn by tools/compose-scenes.py | 2026-11-19 | Unit 2, outro group-outro, 1600x900 |
| assets/img/l02/pic/tf1-800.webp | AI-generated people by the site owner (original characters: three people in a queue (cut-out l02-tf1)); cafe wall, window, menu board, hanging lamps, a shelf with three canisters, a plant and a small counter with one cup and a till drawn by tools/compose-scenes.py | 2026-11-21 | Unit 2, exercise tf1/game picture, 800x450 |
| assets/img/l02/pic/mc2-800.webp | AI-generated people by the site owner (original characters: three people around a table with a plan paper and a cup (cut-out l02-mc2)); meeting room with a window, picture, lamps, plants and floor drawn by tools/compose-scenes.py | 2026-11-21 | Unit 2, exercise mc2/game picture, 800x450 |
| assets/img/l02/pic/mc3-800.webp | AI-generated people by the site owner (original characters: two men, one with a box and a yellow cap, one with a clipboard (cut-out l02-mc3)); warehouse wall with a roller door, window strip, lamps and concrete floor drawn by tools/compose-scenes.py | 2026-11-21 | Unit 2, exercise mc3/game picture, 800x450 |
| assets/img/l03/scene/obj-table-800.webp | AI-generated by the site owner (original objects and settings); resized by tools/make-scenes.py | 2026-11-21 | Unit 3, scene obj-table, 800x450 |
| assets/img-hd/l03/obj-table-1600.webp | AI-generated by the site owner (original objects and settings); resized by tools/make-scenes.py | 2026-11-21 | Unit 3, scene obj-table, 1600x900 |
| assets/img/l03/scene/obj-boxes-800.webp | AI-generated by the site owner (original objects and settings); resized by tools/make-scenes.py | 2026-11-19 | Unit 3, scene obj-boxes, 800x450 |
| assets/img-hd/l03/obj-boxes-1600.webp | AI-generated by the site owner (original objects and settings); resized by tools/make-scenes.py | 2026-11-19 | Unit 3, scene obj-boxes, 1600x900 |
| assets/img/l03/scene/obj-bike-800.webp | AI-generated by the site owner (original objects and settings); resized by tools/make-scenes.py | 2026-11-19 | Unit 3, scene obj-bike, 800x450 |
| assets/img-hd/l03/obj-bike-1600.webp | AI-generated by the site owner (original objects and settings); resized by tools/make-scenes.py | 2026-11-19 | Unit 3, scene obj-bike, 1600x900 |
| assets/img/l03/scene/obj-cars-800.webp | AI-generated by the site owner (original objects and settings); resized by tools/make-scenes.py | 2026-11-21 | Unit 3, scene obj-cars, 800x450 |
| assets/img-hd/l03/obj-cars-1600.webp | AI-generated by the site owner (original objects and settings); resized by tools/make-scenes.py | 2026-11-21 | Unit 3, scene obj-cars, 1600x900 |
| assets/img/l03/scene/obj-lamp-800.webp | AI-generated by the site owner (original objects and settings); resized by tools/make-scenes.py | 2026-11-19 | Unit 3, scene obj-lamp, 800x450 |
| assets/img-hd/l03/obj-lamp-1600.webp | AI-generated by the site owner (original objects and settings); resized by tools/make-scenes.py | 2026-11-19 | Unit 3, scene obj-lamp, 1600x900 |
| assets/img/l03/scene/obj-books-800.webp | AI-generated by the site owner (original objects and settings); resized by tools/make-scenes.py | 2026-11-19 | Unit 3, scene obj-books, 800x450 |
| assets/img-hd/l03/obj-books-1600.webp | AI-generated by the site owner (original objects and settings); resized by tools/make-scenes.py | 2026-11-19 | Unit 3, scene obj-books, 1600x900 |
| assets/img/l03/scene/obj-outro-800.webp | composed by tools/make-outro-grid.py from the six Unit 3 scenes (AI-generated by the site owner); resized by tools/make-scenes.py | 2026-11-21 | Unit 3, outro obj-outro, 800x450 |
| assets/img-hd/l03/obj-outro-1600.webp | composed by tools/make-outro-grid.py from the six Unit 3 scenes (AI-generated by the site owner); resized by tools/make-scenes.py | 2026-11-21 | Unit 3, outro obj-outro, 1600x900 |
| assets/img/l03/focus.svg | vector illustration drawn by the site owner's tooling (flat shapes, no third-party artwork) | 2026-11-19 | Unit 3, exercise/game picture |
| assets/img/l03/tf1.svg | vector illustration drawn by the site owner's tooling (flat shapes, no third-party artwork) | 2026-11-19 | Unit 3, exercise/game picture |
| assets/img/l03/tf2.svg | vector illustration drawn by the site owner's tooling (flat shapes, no third-party artwork) | 2026-11-19 | Unit 3, exercise/game picture |
| assets/img/l03/mc1.svg | vector illustration drawn by the site owner's tooling (flat shapes, no third-party artwork) | 2026-11-19 | Unit 3, exercise/game picture |
| assets/img/l03/mc2.svg | vector illustration drawn by the site owner's tooling (flat shapes, no third-party artwork) | 2026-11-19 | Unit 3, exercise/game picture |
| assets/img/l03/mc3.svg | vector illustration drawn by the site owner's tooling (flat shapes, no third-party artwork) | 2026-11-19 | Unit 3, exercise/game picture |
| assets/img/l03/mc4.svg | vector illustration drawn by the site owner's tooling (flat shapes, no third-party artwork) | 2026-11-19 | Unit 3, exercise/game picture |
| assets/img/l04/scene/scn-boat-800.webp | AI-generated by the site owner (original scenery, whole image, no people) | 2026-11-19 | Unit 4, scene scn-boat, 800x450 |
| assets/img-hd/l04/scn-boat-1600.webp | AI-generated by the site owner (original scenery, whole image, no people) | 2026-11-19 | Unit 4, scene scn-boat, 1600x900 |
| assets/img/l04/scene/scn-bridge-800.webp | AI-generated by the site owner (original scenery, whole image, no people) | 2026-11-19 | Unit 4, scene scn-bridge, 800x450 |
| assets/img-hd/l04/scn-bridge-1600.webp | AI-generated by the site owner (original scenery, whole image, no people) | 2026-11-19 | Unit 4, scene scn-bridge, 1600x900 |
| assets/img/l04/scene/scn-trees-800.webp | AI-generated by the site owner (original scenery, whole image, no people) | 2026-11-19 | Unit 4, scene scn-trees, 800x450 |
| assets/img-hd/l04/scn-trees-1600.webp | AI-generated by the site owner (original scenery, whole image, no people) | 2026-11-19 | Unit 4, scene scn-trees, 1600x900 |
| assets/img/l04/scene/scn-mountains-800.webp | AI-generated by the site owner (original scenery, whole image, no people) | 2026-11-19 | Unit 4, scene scn-mountains, 800x450 |
| assets/img-hd/l04/scn-mountains-1600.webp | AI-generated by the site owner (original scenery, whole image, no people) | 2026-11-19 | Unit 4, scene scn-mountains, 1600x900 |
| assets/img/l04/scene/scn-road-800.webp | AI-generated by the site owner (original scenery, whole image, no people) | 2026-11-19 | Unit 4, scene scn-road, 800x450 |
| assets/img-hd/l04/scn-road-1600.webp | AI-generated by the site owner (original scenery, whole image, no people) | 2026-11-19 | Unit 4, scene scn-road, 1600x900 |
| assets/img/l04/scene/scn-harbor-800.webp | AI-generated by the site owner (original scenery, whole image, no people) | 2026-11-19 | Unit 4, scene scn-harbor, 800x450 |
| assets/img-hd/l04/scn-harbor-1600.webp | AI-generated by the site owner (original scenery, whole image, no people) | 2026-11-19 | Unit 4, scene scn-harbor, 1600x900 |
| assets/img/l04/scene/scn-outro-800.webp | composed by tools/make-outro-grid.py from the six Unit 4 scene pictures (3x2 grid, 16:9 cells, no text) | 2026-11-19 | Unit 4, outro scn-outro, 800x450 |
| assets/img-hd/l04/scn-outro-1600.webp | composed by tools/make-outro-grid.py from the six Unit 4 scene pictures (3x2 grid, 16:9 cells, no text) | 2026-11-19 | Unit 4, outro scn-outro, 1600x900 |
| assets/img/l04/focus.svg | vector illustration drawn by the site owner's tooling (flat shapes, no third-party artwork) | 2026-11-19 | Unit 4, exercise/game picture |
| assets/img/l04/tf1.svg | vector illustration drawn by the site owner's tooling (flat shapes, no third-party artwork) | 2026-11-19 | Unit 4, exercise/game picture |
| assets/img/l04/tf2.svg | vector illustration drawn by the site owner's tooling (flat shapes, no third-party artwork) | 2026-11-19 | Unit 4, exercise/game picture |
| assets/img/l04/mc1.svg | vector illustration drawn by the site owner's tooling (flat shapes, no third-party artwork) | 2026-11-19 | Unit 4, exercise/game picture |
| assets/img/l04/mc2.svg | vector illustration drawn by the site owner's tooling (flat shapes, no third-party artwork) | 2026-11-19 | Unit 4, exercise/game picture |
| assets/img/l04/mc3.svg | vector illustration drawn by the site owner's tooling (flat shapes, no third-party artwork) | 2026-11-19 | Unit 4, exercise/game picture |
| assets/img/l04/mc4.svg | vector illustration drawn by the site owner's tooling (flat shapes, no third-party artwork) | 2026-11-19 | Unit 4, exercise/game picture |
