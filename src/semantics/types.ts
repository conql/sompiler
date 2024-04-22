// 标识符的类型
export enum IdKind{
    typeKind = "typeKind",
    varKind = "varKind",
    procKind = "procKind"
}

// 基本类型
export enum TypeKind{
    integer = "integer",
    char = "char",
    array = "array",
    record = "record",
    bool = "bool"
}

// 对应 TypeIR，类型的内部表示
export interface TypeDetail{
    size: number;   // 类型的大小
    kind: TypeKind; // 基础类型
    // 数组类型所需属性
    arrayAttr?:{
        indexType: TypeDetail;
        elemType: TypeDetail;
        low: number;
        high: number;
    }
    // 记录类型所需属性
    recordAttr?: {
        id: string;
        offset: number;
        type: TypeDetail;
    }[];
}

// 基础类型Int
export const IntDetail: TypeDetail = {
	size: 1,
	kind: TypeKind.integer
};

// 基础类型Char
export const CharDetail: TypeDetail = {
	size: 1,
	kind: TypeKind.char
};

// 基础类型Bool
export const BoolDetail: TypeDetail = {
	size: 1,
	kind: TypeKind.bool
};

// 变量的访问类型，直接访问或间接访问
export enum AccessType {
    dir = "dir",
    indir = "indir"
}

// 标识符的内部表示
export interface Attribute {
    // 标识符的种类：类型、变量、过程
    kind: IdKind;
    // 标识符的类型：整型、字符型、数组、记录
    type: TypeDetail;
    // 变量标识符的属性
    varAttr?: {
        access: AccessType;
        level: number;
        offset: number;
        isParam: boolean;   // 是否是参数
    };
    // 过程标识符的属性
    procAttr?: {
        level: number;
        param: SemanticTableItem[]; // 参数列表
        mOffset: number;    // 过程活动记录的大小
        nOffset: number;    // sp到display的偏移
        procEntry: number;  // 过程入口地址
        codeEntry: number;  // 过程入口标号，用于中间代码生成
    }
}

// 语义分析表项
export interface SemanticTableItem {
    id: string;
    attr: Attribute;
}