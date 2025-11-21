#!/bin/bash

# AI 供应商 JSON 结构化返回能力测试
# 测试 Gemini 和 Cohere 的 JSON 返回稳定性

echo "🚀 AI 供应商 JSON 能力测试套件"
echo "================================"
echo ""

# 检查环境变量
if [ -z "$GEMINI_API_KEY" ]; then
  echo "⚠️  警告: GEMINI_API_KEY 未设置，将使用测试脚本中的默认值"
fi

if [ -z "$COHERE_API_KEY" ]; then
  echo "⚠️  警告: COHERE_API_KEY 未设置，将使用测试脚本中的默认值"
fi

echo ""
echo "================================"
echo "📝 测试 Gemini"
echo "================================"
node tests/ai-providers/test-gemini-json.js

echo ""
echo ""
echo "================================"
echo "📝 测试 Cohere"
echo "================================"
node tests/ai-providers/test-cohere-json.js

echo ""
echo ""
echo "================================"
echo "✅ 所有测试完成"
echo "================================"
echo ""
echo "📊 基于测试结果，请查看各测试的推荐方案"
echo "💡 建议优先使用原生支持 JSON Schema 的方法"
