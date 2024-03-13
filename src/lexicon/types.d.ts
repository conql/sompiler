
enum LexicalType {
    /* 簿记单词符号 */
    ENDFILE, ERROR,
    
    /* 保留字 */
    PROGRAM, PROCEDURE, TYPE, VAR, IF,
    THEN, ELSE, FI, WHILE, DO,
    ENDWH, BEGIN, END, READ, WRITE,
    ARRAY, OF, RECORD, RETURN,
    INTEGER, CHAR,
    
    /* 多字符单词符号 */
    ID, INTC, CHARC,
    
    /*特殊符号 */
    ASSIGN, EQ, LT, PLUS, MINUS,
    TIMES, OVER, LPAREN, RPAREN, DOT,
    COLON, SEMI, COMMA, LMIDPAREN, RMIDPAREN,
    UNDERANGE
};

interface Token {
    line: number;
    type: LexicalType;
    value: string;
}