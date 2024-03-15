import { LexicalType, Token } from "./types";
import { EndOfTextError, OutOfRangeError, UnmatchableError } from "./errors";

enum State {
	START = "START",
	INASSIGN = "INASSIGN",
	INRANGE = "INRANGE",
	INCOMMENT = "INCOMMENT",
	INNUM = "INNUM",
	INID = "INID",
	INCHAR = "INCHAR",
	DONE = "DONE"
}

const EOF = "\u1234";

// 可以被直接识别的token
const DirectLexicalTypeMatchers: Record<LexicalType, string> = {
	// 保留字
	[LexicalType.PROGRAM]: "program",
	[LexicalType.PROCEDURE]: "procedure",
	[LexicalType.TYPE]: "type",
	[LexicalType.VAR]: "var",
	[LexicalType.IF]: "if",
	[LexicalType.THEN]: "then",
	[LexicalType.ELSE]: "else",
	[LexicalType.FI]: "fi",
	[LexicalType.WHILE]: "while",
	[LexicalType.DO]: "do",
	[LexicalType.ENDWH]: "endwh",
	[LexicalType.BEGIN]: "begin",
	[LexicalType.END]: "end",
	[LexicalType.READ]: "read",
	[LexicalType.WRITE]: "write",
	[LexicalType.ARRAY]: "array",
	[LexicalType.OF]: "of",
	[LexicalType.RECORD]: "record",
	[LexicalType.RETURN]: "return",
	[LexicalType.INTEGER]: "integer",
	[LexicalType.CHAR]: "char",

	// 单字符特殊符号
	[LexicalType.EQ]: "=",
	[LexicalType.LT]: "<",
	[LexicalType.PLUS]: "+",
	[LexicalType.MINUS]: "-",
	[LexicalType.TIMES]: "*",
	[LexicalType.OVER]: "/",
	[LexicalType.LPAREN]: "(",
	[LexicalType.RPAREN]: ")",
	[LexicalType.DOT]: ".",
	[LexicalType.COLON]: ":",
	[LexicalType.SEMI]: ";",
	[LexicalType.COMMA]: ",",
	[LexicalType.LMIDPAREN]: "[",
	[LexicalType.RMIDPAREN]: "]",
	[LexicalType.ENDFILE]: EOF,

	[LexicalType.ERROR]: "",
	[LexicalType.ID]: "",
	[LexicalType.INTC]: "",
	[LexicalType.CHARC]: "",
	[LexicalType.ASSIGN]: "",
	[LexicalType.UNDERANGE]: "",
	[LexicalType.NONE]: ""
};

// 匹配能够被直接识别的token
function matchDirectLexicalType(text: string) {
	// 尝试每一种类型
	for (const [type, matcher] of Object.entries(DirectLexicalTypeMatchers)) {
		if (matcher === text) {
			return type as LexicalType;
		}
	}

	throw new UnmatchableError();
}

function isDigit(char: string) {
	return "0123456789".includes(char);
}

function isLetter(char: string) {
	return "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".includes(char);
}

export default function LexicalParser(text: string) {
	text = text + EOF; // 在文本末尾添加一个结束符
	let textPointer = 0; // 指向当前字符的索引
	let line = 1; // 当前行号
	const tokens: Token[] = [];

	const column = () => {
		for (let i = textPointer; i >= 0; i--) {
			if (text[i] === "\n" || text[i] === "\r") {
				return textPointer - i;
			}
		}
		return textPointer + 1;
	};

	const current = () => {
		return text[textPointer];
	};

	const forward = () => {
		textPointer++;
		if (current() === "\n") line++;
		if (textPointer >= text.length) {
			throw new EndOfTextError();
		}
		return current();
	};

	const backward = () => {
		if (current() === "\n") line--;
		textPointer--;
		if (textPointer < 0) {
			throw new OutOfRangeError();
		}
		return current();
	};

	interface StateMatcherResult {
		next: State,
		reject?: boolean,
		noSave?: boolean,
		lex?: LexicalType
	}

	type StateMatcherFunction = (char: string, token: Token) => StateMatcherResult;
	const StateMatchers: Record<State, StateMatcherFunction> = {
		[State.START]: function (char) {
			// 数字
			if (isDigit(char)) {
				return { next: State.INNUM };
			}

			// 字母
			else if (isLetter(char)) {
				return { next: State.INID };
			}

			// 冒号
			else if (char === ":") {
				return { next: State.INASSIGN };
			}

			// 点
			else if (char === ".") {
				return { next: State.INRANGE };
			}

			// 单引号
			else if (char === "'") {
				return { next: State.INCHAR, noSave: true };
			}

			// 空白：空格、制表符、换行符
			else if (char === " " || char === "\t" || char === "\n" || char === "\r") {
				return { next: State.START, noSave: true };
			}

			// 左大括号
			else if (char === "{") {
				return { next: State.INCOMMENT, noSave: true };
			}

			// 其他字符：可直接识别的token
			else {
				const type = matchDirectLexicalType(char);
				return { next: State.DONE, lex: type };
			}

		},
		[State.INASSIGN]: function (char) {
			if (char === "=") {
				return { next: State.DONE, lex: LexicalType.ASSIGN };
			}
			else {
				return { next: State.DONE, lex: LexicalType.ERROR, noSave: true };
			}
		},
		[State.INRANGE]: function (char) {
			if (char === ".") {
				return { next: State.DONE, lex: LexicalType.UNDERANGE };
			}
			else {
				return { next: State.DONE, lex: LexicalType.DOT, reject: true, noSave: true };
			}
		},
		[State.INCOMMENT]: function (char) {
			if (char == EOF) {
				return { next: State.DONE, noSave: true, lex: LexicalType.ENDFILE };
			}
			else if (char == "}") {
				return { next: State.START, noSave: true };
			}
			else {
				return { next: State.INCOMMENT, noSave: true };
			}
		},
		[State.INNUM]: function (char) {
			if (isDigit(char)) {
				return { next: State.INNUM };
			}
			else {
				return { reject: true, noSave: true, next: State.DONE, lex: LexicalType.INTC };
			}
		},
		[State.INID]: function (char, token) {
			if (isLetter(char) || isDigit(char)) {
				return { next: State.INID };
			}
			else {
				try {
					const type = matchDirectLexicalType(token.value);
					return { next: State.DONE, lex: type, noSave: true, reject: true };
				}
				catch (e) {
					return { next: State.DONE, lex: LexicalType.ID, noSave: true, reject: true };
				}
			}
		},
		[State.INCHAR]: function (char) {
			if (isLetter(char) || isDigit(char)) {
				const cnext = forward();
				if (cnext == "\\") {
					return { next: State.DONE, lex: LexicalType.CHARC };
				}
				else {
					backward();
					return { next: State.DONE, lex: LexicalType.ERROR, reject: true };
				}
			}
			else {
				return { next: State.DONE, lex: LexicalType.ERROR, reject: true };
			}
		},
		[State.DONE]: function (char) {
			throw new Error("Function not implemented.");
		}
	};


	// 读取一个token，返回读取的token
	const parseOneToken = (): Token => {
		const token: Token = {
			line,
			type: LexicalType.ERROR,
			value: ""
		} as Token;

		let state = State.START as State;
		while (state !== State.DONE) {
			const result = StateMatchers[state](current(), token);
			state = result.next;
			if (!result.noSave) token.value += current();
			if (result.lex !== undefined) token.type = result.lex;
			if (!result.reject && result.lex !== LexicalType.ENDFILE) forward();
		}
		token.line = line;
		return token;
	};


	// 读取所有token
	let token;
	do {
		try {
			token = parseOneToken();
		}
		catch (e) {
			console.error(`Failed to parse token at line ${line}, column ${column()}, char ${current()}`);
			console.error(e);
			throw e;
		}
		if (token) tokens.push(token);
	}
	while (token.type !== LexicalType.ENDFILE);

	return tokens;
} 