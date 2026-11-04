/**
 * Whether the page being edited has changes that haven't been saved. The edit form
 * sets it; anything that would leave the page (the Previous and Next arrows, for
 * one) asks first.
 */
let unsaved = false;

export const UNSAVED_MESSAGE = "You have changes that haven't been saved. Leave without saving?";

export function setUnsaved(value: boolean) {
  unsaved = value;
}

export const hasUnsaved = () => unsaved;

/** True when it's fine to leave: nothing is unsaved, or the owner says to leave anyway. */
export function confirmLeave(): boolean {
  return !unsaved || window.confirm(UNSAVED_MESSAGE);
}

/** A comparable picture of what a form currently holds. Files are compared by name. */
export function formSnapshot(form: HTMLFormElement): string {
  return [...new FormData(form).entries()]
    .map(([key, value]) => `${key}=${typeof value === "string" ? value : value.name}`)
    .join("\u0001");
}
