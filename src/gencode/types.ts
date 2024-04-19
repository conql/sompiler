// 标号地址表
export interface labelAddr {
    label: number,
    dest: number,
    next: labelAddr
}

// 回填地址结构
export interface backAddr {
    backLoc: number;
    former: backAddr;
}

// TM汇编寄存器
export enum regs {
    ac = 0,
    ac1 = 1,
    ac2 = 2,
    mp = 3,
    displayOff = 4,
    top = 5,
    sp = 6,
    pc = 7
}


// // MIPS寄存器
// export enum regs {
//     // 通用寄存器
//     zero = "$zero", // 0
//     at = "$at",     // 1
//     v0 = "$v0",     // 2
//     v1 = "$v1",     // 3
//     a0 = "$a0",     // 4
//     a1 = "$a1",     // 5
//     a2 = "$a2",     // 6
//     a3 = "$a3",     // 7    
//     t0 = "$t0",     // 8
//     t1 = "$t1",     // 9
//     t2 = "$t2",     // 10
//     t3 = "$t3",     // 11
//     t4 = "$t4",     // 12
//     t5 = "$t5",     // 13
//     t6 = "$t6",     // 14
//     t7 = "$t7",     // 15
//     s0 = "$s0",     // 16
//     s1 = "$s1",     // 17
//     s2 = "$s2",     // 18
//     s3 = "$s3",     // 19
//     s4 = "$s4",     // 20
//     s5 = "$s5",     // 21
//     s6 = "$s6",     // 22
//     s7 = "$s7",     // 23
//     t8 = "$t8",     // 24
//     t9 = "$t9",     // 25
//     k0 = "$k0",     // 26
//     k1 = "$k1",     // 27
//     gp = "$gp",     // 28
//     sp = "$sp",     // 29
//     fp = "$fp",     // 30
//     ra = "$ra",      // 31
// }