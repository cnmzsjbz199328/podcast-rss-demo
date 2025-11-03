#!/usr/bin/env node

/**
 * 测试异步音频轮询功能
 * 用法: node test-poll-audio.js [episodeId]
 */

const BASE_URL = 'https://podcast-rss-demo.tj15982183241.workers.dev';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generatePodcast() {
  console.log('\n📻 正在生成新的 podcast...');
  const response = await fetch(`${BASE_URL}/generate?style=news-anchor`, {
    method: 'POST'
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`生成失败: ${response.status} - ${text.substring(0, 200)}`);
  }

  const result = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(`API返回了无效数据: ${JSON.stringify(result)}`);
  }
  
  // API 返回单个episode数据，不是数组
  const episode = {
    id: result.data.episodeId,
    title: result.data.title,
    ttsEventId: result.data.eventId,  // API返回的是eventId，不是ttsEventId
    ttsStatus: result.data.isAsync ? 'pending' : 'completed',
    audioUrl: result.data.audioUrl
  };
  
  console.log('✅ Podcast 生成成功');
  console.log(`  Episode ID: ${episode.id}`);
  console.log(`  标题: ${episode.title}`);
  console.log(`  TTS Event ID: ${episode.ttsEventId || 'N/A'}`);
  console.log(`  TTS Status: ${episode.ttsStatus || 'N/A'}`);
  console.log(`  Audio URL: ${episode.audioUrl || 'N/A'}`);
  console.log(`  Is Async: ${result.data.isAsync}`);
  
  return episode;
}

async function getEpisodeDetails(episodeId) {
  const response = await fetch(`${BASE_URL}/episodes/${episodeId}`);
  if (!response.ok) {
    throw new Error(`获取episode失败: ${response.status}`);
  }
  const result = await response.json();
  // API返回 {success: true, data: {...}}
  return result.data;
}

async function pollAudio(episodeId, maxAttempts = 12, intervalMs = 5000) {
  console.log(`\n🔄 开始轮询音频生成状态...`);
  console.log(`  Episode ID: ${episodeId}`);
  console.log(`  最大尝试次数: ${maxAttempts}`);
  console.log(`  轮询间隔: ${intervalMs / 1000}秒\n`);

  for (let i = 1; i <= maxAttempts; i++) {
    console.log(`[${i}/${maxAttempts}] 轮询中...`);
    
    try {
      const response = await fetch(`${BASE_URL}/episodes/${episodeId}/poll-audio`, {
        method: 'POST'
      });

      console.log(`  响应状态: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const text = await response.text();
        console.error(`  ❌ 请求失败`);
        console.error(`  响应内容: ${text.substring(0, 300)}`);
        
        if (i < maxAttempts) {
          await sleep(intervalMs);
          continue;
        } else {
          throw new Error(`轮询失败: ${response.status}`);
        }
      }

      const result = await response.json();
      console.log(`  状态: ${result.status}`);
      
      if (result.status === 'completed') {
        console.log('\n✅ 音频生成完成！');
        console.log(`  Audio URL: ${result.audioUrl}`);
        console.log(`  文件大小: ${result.fileSize} 字节`);
        
        // 验证音频文件
        if (result.audioUrl) {
          console.log('\n📥 验证音频文件...');
          const audioResponse = await fetch(result.audioUrl);
          if (audioResponse.ok) {
            const audioSize = parseInt(audioResponse.headers.get('content-length') || '0');
            console.log(`  ✅ 音频文件可访问，大小: ${audioSize} 字节`);
            
            if (audioSize < 100) {
              console.warn(`  ⚠️  警告: 音频文件太小 (${audioSize} 字节)，可能是错误占位文件`);
            }
          } else {
            console.error(`  ❌ 音频文件无法访问: ${audioResponse.status}`);
          }
        }
        
        return result;
        
      } else if (result.status === 'failed') {
        console.error('\n❌ 音频生成失败');
        console.error(`  错误: ${result.error}`);
        return result;
        
      } else if (result.status === 'processing') {
        console.log(`  ⏳ 处理中... ${result.message || ''}`);
        
        if (i < maxAttempts) {
          await sleep(intervalMs);
        }
      }
      
    } catch (error) {
      console.error(`  ❌ 轮询出错: ${error.message}`);
      
      if (i < maxAttempts) {
        console.log(`  等待 ${intervalMs / 1000}秒后重试...`);
        await sleep(intervalMs);
      } else {
        throw error;
      }
    }
  }

  console.log('\n⏱️  轮询超时');
  console.log('音频可能仍在生成中，请稍后手动检查');
  return null;
}

async function main() {
  try {
    let episodeId = process.argv[2];
    
    if (!episodeId) {
      // 如果没有提供episode ID，生成新的podcast
      const episode = await generatePodcast();
      episodeId = episode.id;
      
      // 检查是否有event ID
      if (!episode.ttsEventId) {
        console.error('\n❌ Episode 没有 TTS Event ID，无法轮询');
        console.error('这可能意味着音频是同步生成的，或者event ID没有正确保存');
        
        // 尝试获取最新的episode详情
        console.log('\n🔍 获取最新 episode 详情...');
        const details = await getEpisodeDetails(episodeId);
        console.log('Episode 详情:', JSON.stringify(details, null, 2));
        
        process.exit(1);
      }
      
      // 等待几秒让IndexTTS开始处理
      console.log('\n⏳ 等待5秒让IndexTTS开始处理...');
      await sleep(5000);
      
    } else {
      console.log(`\n使用已存在的 Episode ID: ${episodeId}`);
      
      // 获取episode详情
      const details = await getEpisodeDetails(episodeId);
      console.log('Episode 详情:');
      console.log(`  标题: ${details.title}`);
      console.log(`  TTS Event ID: ${details.ttsEventId || 'N/A'}`);
      console.log(`  TTS Status: ${details.ttsStatus || 'N/A'}`);
      console.log(`  Audio URL: ${details.audioUrl || 'N/A'}`);
      
      if (!details.ttsEventId) {
        console.error('\n❌ Episode 没有 TTS Event ID，无法轮询');
        process.exit(1);
      }
      
      if (details.ttsStatus === 'completed' && details.audioUrl) {
        console.log('\n✅ 音频已经生成完成');
        console.log(`  Audio URL: ${details.audioUrl}`);
        process.exit(0);
      }
    }
    
    // 开始轮询
    const result = await pollAudio(episodeId);
    
    if (result && result.status === 'completed') {
      console.log('\n🎉 测试成功！');
      process.exit(0);
    } else {
      console.log('\n⚠️  测试未完成');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
