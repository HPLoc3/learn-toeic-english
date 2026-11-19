# Image credits

The scene images used by the animated lessons are composed from two parts:

- People: the characters (a barista, an office worker and a flower-shop owner)
  are original characters created by the site owner with an AI image-generation
  tool, then cut out from their original backgrounds.
- Backgrounds and props (cafe, office and flower-shop rooms, counters, desk,
  laptop, flower shelf and bouquet): drawn procedurally in flat style by
  `tools/compose-scenes.py` (Pillow only), so no third-party artwork is used.

No third-party characters, brands, logos or other third-party intellectual
property are used or imitated.

Files are produced with `tools/compose-scenes.py` (cut-outs + drawn backgrounds,
1600x900) and `tools/make-scenes.py` (resized to 800x450 and 1600x900, WebP,
metadata stripped). This file is not precached by the service worker.

Status: Unit 1 images are final art (date 2026-11-19). Unit 2 scene images (assets/img/l02/scene, assets/img-hd/l02) are PLACEHOLDERS and must be replaced with final art before release (check-units --release fails while data/l02-anim.js has placeholder: true). The Unit 2 SVG exercise pictures are original flat vector drawings.

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
| assets/img/l02/scene/duo-shake-800.webp | placeholder (gradient and scene name drawn by tools/make-scenes.py --placeholder; no artwork) | 2026-11-19 | Unit 2, scene duo-shake, 800x450, placeholder until final art |
| assets/img-hd/l02/duo-shake-1600.webp | placeholder (gradient and scene name drawn by tools/make-scenes.py --placeholder; no artwork) | 2026-11-19 | Unit 2, scene duo-shake, 1600x900, placeholder until final art |
| assets/img/l02/scene/duo-meeting-800.webp | placeholder (gradient and scene name drawn by tools/make-scenes.py --placeholder; no artwork) | 2026-11-19 | Unit 2, scene duo-meeting, 800x450, placeholder until final art |
| assets/img-hd/l02/duo-meeting-1600.webp | placeholder (gradient and scene name drawn by tools/make-scenes.py --placeholder; no artwork) | 2026-11-19 | Unit 2, scene duo-meeting, 1600x900, placeholder until final art |
| assets/img/l02/scene/trio-line-800.webp | placeholder (gradient and scene name drawn by tools/make-scenes.py --placeholder; no artwork) | 2026-11-19 | Unit 2, scene trio-line, 800x450, placeholder until final art |
| assets/img-hd/l02/trio-line-1600.webp | placeholder (gradient and scene name drawn by tools/make-scenes.py --placeholder; no artwork) | 2026-11-19 | Unit 2, scene trio-line, 1600x900, placeholder until final art |
| assets/img/l02/scene/nam-serve-800.webp | placeholder (gradient and scene name drawn by tools/make-scenes.py --placeholder; no artwork) | 2026-11-19 | Unit 2, scene nam-serve, 800x450, placeholder until final art |
| assets/img-hd/l02/nam-serve-1600.webp | placeholder (gradient and scene name drawn by tools/make-scenes.py --placeholder; no artwork) | 2026-11-19 | Unit 2, scene nam-serve, 1600x900, placeholder until final art |
| assets/img/l02/scene/duo-flowers-800.webp | placeholder (gradient and scene name drawn by tools/make-scenes.py --placeholder; no artwork) | 2026-11-19 | Unit 2, scene duo-flowers, 800x450, placeholder until final art |
| assets/img-hd/l02/duo-flowers-1600.webp | placeholder (gradient and scene name drawn by tools/make-scenes.py --placeholder; no artwork) | 2026-11-19 | Unit 2, scene duo-flowers, 1600x900, placeholder until final art |
| assets/img/l02/scene/duo-walk-800.webp | placeholder (gradient and scene name drawn by tools/make-scenes.py --placeholder; no artwork) | 2026-11-19 | Unit 2, scene duo-walk, 800x450, placeholder until final art |
| assets/img-hd/l02/duo-walk-1600.webp | placeholder (gradient and scene name drawn by tools/make-scenes.py --placeholder; no artwork) | 2026-11-19 | Unit 2, scene duo-walk, 1600x900, placeholder until final art |
| assets/img/l02/scene/group-outro-800.webp | placeholder (gradient and scene name drawn by tools/make-scenes.py --placeholder; no artwork) | 2026-11-19 | Unit 2, outro group-outro, 800x450, placeholder until final art |
| assets/img-hd/l02/group-outro-1600.webp | placeholder (gradient and scene name drawn by tools/make-scenes.py --placeholder; no artwork) | 2026-11-19 | Unit 2, outro group-outro, 1600x900, placeholder until final art |
| assets/img/l02/focus.svg | vector illustration drawn by the site owner's tooling (flat shapes, no third-party artwork) | 2026-11-19 | Unit 2, exercise/game picture |
| assets/img/l02/tf1.svg | vector illustration drawn by the site owner's tooling (flat shapes, no third-party artwork) | 2026-11-19 | Unit 2, exercise/game picture |
| assets/img/l02/tf2.svg | vector illustration drawn by the site owner's tooling (flat shapes, no third-party artwork) | 2026-11-19 | Unit 2, exercise/game picture |
| assets/img/l02/mc1.svg | vector illustration drawn by the site owner's tooling (flat shapes, no third-party artwork) | 2026-11-19 | Unit 2, exercise/game picture |
| assets/img/l02/mc2.svg | vector illustration drawn by the site owner's tooling (flat shapes, no third-party artwork) | 2026-11-19 | Unit 2, exercise/game picture |
| assets/img/l02/mc3.svg | vector illustration drawn by the site owner's tooling (flat shapes, no third-party artwork) | 2026-11-19 | Unit 2, exercise/game picture |
| assets/img/l02/mc4.svg | vector illustration drawn by the site owner's tooling (flat shapes, no third-party artwork) | 2026-11-19 | Unit 2, exercise/game picture |
