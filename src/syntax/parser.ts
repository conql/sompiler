import { S, s } from "vitest/dist/reporters-MmQN-57K.js";
import { LexicalType, Token } from "../lexicon/types";
import { ExpOp,ParamTypes,SymbolNode, SymbolNodeCommon, SymbolSpecificNode, SymbolNodeKind, DecKinds, StmtKinds, ExpKinds, VarKinds, ExpTypes, SymbolNodeDecK, SymbolNodeStmtK, SymbolNodeExpK } from "./types";



export default function SyntacticParser(tokens: Token[]) {
	let tokenPointer = 0;
	let line = 1;

	// 读取下一个token
	const forward = () => {
		tokenPointer++;
		if (tokenPointer >= tokens.length) {
			throw new SyntaxError("Out of range while parsing tokens.");
		}
		line = current().line;
		return current();
	};

	// 匹配当前token，并且返回下一个token
	const match = (type: LexicalType) => {
		if (current().type !== type) {
			throw new SyntaxError("Unexpected token: `" + current().value + "` at line " + current().line + ".");
		}
		return forward();
	};

	// 返回当前token
	const current = () => {
		return tokens[tokenPointer];
	};


	/********************************************************************/
	/* 函数名 programHead											    */
	/* 功  能 程序头的处理函数								        	*/
	/* 产生式 < programHead > ::= PROGRAM  ProgramName                  */
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/
	const programHead = () => {
		// 创建一个程序头节点
		const node: SymbolNodeCommon = {
			kind: SymbolNodeKind.PheadK,
			line,
			children: [],
			names: [],
			table: undefined
		};

		match(LexicalType.PROGRAM);
		if (current().type === LexicalType.ID) {
			node.line = 0;
			// 复制程序名
			node.names.push(current().value);
		}

		match(LexicalType.ID);
		return node;
	};


	/********************************************************************/
	/* 函数名 baseType		 							  	            */
	/* 功  能 类型声明部分的处理函数						        	*/
	/* 产生式 < baseType > ::=  INTEGER | CHAR                          */
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/
	const baseType = (node: SymbolNodeDecK) => {
		if (current().type === LexicalType.INTEGER) {
			match(LexicalType.INTEGER);
			node.subKind = DecKinds.IntegerK;
			return;
		}
		else if (current().type === LexicalType.CHAR) {
			match(LexicalType.CHAR);
			node.subKind = DecKinds.CharK;
			return;
		}
		else {
			forward();
			SyntaxError("Unexpected token: `" + current().value + "` at line " + current().line + ".");
			return;
		}
	};

	/********************************************************************/
	/* 函数名 arrayType		 							                */
	/* 功  能 类型声明部分的处理函数						        	*/
	/* 产生式 < arrayType > ::=  ARRAY [low..top] OF baseType           */
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/
	const arrayType = (node: SymbolNodeDecK) => {
		node.attr = {}; // Initialize node.attr object
		
		match(LexicalType.ARRAY);
		match(LexicalType.LMIDPAREN);

		if (current().type === LexicalType.INTC) {
			node.attr.low = parseInt(current().value);
		}
		match(LexicalType.INTC);
		match(LexicalType.UNDERANGE);

		if (current().type === LexicalType.INTC) {
			node.attr.high = parseInt(current().value);
		}

		match(LexicalType.INTC);
		match(LexicalType.RMIDPAREN);
		match(LexicalType.OF);
		
		// 这里的操作是，先调用baseType函数，得到baseType的属性存放在node.subKind中
		// 然后再赋值给node.attr.childType
		baseType(node);
		node.attr.childType = node.subKind;
		node.subKind = DecKinds.ArrayK;
		

	};


	/********************************************************************/
	/* 函数名 fieldDecMore		 							            */
	/* 功  能 类型声明部分的处理函数						        	*/
	/* 产生式 < fieldDecMore > ::=  ε | fieldDecList                   */ 
	/*说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点   */
	/********************************************************************/
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
	};


	/********************************************************************/
	/* 函数名 fieldDecList		 							            */
	/* 功  能 类型声明部分的处理函数						        	*/
	/* 产生式 < fieldDecList > ::=   baseType idList ; fieldDecMore     */
	/*                             | arrayType idList; fieldDecMore     */ 
	/*说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点   */
	/********************************************************************/
	const fieldDecList = () => {
		const node : SymbolNodeDecK = {
			kind: SymbolNodeKind.DecK,
			line,
			children: [],
			names: [],
			table: undefined
			// subKind 在下面确定
		};

		let fieldDecMore_ = null;
		if (node){
			if (current().type === LexicalType.INTEGER
			|| current().type === LexicalType.CHAR
			){
				baseType(node);
				// 把当前的标识符放到names数组中
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
			
			if (fieldDecMore_)
				node.sibling = fieldDecMore_;

		}
		return node;
	};


	/********************************************************************/
	/* 函数名 recType		 							                */
	/* 功  能 类型声明部分的处理函数						        	*/
	/* 产生式 < recType > ::=  RECORD fieldDecList END                  */
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/
	const recType = (node: SymbolNodeDecK) => {
		match(LexicalType.RECORD);
		const fieldDecList_ = fieldDecList();
		if (fieldDecList_) {
			node.children.push(fieldDecList_);
		}
		else
			SyntaxError("a record body is missing.");
		match(LexicalType.END);
		node.subKind = DecKinds.RecordK;
	};


	/********************************************************************/
	/* 函数名 structureType		 							            */
	/* 功  能 类型声明部分的处理函数						        	*/
	/* 产生式 < structureType > ::=  arrayType | recType                */
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/
	const structureType = (node: SymbolNodeDecK) => {
		if (current().type === LexicalType.ARRAY) {
			arrayType(node);
			return;
		}
		if (current().type === LexicalType.RECORD) {
			recType(node);
			return;
		}
		forward();
		SyntaxError("Unexpected token: `" + current().value + "` at line " + current().line + ".");
		return null;
	};

	/********************************************************************/
	/* 函数名 typeDecMore		 							            */
	/* 功  能 类型声明部分的处理函数						        	*/
	/* 产生式 < typeDecMore > ::=    ε | TypeDecList                   */
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/
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
	};


	/********************************************************************/
	/* 函数名 typeName		 							  	            */
	/* 功  能 类型声明部分的处理函数						        	*/
	/* 产生式 < typeName > ::= baseType | structureType | id            */
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/
	const typeName = (node: SymbolNodeDecK): void => {
		if (
			current().type === LexicalType.INTEGER ||
			current().type === LexicalType.CHAR
		) {
			baseType(node);
		}
		else if (
			current().type === LexicalType.ARRAY ||
			current().type === LexicalType.RECORD
		) {
			structureType(node);
		} 
		else if (current().type === LexicalType.ID) {
			// 该节点的子类型为IdK
			node.subKind = DecKinds.IdK;
			// 属性为type_name，记录标识符的类型名
			node.attr = {
				type_name: current().value
			};
			match(LexicalType.ID);
		} else {
			forward();
			throw new SyntaxError(
				"Unexpected token: `" + current().value + "` at line " + current().line + "."
			);
		}
	};


	/********************************************************************/
	/* 函数名 TypeDecList		 							  	        */
	/* 功  能 类型声明部分的处理函数						        	*/
	/* 产生式 < TypeDecList > ::= typeId = typeName ; typeDecMore       */
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/
	const typeDecList = () => {
		// 具体节点，SybolNodeDecK类型，表示一个具体的声明
		const node : SymbolNodeDecK = {
			kind: SymbolNodeKind.DecK,
			line,
			children: [],
			names: [],
			table: undefined,
			// subkind 在下面确定			
		};

		if (node) {

			//typeId放到names数组中
			if (current().type === LexicalType.ID)
				node.names.push(current().value);

			match(LexicalType.ID);

			match(LexicalType.EQ);

			// subkind 在typeName函数中确定
			typeName(node);

			match(LexicalType.SEMI);

			const type_more = typeDecMore();
			if (type_more) {
				node.sibling = type_more;
			}
		}
		return node;
	};


	/********************************************************************/
	/* 函数名 TypeDeclaration									  	    */
	/* 功  能 类型声明部分的处理函数						        	*/
	/* 产生式 < TypeDeclaration > ::= TYPE  TypeDecList                 */
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/
	const typeDeclaration = () => {
		match(LexicalType.TYPE);
		const node = typeDecList();
		if (!node) {
			SyntaxError("Type declaration list is missing.");
		}
		return node;
	};



	/**************************类型声明部分******************************/

	/********************************************************************/
	/* 函数名 typeDec									     		    */
	/* 功  能 类型声明部分的处理函数						        	*/
	/* 产生式 < typeDec > ::= ε | TypeDeclaration                      */
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/
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
		SyntaxError("Unexpected token: `" + current().value + "` at line " + current().line + ".");
		return null;
	};


	/********************************************************************/
	/* 函数名 varIdMore		 						                    */
	/* 功  能 变量声明部分的处理函数						        	*/
	/* 产生式 < varIdMore > ::=  ε |  , varIdList                      */ 
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/  
	const varIdMore = (node :SymbolNodeDecK) => {
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
	};


	/********************************************************************/
	/* 函数名 varIdList		 						                    */
	/* 功  能 变量声明部分的处理函数						        	*/
	/* 产生式 < varIdList > ::=  id  varIdMore                          */ 
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/
	const varIdList = (node: SymbolNodeDecK) => {
		if (current().type === LexicalType.ID) {
			node.names.push(current().value);
			match(LexicalType.ID);
		}
		else{
			forward();
			SyntaxError("Unexpected token: `" + current().value + "` at line " + current().line + ".");
		}
		varIdMore(node);
	};


	/********************************************************************/
	/* 函数名 varDecMore		 						                */
	/* 功  能 变量声明部分的处理函数						        	*/
	/* 产生式 < varDecMore > ::=  ε |  varDecList                      */ 
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/
	const varDecMore = () => {
		let node = undefined;
		if (current().type === LexicalType.PROCEDURE
		|| current().type === LexicalType.BEGIN
		)
			return undefined;
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
	};


	/********************************************************************/
	/* 函数名 varDecList		 						                */
	/* 功  能 变量声明部分的处理函数						        	*/
	/* 产生式 < varDecList > ::=  typeName varIdList; varDecMore        */ 
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/
	const varDecList = () => {
		const node: SymbolNodeDecK = {
			kind: SymbolNodeKind.DecK,
			line,
			children: [],
			names: [],
			table: undefined,
			// subKind 在下面确定
		};
		let p = null;
		if (node) {
			typeName(node);
			varIdList(node);
			match(LexicalType.SEMI);
			p = varDecMore();
			node.sibling = p;
		}
		return node;
	};


	/********************************************************************/
	/* 函数名 varDeclaration		 						            */
	/* 功  能 变量声明部分的处理函数						        	*/
	/* 产生式 < varDeclaration > ::=  VAR  varDecList                   */ 
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/
	const varDeclaration = () => {
		match(LexicalType.VAR);
		const node = varDecList();
		if (!node) {
			SyntaxError("Variable declaration list is missing.");
		}
		return node;
	};


	/**************************变量声明部分******************************/

	/********************************************************************/
	/* 函数名 varDec		 						     	            */
	/* 功  能 变量声明部分的处理函数						        	*/
	/* 产生式 < varDec > ::=  ε |  varDeclaration                      */ 
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/
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
	};


	/********************************************************************/
	/* 函数名 declarePart											    */
	/* 功  能 声明部分的处理函数								     	*/
	/* 产生式 < declarePart > ::= 类型声明-typeDec  变量声明-varDec  过程声明-procDec              */
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/
	const declarePart = () => {
		// 类型声明
		let typeP: SymbolNodeCommon = {
			kind: SymbolNodeKind.TypeK,
			line: line,
			children: [],
			names: [],
			table: undefined
		};

		if (typeP){
			typeP.line = 0;
			const tp1 = typeDec();
			if (tp1)
				typeP.children.push(tp1);
		}

		// 变量声明
		const varP: SymbolNodeCommon = {
			kind: SymbolNodeKind.VarK,
			line,
			children: [],
			names: [],
			table: undefined
		};

		if (varP){
			const tp2 = varDec();
			if (tp2)
				varP.children.push(tp2);	
		}

		// 过程或函数
		const procP = procDec();
		
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
	};

	/********************************************************************/
	/* 函数名 fidMore		 			    	                        */
	/* 功  能 函数声明中参数声明部分的处理函数	        	        	*/
	/* 产生式 < fidMore > ::=   ε |  , formList                        */ 
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/
	const fidMore = (node: SymbolNodeDecK) => {
		if (current().type === LexicalType.SEMI
			|| current().type === LexicalType.RPAREN)
			return;
		else if (current().type === LexicalType.COMMA)
		{
			match(LexicalType.COMMA);
			formList(node);
			return;
		}
		else {
			forward();
			SyntaxError("Unexpected token: `" + current().value + "` at line " + current().line + ".");
		}
	};

	/********************************************************************/
	/* 函数名 formList		 			    	                        */
	/* 功  能 函数声明中参数声明部分的处理函数	        	        	*/
	/* 产生式 < formList > ::=  id  fidMore                             */ 
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/
	const formList = (node: SymbolNodeDecK) => {
		if (current().type === LexicalType.ID) {
			node.names.push(current().value);
			match(LexicalType.ID);
		}
		else {
			forward();
			SyntaxError("Unexpected token: `" + current().value + "` at line " + current().line + ".");
		}
		fidMore(node);
	};
	
	/********************************************************************/
	/* 函数名 param		 			    	                            */
	/* 功  能 函数声明中参数声明部分的处理函数	        	        	*/
	/* 产生式 < param > ::=  typeName formList | VAR typeName formList  */ 
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/
	const param = () => {
		const node : SymbolNodeDecK = {
			kind: SymbolNodeKind.DecK,
			line,
			children: [],
			names: [],
			table: undefined,
			// subKind 在下面确定
		};
		if (current().type === LexicalType.INTEGER
			|| current().type === LexicalType.CHAR
			|| current().type === LexicalType.ARRAY
			|| current().type === LexicalType.RECORD
			|| current().type === LexicalType.ID)
		{
			node.attr = {};
			// 值参 形参
			node.attr.paramt = ParamTypes.ValueParamType;
			typeName(node);
			formList(node);
		}
		else if (current().type === LexicalType.VAR)
		{
			match(LexicalType.VAR);
			node.attr = {};
			// 变参 形参
			node.attr.paramt = ParamTypes.VarParamType;
			typeName(node);
			formList(node);
		}
		else {
			forward();
			SyntaxError("Unexpected token: `" + current().value + "` at line " + current().line + ".");
		}
		return node;
	};


	/********************************************************************/
	/* 函数名 paramMore		 			    	                        */
	/* 功  能 函数声明中参数声明部分的处理函数	        	        	*/
	/* 产生式 < paramMore > ::=  ε | ; paramDecList                     */ 
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/
	const paramMore = () => {
		if (current().type === LexicalType.RPAREN)
			return null;
		else if (current().type === LexicalType.SEMI)
		{
			match(LexicalType.SEMI);
			const t = paramDecList();
			if (t)
				return t;
			else
				SyntaxError("a param declaration is missing.");
		}
		else {
			forward();
			SyntaxError("Unexpected token: `" + current().value + "` at line " + current().line + ".");
			return null;
		}
	};

		
	/********************************************************************/
	/* 函数名 paramDecList		 			    	                    */
	/* 功  能 函数声明中参数声明部分的处理函数	        	        	*/
	/* 产生式 < paramDecList > ::=  param  paramMore                    */ 
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/	
	const paramDecList = () => {
		const t = param();
		const p = paramMore();
		if (p)
			t.sibling = p;
		return t;
	};


		
	/********************************************************************/
	/* 函数名 paramList		 						                    */
	/* 功  能 函数声明中参数声明部分的处理函数	        	        	*/
	/* 产生式 < paramList > ::=  ε |  paramDecList                     */ 
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/
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
			const p = paramDecList();
			node.children.push(p);
		}
		else {
			forward();
			SyntaxError("Unexpected token: `" + current().value + "` at line " + current().line + ".");
		}
	};


	/********************************************************************/
	/* 函数名 programBody		 			  	                        */
	/* 功  能 程序体部分的处理函数	                    	        	*/
	/* 产生式 < programBody > ::=  BEGIN  stmList   END                 */ 
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/
	const programBody = () => {
		const node : SymbolNodeCommon = {
			kind: SymbolNodeKind.StmLK,
			line,
			children: [],
			names: [],
			table: undefined
		};
		match(LexicalType.BEGIN);
		if (node){
			// why?
			node.line = 0;
			const p = stmList();
			node.children.push(p!);
		}
		match(LexicalType.END);
		return node;
	};


	/********************************************************************/
	/* 函数名 procBody		 			  	                            */
	/* 功  能 函数体部分的处理函数	                    	        	*/
	/* 产生式 < procBody > ::=  programBody                             */ 
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/
	const procBody = () => {
		const node = programBody();
		if (!node) {
			SyntaxError("Procedure body is missing.");
		}
		return node;
	};

	/********************************************************************/
	/* 函数名 procDecPart		 			  	                        */
	/* 功  能 函数中的声明部分的处理函数	             	        	*/
	/* 产生式 < procDecPart > ::=  declarePart                          */ 
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/
	const procDecPart = () => {
		return declarePart();
	};


	/********************************************************************/
	/* 函数名 procDeclaration		 						            */
	/* 功  能 函数声明部分的处理函数						        	*/
	/* 产生式 < procDeclaration > ::=  PROCEDURE                        */
	/*                                 ProcName(paramList);             */
	/*                                 procDecPart                      */
	/*                                 procBody                         */
	/*                                 procDec                          */
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/*        函数的根节点用于记录该函数的名字；第一个子节点指向参数节  */
	/*        点，第二个节点指向函数中的声明部分节点；第三个节点指向函  */
	/*        数体。
/********************************************************************/
	const procDeclaration = () => {
		const node : SymbolNodeCommon = {
			kind: SymbolNodeKind.ProcDecK,
			line,
			children: [],
			names: [],
			table: undefined,
		};
		match(LexicalType.PROCEDURE);
		if (node)
		{
			if (current().type === LexicalType.ID)
			{
				// 复制过程名
				node.names.push(current().value);
				match(LexicalType.ID);
			}
			match(LexicalType.LPAREN);
			paramList(node);
			match(LexicalType.RPAREN);
			match(LexicalType.SEMI);
			const p1 = procDecPart();
			const p2 = procBody();
			const p3 = procDec();
			if (p1)
				node.children.push(p1);
			if (p2)
				node.children.push(p2);
			if (p3)
				node.sibling = p3;
		}
		return node;
	};


	/********************************************************************/
	/* 函数名 procDec		 						                    */
	/* 功  能 函数声明部分的处理函数						        	*/
	/* 产生式 < procDec > ::=  ε |  procDeclaration                    */ 
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/
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
	};



	/********************************************************************/
	/* 函数名 fieldvarMore  											*/
	/* 功  能 变量处理函数												*/
	/* 产生式 fieldvarMore   ::=  ε                             		*/
	/*                           | [exp]            {[}                 */ 
	/* 说  明 该函数根据产生式调用相应的递归处理域变量为数组类型的情况	*/
	/********************************************************************/
	
	
	const fieldVarMore = (node: SymbolNodeExpK) => {
		let p:SymbolNodeExpK;

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
			/*用来以后求出其表达式的值，送入用于数组下标计算 ?*/
			p = exp();
			p.attr = {
				varKind: VarKinds.ArrayMembV
			};
			node.children.push(p);
			match(LexicalType.RMIDPAREN);
			break;
		default:
			forward();
			SyntaxError("Unexpected token: `" + current().value + "` at line " + current().line + ".");
			break;
		}
	};


	/********************************************************************/
	/* 函数名 fieldvar													*/
	/* 功  能 变量处理函数												*/
	/* 产生式 fieldvar   ::=  id  fieldvarMore                          */ 
	/* 说  明 该函数根据产生式，处理域变量，并生成其语法树节点       	*/
	/********************************************************************/
	const fieldVar = () => {
		const t : SymbolNodeExpK = {
			kind: SymbolNodeKind.ExpK,
			line,
			children: [],
			names: [],
			table: undefined,
			subKind: ExpKinds.VariK,
			attr: {
				varKind: VarKinds.IdV,
				type: ExpTypes.Void
			}
		};

		if (t&&current().type === LexicalType.ID)
			t.names.push(current().value);

		match(LexicalType.ID);

		fieldVarMore(t);
		return t;
	};


	/********************************************************************/
	/* 函数名 variMore													*/
	/* 功  能 变量处理函数												*/
	/* 产生式 variMore   ::=  ε                             			*/
	/*                       | [exp]            {[}                     */
	/*                       | . fieldvar       {DOT}                   */ 
	/* 说  明 该函数根据产生式调用相应的递归处理变量中的几种不同类型	*/
	/********************************************************************/		
	
	const variMore = (node: SymbolNodeExpK) => {
		let p:SymbolNodeExpK;
		let p2:SymbolNodeExpK;
		
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
			p = exp();
			// p 是数组下标，IdV标识符变量
			p.attr = {
				varKind : VarKinds.IdV
			};
			// ArrayMembV 数组成员变量类型
			node.attr = {
				varKind : VarKinds.ArrayMembV
			};
			node.children.push(p);
			match(LexicalType.RMIDPAREN);
			break;

		case LexicalType.DOT:
			match(LexicalType.DOT);
			p2 = fieldVar();
			p2.attr = {
				varKind: VarKinds.IdV
			};
			node.attr = {
				varKind: VarKinds.FieldMembV
			};
			node.children.push(p2);
			break;

		default:
			forward();
			SyntaxError("Unexpected token: `" + current().value + "` at line " + current().line + ".");
			break;
		}	
	};

	/********************************************************************/
	/* 函数名 variable													*/
	/* 功  能 变量处理函数												*/
	/* 产生式 variable   ::=   id variMore                   			*/
	/* 说  明 该函数根据产生式,	处理变量，生成其语法树节点              */
	/********************************************************************/
	const variable = () => {
		const t : SymbolNodeExpK = {
			kind: SymbolNodeKind.ExpK,
			line,
			children: [],
			names: [],
			table: undefined,
			// 子类型为变量类型
			subKind: ExpKinds.VariK,
			attr: {
				varKind: VarKinds.IdV,
				type: ExpTypes.Void
			}
		};

		if (t&&current().type === LexicalType.ID)
			t.names.push(current().value);
		
		match(LexicalType.ID);
		variMore(t);
		return t;
	};


	/****************************************************************************/
	/* 函数名 factor															*/
	/* 功  能 因子处理函数														*/
	/* 产生式 factor ::= ( exp ) | INTC | variable                  			*/
	/* 说  明 该函数根据产生式调用相应的递归处理函数,生成表达式类型语法树节点	*/
	/****************************************************************************/
	const factor = () => {
		// 这里可能有问题，原文是 TreeNode * t = NULL;
		// 但是实际上按照下面的switch过程，要么正常返回，要么报错
		// 因此这样写应该是没有问题的
		let t : SymbolNodeExpK = {
			kind: SymbolNodeKind.ExpK,
			line,
			children: [],
			names: [],
			table: undefined,
			subKind: ExpKinds.VariK,
			attr: {
				varKind: VarKinds.IdV,
				type: ExpTypes.Void
			}
		};

		switch(current().type){
		case LexicalType.INTC:
			// 创建ConstK表达式类型的语法树节点
			t  = {
				kind: SymbolNodeKind.ExpK,
				line,
				children: [],
				names: [],
				table: undefined,
				subKind : ExpKinds.ConstK
			};
			// 这部分初始化代同newExpNode
			t.attr = {
				varKind: VarKinds.IdV,
				type: ExpTypes.Void,
			};

			if (t&&current().type === LexicalType.INTC)
				t.attr.val = parseInt(current().value);
			match(LexicalType.INTC);
			break;

		case LexicalType.ID:
			// 创建IdK表达式类型的语法树节点
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
	};


	/****************************************************************************/
	/* 函数名 term																*/
	/* 功  能 项处理函数														*/
	/* 产生式 < 项 > ::= < 因子 > { < 乘法运算符 > < 因子 > }					*/
	/* 说  明 该函数根据产生式调用相应递归处理函数,生成表达式类型语法树节点		*/
	/****************************************************************************/
	const term = () => {
		let t = factor();
		
		while (current().type === LexicalType.TIMES
			|| current().type === LexicalType.OVER)
		{
			const p : SymbolNodeExpK = {
				kind: SymbolNodeKind.ExpK,
				line,
				children: [],
				names: [],
				table: undefined,
				subKind: ExpKinds.OpK,
				attr: {
					varKind: VarKinds.IdV,
					type: ExpTypes.Void,
				}
			};

			if (p){
				p.children.push(t);
				// 这里需要把current().type转换为ExpOp类型，current().type为LexicalType类型
				p.attr = {
					op: current().type as unknown as ExpOp,
				};
				t=p;
				match(current().type);
				// 把第二个因子加入到p的子节点中
				p.children.push(factor());
			}
		}
		return t;
	};


	/************************************************************************/
	/* 函数名 simple_exp													*/
	/* 功  能 简单表达式处理函数											*/
	/* 产生式 < 简单表达式 >::=	< 项 > { < 加法运算符 > < 项 > }			*/
	/* 说  明 该函数根据产生式调用相应递归处理函数,生成表达式类型语法树节点	*/
	/************************************************************************/
	const simpleExp = () => {
		let t = term();

		while (current().type === LexicalType.PLUS
			|| current().type === LexicalType.MINUS)
		{
			const p : SymbolNodeExpK = {
				kind: SymbolNodeKind.ExpK,
				line,
				children: [],
				names: [],
				table: undefined,
				subKind: ExpKinds.OpK,
				attr: {
					varKind: VarKinds.IdV,
					type: ExpTypes.Void,
				}
			};

			if (p){
				p.children.push(t);
				p.attr = {
					op: current().type as unknown as ExpOp,
				};
				t = p;
				match(current().type);
				t.children.push(term());
			}
		}
		return t;
	};


	/****************************************************************************/
	/* 函数名 exp																*/
	/* 功  能 表达式处理函数													*/
	/* 产生式 < 表达式 > ::= < 简单表达式 > [< 关系运算符 > < 简单表达式 > ]	*/
	/* 说  明 该函数根据产生式调用相应递归处理函数,生成表达式类型语法树节点		*/
	/****************************************************************************/
	const exp = () => {
		let t = simpleExp();
		if (current().type === LexicalType.LT
			|| current().type === LexicalType.EQ)
		{
			/* 创建新的OpK类型语法树节点，新语法树节点指针赋给p */
			const p : SymbolNodeExpK = {
				kind: SymbolNodeKind.ExpK,
				line,
				children: [],
				names: [],
				table: undefined,
				subKind: ExpKinds.OpK,
				attr: {
					varKind: VarKinds.IdV,
					type: ExpTypes.Void,
				}
			};
			if (p){
				p.children.push(t);
				p.attr = {
					op: current().type as unknown as ExpOp,
				};
				t = p;
			}
			match(current().type);
			if (t){
				t.children.push(simpleExp());
			}
		}
		return t;
	};


	/********************************************************************/
	/* 函数名 conditionalStm		 			                        */
	/* 功  能 条件语句部分的处理函数	                    	        */
	/* 产生式 < conditionalStm > ::= IF exp THEN stmList ELSE stmList FI*/ 
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/
	const conditionalStm = () => {
		const t: SymbolNodeStmtK = {
			kind: SymbolNodeKind.StmtK,
			line,
			children: [],
			names: [],
			table: undefined,
			subKind: StmtKinds.IfK
		};
		match(LexicalType.IF);
		if (t){
			const p1 = exp();
			t.children.push(p1);
		}
		match(LexicalType.THEN);
		if (t){
			const p2 = stmList();
			t.children.push(p2!);
		}
		if (current().type === LexicalType.ELSE)
		{
			match(LexicalType.ELSE);
			if (t){
				const p3 = stmList();
				t.children.push(p3!);
			}
		}
		match(LexicalType.FI);
		return t;
	};


	/********************************************************************/
	/* 函数名 loopStm          		 			                        */
	/* 功  能 循环语句部分的处理函数	                    	        */
	/* 产生式 < loopStm > ::=      WHILE exp DO stmList ENDWH           */
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/
	const loopStm = () => {
		const t : SymbolNodeStmtK = {
			kind: SymbolNodeKind.StmtK,
			line,
			children: [],
			names: [],
			table: undefined,
			subKind: StmtKinds.WhileK
		};
		
		match(LexicalType.WHILE);
		if (t){
			const p1 = exp();
			t.children.push(p1);
		}
		match(LexicalType.DO);
		if (t){
			const p2 = stmList();
			t.children.push(p2!);
		}
		match(LexicalType.ENDWH);
		return t;
	};


	/********************************************************************/
	/* 函数名 inputStm          		     	                        */
	/* 功  能 输入语句部分的处理函数	                    	        */
	/* 产生式 < inputStm > ::=    READ(id)                              */
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/
	const inputStm = () => {
		const t : SymbolNodeStmtK = {
			kind: SymbolNodeKind.StmtK,
			line,
			children: [],
			names: [],
			table: undefined,
			subKind: StmtKinds.ReadK
		};
		match(LexicalType.READ);
		match(LexicalType.LPAREN);
		if (t&& current().type === LexicalType.ID){
			t.names.push(current().value);
		}
		match(LexicalType.ID);
		match(LexicalType.RPAREN);
		return t;
	};


	/********************************************************************/
	/* 函数名 outputStm          		     	                        */
	/* 功  能 输出语句部分的处理函数	                    	        */
	/* 产生式 < outputStm > ::=   WRITE(exp)                            */
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/
	const outputStm = () => {
		const t : SymbolNodeStmtK = {
			kind: SymbolNodeKind.StmtK,
			line,
			children: [],
			names: [],
			table: undefined,
			subKind: StmtKinds.WriteK
		};
		match(LexicalType.WRITE);
		match(LexicalType.LPAREN);
		if (t){
			const p = exp();
			t.children.push(p);
		}
		match(LexicalType.RPAREN);
		return t;
	};


	/********************************************************************/
	/* 函数名 returnStm          		     	                        */
	/* 功  能 返回语句部分的处理函数	                    	        */
	/* 产生式 < returnStm > ::=   RETURN                                */
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/
	const returnStm = () => {
		const t : SymbolNodeStmtK = {
			kind: SymbolNodeKind.StmtK,
			line,
			children: [],
			names: [],
			table: undefined,
			subKind: StmtKinds.ReturnK
		};
		match(LexicalType.RETURN);
		return t;
	};

	/********************************************************************/
	/* 函数名 assignmentRest		 			                        */
	/* 功  能 赋值语句部分的处理函数	                    	        */
	/* 产生式 < assignmentRest > ::=  variMore : = exp                  */ 
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/
	const assignmentRest = (temp_name : string) => {
		// 创建具体节点，statement节点
		const t : SymbolNodeStmtK = {
			kind: SymbolNodeKind.StmtK,
			line,
			children: [],
			names: [],
			table: undefined,
			// 小类为赋值语句
			subKind : StmtKinds.AssignK
		};
		if (t) {
			// 第一个子节点，表达式-变量节点
			const child1 : SymbolNodeExpK = {
				kind: SymbolNodeKind.ExpK,
				line,
				children: [],
				names: [],
				table: undefined,
				// 小类为变量
				subKind: ExpKinds.VariK
			};
			if (child1){
				child1.names.push(temp_name);
				variMore(child1);
				t.children.push(child1);
			}
			// 匹配赋值符号
			match(LexicalType.ASSIGN);
			// 第二个子节点，表达式节点
			const child2 = exp();
			t.children.push(child2);
		}
		return t;
	};

	/********************************************************************/
	/* 函数名 actParamMore          		   	                        */
	/* 功  能 函数调用实参部分的处理函数	                	        */
	/* 产生式 < actParamMore > ::=     ε |  , actParamList             */
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/
	const actParamMore = () => {
		let t = null;
		switch(current().type){
		case LexicalType.RPAREN:
			break;
		case LexicalType.COMMA:
			match(LexicalType.COMMA);
			t = actParamList();
			break;
		default:
			forward();
			SyntaxError("Unexpected token: `" + current().value + "` at line " + current().line + ".");
			break;
		}
		return t;
	};



	/********************************************************************/
	/* 函数名 actParamList          		   	                        */
	/* 功  能 函数调用实参部分的处理函数	                	        */
	/* 产生式 < actParamList > ::=     ε |  exp actParamMore           */
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/
	const actParamList = () => {
		let t = null;
		switch(current().type){
		case LexicalType.RPAREN:
			break;
		case LexicalType.ID:
		case LexicalType.INTC:
			t = exp();
			if (t){
				const p = actParamMore();
				if (p)
					t.sibling = p;
			}
			break;
		default:
			forward();
			SyntaxError("Unexpected token: `" + current().value + "` at line " + current().line + ".");
			break;
		}
		return t;
	};


	/********************************************************************/
	/* 函数名 callStmRest          		     	                        */
	/* 功  能 函数调用语句部分的处理函数	                  	        */
	/* 产生式 < callStmRest > ::=  (actParamList)                       */
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/
	const callStmRest = (temp_name:string) => {
		const t : SymbolNodeStmtK = {
			kind: SymbolNodeKind.StmtK,
			line,
			children: [],
			names: [],
			table: undefined,
			// 小类为过程调用
			subKind: StmtKinds.CallK
		};
		match(LexicalType.LPAREN);

		if (t){
			const child0 = actParamList();
			if (child0){
				t.children.push(child0);
				// why?
				child0.names.push(temp_name);
			}
			// 对应t->child[1] = actParamList();
			const p = actParamList();
			if (p)
				t.children.push(p);
		}
		match(LexicalType.RPAREN);
		return t;
	
	};


	/********************************************************************/
	/* 函数名 assCall		 			  	                            */
	/* 功  能 语句部分的处理函数	                    	        	*/
	/* 产生式 < assCall > ::=   assignmentRest   { :=,LMIDPAREN,DOT }     */
	/*                        | callStmRest      { ( }                    */  
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/
	const assCall = (temp_name : string) => {
		let t = null;
		switch(current().type){
		case LexicalType.ASSIGN:
		case LexicalType.LMIDPAREN:
		case LexicalType.DOT:
			t = assignmentRest(temp_name);
			break;
		case LexicalType.LPAREN:
			t = callStmRest(temp_name);
			break;
		default:
			forward();
			SyntaxError("Unexpected token: `" + current().value + "` at line " + current().line + ".");
			break;
		}
		return t;
	};


	/********************************************************************/
	/* 函数名 stm   		 			  	                            */
	/* 功  能 语句部分的处理函数	                    	        	*/
	/* 产生式 < stm > ::=   conditionalStm   {IF}                       */
	/*                    | loopStm          {WHILE}                    */
	/*                    | inputStm         {READ}                     */
	/*                    | outputStm        {WRITE}                    */
	/*                    | returnStm        {RETURN}                   */
	/*                    | id  assCall      {id}                       */ 
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/
	const stm = () => {
		// 这里返回值类型需要控制
		let t : SymbolNodeStmtK | null = null;
		let temp_name:string;
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
			temp_name = current().value;
			match(LexicalType.ID);
			t = assCall(temp_name);
			break;
		default:
			forward();
			SyntaxError("Unexpected token: `" + current().value + "` at line " + current().line + ".");
			break;
		}
		return t;
	};


	/********************************************************************/
	/* 函数名 stmMore		 			  	                            */
	/* 功  能 语句部分的处理函数	                    	        	*/
	/* 产生式 < stmMore > ::=   ε |  ; stmList                         */ 
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/
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
	};


	/********************************************************************/
	/* 函数名 stmList		 			  	                            */
	/* 功  能 语句部分的处理函数	                    	        	*/
	/* 产生式 < stmList > ::=  stm    stmMore                           */ 
	/* 说  明 函数根据文法产生式,调用相应的递归处理函数,生成语法树节点  */
	/********************************************************************/
	const stmList = () => {
		const node = stm();
		const stm_more = stmMore();
		if (node)
			if (stm_more)
				node.sibling = stm_more;
		return node;
	};

	const program = () => {

		const root: SymbolNodeCommon = {
			kind: SymbolNodeKind.ProK,
			// "line," 表示属性和值名称相同
			line,
			children: [],
			names: [],
			table: undefined
		};

		const head = programHead();
		if (!head) {
			throw new SyntacticError("Program head is missing.");
		} else
			root.children.push(head);

		const part = declarePart();
		if (!part) {
			// declarePart is missing
			// but it's not an error
		} else{
			root.children.push(part);
		}
		const body = programBody();
		if (!body) {
			throw new SyntacticError("Program body is missing.");
		} else
			root.children.push(body);

		match(LexicalType.DOT);

		return root;
	};

	const root = program();

	if (current().type !== LexicalType.ENDFILE) {
		throw new SyntacticError("Unexpected token: `" + current().value + "` after the end of the program.");
	}

	return root;
}