// 完整功能集成测试
import { config } from 'dotenv';
config();

import { createServices } from './src/factory.js';
import { NewsProcessor } from './src/core/NewsProcessor.js';

async function testFullIntegration() {
  console.log('🚀 开始完整功能集成测试');
  console.log('=' .repeat(60));

  try {
    // 1. 初始化服务
    console.log('🔧 初始化所有服务...');
    const services = createServices();
    console.log('✅ 服务初始化成功\\n');

    // 2. 新闻提取
    console.log('📰 步骤1: 新闻提取');
    console.log('-'.repeat(30));

    const rawNews = await services.rssService.fetchNews({ limit: 3 });
    console.log(`📊 获取到 ${rawNews.length} 条新闻`);

    const config = { services: { rss: { maxItems: 3 } } };
    const newsProcessor = new NewsProcessor(config);
    const processedNews = newsProcessor.processNews(rawNews);
    console.log(`✅ 处理后保留 ${processedNews.length} 条有效新闻\\n`);

    // 3. Gemini脚本生成
    console.log('🤖 步骤2: Gemini脚本生成');
    console.log('-'.repeat(30));

    // 生成郭德纲风格脚本
    console.log('🎭 生成郭德纲风格脚本...');
    const guoDeGangScript = await services.scriptService.generateScript(processedNews, 'guo-de-gang');
    console.log(`📝 脚本长度: ${guoDeGangScript.wordCount} 字`);
    console.log(`📋 脚本预览: ${guoDeGangScript.content.substring(0, 100)}...\\n`);

    // 4. 语音合成
    console.log('🎵 步骤3: 语音合成');
    console.log('-'.repeat(30));

    console.log('🎤 正在合成郭德纲风格语音...');
    const voiceResult = await services.voiceService.generateAudio(guoDeGangScript.content, 'guo-de-gang');

    console.log('✅ 语音合成完成');
    console.log(`⏱️  时长: ${voiceResult.duration} 秒`);
    console.log(`🎵 格式: ${voiceResult.format}`);
    console.log(`🏷️  风格: ${voiceResult.style}`);
    console.log(`📋 Event ID: ${voiceResult.metadata.eventId}\\n`);

    // 5. 存储（如果配置了的话）
    console.log('💾 步骤4: 文件存储');
    console.log('-'.repeat(30));

    try {
      const storageResult = await services.storageService.storeFiles(guoDeGangScript, voiceResult);
      console.log('✅ 文件存储成功');
      console.log(`📄 脚本URL: ${storageResult.scriptUrl}`);
      console.log(`🎵 音频URL: ${storageResult.audioUrl}\\n`);
    } catch (storageError) {
      console.log('⚠️  存储服务未配置或失败，使用模拟数据');
      console.log(`原因: ${storageError.message}\\n`);
    }

    // 6. 总结
    console.log('🎉 完整集成测试成功！');
    console.log('=' .repeat(60));
    console.log('📊 测试结果汇总:');
    console.log(`   📰 新闻数量: ${processedNews.length}`);
    console.log(`   📝 脚本字数: ${guoDeGangScript.wordCount}`);
    console.log(`   🎵 语音时长: ${voiceResult.duration}秒`);
    console.log(`   🎯 语音风格: ${voiceResult.style}`);
    console.log(`   📋 处理状态: 异步进行中 (Event ID: ${voiceResult.metadata.eventId})`);

    console.log('\\n✨ 所有核心功能集成测试通过！');
    console.log('🎧 语音文件将在几秒钟内生成完成');

    return {
      news: processedNews,
      script: guoDeGangScript,
      voice: voiceResult
    };

  } catch (error) {
    console.error('\\n💥 集成测试失败:', error.message);
    console.error('错误详情:', error);
    process.exit(1);
  }
}

// 运行测试
testFullIntegration();
