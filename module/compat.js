export function getActorSheetClass() {
  return foundry.appv1.sheets.ActorSheet;
}

export function getItemSheetClass() {
  return foundry.appv1.sheets.ItemSheet;
}

export function unregisterActorSheet(namespace, sheetClass) {
  return foundry.applications.apps.DocumentSheetConfig.unregisterSheet(CONFIG.Actor.documentClass, namespace, sheetClass);
}

export function registerActorSheet(namespace, sheetClass, options) {
  return foundry.applications.apps.DocumentSheetConfig.registerSheet(CONFIG.Actor.documentClass, namespace, sheetClass, options);
}

export function unregisterItemSheet(namespace, sheetClass) {
  return foundry.applications.apps.DocumentSheetConfig.unregisterSheet(CONFIG.Item.documentClass, namespace, sheetClass);
}

export function registerItemSheet(namespace, sheetClass, options) {
  return foundry.applications.apps.DocumentSheetConfig.registerSheet(CONFIG.Item.documentClass, namespace, sheetClass, options);
}

export function loadHandlebarsTemplates(paths) {
  return foundry.applications.handlebars.loadTemplates(paths);
}

export function renderHandlebarsTemplate(...args) {
  return foundry.applications.handlebars.renderTemplate(...args);
}

export function enrichHTML(...args) {
  return foundry.applications.ux.TextEditor.implementation.enrichHTML(...args);
}

export function generateRandomId() {
  return foundry.utils.randomID();
}

/**
 * Toggles the world-setting-driven look classes ("blades68-theme",
 * "sharp-icons") on an ApplicationV2 sheet's root element. AppV2's
 * `this.element` is a plain HTMLElement (no jQuery), so this can't reuse
 * the legacy BladesSheet.activateListeners `toggleClass` calls.
 */
export function applyBladesThemeClasses(element) {
  if (!element) return;
  try {
    element.classList.toggle("blades68-theme", Boolean(game.settings.get("blades68", "Blades68Mode")));
  } catch (err) { /* not registered yet */ }
  try {
    element.classList.toggle("sharp-icons", game.settings.get("blades68", "PipIconStyle") === "sharp");
  } catch (err) { /* not registered yet */ }
}
