import { LexicalType } from "../lexicon/types";

export enum SymbolNodeKind {
	ProK = "ProK",
	PheadK = "PheadK",
	DecK = "DecK",
	TypeK = "TypeK",
	VarK = "VarK",
	ProcDecK = "ProcDecK",
	StmLK = "StmLK",
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
	VariK = "VariK",
	ProcIdK = "ProcIdK"
}

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
type SymbolNode = SymbolNodeCommon | SymbolSpecificNode;

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
	kind: SymbolNodeKind.ProK | SymbolNodeKind.PheadK | SymbolNodeKind.TypeK | SymbolNodeKind.VarK | SymbolNodeKind.ProcDecK | SymbolNodeKind.StmLK;
}

// 具体节点类型：有具体内容
// 由 DecK, StmtK, ExpK 几种组成
export type SymbolSpecificNode = SymbolNodeDecK | SymbolNodeStmtK | SymbolNodeExpK;

// DeckK 的几种子类型由subKind属性区分
export type SymbolNodeDecK = SymbolNodeDeckCommon | SymbolNodeDeckArray;

// 除了ArrayK之外的DecK节点，因为ArrayK节点具有attr，需要分开定义
export interface SymbolNodeDeckCommon extends SymbolNodeBase{
	kind: SymbolNodeKind.DecK;
	subKind: Omit<DecKinds, DecKinds.ArrayK>; // DecKinds中除了ArrayK的其他类型
}

// ArrayK节点，具有attr属性
export interface SymbolNodeDeckArray extends SymbolNodeBase{
	kind: SymbolNodeKind.DecK;
	subKind: DecKinds.ArrayK;
	attr: {
		low: number;
		high: number;
		child: SymbolNode;
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
	attr: {
		op?: ExpOp;
		val?: number;
		varKind: VarKinds;
		type?: ExpTypes;
	};
}