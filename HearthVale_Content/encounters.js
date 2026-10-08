export const enemyWeights=[['enemy_slime',30],['enemy_cave_beetle',25],['enemy_pit_hound',20],['enemy_venom_spider',15],['enemy_frenzied_adventurer',10]].map(([target,weight])=>({target,weight}));
export function addEncounters(c) {
  const move=(id,label,damage,impact,dodgeDC,stability)=>({id:`move_${id}`,label,damage,impact,dodgeDC,stability,onHit:[],
    speed: ({hound_bite:1,hound_maul:-1,hound_pounce:1,reckless_swing:-1,brute_heavy:-1})[id] ?? 0,
    qualityStat: ['hound_pounce','rock_throw'].includes(id) ? 'DEX' : 'STR'});
  c.moves.push(move('hound_bite','Hound Bite',4,1,14,1),move('hound_maul','Hound Maul',5,2,11,2),move('hound_pounce','Pounce',3,1,14,1),move('wild_slash','Wild Slash',4,1,11,2),move('reckless_swing','Reckless Swing',5,2,8,2),move('rock_throw','Rock Throw',3,1,11,1),move('brute_swing','Basic Swing',5,2,11,2),move('brute_heavy','Heavy Swing — a raised, crushing blow',7,4,8,3));
  const selection=entries=>({kind:'exclusive',entries:entries.map(([id,weight])=>({target:`move_${id}`,weight}))});
  c.enemies.push(...[
    ['pit_hound','Pit Hound',8,0,14,4,[{item:'item_beast_fang',chance:45,quantity:1}],[['hound_bite',50],['hound_maul',30],['hound_pounce',20]],false],
    ['frenzied_adventurer','Frenzied Adventurer',12,1,11,6,[],[['wild_slash',50],['reckless_swing',25],['rock_throw',25]],false],
    ['ruin_brute','Ruin Brute',24,2,8,20,[],[['brute_swing',70],['brute_heavy',30]],true],
  ].map(([id,label,hp,defense,attackDC,xp,harvest,moves,guardian])=>({id:`enemy_${id}`,label,hp,defense,attackDC,xp,harvest,moves:selection(moves),guardian,
    combatStats: ({pit_hound:{STR:3,DEX:4},frenzied_adventurer:{STR:3,DEX:2},ruin_brute:{STR:4,DEX:1}})[id]})));
  const specs=[
    ['blocked_passage','Blocked Passage','STR',11,null,null,2,['item_hammer','item_fang_hammer','item_iron_hammer','spell_force']],
    ['flooded_cellar','Flooded Cellar','CON',11,'WIS',14,3,[]],
    ['unstable_stairwell','Unstable Stairwell','DEX',11,'WIS',11,2,[]],
    ['burning_ruin','Burning Ruin','DEX',14,'CON',14,4,[]],
    ['rotten_bridge','Rotten Bridge / Broken Beam','DEX',11,'STR',14,3,[]],
    ['trapped_chest','Trapped Chest / Snare','WIS',11,null,null,2,[]],
    ['dark_passage','Dark Passage','WIS',11,null,null,2,[]],
  ];
  for(const [id,label,stat,dc,alt,altDC,damage,advantageFrom] of specs){
    c.texts.push({id:`text_${id}`,label,text:label==='Dark Passage'?'The passage narrows beyond the reach of daylight.':`${label} interrupts the old route.`});
    c.hazards.push({id:`hazard_${id}`,label,primary:{stat,dc},...(alt?{alternate:{stat:alt,dc:altDC}}:{}),advantageFrom,failure:[{tag:'effect_damage',value:damage}],text:`text_${id}`,
      ...(id==='burning_ruin'?{fire:true}:{}),...(id==='trapped_chest'?{triggered:{stat:'DEX',dc:14},reward:true}:{})});
  }
  c.tables.push({id:'table_enemy_encounters',label:'Stratum 1 encounters',kind:'exclusive',entries:enemyWeights});
  c.locations.push({id:'loc_sunken_square',label:'Sunken Square',kind:'named',stratum:1,playable:true});
}
