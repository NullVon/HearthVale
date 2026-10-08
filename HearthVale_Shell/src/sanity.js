export const sanityBand = value => ['Broken','Breaking','Unstable','Fraying','Uneasy','Stable'][value];
export const sanityLabel = r => `Sanity ${r.sanity}/${r.maxSanity}${r.sanity < r.maxSanity ? ` · ${sanityBand(r.sanity)}` : ''}`;

// Resource change and its receipt, with no checks, timers or random draws.
export function changeSanity(actor, amount, cause) {
  const r=actor.data.attributes.resources, before=r.sanity;
  r.sanity=Math.max(0,Math.min(r.maxSanity,r.sanity+amount));
  const delta=r.sanity-before;
  return `${cause}. Sanity ${delta>=0?'+':''}${delta}. ${sanityLabel(r)}.`;
}
