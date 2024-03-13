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

export interface ArrayAttr {
	type: "Array";
}

export interface ProcAttr {
	type: "Proc";
}

export interface ExpAttr {
	type: "Exp";
}

export class SymbolNode {
	constructor(
		public kind: SymbolNodeKind,
		public children: SymbolNode[],
		public line: number,
		public names: string[],
		public attr: ArrayAttr | ProcAttr | ExpAttr| null = null
	) {

	}
}
