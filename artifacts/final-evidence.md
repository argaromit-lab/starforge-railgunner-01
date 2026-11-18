# Release evidence

## Browser and playable loop

`npm test` against `node serve.ts` exercised actual Chromium keyboard and mouse movement, dash, pause/resume and rail bolts. A deterministic pilot drove combat inputs only, cleared eight waves, took both upgrades, and defeated Vulcan-IX in 78.15 simulated seconds. It recorded 158 kills, 44 overloads, and 68.2 armor remaining. An idle run naturally reached defeat, and restart restored armor. No page errors or failed requests were observed; all game requests were local.

## Capture set

| Order | Browser state | PNG bytes |
| --- | --- | ---: |
| [01](../screenshots/01-combat.png) | Posed Final Stand checkpoint; actual seven-link overload with boss and 24 enemies | 86,917 |
| [02](../screenshots/02-title.png) | Title and animated attract scene | 73,203 |
| [03](../screenshots/03-upgrade.png) | Workshop earned after the first sector | 143,116 |
| [04](../screenshots/04-gameover.png) | Victory earned by the campaign pilot | 38,825 |

All captures were taken at 1280 × 800 and reduced to indexed PNG for size. No composition or retouching was applied. The DOM audit found no viewport overflow or independent HUD/modal text intersections, and no combat HUD or floating damage in modal states. Static anti-slop inspection passed for `game/index.html`; it does not assess runtime markup and reported one linked stylesheet.

## Rendering evidence

At the 24-enemy checkpoint, Three.js reported 277 draw calls after batching (previously 497), about 59k triangles, 87 geometries and 8 textures. The browser exposed AMD Radeon via ANGLE/D3D11. The arena spans 1920 × 1200 world units. The orthographic camera uses 1.18× zoom, exponentially eased player follow, and pointer look-ahead; the HUD remains anchored to the 1280 × 800 viewport. World-space labels, rings, bolts and sparks follow the camera. Route is backed with translucent basalt-dark glass; the CHAIN banner sits above and apart from damage labels. The scene uses one 2048² shadow map and a three-pass bloom followed by composition. UA reduced-motion preference is honored for camera shake and flash.

The visual scorecard needs human inspection before any premium quality claim: pixel measurements cannot establish silhouette quality, scene composition, or legibility at the judge's reduced contact-sheet scale. The four images above are the audit set. Bounty rank and win rate depend on judging after an actual submission.
