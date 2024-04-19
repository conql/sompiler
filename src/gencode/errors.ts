class GenCodeError extends Error {
	constructor(msg: string) {
		super("GenCodeError error: " + msg);
	}
}