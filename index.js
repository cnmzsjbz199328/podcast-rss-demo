#!/usr/bin/env node

/**
 * 本地测试和演示脚本
 */

import { PodcastGenerator } from './src/core/PodcastGenerator.js';
import { createServices } from './src/factory.js';
import { Logger } from './src/utils/logger.js';

const logger = new Logger('Main');

/**
 * 主函数 - 生成播客
 */
async function main() {
  try {
    logger.info('Starting podcast generation demo');

    // 1. 创建服务实例
    const services = createServices();

    // 2. 创建播客生成器
    const generator = new PodcastGenerator(services);

    // 3. 生成郭德纲风格播客
    logger.info('Generating Guo De Gang style podcast...');
    const guoDeGangResult = await generator.generatePodcast('guo-de-gang');

    logger.info('Guo De Gang podcast generated', {
      episodeId: guoDeGangResult.episodeId,
      scriptUrl: guoDeGangResult.scriptUrl,
      audioUrl: guoDeGangResult.audioUrl
    });

    // 4. 生成新闻播报风格播客
    logger.info('Generating News Anchor style podcast...');
    const newsAnchorResult = await generator.generatePodcast('news-anchor');

    logger.info('News Anchor podcast generated', {
      episodeId: newsAnchorResult.episodeId,
      scriptUrl: newsAnchorResult.scriptUrl,
      audioUrl: newsAnchorResult.audioUrl
    });

    // 5. 输出结果摘要
    console.log('\n🎉 Podcast generation completed successfully!');
    console.log('📊 Results:');
    console.log(`   Guo De Gang: ${guoDeGangResult.audioUrl}`);
    console.log(`   News Anchor: ${newsAnchorResult.audioUrl}`);

  } catch (error) {
    logger.error('Podcast generation failed', error);
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

/**
 * 测试服务创建
 */
async function testServiceCreation() {
  try {
    console.log('🔧 Testing service creation...');

    // 设置测试环境变量，避免验证失败
    process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-api-key';
    process.env.R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || 'test-access-key';
    process.env.R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || 'test-secret-key';
    process.env.R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'test-bucket';

    const services = createServices();

    console.log('✅ Services created successfully:');
    console.log(`   RSS Service: ${services.rssService.constructor.name}`);
    console.log(`   Script Service: ${services.scriptService.constructor.name}`);
    console.log(`   Voice Service: ${services.voiceService.constructor.name}`);
    console.log(`   Storage Service: ${services.storageService.constructor.name}`);

    console.log('✅ Service creation test passed!');

  } catch (error) {
    logger.error('Service creation test failed', error);
    console.error('❌ Service creation failed:', error.message);
    process.exit(1);
  }
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
Podcast RSS Demo - 本地测试脚本

用法:
  node index.js [options]

选项:
  --help, -h           显示帮助信息
  --style STYLE        指定生成风格 (guo-de-gang 或 news-anchor)
  --validate           只验证服务配置，不生成播客
  --test-services      测试服务创建是否正常

示例:
  node index.js                           # 生成两种风格的播客
  node index.js --style guo-de-gang      # 只生成郭德纲风格
  node index.js --validate               # 验证配置

环境变量:
  GEMINI_API_KEY     - Gemini API密钥
  R2_ACCESS_KEY_ID   - R2访问密钥ID
  R2_SECRET_ACCESS_KEY - R2秘密访问密钥

更多信息请查看 README.md
  `);
}

/**
 * 验证服务配置
 */
async function validateServices() {
  try {
    logger.info('Validating services configuration...');

    // 设置测试环境变量以通过配置验证
    const originalEnv = { ...process.env };
    process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-api-key';
    process.env.R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || 'test-access-key';
    process.env.R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || 'test-secret-key';
    process.env.R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'test-bucket';

    const services = createServices();

    const { validateAllServices } = await import('./src/factory.js');
    const isValid = await validateAllServices(services);

    // 恢复原始环境变量
    Object.assign(process.env, originalEnv);

    if (isValid) {
      console.log('✅ All services validated successfully');
    } else {
      console.log('❌ Some services failed validation');
      process.exit(1);
    }

  } catch (error) {
    logger.error('Service validation failed', error);
    console.error('❌ Validation error:', error.message);
    process.exit(1);
  }
}

// 解析命令行参数
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
}

if (args.includes('--validate')) {
  validateServices();
} else if (args.includes('--test-services')) {
  testServiceCreation();
} else {
  main();
}
