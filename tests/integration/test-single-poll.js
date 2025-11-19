#!/usr/bin/env node

/**
 * 单次轮询测试
 * 策略：等待足够长的时间（120秒）后只尝试一次轮询
 * 原因：Gradio SSE 只能读取一次，重复轮询会失效
 */

const BASE_URL = process.env.WORKER_URL || 'https://podcast-rss-demo.tj15982183241.workers.dev';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testSinglePoll() {
  console.log('🚀 单次轮询测试\n');
  console.log(`Worker URL: ${BASE_URL}`);
  console.log(`时间: ${new Date().toLocaleString('zh-CN')}\n`);
  console.log('📝 策略: 生成 → 等待 120 秒 → 单次轮询（不重试）\n');
  
  // 步骤 1: 生成播客
  console.log('='.repeat(60));
  console.log('步骤 1: 生成播客');
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
  
  console.log('✅ 播客生成请求成功');
  console.log(`  Episode ID: ${episodeId}`);
  console.log(`  Event ID: ${eventId}`);
  console.log(`  标题: ${title}`);
  console.log(`  耗时: ${(genDuration / 1000).toFixed(2)}秒\n`);

  if (!eventId) {
    console.error('❌ 没有获得 eventId，无法继续');
    process.exit(1);
  }

  // 步骤 2: 等待音频生成完成
  console.log('='.repeat(60));
  console.log('步骤 2: 等待音频生成完成');
  console.log('='.repeat(60));
  
  const waitTime = 120; // 等待 120 秒（2分钟）
  console.log(`⏱️  等待 ${waitTime} 秒以确保 IndexTTS 完成音频生成`);
  console.log(`    (根据经验，短文本需要 60-90 秒，长文本需要 120-180 秒)`);
  console.log(`    注意：由于 Gradio SSE 限制，只能尝试一次读取\n`);
  
  // 显示倒计时（每10秒显示一次）
  for (let remaining = waitTime; remaining > 0; remaining -= 10) {
    const elapsed = waitTime - remaining;
    const progress = Math.floor((elapsed / waitTime) * 100);
    const bar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));
    
    process.stdout.write(`\r⏳ [${bar}] ${progress}% - 还剩 ${remaining} 秒...`);
    
    await sleep(Math.min(10, remaining) * 1000);
  }
  
  console.log('\r✅ 等待完成！开始轮询...                                \n');
  
  // 步骤 3: 单次轮询（不重试）
  console.log('='.repeat(60));
  console.log('步骤 3: 获取音频结果（仅一次尝试）');
  console.log('='.repeat(60));
  
  try {
    console.log('📞 发起轮询请求...');
    
    const pollResponse = await fetch(`${BASE_URL}/episodes/${episodeId}/poll-audio`, {
      method: 'POST'
    });

    const totalElapsed = Math.floor((Date.now() - genStart) / 1000);
    console.log(`   (距生成开始已过 ${totalElapsed} 秒)\n`);

    if (!pollResponse.ok) {
      const errorText = await pollResponse.text();
      console.error(`❌ 轮询请求失败 (${pollResponse.status})`);
      console.error(`   错误: ${errorText.substring(0, 500)}\n`);
      
      if (errorText.includes('Session not found') || errorText.includes('404')) {
        console.error('💡 分析:');
        console.error('   1. IndexTTS Session 已过期（可能性较大）');
        console.error('   2. 或者等待时间仍不够长');
        console.error('');
        console.error('🔧 建议:');
        console.error('   - 尝试增加等待时间至 150-180 秒');
        console.error('   - 或考虑使用其他 TTS 服务');
      }
      
      process.exit(1);
    }

    const pollResult = await pollResponse.json();
    
    if (pollResult.status === 'completed') {
      const totalTime = Date.now() - genStart;
      
      console.log('🎉 音频生成完成！\n');
      console.log('结果信息:');
      console.log(`  Audio URL: ${pollResult.audioUrl}`);
      console.log(`  文件大小: ${(pollResult.fileSize / 1024).toFixed(2)} KB`);
      console.log('');
      console.log('耗时统计:');
      console.log(`  生成请求: ${(genDuration / 1000).toFixed(2)} 秒`);
      console.log(`  等待时间: ${waitTime} 秒`);
      console.log(`  总耗时:   ${(totalTime / 1000).toFixed(2)} 秒`);
      
      // 验证音频文件
      console.log('\n' + '='.repeat(60));
      console.log('步骤 4: 验证音频文件');
      console.log('='.repeat(60));
      
      try {
        const audioResponse = await fetch(pollResult.audioUrl, { method: 'HEAD' });
        
        if (audioResponse.ok) {
          const contentLength = parseInt(audioResponse.headers.get('content-length') || '0');
          const contentType = audioResponse.headers.get('content-type');
          
          console.log('✅ 音频文件可访问');
          console.log(`  Content-Type: ${contentType}`);
          console.log(`  Content-Length: ${(contentLength / 1024).toFixed(2)} KB`);
          
          if (contentLength > 10000) {
            console.log('\n🎉 测试完全成功！');
            process.exit(0);
          } else {
            console.warn('\n⚠️  警告: 文件太小，可能不是有效音频');
          }
        } else {
          console.error(`❌ 音频文件无法访问 (${audioResponse.status})`);
        }
      } catch (error) {
        console.error(`❌ 音频访问出错: ${error.message}`);
      }
      
    } else if (pollResult.status === 'failed') {
      console.error('❌ 音频生成失败');
      console.error(`   错误: ${pollResult.error}`);
      process.exit(1);
      
    } else if (pollResult.status === 'processing') {
      console.warn('⚠️  音频仍在生成中');
      console.warn(`   状态: ${pollResult.status}`);
      console.warn(`   消息: ${pollResult.message || '无'}`);
      console.warn('');
      console.warn('💡 建议:');
      console.warn(`   - 等待时间 ${waitTime}秒 可能仍不够`);
      console.warn('   - 下次尝试增加到 180 秒或更长');
      console.warn('   - 或检查 IndexTTS 服务状态');
      process.exit(1);
      
    } else {
      console.error(`❌ 未知状态: ${pollResult.status}`);
      console.error(`   响应: ${JSON.stringify(pollResult, null, 2)}`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error(`❌ 轮询出错: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// 显示使用说明
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
单次轮询测试工具

用法:
  node tests/integration/test-single-poll.js

说明:
  本测试实现"等待 + 单次轮询"策略，避免 Gradio SSE 重复读取失效问题。
  
  流程:
  1. 发起播客生成请求（约 20-30 秒）
  2. 等待 120 秒让 IndexTTS 完成音频生成
  3. 进行单次轮询获取结果（不重试）
  4. 验证音频文件可访问性

环境变量:
  WORKER_URL - Worker 地址（默认: https://podcast-rss-demo.tj15982183241.workers.dev）

注意事项:
  - 如果 120 秒不够，可以修改脚本中的 waitTime 变量
  - IndexTTS session 有时间限制，等太久也可能失效
  - 建议等待时间: 90-180 秒
`);
  process.exit(0);
}

// 运行测试
console.log('━'.repeat(60));
console.log('   单次轮询测试 - 避免 Gradio SSE 重复读取问题');
console.log('━'.repeat(60));
console.log('');

testSinglePoll().catch(error => {
  console.error('\n❌ 测试执行失败:', error.message);
  console.error(error.stack);
  process.exit(1);
});
