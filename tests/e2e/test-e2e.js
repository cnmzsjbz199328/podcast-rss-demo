#!/usr/bin/env node

/**
 * 完整的端到端测试：生成 -> 立即轮询
 */

const BASE_URL = 'https://podcast-rss-demo.tj15982183241.workers.dev';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testE2E() {
  console.log('🚀 开始端到端测试\n');
  
  // 步骤 1: 生成 podcast
  console.log('📻 步骤 1: 生成新的 podcast...');
  const startTime = Date.now();
  
  const genResponse = await fetch(`${BASE_URL}/generate?style=news-anchor`, {
    method: 'POST'
  });
  
  if (!genResponse.ok) {
    throw new Error(`生成失败: ${genResponse.status}`);
  }
  
  const genResult = await genResponse.json();
  const genTime = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log(`✅ Podcast 生成完成 (耗时: ${genTime}秒)\n`);
  
  const episodeId = genResult.data.episodeId;
  const eventId = genResult.data.eventId;
  const isAsync = genResult.data.isAsync;
  
  console.log('📋 Episode 信息:');
  console.log(`  Episode ID: ${episodeId}`);
  console.log(`  Event ID: ${eventId}`);
  console.log(`  Is Async: ${isAsync}`);
  console.log(`  标题: ${genResult.data.title}\n`);
  
  if (!eventId) {
    console.error('❌ 没有 event ID，无法轮询');
    process.exit(1);
  }
  
  // 步骤 2: 立即开始轮询（不等待）
  console.log('🔄 步骤 2: 开始轮询音频生成状态...\n');
  
  const maxAttempts = 24; // 2分钟（每5秒一次）
  const intervalMs = 5000;
  
  for (let i = 1; i <= maxAttempts; i++) {
    const attemptStart = Date.now();
    console.log(`[${i}/${maxAttempts}] 轮询中... (已等待 ${(i - 1) * 5}秒)`);
    
    try {
      const pollResponse = await fetch(
        `${BASE_URL}/episodes/${episodeId}/poll-audio`,
        { method: 'POST' }
      );
      
      const pollTime = ((Date.now() - attemptStart) / 1000).toFixed(1);
      console.log(`  响应时间: ${pollTime}秒, 状态: ${pollResponse.status}`);
      
      if (!pollResponse.ok) {
        const errorText = await pollResponse.text();
        console.error(`  ❌ 轮询失败: ${errorText.substring(0, 150)}`);
        
        // 解析错误信息
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error) {
            console.error(`  错误详情: ${errorJson.error}`);
          }
        } catch (e) {
          // 忽略
        }
        
        if (i < maxAttempts) {
          console.log(`  等待 ${intervalMs / 1000}秒后重试...\n`);
          await sleep(intervalMs);
          continue;
        } else {
          throw new Error('轮询次数已用尽');
        }
      }
      
      const pollResult = await pollResponse.json();
      console.log(`  状态: ${pollResult.status}`);
      
      if (pollResult.status === 'completed') {
        console.log('\n🎉 音频生成完成！');
        console.log(`  Audio URL: ${pollResult.audioUrl}`);
        console.log(`  文件大小: ${pollResult.fileSize} 字节`);
        
        // 验证音频文件
        console.log('\n📥 验证音频文件...');
        const audioResponse = await fetch(pollResult.audioUrl);
        if (audioResponse.ok) {
          const contentLength = audioResponse.headers.get('content-length');
          const contentType = audioResponse.headers.get('content-type');
          console.log(`  ✅ 音频可访问`);
          console.log(`  Content-Type: ${contentType}`);
          console.log(`  Content-Length: ${contentLength} 字节`);
          
          if (parseInt(contentLength || '0') < 1000) {
            console.warn(`  ⚠️  文件太小，可能是错误文件`);
          } else {
            console.log(`  ✅ 音频文件大小正常`);
          }
        } else {
          console.error(`  ❌ 无法访问音频: ${audioResponse.status}`);
        }
        
        // 检查数据库状态
        console.log('\n📊 检查数据库状态...');
        const epResponse = await fetch(`${BASE_URL}/episodes/${episodeId}`);
        if (epResponse.ok) {
          const epData = await epResponse.json();
          const ep = epData.data;
          console.log(`  TTS Status: ${ep.ttsStatus}`);
          console.log(`  Audio URL: ${ep.audioUrl ? '已设置' : '未设置'}`);
          console.log(`  File Size: ${ep.fileSize} 字节`);
        }
        
        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n✅ 测试成功！总耗时: ${totalTime}秒`);
        process.exit(0);
        
      } else if (pollResult.status === 'failed') {
        console.error('\n❌ 音频生成失败');
        console.error(`  错误: ${pollResult.error}`);
        process.exit(1);
        
      } else if (pollResult.status === 'processing') {
        console.log(`  ⏳ 处理中... ${pollResult.message || ''}`);
        
        if (i < maxAttempts) {
          console.log(`  等待 ${intervalMs / 1000}秒后继续...\n`);
          await sleep(intervalMs);
        }
      } else {
        console.warn(`  ⚠️  未知状态: ${pollResult.status}`);
        if (i < maxAttempts) {
          await sleep(intervalMs);
        }
      }
      
    } catch (error) {
      console.error(`  ❌ 错误: ${error.message}`);
      
      if (i < maxAttempts) {
        console.log(`  等待 ${intervalMs / 1000}秒后重试...\n`);
        await sleep(intervalMs);
      } else {
        throw error;
      }
    }
  }
  
  console.log('\n⏱️  轮询超时（2分钟）');
  console.log('音频可能仍在生成，请稍后手动检查');
  process.exit(1);
}

testE2E().catch(error => {
  console.error('\n❌ 测试失败:', error);
  console.error(error.stack);
  process.exit(1);
});
