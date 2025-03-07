export enum Figure {
  TICK = "✔",
  INFO = "ℹ",
  CROSS = "✖",
  WARNING = "⚠",
  ELLIPSIS = "…",
  POINTER_SMALL = "›",
}

export enum Colour {
  RED = "\x1b[31m",
  BOLD = "\x1b[1m",
  GREY = "\x1b[38m",
  BLUE = "\x1b[34m",
  CYAN = "\x1b[36m",
  RESET = "\x1b[0m",
  GREEN = "\x1b[32m",
  YELLOW = "\x1b[33m",
  MAGENTA = "\x1b[35m",
  UNDERLINE = "\x1b[4m",
}

export enum Level {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
}

export interface LogType {
  label: string;
  level: Level;
  badge: Figure | string;
  colour: Colour;
  stream: NodeJS.WriteStream;
}

const _mk = (
  label: LogType["label"],
  level: LogType["level"],
  badge: LogType["badge"],
  colour: LogType["colour"],
  stream: LogType["stream"] = process.stdout,
): LogType => ({ label, level, badge, colour, stream });

export const isColour = (input: any): input is Colour =>
  Object.values(Colour).includes(input);

export function colour(input: string, ...colours: Colour[]): string {
  if (typeof input !== "string")
    throw new TypeError(
      `Invalid input: expected a string, received ${typeof input}`,
    );

  const valid = colours.filter((x) => {
    if (!isColour(x)) {
      console.warn(`Invalid colour: ${x} is not a valid \`Colour\` enum value`);
      return false;
    }

    return true;
  });

  return `${valid.join("")}${input}${Colour.RESET}`;
}

export default {
  success: _mk("success", Level.INFO, Figure.TICK, Colour.GREEN),
  warn: _mk("warn", Level.WARN, Figure.WARNING, Colour.YELLOW),
  error: _mk("error", Level.ERROR, Figure.CROSS, Colour.RED, process.stderr),
  fatal: _mk("fatal", Level.FATAL, Figure.CROSS, Colour.RED, process.stderr),
  trace: _mk("trace", Level.TRACE, Figure.ELLIPSIS, Colour.BLUE),
  debug: _mk("debug", Level.DEBUG, Figure.INFO, Colour.RED),
  info: _mk("info", Level.INFO, Figure.INFO, Colour.BLUE),
} satisfies Record<LogType["label"], LogType>;
