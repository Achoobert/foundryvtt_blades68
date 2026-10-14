// note that this just creats help-text,
// NOT automaing the xp gain
import { enrichHTML } from "./compat.js";

export const XP_TRIGGERS_JOURNAL_NAME = "XP Triggers";

export const XP_TRIGGERS_PAGES = {
  character: "Character",
  crew: "Crew",
};

export const XP_TRIGGERS_PLACEHOLDER = "{{experience_clues}}";

function defaultCharacterHtml() {
  const clue1 = game.i18n.localize("BITD.ClassExpClue1");
  const clue2 = game.i18n.localize("BITD.ClassExpClue2");
  const clue3 = game.i18n.localize("BITD.ClassExpClue3");
  const description = game.i18n.localize("BITD.ClassExpClueDescription");
  return [
    "<ul>",
    `<li>${clue1}</li>`,
    `<li>${clue2}</li>`,
    "</ul>",
    `<p>${description}</p>`,
    "<ul>",
    `<li><i>${XP_TRIGGERS_PLACEHOLDER}</i></li>`,
    `<li><i>${clue3}</i></li>`,
    "</ul>",
  ].join("\n");
}

function defaultCrewHtml() {
  const description = game.i18n.localize("BITD.CrewExpClue1");
  return [
    `<p>${description}</p>`,
    "<ul>",
    `<li>${XP_TRIGGERS_PLACEHOLDER}</li>`,
    "</ul>",
  ].join("\n");
}

function isEnabled() {
  try {
    return Boolean(game.settings.get("blades68", "CustomXpTriggers"));
  } catch (err) {
    return false;
  }
}

export async function ensureXpTriggersJournal() {
  if (!game.user.isGM) return null;

  const existing = game.journal.getName(XP_TRIGGERS_JOURNAL_NAME);
  if (existing) return existing;

  const JournalEntryClass = foundry.documents?.JournalEntry ?? JournalEntry;

  try {
    return await JournalEntryClass.create({
      name: XP_TRIGGERS_JOURNAL_NAME,
      pages: [
        {
          name: XP_TRIGGERS_PAGES.character,
          type: "text",
          title: { show: true, level: 1 },
          text: { content: defaultCharacterHtml(), format: 1 },
        },
        {
          name: XP_TRIGGERS_PAGES.crew,
          type: "text",
          title: { show: true, level: 1 },
          text: { content: defaultCrewHtml(), format: 1 },
        },
      ],
    });
  } catch (err) {
    console.error("blades68 | Failed to create the XP Triggers journal:", err);
    return null;
  }
}

function nl2br(text) {
  return String(text ?? "").replace(/\n/g, "<br />");
}

function substituteClues(content, cluesHtml) {
  const clues = nl2br(cluesHtml).trim();
  if (clues) return content.split(XP_TRIGGERS_PLACEHOLDER).join(clues);

  const placeholder = XP_TRIGGERS_PLACEHOLDER.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
  const emptyLine = new RegExp(
    `<(li|p)\\b[^>]*>(?:\\s|<[^>]+>)*${placeholder}(?:\\s|<[^>]+>)*</\\1>`,
    "gi",
  );
  return content.replace(emptyLine, "").split(XP_TRIGGERS_PLACEHOLDER).join("");
}

export async function getXpTriggerHtml(kind, cluesHtml) {
  if (!isEnabled()) return null;

  try {
    const pageName = XP_TRIGGERS_PAGES[kind];
    if (!pageName) return null;

    const journal = game.journal?.getName?.(XP_TRIGGERS_JOURNAL_NAME);
    if (!journal) return null;

    const page = journal.pages.find((p) => p.name === pageName);
    const content = page?.text?.content;
    if (!content) return null;

    return await enrichHTML(substituteClues(content, cluesHtml), {
      secrets: false,
      async: true,
    });
  } catch (err) {
    console.error("blades68 | Failed to render custom XP triggers:", err);
    return null;
  }
}

export function rerenderBlades68Sheets() {
  for (const app of Object.values(ui.windows).concat(
    Array.from(foundry.applications.instances?.values?.() ?? []),
  )) {
    const el = app.element;
    const hasBlades68Class =
      el?.classList?.contains?.("blades68") ?? el?.hasClass?.("blades68");
    if (hasBlades68Class) app.render(false);
  }
}

export function registerXpTriggerHooks() {
  const onJournalChange = (doc) => {
    if (!isEnabled()) return;
    const journalName = doc?.parent?.name ?? doc?.name;
    if (journalName !== XP_TRIGGERS_JOURNAL_NAME) return;
    rerenderBlades68Sheets();
  };

  Hooks.on("updateJournalEntryPage", onJournalChange);
  Hooks.on("createJournalEntryPage", onJournalChange);
  Hooks.on("deleteJournalEntryPage", onJournalChange);
  Hooks.on("updateJournalEntry", onJournalChange);
}
