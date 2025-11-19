#!/usr/bin/env node

/**
 * 完整工作流测试
 * 测试从生成到轮询的完整流程，并立即开始轮询
 */

const BASE_URL = process.env.WORKER_URL || 'https://podcast-rss-demo.tj15982183241.workers.dev';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCompleteWorkflow() {
  console.log('🚀 测试完整播客生成工作流\n');
  console.log(`Worker URL: ${BASE_URL}`);
  console.log(`时间: ${new Date().toLocaleString('zh-CN')}\n`);
  
  // 步骤 1: 生成播客
  console.log('=' .repeat(60));
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
  console.log(`  是否异步: ${isAsync}`);
  console.log(`  耗时: ${(genDuration / 1000).toFixed(2)}秒\n`);

  if (!eventId) {
    console.error('❌ 没有获得 eventId，无法继续');
    process.exit(1);
  }

  // 步骤 2: 等待 60 秒再轮询（给 IndexTTS 足够时间生成）
  console.log('='.repeat(60));
  console.log('步骤 2: 等待音频生成');
  console.log('='.repeat(60));
  console.log(`⏱️  建议等待 60-90 秒让 IndexTTS 完成音频生成\n`);
  
  // 等待 60 秒
  const waitTime = 60;
  for (let i = waitTime; i > 0; i -= 5) {
    process.stdout.write(`\r⏳ 等待中... 剩余 ${i} 秒`);
    await sleep(5000);
  }
  console.log('\r✅ 等待完成，开始轮询\n');
  
  // 步骤 3: 轮询音频（应该只需要一次）
  console.log('='.repeat(60));
  console.log('步骤 3: 轮询音频生成结果');
  console.log('='.repeat(60));
  
  const maxAttempts = 3; // 最多尝试 3 次
  const pollInterval = 10000; // 10秒间隔
  
  let pollSuccess = false;
  let pollStart = Date.now();
  
  for (let i = 1; i <= maxAttempts; i++) {
    const totalElapsed = Math.floor((Date.now() - genStart) / 1000);
    console.log(`\n[${i}/${maxAttempts}] 轮询中... (距生成已过 ${totalElapsed}秒)`);
    
    try {
      const pollResponse = await fetch(`${BASE_URL}/episodes/${episodeId}/poll-audio`, {
        method: 'POST'
      });

      if (!pollResponse.ok) {
        const errorText = await pollResponse.text();
        console.error(`  ❌ 请求失败 (${pollResponse.status})`);
        console.error(`  ${errorText.substring(0, 300)}`);
        
        // 如果是 session not found，说明等待时间还不够或 session 已过期
        if (errorText.includes('Session not found')) {
          if (totalElapsed < 90) {
            console.log(`  💡 提示: 可能需要等待更久（建议 60-90秒）`);
          } else {
            console.error('\n❌ IndexTTS Session 已过期！');
            console.error('   尝试等待了足够时间，但 session 仍然失效。');
            process.exit(1);
          }
        }
        
        if (i < maxAttempts) {
          await sleep(pollInterval);
          continue;
        } else {
          process.exit(1);
        }
      }

      const pollResult = await pollResponse.json();
      
      if (pollResult.status === 'completed') {
        const totalTime = Date.now() - genStart;
        console.log('\n✅ 音频生成完成！');
        console.log(`  Audio URL: ${pollResult.audioUrl}`);
        console.log(`  文件大小: ${(pollResult.fileSize / 1024).toFixed(2)} KB`);
        console.log(`  总耗时: ${(totalTime / 1000).toFixed(2)}秒`);
        console.log(`    - 生成请求: ${(genDuration / 1000).toFixed(2)}秒`);
        console.log(`    - 等待时间: ${waitTime}秒`);
        console.log(`    - 轮询耗时: ${((Date.now() - pollStart) / 1000).toFixed(2)}秒`);
        
        pollSuccess = true;
        break;
        
      } else if (pollResult.status === 'failed') {
        console.error('\n❌ 音频生成失败');
        console.error(`  错误: ${pollResult.error}`);
        process.exit(1);
        
      } else if (pollResult.status === 'processing') {
        console.log(`  ⏳ 状态: ${pollResult.status}`);
        if (pollResult.message) {
          console.log(`     ${pollResult.message}`);
        }
        if (pollResult.estimatedWaitTime) {
          console.log(`     建议等待: ${pollResult.estimatedWaitTime}秒`);
        }
      }
      
    } catch (error) {
      console.error(`  ❌ 轮询出错: ${error.message}`);
    }
    
    if (i < maxAttempts) {
      await sleep(pollInterval);
    }
  }

  if (!pollSuccess) {
    console.error('\n❌ 轮询未成功');
    console.error('   音频可能仍在生成中，或遇到了其他问题');
    process.exit(1);
  }

  // 步骤 4: 验证剧集详情
  console.log('\n' + '='.repeat(60));
  console.log('步骤 4: 验证剧集详情');
  console.log('='.repeat(60));
  
  const detailResponse = await fetch(`${BASE_URL}/episodes/${episodeId}`);
  
  if (!detailResponse.ok) {
    console.error('❌ 获取剧集详情失败');
    process.exit(1);
  }
  
  const detailResult = await detailResponse.json();
  const episode = detailResult.data;
  
  console.log('✅ 剧集详情:');
  console.log(`  ID: ${episode.id}`);
  console.log(`  标题: ${episode.title}`);
  console.log(`  风格: ${episode.style}`);
  console.log(`  时长: ${Math.floor(episode.duration / 60)}分${Math.floor(episode.duration % 60)}秒`);
  console.log(`  音频URL: ${episode.audioUrl}`);
  console.log(`  TTS状态: ${episode.ttsStatus}`);

  // 步骤 5: 验证音频文件
  console.log('\n' + '='.repeat(60));
  console.log('步骤 5: 验证音频文件可访问性');
  console.log('='.repeat(60));
  
  if (episode.audioUrl) {
    try {
      const audioResponse = await fetch(episode.audioUrl, { method: 'HEAD' });
      
      if (audioResponse.ok) {
        const contentLength = parseInt(audioResponse.headers.get('content-length') || '0');
        const contentType = audioResponse.headers.get('content-type');
        
        console.log('✅ 音频文件可访问');
        console.log(`  Content-Type: ${contentType}`);
        console.log(`  Content-Length: ${(contentLength / 1024).toFixed(2)} KB`);
        
        if (contentLength < 1000) {
          console.warn('  ⚠️  警告: 文件太小，可能不是有效音频');
        }
      } else {
        console.error(`❌ 音频文件无法访问 (${audioResponse.status})`);
      }
    } catch (error) {
      console.error(`❌ 音频访问出错: ${error.message}`);
    }
  } else {
    console.warn('⚠️  剧集没有音频URL');
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 完整工作流测试通过！');
  console.log('='.repeat(60));
  
  process.exit(0);
}

// 运行测试
testCompleteWorkflow().catch(error => {
  console.error('\n❌ 测试失败:', error.message);
  console.error(error.stack);
  process.exit(1);
});
