/**
 * ProseMirror editors are rendered as `<prose-mirror>` elements via `{{formInput}}`.
 * A toggled editor shows enriched HTML (content links, secrets, inline rolls) while
 * closed, so sheets have to pre-enrich every HTMLField before rendering.
 */

const { fields } = foundry.data;

/**
 * Enriched HTML for every HTMLField in a document's system schema, keyed by the
 * field path relative to `system` (e.g. `notes`, `huntingGrounds.description`).
 */
export async function enrichSystemHtml(document) {
  const TextEditorImpl = foundry.applications.ux.TextEditor.implementation;
  const enriched = {};

  const walk = async (schema, prefix) => {
    for (const [name, field] of Object.entries(schema.fields)) {
      const path = prefix ? `${prefix}.${name}` : name;
      if (field instanceof fields.HTMLField) {
        enriched[path] = await TextEditorImpl.enrichHTML(
          foundry.utils.getProperty(document.system, path) ?? '',
          {
            relativeTo: document,
            rollData: document.getRollData?.() ?? {},
            secrets: document.isOwner
          }
        );
      } else if (field instanceof fields.SchemaField) {
        await walk(field, path);
      }
    }
  };

  await walk(document.system.schema, '');
  return enriched;
}
