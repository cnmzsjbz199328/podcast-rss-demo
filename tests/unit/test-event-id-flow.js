/**
 * 测试Event ID异步流程
 */

const BASE_URL = 'https://podcast-rss-demo.tj15982183241.workers.dev';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testAsyncFlow() {
  console.log('🚀 开始测试Event ID异步流程\n');

  // 步骤1: 生成Podcast
  console.log('1️⃣ 生成Podcast...');
  const generateResponse = await fetch(`${BASE_URL}/generate?style=news-anchor`, {
    method: 'POST'
  });
  
  if (!generateResponse.ok) {
    console.error('❌ 生成失败:', generateResponse.status);
    return;
  }

  const generateResult = await generateResponse.json();
  
  if (!generateResult.success) {
    console.error('❌ 生成失败:', generateResult.error);
    return;
  }

  const { episodeId, eventId, isAsync, audioUrl } = generateResult.data;
  
  console.log('✅ Podcast生成成功');
  console.log(`  Episode ID: ${episodeId}`);
  console.log(`  Event ID: ${eventId}`);
  console.log(`  Is Async: ${isAsync}`);
  console.log(`  Audio URL: ${audioUrl || '(null - 待生成)'}`);
  console.log('');

  // 步骤2: 检查episode详情
  console.log('2️⃣ 检查Episode详情...');
  await sleep(2000); // 等待保存到数据库

  const detailResponse = await fetch(`${BASE_URL}/episodes/${episodeId}`);
  
  if (!detailResponse.ok) {
    console.error('❌ 获取详情失败:', detailResponse.status);
    const text = await detailResponse.text();
    console.error('响应:', text);
  } else {
    const detailResult = await detailResponse.json();
    console.log('✅ Episode详情:');
    console.log(`  TTS Event ID: ${detailResult.ttsEventId || '(未找到)'}`);
    console.log(`  TTS Status: ${detailResult.ttsStatus || '(未找到)'}`);
    console.log(`  Audio URL: ${detailResult.audioUrl || '(null)'}`);
  }
  console.log('');

  // 步骤3: 轮询音频生成结果
  console.log('3️⃣ 轮询音频生成结果...');
  console.log(`  等待30秒让IndexTTS生成音频...`);
  
  for (let i = 0; i < 6; i++) {
    await sleep(5000); // 每5秒轮询一次
    
    console.log(`  第${i + 1}次轮询...`);
    
    const pollResponse = await fetch(`${BASE_URL}/episodes/${episodeId}/poll-audio`, {
      method: 'POST'
    });
    
    if (!pollResponse.ok) {
      console.error(`  ❌ 轮询失败: ${pollResponse.status}`);
      const text = await pollResponse.text();
      console.error(`  响应: ${text.substring(0, 200)}`);
      continue;
    }
    
    const pollResult = await pollResponse.json();
    
    if (pollResult.status === 'completed') {
      console.log('  ✅ 音频生成完成！');
      console.log(`  Audio URL: ${pollResult.audioUrl}`);
      console.log(`  File Size: ${pollResult.fileSize} bytes`);
      break;
    } else if (pollResult.status === 'failed') {
      console.log('  ❌ 音频生成失败:', pollResult.error);
      break;
    } else {
      console.log(`  ⏳ 状态: ${pollResult.status || 'processing'}`);
    }
  }

  console.log('');
  console.log('🎉 测试完成！');
}

// 运行测试
testAsyncFlow().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});
