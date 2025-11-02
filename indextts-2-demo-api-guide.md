# IndexTTS-2-Demo API 中文文档

## 安装

如果尚未安装 JavaScript 客户端，请先安装 @gradio/client：

```bash
npm i -D @gradio/client
```

## 基本用法

连接到 IndexTTS-2-Demo 空间：

```javascript
import { Client } from "@gradio/client";

const client = await Client.connect("IndexTeam/IndexTTS-2-Demo");
```

如果是私有空间，需要传入 Hugging Face token：

```javascript
const client = await Client.connect("IndexTeam/IndexTTS-2-Demo", {
  hf_token: "hf_..."
});
```

## API 端点

### /on_method_select - 选择情感控制方法

更新情感控制方法设置。

**参数**
- `emo_control_method` (string，默认: "Same as the voice reference") - 情感控制方法

**返回值**
- 更新后的组件状态

**示例**
```javascript
const result = await client.predict("/on_method_select", {
  emo_control_method: "Same as the voice reference"
});
```

### /on_input_text_change - 文本输入变化

处理文本输入的变化并更新相关组件。

**参数**
- `text` (string，必需) - 输入文本内容
- `max_text_tokens_per_segment` (number，默认: 120) - 每个生成片段的最大 token 数

**返回值**
- 数据框组件的输出值

**示例**
```javascript
const result = await client.predict("/on_input_text_change", {
  text: "你好世界！",
  max_text_tokens_per_segment: 120
});
```

### /on_experimental_change - 实验功能开关

切换实验性功能的显示状态。

**参数**
- `is_exp` (boolean，默认: false) - 是否显示实验性功能

**返回值**
-  (string) - 情感控制方法的输出值
-  - 数据集组件的输出值[1]

**示例**
```javascript
const result = await client.predict("/on_experimental_change", {
  is_exp: true
});
```

### /update_prompt_audio - 更新提示音频

更新语音参考音频。

**参数**
- 无参数

**返回值**
- 更新后的音频组件状态

**示例**
```javascript
const result = await client.predict("/update_prompt_audio", {});
```

### /gen_single - 生成单个语音

根据提供的参数生成语音合成结果。

**参数**

#### 基础参数
- `emo_control_method` (string，默认: "Same as the voice reference") - 情感控制方法
- `prompt` (FileData，必需) - 语音参考音频文件
- `text` (string，必需) - 要合成的文本内容

#### 情感控制参数
- `emo_ref_path` (FileData，必需) - 情感参考音频文件
- `emo_weight` (number，默认: 0.8) - 情感控制权重
- `emo_text` (string，默认: "") - 情感描述文本
- `emo_random` (boolean，默认: false) - 是否随机化情感采样

#### 情感向量参数 (范围: -1 到 1)
- `vec1` (number，默认: 0) - 开心
- `vec2` (number，默认: 0) - 生气
- `vec3` (number，默认: 0) - 悲伤
- `vec4` (number，默认: 0) - 害怕
- `vec5` (number，默认: 0) - 厌恶
- `vec6` (number，默认: 0) - 忧郁
- `vec7` (number，默认: 0) - 惊讶
- `vec8` (number，默认: 0) - 平静

#### 生成参数
- `max_text_tokens_per_segment` (number，默认: 120) - 每个生成片段的最大 token 数
- `param_16` (boolean，默认: true) - 是否使用采样 (do_sample)
- `param_17` (number，默认: 0.8) - Top-p 采样参数
- `param_18` (number，默认: 30) - Top-k 采样参数
- `param_19` (number，默认: 0.8) - 温度参数
- `param_20` (number，默认: 0) - 长度惩罚
- `param_21` (number，默认: 3) - Beam 搜索数量
- `param_22` (number，默认: 10) - 重复惩罚
- `param_23` (number，默认: 1500) - 最大梅尔频谱 token 数

**返回值**
- 合成的音频文件

**示例**
```javascript
import { Client, handle_file } from "@gradio/client";

// 加载音频文件
const response_prompt = await fetch("your_voice_reference.wav");
const promptAudio = await response_prompt.blob();

const response_emo = await fetch("your_emotion_reference.wav");
const emoAudio = await response_emo.blob();

const client = await Client.connect("IndexTeam/IndexTTS-2-Demo");
const result = await client.predict("/gen_single", {
  emo_control_method: "Same as the voice reference",
  prompt: handle_file(promptAudio),
  text: "这是要合成的文本内容",
  emo_ref_path: handle_file(emoAudio),
  emo_weight: 0.8,
  vec1: 0.5,  // 开心程度
  vec2: 0,
  vec3: 0,
  vec4: 0,
  vec5: 0,
  vec6: 0,
  vec7: 0,
  vec8: 0,
  emo_text: "",
  emo_random: false,
  max_text_tokens_per_segment: 120,
  param_16: true,
  param_17: 0.8,
  param_18: 30,
  param_19: 0.8,
  param_20: 0,
  param_21: 3,
  param_22: 10,
  param_23: 1500
});

console.log(result.data);
```

## 文件处理说明

上传音频文件时，需要使用 `handle_file()` 函数处理 Blob 或 File 对象：

```javascript
import { Client, handle_file } from "@gradio/client";

const response = await fetch("audio_file.wav");
const audioBlob = await response.blob();

const result = await client.predict("/gen_single", {
  prompt: handle_file(audioBlob),
  // ... 其他参数
});
```

## 注意事项

- 所有音频文件参数都需要使用 `handle_file()` 包装
- 情感向量参数 (vec1-vec8) 的取值范围通常在 -1 到 1 之间
- 建议根据实际需求调整生成参数以获得最佳效果
- 对于长文本，适当调整 `max_text_tokens_per_segment` 可以提高生成质量

[1](https://www.gradio.app/guides/getting-started-with-the-js-client)
