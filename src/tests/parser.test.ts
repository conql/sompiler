import { expect, test } from "vitest";
import LexicalParser from "../lexicon/parser";
import PROGRAM_BUBBLE from "./bubble.snl?raw";
import ADD from "./add.snl?raw";
import SyntacticParser from "../syntax/parser";
import SemanticParser from "../semantics/parser";

test("Lexical Parser", () => {
	const tokenList = LexicalParser(ADD);
	console.log(tokenList);
	expect(tokenList.map(t => t.type)).toEqual([
		"PROGRAM", "ID", "TYPE", "ID",
		"EQ", "INTEGER", "SEMI", "VAR",
		"ID", "ID", "SEMI", "CHAR",
		"ID", "SEMI", "BEGIN", "READ",
		"LPAREN", "ID", "RPAREN", "SEMI",
		"ID", "ASSIGN", "ID", "PLUS",
		"INTC", "SEMI", "WRITE", "LPAREN",
		"ID", "RPAREN", "END", "DOT",
		"ENDFILE"
	]);
});

test("Syntactic Parser", () => {
	const tokenList = LexicalParser(ADD);
	const syntaxTree = SyntacticParser(tokenList);
	console.dir(syntaxTree, { depth: 15 });
});

test("Semantic Parser", () => {
	const tokenList = LexicalParser(PROGRAM_BUBBLE);
	const syntaxTree = SyntacticParser(tokenList);
	console.dir(syntaxTree, { depth: 15 });

	SemanticParser(syntaxTree);
});