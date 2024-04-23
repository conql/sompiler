import { VarKinds, ExpOp, SymbolNode, SymbolNodeCommon, SymbolNodeKind, SymbolNodeStmtK, StmtKinds, ExpKinds, SymbolNodeExpK, SymbolNodeDecK } from "../syntax/types";
import codeEmitter from "./emitter";
import { regs } from "./types";
import { AccessType, SemanticTableItem, TypeDetail } from "../semantics/types";
import { MainOffset } from "../semantics/parser";
// SNL目标代码生成程序
export default function codeGenerator(root: SymbolNodeCommon) {
	// node : SymbolNodeKind.ProcDecK

	const emitter = new codeEmitter();    // 代码生成器
	let tmpOffset: number = 0;    // 临时变量偏移量


	const Off: number = 0;    // 在同层的变量便宜
	
	const savedOff: number = 0;    // 当前层的displayoFF


	// findSP，找到该变量所在AR的sp
	function findSp(varLevel: number) {
		// 先求变量在AR中的位置，varLevel为变量所在层
		emitter.emitRM("LDA", regs.ac1, varLevel, regs.displayOff, "var process");
		// ac1中存储的是变量所在层的displayOff
		emitter.emitRO("ADD", regs.ac1, regs.ac1, regs.sp, "var absolute address");
		// ac1中存储的是变量所在层的sp
		emitter.emitRM("LD", regs.ac1, 0, regs.ac1, "var sp");
	}

	// findAdd函数，计算基本类型变量、域变量或下标变量的绝对偏移，结果存到ac中
	function findAdd(node: SymbolNode) {
		let Loc: number;
		let varLevel: number;
		let fieldMem: TypeDetail;

		node = node as SymbolNodeExpK;
		if (node) {

			/*得到该变量在符号表中的地址*/
			Loc = node.table[0].attr.varAttr!.offset!;

			/*记录该变量所在层*/
			varLevel = node.table[0].attr.varAttr!.level!;

			/*可能是下标类型或者域类型或者是基本变量类型,把地址取出送入ac*/

			/*普通变量*/
			if (!node.children[0]) {
				emitter.emitRM("LDC", regs.ac, Loc, 0, " base type var relative address");
			}
			/*数组类型变量*/
			else if (node.attr.varKind == VarKinds.ArrayMembV) {
				/*将数组下标值送入ac中*/
				cGen(node.children[0]);

				/*数组下届存入ac1中*//*attr.ArrayAttr.low*/
				emitter.emitRM("LDC", regs.ac1, node.table[0].attr.type.arrayAttr!.low, 0, "array low bound");

				/*要用ac减去数组下届*/
				emitter.emitRO("SUB", regs.ac, regs.ac, regs.ac1, "");

				/*求出该数组变量的偏移*/
				emitter.emitRM("LDA", regs.ac, Loc, regs.ac, " array type var relative address");

			}
			/*记录类型变量*/
			else if (node.attr.varKind == VarKinds.FieldMembV) {
				/*处理域变量的偏移*/
				fieldMem!.recordAttr!= node.table[0].attr.type.recordAttr!;
				// fieldMem = t -> table[0] -> attrIR.idtype -> More.body;

				/*在域表中查找该域变量*/
				let ind: number = 0;
				while (ind < fieldMem!.recordAttr!.length) {
					if (node.children[0].names[0] == fieldMem!.recordAttr![ind].id)
						// 相等
						break;
					else
						// 不相等
						ind++;
				}
				/*域变量为基本类型变量*/
				if (!node.children[0].children[0]) {
					emitter.emitRM("LDC", regs.ac, Loc, 0, "");
					emitter.emitRM("LDA", regs.ac, fieldMem!.recordAttr![ind].offset, regs.ac, "field type var relative address");
					/*此时ac中存放的是相对偏移*/
				}

				/*域变量是数组变量的情况*/
				else {
					genExp(node.children[0].children[0] as SymbolNodeExpK);

					// 这里的as可能有错误
					const t = node.children[0] as SymbolNodeDecK;
					emitter.emitRM("LDC", regs.ac1, t.attr!.low!, 0, "array low");
					/*数组下标减去下界*/
					emitter.emitRO("SUB", regs.ac, regs.ac, regs.ac1, "");
					emitter.emitRM("LDA", regs.ac, fieldMem!.recordAttr![ind].offset, regs.ac, "");

					emitter.emitRM("LDA", regs.ac, Loc, regs.ac, "");

				}/*ac中存储的是域变量的在当前AR的偏移*/
			}

			/*计算该变量的sp*/
			findSp(varLevel);
			/******找到sp*****************/

			/* 计算绝对偏移 */
			emitter.emitRO("ADD", regs.ac, regs.ac, regs.ac1, " var absolute off");

		}

	}


	// 根据语法树节点产生stmt语句代码
	function genStmt(node: SymbolNodeStmtK) {
		// node SymbolNodeStmtK 传入具体的stmt节点
		let ss: number;    // 用于控制转移display表的各项sp值
		let savedLoc1, savedLoc2, currentLoc: number;    // 记录跳转回填地址
		let p0, p1, pp, p2: SymbolNode;    // 用于遍历子节点
		// let entry: SemanticTableItem;
		let formParam: number;    // 用于记录形参个数
		// let fieldMem: TypeDetail;    // 用于记录域成员
		// 对应 ParamTalbe * curParam = NULL;
		let curParam: SemanticTableItem[];  // 指向实参的指针

		switch (node.subKind) {

			/*处理if语句*/
			case StmtKinds.IfK:
				if (emitter.TraceCode)
					emitter.emitComment("----if语句----");
				p0 = node.children[0];  // 条件表达式
				p1 = node.children[1];  // then语句序列
				p2 = node.children[2];  // else语句序列

				emitter.emitComment("if: 生成条件表达式代码");
				cGen(p0);   // 生成测试表达式代码

				savedLoc1 = emitter.emitSkip(1);    // 保存跳转地址
				emitter.emitComment("if: 保留回填语句地址 = " +savedLoc1+" 该语句应当跳转到else后内容");


				emitter.emitComment("if: 生成then语句序列代码");
				cGen(p1);   // 生成then语句序列代码
				emitter.emitComment("if: 生成then语句序列代码结束");

				savedLoc2 = emitter.emitSkip(1);    // 保存跳转地址
				emitter.emitComment("if: 保留回填语句地址 = " +savedLoc2+" 该语句应当跳转到end后内容");

				// *********************************
				//	源代码中为 emitter.emitRM_Abs("JEQ", regs.ac, currentLoc, "if: jmp to else");
				//	经过分析，如果为0，导致跳转地址为end语句，而不是else的第一句
				//	所以修改为 emitter.emitRM_Abs("JEQ", regs.ac, currentLoc+1, "if: jmp to else");
				// *********************************

				currentLoc = emitter.emitSkip(0);    // 获取当前地址，为else后面第一句内容
				emitter.emitBackup(savedLoc1);    // 回填跳转地址，返回saveLoc1，填写跳转
				
				emitter.emitRM_Abs("JEQ", regs.ac, currentLoc+1, "if: jmp to else");
				emitter.emitRestore();  // 返回到当前位置

				emitter.emitComment("if: 生成else语句序列代码");
				cGen(p2);   // 生成else语句序列代码
				currentLoc = emitter.emitSkip(0);    // 获取当前地址
				emitter.emitBackup(savedLoc2);    // 回填跳转地址
				emitter.emitRM_Abs("LDA", regs.pc, currentLoc, "jmp to end");
				emitter.emitRestore();  // 返回到当前位置
				if (emitter.TraceCode)
					emitter.emitComment("----if语句结束----");
				break;

			/*处理while语句*/
			case StmtKinds.WhileK:
				if (emitter.TraceCode)
					emitter.emitComment("----while语句----");
				p0 = node.children[0];  // 条件表达式
				p1 = node.children[1];  // 循环体
				currentLoc = emitter.emitSkip(0);    // 获取当前地址
				cGen(p0);   // 生成测试表达式代码
				// 如果条件表达式为假，则跳转至while语句结束，此处为地址回填预留一个指令空间
				savedLoc1 = emitter.emitSkip(1);
				emitter.emitComment("while: jump out while");
				cGen(p1);   // 生成循环体代码
				emitter.emitRM("LDC", regs.pc, currentLoc, 0, "jmp back to test");
				emitter.emitComment("return to condition expression");
				currentLoc = emitter.emitSkip(0);    // 获取当前地址
				emitter.emitBackup(savedLoc1);    // 回填跳转地址
				emitter.emitRM_Abs("JEQ", regs.ac, currentLoc, "while: jmp out while");
				emitter.emitRestore();  // 返回到当前位置
				if (emitter.TraceCode)
					emitter.emitComment("----赋值语句结束----");
				break;

			/*处理赋值语句*/
			case StmtKinds.AssignK:
				if (emitter.TraceCode)
					emitter.emitComment("----赋值语句----");
				p0 = node.children[0];  // 左值
				p1 = node.children[1];  // 右值

				findAdd(p0);  // 生成左边变量，绝对地址结果存到ac中

				emitter.emitRM("LDA", regs.ac2, 0, regs.ac, "保存ac");  // 把ac的值保存到ac2中

				cGen(p1);   // 生成右值代码，结果存到ac中
				if (p0.table[0].attr.varAttr?.access == AccessType.dir) {
					// [ac2] = ac
					emitter.emitRM("ST", regs.ac, 0, regs.ac2, "dir");  //把ac的值存到ac2中
				} else {
					// 先取得变量的实际存储位置ac2，再把ac的值存到ac2中
					emitter.emitRM("LD", regs.ac2, 0, regs.ac2, "indir");
					emitter.emitRM("ST", regs.ac, 0, regs.ac2, "indir");
				}
				if (emitter.TraceCode)
					emitter.emitComment("----赋值语句结束----");
				break;

			/*处理输入语句*/
			case StmtKinds.ReadK:
				if (emitter.TraceCode)
					emitter.emitComment("----读语句----");

				emitter.emitRO("IN", regs.ac, 0, 0, "读一个整数");
				emitter.emitRM("LDA", regs.ac2, 0, regs.ac, "保存ac到ac2中");
				findAdd(node);    // 计算变量的绝对偏移，结果存到ac中
				if (node.table[0].attr.varAttr?.access == AccessType.dir) {
					// 直接存入
					emitter.emitRM("ST", regs.ac2, 0, regs.ac, "dir 存入值");
				}
				else {
					// 先取得实际位置，放入ac1
					emitter.emitRM("LD", regs.ac1, 0, regs.ac, "indir");
					emitter.emitRM("ST", regs.ac2, 0, regs.ac1, "存入值");
				}
				if (emitter.TraceCode)
					emitter.emitComment("----读语句结束----");
				break;

			/* 处理写语句 */
			case StmtKinds.WriteK:
				if (emitter.TraceCode)
					emitter.emitComment("----写语句----");
				p0 = node.children[0];
				cGen(p0);   // 生成表达式代码
				emitter.emitRO("OUT", regs.ac, 0, 0, "输出整数");
				if (emitter.TraceCode)
					emitter.emitComment("----写语句结束----");
				break;

			/* 处理过程调用语句 */
			case StmtKinds.CallK:
				p0 = node.children[0];  // 过程名
				p1 = node.children[1];  // 实参列表
				pp = p0;
				if (emitter.TraceCode)
					emitter.emitComment("----过程调用----");
				// 参数传递

				// curParam 保存了形参表
				curParam = pp.table[0].attr.procAttr!.param;

				let ind: number = 0;
				// p1 是实参列表
				while (ind < curParam.length && p1) {
					// 形参的偏移量
					formParam = curParam[ind].attr.varAttr!.offset;

					// 形参是 indir
					if (curParam[ind].attr.varAttr!.access == AccessType.indir)
						// 实参是值参 dir
						if (p1.table[0].attr.varAttr!.access == AccessType.dir) {
							findAdd(p1);    // 计算实参的绝对地址，结果存到ac中
							// 将实参地址传入currentAR的形参单元中
							emitter.emitRM("ST", regs.ac, formParam, regs.top, "存入 actParam");
						}
						else {
							// 实参是变量 此时将实参的单元内容传送入currentAR的行参单元中
							findAdd(p1);    // 计算实参的绝对地址，结果存到ac中
							emitter.emitRM("LD", regs.ac, 0, regs.ac, "取实参地址");
							emitter.emitRM("ST", regs.ac, formParam, regs.top, "存入 actParam");
						}
					else {
						// 形参是dir
						p1 = p1 as SymbolNodeExpK;
						switch (p1.subKind) {
							// 数值或表达式，直接送值
							case ExpKinds.OpK:
							case ExpKinds.ConstK:
								// ac中存有表达式的值
								genExp(p1);
								emitter.emitRM("ST", regs.ac, formParam, regs.top, "formal and act link");
								break;
							// 变量，送地址
							case ExpKinds.VariK:
								findAdd(p1);    // 计算实参的绝对地址，结果存到ac中
								formParam = curParam[ind].attr.varAttr?.offset!; // 形参的偏移量
								// 变量是dir
								if (p1.table[0].attr.varAttr?.access == AccessType.dir) {
									// ac是绝对地址，先找到其存储单元
									emitter.emitRM("LD", regs.ac2, 0, regs.ac, "dir");
									emitter.emitRM("ST", regs.ac2, formParam, regs.top, "formal and act link");
								}
								else {
									// 变量是indir，以ac中内容为绝对地址放到ac2，再以ac2中内容作为绝对地址
									emitter.emitRM("LD", regs.ac2, 0, regs.ac, "indir");
									emitter.emitRM("LD", regs.ac2, 0, regs.ac2, "");
									emitter.emitRM("ST", regs.ac2, formParam, regs.top, "formal and act link");
								}
								break;
						}// switch
					}// else
					ind++;
					p1 = p1.sibling!;
				}// while

				// 进入子程序入口

				// 保存旧sp
				emitter.emitRM("ST", regs.sp, 0, regs.top, "保存旧sp");
				// 保存寄存器
				emitter.emitRM("ST", regs.ac, 3, regs.top, "保存ac");
				emitter.emitRM("ST", regs.ac1, 4, regs.top, "保存ac1");
				emitter.emitRM("ST", regs.ac2, 5, regs.top, "保存ac2");
				emitter.emitRM("ST", regs.displayOff, 6, regs.top, "保存displayOff");
				// 新的displayOff
				emitter.emitRM("LDC", regs.displayOff, pp.table[0].attr.procAttr!.nOffset, 0, "新的displayOff");

				//保存返回地址
				savedLoc1 = emitter.emitSkip(2);

				/// 过程层数
				emitter.emitRM("LDC", regs.ac1, pp.table[0].attr.procAttr!.level, 0, "保存过程层数");
				emitter.emitRM("ST", regs.ac1, 2, regs.top, "");

				// 移动display表
				for (ss = 0; ss < pp.table[0].attr.procAttr!.level; ss++) {
					emitter.emitRM("LD", regs.ac2, 6, regs.top, "取原来的displayOff");//取原来的displayOff，存入ac2
					/*ss要加上当前nOff才是对于sp的偏移*/
					emitter.emitRM("LDA", regs.ac2, ss, regs.ac2, " old display item");
					/*regs.ac2中为绝对地址*/
					emitter.emitRO("ADD", regs.ac2, regs.ac2, regs.sp, "");
					/*取当前AR中display表的的第ss项,存入ac1中*/
					emitter.emitRM("LD", regs.ac1, 0, regs.ac2, " fetch display table item");

					/*当前AR的displayOff*/
					emitter.emitRM("LDA", regs.ac2, ss, regs.displayOff, " current display item");
					/*regs.ac2中为绝对地址*/
					emitter.emitRO("ADD", regs.ac2, regs.ac2, regs.top, "");
					/*将ac1中的内容送入regs.ac2所指地址中*/
					emitter.emitRM("ST", regs.ac1, 0, regs.ac2, " send display table item");
				}
				/*在display表中的最上层填写本层的sp*/
				/*ac2中存储的为display表最上层的相对off*/
				emitter.emitRM("LDA", regs.ac2, pp.table[0].attr.procAttr!.level, regs.displayOff, " current sp in display");
				emitter.emitRO("ADD", regs.ac2, regs.top, regs.ac2, " absolute off");
				emitter.emitRM("ST", regs.top, 0, regs.ac2, " input value");
				/*修改sp和top*/
				emitter.emitRM("LDA", regs.sp, 0, regs.top, " new sp value");
				emitter.emitRM("LDA", regs.top, pp.table[0].attr.procAttr!.mOffset, regs.top, " new top value");

				/*回填返回地址*/
				currentLoc = emitter.emitSkip(0) + 1;
				emitter.emitBackup(savedLoc1);
				emitter.emitRM("LDC", regs.ac1, currentLoc, 0, " save return address");
				emitter.emitRM("ST", regs.ac1, 1, regs.top, "");
				emitter.emitRestore();

				/*转向子程序*/
				emitter.emitRM("LDC", regs.pc, pp.table[0].attr.procAttr!.procEntry, 0, " procedure entry ");

				// 子程序出口

				/*恢复寄存器值*/
				emitter.emitRM("LD", regs.ac, 3, regs.sp, " resume ac");
				emitter.emitRM("LD", regs.ac1, 4, regs.sp, " resume ac1");
				emitter.emitRM("LD", regs.ac2, 5, regs.sp, " resume ac2");
				emitter.emitRM("LD", regs.displayOff, 6, regs.sp, " resume nOff");

				/*恢复sp和top值*/
				emitter.emitRM("LDA", regs.top, 0, regs.sp, " resume top");
				emitter.emitRM("LD", regs.sp, 0, regs.sp, " resume sp");

				break;
			case StmtKinds.ReturnK:
				break;
			default:
				break;
		}// switch
	}// genStmt


	// 根据语法树节点产生exp表达式代码
	function genExp(node: SymbolNodeExpK) {
		/* 语法树节点各个子节点 */
		let p1: SymbolNode;
		let p2: SymbolNode;

		/* 对语法树节点的表达式类型细分处理 */
		switch (node.subKind) {

			/* 语法树节点tree为ConstK表达式类型 */
			case ExpKinds.ConstK:

				/* 如果代码生成追踪标志TraceCode为TRUE,写入注释,常数部分开始 */
				if (emitter.TraceCode) emitter.emitComment("-> 语法树节点 常量 Const");

				/* 生成载入常量指令,载入常量到累加器ac */
				emitter.emitRM("LDC", regs.ac, node.attr.val!, 0, "load const");

				/* 如果代码生成追踪标志TraceCode为TRUE,写入注释,常数部分结束 */
				if (emitter.TraceCode) emitter.emitComment("<- Const");
				break;


			/* 语法树节点tree为IdK表达式类型 */
			case ExpKinds.VariK:
				/* 如果代码生成追踪标志TraceCode为TRUE,写入注释,标注标识符开始 */
				if (emitter.TraceCode) emitter.emitComment("-> 语法树节点 标识符 Id");

				findAdd(node);
				/*其中ac返回的是基本类型变量、域变量或下标变量的绝对偏移*/

				if (node.table[0].attr.varAttr?.access == AccessType.indir) {
					/*地址*/
					/*取值，作为地址*/
					emitter.emitRM("LD", regs.ac1, 0, regs.ac, "indir load id value");
					/*ac1中为地址值*/

					/*按地址取单元内容*/
					emitter.emitRM("LD", regs.ac, 0, regs.ac1, "");
				}
				else {
					/*值*/
					/* 写入数值载入指令,载入变量标识符的值*/
					emitter.emitRM("LD", regs.ac, 0, regs.ac, "load id value");
				}
				/* 如果代码生成追踪标志TraceCode为TRUE,写入注释,标注标识符结束 */

				if (emitter.TraceCode) emitter.emitComment("<- Id");
				break;


			/* 语法树节点tree为OpK表达式类型 */
			case ExpKinds.OpK:

				/* 如果代码生成追踪标志TraceCode为TRUE,写入注释,标注操作开始 */
				if (emitter.TraceCode) emitter.emitComment("-> 语法树节点 操作符 OP");

				/* 语法树节点tree第一子节点为左操作数,赋给p1 */
				p1 = node.children[0];

				/* 语法树节点tree第二子节点为右操作数,赋给p2 */
				p2 = node.children[1];

				/* 对第一子节点递归调用函数cGen(),为左操作数生成目标代码 */
				cGen(p1);

				/* 生成单元设置指令,在临时数据存储区中压入左操作数 */
				emitter.emitRM("ST", regs.ac, tmpOffset--, regs.mp, "op: push left");

				/* 对第二子节点递归调用函数cGen(),为右操作数生成目标代码 */
				cGen(p2);

				/* 生成数值载入指令,从临时数据存储区中载入左操作数 */
				emitter.emitRM("LD", regs.ac1, ++tmpOffset, regs.mp, "op: load left");

				/* 对语法树节点t的成员运算符attr.op分类处理 */
				switch (node.attr.op) {

					/* 语法树节点成员运算符为PLUS,生成加法指令 */
					case ExpOp.PLUS:
						emitter.emitRO("ADD", regs.ac, regs.ac1, regs.ac, "op +");
						break;

					/* 语法树节点成员运算符为MINUS,生成减法指令 */
					case ExpOp.MINUS:
						emitter.emitRO("SUB", regs.ac, regs.ac1, regs.ac, "op -");
						break;

					/* 语法树节点成员操作符为TIMES,写入乘法指令 */
					case ExpOp.TIMES:
						emitter.emitRO("MUL", regs.ac, regs.ac1, regs.ac, "op *");
						break;

					/* 语法树节点成员操作符为OVER,写入除法指令 */
					case ExpOp.OVER:
						emitter.emitRO("DIV", regs.ac, regs.ac1, regs.ac, "op /");
						break;


					/* 语法树节点成员操作符为LT,写入相应的指令序列 */

					/* 如果为真，结果为1；否则结果为0 */
					case ExpOp.LT:

						/* 写入减指令,将(左-右)操作数相减,结果送累加器ac */
						emitter.emitRO("SUB", regs.ac, regs.ac1, regs.ac, "op 小于判断");

						/* 写入判断跳转指令,如果累加器ac的值小于0, *
										 * 则代码指令指示器跳过两条指令    */
						emitter.emitRM("JLT", regs.ac, 2, regs.pc, "真：跳过2指令");

						/* 写入载入常量指令,将累加器ac赋值为0 */
						emitter.emitRM("LDC", regs.ac, 0, regs.ac, "假：");

						/* 写入数值载入指令,代码指令指示器pc跳过下一条指令 */
						emitter.emitRM("LDA", regs.pc, 1, regs.pc, "跳转");

						/* 写入载入常量指令,将累加器ac赋值为1 */
						emitter.emitRM("LDC", regs.ac, 1, regs.ac, "真：");
						break;


					/* 语法树节点成员操作符为EQ,写入相应的指令序列 */
					/* 如果为真，结果为1；否则结果为0 */
					case ExpOp.EQ:

						/* 写入减法指令,将左,右操作数相减,结果送累加器ac */
						emitter.emitRO("SUB", regs.ac, regs.ac1, regs.ac, "op ==");

						/* 写入判断跳转指令,如果累加器ac等于0, *
										 * 代码指令指示器pc跳过两条指令   */
						emitter.emitRM("JEQ", regs.ac, 2, regs.pc, "br if true");

						/* 写入载入常量指令,将累加器ac赋值为0 */
						emitter.emitRM("LDC", regs.ac, 0, regs.ac, "false case");

						/* 写入数值载入指令,代码指令指示器pc跳过一条指令 */
						emitter.emitRM("LDA", regs.pc, 1, regs.pc, "unconditional jmp");

						/* 写入载入常量指令,将累加器ac赋值为1 */
						emitter.emitRM("LDC", regs.ac, 1, regs.ac, "true case");
						break;

					/* 其他未知运算符,写入注释,标注未知运算符信息 */
					default:
						emitter.emitComment("BUG: Unknown operator");
						break;

				}

				/* 如果代码生成追踪标志TraceCode为TRUE,写入注释信息,标注操作结束 */
				if (emitter.TraceCode) emitter.emitComment("<- Op");
				break;

			default:
				break;
		}
	}

	// 处理过程声明部分的代码生成，过程信息表中填写过程入口地址
	function genProc(node: SymbolNode) {
		let currentLoc: number;    // 过程入口地址
		let savedLoc1: number;    // 目标代码的第一条指令地址

		currentLoc = emitter.emitSkip(0);   // 获取当前地址
		// 过程信息表中填写过程入口地址
		node.table[0].attr.procAttr!.procEntry = currentLoc;

		if (emitter.TraceCode) {
			emitter.emitComment("----过程" + node.table[0].id + "----");
		}

		// 过程体代码生成
		let p1 = node.children[1];
		let p2 = node.children[2];

		while (p1) {
			if (p1.kind == SymbolNodeKind.ProcDecK) {
				savedLoc1 = emitter.emitSkip(1);
				genProc(p1);
				// 回填指令执行地址
				currentLoc = emitter.emitSkip(0);
				emitter.emitBackup(savedLoc1);
				emitter.emitRM("LDA", regs.pc, currentLoc, 0, "过程" + p1.table[0].id + "入口");
				emitter.emitRestore();
			}
			p1 = p1.sibling!;
		}

		if (p2)
			p2 = p2.children[0];
		while (p2) {
			genStmt(p2 as SymbolNodeStmtK);
			p2 = p2.sibling!;
		}

		// 退出AR，把sp+1的值放到pc中
		emitter.emitRM("LD", regs.ac2, 1, regs.sp, "退出AR");
		emitter.emitRM("LDA", regs.pc, 0, regs.ac2, "");
		if (emitter.TraceCode) {
			emitter.emitComment("----过程" + node.table[0].id + "结束----");
		}
	}

	// 遍历语法树，根据语法树类型，递归生成目标代码
	function cGen(node: SymbolNode) {
		if (node) {
			switch (node.kind) {
				case SymbolNodeKind.StmtK:
					genStmt(node);
					break;
				case SymbolNodeKind.ExpK:
					genExp(node);
					break;

				default:
					break;
			}
			cGen(node.sibling!);
		}
	}

	// codeGen 入口，通过遍历语法树产生目标代码文件
	function main() {
		let currentLoc: number;    // 主程序入口地址
		let savedLoc: number;    // 目标代码的第一条指令地址

		emitter.TraceCode = true;
		emitter.emitComment("SNL目标代码");
		emitter.emitComment("标准预备工作:");
		// 从0地址处载入最大地址值，赋值给mp
		emitter.emitRM("LD", regs.mp, 0, regs.ac, "从0地址处载入最大地址值");
		// 清空0地址单元内容
		emitter.emitRM("ST", regs.ac, 0, regs.ac, "清空0地址单元内容");
		emitter.emitComment("预备工作结束");

		// node == SymbolNodeKind.ProK
		let t1 = root.children[1];
		// 为主程序入口留一个跳转语句
		savedLoc = emitter.emitSkip(1);

		// 处理过程声明
		while (t1) {
			if (t1.kind == SymbolNodeKind.ProcDecK)
				genProc(t1);
			t1 = t1.sibling!;
		}

		// 回填主程序入口
		currentLoc = emitter.emitSkip(0);
		emitter.emitBackup(savedLoc);
		emitter.emitRM("LDA", regs.pc, currentLoc, 0, "主程序入口");
		// 返回到当前位置
		emitter.emitRestore();

		emitter.emitComment("----主程序----");
		// 处理主程序，有全局变量、display表需要填写

		// 初始化寄存器
		emitter.emitRM("LDC", regs.ac, 0, 0, "将ac置0");
		emitter.emitRM("LDC", regs.ac1, 0, 0, "将ac1置0");
		emitter.emitRM("LDC", regs.ac2, 0, 0, "将ac2置0");
		// sp
		emitter.emitRM("ST", regs.ac, 0, regs.sp, "将sp置0");
		// 确定displayOff
		emitter.emitRM("LDA", regs.displayOff, MainOffset, regs.sp, "mian displayOff");
		// 填写display表，只有主程序本层的sp(0)
		emitter.emitRM("ST", regs.ac, 0, regs.displayOff, "main display");
		// 填写top
		emitter.emitRM("LDA", regs.top, 1, regs.displayOff, "main top");

		// 主程序体代码生成
		let t2 = root.children[2].children[0];
		if (t2)
			cGen(t2);

		// 处理完毕主程序，退出AR
		emitter.emitComment("----主程序结束----");
		emitter.emitRO("HALT", 0, 0, 0, "");
		return emitter.code;
	}

	return main();
}