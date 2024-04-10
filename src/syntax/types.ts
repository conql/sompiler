import { LexicalType } from "../lexicon/types";

// 语法树节点类型
export enum SymbolNodeKind {
	// 标志节点
	ProK = "ProK",
	PheadK = "PheadK",
	TypeK = "TypeK",
	VarK = "VarK",
	ProcDecK = "ProcDecK",
	StmLK = "StmLK",
	// 具体节点
	DecK = "DecK",
	StmtK = "StmtK",
	ExpK = "ExpK"
}

export enum DecKinds {
	ArrayK = "ArrayK",
	CharK = "CharK",
	IntegerK = "IntegerK",
	RecordK = "RecordK",
	IdK = "IdK"
}

export enum StmtKinds {
	IfK = "IfK",
	WhileK = "WhileK",
	AssignK = "AssignK",
	ReadK = "ReadK",
	WriteK = "WriteK",
	CallK = "CallK",
	ReturnK = "ReturnK"
}

export enum ExpKinds {
	OpK = "OpK",
	ConstK = "ConstK",
	VariK = "VariK"
}

/* 变量类型VarKind类型的枚举定义:           *
 * 标识符IdV,数组成员ArrayMembV,域成员FieldMembV*/
export enum VarKinds {
	IdV = "IdV",
	ArrayMembV = "ArrayMembV",
	FieldMembV = "FieldMembV"
}

export enum ExpOp{
	LT = LexicalType.LT,
	EQ = LexicalType.EQ,
	PLUS = LexicalType.PLUS,
	MINUS = LexicalType.MINUS,
	TIMES = LexicalType.TIMES,
	OVER = LexicalType.OVER
}

/* 表达式类型ExpKind类型的枚举定义:         *
 * 操作类型OpK,常数类型ConstK,变量类型VarK */
export enum ExpTypes {
	Void = "Void",
	Integer = "Integer",
	Boolean = "Boolean",
}

export enum ParamTypes {
	VarParamType = "VarParamType",
	ValueParamType = "ValueParamType"
}

// SymbolNode类型：要么是标志节点类型，要么是具体节点类型
export type SymbolNode = SymbolNodeCommon | SymbolSpecificNode;

// 所有节点共有的基本属性
export interface SymbolNodeBase{
	line: number; //节点所在行号，对应文档中lineno
	children: SymbolNode[]; //节点的子节点
	sibling?: SymbolNode; //节点的兄弟节点
	kind: unknown; //节点的主要类型，对应文档中nodeKind属性，为SymbolNodeKind类型，目前设置为unknown，以便后续区分定义
	names: string[]; //数组成员是节点中的标志符的名字
	table: unknown; //节点中的各个标志符在符号表中的入口，没看懂怎么定义，先设置为unknown
}

// 标志节点类型：无具体内容，只有kind属性
// ProK, PheadK, TypeK, VarK, ProcDecK, StmLK
export interface SymbolNodeCommon extends SymbolNodeBase{
	// 标志节点类型中，kind属性为SymbolNodeKind中的几种类型
	kind: SymbolNodeKind.ProK | SymbolNodeKind.PheadK | SymbolNodeKind.TypeK | SymbolNodeKind.VarK | SymbolNodeKind.ProcDecK | SymbolNodeKind.StmLK;
	// 当kind为ProcDecK时，attr属性存在
	attr?: {
		paramt?: ParamTypes;
	};
}

// 具体节点类型：有具体内容
// 由 DecK, StmtK, ExpK 几种组成
export type SymbolSpecificNode = SymbolNodeDecK | SymbolNodeStmtK | SymbolNodeExpK;

export interface SymbolNodeDecK extends SymbolNodeBase{
	kind: SymbolNodeKind.DecK;
	// DecK的子类型由subKind属性区分，有ArrayK, CharK, IntegerK, RecordK, IdK
	subKind: DecKinds;
	// 当subKind为ArrayK时，attr属性存在
	attr?: {
		low?: number;	// 数组下界
		high?: number;	//	数组上界
		childType?: DecKinds;	// 记录数组的成员类型
	};
}

// StmtK 的几种子类型由subKind属性区分，对应文档中kind属性
export interface SymbolNodeStmtK extends SymbolNodeBase{
	kind: SymbolNodeKind.StmtK;
	subKind: StmtKinds;
}

// ExpK 的几种子类型由subKind属性区分，对应文档中kind属性
export interface SymbolNodeExpK extends SymbolNodeBase{
	kind: SymbolNodeKind.ExpK;
	subKind: ExpKinds;
	attr?: {
		op?: ExpOp;
		val?: number;
		varKind?: VarKinds;
		type?: ExpTypes;
	};
}