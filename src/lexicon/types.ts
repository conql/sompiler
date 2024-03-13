export enum LexicalType {
    NONE = "NONE",

    /* 簿记单词符号 */
    ENDFILE = "ENDFILE",
    ERROR = "ERROR",

    /* 保留字 */
    PROGRAM = "PROGRAM",
    PROCEDURE = "PROCEDURE",
    TYPE = "TYPE",
    VAR = "VAR",
    IF = "IF",
    THEN = "THEN",
    ELSE = "ELSE",
    FI = "FI",
    WHILE = "WHILE",
    DO = "DO",
    ENDWH = "ENDWH",
    BEGIN = "BEGIN",
    END = "END",
    READ = "READ",
    WRITE = "WRITE",
    ARRAY = "ARRAY",
    OF = "OF",
    RECORD = "RECORD",
    RETURN = "RETURN",
    INTEGER = "INTEGER",
    CHAR = "CHAR",

    /* 多字符单词符号 */
    ID = "ID",
    INTC = "INTC",
    CHARC = "CHARC",

    /*特殊符号 */
    ASSIGN = "ASSIGN",
    EQ = "EQ",
    LT = "LT",
    PLUS = "PLUS",
    MINUS = "MINUS",
    TIMES = "TIMES",
    OVER = "OVER",
    LPAREN = "LPAREN",
    RPAREN = "RPAREN",
    DOT = "DOT",
    COLON = "COLON",
    SEMI = "SEMI",
    COMMA = "COMMA",
    LMIDPAREN = "LMIDPAREN",
    RMIDPAREN = "RMIDPAREN",
    UNDERANGE = "UNDERANGE"
}

export interface Token {
    line: number;
    type: LexicalType;
    value: string;
}