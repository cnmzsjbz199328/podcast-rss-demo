#!/usr/bin/env node

/**
 * 核心功能测试脚本
 * 逐步测试：1.新闻提取 2.Gemini脚本生成 3.语音克隆合成
 */

// 加载环境变量
import { config } from 'dotenv';
config();

import { Logger } from './src/utils/logger.js';
import { createServices } from './src/factory.js';
import { NewsProcessor } from './src/core/NewsProcessor.js';

const logger = new Logger('FunctionTest');

/**
 * 测试1：新闻提取功能
 */
async function testNewsExtraction() {
  console.log('\n🔍 测试1：新闻提取功能');
  console.log('=' .repeat(50));

  try {
    // 设置测试模式以跳过严格验证
    process.env.NODE_ENV = 'test';

    const services = createServices();

    // 测试获取新闻
    console.log('📡 正在获取BBC新闻...');
    const rawNews = await services.rssService.fetchNews({ limit: 5 });

    console.log(`✅ 获取到 ${rawNews.length} 条新闻`);

    // 显示新闻摘要
    rawNews.forEach((item, index) => {
      console.log(`${index + 1}. ${item.title}`);
      console.log(`   来源: ${item.link}`);
      console.log(`   时间: ${new Date(item.pubDate).toLocaleString('zh-CN')}`);
      console.log('');
    });

    // 测试新闻处理
    console.log('🔄 正在处理新闻...');
    const config = { services: { rss: { maxItems: 5 } } };
    const newsProcessor = new NewsProcessor(config);
    const processedNews = newsProcessor.processNews(rawNews);

    console.log(`✅ 处理后剩余 ${processedNews.length} 条有效新闻`);

    // 生成脚本输入
    const scriptInput = newsProcessor.formatNewsForScript(processedNews);
    console.log('📝 生成的脚本输入预览：');
    console.log(scriptInput.substring(0, 200) + '...');

    return processedNews;

  } catch (error) {
    console.error('❌ 新闻提取测试失败:', error.message);
    throw error;
  }
}

/**
 * 测试2：Gemini脚本生成功能
 */
async function testGeminiScriptGeneration(news) {
  console.log('\n🤖 测试2：Gemini脚本生成功能');
  console.log('=' .repeat(50));

  try {
    // 设置测试模式以跳过严格验证
    process.env.NODE_ENV = 'test';

    const services = createServices();

    // 测试郭德纲风格脚本生成
    console.log('🎭 正在生成郭德纲风格脚本...');
    const guoDeGangScript = await services.scriptService.generateScript(news, 'guo-de-gang');

    console.log('✅ 郭德纲风格脚本生成成功');
    console.log(`📏 脚本长度: ${guoDeGangScript.wordCount} 字`);
    console.log('📝 脚本预览：');
    console.log(guoDeGangScript.content.substring(0, 300) + '...');
    console.log('');

    // 测试新闻播报风格脚本生成
    console.log('📢 正在生成新闻播报风格脚本...');
    const newsAnchorScript = await services.scriptService.generateScript(news, 'news-anchor');

    console.log('✅ 新闻播报风格脚本生成成功');
    console.log(`📏 脚本长度: ${newsAnchorScript.wordCount} 字`);
    console.log('📝 脚本预览：');
    console.log(newsAnchorScript.content.substring(0, 300) + '...');

    return {
      guoDeGang: guoDeGangScript,
      newsAnchor: newsAnchorScript
    };

  } catch (error) {
    console.error('❌ Gemini脚本生成测试失败:', error.message);
    throw error;
  }
}

/**
 * 测试3：语音克隆合成功能
 */
async function testVoiceCloning(scripts) {
  console.log('\n🎵 测试3：语音克隆合成功能');
  console.log('=' .repeat(50));

  try {
    // 设置测试模式以跳过严格验证
    process.env.NODE_ENV = 'test';

    const services = createServices();

    // 测试郭德纲语音合成
    console.log('🎤 正在合成郭德纲风格语音...');
    const guoDeGangVoice = await services.voiceService.generateAudio(
      scripts.guoDeGang.content,
      'guo-de-gang'
    );

    console.log('✅ 郭德纲语音合成成功');
    console.log(`⏱️  音频时长: ${guoDeGangVoice.duration} 秒`);
    console.log(`💾 文件大小: ${guoDeGangVoice.fileSize} 字节`);
    console.log(`🎵 音频格式: ${guoDeGangVoice.format}`);
    console.log('');

    // 测试新闻播报语音合成
    console.log('🎤 正在合成新闻播报风格语音...');
    const newsAnchorVoice = await services.voiceService.generateAudio(
      scripts.newsAnchor.content,
      'news-anchor'
    );

    console.log('✅ 新闻播报语音合成成功');
    console.log(`⏱️  音频时长: ${newsAnchorVoice.duration} 秒`);
    console.log(`💾 文件大小: ${newsAnchorVoice.fileSize} 字节`);
    console.log(`🎵 音频格式: ${newsAnchorVoice.format}`);

    return {
      guoDeGang: guoDeGangVoice,
      newsAnchor: newsAnchorVoice
    };

  } catch (error) {
    console.error('❌ 语音克隆合成测试失败:', error.message);
    throw error;
  }
}

/**
 * 完整流程测试
 */
async function testFullFlow() {
  console.log('🚀 开始核心功能完整测试');
  console.log('=' .repeat(60));

  try {
    // 设置测试模式
    process.env.NODE_ENV = 'test';

    // 步骤1：新闻提取
    const news = await testNewsExtraction();
    if (news.length === 0) {
      throw new Error('没有获取到有效新闻，无法继续测试');
    }

    // 步骤2：Gemini脚本生成
    const scripts = await testGeminiScriptGeneration(news);

    // 步骤3：语音克隆合成
    const voices = await testVoiceCloning(scripts);

    // 总结
    console.log('\n🎉 所有核心功能测试通过！');
    console.log('=' .repeat(60));
    console.log('📊 测试结果汇总：');
    console.log(`   📰 新闻数量: ${news.length}`);
    console.log(`   📝 郭德纲脚本: ${scripts.guoDeGang.wordCount} 字`);
    console.log(`   📝 新闻播报脚本: ${scripts.newsAnchor.wordCount} 字`);
    console.log(`   🎵 郭德纲语音: ${voices.guoDeGang.duration} 秒`);
    console.log(`   🎵 新闻播报语音: ${voices.newsAnchor.duration} 秒`);

    return {
      news,
      scripts,
      voices
    };

  } catch (error) {
    console.error('\n💥 完整流程测试失败:', error.message);
    process.exit(1);
  }
}

/**
 * 单项测试
 */
async function testSingleFunction(functionName) {
  console.log(`🎯 测试单个功能: ${functionName}`);

  try {
    // 设置测试模式
    process.env.NODE_ENV = 'test';

    const services = createServices();

    switch (functionName) {
      case 'news':
        await testNewsExtraction();
        break;

      case 'gemini':
        const news = await testNewsExtraction();
        await testGeminiScriptGeneration(news);
        break;

      case 'voice':
        const newsForVoice = await testNewsExtraction();
        const scripts = await testGeminiScriptGeneration(newsForVoice);
        await testVoiceCloning(scripts);
        break;

      default:
        console.error(`❌ 未知功能: ${functionName}`);
        console.log('可用功能: news, gemini, voice');
        process.exit(1);
    }

    console.log(`✅ ${functionName} 功能测试通过`);

  } catch (error) {
    console.error(`❌ ${functionName} 功能测试失败:`, error.message);
    process.exit(1);
  }
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
核心功能测试脚本

用法:
  node test-functions.js [options]

选项:
  --full, -f         完整流程测试 (默认)
  --news             只测试新闻提取
  --gemini           测试新闻提取 + Gemini脚本生成
  --voice            测试所有功能 (新闻 + Gemini + 语音)
  --help, -h         显示帮助信息

示例:
  node test-functions.js              # 完整测试
  node test-functions.js --news       # 只测试新闻
  node test-functions.js --gemini     # 测试新闻+脚本生成
  node test-functions.js --voice      # 测试所有功能

环境变量要求:
  GEMINI_API_KEY     - Gemini API密钥 (必需)
  BBC_RSS_URL        - BBC RSS地址 (可选，默认已配置)

注意: 语音合成测试需要网络连接到IndexTTS服务
  `);
}

// 主程序
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  showHelp();
} else if (args.includes('--news')) {
  testSingleFunction('news');
} else if (args.includes('--gemini')) {
  testSingleFunction('gemini');
} else if (args.includes('--voice')) {
  testSingleFunction('voice');
} else {
  testFullFlow();
}
