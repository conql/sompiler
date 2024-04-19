import { regs } from "./types";


// TM汇编代码生成器
export default class codeEmitter{

    emitLoc: number = 0;    // 当前代码生成地址
    highEmitLoc: number = 0;    // 当前代码生成地址的最大值
    TraceCode: boolean = true;    // 是否输出注释
    code: string[] = [];    // 代码存储

    // 构造函数
    // 注释生成
    emitComment(c: string) {
        if (this.TraceCode) {
            this.code.push(`* ${c}\n`);
        }
    }

    // 寄存器寻址指令生成
    // op: 操作符, rd: 目标寄存器, rs: 源寄存器1, rt: 源寄存器2, c: 注释
    emitRO(op: string, rd: number, rs: number, rt: number, c: string) {
        this.code.push(`${this.emitLoc++}:  ${op}  ${rd},${rs},${rt}`);
        // 输出注释
        if (this.TraceCode) {
            this.code[this.code.length - 1] += `\t*${c}`;
        }
        // 换行
        this.code[this.code.length - 1] += "\n";
        // 更新最大地址
        this.highEmitLoc = Math.max(this.highEmitLoc, this.emitLoc);
    }

    // 基址+偏移寻址指令生成
    // op: 操作符, rt: 目标寄存器, rd: 偏移量, rs: 基址寄存器, c: 注释
    emitRM(op: string, rt: number, rd: number, rs: number, c: string) {
        this.code.push(`${this.emitLoc++}:  ${op}  ${rt},${rd}(${rs})`);
        if (this.TraceCode) {
            this.code[this.code.length - 1] += `\t*${c}`;
        }
        this.code[this.code.length - 1] += "\n";
        this.highEmitLoc = Math.max(this.highEmitLoc, this.emitLoc);
    }

    // 跳转指令生成
    emitSkip(howMany: number): number {
        let i = this.emitLoc;
        this.emitLoc += howMany;
        this.highEmitLoc = Math.max(this.emitLoc, this.highEmitLoc);
        return i;
    }

    // 地址回退
    emitBackup(loc: number) {
        // 回退地址高于最大地址
        if (loc > this.highEmitLoc)
            throw new GenCodeError("Bug in emitBackup");
        this.emitLoc = loc;
    }

    // 恢复地址
    emitRestore() {
        this.emitLoc = this.highEmitLoc;
    }

    // 绝对寻址指令生成
    emitRM_Abs(op: string, rt: number, a: number, c: string) {
        this.code.push(`${this.emitLoc++}:  ${op}  ${rt},${a - (this.emitLoc + 1)}(${regs.pc})`);

        // 输出注释
        if (this.TraceCode) {
            this.code[this.code.length - 1] += `\t*${c}`;
        }
        // 换行
        this.code[this.code.length - 1] += "\n";
        // 更新最大地址
        this.highEmitLoc = Math.max(this.highEmitLoc, this.emitLoc);
    }
}
