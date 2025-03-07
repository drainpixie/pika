import { parse } from "node:path";
import {
	Colour,
	Figure,
	Level,
	type LogType,
	default as TYPES,
	colour,
} from "./types";

export interface PikaOptions {
	scope: string;
	level: Level;
	secrets: string[];
	interactive: boolean;
}

export class Pika {
	#scope: string;
	#level: Level;
	#longest: number;
	#secrets: readonly string[];

	constructor(public options: Partial<PikaOptions> = {}) {
		this.#scope = options.scope ?? this._filename();
		this.#level = options.level ?? Level.INFO;
		this.#longest = this._getLongestLabel();
		this.#secrets = options.secrets ?? [];
	}

	scope(scope: string) {
		this.#scope = scope;
		return this;
	}

	level(level: Level) {
		this.#level = level;
		return this;
	}

	secrets(...secrets: readonly string[]) {
		this.#secrets = secrets;
		return this;
	}

	private _filename() {
		const _ = Error.prepareStackTrace;
		Error.prepareStackTrace = (_, stack) => stack;

		const e = new Error();
		const stack = e.stack as unknown as NodeJS.CallSite[];

		Error.prepareStackTrace = _;

		if (!stack || stack.length === 0) return "anonymous";

		const callers = stack.map((callSite) => callSite.getFileName());
		const path = callers.find((filePath) => filePath !== callers[0]);

		if (!path) return "anonymous";

		return parse(path).name;
	}

	private _getLongestLabel() {
		return Object.entries(TYPES).reduce(
			(maxLength, [, { label }]) =>
				label ? Math.max(maxLength, label.length) : maxLength,
			0,
		);
	}

	private _filterSecrets(input: string) {
		if (this.#secrets.length === 0) return input;

		return this.#secrets.reduce(
			(safe, secret) => safe.split(secret).join("[secure]"),
			input,
		);
	}

	private _formatScope(): string {
		return `[${this.#scope}]`;
	}

	private _meta() {
		const meta: string[] = [];

		meta.push(this._formatScope());

		if (meta.length !== 0) {
			meta.push(`${Figure.POINTER_SMALL}`);
			return meta.map((item) => colour(item, Colour.GREY));
		}

		return meta;
	}

	private _build(type: LogType, ...args: unknown[]) {
		const builder: string[] = this._meta();
		const { label: tlabel, colour: tcolour, badge: tbadge } = type;

		builder.push(colour(tbadge.padEnd(tbadge.length + 1), tcolour));
		builder.push(
			`${colour(tlabel, tcolour, Colour.UNDERLINE)}${" ".repeat(this.#longest - tlabel.length)}`,
		);

		if (args[0] instanceof Error && args[0].stack != null) {
			const [name, ...stack] = args[0].stack.split("\n");

			builder.push(`${colour(name, Colour.UNDERLINE)}\n`);
			builder.push(colour(stack.join("\n"), Colour.GREY));
		}

		if (
			typeof args[0] === "object" &&
			args[0] != null &&
			!(args[0] instanceof Error)
		)
			builder.push(
				Object.entries(args[0])
					.map(([key, value]) => `${key} = "${String(value)}"`)
					.join(", "),
			);

		if (typeof args[0] === "string") {
			builder.push(colour(args.join(" "), Colour.GREY));
		}

		return builder.join(" ");
	}

	private _log(type: LogType, ...args: unknown[]) {
		if (type.level >= this.#level)
			type.stream.write(`${this._filterSecrets(this._build(type, ...args))}\n`);
	}

	success(...args: unknown[]) {
		this._log(TYPES.success, ...args);
	}

	warn(...args: unknown[]) {
		this._log(TYPES.warn, ...args);
	}

	error(...args: unknown[]) {
		this._log(TYPES.error, ...args);
	}

	fatal(...args: unknown[]) {
		this._log(TYPES.fatal, ...args);
	}

	trace(...args: unknown[]) {
		this._log(TYPES.trace, ...args);
	}

	debug(...args: unknown[]) {
		this._log(TYPES.debug, ...args);
	}

	info(...args: unknown[]) {
		this._log(TYPES.info, ...args);
	}
}

export const pika = (options: Partial<PikaOptions> = {}) => new Pika(options);
