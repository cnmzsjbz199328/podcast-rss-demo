// 语音功能单元测试 - 增强版
import { config } from 'dotenv';
config();

import { IndexTtsVoiceServiceHttp } from './src/implementations/IndexTtsVoiceServiceHttp.js';
import assert from 'assert';

/**
 * 测试类
 */
class VoiceUnitTest {
  constructor() {
    this.voiceService = null;
    this.testResults = [];
  }

  /**
   * 初始化服务
   */
  initialize() {
    console.log('🔧 初始化语音服务...\n');
    this.voiceService = new IndexTtsVoiceServiceHttp({
      endpoint: 'IndexTeam/IndexTTS-2-Demo',
      maxRetries: 1,
      timeout: 30000
    });
    console.log('✅ 服务初始化成功\n');
  }

  /**
   * 测试基本生成
   */
  async testBasicGeneration() {
    console.log('📡 测试 1: 基本语音生成');
    console.log('-'.repeat(50));

    try {
      const script = '你好世界，这是一个测试。';
      const style = 'guo-de-gang';

      console.log('📝 脚本:', script);
      console.log('🎭 风格:', style);

      const result = await this.voiceService.generateAudio(script, style);

      // 验证返回值结构
      assert(result.audioData, '应该包含 audioData');
      assert(result.format, '应该包含 format');
      assert(result.duration > 0, '时长应该大于0');
      assert(result.fileSize > 0, '文件大小应该大于0');
      assert(result.style === style, '风格应该匹配');
      assert(result.metadata, '应该包含 metadata');

      console.log('✅ 返回值验证通过');
      console.log('   格式:', result.format);
      console.log('   时长:', result.duration, '秒');
      console.log('   文件大小:', result.fileSize, '字节');
      console.log('✅ 测试通过\n');

      this.recordResult('basic-generation', true);
      return true;
    } catch (error) {
      console.error('❌ 测试失败:', error.message);
      this.recordResult('basic-generation', false, error.message);
      return false;
    }
  }

  /**
   * 测试不同风格
   */
  async testDifferentStyles() {
    console.log('📡 测试 2: 不同风格生成');
    console.log('-'.repeat(50));

    const styles = ['guo-de-gang', 'news-anchor'];
    const script = '这是风格测试文本。';

    let passed = 0;
    for (const style of styles) {
      try {
        console.log(`\n  测试风格: ${style}`);
        const result = await this.voiceService.generateAudio(script, style);

        assert(result.style === style, `风格应该是 ${style}`);
        assert(result.audioData, '应该包含音频数据');

        console.log(`  ✅ ${style} 通过`);
        passed++;
      } catch (error) {
        console.error(`  ❌ ${style} 失败:`, error.message);
      }
    }

    console.log(`\n✅ 测试结果: ${passed}/${styles.length} 通过\n`);
    this.recordResult('different-styles', passed === styles.length);
    return passed === styles.length;
  }

  /**
   * 测试长文本处理
   */
  async testLongTextHandling() {
    console.log('📡 测试 3: 长文本处理');
    console.log('-'.repeat(50));

    try {
      const longScript = `
        这是一个较长的文本。在现代社会中，信息传播的速度越来越快。
        我们需要学会如何有效地处理这些信息，从中提取有价值的内容。
        语音合成技术的发展为我们提供了新的可能性。
      `.replace(/\n\s+/g, ' ').trim();

      console.log('📝 文本长度:', longScript.length, '字');

      const result = await this.voiceService.generateAudio(longScript, 'news-anchor');

      assert(result.audioData, '应该生成音频数据');
      assert(result.duration > 0, '时长应该大于0');

      console.log('   生成时长:', result.duration, '秒');
      console.log('✅ 测试通过\n');

      this.recordResult('long-text', true);
      return true;
    } catch (error) {
      console.error('❌ 测试失败:', error.message);
      this.recordResult('long-text', false, error.message);
      return false;
    }
  }

  /**
   * 测试短文本处理
   */
  async testShortTextHandling() {
    console.log('📡 测试 4: 短文本处理');
    console.log('-'.repeat(50));

    const shortTexts = ['你好', '测试', '一'];

    let passed = 0;
    for (const text of shortTexts) {
      try {
        console.log(`  测试文本: "${text}"`);
        const result = await this.voiceService.generateAudio(text, 'news-anchor');

        assert(result.audioData, '应该包含音频数据');
        console.log(`  ✅ 通过`);
        passed++;
      } catch (error) {
        console.error(`  ❌ 失败:`, error.message);
      }
    }

    console.log(`\n✅ 测试结果: ${passed}/${shortTexts.length} 通过\n`);
    this.recordResult('short-text', passed === shortTexts.length);
    return passed === shortTexts.length;
  }

  /**
   * 测试特殊字符处理
   */
  async testSpecialCharacters() {
    console.log('📡 测试 5: 特殊字符处理');
    console.log('-'.repeat(50));

    const specialTexts = [
      '你好，世界！',
      '这是标点。。。测试。',
      '数字123、456、789测试。',
      '括号(测试)【数据】《符号》'
    ];

    let passed = 0;
    for (const text of specialTexts) {
      try {
        console.log(`  文本: "${text}"`);
        const result = await this.voiceService.generateAudio(text, 'news-anchor');

        assert(result.audioData, '应该包含音频数据');
        console.log(`  ✅ 通过`);
        passed++;
      } catch (error) {
        console.error(`  ❌ 失败`);
      }
    }

    console.log(`\n✅ 测试结果: ${passed}/${specialTexts.length} 通过\n`);
    this.recordResult('special-chars', passed === specialTexts.length);
    return passed === specialTexts.length;
  }

  /**
   * 测试支持的风格列表
   */
  testSupportedStyles() {
    console.log('📡 测试 6: 支持的风格列表');
    console.log('-'.repeat(50));

    try {
      const styles = this.voiceService.getSupportedStyles();

      assert(Array.isArray(styles), '应该返回数组');
      assert(styles.length > 0, '应该包含至少一个风格');
      assert(styles.includes('guo-de-gang'), '应该包含 guo-de-gang');
      assert(styles.includes('news-anchor'), '应该包含 news-anchor');

      console.log('✅ 支持的风格:');
      styles.forEach(style => console.log(`   - ${style}`));
      console.log('✅ 测试通过\n');

      this.recordResult('supported-styles', true);
      return true;
    } catch (error) {
      console.error('❌ 测试失败:', error.message);
      this.recordResult('supported-styles', false, error.message);
      return false;
    }
  }

  /**
   * 测试配置验证
   */
  async testConfigValidation() {
    console.log('📡 测试 7: 配置验证');
    console.log('-'.repeat(50));

    try {
      const isValid = await this.voiceService.validateConfig();

      console.log('配置有效:', isValid);
      console.log('✅ 测试通过\n');

      this.recordResult('config-validation', isValid);
      return isValid;
    } catch (error) {
      console.error('❌ 测试失败:', error.message);
      this.recordResult('config-validation', false, error.message);
      return false;
    }
  }

  /**
   * 测试错误处理 - 无效风格
   */
  async testInvalidStyle() {
    console.log('📡 测试 8: 错误处理 - 无效风格');
    console.log('-'.repeat(50));

    try {
      const script = '这是一个测试。';
      await this.voiceService.generateAudio(script, 'invalid-style');

      console.error('❌ 应该抛出错误');
      this.recordResult('invalid-style', false, '未抛出错误');
      return false;
    } catch (error) {
      console.log('✅ 正确捕获错误:', error.message);
      console.log('✅ 测试通过\n');
      this.recordResult('invalid-style', true);
      return true;
    }
  }

  /**
   * 记录测试结果
   */
  recordResult(testName, passed, error = null) {
    this.testResults.push({
      name: testName,
      passed,
      error,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 输出测试报告
   */
  reportResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 单元测试报告');
    console.log('='.repeat(60));

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    console.log(`\n总测试: ${totalTests}`);
    console.log(`✅ 通过: ${passedTests}`);
    console.log(`❌ 失败: ${failedTests}`);
    console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(2)}%`);

    console.log('\n📋 测试详情:');
    this.testResults.forEach((result, index) => {
      const status = result.passed ? '✅' : '❌';
      const errorMsg = result.error ? ` - ${result.error}` : '';
      console.log(`  ${index + 1}. ${status} ${result.name}${errorMsg}`);
    });

    console.log('\n' + '='.repeat(60));

    return passedTests === totalTests;
  }
}

/**
 * 主测试函数
 */
async function main() {
  const tester = new VoiceUnitTest();

  try {
    tester.initialize();

    // 运行所有测试
    console.log('🎯 开始运行单元测试\n');
    await tester.testBasicGeneration();
    await tester.testDifferentStyles();
    await tester.testLongTextHandling();
    await tester.testShortTextHandling();
    await tester.testSpecialCharacters();
    tester.testSupportedStyles();
    await tester.testConfigValidation();
    await tester.testInvalidStyle();

    // 输出报告
    const allPassed = tester.reportResults();

    if (allPassed) {
      console.log('\n✨ 所有测试通过！');
    } else {
      console.log('\n⚠️  部分测试失败，请检查');
    }
  } catch (error) {
    console.error('❌ 测试过程出错:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行测试
main();
