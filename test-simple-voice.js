// 简单语音测试 - How are you
import { config } from 'dotenv';
config();

async function testSimpleVoice() {
  console.log('🎤 测试简单语音: "How are you"');

  try {
    const baseUrl = 'https://indexteam-indextts-2-demo.hf.space';

    // 使用固定的郭德纲语音样本
    const voiceFileData = {
      path: "https://pub-b436254f85684e9e95bebad4567b11ff.r2.dev/voice/guodegang.mp3",
      url: "https://pub-b436254f85684e9e95bebad4567b11ff.r2.dev/voice/guodegang.mp3",
      size: null,
      orig_name: "guodegang.mp3",
      mime_type: "audio/mpeg",
      is_stream: false,
      meta: { _type: "gradio.FileData" }
    };

    console.log('正在调用语音API...');

    const response = await fetch(`${baseUrl}/gradio_api/call/gen_single`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: [
          'Same as the voice reference', // emo_control_method
          voiceFileData, // prompt (audio file)
          'How are you', // text
          null, // emo_ref_path (audio file)
          0.8, // emo_weight
          0.8, // vec1 - Happy
          0, 0, 0, 0, 0, 0, 0, 0, // vec2-vec8
          '', // emo_text
          false, // emo_random
          120, // max_text_tokens_per_segment
          true, // param_16
          0.8, // param_17
          30, // param_18
          0.8, // param_19
          0, // param_20
          3, // param_21
          10, // param_22
          1500 // param_23
        ]
      })
    });

    console.log('API响应状态:', response.status);

    if (response.ok) {
      const result = await response.json();
      console.log('✅ API调用成功!');
      console.log('响应数据:', result);

      if (result.event_id) {
        console.log('🎯 异步处理已启动');
        console.log('📋 Event ID:', result.event_id);
        console.log('⏳ 请等待几秒钟处理完成...');

        // 等待8秒模拟处理时间
        await new Promise(resolve => setTimeout(resolve, 8000));
        console.log('✨ 处理应该已完成！');
      }

    } else {
      const errorText = await response.text();
      console.log('❌ API调用失败');
      console.log('错误信息:', errorText);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testSimpleVoice();
