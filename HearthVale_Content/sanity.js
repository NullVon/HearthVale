// Small authored Phase 4 pool; ordinary Events and combat use their existing resolvers.
export function addSanityContent(c) {
  c.tags.push({id:'effect_sanity',label:'Sanity',domain:'effect'});
  const loss=[{tag:'effect_sanity',value:-1}];
  for (const [id,label,text,subjective,choices] of [
    ['the_body','The Body','A familiar body lies in the dust. For an instant, its face is yours.',true,
      [['endure','Face the sight',{stat:'WIS',scope:'mental',dc:11}]]],
    ['wrong_reflection','The Wrong Reflection','Your reflection moves before you do. The surface is still.',true,
      [['away','Look Away',null],['closer','Look Closer',{stat:'WIS',scope:'mental',dc:14}]]],
    ['horrific_remains','Horrific Remains','The remains ahead leave little doubt about what happened here.',false,
      [['endure','Steady yourself',{stat:'WIS',scope:'mental',dc:11}]]],
  ]) {
    c.texts.push({id:`text_event_${id}`,label,text});
    c.events.push({id:`event_${id}`,label,subjective,opening:`text_event_${id}`,outputs:[],
      choices:choices.map(([key,label,check])=>({id:`choice_${id}_${key}`,label,requires:[],targets:[],
        ...(check?{check}:{}),effects:[],failure:check?loss:[],text:`text_event_${id}`}))});
  }
  c.texts.push({id:'text_whispering_depths',label:'Whispering Depths',text:'Words seem to rise from somewhere far beneath the stone.'});
  c.hazards.push({id:'hazard_whispering_depths',label:'Whispering Depths',primary:{stat:'WIS',scope:'mental',dc:14},
    advantageFrom:[],failure:loss,text:'text_whispering_depths'});
  c.moves.push(
    {id:'move_double_quick',label:'Quick Strike',damage:3,impact:1,speed:1,qualityStat:'DEX',dodgeDC:11,stability:1,onHit:[]},
    {id:'move_double_heavy',label:'Heavy Blow',damage:5,impact:2,speed:-1,qualityStat:'STR',dodgeDC:11,stability:2,onHit:[]},
  );
  c.enemies.push({id:'enemy_hollow_double',label:'The Hollow Double',hp:14,defense:1,combatStats:{STR:3,DEX:3},
    attackDC:11,xp:5,harvest:[],guardian:false,subjective:true,
    moves:{kind:'exclusive',entries:[{target:'move_double_quick',weight:60},{target:'move_double_heavy',weight:40}]}});
}
