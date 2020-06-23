/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

/*
Show the last latex build log, i.e., output from last time we ran the LaTeX build process.
*/

import { path_split } from "smc-util/misc2";
import { React, Rendered, useRedux } from "../../app-framework";
//import { BuildLogs } from "./actions";
import { BuildCommand } from "./build-command";
import { Loading } from "smc-webapp/r_misc";

interface IBuildSpec {
  button: boolean;
  label: string;
  icon: string;
  tip: string;
}

export interface IBuildSpecs {
  build: IBuildSpec;
  latex: IBuildSpec;
  bibtex: IBuildSpec;
  sagetex: IBuildSpec;
  pythontex: IBuildSpec;
  knitr: IBuildSpec;
  clean: IBuildSpec;
}

const BUILD_SPECS: IBuildSpecs = {
  build: {
    button: true,
    label: "Build",
    icon: "retweet",
    tip: "Build the document, running LaTeX, BibTex, Sage, etc.",
  },

  latex: {
    button: false,
    label: "LaTeX",
    icon: "cc-icon-tex-file",
    tip: "Run the LaTeX build command (typically latexmk)",
  },

  bibtex: {
    button: false,
    label: "BibTeX",
    icon: "file-code-o",
    tip: "Process bibliography using Bibtex",
  },

  sagetex: {
    button: false,
    label: "SageTex",
    icon: "cc-icon-sagemath-bold",
    tip: "Run SageTex, if necessary",
  },

  pythontex: {
    button: false,
    label: "PythonTeX",
    icon: "cc-icon-python",
    tip: "Run PythonTeX3, if necessary",
  },

  knitr: {
    button: false,
    label: "Knitr",
    icon: "cc-icon-r",
    tip: "Run Knitr, if necessary",
  },

  clean: {
    button: true,
    label: "Clean",
    icon: "trash",
    tip: "Delete all autogenerated auxiliary files",
  },
};

interface Props {
  id: string;
  name: string;
  actions: any;
  editor_state: Map<string, any>;
  is_fullscreen: boolean;
  project_id: string;
  path: string;
  reload: number;
  font_size: number;
  status: string;
}

// should memoize function used at the end
export const Build: React.FC<Props> = React.memo((props) => {
  const {
    /*id,*/
    name,
    actions,
    /*project_id,*/
    /*editor_state,*/
    /*is_fullscreen,*/
    path,
    /*reload,*/
    font_size: font_size_orig,
    status,
  } = props;

  const font_size = 0.8 * font_size_orig;
  console.log(font_size);

  const build_logs = useRedux([name, "build_logs"]);
  const build_command = useRedux([name, "build_command"]);
  const knitr: boolean = useRedux([name, "knitr"]);

  function render_log_label(stage: string, time_str: string): Rendered {
    return (
      <h5>
        {BUILD_SPECS[stage].label} Output {time_str}
      </h5>
    );
  }

  function render_log(stage): Rendered {
    if (build_logs == null) return;
    const x = build_logs.get(stage);
    if (!x) return;
    const value: string | undefined = x.get("stdout") + x.get("stderr");
    if (!value) {
      return;
    }
    const time: number | undefined = x.get("time");
    let time_str: string = "";
    if (time) {
      time_str = `(${(time / 1000).toFixed(1)} seconds)`;
    }
    return (
      <>
        {render_log_label(stage, time_str)}
        <textarea
          readOnly={true}
          style={{
            color: "#666",
            background: "#f8f8f0",
            display: "block",
            width: "100%",
            padding: "10px",
            flex: 1,
          }}
          value={value}
        />
      </>
    );
  }

  function render_clean(): Rendered {
    const value =
      build_logs != null ? build_logs.getIn(["clean", "output"]) : undefined;
    if (!value) {
      return;
    }
    return (
      <>
        <h4>Clean Auxiliary Files</h4>
        <textarea
          readOnly={true}
          style={{
            color: "#666",
            background: "#f8f8f0",
            display: "block",
            width: "100%",
            padding: "10px",
            flex: 1,
          }}
          value={value}
        />
      </>
    );
  }

  function render_build_command(): Rendered {
    return (
      <BuildCommand
        filename={path_split(path).tail}
        actions={actions}
        build_command={build_command}
        knitr={knitr}
      />
    );
  }

  function render_status(): Rendered {
    if (status) {
      return (
        <div style={{ margin: "15px" }}>
          <Loading
            text={status}
            style={{
              fontSize: "10pt",
              textAlign: "center",
              marginTop: "15px",
              color: "#666",
            }}
          />
        </div>
      );
    }
  }

  return (
    <div
      className={"smc-vfill"}
      style={{
        overflowY: "scroll",
        padding: "5px 15px",
        fontSize: "10pt",
      }}
    >
      {render_build_command()}
      {render_status()}
      {render_log("latex")}
      {render_log("sagetex")}
      {render_log("pythontex")}
      {render_log("knitr")}
      {render_log("bibtex")}
      {render_clean()}
    </div>
  );
});
