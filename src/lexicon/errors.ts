export class EndOfTextError extends Error {
	constructor() {
		super("End of text while parsing text to tokens.");
	}
}

export class OutOfRangeError extends Error {
	constructor() {
		super("Out of range while parsing text to tokens.");
	}
}

export class UnmatchableError extends Error {
	constructor() {
		super("No lexical type matched.");
	}
}