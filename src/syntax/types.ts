export enum SymbolNodeKind {
	None = "None",
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

export enum DecKind{
	ArrayK = "ArrayK",
	CharK = "CharK",
	IntegerK = "IntegerK",
	RecordK = "RecordK",
	Idk = "Idk"
}

export enum StmtKind{
	IfK = "IfK",
	WhileK = "WhileK",
	AssignK = "AssignK",
	ReadK = "ReadK",
	WriteK = "WriteK",
	CallK = "CallK",
	ReturnK = "ReturnK"
}

export enum ExpKind{
	OpK = "OpK",
	ConstK = "ConstK",
	VariK = "VariK",
	ProcIdK = "ProcIdK"
}

export enum VarKind{
	IdV = "IdV",
	ArrayMembV = "ArrayMembV",
	FieldMembV = "FieldMembV"
}

export enum ExpType{
	Void = "Void",
	Integer = "Integer",
	Boolean = "Boolean",
}

export enum ParamType{
	ValueParamType = "ValueParamType",
	VarParamType = "VarParamType"
}

// 数组属性
export interface ArrayAttr {
	type: "Array";
}

// 过程属性
export interface ProcAttr {
	type: "Proc";
}

// 表达式属性
export interface ExpAttr {
	type: "Exp";
}

//type_name 类型名
export interface type_name {
	type: "type_name";
}

export class SymbolNode {
	constructor(
		public nodeKind: SymbolNodeKind,	// 节点类型
		public kind: DecKind | StmtKind | ExpKind | VarKind | null,	// 具体类型
		public children: SymbolNode[],
		public sibling: SymbolNode | null,
		public line: number,
		public names: string[],
		public attr: ArrayAttr | ProcAttr | ExpAttr| type_name | null = null
	) {

	}
}
