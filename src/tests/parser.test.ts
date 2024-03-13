import { expect, test } from "vitest";
import LexicalParser from "../lexicon/parser";
import PROGRAM_BUBBLE from "./bubble.snl?raw";
import ADD from "./add.snl?raw";

test("Lexical Parser", () => {
	console.log(LexicalParser(ADD));
});

