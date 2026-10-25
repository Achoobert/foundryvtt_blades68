import { ItemSheetV2 } from "./blades-item-sheet-v2.js";

/**
 * Concrete Item sheet, registered (with no `types` filter) for every one of
 * the system's 15 Item sub-types -- see module/blades.js's
 * `registerItemSheet("blades", BladesItemSheet, { makeDefault: true })`.
 *
 * All the actual per-type behavior (template dispatch, active-effect
 * dispatch, faction goal-clock rendering, cohort/turf context wiring) lives
 * on the shared ItemSheetV2 base, mirroring how BladesClockSheet sits on top
 * of BladesSheetV2 for actors.
 */
export class BladesItemSheet extends ItemSheetV2 {}
