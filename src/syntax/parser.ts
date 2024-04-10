import { s } from "vitest/dist/reporters-MmQN-57K.js";
import { LexicalType, Token } from "../lexicon/types";
import { SymbolNode, SymbolNodeCommon, SymbolSpecificNode, SymbolNodeKind, DecKinds, StmtKinds, ExpKinds, VarKinds, ExpTypes } from "./types";



export default function SyntacticParser(tokens: Token[]) {
	let tokenPointer = 0;
	let line = 1;

	const forward = () => {
		tokenPointer++;
		if (tokenPointer >= tokens.length) {
			throw new SyntaxError("Out of range while parsing tokens.");
		}
		line = current().line;
		return current();
	};

	const match = (type: LexicalType) => {
		if (current().type !== type) {
			throw new SyntaxError("Unexpected token: `" + current().value + "` at line " + current().line + ".");
		}
		return forward();
	}

	const current = () => {
		return tokens[tokenPointer];
	};


	const programHead = () => {
		const node = new SymbolNode(SymbolNodeKind.PheadK, null, [], null, line, []);
		match(LexicalType.PROGRAM);
		if (current().type === LexicalType.ID) {
			node.names.push(current().value);
		}
		match(LexicalType.ID);
		return null;
	};

	const baseType = (node: SymbolNode) => {
		if (current().type === LexicalType.INTEGER) {
			match(LexicalType.INTEGER);
			node.kind = DecKinds.IntegerK;
			return;
		}
		else if (current().type === LexicalType.CHAR) {
			match(LexicalType.CHAR);
			node.kind = DecKinds.CharK;
			return;
		}
		else {
			forward();
			SyntaxError("Unexpected token: `" + current().value + "` at line " + current().line + ".");
			return;
		}
	}

	const arrayType = (node: SymbolNode) => {
		match(LexicalType.ARRAY);
		match(LexicalType.LMIDPAREN);
		if (current().type === LexicalType.INTC) {
			node.attr = {
				type: "Array",
				lower: parseInt(current().value),
			};
		}
		match(LexicalType.INTC);
		match(LexicalType.UNDERANGE);
		if (current().type === LexicalType.INTC) {
			node.attr.upper = parseInt(current().value);
		}
		match(LexicalType.INTC);
		match(LexicalType.RMIDPAREN);
		match(LexicalType.OF);
		baseType(node);
		node.attr.childType = node.kind;
		node.kind = DecKinds.ArrayK;
	}

	const fieldDecMore = () => {
		if (current().type === LexicalType.END)
			return null;
		else if (current().type === LexicalType.INTEGER
			|| current().type === LexicalType.CHAR
			|| current().type === LexicalType.ARRAY)
		{
			return fieldDecList();
		}
		else {
			forward();
			SyntaxError("Unexpected token: `" + current().value + "` at line " + current().line + ".");
			return null;
		}
	}

	const fieldDecList = () => {
		let node = new SymbolNode(SymbolNodeKind.DecK, null, [], null, line, []);
		let fieldDecMore_ = null;
		if (node){
			if (current().type === LexicalType.INTEGER
			|| current().type === LexicalType.CHAR
			){
				baseType(node);
				node.names.push(current().value);
				match(LexicalType.ID);
				match(LexicalType.SEMI);
				fieldDecMore_ = fieldDecMore();
			}
			else if (current().type === LexicalType.ARRAY)
			{
				arrayType(node);
				node.names.push(current().value);
				match(LexicalType.ID);
				match(LexicalType.SEMI);
				fieldDecMore_ = fieldDecMore();
			}
			else {
				forward();
				SyntaxError("Unexpected token: `" + current().value + "` at line " + current().line + ".");
			}
			node.sibling = fieldDecMore_;
		}
		return node;
	}

	const recType = (node: SymbolNode) => {
		match(LexicalType.RECORD);
		const fieldDecList_ = fieldDecList();
		if (fieldDecList_) {
			node.children.push(fieldDecList_);
		}
		else
			throw new SyntaxError("a record body is missing.");
		match(LexicalType.END);
		node.kind = DecKind.RecordK;
	}

	const structureType = (node: SymbolNode) => {
		if (current().type === LexicalType.ARRAY) {
			node.kind = DecKind.ArrayK;
			arrayType(node);
			return;
		}
		if (current().type === LexicalType.RECORD) {
			node.kind = DecKind.RecordK;
			recType(node);
			return;
		}
		forward();
		SyntaxError("Unexpected token: `" + current().value + "` at line " + current().line + ".");
		return null;
	}

	const typeDecMore = () => {
		if (current().type === LexicalType.VAR
			|| current().type === LexicalType.PROCEDURE
			|| current().type === LexicalType.BEGIN
			)
			return null;
		else if (current().type === LexicalType.ID)
		{
			return typeDecList();
		}
		forward();
		SyntaxError("Unexpected token: `" + current().value + "` at line " + current().line + ".");
		return null;
	}

	const typeName = (node: SymbolNode): void => {
		if (
			current().type === LexicalType.INTEGER ||
			current().type === LexicalType.CHAR
		) {
			baseType(node);
		} else if (
			current().type === LexicalType.ARRAY ||
			current().type === LexicalType.RECORD
		) {
			structureType(node);
		} else if (current().type === LexicalType.ID) {
			node.kind = DecKind.Idk;
			node.attr = {
				type: "Type",
				name: current().value,
			};
			match(LexicalType.ID);
		} else {
			forward();
			throw new SyntaxError(
				"Unexpected token: `" + current().value + "` at line " + current().line + "."
			);
		}
	};

	const typeDecList = () => {
		const node = new SymbolNode(SymbolNodeKind.DecK, null, [], null, line, [])
		if (node) {
			//typeId
			if (current().type === LexicalType.ID)
				node.names.push(current().value);
			match(LexicalType.ID);

			match(LexicalType.EQ);

			typeName(node);

			match(LexicalType.SEMI);

			const type_more = typeDecMore();
			if (type_more) {
				node.sibling = type_more;
			}
		}
		return node;
	}

	const typeDeclaration = () => {
		match(LexicalType.TYPE);
		const node = typeDecList();
		if (!node) {
			throw new SyntaxError("Type declaration list is missing.");
		}
		return node;
	}

	const typeDec = () => {
		if (current().type === LexicalType.TYPE)
		{
			return typeDeclaration();
		}
		if (current().type === LexicalType.VAR
			|| current().type === LexicalType.PROCEDURE
			|| current().type === LexicalType.BEGIN
			)
			return null;
		forward();
		// print syntaxerror
		SyntaxError("Unexpected token: `" + current().value + "` at line " + current().line + ".");
		return null;
	}

	const varIdMore = (node :SymbolNode) => {
		if (current().type === LexicalType.SEMI)
			return;
		else if (current().type === LexicalType.COMMA)
		{
			match(LexicalType.COMMA);
			varIdList(node);
			return;
		}
		else {
			forward();
			SyntaxError("Unexpected token: `" + current().value + "` at line " + current().line + ".");
		}
	}


	const varIdList = (node: SymbolNode) => {
		if (current().type === LexicalType.ID) {
			node.names.push(current().value);
			match(LexicalType.ID);
		}
		else{
			forward();
			SyntaxError("Unexpected token: `" + current().value + "` at line " + current().line + ".");
		}
		varIdMore(node);
	}

	const varDecMore = () => {
		let node = null;
		if (current().type === LexicalType.PROCEDURE
		|| current().type === LexicalType.BEGIN
		)
			return null;
		else if (current().type === LexicalType.INTEGER
		|| current().type === LexicalType.CHAR
		|| current().type === LexicalType.ARRAY
		|| current().type === LexicalType.RECORD
		|| current().type === LexicalType.ID)
		{
			node = varDecList();
		}
		else {
			forward();
			SyntaxError("Unexpected token: `" + current().value + "` at line " + current().line + ".");
		}
		return node;
	}

	const varDecList = () => {
		const node = new SymbolNode(SymbolNodeKind.DecK, null, [], null, line, []);
		let p = null;
		if (node) {
			typeName(node);
			varIdList(node);
			match(LexicalType.SEMI);
			p = varDecMore();
			node.sibling = p;
		}
		return node;
	}

	const varDeclaration = () => {
		match(LexicalType.VAR);
		const node = varDecList();
		if (!node) {
			throw new SyntaxError("Variable declaration list is missing.");
		}
		return node;
	}

	const varDec = () => {
		if (current().type === LexicalType.PROCEDURE
		|| current().type === LexicalType.BEGIN
		)
			return null;
		else if (current().type === LexicalType.VAR)
		{
			return varDeclaration();
		}
		else {
			forward();
			SyntaxError("Unexpected token: `" + current().value + "` at line " + current().line + ".");
			return null;
		}
	}

	const declarePart = () => {
		// 类型
		let typeP = new SymbolNode(SymbolNodeKind.TypeK, null, [], null, line, []);

		if (typeP){
			const tp1 = typeDec();
			if (tp1)
				typeP.children.push(tp1);
		}

		// 变量
		let varP = new SymbolNode(SymbolNodeKind.VarK, null, [], null, line, []);
		if (varP){
			const tp2 = varDec();
			if (tp2)
				varP.children.push(tp2);
		}

		const paramList = (node: SymbolNode) => {
			if (current().type === LexicalType.RPAREN)
				return;
			else if (current().type === LexicalType.INTEGER
			|| current().type === LexicalType.CHAR
			|| current().type === LexicalType.ARRAY
			|| current().type === LexicalType.RECORD
			|| current().type === LexicalType.ID
			|| current().type === LexicalType.VAR)
			{
				const p = varDecList();
				node.children.push(p);
			}
			else {
				forward();
				SyntaxError("Unexpected token: `" + current().value + "` at line " + current().line + ".");
			}
		}

		const programBody = () => {
			const node = new SymbolNode(SymbolNodeKind.StmtK, null, [], null, line, []);
			match(LexicalType.BEGIN);
			if (node){
				const p = stmList();
				node.children.push(p);
			}
			match(LexicalType.END);
			return node;
		}

		const procBody = () => {
			const node = programBody();
			if (!node) {
				throw new SyntaxError("Procedure body is missing.");
			}
			return node;
		}

		const procDecPart = () => {
			return declarePart();
		}

		const procDeclaration = () => {
			const node = new SymbolNode(SymbolNodeKind.ProcDecK, null, [], null, line, []);
			match(LexicalType.PROCEDURE);
			if (node)
			{
				if (current().type === LexicalType.ID)
					{
						node.names.push(current().value);
						match(LexicalType.ID);
					}
				match(LexicalType.LPAREN);
				paramList(node);
				match(LexicalType.RPAREN);
				match(LexicalType.SEMI);
				const p1 = procDecPart();
				const p2 = procBody();
				node.children.push(p1);
				node.children.push(p2);
				node.sibling = procDec();
			}
			return node;
		}

		const procDec = () => {
			if (current().type === LexicalType.BEGIN)
				return null;
			else if (current().type === LexicalType.PROCEDURE)
				return procDeclaration();
			else {
				forward();
				SyntaxError("Unexpected token: `" + current().value + "` at line " + current().line + ".");
			}
			return null;
		}


		// 过程或函数
		let procP = procDec();
		
		if (typeP.children)
			if (varP.children)
			{
				typeP.sibling = varP;
				if (procP)
					varP.sibling = procP;
			}
			else if (!varP.children)
			{
				if (procP)
					typeP.sibling = procP;
			}
		else if (!typeP.children)
		{
			if (varP.children)
			{	
				typeP = varP;
				if (procP)
					typeP.sibling = procP;
			}
			else if (!varP.children)
			{
				if (procP)
					return procP;
				else return null;
			}
		}
		return typeP;
	}

	const fieldVarMore = (node: SymbolNode) => {
		switch(current().type){
			case LexicalType.ASSIGN:
			case LexicalType.TIMES:
			case LexicalType.EQ:
			case LexicalType.LT:
			case LexicalType.PLUS:
			case LexicalType.MINUS:
			case LexicalType.OVER:
			case LexicalType.RPAREN:
			case LexicalType.RMIDPAREN:
			case LexicalType.SEMI:
			case LexicalType.COMMA:
			case LexicalType.THEN:
			case LexicalType.ELSE:
			case LexicalType.FI:
			case LexicalType.DO:
			case LexicalType.ENDWH:
			case LexicalType.END:
				break;
			case LexicalType.LMIDPAREN:
				match(LexicalType.LMIDPAREN);
				const p = exp();
				p.attr = {
					type: "Exp",
					varKind: VarKind.ArrayMembV,
				};
				node.children.push(p);
				match(LexicalType.RMIDPAREN);
				break;
			default:
				forward();
				SyntaxError("Unexpected token: `" + current().value + "` at line " + current().line + ".");
				break;
			}
		}

	const fieldVar = () => {
		let t = new SymbolNode(SymbolNodeKind.ExpK, null, [], null, line, []);
		t.kind = ExpKind.VariK;
		if (t&&current().type === LexicalType.ID)
			t.names.push(current().value);
		match(LexicalType.ID);
		fieldVarMore(t);
		return t;
	}


	const variMore = (node: SymbolNode) => {
		switch(current().type){
			case LexicalType.ASSIGN:
			case LexicalType.TIMES:
			case LexicalType.EQ:
			case LexicalType.LT:
			case LexicalType.PLUS:
			case LexicalType.MINUS:
			case LexicalType.OVER:
			case LexicalType.RPAREN:
			case LexicalType.RMIDPAREN:
			case LexicalType.SEMI:
			case LexicalType.COMMA:
			case LexicalType.THEN:
			case LexicalType.ELSE:
			case LexicalType.FI:
			case LexicalType.DO:
			case LexicalType.ENDWH:
			case LexicalType.END:
				break;
			case LexicalType.LMIDPAREN:
				match(LexicalType.LMIDPAREN);
				const p = exp();
				p.attr = {
					type: "Exp",
					varKind: VarKind.IdV,
				};
				node.children.push(p);
				node.attr = {
					type: "Exp",
					varKind: VarKind.ArrayMembV,
					expType: ExpType.Void,
				};
				match(LexicalType.RMIDPAREN);
				break;
			case LexicalType.DOT:
				match(LexicalType.DOT);
				const p2 = fieldVar();
				p2.attr = {
					type: "Exp",
					varKind: VarKind.IdV,
				};
				node.children.push(p2);
				node.attr = {
					type: "Exp",
					varKind: VarKind.FieldMembV,
					expType: ExpType.Void,
				};
				break;
			default:
				forward();
				SyntaxError("Unexpected token: `" + current().value + "` at line " + current().line + ".");
				break;
			}	
		}

	const variable = () => {
		let t = new SymbolNode(SymbolNodeKind.ExpK, null, [], null, line, []);
		t.kind = ExpKind.VariK;
		t.attr = {
			type: "Exp",
			varKind: VarKind.IdV,
			expType: ExpType.Void,
		};
		if (t&&current().type === LexicalType.ID)
			t.names.push(current().value);
		match(LexicalType.ID);
		variMore(t);
		return t;
	}

	const factor = () => {
		let t = null;
		switch(current().type){
			case LexicalType.INTC:
				t = new SymbolNode(SymbolNodeKind.ExpK, null, [], null, line, []);
				t.kind = ExpKind.ConstK;
				t.attr = {
					type: "Exp",
					varKind: VarKind.IdV,
					expType: ExpType.Void,
				};
				if (t&&current().type === LexicalType.INTC)
					t.attr.val = parseInt(current().value);
				match(LexicalType.INTC);
				break;
			case LexicalType.ID:
				t = variable();
				break;
			case LexicalType.LPAREN:
				match(LexicalType.LPAREN);
				t = exp();
				match(LexicalType.RPAREN);
				break;
			default:
				forward();
				SyntaxError("Unexpected token: `" + current().value + "` at line " + current().line + ".");
				break;
			}
		return t;
	}

	const term = () => {
		let t = factor();
		let p = null;
		while (current().type === LexicalType.TIMES
			|| current().type === LexicalType.OVER)
		{
			p = new SymbolNode(SymbolNodeKind.ExpK, null, [], null, line, []);
			p.kind = ExpKind.OpK;
			p.attr = {
				type: "Exp"
			};
			if (p){
				p.children.push(t);
				p.attr = {
					type: "Exp",
					op: current().type,
				};
				match(current().type);
				p.children.push(factor());
			}
		}
		return p;
	}


	const simpleExp = () => {
		let t = term();
		let p = null;
		while (current().type === LexicalType.PLUS
			|| current().type === LexicalType.MINUS)
		{
			const p = new SymbolNode(SymbolNodeKind.ExpK, null, [], null, line, []);
			p.kind = ExpKind.OpK;
			p.attr = {
				type: "Exp"
			};
			if (p){
				p.children.push(t);
				p.attr = {
					type: "Exp",
					op: current().type,
				};
				t = p;
				match(current().type);
				t.children.push(term());
			}
		}
		return t;
	}


	const exp = () => {
		let t = simpleExp();
		if (current().type === LexicalType.LT
			|| current().type === LexicalType.EQ)
		{
			const node = new SymbolNode(SymbolNodeKind.ExpK, null, [], null, line, []);
			if (node){
				node.children.push(t);
				node.attr = {
					type: "Exp",
					op: current().type,
				};
				match(current().type);
				const p2 = simpleExp();
				node.children.push(p2);
				t = node;
			}
		}
	}


	const conditionalStm = () => {
		let t = new SymbolNode(SymbolNodeKind.StmtK, null, [], null, line, []);
		t.kind = StmtKind.IfK;
		match(LexicalType.IF);
		if (t){
			const p1 = exp();
			t.children.push(p1);
		}
		match(LexicalType.THEN);
		if (t){
			const p2 = stmList();
			t.children.push(p2);
		}
		if (current().type === LexicalType.ELSE)
		{
			match(LexicalType.ELSE);
			if (t){
				const p3 = stmList();
				t.children.push(p3);
			}
		}
		match(LexicalType.FI);
		return t;
	}

	const loopStm = () => {
		let t = new SymbolNode(SymbolNodeKind.StmtK, null, [], null, line, []);
		t.kind = StmtKind.WhileK;
		match(LexicalType.WHILE);
		if (t){
			const p1 = exp();
			t.children.push(p1);
		}
		match(LexicalType.DO);
		if (t){
			const p2 = stmList();
			t.children.push(p2);
		}
		match(LexicalType.ENDWH);
		return t;
	}

	const inputStm = () => {
		let t = new SymbolNode(SymbolNodeKind.StmtK, null, [], null, line, []);
		t.kind = StmtKind.ReadK;
		match(LexicalType.READ);
		match(LexicalType.LPAREN);
		if (t&& current().type === LexicalType.ID){
			t.names.push(current().value);
		}
		match(LexicalType.ID);
		match(LexicalType.RPAREN);
		return t;
	}

	const outputStm = () => {
		let t = new SymbolNode(SymbolNodeKind.StmtK, null, [], null, line, []);
		t.kind = StmtKind.WriteK;
		match(LexicalType.WRITE);
		match(LexicalType.LPAREN);
		if (t){
			const p = exp();
			t.children.push(p);
		}
		match(LexicalType.RPAREN);
		return t;
	}

	const returnStm = () => {
		let t = new SymbolNode(SymbolNodeKind.StmtK, null, [], null, line, []);
		t.kind = StmtKind.ReturnK;
		match(LexicalType.RETURN);
		return t;
	}

	const stm = () => {
		let t = null;
		switch(current().type){
			case LexicalType.IF:
				t = conditionalStm();
				break;
			case LexicalType.WHILE:
				t = loopStm();
				break;
			case LexicalType.READ:
				t = inputStm();
				break;
			case LexicalType.WRITE:
				t = outputStm();
				break;
			case LexicalType.RETURN:
				t = returnStm();
				break;
			case LexicalType.ID:
				//
				break;
			default:
				forward();
				SyntaxError("Unexpected token: `" + current().value + "` at line " + current().line + ".");
				break;
			}
		return t;
	}

	const stmMore = () => {
		let t= null;
		switch(current().type){
			case LexicalType.ELSE:
			case LexicalType.FI:
			case LexicalType.ENDWH:
			case LexicalType.END:
				break;
			case LexicalType.SEMI:
				match(LexicalType.SEMI);
				t = stmList();
				break;
			default:
				forward();
				SyntaxError("Unexpected token: `" + current().value + "` at line " + current().line + ".");
				break;
			}
		return t;
	}


	const stmList = () => {
		const node = stm();
		const stm_more = stmMore();
		if (node)
			if (stm_more)
				node.sibling = stm_more;
		return node;
	}

	const programBody = () => {
		const node = new SymbolNode(SymbolNodeKind.StmLK, null, [], null, line, []);
		match(LexicalType.BEGIN);
		if (node){
			const p = stmList();
			node.children.push(p);
		}
		match(LexicalType.END);
		return node;
	}

	const program = () => {

		const node = new SymbolNodeCommon(SymbolNodeKind.ProK, null, [], null, line, []);
		const head = programHead();
		if (!head) {
			throw new SyntacticError("Program head is missing.");
		} else
			node.children.push(head);

		const part = declarePart();
		if (!part) {
			// declarePart is missing
		} else
			node.children.push(part);
		const body = programBody();
		if (!body) {
			throw new SyntacticError("Program body is missing.");
		} else
			node.children.push(body);

		match(LexicalType.DOT);
		return node;
	};

	const root = program();

	if (current().type !== LexicalType.ENDFILE) {
		throw new SyntacticError("Unexpected token: `" + current().value + "` after the end of the program.");
	}

	return root;
}