/**
 * IndexTTS Gradio Service 单元测试
 */

import { IndexTtsVoiceServiceGradio } from './src/implementations/IndexTtsVoiceServiceGradio.js';
import { Logger } from './src/utils/logger.js';

const logger = new Logger('IndexTTS-Test');

/**
 * 测试脚本
 */
const TEST_SCRIPT = `
各位听众朋友大家好，今天是2025年11月3日星期日。
欢迎收听今日新闻播报。

今天的头条新闻：科技创新推动经济发展。
专家表示，人工智能技术正在改变我们的生活方式。

以上是今日新闻，感谢您的收听。
`.trim();

/**
 * 运行测试
 */
async function runTests() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     IndexTTS Gradio Service 单元测试                      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  let passedTests = 0;
  let totalTests = 0;

  // 测试 1: 服务初始化
  totalTests++;
  console.log('📝 测试 1: 服务初始化');
  try {
    const service = new IndexTtsVoiceServiceGradio({});
    console.log('✅ 服务创建成功');
    console.log(`   - Space ID: ${service.spaceId}`);
    passedTests++;
  } catch (error) {
    console.log(`❌ 失败: ${error.message}`);
  }
  console.log('');

  // 测试 2: 获取支持的风格
  totalTests++;
  console.log('📝 测试 2: 获取支持的风格');
  try {
    const service = new IndexTtsVoiceServiceGradio({});
    const styles = service.getSupportedStyles();
    console.log('✅ 支持的风格:', styles.join(', '));
    if (styles.length >= 2) {
      passedTests++;
    } else {
      throw new Error('风格数量不足');
    }
  } catch (error) {
    console.log(`❌ 失败: ${error.message}`);
  }
  console.log('');

  // 测试 3: 验证配置
  totalTests++;
  console.log('📝 测试 3: 验证服务配置');
  console.log('   ⏳ 连接到 Gradio Space...');
  try {
    const service = new IndexTtsVoiceServiceGradio({});
    const isValid = await service.validateConfig();
    if (isValid) {
      console.log('✅ 服务配置验证成功');
      passedTests++;
    } else {
      throw new Error('配置验证失败');
    }
  } catch (error) {
    console.log(`❌ 失败: ${error.message}`);
  }
  console.log('');

  // 测试 4: 生成音频 (news-anchor 风格)
  totalTests++;
  console.log('📝 测试 4: 生成音频 (news-anchor 风格)');
  console.log('   ⏳ 这可能需要 30-60 秒...');
  try {
    const service = new IndexTtsVoiceServiceGradio({ maxRetries: 2 });
    const startTime = Date.now();
    
    const result = await service.generateAudio(TEST_SCRIPT, 'news-anchor');
    
    const duration = Date.now() - startTime;
    
    console.log('✅ 音频生成成功');
    console.log(`   - 风格: ${result.style}`);
    console.log(`   - 格式: ${result.format}`);
    console.log(`   - 时长: ${result.duration.toFixed(1)} 秒`);
    console.log(`   - 文件大小: ${(result.fileSize / 1024).toFixed(2)} KB`);
    console.log(`   - 生成耗时: ${(duration / 1000).toFixed(1)} 秒`);
    console.log(`   - Provider: ${result.metadata.provider}`);
    console.log(`   - API Method: ${result.metadata.apiMethod}`);
    
    if (result.audioData && result.fileSize > 0) {
      passedTests++;
    } else {
      throw new Error('音频数据无效');
    }
    
    // 清理
    await service.cleanup();
  } catch (error) {
    console.log(`❌ 失败: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
  console.log('');

  // 测试 5: 生成音频 (guo-de-gang 风格) - 可选
  if (process.argv.includes('--full')) {
    totalTests++;
    console.log('📝 测试 5: 生成音频 (guo-de-gang 风格)');
    console.log('   ⏳ 这可能需要 30-60 秒...');
    try {
      const service = new IndexTtsVoiceServiceGradio({ maxRetries: 2 });
      const startTime = Date.now();
      
      const result = await service.generateAudio(TEST_SCRIPT, 'guo-de-gang');
      
      const duration = Date.now() - startTime;
      
      console.log('✅ 音频生成成功');
      console.log(`   - 风格: ${result.style}`);
      console.log(`   - 时长: ${result.duration.toFixed(1)} 秒`);
      console.log(`   - 文件大小: ${(result.fileSize / 1024).toFixed(2)} KB`);
      console.log(`   - 生成耗时: ${(duration / 1000).toFixed(1)} 秒`);
      
      if (result.audioData && result.fileSize > 0) {
        passedTests++;
      } else {
        throw new Error('音频数据无效');
      }
      
      // 清理
      await service.cleanup();
    } catch (error) {
      console.log(`❌ 失败: ${error.message}`);
    }
    console.log('');
  }

  // 测试结果汇总
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                     测试结果汇总                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(`✅ 通过: ${passedTests}/${totalTests}`);
  console.log(`❌ 失败: ${totalTests - passedTests}/${totalTests}`);
  console.log(`📊 成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);

  if (passedTests === totalTests) {
    console.log('🎉 所有测试通过！');
    process.exit(0);
  } else {
    console.log('⚠️  部分测试失败');
    process.exit(1);
  }
}

// 运行测试
console.log(`\n📅 测试时间: ${new Date().toLocaleString('zh-CN')}\n`);
runTests().catch(error => {
  console.error('❌ 测试执行失败:', error);
  process.exit(1);
});
