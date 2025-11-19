#!/usr/bin/env node

/**
 * Kokoro TTS 截断问题分析脚本
 * 分析现有Podcast数据，验证截断问题并设计修复方案
 */

async function analyzeTruncation() {
  console.log('🔍 Kokoro TTS 截断问题深度分析\n');

  try {
    // 获取最近的几个Podcast
    console.log('📊 获取Podcast数据...');
    const episodesResponse = await fetch('https://podcast-rss-demo.tj15982183241.workers.dev/episodes?limit=5');
    const episodesData = await episodesResponse.json();

    if (!episodesData.success) {
      throw new Error('获取Podcast数据失败');
    }

    const episodes = episodesData.data.episodes;
    console.log(`✅ 获取到 ${episodes.length} 个Podcast\n`);

    // 分析每个Podcast
    for (const episode of episodes) {
      console.log(`🎙️  分析Podcast: ${episode.title}`);
      console.log(`   ID: ${episode.id}`);
      console.log(`   风格: ${episode.style}`);
      console.log(`   记录时长: ${episode.duration}秒`);

      // 获取详细信息
      const detailResponse = await fetch(`https://podcast-rss-demo.tj15982183241.workers.dev/episodes/${episode.id}`);
      const detailData = await detailResponse.json();

      if (detailData.success) {
        const data = detailData.data;
        const scriptWordCount = data.metadata?.scriptMetadata?.stats?.wordCount || 0;
        const estimatedDuration = (scriptWordCount / 150) * 60; // 150词/分钟

        console.log(`   脚本字数: ${scriptWordCount}`);
        console.log(`   估算时长: ${estimatedDuration.toFixed(1)}秒`);

        // 检查音频文件实际大小
        if (data.audioUrl) {
          const audioResponse = await fetch(data.audioUrl, { method: 'HEAD' });
          const contentLength = audioResponse.headers.get('content-length');
          const actualSize = parseInt(contentLength);

          // 估算实际音频时长 (假设128kbps MP3)
          const actualDuration = actualSize / (128 * 1024 / 8);

          console.log(`   实际文件大小: ${actualSize} bytes`);
          console.log(`   估算实际时长: ${actualDuration.toFixed(1)}秒`);

          // 计算处理比例
          const processingRatio = actualDuration / estimatedDuration;
          console.log(`   处理比例: ${(processingRatio * 100).toFixed(1)}%`);

          if (processingRatio < 0.5) {
            console.log(`   ⚠️  警告: 只处理了 ${(processingRatio * 100).toFixed(1)}% 的内容！`);
          }
        }
      }

      console.log('   ─'.repeat(40));
    }

    console.log('\n🎯 分析结论：');
    console.log('   • Kokoro TTS 对长文本有严格的输入限制');
    console.log('   • 超过一定长度后，后续内容被截断');
    console.log('   • 需要实现文本分块和音频合并功能');

    console.log('\n🔧 修复方案：');
    console.log('   1. 文本分块：将长文本按句子分割成多个块');
    console.log('   2. 并行生成：同时调用多个TTS请求');
    console.log('   3. 音频合并：将音频片段拼接成完整音频');
    console.log('   4. 时间同步：调整字幕时间戳');

  } catch (error) {
    console.error('❌ 分析失败:', error.message);
  }
}

// 运行分析
analyzeTruncation().catch(console.error);
