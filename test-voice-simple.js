// 简单的语音测试
import { config } from 'dotenv';
config();

import * as gradio from '@gradio/client';

async function testVoiceSimple() {
  console.log('🔧 测试语音合成...');

  try {
    console.log('连接到IndexTTS...');
    const client = await gradio.client('Tom1986/indextts2');
    console.log('✅ 连接成功');

    // 创建虚拟音频数据用于测试
    const dummyAudio = new Uint8Array(1024); // 1KB的虚拟音频

    console.log('测试API调用...');
    const result = await client.predict('/gen_single', {
      emo_control_method: 'Same as the voice reference',
      prompt: dummyAudio,
      text: 'Hello world',
      emo_ref_path: dummyAudio,
      emo_weight: 0.8,
      vec1: 0, vec2: 0, vec3: 0, vec4: 0, vec5: 0,
      vec6: 0, vec7: 0, vec8: 0,
      emo_text: '',
      emo_random: false,
      max_text_tokens_per_sentence: 20,
      param_16: true,
      param_17: 0.8,
      param_18: 30,
      param_19: 0.8,
      param_20: 0,
      param_21: 3,
      param_22: 10,
      param_23: 1500
    });

    console.log('✅ API调用成功');
    console.log('Result type:', typeof result);
    console.log('Result keys:', result ? Object.keys(result) : 'null');

  } catch (error) {
    console.error('❌ 语音测试失败:', error.message);
    console.error('Stack:', error.stack);
  }
}

testVoiceSimple();
