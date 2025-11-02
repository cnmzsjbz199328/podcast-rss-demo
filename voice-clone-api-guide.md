# IndexTTS2 语音克隆API使用指南

本文档介绍如何在项目中使用IndexTTS2语音克隆API进行音频生成。该API基于Hugging Face的Gradio应用，支持通过语音样本生成各种风格的音频内容。

## 概述

IndexTTS2是一个先进的文本到语音(TTS)系统，能够根据提供的语音样本克隆声音，并支持情感控制和多种音频生成参数。在本项目中，我们使用它来为AI生成的播客脚本配音。

## 安装依赖

首先，安装Gradio客户端：

```bash
npm install @gradio/client
```

## API基础信息

- **API端点**: `Tom1986/indextts2`
- **类型**: Hugging Face Gradio应用
- **功能**: 语音克隆、情感控制文本到语音转换

## API端点说明

### 1. `/on_method_select` - 情感控制方法选择

设置情感控制的方法，并返回是否启用随机情感采样。

**参数:**
- `emo_control_method` (string): 情感控制方法，默认 "Same as the voice reference"

**返回值:**
- `boolean`: 是否启用随机情感采样

**示例:**
```javascript
import { Client } from "@gradio/client";

const client = await Client.connect("Tom1986/indextts2");
const result = await client.predict("/on_method_select", {
  emo_control_method: "Same as the voice reference"
});

console.log(result.data); // true 或 false
```

### 2. `/on_input_text_change` - 文本输入处理

处理输入文本并返回相关数据。

**参数:**
- `text` (string, required): 输入文本
- `max_tokens_per_sentence` (number): 每句最大token数，默认120

**返回值:**
- Dataframe数据

### 3. `/on_input_text_change_1` - 文本输入处理（备用）

与`/on_input_text_change`功能相同。

### 4. `/update_prompt_audio` - 更新提示音频

更新语音提示音频（无参数）。

**参数:** 无

**返回值:** 音频相关数据

### 5. `/gen_single` - 生成音频（主要端点）

这是最主要的音频生成端点，支持完整的语音克隆功能。

**参数:**
- `emo_control_method` (string): 情感控制方法，默认 "Same as the voice reference"
- `prompt` (FileData, required): 语音参考音频文件
- `text` (string, required): 要转换为语音的文本
- `emo_ref_path` (FileData, required): 情感参考音频文件
- `emo_weight` (number): 情感控制权重，默认0.8，范围0-1
- `vec1-vec8` (number): 情感向量参数（Happy, Angry, Sad, Fear, Hate, Low, Surprise, Neutral），默认0
- `emo_text` (string): 情感描述文本，默认""
- `emo_random` (boolean): 是否随机情感采样，默认false
- `max_text_tokens_per_sentence` (number): 每句最大token数，默认120
- `param_16` (boolean): do_sample，默认true
- `param_17` (number): top_p，默认0.8
- `param_18` (number): top_k，默认30
- `param_19` (number): temperature，默认0.8
- `param_20` (number): length_penalty，默认0
- `param_21` (number): num_beams，默认3
- `param_22` (number): repetition_penalty，默认10
- `param_23` (number): max_mel_tokens，默认1500

**返回值:**
- 音频文件数据（Synthesis Result）

## 完整使用示例

### 基本音频生成

```javascript
import { Client } from "@gradio/client";

async function generateAudio(text, voiceSampleUrl, emotionSampleUrl) {
  try {
    // 下载语音样本
    const voiceResponse = await fetch(voiceSampleUrl);
    const voiceBlob = await voiceResponse.blob();

    // 下载情感样本
    const emotionResponse = await fetch(emotionSampleUrl);
    const emotionBlob = await emotionResponse.blob();

    // 连接到API
    const client = await Client.connect("Tom1986/indextts2");

    // 生成音频
    const result = await client.predict("/gen_single", {
      emo_control_method: "Same as the voice reference",
      prompt: voiceBlob,
      text: text,
      emo_ref_path: emotionBlob,
      emo_weight: 0.8,
      vec1: 0,      // Happy
      vec2: 0,      // Angry
      vec3: 0,      // Sad
      vec4: 0,      // Fear
      vec5: 0,      // Hate
      vec6: 0,      // Low
      vec7: 0,      // Surprise
      vec8: 0,      // Neutral
      emo_text: "",
      emo_random: false,
      max_text_tokens_per_sentence: 120,
      param_16: true,   // do_sample
      param_17: 0.8,    // top_p
      param_18: 30,     // top_k
      param_19: 0.8,    // temperature
      param_20: 0,      // length_penalty
      param_21: 3,      // num_beams
      param_22: 10,     // repetition_penalty
      param_23: 1500    // max_mel_tokens
    });

    return result.data; // 返回生成的音频数据
  } catch (error) {
    console.error("Audio generation failed:", error);
    throw error;
  }
}

// 使用示例
const generatedAudio = await generateAudio(
  "这是测试文本",
  "https://example.com/voice-sample.wav",
  "https://example.com/emotion-sample.wav"
);
```

### 郭德纲风格音频生成

```javascript
async function generateGuoDeGangStyle(text) {
  const client = await Client.connect("Tom1986/indextts2");

  // 使用预设的郭德纲语音样本
  const voiceSample = await fetch("https://your-r2-bucket.r2.cloudflarestorage.com/voice-samples/guo-de-gang.wav");
  const voiceBlob = await voiceSample.blob();

  const emotionSample = await fetch("https://your-r2-bucket.r2.cloudflarestorage.com/emotion-samples/comedy.wav");
  const emotionBlob = await emotionSample.blob();

  const result = await client.predict("/gen_single", {
    emo_control_method: "Same as the voice reference",
    prompt: voiceBlob,
    text: text,
    emo_ref_path: emotionBlob,
    emo_weight: 0.9,    // 提高情感权重
    vec1: 0.8,          // 高欢乐度
    vec7: 0.6,          // 适度惊讶
    emo_random: true,   // 启用随机情感
    param_19: 1.0,      // 提高创造性
  });

  return result.data;
}
```

## 参数详解

### 情感控制向量 (vec1-vec8)

- **vec1 (Happy)**: 欢乐度，0-1之间
- **vec2 (Angry)**: 愤怒度，0-1之间
- **vec3 (Sad)**: 悲伤度，0-1之间
- **vec4 (Fear)**: 恐惧度，0-1之间
- **vec5 (Hate)**: 仇恨度，0-1之间
- **vec6 (Low)**: 低落度，0-1之间
- **vec7 (Surprise)**: 惊讶度，0-1之间
- **vec8 (Neutral)**: 中性度，0-1之间

### 生成参数

- **do_sample (param_16)**: 是否使用采样生成
- **top_p (param_17)**: 核采样参数，控制生成多样性
- **top_k (param_18)**: 顶部k采样参数
- **temperature (param_19)**: 温度参数，控制随机性
- **length_penalty (param_20)**: 长度惩罚
- **num_beams (param_21)**: 束搜索数量
- **repetition_penalty (param_22)**: 重复惩罚
- **max_mel_tokens (param_23)**: 最大mel token数

## 错误处理

```javascript
try {
  const client = await Client.connect("Tom1986/indextts2");
  const result = await client.predict("/gen_single", {
    // ... 参数
  });

  if (result.data) {
    // 处理生成的音频
    console.log("Audio generated successfully");
  } else {
    console.log("No audio generated");
  }
} catch (error) {
  if (error.message.includes("connect")) {
    console.error("Failed to connect to API");
  } else if (error.message.includes("predict")) {
    console.error("Prediction failed - check parameters");
  } else {
    console.error("Unexpected error:", error);
  }
}
```

## 注意事项

1. **音频文件格式**: 支持常见的音频格式（WAV, MP3等）
2. **文件大小限制**: 注意上传的音频样本大小限制
3. **API可用性**: Hugging Face Space可能有使用限制
4. **隐私考虑**: 上传的音频样本会被处理，请注意隐私政策
5. **生成质量**: 语音样本质量直接影响生成音频的效果
6. **参数调优**: 不同风格可能需要调整情感向量和生成参数

## 在项目中的集成

在播客生成项目中，可以这样使用：

```javascript
// src/voice-cloner.js
import { Client } from "@gradio/client";

class VoiceCloner {
  constructor() {
    this.client = null;
  }

  async initialize() {
    this.client = await Client.connect("Tom1986/indextts2");
  }

  async generateAudio(script, style) {
    const styleConfigs = {
      'guo-de-gang': {
        voiceUrl: 'https://your-r2-bucket.r2.cloudflarestorage.com/voices/guo-de-gang.wav',
        emotionUrl: 'https://your-r2-bucket.r2.cloudflarestorage.com/emotions/comedy.wav',
        params: { emo_weight: 0.9, vec1: 0.8, vec7: 0.6 }
      },
      'news-anchor': {
        voiceUrl: 'https://your-r2-bucket.r2.cloudflarestorage.com/voices/news-anchor.wav',
        emotionUrl: 'https://your-r2-bucket.r2.cloudflarestorage.com/emotions/professional.wav',
        params: { emo_weight: 0.3, vec8: 0.9 }
      }
    };

    const config = styleConfigs[style];
    // ... 生成音频逻辑
  }
}

export default VoiceCloner;
```

## 更多资源

- [IndexTTS2 Hugging Face Space](https://huggingface.co/spaces/Tom1986/indextts2)
- [Gradio Client 文档](https://www.gradio.app/docs/js-client)
- [语音克隆技术介绍](https://github.com/IndexTeam/IndexTTS)
