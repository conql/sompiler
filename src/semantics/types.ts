export enum IdKind{
    typeKind = "typeKind",
    varKind = "varKind",
    procKind = "procKind"
}

export enum TypeKind{
    integer = "integer",
    char = "char",
    array = "array",
    record = "record",
    bool = "bool"
}

// 对应 TypeIR
export interface TypeDetail{
    size: number;
    kind: TypeKind;
    arrayAttr?:{
        indexType: TypeDetail;
        elemType: TypeDetail;
        low: number;
        high: number;
    }
    recordAttr?: {
        id: string;
        offset: number;
        type: TypeDetail;
    }[];
}

export const IntDetail: TypeDetail = {
	size: 1,
	kind: TypeKind.integer
};

export const CharDetail: TypeDetail = {
	size: 1,
	kind: TypeKind.char
};

export const BoolDetail: TypeDetail = {
	size: 1,
	kind: TypeKind.integer
};

export enum AccessType {
    dir = "dir",
    indir = "indir"
}

export interface Attribute {
    kind: IdKind;
    type: TypeDetail;
    varAttr?: {
        access: AccessType;
        level: number;
        offset: number;
        isParam: boolean;
    };
    procAttr?: {
        level: number;
        param: SemanticTableItem[];
        mOffset: number;
        nOffset: number;
        procEntry: number;
        codeEntry: number;
    }
}

export interface SemanticTableItem {
    id: string;
    attr: Attribute;
}
