#!/usr/bin/env node

/**
 * 简单的 TTS 测试 - 直接测试 IndexTTS API
 */

const BASE_URL = 'https://tom1986-indextts2.hf.space';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testSimpleTTS() {
  console.log('🎤 测试郭德纲风格语音生成\n');
  
  const testText = '剑桥郡火车刺伤案中，一名列车工作人员生命垂危。然而，警方赞扬司机、乘务员及乘客英勇施救，避免了更严重后果。与此同时，一名因贩毒被捕的英国19岁怀孕少女，在格鲁吉亚监狱获释，她已怀孕八个月。这两起事件都提醒我们，在挑战面前，总有生命韧性与人道光辉闪耀。';
  console.log(`测试文本: "${testText}"\n`);
  
  // 步骤 1: 调用 IndexTTS API
  console.log('步骤 1: 调用 IndexTTS API...');
  
  const voiceFileData = {
    path: 'https://pub-b436254f85684e9e95bebad4567b11ff.r2.dev/voice/guodegang.mp3',
    url: 'https://pub-b436254f85684e9e95bebad4567b11ff.r2.dev/voice/guodegang.mp3',
    size: null,
    orig_name: 'guodegang.mp3',
    mime_type: 'audio/mpeg',
    is_stream: false,
    meta: { _type: 'gradio.FileData' }
  };

  const callResponse = await fetch(`${BASE_URL}/gradio_api/call/gen_single`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: [
        'Same as the voice reference',
        voiceFileData,
        testText,
        null, // emo_ref_path
        0.9, // emo_weight - 高情感权重
        0.8, // vec1 - Happy
        0, 0, 0, 0, 0,
        0.6, // vec7 - Surprise
        0, // vec8 - Neutral
        '', // emo_text
        false, // emo_random
        120, true, 0.8, 30, 0.8, 0, 3, 10, 1500
      ]
    })
  });

  if (!callResponse.ok) {
    const errorText = await callResponse.text();
    throw new Error(`API 调用失败: ${callResponse.status} - ${errorText}`);
  }

  const callResult = await callResponse.json();
  const eventId = callResult.event_id;
  
  console.log(`✅ API 调用成功`);
  console.log(`Event ID: ${eventId}\n`);

  // 步骤 2: 轮询结果
  console.log('步骤 2: 轮询音频生成结果...\n');
  
  const maxAttempts = 20;
  const intervalMs = 3000;
  
  for (let i = 1; i <= maxAttempts; i++) {
    await sleep(i === 1 ? 2000 : intervalMs); // 首次等待2秒
    
    console.log(`[${i}/${maxAttempts}] 轮询中...`);
    
    try {
      const sseUrl = `${BASE_URL}/gradio_api/call/gen_single/${eventId}`;
      const sseResponse = await fetch(sseUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        }
      });

      console.log(`  响应状态: ${sseResponse.status}`);

      if (!sseResponse.ok) {
        console.log(`  ❌ 请求失败: ${sseResponse.statusText}`);
        continue;
      }

      const text = await sseResponse.text();
      console.log(`  响应长度: ${text.length} 字节`);
      
      // 解析 SSE
      const lines = text.split('\n');
      let eventType = null;
      let eventData = null;

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventType = line.substring(7).trim();
        } else if (line.startsWith('data: ')) {
          try {
            eventData = JSON.parse(line.substring(6));
          } catch (e) {
            // 忽略解析错误
          }
        }
      }

      console.log(`  事件类型: ${eventType || 'unknown'}`);

      if (eventType === 'complete' && eventData) {
        console.log('\n🎉 音频生成完成！\n');
        
        // 提取音频 URL
        const audioUrl = eventData[0]?.value?.url || 
                        eventData[0]?.url;
        
        if (!audioUrl) {
          console.error('❌ 未找到音频 URL');
          console.log('响应数据:', JSON.stringify(eventData, null, 2));
          process.exit(1);
        }

        const fullUrl = audioUrl.startsWith('http') ? audioUrl : `${BASE_URL}${audioUrl}`;
        console.log(`🎵 音频 URL: ${fullUrl}\n`);

        // 下载音频
        console.log('📥 下载音频...');
        const audioResponse = await fetch(fullUrl);
        
        if (!audioResponse.ok) {
          throw new Error(`下载失败: ${audioResponse.status}`);
        }

        const audioData = await audioResponse.arrayBuffer();
        const audioSize = audioData.byteLength;
        
        console.log(`✅ 下载成功`);
        console.log(`  文件大小: ${audioSize} 字节 (${(audioSize / 1024).toFixed(1)} KB)`);
        
        if (audioSize < 1000) {
          console.warn(`\n⚠️  警告: 文件太小，可能不是有效的音频文件`);
        } else {
          console.log(`\n✅ 音频文件大小正常，测试成功！`);
        }
        
        // 保存到本地
        const fs = require('fs');
        const outputPath = '/tmp/test-guodegang.wav';
        fs.writeFileSync(outputPath, Buffer.from(audioData));
        console.log(`\n💾 音频已保存到: ${outputPath}`);
        console.log(`   可以使用以下命令播放: afplay ${outputPath}`);
        
        process.exit(0);
        
      } else if (eventType === 'generating' || eventType === 'pending') {
        console.log(`  ⏳ 正在生成中...`);
        
      } else if (eventType === 'error') {
        console.error('\n❌ 生成失败');
        console.error('错误信息:', JSON.stringify(eventData, null, 2));
        process.exit(1);
        
      } else {
        console.log(`  ℹ️  状态未知，继续等待...`);
        if (text.length < 100) {
          console.log(`  响应内容: ${text}`);
        }
      }
      
    } catch (error) {
      console.error(`  ❌ 轮询出错: ${error.message}`);
    }
  }

  console.log('\n⏱️  轮询超时（60秒）');
  process.exit(1);
}

testSimpleTTS().catch(error => {
  console.error('\n❌ 测试失败:', error);
  console.error(error.stack);
  process.exit(1);
});
