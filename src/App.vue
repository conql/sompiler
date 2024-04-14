<script setup lang="ts">
import { ref, toRaw } from "vue";
import examplesData from "./examples";
import { LexicalType, Token } from "./lexicon/types";
import LexicalParser from "./lexicon/parser";
import SyntacticParser from "./syntax/parser";
import { SymbolNode, SymbolNodeKind } from "./syntax/types";

interface Tree {
  node: SymbolNode,
  children?: Tree[]
}

let programText = ref<string>("");
let errorMsg = ref<string>("");
let examples = ref(examplesData);
let tokensByLines = ref<Token[][]>([]);
let syntaxTree = ref<Tree[]>([]);

function compile(){
	const tokens = LexicalParser(programText.value);
	tokensByLines.value = tokens.reduce((acc, token) => {
		if(token.type === LexicalType.ENDFILE){
			token = {...token, value: "EOF"};
		}
		if (token.line > acc.length) {
			acc.push([]);
		}
		acc[token.line - 1].push(token);
		return acc;
	}, [] as Token[][]);

	const syntax = SyntacticParser(tokens);
	function transformTree(node: SymbolNode): Tree[]{
		const tree: Tree = {
			node: node,
			children: []
		};

		const ret = [tree];
		for(let child of node.children){
			tree.children?.push(...transformTree(child));
		}

		if(node.sibling){
			ret.push(...transformTree(node.sibling));
		}

		return ret;
	}
	syntaxTree.value = transformTree(syntax);
	console.log(syntax);
}

function tryCompile(){
	try{
		compile();
		errorMsg.value = "";
	}
	catch(e: Error){
		errorMsg.value = e.message;
	}
}

</script>

<template>
    <h1>SNL 编译器</h1>
    <el-input type="textarea" style="width: 100%;" :autosize="{minRows: 5, maxRows:20}" v-model="programText" placeholder="请输入SNL程序代码"></el-input>
    <ul style="display: flex; list-style: none; padding: 0; gap: 5px;">
      样例：
        <li v-for="example in examples" :key="example.name">
            <el-tag style="cursor:pointer" @click="programText = example.content">{{example.name}}</el-tag>
        </li>
    </ul>

    <el-button type="primary" size="large" style="width: 100%; max-width: 500px; margin: 5px auto; display: block;" @click="tryCompile">编译</el-button>
    <code v-if="errorMsg"  style="width: 100%;">
      {{ errorMsg }}
    </code>
    <hr style="margin: 30px 0px 20px 0px">
    <el-tabs>
      <el-tab-pane label="词法分析">
        <div>
          <div v-for="(tokens, index) in tokensByLines" :key="index" 
            style="display:grid; grid-template-columns: 20px auto; border: 1px dashed var(--el-border-color); padding: 5px; flex: 1;">
            <div style="color: var(--el-text-color-placeholder); font-size: var(--el-font-size-small); margin: auto;">{{index + 1}}</div>
            <ul style="list-style: none; margin: 0px; padding: 0; display: flex; flex-wrap: wrap; gap: 5px">
              <li v-for="token,i in tokens" :key="i">
                <el-tooltip :content="token.type">
                  <el-tag>{{token.value}}</el-tag>
                </el-tooltip>
              </li>
            </ul>
          </div>
        </div>
      </el-tab-pane>
      <el-tab-pane label="语法分析">
        <div v-if="syntaxTree">
          <el-tree :data="syntaxTree" default-expand-all>
            <template #default="{ data }">
              <span class="syntactic-tree-item">
                <span style="display: flex; gap: 10px;">
                  <span>{{data.node.kind}}</span> 
                  <span v-if="data.node.subKind">{{ data.node.subKind }}</span>
                  <span v-if="data.node.names.length > 0">{{ data.node.names }}</span>
                  <span v-if="data.node.attr">attr: {{ data.node.attr }}</span>
                </span>
                <span class="syntactic-tree-item-copy" @click.stop="console.log(toRaw(data.node))">复制</span>
              </span>
            </template>
          </el-tree>
        </div>
      </el-tab-pane>
      <el-tab-pane label="语义分析">语义分析</el-tab-pane>
      <el-tab-pane label="中间代码生成">中间代码生成</el-tab-pane>
      <el-tab-pane label="目标代码生成">目标代码生成</el-tab-pane>
    </el-tabs>
</template>

<style scoped>
.syntactic-tree-item{
  display: flex; 
  justify-content: space-between; 
  flex: 1;
}

.syntactic-tree-item .syntactic-tree-item-copy{
  display: none;
  margin-right: 10px;
}

.el-tree-node__content:hover .syntactic-tree-item-copy{
  display: inline;
}
</style>
