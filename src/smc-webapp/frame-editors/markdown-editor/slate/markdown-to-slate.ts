/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { Node, Text } from "slate";
import { endswith, replace_all, startswith } from "smc-util/misc";
import { getMarkdownToSlate } from "./elements";
import { parse_markdown, Token } from "./parse-markdown";

const DEFAULT_CHILDREN = [{ text: "" }];

interface Marks {
  italic?: boolean;
  bold?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
  sup?: boolean;
  sub?: boolean;
  color?: string;
}

export interface State {
  marks: Marks;
  nesting: number;

  open_type?: string;
  close_type?: string;
  contents?: Token[];
  attrs?: string[][];
  block?: boolean;
}

/*
updateMarkState updates the state of text marks if this token
just changing marking state.  If there is a change, return true
to stop further processing.
*/
function handleMarks({
  token,
  state,
}: {
  token: Token;
  state: State;
}): Node[] | undefined {
  switch (token.type) {
    case "em_open":
      state.marks.italic = true;
      return [];
    case "strong_open":
      state.marks.bold = true;
      return [];
    case "s_open":
      state.marks.strikethrough = true;
      return [];
    case "em_close":
      state.marks.italic = false;
      return [];
    case "strong_close":
      state.marks.bold = false;
      return [];
    case "s_close":
      state.marks.strikethrough = false;
      return [];
  }

  if (token.type == "html_inline") {
    // special cases for underlining, sup, sub, which markdown doesn't have.
    const x = token.content.toLowerCase();
    switch (x) {
      case "<u>":
        state.marks.underline = true;
        return [];
      case "</u>":
        state.marks.underline = false;
        return [];
      case "<sup>":
        state.marks.sup = true;
        return [];
      case "</sup>":
        state.marks.sup = false;
        return [];
      case "<sub>":
        state.marks.sub = true;
        return [];
      case "</sub>":
        state.marks.sub = false;
        return [];
      case "</span>":
        for (const mark in state.marks) {
          if (startswith(mark, "color:")) {
            delete state.marks[mark];
            return [];
          }
          for (const c of ["family", "size"]) {
            if (startswith(mark, `font-${c}:`)) {
              delete state.marks[mark];
              return [];
            }
          }
        }
        break;
    }

    // Colors look like <span style='color:#ff7f50'>:
    if (startswith(x, "<span style='color:")) {
      // delete any other colors -- only one at a time
      for (const mark in state.marks) {
        if (startswith(mark, "color:")) {
          delete state.marks[mark];
        }
      }
      // now set our color
      const c = x.split(":")[1]?.split("'")[0];
      if (c) {
        state.marks["color:" + c] = true;
      }
      return [];
    }

    for (const c of ["family", "size"]) {
      if (startswith(x, `<span style='font-${c}:`)) {
        const n = `<span style='font-${c}:`.length;
        // delete any other fonts -- only one at a time
        for (const mark in state.marks) {
          if (startswith(mark, `font-${c}:`)) {
            delete state.marks[mark];
          }
        }
        // now set our font
        state.marks[`font-${c}:${x.slice(n, x.length - 2)}`] = true;
        return [];
      }
    }
  }
}

function handleOpen({ token, state }): Node[] | undefined {
  if (!endswith(token.type, "_open")) return;
  // Opening for new array of children.  We start collecting them
  // until hitting a token with close_type (taking into acocunt nesting).
  state.contents = [];
  const i = token.type.lastIndexOf("_open");
  state.close_type = token.type.slice(0, i) + "_close";
  state.open_type = token.type;
  state.nesting = 0;
  state.attrs = token.attrs;
  state.block = token.block;
  return [];
}

function handleChildren({ token, state }): Node[] | undefined {
  if (!token.children) return;
  // Parse all the children with own state, partly inherited
  // from us (e.g., the text marks).
  const child_state: State = { marks: { ...state.marks }, nesting: 0 };
  const children: Node[] = [];
  for (const token2 of token.children) {
    for (const node of parse(token2, child_state)) {
      children.push(node);
    }
  }
  return children;
}

function convertToSlate({ token, state }): Node[] {
  // Handle inline code as a leaf node with style
  if (token.type == "code_inline") {
    return [{ text: token.content, code: true }];
  }

  if (token.type == "text" || token.type == "inline") {
    // text
    return [mark({ text: token.content }, state.marks)];
  } else {
    // everything else -- via our element plugin mechanism.
    const markdownToSlate = getMarkdownToSlate(token.type);
    const node = markdownToSlate({
      type: token.type,
      token,
      children: DEFAULT_CHILDREN,
      state,
      isEmpty: false,
    });
    if (node != null) {
      return [node];
    } else {
      // node == undefied/null means that we want no node
      // at all; markdown-it sometimes uses tokens to
      // convey state but nothing that should be included
      // in the slate doc tree.
      return [];
    }
  }
}

function handleClose({ token, state }): Node[] | undefined {
  if (!state.close_type) return;
  if (state.contents == null) {
    throw Error("bug -- state.contents must not be null");
  }

  // Currently collecting the contents to parse when we hit the close_type.
  if (token.type == state.open_type) {
    // Hitting same open type *again* (its nested), so increase nesting.
    state.nesting += 1;
  }

  if (token.type === state.close_type) {
    // Hit the close_type
    if (state.nesting > 0) {
      // We're nested, so just go back one.
      state.nesting -= 1;
    } else {
      // Not nested, so done: parse the accumulated array of children
      // using a new state:
      const child_state: State = { marks: state.marks, nesting: 0 };
      const children: Node[] = [];
      let isEmpty = true;
      // Note a RULE: "Block nodes can only contain other blocks, or inline and text nodes."
      // See https://docs.slatejs.org/concepts/10-normalizing
      // This means that all children nodes here have to be either *inline/text* or they
      // all have to be blocks themselves -- no mixing.  Our markdown parser I think also
      // does this, except for one weird special case which involves hidden:true that is
      // used for tight lists.

      // We use all_tight to make it so if one node is marked tight, then all are.
      // This is useful to better render nested markdown lists.
      let all_tight: boolean = false;
      for (const token2 of state.contents) {
        for (const node of parse(token2, child_state)) {
          if (node.tight) {
            all_tight = true;
          }
          if (all_tight) {
            node.tight = true;
          }
          isEmpty = false;
          children.push(node);
        }
      }
      if (isEmpty) {
        // it is illegal for the children to be empty.
        children.push({ text: "" });
      }
      const i = state.close_type.lastIndexOf("_");
      const type = state.close_type.slice(0, i);
      delete state.close_type;
      delete state.contents;

      const markdownToSlate = getMarkdownToSlate(type);
      const node = markdownToSlate({
        type,
        token,
        children,
        state,
        isEmpty,
      });
      if (node == null) {
        return [];
      }
      return [node];
    }
  }

  state.contents.push(token);
  return [];
}

const parseHandlers = [
  handleMarks,
  handleClose,
  handleOpen,
  handleChildren,
  convertToSlate,
];

function parse(token: Token, state: State): Node[] {
  for (const handler of parseHandlers) {
    const nodes: Node[] | undefined = handler({ token, state });
    if (nodes != null) {
      return nodes;
    }
  }
  throw Error(
    `some handler must process every token -- ${JSON.stringify(token)}`
  );
}

function mark(text: Text, marks: Marks): Node {
  if (!text.text) {
    // don't mark empty string
    return text;
  }

  // unescape dollar signs (in markdown we have to escape them so they aren't interpreted as math).
  text.text = replace_all(text.text, "\\$", "$");

  for (const mark in marks) {
    if (marks[mark]) {
      text[mark] = true;
    }
  }
  return text;
}

export function markdown_to_slate(markdown: string): Node[] {
  // Parse the markdown:
  const tokens = parse_markdown(markdown);

  const doc: Node[] = [];
  const state: State = { marks: {}, nesting: 0 };
  for (const token of tokens) {
    for (const node of parse(token, state)) {
      doc.push(node);
    }
  }

  if (doc.length == 0) {
    // empty doc isn't allowed; use the simplest doc.
    doc.push({
      type: "paragraph",
      children: [{ text: "" }],
    });
  }

  (window as any).x = {
    tokens,
    doc,
  };

  return doc;
}
