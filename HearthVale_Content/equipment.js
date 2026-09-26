// Authored V1 additions. Prices of crafted outputs are recipe service costs;
// these outputs are not added to ordinary vendor stock.
export function addEquipment(catalog) {
  const item = id => catalog.items.find(x => x.id === `item_${id}`);
  for (const [id, value] of [['beast_fang',6],['crystal_shard',12]]) catalog.items.push({ id:`item_${id}`, label:id.split('_').map(w=>w[0].toUpperCase()+w.slice(1)).join(' '), category:'material', sellValue:value, stackable:true, effects:[], contexts:[] });
  for (const [id,label,sellValue] of [['silver_locket','Silver Locket',18],['engraved_cup','Engraved Drinking Cup',12],['merchant_seal','Merchant Seal',15],['porcelain_set','Porcelain Dinner Set',20],['old_coin_purse','Old Coin Purse',10],['jewelry_box','Jewelry Box',25],['decorative_brooch','Decorative Brooch',14],['town_medal','Town Commemorative Medal',16]])
    catalog.items.push({id:`item_${id}`,label,category:'valuable',sellValue,stackable:true,effects:[],contexts:[]});
  const gear = [
    ['slimeguard_shield','Slimeguard Shield','shield',0,3,18,0,25],
    ['beetle_chest','Beetle Chest','chest_armor',0,3,null,0,35],
    ['beetle_shield','Beetle Shield','shield',0,4,13,0,30],
    ['fang_sword','Fang Sword','sword',4,1,10,1,30],
    ['fang_hammer','Fang Hammer','hammer',5,0,8,3,35],
    ['iron_sword','Iron Sword','sword',4,2,15,1,40],
    ['iron_hammer','Iron Hammer','hammer',5,0,13,3,45],
    ['iron_shield','Iron Shield','shield',0,4,18,0,45],
    ['iron_chest','Iron Chest','chest_armor',0,3,null,0,60],
    ['crystal_bow','Crystal Bow','bow',4,0,14,0,40],
  ];
  for (const [id,label,base,damage,defense,dur,impact,price] of gear) {
    const value={...structuredClone(item(base)),id:`item_${id}`,label,defense,price};
    if(dur) value.maxDurability=dur;
    if(value.category==='weapon') Object.assign(value,{damage,impact,tier:2});
    catalog.items.push(value);
  }
  catalog.items.push({...structuredClone(item('hp_potion_basic')),id:'item_hp_potion_greater',label:'Greater HP Potion',price:12,effects:[{tag:'effect_heal',value:16}]},
    {...structuredClone(item('hp_potion_basic')),id:'item_bigshroom_tonic',label:'Bigshroom Tonic',price:20,contexts:['exploration','combat'],effects:[{tag:'effect_expedition_hp',value:8}]});
  item('antidote').price=8; item('cleanse_tonic').price=10;
  const recipes=[['slimeguard_shield','slime_core',2,25],['beetle_chest','beetle_shell',3,35],['beetle_shield','beetle_shell',2,30],['fang_sword','beast_fang',2,30],['fang_hammer','beast_fang',3,35],['antidote','venom_gland',1,8,2],['hp_potion_greater','moonleaf',2,12,2],['cleanse_tonic','bitterroot',2,10,2],['bigshroom_tonic','bigshroom',2,20,2],['iron_sword','iron_ore',2,40],['iron_hammer','iron_ore',3,45],['iron_shield','iron_ore',2,45],['iron_chest','iron_ore',3,60],['crystal_bow','crystal_shard',2,40]];
  catalog.recipes=recipes.map(([id,material,quantity,gold,count=1])=>({id:`recipe_${id}`,label:item(id).label,materials:[{item:`item_${material}`,quantity}],gold,output:`item_${id}`,quantity:count,service:count===2?'shop':'blacksmith'}));
  catalog.vendors=[{id:'vendor_general_shop',label:'General Shop / Apothecary',location:'loc_shop',stock:[['arrows',40,10],['hp_potion_basic',8,2],['sword',4,0],['bow',3,0],['hammer',3,0],['shield',3,0],['chest_armor',2,0]].map(([id,target,floor])=>({item:`item_${id}`,target,floor}))}];
}
