// M1 subset of Content sections 6–9. No production import from test fixtures.
// Other Trait mechanics remain deferred; M1 resolves only HP modifiers.
import { validateCatalog } from './validation.js';
const deepFreeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(deepFreeze); Object.freeze(value); } return value; };
export const candidateNames = Object.freeze(["Alden","Ansel","Arden","Bram","Cael","Corin","Dain","Doran","Elias","Finn","Hale","Iven","Joren","Kael","Lucan","Marek","Nolan","Orin","Perrin","Rowan","Soren","Toren","Varric","Wren","Alia","Anya","Cira","Elara","Faye","Hana","Ilya","Jessa","Kaia","Mara","Nessa","Rhea","Sela","Talia","Vera","Yara","Avery","Emery","Remy","Ren","Sasha","Vale","Quinn","Robin"]);
export const surfaceCatalog = deepFreeze(validateCatalog({
  "schemaVersion": 1,
  "tags": [
    {
      "id": "effect_heal",
      "label": "effect_heal",
      "domain": "effect"
    },
    {
      "id": "effect_damage",
      "label": "effect_damage",
      "domain": "effect"
    },
    {
      "id": "effect_impact",
      "label": "effect_impact",
      "domain": "effect"
    },
    {
      "id": "effect_defense",
      "label": "effect_defense",
      "domain": "effect"
    },
    {
      "id": "effect_max_hp",
      "label": "effect_max_hp",
      "domain": "effect"
    },
    {
      "id": "effect_con_physical_resilience_check",
      "label": "effect_con_physical_resilience_check",
      "domain": "effect"
    },
    {
      "id": "voice_auron",
      "label": "voice_auron",
      "domain": "voice"
    },
    {
      "id": "voice_rook",
      "label": "voice_rook",
      "domain": "voice"
    },
    {
      "id": "voice_mira",
      "label": "voice_mira",
      "domain": "voice"
    },
    {
      "id": "voice_tavi",
      "label": "voice_tavi",
      "domain": "voice"
    },
    {
      "id": "voice_lina",
      "label": "voice_lina",
      "domain": "voice"
    },
    {
      "id": "voice_garrick",
      "label": "voice_garrick",
      "domain": "voice"
    }
  ],
  "texts": [],
  "traits": [
    {
      "id": "trait_hardy",
      "label": "Hardy",
      "innate": true,
      "incompatible": [],
      "effects": [
        {
          "tag": "effect_max_hp",
          "value": 2
        },
        {
          "tag": "effect_con_physical_resilience_check",
          "value": 2
        }
      ],
      "probabilities": []
    },
    {
      "id": "trait_frail",
      "label": "Frail",
      "innate": true,
      "incompatible": [],
      "effects": [
        {
          "tag": "effect_max_hp",
          "value": -2
        },
        {
          "tag": "effect_con_physical_resilience_check",
          "value": -2
        }
      ],
      "probabilities": []
    },
    {
      "id": "trait_quick",
      "label": "Quick",
      "innate": true,
      "incompatible": [],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_strong_willed",
      "label": "Strong-Willed",
      "innate": true,
      "incompatible": [],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_charming",
      "label": "Charming",
      "innate": true,
      "incompatible": [],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_off_putting",
      "label": "Off-Putting",
      "innate": true,
      "incompatible": [],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_lucky",
      "label": "Lucky",
      "innate": true,
      "incompatible": [
        "trait_lucky_bastard"
      ],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_unlucky",
      "label": "Unlucky",
      "innate": true,
      "incompatible": [],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_fast_learner",
      "label": "Fast Learner",
      "innate": true,
      "incompatible": [],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_slow_learner",
      "label": "Slow Learner",
      "innate": true,
      "incompatible": [],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_sturdy_hands",
      "label": "Sturdy Hands",
      "innate": true,
      "incompatible": [],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_heavy_handed",
      "label": "Heavy-Handed",
      "innate": true,
      "incompatible": [],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_frugal",
      "label": "Frugal",
      "innate": true,
      "incompatible": [],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_wasteful",
      "label": "Wasteful",
      "innate": true,
      "incompatible": [],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_careful",
      "label": "Careful",
      "innate": true,
      "incompatible": [],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_reckless",
      "label": "Reckless",
      "innate": true,
      "incompatible": [],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_fearless",
      "label": "Fearless",
      "innate": true,
      "incompatible": [],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_cowardly",
      "label": "Cowardly",
      "innate": true,
      "incompatible": [],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_tough_stomach",
      "label": "Tough Stomach",
      "innate": true,
      "incompatible": [],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_pyrophobic",
      "label": "Pyrophobic",
      "innate": true,
      "incompatible": [],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_greedy",
      "label": "Greedy",
      "innate": true,
      "incompatible": [],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_curious",
      "label": "Curious",
      "innate": true,
      "incompatible": [],
      "effects": [],
      "probabilities": []
    },
    {
      "id": "trait_lucky_bastard",
      "label": "Lucky Bastard",
      "innate": true,
      "incompatible": [
        "trait_lucky"
      ],
      "effects": [],
      "probabilities": [],
      "perDrawChance": 1
    }
  ],
  "items": [
    {
      "id": "item_sword",
      "label": "Sword",
      "category": "weapon",
      "price": 30,
      "damage": 3,
      "defense": 1,
      "maxDurability": 12,
      "impact": 1,
      "accuracy": "STR",
      "range": "NEAR",
      "tier": 1,
      "stackable": false,
      "canDefend": true,
      "wear": "successful-hit",
      "effects": [],
      "contexts": [
        "combat"
      ]
    },
    {
      "id": "item_hammer",
      "label": "Hammer",
      "category": "weapon",
      "price": 40,
      "damage": 4,
      "defense": 0,
      "maxDurability": 10,
      "impact": 2,
      "accuracy": "STR",
      "range": "NEAR",
      "tier": 1,
      "stackable": false,
      "canDefend": true,
      "wear": "successful-hit",
      "effects": [],
      "contexts": [
        "combat"
      ]
    },
    {
      "id": "item_bow",
      "label": "Bow",
      "category": "weapon",
      "price": 35,
      "damage": 3,
      "defense": 0,
      "maxDurability": 12,
      "impact": 0,
      "accuracy": "DEX",
      "range": "FAR",
      "tier": 1,
      "stackable": false,
      "canDefend": false,
      "wear": "every-shot",
      "ammo": "item_arrows",
      "effects": [],
      "contexts": [
        "combat"
      ]
    },
    {
      "id": "item_chest_armor",
      "label": "Chest Armor",
      "category": "armor",
      "price": 75,
      "stackable": false,
      "defense": 2,
      "armorSlot": "chest",
      "effects": [],
      "contexts": [
        "combat"
      ]
    },
    {
      "id": "item_shield",
      "label": "Shield",
      "category": "shield",
      "price": 50,
      "stackable": false,
      "defense": 3,
      "maxDurability": 15,
      "canDefend": true,
      "wear": "connected-defense",
      "effects": [],
      "contexts": [
        "combat"
      ]
    },
    {
      "id": "item_hp_potion_basic",
      "label": "Basic HP Potion",
      "category": "consumable",
      "price": 10,
      "stackable": true,
      "freeAction": true,
      "wastefulEligible": true,
      "effects": [
        {
          "tag": "effect_heal",
          "value": 8
        }
      ],
      "contexts": [
        "surface",
        "exploration",
        "combat"
      ]
    },
    {
      "id": "item_arrows",
      "label": "Arrows",
      "category": "ammo",
      "price": 1,
      "stackable": true,
      "effects": [],
      "contexts": [
        "combat"
      ]
    }
  ],
  "spells": [
    {
      "id": "spell_fireball",
      "label": "Fireball",
      "cost": 4,
      "target": "enemy",
      "ranges": [
        "NEAR",
        "FAR"
      ],
      "accuracy": "INT",
      "effects": [
        {
          "tag": "effect_damage",
          "value": 5
        }
      ],
      "explorationOnly": false,
      "startingEligible": true
    },
    {
      "id": "spell_force",
      "label": "Force",
      "cost": 3,
      "target": "enemy",
      "ranges": [
        "NEAR",
        "FAR"
      ],
      "accuracy": "INT",
      "effects": [
        {
          "tag": "effect_impact",
          "value": 3
        }
      ],
      "explorationOnly": false,
      "startingEligible": true
    },
    {
      "id": "spell_heal",
      "label": "Heal",
      "cost": 4,
      "target": "self",
      "ranges": [],
      "effects": [
        {
          "tag": "effect_heal",
          "value": 8
        }
      ],
      "explorationOnly": false,
      "startingEligible": true
    },
    {
      "id": "spell_barrier",
      "label": "Barrier",
      "cost": 3,
      "target": "self",
      "ranges": [],
      "effects": [
        {
          "tag": "effect_defense",
          "value": 3
        }
      ],
      "explorationOnly": false,
      "startingEligible": true
    }
  ],
  "moves": [],
  "enemies": [],
  "hazards": [],
  "events": [],
  "situations": [],
  "locations": [
    {
      "id": "loc_inn",
      "label": "Inn",
      "kind": "surface",
      "stratum": 0,
      "serviceActor": "actor_mira",
      "playable": true
    },
    {
      "id": "loc_shop",
      "label": "General Shop / Apothecary",
      "kind": "surface",
      "stratum": 0,
      "serviceActor": "actor_tavi",
      "playable": true
    },
    {
      "id": "loc_guild",
      "label": "Adventurers’ Guild",
      "kind": "surface",
      "stratum": 0,
      "serviceActor": "actor_lina",
      "playable": true
    },
    {
      "id": "loc_town_hall",
      "label": "Town Hall",
      "kind": "surface",
      "stratum": 0,
      "serviceActor": "actor_garrick",
      "playable": true
    },
    {
      "id": "loc_pit_entrance",
      "label": "Pit Entrance",
      "kind": "pit",
      "stratum": 1,
      "playable": true
    }
  ],
  "actors": [
    {
      "id": "actor_auron",
      "label": "Auron",
      "role": "Protect newer adventurers",
      "goal": "Protect newer adventurers",
      "stats": {
        "STR": 4,
        "DEX": 2,
        "CON": 3,
        "INT": 1,
        "WIS": 3,
        "CHA": 2
      },
      "hearts": 3,
      "traits": [
        "trait_hardy",
        "trait_strong_willed"
      ],
      "controller": "Autonomous",
      "location": "loc_guild",
      "voice": "voice_auron",
      "authoredExceptions": [
        "stat-budget",
        "starting-loadout"
      ],
      "loadout": {
        "weapons": [
          "item_sword",
          "item_hammer"
        ],
        "armor": [
          "item_chest_armor"
        ],
        "items": [
          {
            "item": "item_shield",
            "quantity": 1
          },
          {
            "item": "item_hp_potion_basic",
            "quantity": 2
          }
        ],
        "arrows": 0,
        "gold": 60,
        "spells": [],
        "spellSlots": 4
      }
    },
    {
      "id": "actor_rook",
      "label": "Rook",
      "role": "Make money through the Pit",
      "goal": "Make money through the Pit",
      "stats": {
        "STR": 2,
        "DEX": 4,
        "CON": 2,
        "INT": 1,
        "WIS": 1,
        "CHA": 2
      },
      "hearts": 3,
      "traits": [
        "trait_quick",
        "trait_greedy"
      ],
      "controller": "Autonomous",
      "location": "loc_guild",
      "voice": "voice_rook",
      "authoredExceptions": [
        "starting-loadout"
      ],
      "loadout": {
        "weapons": [
          "item_sword",
          "item_bow"
        ],
        "armor": [
          "item_chest_armor"
        ],
        "items": [
          {
            "item": "item_hp_potion_basic",
            "quantity": 1
          }
        ],
        "arrows": 15,
        "gold": 45,
        "spells": [],
        "spellSlots": 4
      }
    },
    {
      "id": "actor_mira",
      "label": "Mira",
      "role": "Keep the Inn going",
      "goal": "Keep the Inn going",
      "stats": {
        "STR": 1,
        "DEX": 2,
        "CON": 2,
        "INT": 2,
        "WIS": 3,
        "CHA": 2
      },
      "hearts": 3,
      "traits": [
        "trait_hardy",
        "trait_charming"
      ],
      "controller": "Autonomous",
      "location": "loc_inn",
      "voice": "voice_mira",
      "authoredExceptions": [
        "starting-loadout"
      ],
      "loadout": {
        "weapons": [],
        "armor": [],
        "items": [],
        "arrows": 0,
        "gold": 0,
        "spells": [],
        "spellSlots": 4
      }
    },
    {
      "id": "actor_tavi",
      "label": "Tavi",
      "role": "Understand what comes out of the Pit",
      "goal": "Understand what comes out of the Pit",
      "stats": {
        "STR": 1,
        "DEX": 2,
        "CON": 2,
        "INT": 3,
        "WIS": 2,
        "CHA": 2
      },
      "hearts": 3,
      "traits": [
        "trait_curious",
        "trait_fast_learner"
      ],
      "controller": "Autonomous",
      "location": "loc_shop",
      "voice": "voice_tavi",
      "authoredExceptions": [
        "starting-loadout"
      ],
      "loadout": {
        "weapons": [],
        "armor": [],
        "items": [],
        "arrows": 0,
        "gold": 0,
        "spells": [],
        "spellSlots": 4
      }
    },
    {
      "id": "actor_lina",
      "label": "Lina",
      "role": "Keep Guild work moving",
      "goal": "Keep Guild work moving",
      "stats": {
        "STR": 1,
        "DEX": 2,
        "CON": 2,
        "INT": 2,
        "WIS": 2,
        "CHA": 3
      },
      "hearts": 3,
      "traits": [
        "trait_charming",
        "trait_strong_willed"
      ],
      "controller": "Autonomous",
      "location": "loc_guild",
      "voice": "voice_lina",
      "authoredExceptions": [
        "starting-loadout"
      ],
      "loadout": {
        "weapons": [],
        "armor": [],
        "items": [],
        "arrows": 0,
        "gold": 0,
        "spells": [],
        "spellSlots": 4
      }
    },
    {
      "id": "actor_garrick",
      "label": "Garrick",
      "role": "Grow HearthVale",
      "goal": "Grow HearthVale",
      "stats": {
        "STR": 1,
        "DEX": 1,
        "CON": 2,
        "INT": 2,
        "WIS": 3,
        "CHA": 3
      },
      "hearts": 3,
      "traits": [
        "trait_greedy",
        "trait_strong_willed"
      ],
      "controller": "Autonomous",
      "location": "loc_town_hall",
      "voice": "voice_garrick",
      "authoredExceptions": [
        "starting-loadout"
      ],
      "loadout": {
        "weapons": [],
        "armor": [],
        "items": [],
        "arrows": 0,
        "gold": 0,
        "spells": [],
        "spellSlots": 4
      }
    }
  ],
  "dialogues": [],
  "records": [],
  "tables": [],
  "probabilities": []
}));
