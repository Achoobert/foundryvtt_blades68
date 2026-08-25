/**
 * NPCs record their class as plain text rather than owning a playbook item, so a
 * dropped playbook is only read for its name.
 */

/** The playbook name carried by a drag event, or null for any other drag payload. */
export async function resolveDroppedPlaybookName(event) {
  const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
  if (data?.type !== 'Item' || !data.uuid) return null;
  const item = await fromUuid(data.uuid);
  if (item?.type !== 'playbook') return null;
  return item.name;
}
