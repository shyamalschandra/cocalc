/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { React } from "../../../../app-framework";
import { register } from "../register";

register({
  slateType: "softbreak",

  toSlate: () => {
    return {
      type: "softbreak",
      isInline: true,
      isVoid: false,
      children: [{ text: "\n" }],
    };
  },

  Element: ({ attributes, children }) => (
    <span {...attributes}>
      <span style={{ whiteSpace: "normal" }}>{children}</span>
    </span>
  ),

  fromSlate: () => "\n",
});

export function hardbreak() {
  return {
    type: "hardbreak",
    isInline: true,
    isVoid: false,
    children: [{ text: "\n" }],
  };
}

register({
  slateType: "hardbreak",

  fromSlate: () => "  \n",

  Element: ({ attributes, children }) => (
    <span {...attributes}>
      <span style={{ whiteSpace: "pre" }}>{children}</span>
    </span>
  ),

  toSlate: hardbreak,
});
