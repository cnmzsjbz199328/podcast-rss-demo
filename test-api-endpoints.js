// 检查 IndexTTS API 可用端点和功能
import { config } from 'dotenv';
config();

import { Client, handle_file } from '@gradio/client';

async function checkAvailableEndpoints() {
  console.log('🔍 检查 IndexTTS-2-Demo 可用的 API 端点\n');

  try {
    const client = await Client.connect('IndexTeam/IndexTTS-2-Demo');
    console.log('✅ 连接成功\n');

    // 获取客户端信息
    console.log('📊 客户端信息:');
    console.log('   类型:', typeof client);
    console.log('   方法:', Object.getOwnPropertyNames(client).slice(0, 10).join(', '), '...\n');

    // 根据文档列出所有应该可用的端点
    const endpoints = [
      {
        name: '/on_method_select',
        description: '选择情感控制方法',
        params: { emo_control_method: 'Same as the voice reference' }
      },
      {
        name: '/on_input_text_change',
        description: '处理文本输入变化',
        params: { text: '测试', max_text_tokens_per_segment: 120 }
      },
      {
        name: '/on_input_text_change_1',
        description: '备用文本处理端点',
        params: { text: '测试', max_text_tokens_per_segment: 120 }
      },
      {
        name: '/on_experimental_change',
        description: '实验功能开关',
        params: { is_exp: false }
      },
      {
        name: '/update_prompt_audio',
        description: '更新提示音频',
        params: {}
      }
    ];

    console.log('🔍 检查辅助端点:\n');

    for (const endpoint of endpoints) {
      try {
        console.log(`测试 ${endpoint.name}...`);
        const result = await client.predict(endpoint.name, endpoint.params);
        console.log(`✅ 可用 - ${endpoint.description}`);
        console.log(`   返回类型: ${result.data?.constructor?.name || typeof result.data}`);
        console.log();
      } catch (error) {
        console.log(`⚠️  ${endpoint.name} - ${error.message}`);
        console.log();
      }
    }

    // 测试主端点
    console.log('🔍 测试主生成端点: /gen_single\n');

    try {
      // 创建虚拟音频
      const wavHeader = new ArrayBuffer(44);
      const audioBlob = new Blob([wavHeader], { type: 'audio/wav' });
      const promptFile = handle_file(audioBlob);
      const emoFile = handle_file(audioBlob);

      console.log('发送 /gen_single 请求...');
      const result = await client.predict('/gen_single', {
        emo_control_method: 'Same as the voice reference',
        prompt: promptFile,
        text: '测试文本',
        emo_ref_path: emoFile,
        emo_weight: 0.8,
        vec1: 0, vec2: 0, vec3: 0, vec4: 0, vec5: 0, vec6: 0, vec7: 0, vec8: 0,
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

      console.log('✅ /gen_single 端点可用');
      console.log('   返回类型:', result.data?.constructor?.name || typeof result.data);
      if (result.data?.url) {
        console.log('   返回 URL:', result.data.url.substring(0, 60) + '...');
      }
    } catch (error) {
      console.log('❌ /gen_single 端点错误:', error.message);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ API 端点检查完成');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
    console.error('确保:');
    console.error('  1. 网络连接正常');
    console.error('  2. @gradio/client 已安装 (npm install @gradio/client)');
    console.error('  3. IndexTTS-2-Demo 空间可访问');
  }
}

checkAvailableEndpoints();
