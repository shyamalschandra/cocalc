/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

// ATTN: all this is also used by the webapp client. Hence, make sure it is kept free of project code.

export type State = "R" | "S" | "D" | "Z" | "T" | "W";

export interface Mem {
  rss: number; // MiB
}

export interface Stat {
  ppid: number;
  state: State;
  utime: number; // CPU time spent in user code, measured in clock ticks (#14)
  stime: number; // CPU time spent in kernel code, measured in clock ticks (#15)
  cutime: number; // Waited-for children's CPU time spent in user code (in clock ticks) (#16)
  cstime: number; // Waited-for children's CPU time spent in kernel code (in clock ticks) (#17)
  starttime: number; // Time when the process started, measured in clock ticks (#22)
  nice: number;
  num_threads: number;
  mem: Mem;
}

export interface Cpu {
  pct: number;
  secs: number;
}

// additional CoCalc specific information for a process
interface ProcProject {
  type: "project";
}

interface ProcTerminal {
  type: "terminal";
  path: string; // name is "terminal:${path}"
}

interface ProcJupyter {
  type: "jupyter";
  path: string;
}

interface ProcSSHD {
  type: "sshd";
}

export type CoCalcInfo = ProcTerminal | ProcJupyter | ProcProject | ProcSSHD;

export interface Process {
  pid: number;
  ppid: number;
  exe: string; // full path of executable
  cmdline: string[]; // full command line
  stat: Stat;
  cpu: Cpu;
  uptime: number;
  // additional CoCalc specific information
  cocalc?: CoCalcInfo;
}

export interface CGroup {
  mem_stat: {
    [key: string]: number; // MiB
  };
  cpu_usage: number; // seconds
  cpu_usage_rate: number; // seconds / second
  oom_kills: number;
  cpu_usage_rate: number; // max cores
  cpu_cores_limit: number; // cpu cores quota limit, the overall time slices it can get
}

interface DiskUsageInfo {
  available: number; // MiB
  free: number; // MiB
  total: number; // MiB
  usage: number; // MiB (total - free)
}

export type DiskUsage = Record<"tmp" | "project", DiskUsageInfo>;

export type Processes = { [pid: number]: Process };

export interface ProjectInfo {
  timestamp: number;
  processes: Processes;
  cgroup?: CGroup; // only in "kucalc" mode
  disk_usage: DiskUsage;
  uptime: number; // secs, uptime of the machine
  boottime: Data; // when VM booted (might be derived from uptime)
}

interface KillCmd {
  cmd: "kill";
  signal?: number;
  pids: number[];
}

export type ProjectInfoCmds = KillCmd;
