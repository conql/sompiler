class SyntacticError extends Error {
	constructor(msg: string) {
		super("Syntax error: " + msg);
	}
}