import { DecKinds, ExpKinds, ExpOp, ParamTypes, StmtKinds, SymbolNode, SymbolNodeDecK, SymbolNodeExpK, SymbolNodeKind, SymbolNodeStmtK, VarKinds } from "../syntax/types";
import { Attribute, SemanticTableItem, IdKind, TypeKind, IntDetail, CharDetail, TypeDetail, AccessType, BoolDetail } from "./types";

export let MainOffset: number = 0;	// 主程序的noff偏移，在目标代码生成时使用

export default function SemanticParser(root: SymbolNode) {
	const INITIAL_OFFSET = 7;
	const Scope: SemanticTableItem[][] = [[]];
	let Level: number = 0; // Scope栈的当前层次
	let Offset: number = 0; // 在同层的变量偏移
	//let MainOffset: number = 0; // 主程序的noff偏移
	let StoreNoff: number = 0;  // 保存主程序的display表的偏移
	let SavedOffset: number = 0; // 当前层的displayOff

	const debugLog: SemanticTableItem[][][] = [];

	function createTable() {
		Level++;
		Scope.push([]);
		Offset = INITIAL_OFFSET;
	}

	function destoryTable() {
		if (Level === -1) {
			throw new Error("[Error] Scope underflow");
		}
		if (!debugLog[Level]) {
			debugLog[Level] = [];
		}
		debugLog[Level].push(Scope[Level]);
		Scope.pop();
		Level--;
	}


	// 登记标识符和属性
	function enter(id: string, attr: Attribute): SemanticTableItem {
		const table = Scope[Level];
		const found = table.find(item => item.id === id);
		if (found) {
			throw new Error(`[Error] Duplicate identifier: ${id}`);
		}

		const item: SemanticTableItem = { id, attr: { ...attr } };
		table.push(item);
		return item;
	}

	// 查找标识符
	function lookup(id: string): SemanticTableItem {
		for (let i = Level; i >= 0; i--) {
			const found = Scope[i].find(item => item.id === id);
			if (found) {
				return found;
			}
		}
		throw new Error(`[Error] Identifier not found: ${id}`);
	}

	// 类型是否相容
	function compatible(type1: TypeDetail, type2: TypeDetail): boolean {
		return type1 === type2;
	}

	// 处理语法树的当前结点类型。构造出当前类型的内部表示
	function typeProcess(node: SymbolNode, deckind: DecKinds): TypeDetail {
		if (deckind === DecKinds.IdK) {
			return nameType(node as SymbolNodeDecK);
		}
		else if (deckind === DecKinds.ArrayK) {
			return arrayType(node as SymbolNodeDecK);
		}
		else if (deckind === DecKinds.RecordK) {
			return recordType(node as SymbolNodeDecK);
		}
		else if (deckind === DecKinds.IntegerK) {
			return IntDetail;
		}
		else if (deckind === DecKinds.CharK) {
			return CharDetail;
		}
		else {
			throw new Error(`[Error] Unknown type: ${node.kind}`);
		}
	}

	// 寻找已定义的类型名字，返回类型的内部表示
	function nameType(node: SymbolNodeDecK): TypeDetail {
		const name = node.attr!.type_name!;	// 类型名
		const item = lookup(name);
		if (item.attr.kind !== IdKind.typeKind) {
			throw new Error(`[Error] Not a type: ${name}`);
		}
		return item.attr.type!;
	}

	// 返回数组类型的内部表示
	function arrayType(node: SymbolNodeDecK): TypeDetail {
		// 检查数组上界是否小于下界
		if (node.attr!.low! > node.attr!.high!) {
			throw new Error(`[Error] Invalid array bounds: ${node.attr!.low} > ${node.attr!.high} at ${node.line}`);
		}

		const indexType = typeProcess(node, DecKinds.IntegerK);
		const elemType = typeProcess(node, node.attr!.childType!);
		const low = node.attr!.low!;
		const high = node.attr!.high!;
		const size = (high - low + 1) * elemType.size;
		return {
			size,
			kind: TypeKind.array,
			arrayAttr: { indexType, elemType, low, high }
		};
	}

	// 返回记录类型的内部表示
	function recordType(node: SymbolNodeDecK): TypeDetail {
		const recordAttr: TypeDetail["recordAttr"] = [];
		let t = node.children[0] as SymbolNodeDecK | undefined;
		let offset = 0;
		while (t) {
			const type = typeProcess(t, t.subKind);
			t.names.forEach(name => {
				recordAttr.push({ id: name, type, offset });
				offset += type.size;
			});

			t = t.sibling as SymbolNodeDecK;
		}

		return {
			size: offset,
			kind: TypeKind.record,
			recordAttr
		};

	}

	// 处理类型声明部分的语义分析
	// 遇到类型T时，构造其内部节点，填写符号表
	// 第一次调用传入类型声明节点TypeK的第一个子节点
	function typeDecPart(node?: SymbolNodeDecK) {
		while (node) {
			const type = typeProcess(node, node.subKind);	// 构造内部表示
			enter(node.names[0], { kind: IdKind.typeKind, type });	// 登记到符号表
			node = node.sibling as SymbolNodeDecK;
		}
	}

	function varDecPart(node?: SymbolNodeDecK) {
		varDecList(node);
	}

	// 当遇到变量表识符id时，把id登记到符号表中；检查重复性定义；遇到类型时，构造其内部表示
	function varDecList(node?: SymbolNodeDecK) {
		while (node) {
			for (const i in node.names) {
				const id = node.names[i];
				const attr: Attribute = {
					kind: IdKind.varKind,
					varAttr: {
						access: AccessType.dir,
						level: Level,
						offset: Offset,
						isParam: false
					},
					type: typeProcess(node, node.subKind)
				};

				// 判断是值参还是变参
				if (node.attr?.paramt === ParamTypes.VarParamType) {
					attr.varAttr!.access = AccessType.indir;
					Offset++; // 变参的偏移量为1
				}
				else {
					attr.varAttr!.access = AccessType.dir;
					Offset += attr.type.size; // 值参的偏移量为变量的大小
				}

				const item = enter(id, attr);
				node.table[i] = item;
			}
			node = node.sibling as SymbolNodeDecK;
		}

		// 如果是主程序，则记录此时偏移，用于目标代码生成时的displayOff
		if (Level === 0) {
			MainOffset = Offset;
			StoreNoff = Offset;
		}
		else {
			// 如果不是主程序，则记录此时偏移，用于下面填写过程信息表的noff信息
			SavedOffset = Offset;
		}
	}

	// 处理过程声明部分的语义分析
	// 在新层符号表中填写形参标识符的属性
	function procDecPart(node: SymbolNode) {
		const entry: SemanticTableItem = headProcess(node);

		let cur = node.children[1] as SymbolNode | undefined;
		// 如果过程内部存在声明部分，则处理声明部分
		while (cur) {
			if (cur.kind === SymbolNodeKind.TypeK) {
				typeDecPart(cur.children[0] as SymbolNodeDecK);
			}
			else if (cur.kind === SymbolNodeKind.VarK) {
				varDecPart(cur.children[0] as SymbolNodeDecK);
			}
			else if (cur.kind === SymbolNodeKind.ProcDecK) {
				// 如果声明部分有函数声明，则跳出循环，先填写noff和moff等信息，
				// 再处理函数声明的循环处理，否则无法保存noff和moff的值。
				break;
			}
			else {
				throw new Error(`[Error] Unknown kind: ${cur.kind} at ${cur.line}`);
			}
			cur = cur.sibling;
		}

		const procAttr = entry.attr.procAttr!;
		procAttr.nOffset = SavedOffset;
		procAttr.mOffset = SavedOffset + procAttr.level + 1;

		// 继续处理函数声明部分
		while (cur) {
			procDecPart(cur);
			cur = cur.sibling;
		}

		// 处理函数体
		if (node.children[2])
			body(node.children[2]);

		// 函数部分结束，删除进入形参时，新建立的符号表
		destoryTable();
	}

	// 处理函数头的语义分析
	// 其中过程的大小和代码都在以后的语义分析中填写
	function headProcess(node: SymbolNode): SemanticTableItem {
		const item = enter(node.names[0], {
			kind: IdKind.procKind,
			procAttr: {
				level: Level + 1,
				param: null as unknown,
			} as Attribute["procAttr"],
			type: {} as TypeDetail
		});

		item.attr.procAttr!.param = paraDecList(node);

		node.table[0] = item;
		return item;
	}

	// 处理函数头中的参数声明的语义分析
	function paraDecList(node: SymbolNode): SemanticTableItem[] {
		// 进入新的局部化区域
		createTable();

		// 子程序中的变量初始偏移设为8
		Offset = 7;

		// 变量声明部分
		if (node.children[0]) {
			varDecPart(node.children[0] as SymbolNodeDecK);
		}

		return [...Scope[Level]];
	}

	function body(node: SymbolNode) {
		if (node.kind !== SymbolNodeKind.StmLK)
			throw new Error(`[Error] Expected StmLK for body, got ${node.kind} at ${node.line}`);

		let p = node.children[0] as SymbolNode | undefined;
		while (p) {
			statement(p as SymbolNodeStmtK);
			p = p.sibling;
		}
	}

	function statement(node: SymbolNodeStmtK) {
		const stmtKind = node.subKind;
		if (stmtKind === StmtKinds.IfK) {
			ifStatement(node);
		}
		else if (stmtKind === StmtKinds.WhileK) {
			whileStatement(node);
		}
		else if (stmtKind === StmtKinds.AssignK) {
			assignStatement(node);
		}
		else if (stmtKind === StmtKinds.ReadK) {
			readStatement(node);
		}
		else if (stmtKind === StmtKinds.WriteK) {
			writeStatement(node);
		}
		else if (stmtKind === StmtKinds.CallK) {
			callStatement(node);
		}
		else if (stmtKind === StmtKinds.ReturnK) {
			returnStatement(node);
		}
		else {
			throw new Error(`[Error] Unknown statement kind: ${stmtKind} at ${node.line}`);
		}
	}

	function expr(node: SymbolNodeExpK): [TypeDetail, AccessType] {
		if (node.subKind === ExpKinds.ConstK) {
			return [typeProcess(node, DecKinds.IntegerK), AccessType.dir];
		}
		else if (node.subKind === ExpKinds.VariK) {
			if (!node.children[0]) {
				// Var = id的情形
				const entry = lookup(node.names[0]);
				node.table[0] = entry;

				if (entry.attr.kind !== IdKind.varKind) {
					throw new Error(`[Error] Not a variable: ${node.names[0]} at ${node.line}`);
				}
				return [entry.attr.type!, AccessType.indir];
			}
			else {
				if (node.attr.varKind === VarKinds.ArrayMembV) {
					return [arrayVar(node), AccessType.indir];
				}
				else if (node.attr.varKind === VarKinds.FieldMembV) {
					return [recordVar(node), AccessType.indir];
				}
			}
		}
		else if (node.subKind === ExpKinds.OpK) {
			const [child1,] = expr(node.children[0] as SymbolNodeExpK);
			const [child2,] = expr(node.children[1] as SymbolNodeExpK);

			if (compatible(child1, child2)) {
				switch (node.attr.op) {
				case ExpOp.LT:
				case ExpOp.EQ:
					return [BoolDetail, AccessType.dir];
				case ExpOp.PLUS:
				case ExpOp.MINUS:
				case ExpOp.TIMES:
				case ExpOp.OVER:
					return [IntDetail, AccessType.dir];
				default:
					throw new Error(`[Error] Unknown operator: ${node.attr.op} at ${node.line}`);
				}
			}
			else {
				throw new Error(`[Error] Incompatible types at ${node.line}`);
			}
		}

		throw new Error(`[Error] Unknown expression kind: ${node.subKind} at ${node.line}`);
	}

	// 检查var := var0[E]中var0是不是数组类型变量，E是不是和数组的下标变量类型匹配。
	function arrayVar(node: SymbolNode): TypeDetail {
		const entry = lookup(node.names[0]);
		node.table[0] = entry;

		if (entry.attr.kind !== IdKind.varKind) {
			throw new Error(`[Error] Not a variable: ${node.names[0]} at ${node.line}`);
		}

		if (entry.attr.type!.kind !== TypeKind.array) {
			throw new Error(`[Error] Not an array: ${node.names[0]} at ${node.line}`);
		}

		const [index,] = expr(node.children[0] as SymbolNodeExpK);
		const arrayIndex = entry.attr.type.arrayAttr!.indexType;
		if (!compatible(index, arrayIndex)) {
			throw new Error(`[Error] Incompatible array index type at ${node.line}`);
		}

		return entry.attr.type.arrayAttr!.elemType;
	}

	// 分析记录变量的域成员
	// 检查var := var0.id中var0是不是记录类型变量，id是不是该记录类型中的域成员
	function recordVar(node: SymbolNode): TypeDetail {
		const entry = lookup(node.names[0]);

		if (entry.attr.kind !== IdKind.varKind) {
			throw new Error(`[Error] Not a variable: ${node.names[0]} at ${node.line}`);
		}

		if (entry.attr.type!.kind !== TypeKind.record) {
			throw new Error(`[Error] Not a record: ${node.names[0]} at ${node.line}`);
		}

		// 检查id是否是合法域名
		const id = node.children[0].names[0];
		const found = entry.attr.type.recordAttr!.find(attr => attr.id === id);
		if (!found) {
			throw new Error(`[Error] Invalid field name: ${id} at ${node.line}`);
		}

		// id为数组
		if (node.children[0]?.children[0]) {
			return arrayVar(node.children[0] as SymbolNode);
		}

		return found.type;
	}

	// 处理赋值语句分析
	function assignStatement(node: SymbolNodeStmtK) {
		const child1 = node.children[0] as SymbolNodeExpK;
		const child2 = node.children[1] as SymbolNodeExpK;

		let eptr: TypeDetail | undefined = undefined;
		if (!child1.children[0]) {
			const entry = lookup(child1.names[0]);
			if (entry.attr.kind !== IdKind.varKind) {
				throw new Error(`[Error] Not a variable: ${child1.names[0]} at ${node.line}`);
			}
			else {
				eptr = entry.attr.type!;
				child1.table[0] = entry;
			}
		}
		else {
			if (child1.attr.varKind === VarKinds.ArrayMembV) {
				eptr = arrayVar(child1);
			}
			else if (child1.attr.varKind === VarKinds.FieldMembV) {
				eptr = recordVar(child1);
			}
		}

		if (eptr) {
			const ptr = expr(child2);
			if (!compatible(eptr, ptr[0])) {
				throw new Error(`[Error] Incompatible types at ${node.line}`);
			}
		}
	}

	// 处理函数调用语句分析
	function callStatement(node: SymbolNodeStmtK) {
		const entry = lookup(node.children[0].names[0]);
		node.children[0].table[0] = entry;

		// 是否是函数
		if (entry.attr.kind !== IdKind.procKind) {
			throw new Error(`[Error] Not a function: ${node.names[0]} at ${node.line}`);
		}

		// 形实参匹配
		const params = entry.attr.procAttr!.param;
		let arg = node.children[1] as SymbolNodeExpK;

		for (const param of params) {
			if (!arg) {
				throw new Error(`[Error] Too few arguments at ${node.line}`);
			}

			const [type,] = expr(arg);
			if (!compatible(param.attr.type!, type)) {
				throw new Error(`[Error] Incompatible parameter type at ${node.line}`);
			}
			arg = arg.sibling as SymbolNodeExpK;
		}

		if (arg) {
			throw new Error(`[Error] Too many arguments at ${node.line}`);
		}
	}


	function ifStatement(node: SymbolNodeStmtK) {
		const [exp,] = expr(node.children[0] as SymbolNodeExpK);
		if (exp.kind !== TypeKind.bool) {
			throw new Error(`[Error] If expression must be boolean at ${node.line}`);
		}
		else {
			let t = node.children[1] as SymbolNodeStmtK;
			// 处理then部分
			while (t) {
				statement(t);
				t = t.sibling as SymbolNodeStmtK;
			}
			// 处理else部分
			t = node.children[2] as SymbolNodeStmtK;
			while (t) {
				statement(t);
				t = t.sibling as SymbolNodeStmtK;
			}
		}
	}

	function whileStatement(node: SymbolNodeStmtK) {
		const [exp,] = expr(node.children[0]! as SymbolNodeExpK);
		if (exp.kind !== TypeKind.bool) {
			throw new Error(`[Error] While expression must be boolean at ${node.line}`);
		}
		else {
			let t = node.children[1] as SymbolNodeStmtK;
			while (t) {
				statement(t);
				t = t.sibling as SymbolNodeStmtK;
			}
		}
	}

	function readStatement(node: SymbolNodeStmtK) {
		const entry = lookup(node.names[0]);
		node.table[0] = entry;

		if (!entry) {
			throw new Error(`[Error] Undefined identifier: ${node.names[0]} at ${node.line}`);
		}
		else if (entry.attr.kind !== IdKind.varKind) {
			throw new Error(`[Error] Not a variable: ${node.names[0]} at ${node.line}`);
		}
	}

	function writeStatement(node: SymbolNodeStmtK) {
		const [typeDetail,] = expr(node.children[0] as SymbolNodeExpK);
		if (typeDetail.kind === TypeKind.bool) {
			throw new Error(`[Error] Can't write a boolean expression at ${node.line}`);
		}
	}

	function returnStatement(node: SymbolNodeStmtK) {
		if (Level === 0) {
			throw new Error("[Error] Can't return from main");
		}
	}

	function main() {
		// 跳到语法树的声明节点
		let current: SymbolNode | undefined = root.children[1];
		while (current) {
			if (current.kind === SymbolNodeKind.TypeK) {
				// 处理类型声明部分
				typeDecPart(current.children[0] as SymbolNodeDecK);
			}
			else if (current.kind === SymbolNodeKind.VarK) {
				// 处理变量声明部分
				varDecPart(current.children[0] as SymbolNodeDecK);
			}
			else if (current.kind === SymbolNodeKind.ProcDecK) {
				// 处理过程声明部分
				procDecPart(current);
			}
			current = current.sibling;
		}

		if(root.children[2] && root.children[2].kind === SymbolNodeKind.StmLK) {
			body(root.children[2]);
		}

		if(Level != -1){
			destoryTable();
		}
		return debugLog;
	}

	return main();
}