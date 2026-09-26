// Choices are data. Generic consequence tags are interpreted by the Shell.
export function addPitEvents(c) {
  const fx=(tag,value=1,target)=>({tag:`effect_${tag}`,value,...(target?{target}:{})});
  const events=[
    ['family_table','The Family Table','Plates still surround a table set for an ordinary meal.',[
      ['search','Search the room',null,[fx('treasure')]],['recover','Recover a personal item',null,[fx('item',1,'item_silver_locket')]],['leave','Leave it undisturbed',null,[]]]],
    ['scratched_warning','Scratched Warning','A hurried warning is cut into a door frame. Its reliability is uncertain.',[
      ['remember','Remember the warning',null,[fx('rumor')]],['leave','Continue without relying on it',null,[]]]],
    ['abandoned_camp','Abandoned Adventurer Camp','A cold camp holds a little abandoned equipment. Nothing here establishes who left it.',[
      ['supplies','Gather usable supplies',null,[fx('arrows',2)]],['evidence','Record the evidence',null,[fx('observation')]],['leave','Leave the camp',null,[]]]],
    ['injured_adventurer','Injured Adventurer','An adventurer sits against the wall, keeping weight off an injured leg.',[
      ['help','Help them',null,[fx('social',2)]],['return','Tell them to Return',{stat:'CHA',dc:11,scope:'cooperation'},[fx('social',1)]],['leave','Leave',null,[]],['rob','Rob them',{stat:'CHA',dc:11,scope:'intimidate'},[fx('gold',5),fx('social',-2)],[fx('social',-1)]]]],
    ['locked_bedroom','The Locked Bedroom','A swollen bedroom door is locked. Ordinary belongings may remain inside.',[
      ['unlock','Unlock the door',null,[fx('treasure')]],['force','Force the door',{stat:'STR',dc:11},[fx('treasure')]],['leave','Leave the door closed',null,[]]]],
    ['frenzied_survivor','Frenzied Survivor','An armed survivor turns toward you, frightened and agitated. You cannot tell why.',[
      ['talk','Talk calmly',{stat:'CHA',dc:11,scope:'cooperation'},[fx('social',1)],[fx('combat',1,'enemy_frenzied_adventurer')]],['back','Back away',{stat:'DEX',dc:11,scope:'escape'},[],[fx('combat',1,'enemy_frenzied_adventurer')]]]],
    ['old_notice_board','The Old Notice Board','A repair notice and a market announcement curl on a weathered board.',[
      ['read','Read the notices',null,[fx('observation')]],['leave','Continue',null,[]]]],
    ['still_lives','Something Still Lives Here','Fresh tracks cross the dust. Someone has recently tended a small fire.',[
      ['record','Record signs of occupancy',null,[fx('observation')]],['leave','Leave the mystery unresolved',null,[]]]],
  ];
  for(const [id,label,opening,choices] of events){
    c.texts.push({id:`text_event_${id}`,label,text:opening});
    c.events.push({id:`event_${id}`,label,opening:`text_event_${id}`,outputs:[],choices:choices.map(([key,label,check,effects,failure=[]])=>({id:`choice_${id}_${key}`,label,requires:[],targets:[],...(check?{check}:{}),effects,failure,text:`text_event_${id}`}))});
  }
}
