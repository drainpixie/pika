import { parse } from "node:path";
import {
  Colour,
  Figure,
  Level,
  type LogType,
  default as TYPES,
  colour,
  shouldUseColors,
} from "./utils";
import { fileURLToPath } from "node:url";

/**
 * The options for a Pika instance.
 */
export interface PikaOptions {
  /**
   * The scope of the logger.
   */
  readonly scope: string;

  /**
   * The level of the logger.
   */
  readonly level: Level;

  /**
   * The secrets to filter.
   */
  readonly secrets: readonly string[];

  /**
   * Whether to use colors.
   */
  readonly useColors: boolean;
}

/**
 * A Pika logger.
 */
type PikaLogMethod = (...args: readonly unknown[]) => void;

/**
 * A Pika logger.
 */
export class Pika {
  readonly #scope: string;
  readonly #level: Level;
  readonly #longest: number;
  readonly #useColors: boolean;
  readonly #secrets: readonly string[];

  /**
   * Creates a new instance of Pika.
   * @param options The options for the instance.
   */
  constructor(options: Partial<PikaOptions> = {}) {
    this.#scope = options.scope ?? this.#getFilename();
    this.#level = options.level ?? Level.INFO;
    this.#longest = this.#getLongestLabel();
    this.#secrets = Object.freeze([...(options.secrets ?? [])]);
    this.#useColors = options.useColors ?? shouldUseColors();
  }

  /**
   * Clones the current instance with the given scope.
   * @param scope The scope to set.
   * @returns A new instance with the given scope.
   */
  scope(scope: string) {
    return new Pika({
      ...this.options,
      scope,
    });
  }

  /**
   * Clones the current instance with the given level.
   * @param level The level to set.
   * @returns A new instance with the given level.
   */
  level(level: Level) {
    return new Pika({
      ...this.options,
      level,
    });
  }

  /**
   * Clones the current instance with the given secrets.
   * @param secrets The secrets to add.
   * @returns A new instance with the given secrets.
   */
  secrets(...secrets: readonly string[]) {
    return new Pika({
      ...this.options,
      secrets: [...this.#secrets, ...secrets],
    });
  }

  /**
   * Returns the current options.
   * @returns The current options.
   */
  get options(): Partial<PikaOptions> {
    return {
      scope: this.#scope,
      level: this.#level,
      secrets: this.#secrets,
      useColors: this.#useColors,
    };
  }

  #getFilename() {
    const originalPrepareStackTrace = Error.prepareStackTrace;

    try {
      Error.prepareStackTrace = (_, stack) => stack;

      const error = new Error();
      const stack = error.stack as unknown as NodeJS.CallSite[];

      if (!stack?.length) return "anonymous";

      const currentFile = stack[0].getFileName();
      const externalCaller = stack
        .slice(1)
        .find((callSite) => callSite.getFileName() !== currentFile);

      if (!externalCaller) return "anonymous";

      const filePath = externalCaller.getFileName();
      if (!filePath) return "anonymous";

      return parse(
        filePath.startsWith("file://") ? fileURLToPath(filePath) : filePath,
      ).name;
    } catch {
      return "anonymous";
    } finally {
      Error.prepareStackTrace = originalPrepareStackTrace;
    }
  }

  #getLongestLabel() {
    return Math.max(
      ...Object.values(TYPES)
        .map((type) => type.label?.length ?? 0)
        .filter((length) => length > 0),
      0,
    );
  }

  #filterSecrets(input: string) {
    if (this.#secrets.length === 0) return input;

    return this.#secrets.reduce(
      (sanitized, secret) => sanitized.replaceAll(secret, "[REDACTED]"),
      input,
    );
  }

  #formatScope() {
    return `[${this.#scope}]`;
  }

  #getMeta() {
    const meta = [this.#formatScope()];

    if (meta.length > 0) {
      meta.push(Figure.POINTER_SMALL);
      return meta.map((item) => colour(item, Colour.GREY));
    }

    return meta;
  }

  #applyColor(text: string, ...colors: Colour[]) {
    return this.#useColors ? colour(text, ...colors) : text;
  }

  #formatError(error: Error) {
    if (!error.stack) return error.message;

    const [name, ...stackLines] = error.stack.split("\n");

    const coloredName = this.#applyColor(name, Colour.UNDERLINE);
    const coloredStack = this.#applyColor(stackLines.join("\n"), Colour.GREY);

    return `${coloredName}\n${coloredStack}`;
  }

  #formatObject(obj: Record<string, unknown>) {
    return Object.entries(obj)
      .map(([key, value]) => `${key} = ${JSON.stringify(value)}`)
      .join(", ");
  }

  #buildMessage(type: LogType, ...args: readonly unknown[]) {
    const parts = [...this.#getMeta()];
    const { label, colour: typeColour, badge } = type;

    parts.push(this.#applyColor(`${badge} `, typeColour));
    parts.push(
      `${this.#applyColor(label, typeColour, Colour.UNDERLINE)}${" ".repeat(Math.max(0, this.#longest - label.length))}`,
    );

    if (args.length === 0) return parts.join(" ");

    const [first, ...rest] = args;

    if (first instanceof Error) parts.push(this.#formatError(first));
    else if (
      typeof first === "object" &&
      first !== null &&
      !(first instanceof Date) &&
      !(first instanceof RegExp)
    )
      parts.push(this.#formatObject(first as Record<string, unknown>));
    else
      parts.push(
        this.#applyColor(
          [first, ...rest].map((arg) => String(arg)).join(" "),
          Colour.GREY,
        ),
      );

    return parts.join(" ");
  }

  #log(type: LogType, ...args: readonly unknown[]) {
    if (type.level < this.#level) return;
    type.stream.write(
      `${this.#filterSecrets(this.#buildMessage(type, ...args))}\n`,
    );
  }

  /**
   * Clones the current instance with the given options.
   * @param overrides The options to override.
   * @returns A new instance with the given options.
   */
  clone(overrides: Partial<PikaOptions> = {}): Pika {
    return new Pika({
      ...this.options,
      ...overrides,
    });
  }

  readonly success: PikaLogMethod = (...args) =>
    this.#log(TYPES.success, ...args);
  readonly error: PikaLogMethod = (...args) => this.#log(TYPES.error, ...args);
  readonly fatal: PikaLogMethod = (...args) => this.#log(TYPES.fatal, ...args);
  readonly trace: PikaLogMethod = (...args) => this.#log(TYPES.trace, ...args);
  readonly debug: PikaLogMethod = (...args) => this.#log(TYPES.debug, ...args);
  readonly warn: PikaLogMethod = (...args) => this.#log(TYPES.warn, ...args);
  readonly info: PikaLogMethod = (...args) => this.#log(TYPES.info, ...args);
}

/**
 * Creates a new instance of Pika.
 * @param options The options for the instance.
 * @returns A new instance of Pika.
 */
export const pika = (options: Partial<PikaOptions> = {}) => new Pika(options);
export * from "./utils";
