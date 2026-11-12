// Sprite sheets prepared from the supplied transparent MOLT artwork.
(() => {
  const tile = 168;
  const sheets = {
    '01': {"k_duck_walk":{"frames":[1,0,3,0]},"k_duck_act":{"frames":[4,4,7,2]}},
    '02': {"duck_crossbow_art":{"frames":[0,1,2,3]},"duck_chili_art":{"frames":[4,4,5,6]},"duck_spoon_art":{"frames":[8,9,10,11]}},
    '03': {"h_pan":[11,7,146,158],"h_bow":[173,7,158,158],"h_egg":[341,31,158,134],"h_coffee":[509,56,158,109],"h_triple":[5,216,158,117],"h_cannon":[173,176,158,157],"h_stove":[353,175,134,158],"h_storm":[509,184,158,149],"h_melon":[5,345,158,156],"h_roller":[177,343,149,158],"h_fish":[341,377,158,124],"it_chefhat":[509,357,158,144],"h_xbow":[10,511,147,158],"h_ice":[178,511,147,158]},
    '04': {"k_cat_front":{"frames":[0,1,0,3]},"k_cat_back":{"frames":[4,5,6,7]},"k_cat_walk":{"frames":[8,10,8,10]},"k_cat_act":{"frames":[12,13,14,15]}},
    '05': {"k_knight":{"frames":[0,1,2,3]},"k_shadow":{"frames":[4,5,6,7]},"k_steel":{"frames":[8,9,10,11]}},
    '06': {"k_king_walk":{"frames":[0,1,0,1]},"k_king_act":{"frames":[2,3,5,6]}},
    '07': {"cat_colander_art":{"frames":[0,1,2,3]},"cat_club_art":{"frames":[4,5,6,7]},"cat_board_art":{"frames":[8,9,10,11]}},
    '08': {"cat_ram_prop":[173,8,158,157],"cat_bomb_prop":[341,9,158,156],"catapult_prop":[173,176,158,157],"cat_chili_prop":[6,343,155,158]},
    '09': {"molt_altar":[18,7,132,158],"molt_deck_wood":[376,7,88,158],"molt_deck_bamboo":[31,175,106,158],"molt_deck_brick":[194,175,115,158],"molt_deck_gold":[348,175,143,158],"k_fence1":[5,352,158,149],"k_fence3":[175,343,153,158],"k_cart":[341,345,158,156]},
    '10': {"cat_thrower_art":{"frames":[0,1,2,3]},"cat_sling_art":{"frames":[4,5,6,7]},"cat_tub_art":{"frames":[8,9,10,11]}}
  };
  for (const [group, sprites] of Object.entries(sheets)) {
    const sheet = new Image();
    sheet.onload = () => {
      const cols = sheet.naturalWidth / tile;
      for (const [name, region] of Object.entries(sprites)) {
        const sprite = document.createElement('canvas');
        const frames = region.frames;
        sprite.width = frames ? frames.length * tile : region[2];
        sprite.height = frames ? tile : region[3];
        const paint = sprite.getContext('2d');
        if (frames) {
          frames.forEach((frame, i) => paint.drawImage(sheet,
            frame % cols * tile, Math.floor(frame / cols) * tile, tile, tile,
            i * tile, 0, tile, tile));
          FRAMES[name] = frames.length;
        } else {
          paint.drawImage(sheet, ...region, 0, 0, sprite.width, sprite.height);
        }
        IMG[name] = sprite;
      }
    };
    sheet.src = 'img/molt-art/' + group + '.webp';
  }
})();
