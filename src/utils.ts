import { WriteStream } from "node:tty";

/**
 * The available figures.
 */
export const Figure = {
  TICK: "✔",
  INFO: "ℹ",
  CROSS: "✖",
  WARNING: "⚠",
  ELLIPSIS: "…",
  POINTER_SMALL: "›",
} as const;

/**
 * The available colours.
 */
export const Colour = {
  RED: "\x1b[31m",
  BOLD: "\x1b[1m",
  GREY: "\x1b[90m",
  BLUE: "\x1b[34m",
  CYAN: "\x1b[36m",
  RESET: "\x1b[0m",
  GREEN: "\x1b[32m",
  YELLOW: "\x1b[33m",
  MAGENTA: "\x1b[35m",
  UNDERLINE: "\x1b[4m",
} as const;

/**
 * The available levels.
 */
export const Level = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
  FATAL: 5,
} as const;

/**
 * The available figures.
 */
export type Figure = (typeof Figure)[keyof typeof Figure];

/**
 * The available colours.
 */
export type Colour = (typeof Colour)[keyof typeof Colour];

/**
 * The available levels.
 */
export type Level = (typeof Level)[keyof typeof Level];

export type LogTypeName =
  | "success"
  | "warn"
  | "error"
  | "fatal"
  | "trace"
  | "debug"
  | "info";

export interface LogType {
  readonly label: string;
  readonly level: Level;
  readonly badge: Figure | string;
  readonly colour: Colour;
  readonly stream: WriteStream | NodeJS.WriteStream;
}

const createLogType = (
  label: LogType["label"],
  level: LogType["level"],
  badge: LogType["badge"],
  colour: LogType["colour"],
  stream: LogType["stream"] = process.stdout,
): LogType => Object.freeze({ label, level, badge, colour, stream });

export const colour = (input: string, ...colours: readonly Colour[]): string =>
  `${colours.join("")}${input}${Colour.RESET}`;

export function shouldUseColors() {
  if (process.env.NO_COLOR || process.env.NODE_DISABLE_COLORS) return false;
  if (process.env.FORCE_COLOR) return true;

  return process.stdout.isTTY ?? false;
}

export default {
  success: createLogType("success", Level.INFO, Figure.TICK, Colour.GREEN),
  warn: createLogType("warn", Level.WARN, Figure.WARNING, Colour.YELLOW),
  error: createLogType(
    "error",
    Level.ERROR,
    Figure.CROSS,
    Colour.RED,
    process.stderr,
  ),
  fatal: createLogType(
    "fatal",
    Level.FATAL,
    Figure.CROSS,
    Colour.RED,
    process.stderr,
  ),
  trace: createLogType("trace", Level.TRACE, Figure.ELLIPSIS, Colour.BLUE),
  debug: createLogType("debug", Level.DEBUG, Figure.INFO, Colour.CYAN),
  info: createLogType("info", Level.INFO, Figure.INFO, Colour.BLUE),
} as const satisfies Record<LogTypeName, LogType>;
