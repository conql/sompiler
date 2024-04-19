import { SymbolNode } from "../syntax/types";
import codeEmitter from "./emitter";
import { regs } from "./types";
import { SymbolNodeKind } from "../syntax/types";


// SNL目标代码生成程序
export default function codeGenerator(node: SymbolNode) {
    // node : 语法树根节点

    let emitter = new codeEmitter();    // 代码生成器
    let tmpOffset: number = 0;    // 临时变量偏移量

    
    let Off: number = 0;    // 在同层的变量便宜
    let mainOff: number = 0;    // 主程序的displayOff
    let savedOff: number = 0;    // 当前层的displayoFF

    genProc

    function main() {
        let currentLoc: number;    // 主程序入口地址
        let savedLoc: number;    // 目标代码的第一条指令地址


        emitter.emitComment("SNL目标代码");
        emitter.emitComment("标准预备工作:");
        // 从0地址处载入最大地址值，赋值给mp
        emitter.emitRM("LD", regs.mp, 0, regs.ac, "从0地址处载入最大地址值");
        // 清空0地址单元内容
        emitter.emitRM("ST", regs.ac, 0, regs.ac, "清空0地址单元内容");
        emitter.emitComment("预备工作结束");

        let t1 = node.children[1];
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
        emitter.emitRM("LDC",regs.ac,0,0,"将ac置0");
        emitter.emitRM("LDC",regs.ac1,0,0,"将ac1置0");
        emitter.emitRM("LDC",regs.ac2,0,0,"将ac2置0");
        // sp
        emitter.emitRM("LDC",regs.ac,0,regs.sp,"将sp置0");
        // 确定displayOff
        emitter.emitRM("LDA",regs.displayOff,mainOff,regs.sp,"mian displayOff");
        // 填写display表，只有主程序本层的sp(0)
        emitter.emitRM("ST",regs.ac,0,regs.displayOff,"main display");
        // 填写top
        emitter.emitRM("LDA",regs.top,1,regs.displayOff,"main top");

        // 主程序体代码生成
        let t2 = node.children[2].children[0];
        while (t2) {
            cGen(t2);
            t2 = t2.sibling!;
        }

        // 处理完毕主程序，退出AR
        emitter.emitComment("----主程序结束----");
        emitter.emitRO("HALT",0,0,0,"");
    }
}