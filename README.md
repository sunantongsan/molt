# MOLT

Duck house defense with a kitchen theme: a little duck house in the middle, a fence around it and platforms for duck throwers (chopsticks, forks, chili sauce...). Drag anywhere to walk the leader duck: it bonks cats with a ladle, picks up the coins they drop, and stands on buy pads to build and upgrade (platforms grow crates → table & chairs → cupboard tower → golden stove fort). Cats march down the lane from the top in waves (zombie-defense style); spend coins to build platforms, swap weapons and upgrade. Bonus mode: raid the cat castle in the army-runner battles.
break barriers, beat red squads and storm the enemy castle. Coins buy permanent upgrades between levels.

## Marching out (day 16+)
From day 16 the ducks leave the city (`web/expedition.js`): a long jungle map scrolls upward with the duck war camp at the bottom. Tap 🔨 Build (costs 🌽 corn, which flows in during the battle) to raise duck huts on the glowing pads beside the path — Chopstick Hut, Fork Tower, Chili Mill, Ladle Lodge, Crossbow Fort, Golden Egg Shrine. Huts keep sending ducks up the winding path to smash the cats' pot towers, wok barracks and chili catapults; clearing a zone opens the next pads. Every few builds pick 1 of 3 upgrade cards. Destroy the cat king's fortress (the king himself comes out at 60%) to win. Weapon levels bought in the city make the marching ducks stronger.
The first march opens with the Duck Chief's rally speech (`web/rally.js`, drawn live from the game art: "we won't take it any more — this time we attack, hands up!") and then a guided spotlight tutorial (camp, Build button, huts, corn, cat forts, cards, the fortress). Both can be replayed from the ❚❚ pause menu.
Later days get fiercer: cat raid parties come sooner and bigger, knights / steel tanks / shadow hunters (who go for duck huts) join in, and wok barracks pour out defenders when ducks get close. Ducks have two support items on cooldown: 🕊️ egrets that swoop in and peck (stunning) cats, and a 🎈 duck balloon that drops bombs on the biggest cat crowd or the nearest fort. Very long battles fire the ducks up so a stalemate always ends, and kill coins taper off after 5 minutes.

- Game: `web/index.html` (plain HTML5 canvas, no build step — open it in any browser)
- Android: `app/` wraps the game in a WebView. Every push to `main` builds an APK and publishes it under **Releases** (only the 3 newest are kept).

## Over-the-air patches
Every push also publishes `web/` to GitHub Pages (`https://sunantongsan.github.io/molt/`) with a `manifest.json` (build number + file hashes). The Android app checks it on start, downloads only the changed files in the background and shows "🔄 อัปเดตใหม่พร้อมแล้ว" — tap it to reload into the new game, no APK reinstall. Changes to the Android code itself (Java, manifest, ads) still need a new APK.

Sounds: recorded sound effects from the FilmCow Royalty Free SFX Library (filmcow.itch.io/filmcow-sfx).
