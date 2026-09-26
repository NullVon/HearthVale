// M4B material request plus M4D's two shared Guild/Town paths; broader content is deferred.
export const livingSituationDefinitions = [{
  id: 'situation_moonleaf_shortage', label: 'Moonleaf Shortage',
  kind: 'material-request', location: 'loc_shop', provider: 'actor_tavi', recurrence: true,
  duration: { kind: 'Short', days: 3 }, weight: 1,
  pressure: { all: [
    { entity: '$globals', field: 'hearthvaleServices.stock.item_hp_potion_basic', op: 'exists' },
    { not: { entity: '$globals', field: 'hearthvaleServices.stock.item_hp_potion_basic', op: 'gt', value: 3 } },
  ] },
  withdrawn: { entity: '$globals', field: 'hearthvaleServices.stock.item_hp_potion_basic', op: 'gte', value: 8 },
  material: 'item_moonleaf', quantity: 2,
  reward: { gold: 10, xp: 2 },
  stock: { item: 'item_hp_potion_basic', quantity: 2 },
  expiryText: 'Tavi withdrew the Moonleaf request when its delivery window closed.',
  withdrawnText: 'Medicine stocks recovered; Tavi no longer needs this delivery.',
}, {
  id:'situation_verify_hound_report', label:'Verify the Hound Report', kind:'hound-verification',
  location:'loc_guild', provider:'actor_lina', domain:'guild-work', recurrence:false,
  duration:{kind:'Short',days:3},weight:1,
  pressure:{entity:'hv_pit_1',field:'data.houndReports',op:'exists'},
  reward:{gold:10,xp:2},
  expiryText:'The Guild withdrew the unconfirmed Hound posting after its evidence window closed.',
}, {
  id:'situation_town_supply',label:'Town Supply Request',kind:'material-request',
  location:'loc_town_hall',provider:'actor_garrick',domain:'town-needs',recurrence:false,
  duration:{kind:'Long',days:7},weight:1,
  pressure:{not:{entity:'$globals',field:'hearthvaleServices.townSupplies.item_iron_ore',op:'gte',value:2}},
  withdrawn:{entity:'$globals',field:'hearthvaleServices.townSupplies.item_iron_ore',op:'gte',value:2},
  material:'item_iron_ore',quantity:2,reward:{gold:14,xp:3},
  stock:{pool:'townSupplies',item:'item_iron_ore',quantity:2},
  expiryText:'The Town Hall withdrew the iron delivery posting when its delivery window closed.',
  withdrawnText:'The civic iron reserve is supplied; this delivery is no longer needed.',
}];
