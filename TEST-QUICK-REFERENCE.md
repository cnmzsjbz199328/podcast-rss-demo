# 🎤 语音克隆功能测试 - 快速参考

## 📋 测试命令一览

```bash
# 检查 API 端点
npm run test:api

# 单元测试 (8个测试)
npm run test:unit

# 集成测试 (完整流程)
npm run test:voice

# 快速连接测试
npm run test:gradio

# 全部测试
npm run test:all
```

## 🎯 测试覆盖范围

### ✅ 单元测试 (test-voice-unit.js)
- [ ] 基本语音生成
- [ ] 不同风格 (guo-de-gang, news-anchor)
- [ ] 长文本处理 (100+字)
- [ ] 短文本处理 (1-3字)
- [ ] 特殊字符处理
- [ ] 风格列表验证
- [ ] 配置有效性验证
- [ ] 错误处理 (无效风格)

### ✅ 集成测试 (test-voice-clone.js)
- [ ] 多风格生成
  - 郭德纲相声风格 (高欢乐 + 惊讶)
  - 新闻播报风格 (高中性 + 专业)
  - 情感电台风格 (温暖细腻)
- [ ] 长文本处理
- [ ] 参数边界值 (保守、平衡、激进)
- [ ] 情感向量配置 (8种情感)

### ✅ API 检查 (test-api-endpoints.js)
- [ ] 连接验证
- [ ] /on_method_select 端点
- [ ] /on_input_text_change 端点
- [ ] /update_prompt_audio 端点
- [ ] /gen_single 端点

## 🌍 风格配置参考

### 郭德纲相声风格
```javascript
{
  emo_weight: 0.9,      // 高情感
  vec1: 0.8,            // 开心
  vec7: 0.6,            // 惊讶
  emo_random: true      // 随机情感
}
```

### 专业新闻播报
```javascript
{
  emo_weight: 0.3,      // 低情感
  vec8: 0.9,            // 中性
  emo_random: false     // 确定性
}
```

### 情感电台
```javascript
{
  emo_weight: 0.7,      // 中等情感
  vec1: 0.4,            // 开心
  vec3: 0.3,            // 悲伤
  vec6: 0.2             // 忧郁
}
```

## 📊 情感向量对照表

| 参数 | 含义 | 范围 |
|------|------|------|
| vec1 | Happy (开心) | -1 到 1 |
| vec2 | Angry (生气) | -1 到 1 |
| vec3 | Sad (悲伤) | -1 到 1 |
| vec4 | Fear (害怕) | -1 到 1 |
| vec5 | Hate (厌恶) | -1 到 1 |
| vec6 | Low (忧郁) | -1 到 1 |
| vec7 | Surprise (惊讶) | -1 到 1 |
| vec8 | Neutral (平静) | -1 到 1 |

## 🔧 生成参数参考

| 参数 | 默认值 | 说明 |
|------|--------|------|
| param_16 (do_sample) | true | 是否使用采样 |
| param_17 (top_p) | 0.8 | 核采样参数 |
| param_18 (top_k) | 30 | 顶部k采样 |
| param_19 (temperature) | 0.8 | 温度参数 (0.3=保守, 1.5=激进) |
| param_20 (length_penalty) | 0 | 长度惩罚 |
| param_21 (num_beams) | 3 | 束搜索数 |
| param_22 (repetition_penalty) | 10 | 重复惩罚 |
| param_23 (max_mel_tokens) | 1500 | 最大梅尔token数 |

## 🎬 使用示例

### 基础生成
```bash
npm run test:unit
# 运行所有单元测试
```

### 特定风格测试
```bash
node test-voice-clone.js
# 查看 testStyle 方法的调用
```

### API 诊断
```bash
npm run test:api
# 验证所有端点是否可用
```

## 📈 预期结果

### 成功指标
- ✅ API 连接成功 (2-5秒)
- ✅ 单元测试通过率 > 85%
- ✅ 生成平均耗时 10-20秒
- ✅ 所有风格生成成功

### 失败排查
| 症状 | 原因 | 解决方案 |
|------|------|---------|
| 连接超时 | 网络问题 | 检查网络，重试 |
| 文件处理错误 | 使用了 Blob 而不是 handle_file | 使用 handle_file 包装 |
| 参数错误 | 参数值超出范围 | 检查参数范围 |
| API 限流 | 请求过快 | 增加延迟 |
| 内存溢出 | 文本过长 | 分段处理 |

## 🚀 快速开始

1. **安装依赖**
   ```bash
   npm install
   ```

2. **运行 API 检查**
   ```bash
   npm run test:api
   ```

3. **运行单元测试**
   ```bash
   npm run test:unit
   ```

4. **运行完整集成测试**
   ```bash
   npm run test:voice
   ```

5. **查看报告**
   - 每个测试输出详细的 ✅/❌ 结果
   - 最后生成汇总报告

## 📚 更多信息

详见 `TESTING.md` 完整测试文档

## ⏱️ 预期耗时

- API 检查: 1-2 分钟
- 单元测试: 2-5 分钟
- 集成测试: 5-15 分钟
- 全部测试: 10-25 分钟

*实际时间取决于网络和服务负载*

---

**最后更新**: 2024-11-02
