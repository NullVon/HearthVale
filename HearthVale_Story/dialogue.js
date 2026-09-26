import { expeditionCatalog as catalog, byId } from '../HearthVale_Content/expedition.js';
const priority=['immediate','situation','history','relationship','service','neutral'];
// Factual lines must match the listener's knowledge, never merely world truth.
export function selectDialogue({speaker,listener,day,stateTags=[],known=[],lines=catalog.dialogues,used=[]}){
  let pool=lines.filter(line=>line.actor===speaker.data.templateId && (!line.once||!used.includes(`once:${line.id}`)) && line.requires.every(t=>stateTags.includes(t))&&line.forbids.every(t=>!stateTags.includes(t))
    &&line.knowledge.every(k=>known.some(f=>f.subject===k.subject&&f.tag===k.tag&&(f.state==='Known'||f.state===k.state))));
  pool.sort((a,b)=>priority.indexOf(a.priority)-priority.indexOf(b.priority));
  pool=pool.filter(line=>line.priority===pool[0]?.priority);
  if(!pool.length){
    const curious=speaker.data.attributes.traits.includes('trait_curious');
    const baseline=[curious?'I wonder what used to stand down there.':'I am still finding my way around here.','A little preparation makes the walk easier.'];
    const ids=baseline.map((_,i)=>`generated_${speaker.id}_${i}`);
    const fresh=ids.findIndex(id=>!used.includes(`${day}:${id}`));const index=fresh<0?0:fresh;
    return {id:ids[index],text:baseline[index],reset:fresh<0,pool:ids};
  }
  const fresh=pool.filter(line=>!used.includes(`${day}:${line.id}`));const line=(fresh.length?fresh:pool)[0];
  return {id:line.id,text:byId('texts',line.text)?.text??line.text,once:line.once,reset:!fresh.length,pool:pool.map(l=>l.id)};
}
