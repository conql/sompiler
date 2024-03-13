import { LexicalType, Token } from "../lexicon/types";
import { SymbolNode, SymbolNodeKind } from "./types";



export default function SyntacticParser(tokens: Token[]) {
	let tokenPointer = 0;
	let line = 1;

	const forward = () => {
		tokenPointer++;
		if (tokenPointer >= tokens.length) {
			throw new Error("Out of range while parsing tokens.");
		}
		line = current().line;
		return current();
	};

	const match = (type: LexicalType) => {
		if (current().type !== type) {
			throw new Error("Unexpected token: `" + current().value + "` at line " + current().line + ".");
		}
		return forward();
	}

	const current = () => {
		return tokens[tokenPointer];
	};

	const programHead = () => {
		match(LexicalType.PROGRAM);
		if (current().type === LexicalType.ID) {
			const node = new SymbolNode(SymbolNodeKind.PheadK, [], line, [current().value]);
			match(LexicalType.ID);
			return node;
		}
		return null;
	};



	const program = () => {
		const head = programHead();
		if (!head) {
			throw new SyntacticError("Program head is missing.");
		}
		const part = declarePart();
		if (!part) {
			throw new SyntacticError("Declare part is missing.");
		}
		const body = programBody();
		if (!body) {
			throw new SyntacticError("Program body is missing.");
		}

		const node = new SymbolNode(SymbolNodeKind.ProK, [head, part, body], line, []);
		match(LexicalType.DOT);
		return node;
	};

	const root = program();

	if (current().type !== LexicalType.ENDFILE) {
		throw new SyntacticError("Unexpected token: `" + current().value + "` after the end of the program.");
	}
}