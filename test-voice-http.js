// 使用HTTP直接调用语音API
import { config } from 'dotenv';
config();

async function testVoiceHttp() {
  console.log('🔧 测试HTTP直接调用语音API...');

  try {
    const baseUrl = 'https://indexteam-indextts-2-demo.hf.space';

    // 检查可用的端点
    console.log('检查可用端点...');
    const endpoints = [
      '/config',
      '/info',
      '/api',
      '/gradio_api/info',
      '/gradio_api/config'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${baseUrl}${endpoint}`);
        console.log(`${endpoint}: ${response.status}`);
        if (response.status === 200) {
          const contentType = response.headers.get('content-type');
          console.log(`  Content-Type: ${contentType}`);
          if (contentType?.includes('json')) {
          const data = await response.json();
          console.log(`  Data:`, endpoint === '/gradio_api/info' ? JSON.stringify(data, null, 2) : JSON.stringify(data, null, 2).substring(0, 200) + '...');
          } else if (response.status === 200) {
          const text = await response.text();
          console.log(`  HTML Content:`, text.substring(0, 100) + '...');
        }
        }
      } catch (error) {
        console.log(`${endpoint}: Error - ${error.message}`);
      }
    }

    // 尝试使用正确的Gradio named endpoints
    console.log('\\n尝试使用named endpoints...');

    try {
      // 使用正确的FileData格式
      const voiceFileData = {
        path: "https://pub-b436254f85684e9e95bebad4567b11ff.r2.dev/voice/guodegang.mp3",
        url: "https://pub-b436254f85684e9e95bebad4567b11ff.r2.dev/voice/guodegang.mp3",
        size: null,
        orig_name: "guodegang.mp3",
        mime_type: "audio/mpeg",
        is_stream: false,
        meta: { _type: "gradio.FileData" }
      };

      const predictResponse = await fetch(`${baseUrl}/gradio_api/call/gen_single`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: [
            'Same as the voice reference', // emo_control_method
            voiceFileData, // prompt (audio file)
            '你好，这是一个测试', // text
            null, // emo_ref_path (audio file)
            0.8, // emo_weight
            0, 0, 0, 0, 0, 0, 0, 0, // vec1-vec8
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

      console.log('Named endpoint响应状态:', predictResponse.status);
      if (predictResponse.ok) {
        const result = await predictResponse.json();
        console.log('✅ Named endpoint调用成功');
        console.log('响应数据:', result);
      } else {
        const errorText = await predictResponse.text();
        console.log('❌ Named endpoint调用失败');
        console.log('错误响应:', errorText.substring(0, 500));
      }

    } catch (error) {
      console.log('Named endpoint调用异常:', error.message);
    }

  } catch (error) {
    console.error('❌ HTTP测试失败:', error.message);
  }
}

testVoiceHttp();
