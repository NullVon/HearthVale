// Recorded from real production browser buttons (seed 1, Soren, Day 1–6).
// Dictionary indices retain UI actions as well as production intentions.
const command=(name,value='')=>[name,value];
const service=value=>command('service',JSON.stringify(value));
const pit=(type,params={})=>command('expedition',JSON.stringify({type:`pit.${type}`,params}));
const move=location=>command('move',location);
const talk=actor=>service({op:'talk',actor:`hv_actor_${actor}`});
const buy=item=>service({op:'buy',item:`item_${item}`});
const sell=(item,group='materials')=>service({op:'sell-holding',group,item:`item_${item}`});
const resolve=approach=>pit('resolve-room',{approach});
export const dictionary=[
 command('new'),command('opening-next'),command('choose','hv_actor_7'),command('arrive'),command('answer','looking'),command('finish-mira'),
 move('loc_surface'),move('loc_shop'),buy('hammer'),buy('hp_potion_basic'),command('inventory'),command('inventory-tab','bag'),service({op:'swap',bag:1,slot:2}),command('close'),
 move('loc_guild'),talk(5),move('loc_town_hall'),talk(6),command('menu'),command('save'),command('load'),move('loc_pit_entrance'),
 pit('enter'),pit('forward'),resolve('inspect'),pit('attack',{slot:0}),pit('combat-next'),pit('defend',{mode:'dodge'}),command('pit-tab','bag'),pit('use',{slot:0}),command('pit-tab','weapons'),pit('attack',{slot:2}),
 resolve('choice_family_table_search'),pit('move'),pit('defend',{mode:'none'}),pit('attack',{slot:1}),resolve('primary'),resolve('choice_injured_adventurer_return'),resolve('choice_frenzied_survivor_back'),resolve('choice_abandoned_camp_supplies'),resolve('choice_still_lives_record'),resolve('choice_old_notice_board_read'),pit('return'),command('inventory-tab','holdings'),
 sell('moonleaf'),sell('bitterroot'),sell('slime_core'),sell('bigshroom'),sell('town_medal','valuables'),service({op:'swap',bag:2,slot:0}),service({op:'swap',bag:1,slot:3}),move('loc_inn'),command('sleep-prompt'),command('sleep','1'),talk(8),command('sleep','2'),command('sleep','3'),command('sleep','4'),command('sleep','5'),talk(2),service({op:'track-opportunity',situation:'hv_situation_situation_town_supply_day_3'}),pit('enter',{shortcut:true}),resolve('alternate'),pit('guardian'),pit('scroll',{slot:3}),
];
export const steps=[0,1,1,1,1,1,2,3,4,5,6,7,8,9,10,11,12,13,6,14,15,6,16,17,18,19,20,6,21,22,23,24,23,18,19,20,25,26,26,25,27,26,25,27,26,25,27,26,25,27,26,25,26,26,25,27,26,25,23,25,27,26,25,26,26,25,27,26,25,28,29,30,23,23,24,23,24,23,24,23,25,27,26,25,27,26,25,26,26,25,23,23,24,23,24,23,25,27,26,25,26,26,31,26,26,31,26,26,31,27,26,31,23,32,23,23,31,27,26,31,26,26,31,26,26,31,27,26,28,29,30,31,27,26,31,26,26,31,23,33,34,26,35,34,26,33,34,26,35,23,36,23,23,33,34,26,35,34,26,33,34,26,35,23,24,23,24,23,23,24,23,24,23,33,34,26,35,34,26,33,34,26,35,23,37,23,23,38,23,24,23,39,23,23,18,19,20,36,23,40,23,41,23,24,23,23,24,42,33,34,26,35,34,26,33,34,26,35,18,19,20,6,14,15,6,7,10,43,13,44,44,44,44,44,45,45,45,45,45,46,46,47,47,48,8,9,9,9,10,11,49,50,13,6,51,52,53,18,19,20,54,52,55,52,56,52,57,52,58,6,14,59,15,6,16,17,60,6,21,61,23,24,23,62,23,41,23,23,63,64,25,27,26,25,27,26,25,27,26,25,26,26,25,27,26,25,27,26,25,27,26,25,27,26,25,26,26,25,26,26,25,27,26,25,27,26,25,26,26,25,27,26,25,27,26,25,26,26,31,26,26,31,19,20];
