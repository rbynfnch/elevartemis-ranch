import type { Editor } from "@tiptap/react";
import { NodeSelection, Selection } from "@tiptap/pm/state";

/** The top-level block the cursor is in: where it starts and how big it is. Null in an empty document. */
export function currentBlock(editor: Editor): { pos: number; size: number; type: string } | null {
  const { selection, doc } = editor.state;
  let pos: number;
  if (selection instanceof NodeSelection && selection.$from.depth === 0) pos = selection.from;
  else if (selection.$from.depth >= 1) pos = selection.$from.before(1);
  else return null;
  const node = doc.nodeAt(pos);
  return node ? { pos, size: node.nodeSize, type: node.type.name } : null;
}

/** Where a new block should go: after the block being edited, or at the end. */
export function insertionPos(editor: Editor): number {
  const b = currentBlock(editor);
  if (!b) return editor.state.doc.content.size;
  const node = editor.state.doc.nodeAt(b.pos);
  // An empty paragraph is replaced by the new block rather than left behind.
  if (node?.type.name === "paragraph" && node.content.size === 0) return b.pos;
  return b.pos + b.size;
}

function select(editor: Editor, tr: ReturnType<Editor["state"]["tr"]["setSelection"]>, at: number) {
  const node = tr.doc.nodeAt(at);
  tr.setSelection(node && node.isAtom && !node.isText ? NodeSelection.create(tr.doc, at) : Selection.near(tr.doc.resolve(at + 1)));
  editor.view.dispatch(tr.scrollIntoView());
  editor.view.focus();
}

export function moveBlock(editor: Editor, dir: -1 | 1): boolean {
  const b = currentBlock(editor);
  if (!b) return false;
  const { doc, tr } = editor.state;
  const node = doc.nodeAt(b.pos)!;
  if (dir < 0) {
    const prev = doc.resolve(b.pos).nodeBefore;
    if (!prev) return false;
    tr.delete(b.pos, b.pos + b.size).insert(b.pos - prev.nodeSize, node);
    select(editor, tr, b.pos - prev.nodeSize);
  } else {
    const next = doc.nodeAt(b.pos + b.size);
    if (!next) return false;
    tr.delete(b.pos, b.pos + b.size).insert(b.pos + next.nodeSize, node);
    select(editor, tr, b.pos + next.nodeSize);
  }
  return true;
}

export function duplicateBlock(editor: Editor) {
  const b = currentBlock(editor);
  if (!b) return;
  const { doc, tr } = editor.state;
  const node = doc.nodeAt(b.pos)!;
  tr.insert(b.pos + b.size, node.copy(node.content));
  select(editor, tr, b.pos + b.size);
}

export function deleteBlock(editor: Editor) {
  const b = currentBlock(editor);
  if (!b) return;
  const tr = editor.state.tr.delete(b.pos, b.pos + b.size);
  editor.view.dispatch(tr);
  editor.view.focus();
}

/** What the block at the cursor is, as one value for the "Style" menu. */
export function blockStyle(editor: Editor): string {
  if (editor.isActive("heading", { level: 2 })) return "h2";
  if (editor.isActive("heading", { level: 3 })) return "h3";
  if (editor.isActive("heading", { level: 4 })) return "h4";
  if (editor.isActive("smallText")) return "small";
  if (editor.isActive("pullquote")) return "pull";
  if (editor.isActive("blockquote")) return "quote";
  if (editor.isActive("bulletList")) return "bullets";
  if (editor.isActive("orderedList")) return "numbers";
  if (editor.isActive("callout")) return "callout";
  return "p";
}

export function applyStyle(editor: Editor, value: string) {
  const c = editor.chain().focus();
  // Leave lists/quotes first so styles do not stack.
  if (editor.isActive("bulletList")) c.toggleBulletList();
  if (editor.isActive("orderedList")) c.toggleOrderedList();
  if (editor.isActive("blockquote")) c.toggleBlockquote();
  if (editor.isActive("callout")) c.lift("callout");
  switch (value) {
    case "p":
      return c.setParagraph().run();
    case "h2":
    case "h3":
    case "h4":
      return c.setNode("heading", { level: Number(value[1]) }).run();
    case "small":
      return c.setNode("smallText").run();
    case "pull":
      return c.setNode("pullquote").run();
    case "quote":
      return c.setParagraph().toggleBlockquote().run();
    case "bullets":
      return c.setParagraph().toggleBulletList().run();
    case "numbers":
      return c.setParagraph().toggleOrderedList().run();
    case "callout":
      return c.setParagraph().wrapIn("callout", { tone: "info" }).run();
  }
}
