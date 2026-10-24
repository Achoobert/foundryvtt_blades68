/**
 * Shared "Number of Dice" picker: a row of buttons showing the absolute dice
 * pool instead of a modifier dropdown. The starting value is underlined so it
 * stays visible after something else moves the selection.
 */

/** Highest dice pool the picker ever offers. */
export const MAX_DICE = 6;

/**
 * @param {Object} options
 * @param {number} options.base - Starting pool; rendered underlined and preselected.
 * @param {string} [options.name="qty"] - Name of the hidden input carrying the value.
 * @param {number} [options.max] - Highest selectable value. Defaults to `MAX_DICE`
 * and is capped there, since a pool never goes above 6.
 * @returns {string} HTML for a `.form-group` holding the hidden input and the row.
 */
export function buildDiceRowHtml({ base = 0, name = "qty", max } = {}) {
  const maxDice = Math.min(MAX_DICE, Number.isFinite(max) ? max : MAX_DICE);
  const cells = Array.from({ length: maxDice + 1 }, (item, i) => {
    const classes = ["bitd-dice-count"];
    if (i === base) classes.push("is-base");
    if (i === 0) classes.push("is-zero");
    return `<button type="button" class="${classes.join(" ")}" data-dice="${i}">${i}</button>`;
  }).join("");

  return `
          <div class="form-group bitd-dice-pool">
            <label>${game.i18n.localize("BITD.RollNumberOfDice")}:</label>
            <input type="hidden" name="${name}" value="${base}">
            <div class="bitd-dice-row" data-base="${base}" data-max="${maxDice}" data-input="${name}">${cells}</div>
          </div>`;
}

/**
 * Wire up a row built by {@link buildDiceRowHtml}.
 *
 * @param {HTMLElement} form
 * @param {(pool: number, base: number) => void} [onChange] - Called whenever the
 * pool changes, e.g. to keep a separate modifier input in sync.
 * @returns {{ setPool: (value: number) => void, adjustPool: (delta: number) => void }}
 * No-ops if the form has no dice row.
 */
export function wireDiceRow(form, onChange) {
  const row = form?.querySelector?.(".bitd-dice-row");
  if (!row) return { setPool: () => {}, adjustPool: () => {} };

  const base = Number(row.dataset.base) || 0;
  const max = Number(row.dataset.max) || MAX_DICE;
  const input = form.querySelector(`[name="${row.dataset.input}"]`);
  const cells = Array.from(row.querySelectorAll(".bitd-dice-count"));
  let selected = base;

  const setPool = (value) => {
    selected = Math.max(0, Math.min(max, value));
    cells.forEach((cell) =>
      cell.classList.toggle(
        "is-selected",
        Number(cell.dataset.dice) === selected,
      ),
    );
    if (input) input.value = String(selected);
    if (typeof onChange === "function") onChange(selected, base);
  };

  cells.forEach((cell) => {
    cell.addEventListener("click", () => setPool(Number(cell.dataset.dice)));
  });
  setPool(base);

  return { setPool, adjustPool: (delta) => setPool(selected + delta) };
}
