import { BladesHelpers } from "../blades-helpers.js";

const { fields } = foundry.data;

/**
 * System DataModel for the Actor type "character".
 *
 * Field shapes are lifted verbatim from template.json's Actor.character
 * block (read before writing this file) so existing actors round-trip
 * without data loss. A few fields need call-outs:
 *
 * - `stress.value` / `trauma.value` / `healing_clock.value` / `experience` /
 *   `coins` / `coins_stashed` are ArrayField(NumberField) even though the
 *   dot-tracker radio inputs that drive them (see the `multiboxes` Handlebars
 *   helper in module/blades.js) submit a bare scalar with no array index in
 *   the input `name` -- ArrayField's `_cast` auto-wraps a submitted scalar
 *   into a single-element array, which is exactly the legacy `[0]` shape
 *   template.json stores. `edge.value` is a plain NumberField instead
 *   because template.json's default for it is a bare `0`, not `[0]`.
 * - `description` is not present in template.json at all (the old loose
 *   schema let the Notes-tab textarea write an arbitrary extra key), but
 *   the template binds `system.description` directly, so it needs a real
 *   field here or a strict DataModel would silently drop it on save.
 * - `unique-data`'s eleven playbook-keyed blobs are written out field-for-
 *   field rather than as a generic ObjectField so nothing in
 *   templates/parts/unique-data.html can silently stop persisting.
 */
export class CharacterData extends foundry.abstract.TypeDataModel {
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
      // ---- Header / identity ----
      alias: str(),
      pronouns: str(),
      look: str(),
      heritage: str(), // legacy -- now really tracked via an owned Item type=heritage
      background: str(),
      "background-details": str(),
      vice: str(),
      "vice-purveyor": str(),
      playbook: str(), // legacy -- now really tracked via an owned Item type=class
      description: str(), // Notes tab; not in template.json historically, see class doc comment

      // ---- Crew link ----
      // Only system.crew[0] is ever actually used (see BladesActor#_getCrewActor).
      crew: new fields.ArrayField(new fields.ObjectField(), { required: true, initial: [] }),

      // ---- Optional Edge attribute (gated by the 'Edge' game setting) ----
      edge: new fields.SchemaField({
        value: num(0),
        max: num(1)
      }),

      // ---- Acquaintances / contacts ----
      // Free-shape objects (id, name, type, standing, description_short, ...) --
      // an ObjectField per entry preserves legacy data exactly, including the
      // occasional stray `_id` key referenced by BladesHelpers.removeAcquaintance.
      acquaintances: new fields.ArrayField(new fields.ObjectField(), { required: true, initial: [] }),
      acquaintances_label: str("BITD.Acquaintances"),

      // ---- Stress / Trauma ----
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

      // ---- Keys / Deadlocks ----
      // Raw storage only -- BladesActor#getComputedKeys()/getMaxKeys() own the
      // marks->experience / boomed->deadlocked migration and slot padding;
      // this DataModel's prepareDerivedData() below calls straight into them
      // rather than re-implementing that logic a second time.
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

      // ---- Healing ----
      "healing-clock": numArray([0]), // legacy, unused alt field -- kept so old data round-trips
      healing_clock: new fields.SchemaField({
        value: numArray([0]),
        max: num(4),
        min: num(0)
      }),

      // ---- Experience ----
      experience: numArray([0]), // single-clock XP tracker, used only when 'ClockXP' setting is OFF
      experience_max: num(8),
      experience_clues: new fields.ArrayField(new fields.StringField({ required: true, blank: true }), {
        required: true,
        initial: ["BITD.ClassExpClue3", "BITD.ClassExpClue2"]
      }),
      exp_clock: new fields.SchemaField({
        // used only when 'ClockXP' setting is ON
        value: num(0),
        number: num(0),
        size: num(6),
        color: str("black")
      }),

      // ---- Coin ----
      coins: numArray([0]),
      coins_stashed: numArray([0]),
      coins_max: new fields.SchemaField({
        hand: num(4),
        stash: num(40)
      }),

      // ---- Abilities (legacy) / Loadout ----
      special_abilities: new fields.ArrayField(new fields.ObjectField(), { required: true, initial: [] }), // legacy, superseded by owned Item type=ability
      loadout: num(0), // derived every prepareDerivedData() from equipped items' load, see below
      load_level: str(), // derived localization key, depends on 'DeepCutLoad' setting
      selected_load_level: str(), // dropdown preference only, not used in load calc
      base_max_load: num(0), // present in schema, unreferenced by any sheet JS -- dead field kept for round-trip safety

      // ---- Harm / Armor ----
      harm: new fields.SchemaField({
        light: new fields.SchemaField({ one: str(), two: str() }),
        medium: new fields.SchemaField({ one: str(), two: str() }),
        heavy: new fields.SchemaField({ one: str() }),
        deadly: new fields.SchemaField({ one: str() })
      }),
      "armor-uses": new fields.SchemaField({
        armor: bool(false),
        heavy: bool(false), // present in schema, unused in template
        special: bool(false),
        special_2: bool(false)
      }),

      // ---- Attributes / Skills ----
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

      // ---- Per-playbook unique data blocks ----
      // Only rendered when the equipped class's name maps through the
      // PLAYBOOK_UNIQUE table in blades-actor-sheet.js; every key is kept
      // here regardless of which class is equipped so switching class (or a
      // homebrew re-equip) never loses previously-entered data.
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

  /* -------------------------------------------- */

  /**
   * Only the pieces of the legacy getData() that are intrinsic to this
   * actor's own fields + owned items (loadout/load_level) are computed
   * here. Everything that also depends on a linked Crew actor (stress/
   * trauma max, healing minimum, Key slot count/list, the Mastery skill-max
   * bump) is delegated straight to the existing BladesActor methods rather
   * than re-implemented a second time -- those methods are also called
   * directly by module/blades-helpers.js's Key/deadlock popups, and having
   * two independent copies of that normalization logic drifting apart is
   * exactly the "silent data loss" risk called out for this migration.
   * View-only concerns that need async work (compendium catalog lookups,
   * enrichHTML) still live on the sheet's _prepareContext(), matching the
   * BladesClockSheet/BladesNPCSheet precedent.
   */
  prepareDerivedData() {
    const actor = this.parent;

    this.loadout = this._computeLoadout();
    this.load_level = this._computeLoadLevel(this.loadout);

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
      // Compute both off the *raw* max/list before overwriting either, so
      // getComputedKeys()'s internal getMaxKeys() call doesn't see an
      // already-bonused max and double-count the crew's bonus_keys.
      const maxKeys = actor.getMaxKeys();
      const computedList = actor.getComputedKeys();
      this.keys.max = maxKeys;
      this.keys.list = computedList.map((slot) => ({
        ...slot,
        deadlockOptions: BladesHelpers.getDeadlockedKeysFor(slot.key)
      }));
    }
  }

  /* -------------------------------------------- */

  /**
   * Sum of equipped/bonus-equipped owned Items' `load`, clamped 0-11.
   * Mirrors the legacy BladesActorSheet#getData() loop exactly.
   */
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

  /**
   * Encumbrance level localization key for a given loadout value. Depends on
   * the 'DeepCutLoad' game setting (Discreet/Conspicuous vs Light/Normal/
   * Heavy scales) and on whether the actor owns the "(C) Mule" ability
   * (English-name string match, a known pre-existing localization bug --
   * preserved as-is, see the legacy //@todo comment in blades-actor-sheet.js).
   */
  _computeLoadLevel(loadout) {
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
      // @todo fix translation -- literal English name match, same bug as legacy code.
      for (const i of items) {
        if (i.type === "ability" && i.name === "(C) Mule") {
          mulePresent = true;
          break;
        }
      }
    }
    const idx = Math.max(0, Math.min(11, loadout));
    return mulePresent ? mule_level[idx] : load_level[idx];
  }
}
