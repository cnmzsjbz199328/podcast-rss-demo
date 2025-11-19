#!/usr/bin/env node

/**
 * 立即轮询测试
 * 策略：生成后立即轮询，模拟 test-simple-tts.js 的成功模式
 */

const BASE_URL = process.env.WORKER_URL || 'https://podcast-rss-demo.tj15982183241.workers.dev';
const INDEXTTS_URL = 'https://indexteam-indextts-2-demo.hf.space';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 直接轮询 IndexTTS（模拟 test-simple-tts.js）
 */
async function pollIndexTTSDirectly(eventId) {
  console.log('📞 直接向 IndexTTS 发起 SSE 轮询...');
  console.log(`   Event ID: ${eventId}`);
  console.log(`   URL: ${INDEXTTS_URL}/gradio_api/call/gen_single/${eventId}\n`);
  
  const maxAttempts = 20;
  const intervalMs = 3000;
  
  for (let i = 1; i <= maxAttempts; i++) {
    await sleep(i === 1 ? 2000 : intervalMs); // 首次等待2秒
    
    console.log(`[${i}/${maxAttempts}] 轮询中...`);
    
    try {
      const sseUrl = `${INDEXTTS_URL}/gradio_api/call/gen_single/${eventId}`;
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
        
        if (sseResponse.status === 404) {
          console.error('\n❌ Session 不存在或已过期');
          return null;
        }
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
        const audioUrl = eventData[0]?.value?.url || eventData[0]?.url;
        
        if (!audioUrl) {
          console.error('❌ 未找到音频 URL');
          console.log('响应数据:', JSON.stringify(eventData, null, 2));
          return null;
        }

        const fullUrl = audioUrl.startsWith('http') ? audioUrl : `${INDEXTTS_URL}${audioUrl}`;
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
        
        return {
          audioUrl: fullUrl,
          audioData,
          audioSize
        };
        
      } else if (eventType === 'generating' || eventType === 'pending') {
        console.log(`  ⏳ 正在生成中...`);
        
      } else if (eventType === 'error') {
        console.error('\n❌ 生成失败');
        console.error('错误信息:', JSON.stringify(eventData, null, 2));
        return null;
        
      } else {
        console.log(`  ℹ️  状态未知，继续等待...`);
        if (text.length < 100 && text.length > 0) {
          console.log(`  响应内容: ${text}`);
        }
      }
      
    } catch (error) {
      console.error(`  ❌ 轮询出错: ${error.message}`);
    }
  }

  console.log('\n⏱️  轮询超时（60秒）');
  return null;
}

async function testImmediatePoll() {
  console.log('🚀 立即轮询测试\n');
  console.log(`Worker URL: ${BASE_URL}`);
  console.log(`IndexTTS URL: ${INDEXTTS_URL}`);
  console.log(`时间: ${new Date().toLocaleString('zh-CN')}\n`);
  console.log('📝 策略: 生成 → 立即直接向 IndexTTS 轮询（绕过 Worker）\n');
  
  // 步骤 1: 生成Podcast
  console.log('='.repeat(60));
  console.log('步骤 1: 生成Podcast');
  console.log('='.repeat(60));
  
  const genStart = Date.now();
  const generateResponse = await fetch(`${BASE_URL}/generate?style=news-anchor`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  if (!generateResponse.ok) {
    const errorText = await generateResponse.text();
    console.error(`❌ 生成失败: ${generateResponse.status}`);
    console.error(errorText);
    process.exit(1);
  }

  const generateResult = await generateResponse.json();
  const genDuration = Date.now() - genStart;
  
  if (!generateResult.success) {
    console.error('❌ 生成失败:', generateResult.error);
    process.exit(1);
  }

  const { episodeId, eventId, title, isAsync } = generateResult.data;
  
  console.log('✅ Podcast生成请求成功');
  console.log(`  Episode ID: ${episodeId}`);
  console.log(`  Event ID: ${eventId}`);
  console.log(`  标题: ${title}`);
  console.log(`  耗时: ${(genDuration / 1000).toFixed(2)}秒\n`);

  if (!eventId) {
    console.error('❌ 没有获得 eventId，无法继续');
    process.exit(1);
  }

  // 步骤 2: 立即直接轮询 IndexTTS（不通过 Worker）
  console.log('='.repeat(60));
  console.log('步骤 2: 立即直接轮询 IndexTTS（绕过 Worker）');
  console.log('='.repeat(60));
  console.log('💡 这模拟了 test-simple-tts.js 的成功路径\n');
  
  const pollResult = await pollIndexTTSDirectly(eventId);
  
  if (!pollResult) {
    console.error('\n❌ 轮询失败');
    console.error('');
    console.error('📊 对比分析:');
    console.error('   ✅ test-simple-tts.js: 直接调用 IndexTTS → 立即轮询 → 成功');
    console.error('   ❌ Worker 流程: 生成脚本(25s) → 调用 IndexTTS → 返回 → 轮询失败');
    console.error('');
    console.error('💡 可能的原因:');
    console.error('   1. IndexTTS session 在 Worker 生成过程中过期');
    console.error('   2. 或者 SSE 读取时机问题');
    console.error('   3. 需要在生成后立即读取 SSE 流');
    process.exit(1);
  }

  const totalTime = Date.now() - genStart;
  
  console.log('\n' + '='.repeat(60));
  console.log('步骤 3: 对比分析');
  console.log('='.repeat(60));
  
  console.log('\n✅ 立即轮询成功！');
  console.log('\n耗时统计:');
  console.log(`  生成请求: ${(genDuration / 1000).toFixed(2)} 秒`);
  console.log(`  音频轮询: ${((totalTime - genDuration) / 1000).toFixed(2)} 秒`);
  console.log(`  总耗时:   ${(totalTime / 1000).toFixed(2)} 秒`);
  
  console.log('\n📊 对比结果:');
  console.log('   ✅ test-simple-tts.js: 直接调用 → 立即轮询 → 成功 ✓');
  console.log('   ✅ 本测试: Worker生成 → 立即直接轮询 IndexTTS → 成功 ✓');
  console.log('   ❌ Worker轮询: Worker生成 → 通过Worker轮询 → 失败 ✗');
  
  console.log('\n💡 结论:');
  console.log('   问题不在于文本长度或生成时间');
  console.log('   问题在于 Worker 的轮询实现与 IndexTTS SSE 机制不兼容');
  console.log('   解决方案: Worker 需要在调用 IndexTTS 后立即读取 SSE 流');
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 测试成功！找到了问题根源。');
  console.log('='.repeat(60));
  
  process.exit(0);
}

// 运行测试
console.log('━'.repeat(60));
console.log('   立即轮询测试 - 找出 Worker 与 test-simple-tts.js 的差异');
console.log('━'.repeat(60));
console.log('');

testImmediatePoll().catch(error => {
  console.error('\n❌ 测试执行失败:', error.message);
  console.error(error.stack);
  process.exit(1);
});
