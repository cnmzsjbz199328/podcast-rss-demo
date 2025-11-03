#!/usr/bin/env node

/**
 * 测试 Gradio SSE 异步流程
 * 理解 IndexTTS 的 event_id 和 结果获取机制
 */

const BASE_URL = 'https://indexteam-indextts-2-demo.hf.space';

async function testGradioFlow() {
  console.log('🔬 测试 Gradio 异步流程\n');

  // 步骤 1: 调用 API 获取 event_id
  console.log('步骤 1: 调用 /gradio_api/call/gen_single');
  
  const voiceFileData = {
    path: 'https://pub-b436254f85684e9e95bebad4567b11ff.r2.dev/voice/kaluoling.mp3',
    url: 'https://pub-b436254f85684e9e95bebad4567b11ff.r2.dev/voice/kaluoling.mp3',
    size: null,
    orig_name: 'kaluoling.mp3',
    mime_type: 'audio/mpeg',
    is_stream: false,
    meta: { _type: 'gradio.FileData' }
  };

  const testText = '这是一个测试文本，用于验证音频生成功能。';

  const callResponse = await fetch(`${BASE_URL}/gradio_api/call/gen_single`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: [
        'Same as the voice reference',
        voiceFileData,
        testText,
        null, // emo_ref_path
        0.8, // emo_weight
        0, 0, 0, 0, 0, 0, 0, 0.8, // emotion vectors
        '', // emo_text
        false, // emo_random
        120, true, 0.8, 30, 0.8, 0, 3, 10, 1500
      ]
    })
  });

  if (!callResponse.ok) {
    throw new Error(`Call failed: ${callResponse.status}`);
  }

  const callResult = await callResponse.json();
  console.log('✅ Call response:', JSON.stringify(callResult, null, 2));

  const eventId = callResult.event_id;
  if (!eventId) {
    throw new Error('No event_id returned');
  }

  console.log(`\n📋 获得 event_id: ${eventId}`);

  // 步骤 2: 等待几秒让任务开始
  console.log('\n⏳ 等待 3 秒让任务开始...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 步骤 3: 尝试不同的轮询端点
  const endpoints = [
    `/gradio_api/call/gen_single/${eventId}`,
    `/queue/data?session_hash=${eventId}`,
    `/call/gen_single/${eventId}`,
    `/gradio_api/status/${eventId}`
  ];

  for (const endpoint of endpoints) {
    console.log(`\n🔍 尝试端点: ${endpoint}`);
    
    try {
      const url = `${BASE_URL}${endpoint}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        }
      });

      console.log(`  状态: ${response.status} ${response.statusText}`);
      console.log(`  Content-Type: ${response.headers.get('content-type')}`);

      if (response.ok) {
        const text = await response.text();
        console.log(`  响应长度: ${text.length} 字节`);
        console.log(`  前 500 字符:`, text.substring(0, 500));

        // 尝试解析 SSE
        const lines = text.split('\n');
        let events = [];
        
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            events.push(line.substring(7));
          }
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              console.log(`  发现事件数据:`, JSON.stringify(data).substring(0, 200));
            } catch (e) {
              // 忽略解析错误
            }
          }
        }

        if (events.length > 0) {
          console.log(`  发现的事件类型:`, events);
        }

        console.log('  ✅ 这个端点可用！');
        
        // 如果找到了有效端点，继续监听
        if (text.includes('process_completed') || text.includes('complete')) {
          console.log('\n🎉 音频已生成完成！');
          break;
        } else if (text.includes('process_generating') || text.includes('generating')) {
          console.log('\n⏳ 音频正在生成中...');
        }
      } else {
        const errorText = await response.text();
        console.log(`  ❌ 失败: ${errorText.substring(0, 200)}`);
      }
    } catch (error) {
      console.log(`  ❌ 错误: ${error.message}`);
    }
  }

  // 步骤 4: 持续轮询正确的端点
  console.log('\n🔄 开始持续轮询...');
  
  const correctEndpoint = `/gradio_api/call/gen_single/${eventId}`;
  
  for (let i = 0; i < 20; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log(`\n[${i + 1}/20] 轮询 ${correctEndpoint}`);
    
    try {
      const response = await fetch(`${BASE_URL}${correctEndpoint}`, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream'
        }
      });

      if (response.ok) {
        const text = await response.text();
        console.log(`  响应长度: ${text.length}`);
        
        // 查找完成标志
        if (text.includes('process_completed')) {
          console.log('  ✅ 找到 process_completed 事件！');
          
          // 提取音频 URL
          const lines = text.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.substring(6));
                if (data.msg === 'process_completed' && data.output) {
                  console.log('\n📦 输出数据:', JSON.stringify(data.output, null, 2));
                  
                  const audioUrl = data.output.data?.[0]?.url || 
                                  data.output.data?.[0]?.value?.url ||
                                  data.output?.[0]?.url;
                  
                  if (audioUrl) {
                    console.log(`\n🎵 音频 URL: ${audioUrl}`);
                    
                    // 测试下载音频
                    const fullUrl = audioUrl.startsWith('http') ? audioUrl : `${BASE_URL}${audioUrl}`;
                    console.log(`\n📥 尝试下载音频: ${fullUrl}`);
                    
                    const audioResponse = await fetch(fullUrl);
                    if (audioResponse.ok) {
                      const size = parseInt(audioResponse.headers.get('content-length') || '0');
                      console.log(`  ✅ 音频可下载，大小: ${size} 字节`);
                      return;
                    } else {
                      console.log(`  ❌ 音频下载失败: ${audioResponse.status}`);
                    }
                  }
                }
              } catch (e) {
                // 继续
              }
            }
          }
        } else if (text.includes('process_generating')) {
          console.log('  ⏳ 仍在生成中...');
        } else {
          console.log(`  ℹ️  未知状态，响应预览: ${text.substring(0, 100)}`);
        }
      } else {
        console.log(`  ❌ 状态: ${response.status}`);
      }
    } catch (error) {
      console.log(`  ❌ 错误: ${error.message}`);
    }
  }

  console.log('\n⏱️  轮询超时');
}

testGradioFlow().catch(error => {
  console.error('\n❌ 测试失败:', error);
  process.exit(1);
});
