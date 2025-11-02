// 修复后的语音测试
import { config } from 'dotenv';
config();

import * as gradio from '@gradio/client';

async function testVoiceSimpleFix() {
  console.log('🔧 测试修复后的语音API...');

  try {
    console.log('连接到IndexTTS-2-Demo...');
    const client = await gradio.client('IndexTeam/IndexTTS-2-Demo');
    console.log('✅ 连接成功');

    // 步骤1: 设置情感控制方法
    console.log('步骤1: 设置情感控制方法...');
    const methodResult = await client.predict('/on_method_select', {
      emo_control_method: 'Same as the voice reference'
    });
    console.log('✅ 情感控制方法设置成功');

    // 步骤2: 处理输入文本
    console.log('步骤2: 处理输入文本...');
    const textResult = await client.predict('/on_input_text_change', {
      text: '你好，这是一个测试。',
      max_text_tokens_per_segment: 120
    });
    console.log('✅ 文本处理成功');

    // 步骤3: 尝试生成音频（使用虚拟音频文件）
    console.log('步骤3: 尝试生成音频...');
    const dummyAudio = new Blob(['dummy audio data'], { type: 'audio/wav' });

    const result = await client.predict('/gen_single', {
      emo_control_method: 'Same as the voice reference',
      prompt: dummyAudio,
      text: '你好世界',
      emo_weight: 0.8,
      vec1: 0, vec2: 0, vec3: 0, vec4: 0, vec5: 0,
      vec6: 0, vec7: 0, vec8: 0,
      emo_text: '',
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

    console.log('✅ 音频生成API调用成功');
    console.log('结果类型:', typeof result);
    console.log('结果结构:', result ? Object.keys(result) : 'null');

  } catch (error) {
    console.error('❌ 语音测试失败:', error.message);
    console.error('错误详情:', error);
  }
}

testVoiceSimpleFix();
