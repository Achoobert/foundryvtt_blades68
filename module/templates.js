export default async function preloadHandlebarsTemplates() {
  return foundry.applications.handlebars.loadTemplates([
    'systems/blades68/templates/partials/dot-track.hbs',
    'systems/blades68/templates/partials/clock-svg.hbs',
    'systems/blades68/templates/partials/character-common.hbs'
  ]);
}
