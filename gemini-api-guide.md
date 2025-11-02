# Gemini API 使用指南

本文档介绍如何在项目中使用Google Gemini API进行AI脚本生成。

## 概述

Google Gemini API 是一个强大的AI模型，可以用于生成文本、回答问题、创作内容等。在本项目中，我们使用它来将热点新闻整理成各种风格的播客脚本。

## 安装依赖

首先，安装Google Generative AI SDK：

```bash
npm install @google/genai
```

## 设置API密钥

1. 获取Gemini API密钥：
   - 访问 [Google AI Studio](https://aistudio.google.com/)
   - 创建或选择一个项目
   - 生成API密钥

2. 设置环境变量：
   ```bash
   export GEMINI_API_KEY="your-api-key-here"
   ```

   或在代码中直接配置（不推荐用于生产环境）。

## 基本用法

### 初始化客户端

```javascript
import { GoogleGenAI } from "@google/genai";

// 使用环境变量中的API密钥
const ai = new GoogleGenAI({});

// 或者直接传入API密钥
// const ai = new GoogleGenAI({ apiKey: "your-api-key" });
```

### 生成内容

```javascript
async function generateContent() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // 使用的模型
      contents: "Explain how AI works in a few words", // 输入内容
    });

    console.log(response.text); // 输出生成的文本
  } catch (error) {
    console.error("Error generating content:", error);
  }
}

generateContent();
```

## 参数说明

### 模型参数

- `model`: 指定使用的AI模型
  - `"gemini-2.5-flash"`: 最快的模型，适合简单任务
  - `"gemini-pro"`: 功能强大的模型，适合复杂任务
  - `"gemini-pro-vision"`: 支持图像输入的模型

### 内容参数

- `contents`: 输入的内容，可以是字符串或对象数组

#### 简单文本输入

```javascript
contents: "你的提示词"
```

#### 结构化输入

```javascript
contents: [
  {
    role: "user",
    parts: [{ text: "请用相声风格讲述今天的新闻" }]
  }
]
```

### 高级配置

```javascript
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: "你的提示词",
  generationConfig: {
    temperature: 0.7,        // 创造性程度 (0-1)
    topP: 1,                 // 核采样参数
    topK: 1,                 // 顶部K采样
    maxOutputTokens: 2048,   // 最大输出长度
  },
  safetySettings: [
    {
      category: "HARM_CATEGORY_HARASSMENT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
  ],
});
```

## 在项目中的使用示例

### 新闻脚本生成

```javascript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

async function generatePodcastScript(newsContent, style = "news-anchor") {
  const stylePrompts = {
    "guo-de-gang": "请用郭德纲的相声风格，风趣幽默地讲述这些新闻：",
    "news-anchor": "请用专业新闻播报员的风格，客观准确地报道这些新闻："
  };

  const prompt = `${stylePrompts[style]}\n\n新闻内容：\n${newsContent}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 1500,
    },
  });

  return response.text;
}

// 使用示例
const news = "今日热点：人工智能技术快速发展...";
const script = await generatePodcastScript(news, "guo-de-gang");
console.log(script);
```

## 错误处理

```javascript
try {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "你的提示词",
  });

  if (response.text) {
    console.log(response.text);
  } else {
    console.log("No response generated");
  }
} catch (error) {
  if (error.status === 400) {
    console.error("Bad request - check your input");
  } else if (error.status === 403) {
    console.error("API key invalid or quota exceeded");
  } else if (error.status === 429) {
    console.error("Rate limit exceeded - try again later");
  } else {
    console.error("Unexpected error:", error);
  }
}
```

## 最佳实践

1. **API密钥安全**：永远不要将API密钥提交到版本控制系统，使用环境变量或安全存储。

2. **错误处理**：始终使用try-catch包装API调用，并妥善处理不同类型的错误。

3. **速率限制**：注意API的调用频率限制，避免过度调用。

4. **内容审核**：根据需要配置safetySettings来过滤不当内容。

5. **模型选择**：根据任务复杂度选择合适的模型，简单任务用flash，复杂任务用pro。

6. **提示词优化**：编写清晰、具体的提示词来获得更好的结果。

## 配额和费用

- Gemini API 有免费额度，但超出后会产生费用
- 查看 [Google AI定价](https://ai.google.dev/pricing) 了解详细信息
- 监控API使用情况以控制成本

## 更多资源

- [Google AI Studio](https://aistudio.google.com/) - 在线测试API
- [Gemini API文档](https://ai.google.dev/docs) - 官方完整文档
- [Google AI社区](https://ai.google.dev/community) - 获取帮助和分享经验
