# MOLT

Duck house defense with a kitchen theme: a little duck house in the middle, a fence around it and platforms for duck throwers (chopsticks, forks, chili sauce...). Drag anywhere to walk the leader duck: it bonks cats with a ladle, picks up the coins they drop, and stands on buy pads to build and upgrade (platforms grow crates → table & chairs → cupboard tower → golden stove fort). Cats march down the lane from the top in waves (zombie-defense style); spend coins to build platforms, swap weapons and upgrade. Bonus mode: raid the cat castle in the army-runner battles.
break barriers, beat red squads and storm the enemy castle. Coins buy permanent upgrades between levels.

- Game: `web/index.html` (plain HTML5 canvas, no build step — open it in any browser)
- Android: `app/` wraps the game in a WebView. Every push to `main` builds an APK and publishes it under **Releases** (only the 3 newest are kept).

## Over-the-air patches
Every push also publishes `web/` to GitHub Pages (`https://sunantongsan.github.io/molt/`) with a `manifest.json` (build number + file hashes). The Android app checks it on start, downloads only the changed files in the background and shows "🔄 อัปเดตใหม่พร้อมแล้ว" — tap it to reload into the new game, no APK reinstall. Changes to the Android code itself (Java, manifest, ads) still need a new APK.

Sounds: recorded sound effects from the FilmCow Royalty Free SFX Library (filmcow.itch.io/filmcow-sfx).
