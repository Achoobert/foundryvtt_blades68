import { BladesHelpers } from "../blades-helpers.js";

const { fields } = foundry.data;


export class CharacterData extends foundry.abstract.TypeDataModel {
  
  static migrateData(source) {
    const rawList = source?.keys?.list;
    if (rawList && typeof rawList === "object") {
      const slots = Array.isArray(rawList) ? rawList : Object.values(rawList);
      for (const slot of slots) {
        if (!slot || typeof slot !== "object") continue;
        if ("marks" in slot) {
          if (!("experience" in slot)) slot.experience = slot.marks;
          delete slot.marks;
        }
        if ("boomed" in slot) {
          if (!("deadlocked" in slot)) slot.deadlocked = slot.boomed;
          delete slot.boomed;
        }
      }
    }
    return super.migrateData(source);
  }

  static defineSchema() {
    const str = (initial = "") => new fields.StringField({ required: true, blank: true, initial });
    const bool = (initial = false) => new fields.BooleanField({ required: true, initial });
    const num = (initial = 0) => new fields.NumberField({ required: true, initial, integer: true });
    const numArray = (initial = [0]) => new fields.ArrayField(
      new fields.NumberField({ required: true, initial: 0, integer: true }),
      { required: true, initial }
    );

    const cohortStatus = () => ({
      weak: bool(),
      impaired: bool(),
      broken: bool()
    });

    return {
      
      alias: str(),
      pronouns: str(),
      look: str(),
      heritage: str(), 
      background: str(),
      "background-details": str(),
      vice: str(),
      "vice-purveyor": str(),
      playbook: str(), 
      description: str(), 

      
      crew: new fields.ArrayField(new fields.ObjectField(), { required: true, initial: [] }),

      
      edge: new fields.SchemaField({
        value: num(0),
        max: num(1)
      }),

      
      acquaintances: new fields.ArrayField(new fields.ObjectField(), { required: true, initial: [] }),
      acquaintances_label: str("BITD.Acquaintances"),

      
      stress: new fields.SchemaField({
        value: numArray([0]),
        max: num(9),
        max_default: num(9),
        name: str("BITD.Stress"),
        name_default: str("BITD.Stress")
      }),
      trauma: new fields.SchemaField({
        max: num(4),
        max_default: num(4),
        value: numArray([0]),
        name: str("BITD.Trauma"),
        name_default: str("BITD.Trauma"),
        options: new fields.ArrayField(new fields.StringField({ required: true, blank: true }), {
          required: true,
          initial: [
            "BITD.TraumaCold",
            "BITD.TraumaHaunted",
            "BITD.TraumaObsessed",
            "BITD.TraumaParanoid",
            "BITD.TraumaReckless",
            "BITD.TraumaSoft",
            "BITD.TraumaUnstable",
            "BITD.TraumaVicious"
          ]
        }),
        list: new fields.ArrayField(new fields.StringField({ required: true, blank: true }), { required: true, initial: [] })
      }),

      
      keys: new fields.SchemaField({
        max: num(4),
        list: new fields.ArrayField(
          new fields.SchemaField({
            key: str(),
            experience: num(0),
            deadlocked: bool(false),
            deadlocked_to: str()
          }),
          {
            required: true,
            initial: Array.from({ length: 4 }, () => ({ key: "", experience: 0, deadlocked: false, deadlocked_to: "" }))
          }
        )
      }),

      
      "healing-clock": numArray([0]), 
      healing_clock: new fields.SchemaField({
        value: numArray([0]),
        max: num(4),
        min: num(0)
      }),

      
      experience: numArray([0]), 
      experience_max: num(8),
      experience_clues: new fields.ArrayField(new fields.StringField({ required: true, blank: true }), {
        required: true,
        initial: ["BITD.ClassExpClue3", "BITD.ClassExpClue2"]
      }),
      exp_clock: new fields.SchemaField({
        
        value: num(0),
        number: num(0),
        size: num(6),
        color: str("black")
      }),

      
      coins: numArray([0]),
      coins_stashed: numArray([0]),
      coins_max: new fields.SchemaField({
        hand: num(4),
        stash: num(40)
      }),

      
      special_abilities: new fields.ArrayField(new fields.ObjectField(), { required: true, initial: [] }), 
      loadout: num(0), 
      load_level: str(), 
      selected_load_level: str(), 
      base_max_load: num(0), 

      
      harm: new fields.SchemaField({
        light: new fields.SchemaField({ one: str(), two: str() }),
        medium: new fields.SchemaField({ one: str(), two: str() }),
        heavy: new fields.SchemaField({ one: str() }),
        deadly: new fields.SchemaField({ one: str() })
      }),
      "armor-uses": new fields.SchemaField({
        armor: bool(false),
        heavy: bool(false), 
        special: bool(false),
        special_2: bool(false)
      }),

      
      attributes: new fields.SchemaField({
        insight: new fields.SchemaField({
          exp: num(0),
          exp_max: num(6),
          bonus: num(0),
          label: str("BITD.SkillsInsight"),
          skills: new fields.SchemaField({
            hunt: new fields.SchemaField({ label: str("BITD.SkillsHunt"), value: num(0), max: num(3), min: num(0) }),
            study: new fields.SchemaField({ label: str("BITD.SkillsStudy"), value: num(0), max: num(3), min: num(0) }),
            survey: new fields.SchemaField({ label: str("BITD.SkillsSurvey"), value: num(0), max: num(3), min: num(0) }),
            tinker: new fields.SchemaField({ label: str("BITD.SkillsTinker"), value: num(0), max: num(3), min: num(0) })
          })
        }),
        prowess: new fields.SchemaField({
          exp: num(0),
          exp_max: num(6),
          bonus: num(0),
          label: str("BITD.SkillsProwess"),
          skills: new fields.SchemaField({
            finesse: new fields.SchemaField({ label: str("BITD.SkillsFinesse"), value: num(0), max: num(3), min: num(0) }),
            prowl: new fields.SchemaField({ label: str("BITD.SkillsProwl"), value: num(0), max: num(3), min: num(0) }),
            skirmish: new fields.SchemaField({ label: str("BITD.SkillsSkirmish"), value: num(0), max: num(3), min: num(0) }),
            wreck: new fields.SchemaField({ label: str("BITD.SkillsWreck"), value: num(0), max: num(3), min: num(0) })
          })
        }),
        resolve: new fields.SchemaField({
          exp: num(0),
          exp_max: num(6),
          bonus: num(0),
          label: str("BITD.SkillsResolve"),
          skills: new fields.SchemaField({
            attune: new fields.SchemaField({ label: str("BITD.SkillsAttune"), value: num(0), max: num(3), min: num(0) }),
            command: new fields.SchemaField({ label: str("BITD.SkillsCommand"), value: num(0), max: num(3), min: num(0) }),
            consort: new fields.SchemaField({ label: str("BITD.SkillsConsort"), value: num(0), max: num(3), min: num(0) }),
            sway: new fields.SchemaField({ label: str("BITD.SkillsSway"), value: num(0), max: num(3), min: num(0) })
          })
        })
      }),

      
      "unique-data": new fields.SchemaField({
        hound: new fields.SchemaField({
          name: str(),
          edges: str(),
          flaws: str(),
          type: str(),
          abilities: str(),
          ...cohortStatus(),
          armor: num(0)
        }),
        hull: new fields.SchemaField({
          memories: new fields.SchemaField({
            name_heritage: new fields.SchemaField({ text: str(), clock: num(0) }),
            unfinished: new fields.SchemaField({ text: str(), clock: num(0) }),
            background_love: new fields.SchemaField({ text: str(), clock: num(0) }),
            crime: new fields.SchemaField({ text: str(), clock: num(0) })
          })
        }),
        intellectual: new fields.SchemaField({
          sparkmind: new fields.SchemaField({
            name: str(),
            edges: str(),
            flaws: str(),
            abilities: str(),
            function: str(),
            housing: str(),
            ...cohortStatus()
          })
        }),
        operative: new fields.SchemaField({
          backing_faction: new fields.SchemaField({
            faction: str(),
            personal_mission: str(),
            prestige_ability: str(),
            failure: num(0)
          })
        }),
        paranormalist: new fields.SchemaField({
          resonance: new fields.SchemaField({
            name: str(),
            edges: str(),
            flaws: str(),
            type: str("Paranormal assistant"),
            abilities: str(),
            ...cohortStatus(),
            armor: num(0)
          })
        }),
        radical: new fields.SchemaField({
          explosives: new fields.SchemaField({
            bandolier1: new fields.SchemaField({ slot1: bool(), slot2: bool(), slot3: bool() }),
            bandolier2: new fields.SchemaField({ slot1: bool(), slot2: bool(), slot3: bool() })
          })
        }),
        swinger: new fields.SchemaField({
          autopod: new fields.SchemaField({
            name: str(),
            style: str(),
            type: str(),
            ...cohortStatus()
          })
        }),
        veteran: new fields.SchemaField({
          damage: str(),
          helps: str()
        }),
        vampire: new fields.SchemaField({
          strictures: new fields.SchemaField({
            dayfire: bool(true),
            slumber: bool(false),
            forbidden: bool(false),
            repelled: bool(false),
            bestial: bool(false),
            bound: bool(false)
          })
        }),
        time_traveler: new fields.SchemaField({
          mission: str(),
          prevent: new fields.SchemaField({
            detail1: new fields.SchemaField({ done: bool(), text: str() }),
            detail2: new fields.SchemaField({ done: bool(), text: str() }),
            detail3: new fields.SchemaField({ done: bool(), text: str() }),
            detail4: new fields.SchemaField({ done: bool(), text: str() })
          }),
          chase: new fields.SchemaField({
            detail1: new fields.SchemaField({ done: bool(), text: str() }),
            detail2: new fields.SchemaField({ done: bool(), text: str() }),
            detail3: new fields.SchemaField({ done: bool(), text: str() }),
            detail4: new fields.SchemaField({ done: bool(), text: str() })
          })
        })
      })
    };
  }

  
  prepareDerivedData() {
    const actor = this.parent;

    this.loadout = this._computeLoadout();
    this.load_level = this._computeLoadLevel(this.loadout);
    this.load_max = this._computeLoadMax(this.loadout);

    if (!actor) return;

    if (typeof actor.getComputedAttributes === "function") {
      this.attributes = actor.getComputedAttributes();
    }
    if (typeof actor.getMaxStress === "function") {
      this.stress.max = actor.getMaxStress();
    }
    if (typeof actor.getMaxTrauma === "function") {
      this.trauma.max = actor.getMaxTrauma();
    }
    if (typeof actor.getHealingMin === "function") {
      this.healing_clock.value = actor.getHealingMin();
    }
    if (typeof actor.getMaxKeys === "function" && typeof actor.getComputedKeys === "function") {
      
      
      const maxKeys = actor.getMaxKeys();
      const computedList = actor.getComputedKeys(maxKeys);
      this.keys.max = maxKeys;
      this.keys.list = computedList.map((slot) => ({
        ...slot,
        deadlockOptions: BladesHelpers.getDeadlockedKeysFor(slot.key)
      }));
    }
  }

  
  _computeLoadout() {
    const items = this.parent?.items;
    if (!items) return 0;
    let loadout = 0;
    for (const i of items) {
      if (i.type !== "item") continue;
      const load = parseInt(i.system?.load) || 0;
      if (i.system?.equipped) loadout += load;
      if (i.system?.bonus_equipped) loadout += load;
    }
    return Math.max(0, Math.min(11, loadout));
  }

  
  _computeLoadLevel(loadout) {
    const { arr, idx } = this._loadLevelArray(loadout);
    return arr[idx];
  }

  
  _computeLoadMax(loadout) {
    const { arr, idx } = this._loadLevelArray(loadout);
    const tier = arr[idx];
    let max = idx;
    for (let i = idx; i < arr.length; i++) {
      if (arr[i] !== tier) break;
      max = i;
    }
    return max;
  }

  
  _loadLevelArray(loadout) {
    let deepCut = false;
    try {
      deepCut = Boolean(game.settings?.get("blades68", "DeepCutLoad"));
    } catch (err) {
      deepCut = false;
    }

    const load_level = deepCut
      ? ["BITD.Discreet", "BITD.Discreet", "BITD.Discreet", "BITD.Discreet", "BITD.Discreet", "BITD.Conspicuous", "BITD.Conspicuous", "BITD.Encumbered", "BITD.Encumbered", "BITD.Encumbered", "BITD.OverMax", "BITD.OverMax"]
      : ["BITD.Light", "BITD.Light", "BITD.Light", "BITD.Light", "BITD.Normal", "BITD.Normal", "BITD.Heavy", "BITD.Encumbered", "BITD.Encumbered", "BITD.Encumbered", "BITD.OverMax", "BITD.OverMax"];
    const mule_level = deepCut
      ? ["BITD.Discreet", "BITD.Discreet", "BITD.Discreet", "BITD.Discreet", "BITD.Discreet", "BITD.Discreet", "BITD.Discreet", "BITD.Conspicuous", "BITD.Conspicuous", "BITD.Encumbered", "BITD.Encumbered", "BITD.OverMax"]
      : ["BITD.Light", "BITD.Light", "BITD.Light", "BITD.Light", "BITD.Light", "BITD.Light", "BITD.Normal", "BITD.Normal", "BITD.Heavy", "BITD.Encumbered", "BITD.OverMax", "BITD.OverMax"];

    const items = this.parent?.items;
    let mulePresent = false;
    if (items) {
      
      for (const i of items) {
        if (i.type === "ability" && i.name === "(C) Mule") {
          mulePresent = true;
          break;
        }
      }
    }
    const idx = Math.max(0, Math.min(11, loadout));
    return { arr: mulePresent ? mule_level : load_level, idx };
  }
}
