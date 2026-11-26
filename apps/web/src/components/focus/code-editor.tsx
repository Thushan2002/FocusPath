"use client";

import { closeBrackets } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import { HighlightStyle, bracketMatching, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import { useEffect, useRef } from "react";

// Colours from the design's code panel.
const theme = EditorView.theme(
  {
    "&": { backgroundColor: "#111A19", color: "#E6EEEC", fontSize: "14px" },
    ".cm-content": { fontFamily: "var(--font-mono)", lineHeight: "1.7", padding: "16px 0", caretColor: "#F5C08A" },
    ".cm-gutters": { backgroundColor: "#111A19", color: "#5E7A74", border: "none" },
    ".cm-activeLine": { backgroundColor: "#16231F" },
    "&.cm-focused": { outline: "2px solid #0D6E5F", outlineOffset: "-2px" },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": { backgroundColor: "#24564E !important" },
    ".cm-cursor": { borderLeftColor: "#F5C08A" },
  },
  { dark: true },
);
const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.definitionKeyword], color: "#F5C08A" },
  { tag: [t.number, t.bool, t.null], color: "#9FD8CB" },
  { tag: t.string, color: "#C9E4A6" },
  { tag: t.comment, color: "#8FA6A1", fontStyle: "italic" },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "#FFFFFF" },
]);

export function CodeEditor({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!host.current) return;
    view.current = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          history(),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          python(),
          theme,
          syntaxHighlighting(highlight),
          keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
          EditorView.contentAttributes.of({ "aria-label": label }),
          EditorView.updateListener.of((u) => u.docChanged && onChangeRef.current(u.state.doc.toString())),
        ],
      }),
    });
    return () => view.current?.destroy();
    // The editor owns its document after mount; external resets go through the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
  }, [value]);

  return <div ref={host} className="min-h-[180px] overflow-x-auto" />;
}
