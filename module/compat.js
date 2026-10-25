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


export function applyBladesThemeClasses(element) {
  if (!element) return;
  try {
    const theme = game.settings.get("blades68", "SheetTheme");
    element.classList.toggle("blades68-theme", theme === "classic");
    element.classList.toggle("blades68-theme-light", theme === "light");
    element.classList.toggle("blades68-theme-dark", theme === "dark");
  } catch (err) {  }
  try {
    element.classList.toggle("sharp-icons", game.settings.get("blades68", "PipIconStyle") === "sharp");
  } catch (err) {  }
}
