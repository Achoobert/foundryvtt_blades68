function normalizeFormData(form) {
  if (!form) return {};
  const formData = new FormData(form);
  const result = {};
  for (const [key, value] of formData.entries()) {
    if (key in result) {
      if (Array.isArray(result[key])) {
        result[key].push(value);
      } else {
        result[key] = [result[key], value];
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Open a Foundry Application V2 "DialogV2" dialog. The content should
 * include a `<form>` element so its values can be serialized and returned
 * to the caller.
 *
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.content  - HTML rendered inside the dialog window
 * @param {string} options.okLabel
 * @param {string} [options.cancelLabel]
 * @param {string} [options.okIcon="fas fa-check"]
 * @param {string} [options.cancelIcon="fas fa-times"]
 * @param {"ok"|"cancel"} [options.defaultButton="ok"]
 * @param {boolean} [options.hideOkButton=false] - Keep the "ok" button wired
 * up (so its callback still serializes the form) but visually hide it. Use
 * this when the dialog content provides its own submit controls and calls
 * the `submit` function passed to `onRender` instead of a footer button.
 * @param {(form: HTMLElement, submit: () => void) => void} [options.onRender]
 * - Called once the dialog's DOM is available, with the `<form>` element and
 * a `submit()` helper that triggers the same resolution the (possibly
 * hidden) "ok" button would.
 * @param {Object} [options.window]
 * @returns {Promise<object|undefined>} Serialized form values or `undefined`
 * if the dialog was canceled/closed.
 */
export async function openFormDialog({
  title,
  content,
  okLabel,
  cancelLabel,
  okIcon = "fas fa-check",
  cancelIcon = "fas fa-times",
  defaultButton = "ok",
  hideOkButton = false,
  onRender,
  window: windowOptions = {},
} = {}) {
  if (!title) throw new Error("openFormDialog requires a title");
  if (!content) throw new Error("openFormDialog requires dialog content");
  if (!okLabel) throw new Error("openFormDialog requires an okLabel");

  const { DialogV2 } = foundry.applications.api;

  const buttons = [
    {
      action: "ok",
      label: okLabel,
      icon: okIcon,
      default: defaultButton === "ok",
      callback: (event, button, dialog) => {
        const formElement =
          dialog.element?.querySelector("form") ||
          event.target?.closest("dialog")?.querySelector("form") ||
          document.querySelector("dialog[open] form");
        return normalizeFormData(formElement);
      },
    },
  ];

  if (cancelLabel) {
    buttons.push({
      action: "cancel",
      label: cancelLabel,
      icon: cancelIcon,
      default: defaultButton === "cancel",
      callback: () => undefined,
    });
  }

  if (hideOkButton || typeof onRender === "function") {
    Hooks.once("renderDialogV2", (app, html) => {
      const root = html instanceof HTMLElement ? html : (html?.[0] ?? app.element);
      const form = root?.querySelector?.("form") ?? root;
      const okButton = app.element?.querySelector?.('[data-action="ok"]');
      if (hideOkButton && okButton) okButton.style.display = "none";
      if (typeof onRender === "function") {
        onRender(form, () => okButton?.click());
      }
    });
  }

  const result = await DialogV2.wait({
    window: { title, ...windowOptions },
    content,
    buttons,
  });

  // Handle action string returns and close button
  if (result === undefined || result === "cancel" || result === null) {
    return undefined;
  }
  return result;
}
