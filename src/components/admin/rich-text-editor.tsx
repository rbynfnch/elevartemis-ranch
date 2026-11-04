"use client";

import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import clsx from "clsx";
import { richTextIsEmpty } from "@/lib/content/empty";
import { safeHref } from "@/lib/content/rich-text";

function ToolButton({
  label,
  active,
  onClick,
  children,
  disabled,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} // keep the cursor where it is
      onClick={onClick}
      className={clsx(
        "inline-flex min-h-11 min-w-11 items-center justify-center px-2 text-sm font-semibold",
        active ? "bg-primary text-on-primary" : "hover:bg-surface",
        disabled && "opacity-40",
      )}
    >
      {children}
    </button>
  );
}

/**
 * A small writing box: bold, italic, two heading sizes, bullet and numbered lists, a quotation and links.
 * It produces exactly what the site knows how to show (see lib/content/rich-text.tsx) and nothing more,
 * so what you see while writing is what visitors get.
 */
export function RichTextEditor({
  id,
  label,
  value,
  onChange,
  minHeight = "12rem",
  hint,
}: {
  id: string;
  label: string;
  value: unknown;
  /** Called with the document, or null when it is empty. */
  onChange: (doc: JSONContent | null) => void;
  minHeight?: string;
  hint?: string;
}) {
  const editor = useEditor({
    immediatelyRender: false, // the page is first built on the server
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        // Only what the site can show.
        code: false,
        codeBlock: false,
        strike: false,
        horizontalRule: false,
        underline: false,
        link: { openOnClick: false, autolink: true, protocols: ["https", "http", "mailto", "tel"] },
      }),
    ],
    content: richTextIsEmpty(value) ? "" : (value as JSONContent),
    editorProps: {
      attributes: {
        id,
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": label,
        class: "prose-ranch focus:outline-none",
        style: `min-height:${minHeight}`,
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? null : e.getJSON()),
  });

  if (!editor) {
    return <div className="border border-rule bg-white" style={{ minHeight }} aria-busy="true" />;
  }

  function setLink() {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const typed = window.prompt(
      "Where should the link go? (a web address starting with https://)",
      previous ?? "https://",
    );
    if (typed === null) return;
    if (typed.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    const href = safeHref(typed.trim());
    if (!href || href.startsWith("#")) {
      window.alert("That doesn't look like a web address. Start it with https://");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }

  const chain = () => editor.chain().focus();
  return (
    <div className="border border-rule bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25">
      <div
        role="toolbar"
        aria-label={`${label} formatting`}
        className="flex flex-wrap border-b border-rule bg-surface/60"
      >
        <ToolButton label="Bold" active={editor.isActive("bold")} onClick={() => chain().toggleBold().run()}>
          <strong>B</strong>
        </ToolButton>
        <ToolButton label="Italic" active={editor.isActive("italic")} onClick={() => chain().toggleItalic().run()}>
          <em>I</em>
        </ToolButton>
        <ToolButton
          label="Large heading"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => chain().toggleHeading({ level: 2 }).run()}
        >
          H2
        </ToolButton>
        <ToolButton
          label="Small heading"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => chain().toggleHeading({ level: 3 }).run()}
        >
          H3
        </ToolButton>
        <ToolButton
          label="Bulleted list"
          active={editor.isActive("bulletList")}
          onClick={() => chain().toggleBulletList().run()}
        >
          •&nbsp;List
        </ToolButton>
        <ToolButton
          label="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => chain().toggleOrderedList().run()}
        >
          1.&nbsp;List
        </ToolButton>
        <ToolButton
          label="Quotation"
          active={editor.isActive("blockquote")}
          onClick={() => chain().toggleBlockquote().run()}
        >
          “ ”
        </ToolButton>
        <ToolButton label="Link" active={editor.isActive("link")} onClick={setLink}>
          Link
        </ToolButton>
        <span className="mx-1 hidden w-px self-stretch bg-rule sm:block" aria-hidden="true" />
        <ToolButton label="Undo" disabled={!editor.can().undo()} onClick={() => chain().undo().run()}>
          ↶
        </ToolButton>
        <ToolButton label="Redo" disabled={!editor.can().redo()} onClick={() => chain().redo().run()}>
          ↷
        </ToolButton>
      </div>
      <EditorContent editor={editor} className="px-4 py-3" />
      {hint ? <p className="border-t border-rule px-4 py-2 text-sm text-ink-muted">{hint}</p> : null}
    </div>
  );
}
