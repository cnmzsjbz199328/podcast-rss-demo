# 语音克隆功能测试指南

本文档介绍如何运行语音克隆功能测试。

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 运行测试

#### 方案 A: 运行所有测试
```bash
npm run test:all
```

#### 方案 B: 分别运行各个测试

**检查 API 端点可用性**
```bash
npm run test:api
```
用于验证 IndexTTS-2-Demo API 的所有端点是否可用。

**单元测试**
```bash
npm run test:unit
```
测试 IndexTtsVoiceService 的核心功能，包括：
- 基本语音生成
- 不同风格生成
- 长文本/短文本处理
- 特殊字符处理
- 配置验证
- 错误处理

**集成测试（完整流程）**
```bash
npm run test:voice
```
完整的语音生成集成测试，包括：
- 多风格语音生成（郭德纲、新闻播报、情感电台）
- 长文本处理
- 参数边界值测试
- 情感向量配置测试

**快速 Gradio 连接测试**
```bash
npm run test:gradio
```
简单的 Gradio 客户端连接测试。

## 测试内容详解

### 1. API 端点检查 (test-api-endpoints.js)

检查以下 API 端点的可用性：

| 端点 | 功能 | 参数 |
|------|------|------|
| `/on_method_select` | 选择情感控制方法 | emo_control_method |
| `/on_input_text_change` | 处理文本输入 | text, max_text_tokens_per_segment |
| `/update_prompt_audio` | 更新提示音频 | 无 |
| `/gen_single` | 生成语音（主端点） | 见下文 |

**输出示例：**
```
✅ 连接成功
✅ /on_method_select 端点可用
✅ /on_input_text_change 端点可用
✅ /update_prompt_audio 端点可用
✅ /gen_single 端点可用
```

### 2. 单元测试 (test-voice-unit.js)

运行 8 个单元测试，验证服务的各个方面：

```
测试 1: 基本语音生成
  - 验证返回值结构
  - 检查音频数据、格式、时长、文件大小

测试 2: 不同风格生成
  - 测试 guo-de-gang 风格
  - 测试 news-anchor 风格

测试 3: 长文本处理
  - 处理较长的文本内容

测试 4: 短文本处理
  - 处理 1-3 字的短文本

测试 5: 特殊字符处理
  - 标点符号、数字、括号等

测试 6: 支持的风格列表
  - 验证 getSupportedStyles() 返回值

测试 7: 配置验证
  - 验证服务配置的有效性

测试 8: 错误处理
  - 验证无效风格是否抛出错误
```

**输出示例：**
```
📊 单元测试报告
总测试: 8
✅ 通过: 7
❌ 失败: 1
成功率: 87.50%
```

### 3. 集成测试 (test-voice-clone.js)

完整的语音生成测试，包含多个子测试：

#### 3.1 多风格测试

测试三种不同的风格配置：

**郭德纲相声风格**
```
参数:
  - emo_weight: 0.9 (高情感权重)
  - vec1: 0.8 (高欢乐度)
  - vec7: 0.6 (适度惊讶)
  - emo_random: true (启用随机情感)

示例文本: "各位观众大家好！今天给大家讲一个特别有意思的故事。"
```

**专业新闻播报风格**
```
参数:
  - emo_weight: 0.3 (低情感权重)
  - vec8: 0.9 (高中性度)
  - emo_random: false (禁用随机情感)
  - param_19: 0.6 (降低随机性)

示例文本: "今天是2024年11月2日，全球经济形势继续向好。"
```

**情感电台风格**
```
参数:
  - emo_weight: 0.7 (中等情感权重)
  - 混合多个情感向量以表达温暖细腻

示例文本: "有时候我们会在夜晚想起某个人..."
```

#### 3.2 长文本处理测试

测试处理较长文本的能力。

#### 3.3 参数边界值测试

测试三种不同的生成参数组合：

| 配置 | 温度 | 采样 | 重复惩罚 | 特点 |
|------|------|------|---------|------|
| 保守生成 | 0.3 | false | 20 | 稳定、可预测 |
| 平衡生成 | 0.8 | true | 10 | 标准配置 |
| 激进生成 | 1.5 | true | 1 | 创意、多样 |

#### 3.4 情感向量测试

测试八种情感向量的配置：

```
vec1: Happy   (开心)
vec2: Angry   (生气)
vec3: Sad     (悲伤)
vec4: Fear    (害怕)
vec5: Hate    (厌恶)
vec6: Low     (忧郁)
vec7: Surprise(惊讶)
vec8: Neutral (平静)
```

测试配置：
- 极度开心 (vec1=1.0)
- 中度开心 (vec1=0.5)
- 轻度悲伤 (vec3=0.3, vec6=0.2)
- 完全中性 (vec8=1.0)

## 输出报告

### 测试报告示例

```
============================================================
📊 测试报告
============================================================

总测试数: 5
✅ 成功: 4
❌ 失败: 1
成功率: 80.00%

平均生成时间: 15.32秒
最快: 12.45秒
最慢: 18.67秒

📋 详细结果:
  1. ✅ guo-de-gang (14.23s)
  2. ✅ news-anchor (15.45s)
  3. ✅ emotional (16.12s)
  4. ❌ long-text - 超时
  5. ✅ emotion-vectors (14.89s)

============================================================
```

## 常见问题

### Q1: 连接超时
**A:** 检查网络连接和 Hugging Face Space 是否可访问

### Q2: 文件处理错误
**A:** 确保使用 `handle_file()` 包装音频 Blob 对象

### Q3: 参数错误
**A:** 参数值需要在指定范围内：
- 情感向量 (vec1-vec8): -1 到 1
- 温度参数 (param_19): 通常 0.1 到 2.0
- 其他生成参数：参考 API 文档

### Q4: API 限流
**A:** 测试脚本间有 2 秒延迟，避免过快请求

## 集成到 CI/CD

### 使用 GitHub Actions

```yaml
name: Voice Clone Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:api
      - run: npm run test:unit
      - run: npm run test:voice
```

## 性能基准

根据测试结果，以下是预期的性能指标：

| 测试 | 平均时间 | 范围 |
|------|---------|------|
| API 连接 | 2-5s | 1-10s |
| 基本生成 | 10-20s | 8-30s |
| 长文本生成 | 15-30s | 10-45s |
| 情感配置 | 10-20s | 8-30s |

*注：实际时间取决于网络状况和服务负载*

## 调试技巧

### 启用详细日志

在测试文件中添加：
```javascript
process.env.DEBUG = 'true';
```

### 单独测试一个风格

修改 test-voice-clone.js：
```javascript
// 只测试一个风格
await tester.testStyle('guo-de-gang', '测试文本');
```

### 调整超时时间

```javascript
const client = await Client.connect('IndexTeam/IndexTTS-2-Demo', {
  hf_token: 'your_token',  // 如果需要
  timeout: 60000  // 60 秒超时
});
```

## 下一步

1. **集成到项目**：将测试结果集成到主应用程序的构建管道
2. **监控性能**：定期运行测试以监控 API 性能变化
3. **扩展测试**：根据实际需求添加更多测试用例
4. **文档维护**：根据 API 变化更新测试和文档

## 相关文件

- `test-api-endpoints.js` - API 端点检查
- `test-voice-unit.js` - 单元测试
- `test-voice-clone.js` - 集成测试
- `test-gradio-simple.js` - 快速连接测试
- `src/implementations/IndexTtsVoiceService.js` - 语音服务实现
- `src/config/index.js` - 配置管理

## 许可证

MIT
