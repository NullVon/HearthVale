export function addDialogue(c){
  c.tags.push({id:'info_discovery',label:'Discovery known',domain:'information'});
  c.texts.push({id:'text_lina_square',label:'Lina on Sunken Square',text:'Sunken Square is in the record now. We can keep its finder and date together.'});
  c.dialogues.push({id:'dialogue_lina_square',label:'Lina on Sunken Square',actor:'actor_lina',voice:'voice_lina',priority:'history',requires:[],forbids:[],knowledge:[{subject:'loc_sunken_square',tag:'info_discovery',state:'Known'}],text:'text_lina_square',once:true,pool:'lina_history'});
  const lines={
    auron:['Keep enough strength for the way back.','Check your grip before you blame the blade.'],
    rook:['A short trip can still pay. Timing helps.','I like an opportunity that leaves me time for supper.'],
    mira:['Eat something before you go. You make poor decisions hungry.','Sit down a moment. The Pit can wait.'],
    tavi:['Bring me a sample, not just a description. Then we can work with it.','I found room on the shelf. That is practically an invitation.'],
    lina:['Tell me what you saw. I will keep the report separate from the rumor.','The Guild can record the finder and the date.'],
    garrick:['A useful town needs reliable supplies. Small contributions matter.','Give me the facts first. We can decide what to announce afterward.'],
  };
  for(const [name,pool]of Object.entries(lines))pool.forEach((text,i)=>{
    const id=`dialogue_${name}_service_${i}`;c.texts.push({id:`text_${id}`,label:name,text});
    c.dialogues.push({id,label:`${name} service`,actor:`actor_${name}`,voice:`voice_${name}`,priority:'service',requires:[],forbids:[],knowledge:[],text:`text_${id}`,once:false,pool:`service_${name}`});
  });
}
