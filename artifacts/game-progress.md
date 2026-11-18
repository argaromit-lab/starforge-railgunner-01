# STARFORGE RAILGUNNER: VOLT & AMBER

Original browser action roguelike for @argaromit. Built in this session in this workspace. Stop after successful makefun check, before submit.

## Design brief
Become a copper-armored ranger using magnetic rail bolts to stitch hostile machines into a circuit, then implode that circuit in a plasma storm. Aim, tether, reposition, overload. Movement and dash preserve armor; killing linked groups restores capacitor and awards amber. Three sectors and eight escalating waves culminate in Vulcan-IX. Draft one of three distinct upgrades between sectors. Death teaches positioning; restart is immediate. A skilled player holds chains until enemies cluster and uses pillars to extend range. Threat rings and a sweeping laser telegraph danger. No borrowed characters, art or sound.

## Core loop contract
Player tethers targets and detonates chains to clear eight waves while melee drones, shield walkers, artillery and boss lasers threaten armor. Kills award score and amber, multi-target overload raises combo, upgrades change mechanics. Losing armor ends the run; victory defeats Vulcan-IX. Both outcomes offer restart.

## Encounter plan
Fixed orthographic oblique arena on a broad industrial viaduct above a golden canyon. Player starts center; conductor pillars punctuate the arena. Wave 1 teaches tether and overload; 2 adds shields; 3 grants an upgrade. Wave 4 introduces artillery; wave 5 increases pressure; 6 grants another upgrade. Wave 7 is an elite onslaught; wave 8 adds a giant articulated dreadnought with reinforcements. Boss sweep charges visibly before damage. Jet dash grants brief invulnerability.

## Architecture and art direction
Offline static native ES modules, vendored Three.js, offscreen multi-pass bloom, procedural authored geometry and material textures. Deep basalt and cobalt against white cyan electricity and amber light. Full 1280x800 viewport, compact HUD and isolated modal states. Collision is a deterministic kinematic circle system with fixed substeps, not rigid body simulation.

## Status
- Requirements read; Node 24.15.0 and OpenCode 1.19.5 verified.
- Genuine OpenCode sessions discovered by the kit. Preflight passed model pricing, timestamps, and run record.
- Original game implemented and running. Browser QA exercised keyboard and mouse, an eight-wave victory, two drafts, natural defeat, restart, and HUD bounds.
- Four 1280 × 800 browser captures generated. Workshop and victory came from an input-driven run; combat uses the posed Final Stand checkpoint and the game's overload event.
- No login or submit performed.
