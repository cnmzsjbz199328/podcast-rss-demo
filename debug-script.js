#!/usr/bin/env node

/** 调试脚本生成 */

import { GeminiScriptService } from './src/implementations/ai/gemini/GeminiScriptService.js';
import { BbcRssService } from './src/implementations/BbcRssService.js';
import { NewsProcessor } from './src/core/NewsProcessor.js';

async function testScriptGeneration() {
  console.log('测试脚本生成...\n');

  try {
    // 1. 获取News
    const rssService = new BbcRssService({
      url: 'https://feeds.bbci.co.uk/news/rss.xml'
    });

    console.log('获取News...');
    const rawNews = await rssService.fetchNews();
    console.log(`获取到 ${rawNews.length} 条News`);

    // 2. 处理News
    const newsProcessor = new NewsProcessor();
    const processedNews = newsProcessor.processNews(rawNews);
    console.log(`处理后 ${processedNews.length} 条News`);

    // 3. 生成脚本
    const scriptService = new GeminiScriptService({
      apiKey: process.env.GEMINI_API_KEY
    });

    console.log('生成脚本...');
    const scriptResult = await scriptService.generateScript(processedNews, 'news-anchor');

    console.log('脚本生成结果:');
    console.log('- 风格:', scriptResult.style);
    console.log('- 字数:', scriptResult.wordCount);
    console.log('- 内容长度:', scriptResult.content.length);
    console.log('- 内容预览:');
    console.log(scriptResult.content.substring(0, 200) + '...');

    // 4. 检查脚本是否有问题
    if (scriptResult.content.includes('undefined') ||
        scriptResult.content.includes('null') ||
        scriptResult.content.length < 50) {
      console.error('脚本内容异常!');
    } else {
      console.log('脚本内容正常');
    }

  } catch (error) {
    console.error('脚本生成测试失败:', error.message);
    console.error(error.stack);
  }
}

testScriptGeneration();
