/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { React } from "../../../../app-framework";
import {
  register,
  SlateElement,
  useFocused,
  useSelected,
  useCollapsed,
} from "./register";

export interface Paragraph extends SlateElement {
  type: "paragraph";
}

register({
  slateType: "paragraph",

  toSlate: ({ token, children }) => {
    // We include a tight property when hidden is true, since that's the
    // hack that markdown-it uses for parsing tight lights.
    return {
      ...{ type: "paragraph", children },
      ...(token.hidden ? { tight: true } : {}),
    };
  },

  Element: ({ attributes, children, element }) => {
    if (element.type != "paragraph") throw Error("bug");

    // All this complexity is because we only show empty paragraphs
    // when the cursor is in them, since we create them dynamically in
    // order to work around a fundamental shortcoming in the design
    // of slatejs wrt cursor navigation (e.g., you can't move the cursor
    // between block voids or before various elements at the beginning
    // of a document such as bulleted lists).
    const focused = useFocused();
    const selected = useSelected();
    const collapsed = useCollapsed();
    const isEmpty =
      element.children.length == 1 && element.children[0]["text"] == "";
    if (isEmpty && !(collapsed && focused && selected)) {
      // Only show empty paragraph if selection is collapsed, editor is
      // focused, and para is selected.
      return (
        <span {...attributes} style={{ position: "absolute" }}>
          {children}
        </span>
      );
    }

    // normal paragraph rendering:
    if (element.tight) {
      return <span {...attributes}>{children}</span>;
    }

    return <p {...attributes}>{children}</p>;

    /*
    // I wish I could just use a div instead of a p because
    // you can't have
    // any div's inside of a p, and things like image resize use
    // div's under the hood in the implementation.
    // However, there are rules (e.g., from bootstrap's type.less)
    // like this
    // blockquote {... p { &:last-child { margin-bottom: 0; } }
    // so, e.g., a paragraph in a quote doesn't have that extra
    // bottom margin.  That's a lot more work to re-implement
    // using a div...
    return (
      <div {...attributes} style={{ marginBottom: "1em" }}>
        {children}
      </div>
    );
    */
  },

  fromSlate: ({ node, children, info }) => {
    if (children.trim() == "") {
      // We discard empty paragraphs entirely, since that's just
      // what markdown does. Also, to make void blocks easier to
      // work with, we sometimes automatically add blank paragraphs
      // above or below them, and it is silly if those result in
      // lots of meaningless blank lines in the md file.
      return "";
    }
    return `${children}${info.lastChild ? "\n" : node.tight ? "\n" : "\n\n"}`;
  },
});
