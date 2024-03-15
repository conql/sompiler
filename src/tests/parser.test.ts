import { expect, test } from "vitest";
import LexicalParser from "../lexicon/parser";
import PROGRAM_BUBBLE from "./bubble.snl?raw";
import ADD from "./add.snl?raw";

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

