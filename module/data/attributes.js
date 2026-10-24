/**
 * The three attributes and their four action ratings each, with the i18n keys
 * the sheet labels them by. This used to live in template.json and was read
 * back at runtime through `game.model.Actor.character.attributes`; template.json
 * is gone, so this constant is the single source of truth. defineSchema() builds
 * the `attributes` SchemaField from it, and BladesHelpers / the Token Action HUD
 * import it directly.
 */
export const ATTRIBUTES = {
  insight: {
    label: "BITD.SkillsInsight",
    skills: {
      hunt: "BITD.SkillsHunt",
      study: "BITD.SkillsStudy",
      survey: "BITD.SkillsSurvey",
      tinker: "BITD.SkillsTinker"
    }
  },
  prowess: {
    label: "BITD.SkillsProwess",
    skills: {
      finesse: "BITD.SkillsFinesse",
      prowl: "BITD.SkillsProwl",
      skirmish: "BITD.SkillsSkirmish",
      wreck: "BITD.SkillsWreck"
    }
  },
  resolve: {
    label: "BITD.SkillsResolve",
    skills: {
      attune: "BITD.SkillsAttune",
      command: "BITD.SkillsCommand",
      consort: "BITD.SkillsConsort",
      sway: "BITD.SkillsSway"
    }
  }
};
