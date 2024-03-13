enum State {
    START,
    INASSIGN,
    INRANGE,
    INCOMMENT,
    INNUM,
    INID,
    INCHAR,
    DONE
}

const EOF = "\u0000"

// 可以被直接识别的token
const LexicalTypeMatchers: Record<LexicalType, string> = {
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
    [LexicalType.ENDFILE]: EOF
}

// 匹配能够被直接识别的token
function matchLexicalType(text: string) {
    // 尝试每一种类型
    for (let [type, matcher] of Object.entries(LexicalTypeMatchers)) {
        if (matcher === text) {
            return type as unknown as LexicalType;
        }
    }

    throw new UnmatchableError();
}

function isDigit(text: string) {
    return "0123456789".includes(text);
}

function isLetter(text: string) {
    return "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".includes(text);
}

export default function LexicalParser(text: string) {
    let state = State.START;
    let textPointer = 0; // 指向当前字符的索引
    let line = 1; // 当前行号
    const tokens: Token[] = [];


    const current = () => {
        return text[textPointer];
    }

    const forward = () => {
        textPointer++;
        if (current() === "\n") line++;
        if (textPointer >= text.length) {
            throw new EndOfTextError();
        }
    }

    const backward = () => {
        if (current() === "\n") line--;
        textPointer--;
        if (textPointer < 0) {
            throw new OutOfRangeError();
        }
    }

    const StateMatchers: Record<State, (char: string, accept: (value?: string, type?: LexicalType) => void, reject: () => void) => State> = {
        [State.START]: (char, accept, reject) => {
            // 数字
            if (isDigit(char)) {
                accept(char);
                return State.INNUM;
            }

            // 字母
            else if (isLetter(char)) {
                accept(char);
                return State.INID;
            }

            // 冒号
            else if (char === ":") {
                accept(char);
                return State.INASSIGN;
            }

            // 点
            else if (char === ".") {
                accept(char);
                return State.DONE;
            }

            // 单引号
            else if (char === "'") {
                accept(""); // 接受当前字符，但不加入token
                return State.INCHAR;
            }

            // 空白：空格、制表符、换行符
            else if (char === " " || char === "\t" || char === "\n") {
                accept(""); // 接受当前字符，但不加入token
                return State.START;
            }

            // 左大括号
            else if (char === "{") {
                accept(""); // 接受当前字符，但不加入token
                return State.INCOMMENT;
            }

            // 其他字符：可直接识别的token
            else {
                const type = matchLexicalType(char);
                accept(char, type);
                return State.DONE;
            }

        },
        [State.INASSIGN]: function (char, accept, reject) {
            if (char === "=") {
                accept(char, LexicalType.ASSIGN);
                return State.DONE;
            }
            else {
                throw new UnmatchableError();
            }
        },
        [State.INRANGE]: function (char, accept, reject) {
            if (char === ".") {
                accept(char, LexicalType.UNDERANGE);
                return State.DONE;
            }
            else {
                accept("", LexicalType.DOT);
                return State.DONE;
            }
        },
        [State.INCOMMENT]: function (char, accept, reject) {
            if (char === EOF) {
                // token.type = LexicalType.ENDFILE;
                accept("", LexicalType.ENDFILE);
                return State.DONE;
            }
            else if (char === '}') {
                accept("");
                return State.START;
            }
            else
                return State.INCOMMENT;
        },
        [State.INNUM]: function (char, accept, reject) {
            if (isDigit(char)) {
                accept(char);
                return State.INNUM;
            }
            else {
                reject();
                return State.DONE;
            }
        },
        [State.INID]: function (char, accept, reject) {
            if (isLetter(char) || isDigit(char)) {
                token.value += char;
                forward();
                return State.INID;
            }
            else {
                token.type = LexicalType.ID;
                return State.DONE;
            }
        },
        [State.INCHAR]: function (char, accept, reject) {
            throw new Error("Function not implemented.");
        },
        [State.DONE]: function (char, accept, reject) {
            throw new Error("Function not implemented.");
        }
    }


    // 读取一个token，返回读取的token
    const parseOneToken = (): Token | null => {
        let state = State.START;
        const token: Token = {
            line,
            type: LexicalType.ERROR,
            value: ""
        } as Token;
        while (state != State.DONE) {
            state = StateMatchers[state](
                current(),
                (value, type) => {
                    // accept：接受当前字符
                    if (value) token.value += value;
                    if (type) token.type = type;
                    forward();
                },
                () => {
                    // reject：不接受当前字符，不用移动指针
                }
            );
        }

        return token;
    }


    // 读取所有token
    while (true) {
        const token = parseOneToken();
        if (token) tokens.push(token);
        else break;
    }
    return tokens;
} 