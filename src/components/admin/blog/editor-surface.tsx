"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useEditor, EditorContent, type Editor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import clsx from "clsx";
import { readingMinutes, plainText, type Doc } from "@/lib/blog/content";
import { PhotoChooser } from "@/components/admin/banners/photo-chooser";
import { CalloutView, CtaView, GalleryView, ImageView, VideoView } from "./node-views";
import {
  Callout,
  CTA_DEFAULTS,
  GALLERY_DEFAULTS,
  IMAGE_DEFAULTS,
  Pullquote,
  SmallText,
  TextAlign,
  VIDEO_DEFAULTS,
  atomBlock,
} from "./extensions";
import { CtaDialog, LinkDialog, VideoDialog } from "./block-dialogs";
import { applyStyle, blockStyle, currentBlock, deleteBlock, duplicateBlock, insertionPos, moveBlock } from "./block-ops";

const extensions = [
  StarterKit.configure({
    heading: { levels: [2, 3, 4] },
    code: false,
    codeBlock: false,
    strike: false,
    link: { openOnClick: false, autolink: true, protocols: ["https", "http", "mailto", "tel"] },
  }),
  TextAlign,
  SmallText,
  Pullquote,
  Callout(CalloutView),
  atomBlock("image", IMAGE_DEFAULTS, ImageView),
  atomBlock("gallery", GALLERY_DEFAULTS, GalleryView),
  atomBlock("video", VIDEO_DEFAULTS, VideoView),
  atomBlock("cta", CTA_DEFAULTS, CtaView),
];

const prettyHtml = (html: string) =>
  html.replace(/(<\/(?:p|h2|h3|h4|ul|ol|li|blockquote|div)>|<hr>)/g, "$1\n").trim();

function Tool({ label, active, onClick, disabled, children }: { label: string; active?: boolean; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={clsx(
        "inline-flex min-h-10 min-w-10 items-center justify-center px-2 text-sm font-semibold",
        active ? "bg-primary text-on-primary" : "hover:bg-surface",
        disabled && "opacity-40",
      )}
    >
      {children}
    </button>
  );
}

/** Lets the "+" menu and the toolbar open the same pickers. */
function Bridge({ event, open }: { event: string; open: () => void }) {
  useEffect(() => {
    const h = () => open();
    window.addEventListener(`blog-insert:${event}`, h);
    return () => window.removeEventListener(`blog-insert:${event}`, h);
  }, [event, open]);
  return null;
}
const fire = (name: string) => window.dispatchEvent(new Event(`blog-insert:${name}`));

const TEXT_BLOCKS: { id: string; label: string }[] = [
  { id: "p", label: "Paragraph" },
  { id: "h2", label: "Large heading" },
  { id: "h3", label: "Medium heading" },
  { id: "h4", label: "Small heading" },
  { id: "small", label: "Small text" },
  { id: "pull", label: "Pull quote" },
  { id: "quote", label: "Quotation" },
  { id: "bullets", label: "Bulleted list" },
  { id: "numbers", label: "Numbered list" },
  { id: "callout", label: "Callout box" },
];

export function EditorSurface({
  initial,
  onChange,
  onWords,
}: {
  initial: Doc | null;
  onChange: (doc: JSONContent) => void;
  onWords?: (words: number, minutes: number) => void;
}) {
  const [html, setHtml] = useState<string | null>(null);
  const [dialog, setDialog] = useState<null | "video" | "cta" | "link">(null);
  const [bar, setBar] = useState<{ top: number; type: string } | null>(null);
  const [menu, setMenu] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: initial ?? { type: "doc", content: [{ type: "paragraph" }] },
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "Story",
        class: "blog-editor focus:outline-none",
      },
    },
    onUpdate: ({ editor: e }) => {
      onChange(e.getJSON());
      if (onWords) {
        const text = plainText(e.getJSON());
        onWords(text ? text.split(/\s+/).length : 0, readingMinutes(e.getJSON()));
      }
    },
  });

  // Keep the small block toolbar beside whichever block the cursor is in.
  useEffect(() => {
    if (!editor) return;
    const place = () => {
      const b = currentBlock(editor);
      const wrap = box.current;
      const dom = b ? (editor.view.nodeDOM(b.pos) as HTMLElement | null) : null;
      if (!b || !dom || !wrap || !dom.getBoundingClientRect) return setBar(null);
      setBar({ top: dom.getBoundingClientRect().top - wrap.getBoundingClientRect().top, type: b.type });
    };
    editor.on("selectionUpdate", place);
    editor.on("update", place);
    editor.on("focus", place);
    window.addEventListener("resize", place);
    return () => {
      editor.off("selectionUpdate", place);
      editor.off("update", place);
      editor.off("focus", place);
      window.removeEventListener("resize", place);
    };
  }, [editor]);

  useEffect(() => {
    const open = (name: "video" | "cta") => () => setDialog(name);
    const v = open("video");
    const c = open("cta");
    window.addEventListener("blog-insert:video", v);
    window.addEventListener("blog-insert:cta", c);
    return () => {
      window.removeEventListener("blog-insert:video", v);
      window.removeEventListener("blog-insert:cta", c);
    };
  }, []);

  if (!editor) return <div className="min-h-[24rem] border border-rule bg-white" aria-busy="true" />;

  const chain = () => editor.chain().focus();
  const put = (content: JSONContent) => editor.chain().focus().insertContentAt(insertionPos(editor), content).run();
  const insertText = (id: string) => {
    const pos = insertionPos(editor);
    editor.chain().focus().insertContentAt(pos, { type: "paragraph" }).setTextSelection(pos + 1).run();
    applyStyle(editor, id);
  };
  const addBelow = (act: () => void) => {
    setMenu(false);
    act();
  };
  const isImage = editor.isActive("image");

  return (
    <div className="border border-rule bg-white focus-within:border-primary">
      <div role="toolbar" aria-label="Formatting" className="sticky top-0 z-20 flex flex-wrap items-center border-b border-rule bg-surface">
        <label className="sr-only" htmlFor="blog-style">
          Text style
        </label>
        <select
          id="blog-style"
          value={blockStyle(editor)}
          disabled={isImage}
          onChange={(e) => applyStyle(editor, e.target.value)}
          className="m-1 min-h-10 border border-rule bg-white px-2 text-sm"
        >
          {TEXT_BLOCKS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
        <Tool label="Bold" active={editor.isActive("bold")} onClick={() => chain().toggleBold().run()}><strong>B</strong></Tool>
        <Tool label="Italic" active={editor.isActive("italic")} onClick={() => chain().toggleItalic().run()}><em>I</em></Tool>
        <Tool label="Underline" active={editor.isActive("underline")} onClick={() => chain().toggleUnderline().run()}><u>U</u></Tool>
        <Tool label="Link" active={editor.isActive("link")} onClick={() => setDialog("link")}>Link</Tool>
        <span className="mx-1 h-6 w-px bg-rule" aria-hidden="true" />
        {(["left", "center", "right"] as const).map((a) => (
          <Tool
            key={a}
            label={`Align ${a}`}
            active={editor.isActive({ textAlign: a })}
            onClick={() => chain().updateAttributes("paragraph", { textAlign: a }).updateAttributes("heading", { textAlign: a }).run()}
          >
            {a === "left" ? "⇤" : a === "center" ? "↔" : "⇥"}
          </Tool>
        ))}
        <span className="mx-1 h-6 w-px bg-rule" aria-hidden="true" />
        <Tool label="Divider line" onClick={() => put({ type: "horizontalRule" })}>―</Tool>
        <PhotoChooser
          label="Photo"
          onChoose={(p) => put({ type: "image", attrs: { ...IMAGE_DEFAULTS, mediaId: p.id, thumb: p.thumb } })}
          trigger={(open) => (
            <>
              <Tool label="Add a photo" onClick={open}>Photo</Tool>
              <Bridge event="photo" open={open} />
            </>
          )}
        />
        <PhotoChooser
          label="Gallery"
          onChooseMany={(ps) =>
            put({
              type: "gallery",
              attrs: { ...GALLERY_DEFAULTS, items: ps.map((p) => ({ mediaId: p.id, thumb: p.thumb, alt: "", caption: "" })) },
            })
          }
          trigger={(open) => (
            <>
              <Tool label="Add a photo gallery" onClick={open}>Gallery</Tool>
              <Bridge event="gallery" open={open} />
            </>
          )}
        />
        <Tool label="Add a video" onClick={() => setDialog("video")}>Video</Tool>
        <Tool label="Add a button" onClick={() => setDialog("cta")}>Button</Tool>
        <span className="mx-1 h-6 w-px bg-rule" aria-hidden="true" />
        <Tool label="Undo" disabled={!editor.can().undo()} onClick={() => chain().undo().run()}>↶</Tool>
        <Tool label="Redo" disabled={!editor.can().redo()} onClick={() => chain().redo().run()}>↷</Tool>
        <Tool
          label={html === null ? "Edit as HTML code" : "Back to the writing view"}
          active={html !== null}
          onClick={() => setHtml(html === null ? prettyHtml(editor.getHTML()) : null)}
        >
          {"</>"}
        </Tool>
      </div>

      {html !== null ? (
        <HtmlView
          value={html}
          onChange={setHtml}
          onApply={() => {
            editor.commands.setContent(html, { emitUpdate: true });
            setHtml(null);
          }}
          onCancel={() => setHtml(null)}
        />
      ) : (
        <div ref={box} className="relative px-6 py-5 sm:px-12">
          {bar ? (
            <div
              role="toolbar"
              aria-label="This block"
              style={{ top: Math.max(0, bar.top - 4) }}
              className="absolute left-1 z-10 flex flex-col border border-rule bg-white shadow-sm"
            >
              <div className="relative">
                <Tool label="Add a block below" onClick={() => setMenu((m) => !m)} active={menu}>＋</Tool>
                {menu ? (
                  <ul role="menu" className="absolute left-full top-0 z-30 ml-1 w-52 border border-rule bg-white py-1 shadow-md">
                    {TEXT_BLOCKS.map((b) => (
                      <li key={b.id} role="none">
                        <button role="menuitem" type="button" className="block min-h-10 w-full px-3 text-left text-sm hover:bg-surface" onClick={() => addBelow(() => insertText(b.id))}>
                          {b.label}
                        </button>
                      </li>
                    ))}
                    {[
                      ["photo", "Photo"],
                      ["gallery", "Gallery"],
                      ["video", "Video"],
                      ["cta", "Button"],
                    ].map(([id, label]) => (
                      <li key={id} role="none">
                        <button role="menuitem" type="button" className="block min-h-10 w-full px-3 text-left text-sm hover:bg-surface" onClick={() => addBelow(() => fire(id))}>
                          {label}
                        </button>
                      </li>
                    ))}
                    <li role="none">
                      <button role="menuitem" type="button" className="block min-h-10 w-full px-3 text-left text-sm hover:bg-surface" onClick={() => addBelow(() => put({ type: "horizontalRule" }))}>
                        Divider line
                      </button>
                    </li>
                  </ul>
                ) : null}
              </div>
              <Tool label="Move block up" onClick={() => moveBlock(editor, -1)}>↑</Tool>
              <Tool label="Move block down" onClick={() => moveBlock(editor, 1)}>↓</Tool>
              <Tool label="Duplicate block" onClick={() => duplicateBlock(editor)}>⧉</Tool>
              <Tool label="Delete block" onClick={() => deleteBlock(editor)}>🗑</Tool>
            </div>
          ) : null}
          <EditorContent editor={editor} />
        </div>
      )}

      {dialog === "video" ? (
        <VideoDialog
          attrs={VIDEO_DEFAULTS}
          open
          onClose={() => setDialog(null)}
          onSave={(a) => {
            put({ type: "video", attrs: a });
            setDialog(null);
          }}
        />
      ) : null}
      {dialog === "cta" ? (
        <CtaDialog
          attrs={CTA_DEFAULTS}
          open
          onClose={() => setDialog(null)}
          onSave={(a) => {
            put({ type: "cta", attrs: a });
            setDialog(null);
          }}
        />
      ) : null}
      {dialog === "link" ? (
        <LinkDialog
          initial={(editor.getAttributes("link").href as string | undefined) ?? ""}
          open
          onClose={() => setDialog(null)}
          onRemove={() => {
            chain().extendMarkRange("link").unsetLink().run();
            setDialog(null);
          }}
          onSave={(href) => {
            chain().extendMarkRange("link").setLink({ href }).run();
            setDialog(null);
          }}
        />
      ) : null}
    </div>
  );
}

function HtmlView({ value, onChange, onApply, onCancel }: { value: string; onChange: (v: string) => void; onApply: () => void; onCancel: () => void }) {
  return (
    <div className="space-y-2 px-4 py-3">
      <label htmlFor="blog-html" className="block text-sm font-semibold">
        HTML code
      </label>
      <textarea
        id="blog-html"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="block min-h-[24rem] w-full border border-rule bg-white p-3 font-mono text-sm"
      />
      <p className="text-sm text-ink-muted">
        Only the formatting this editor knows is kept. Scripts, styles and embedded pages are removed when you apply.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="min-h-11 bg-primary px-4 font-semibold text-on-primary" onClick={onApply}>
          Apply and go back
        </button>
        <button type="button" className="min-h-11 border border-rule bg-white px-4" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export type { Editor };
