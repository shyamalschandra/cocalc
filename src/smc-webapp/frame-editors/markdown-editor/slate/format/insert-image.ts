/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { Transforms, Element } from "slate";
import {
  get_insert_image_opts_from_user,
  Options,
} from "smc-webapp/codemirror/extensions/insert-image";
import { alert_message } from "smc-webapp/alerts";
import { getSelection } from "./commands";

export async function insertImage(editor): Promise<void> {
  let opts: Options | undefined = undefined;
  try {
    opts = await get_insert_image_opts_from_user(
      "NOTE: You can also drag-and-drop and paste into the Editable panel."
    );
  } catch (err) {
    alert_message({ type: "error", message: err.errorFields[0]?.errors });
    return;
  }
  if (opts == null) return; // user canceled.

  const node = {
    type: "image",
    isInline: true,
    isVoid: true,
    src: opts.url,
    title: opts.title,
    height: opts.height,
    width: opts.width,
    children: [{ text: "" }],
  } as Element;
  Transforms.insertFragment(editor, [node], { at: getSelection(editor) });
}
