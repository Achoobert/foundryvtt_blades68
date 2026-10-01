import { attachExistingImportedImages } from "./pdf-import/attach-existing-images.js";

export const registerSystemSettings = function () {
  game.settings.register("blades68", "Blades68Mode", {
    name: game.i18n.localize("BITD.Settings.Blades68.Name"),
    hint: game.i18n.localize("BITD.Settings.Blades68.Hint"),
    config: true,
    scope: "world",
    type: String,
    choices: {
      bitd: game.i18n.localize("BITD.Settings.Blades68.BladesInTheDark"),
      blades68: game.i18n.localize("BITD.Settings.Blades68.Blades68"),
      imported: game.i18n.localize("BITD.Settings.Blades68.ImportedOnly"),
    },
    default: "blades68",
    requiresReload: true,
  });

  game.settings.register("blades68", "ShowKeys", {
    name: game.i18n.localize("BITD.Settings.ShowKeys.Name"),
    hint: game.i18n.localize("BITD.Settings.ShowKeys.Hint"),
    config: true,
    default: true,
    scope: "world",
    type: new foundry.data.fields.BooleanField(),
    requiresReload: true,
  });

  game.settings.register("blades68", "SheetTheme", {
    name: game.i18n.localize("BITD.Settings.SheetTheme.Name"),
    hint: game.i18n.localize("BITD.Settings.SheetTheme.Hint"),
    config: true,
    scope: "world",
    type: String,
    choices: {
      classic: game.i18n.localize("BITD.Settings.SheetTheme.Classic"),
      light: game.i18n.localize("BITD.Settings.SheetTheme.Light"),
      dark: game.i18n.localize("BITD.Settings.SheetTheme.Dark"),
    },
    default: "classic",
    onChange: () => {
      for (const app of Object.values(ui.windows).concat(
        Array.from(foundry.applications.instances?.values?.() ?? []),
      )) {
        const el = app.element;
        const hasBlades68Class =
          el?.classList?.contains?.("blades68") ?? el?.hasClass?.("blades68");
        if (hasBlades68Class) app.render(false);
      }
    },
  });

  game.settings.register("blades68", "SheetBackgroundColor", {
    name: game.i18n.localize("BITD.Settings.SheetBackgroundColor.Name"),
    hint: game.i18n.localize("BITD.Settings.SheetBackgroundColor.Hint"),
    config: true,
    scope: "world",
    type: new foundry.data.fields.ColorField({ initial: "#e9e4ce" }),
    onChange: applySheetBackgroundColor,
  });

  game.settings.register("blades68", "SheetBackgroundOpacity", {
    name: game.i18n.localize("BITD.Settings.SheetBackgroundOpacity.Name"),
    hint: game.i18n.localize("BITD.Settings.SheetBackgroundOpacity.Hint"),
    config: true,
    scope: "world",
    type: Number,
    range: { min: 0, max: 1, step: 0.05 },
    default: 0.75,
    onChange: applySheetBackgroundColor,
  });

  game.settings.register("blades68", "PipIconStyle", {
    name: game.i18n.localize("BITD.Settings.PipIconStyle.Name"),
    hint: game.i18n.localize("BITD.Settings.PipIconStyle.Hint"),
    config: true,
    scope: "world",
    type: String,
    choices: {
      pill: game.i18n.localize("BITD.Settings.PipIconStyle.Pill"),
      sharp: game.i18n.localize("BITD.Settings.PipIconStyle.Sharp"),
    },
    default: "pill",
    onChange: () => {
      for (const app of Object.values(ui.windows).concat(
        Array.from(foundry.applications.instances?.values?.() ?? []),
      )) {
        const el = app.element;
        const hasBlades68Class =
          el?.classList?.contains?.("blades68") ?? el?.hasClass?.("blades68");
        if (hasBlades68Class) app.render(false);
      }
    },
  });
  game.settings.register("bitd", "systemMigrationVersion", {
    name: "System Migration Version",
    scope: "world",
    config: false,
    type: Number,
    default: 0,
  });

  game.settings.register("blades68", "tokenAutoRotateDefaultApplied", {
    scope: "world",
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register("blades68", "existingImagesImported", {
    scope: "world",
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register("blades68", "PauseAnimation", {
    name: game.i18n.localize("BITD.Settings.PauseAnimation.Name"),
    hint: game.i18n.localize("BITD.Settings.PauseAnimation.Hint"),
    config: true,
    scope: "world",
    type: String,
    choices: {
      vhs: game.i18n.localize("BITD.Settings.PauseAnimation.VHS"),
      bluetime: game.i18n.localize("BITD.Settings.PauseAnimation.Bluetime"),
      vanilla: game.i18n.localize("BITD.Settings.PauseAnimation.Vanilla"),
      classic: game.i18n.localize("BITD.Settings.PauseAnimation.Classic"),
    },
    default: "bluetime",

    onChange: () => ui.pause?.render(),
  });

  game.settings.register("blades68", "GambitsMax", {
    name: game.i18n.localize("BITD.Settings.GambitsMax.Name"),
    hint: game.i18n.localize("BITD.Settings.GambitsMax.Hint"),
    config: true,
    scope: "world",
    type: Number,
    range: { min: 0, max: 12, step: 1 },
    default: 0,
  });

  game.settings.register("blades68", "ActionRoll", {
    name: game.i18n.localize("BITD.Settings.Action.Name"),
    hint: game.i18n.localize("BITD.Settings.Action.Hint"),
    config: true,
    default: true,
    scope: "world",
    type: new foundry.data.fields.BooleanField(),
    requiresReload: true,
  });

  game.settings.register("blades68", "ThreatRoll", {
    name: game.i18n.localize("BITD.Settings.Threat.Name"),
    hint: game.i18n.localize("BITD.Settings.Threat.Hint"),
    config: true,
    scope: "world",
    type: new foundry.data.fields.BooleanField(),
    requiresReload: true,
  });

  game.settings.register("blades68", "PushYourself", {
    name: game.i18n.localize("BITD.Settings.Push.Name"),
    hint: game.i18n.localize("BITD.Settings.Push.Hint"),
    config: true,
    scope: "world",
    type: new foundry.data.fields.BooleanField(),
    requiresReload: true,
  });

  game.settings.register("blades68", "DeepCutLoad", {
    name: game.i18n.localize("BITD.Settings.Load.Name"),
    hint: game.i18n.localize("BITD.Settings.Load.Hint"),
    config: true,
    scope: "world",
    type: new foundry.data.fields.BooleanField(),
    requiresReload: true,
  });

  game.settings.register("blades68", "ClockXP", {
    name: game.i18n.localize("BITD.Settings.ClockXP.Name"),
    hint: game.i18n.localize("BITD.Settings.ClockXP.Hint"),
    config: true,
    scope: "world",
    type: new foundry.data.fields.BooleanField(),
    requiresReload: true,
  });

  game.settings.register("blades68", "Edge", {
    name: game.i18n.localize("BITD.Settings.Edge.Name"),
    hint: game.i18n.localize("BITD.Settings.Edge.Hint"),
    config: true,
    scope: "world",
    type: new foundry.data.fields.BooleanField(),
    requiresReload: true,
  });

  game.settings.register("blades68", "PublicClocks", {
    name: game.i18n.localize("BITD.Settings.PublicClocks.Name"),
    hint: game.i18n.localize("BITD.Settings.PublicClocks.Hint"),
    config: true,
    scope: "world",
    type: new foundry.data.fields.BooleanField(),
    requiresReload: true,
  });
};

export function applySheetBackgroundColor() {
  const hex =
    game.settings.get("blades68", "SheetBackgroundColor") || "#382c93";
  const opacity =
    game.settings.get("blades68", "SheetBackgroundOpacity") ?? 0.9;
  const rgba = foundry.utils.Color.from(hex).toRGBA(opacity);
  document.documentElement.style.setProperty("--blades68-sheet-bg", rgba);
}

export function overrideTokenAutoRotateDefault() {
  const tokenAutoRotate = game.settings.settings.get("core.tokenAutoRotate");
  if (!tokenAutoRotate) return;
  tokenAutoRotate.default = false;
  if (tokenAutoRotate.type) tokenAutoRotate.type.initial = false;
}

export async function applyTokenAutoRotateDefault() {
  if (!game.user.isGM) return;
  if (!game.settings.settings.has("core.tokenAutoRotate")) return;
  if (game.settings.get("blades68", "tokenAutoRotateDefaultApplied")) return;
  await game.settings.set("core", "tokenAutoRotate", false);
  await game.settings.set("blades68", "tokenAutoRotateDefaultApplied", true);
}

export async function importExistingImagesOnce() {
  if (!game.user.isGM) return;
  if (game.settings.get("blades68", "existingImagesImported")) return;
  try {
    await attachExistingImportedImages();
  } catch (err) {
    console.error(
      "blades68 | Failed to import previously-uploaded faction/map images:",
      err,
    );
  }
  await game.settings.set("blades68", "existingImagesImported", true);
}
