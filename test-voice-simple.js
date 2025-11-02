// 简单的语音测试
import { config } from 'dotenv';
config();

import * as gradio from '@gradio/client';

async function testVoiceSimple() {
  try {
    console.log('🔧 测试语音合成...');

    if (gradio.client) {
      console.log('✅ gradio.client 方法存在');

      console.log('正在连接到IndexTTS-2-Demo...');
      const client = await gradio.client('IndexTeam/IndexTTS-2-Demo');
      console.log('✅ 连接成功');

      console.log('测试API调用...');

      // 步骤1: 设置情感控制方法
      console.log('设置情感控制方法...');
      const methodResult = await client.predict('/on_method_select', {
        emo_control_method: 'Same as the voice reference'
      });
      console.log('✅ 方法设置成功');

      // 步骤2: 处理输入文本
      console.log('处理输入文本...');
      const textResult = await client.predict('/on_input_text_change', {
        text: 'Hello world, this is a test.',
        max_text_tokens_per_segment: 20
      });
      console.log('✅ 文本处理成功');
      console.log('文本结果:', textResult);

    } else {
      console.log('❌ gradio.client 方法不存在');
    }

  } catch (error) {
    console.error('❌ 语音测试失败:', error.message);
  }
}

testVoiceSimple();
