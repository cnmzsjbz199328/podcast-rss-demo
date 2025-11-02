// IndexTTS 语音克隆集成测试 - 完整的播客生成流程
import { config } from 'dotenv';
config();

import { Client, handle_file } from '@gradio/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 创建虚拟音频文件用于测试
 * @returns {Blob} 音频 Blob
 */
function createDummyAudioBlob() {
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  // RIFF header
  const header = [0x52, 0x49, 0x46, 0x46]; // "RIFF"
  const size = 36;
  const wavMarker = [0x57, 0x41, 0x56, 0x45]; // "WAVE"
  const fmtMarker = [0x66, 0x6d, 0x74, 0x20]; // "fmt "
  const fmtSize = 16;
  const audioFormat = 1; // PCM
  const channels = 1;
  const sampleRate = 16000;
  const byteRate = sampleRate * channels * 2;
  const blockAlign = channels * 2;
  const bitsPerSample = 16;

  let offset = 0;
  header.forEach(b => view.setUint8(offset++, b));
  view.setUint32(offset, size, true); offset += 4;
  wavMarker.forEach(b => view.setUint8(offset++, b));
  fmtMarker.forEach(b => view.setUint8(offset++, b));
  view.setUint32(offset, fmtSize, true); offset += 4;
  view.setUint16(offset, audioFormat, true); offset += 2;
  view.setUint16(offset, channels, true); offset += 2;
  view.setUint32(offset, sampleRate, true); offset += 4;
  view.setUint32(offset, byteRate, true); offset += 4;
  view.setUint16(offset, blockAlign, true); offset += 2;
  view.setUint16(offset, bitsPerSample, true); offset += 2;

  const dataMarker = [0x64, 0x61, 0x74, 0x61]; // "data"
  dataMarker.forEach(b => view.setUint8(offset++, b));
  view.setUint32(offset, 0, true);

  return new Blob([wavHeader], { type: 'audio/wav' });
}

/**
 * 风格配置定义
 */
const STYLE_CONFIGS = {
  'guo-de-gang': {
    name: '郭德纲相声风格',
    description: '经典相声风格，幽默风趣',
    params: {
      emo_control_method: 'Same as the voice reference',
      emo_weight: 0.9,
      vec1: 0.8,   // 高欢乐度
      vec2: 0,     // 生气
      vec3: 0,     // 悲伤
      vec4: 0,     // 害怕
      vec5: 0,     // 厌恶
      vec6: 0,     // 忧郁
      vec7: 0.6,   // 适度惊讶
      vec8: 0,     // 平静
      emo_text: '相声，幽默',
      emo_random: true,
      param_19: 1.0   // 提高创造性
    }
  },
  'news-anchor': {
    name: '专业新闻播报',
    description: '正式专业的新闻播报风格',
    params: {
      emo_control_method: 'Same as the voice reference',
      emo_weight: 0.3,
      vec1: 0,     // 开心
      vec2: 0,     // 生气
      vec3: 0,     // 悲伤
      vec4: 0,     // 害怕
      vec5: 0,     // 厌恶
      vec6: 0,     // 忧郁
      vec7: 0,     // 惊讶
      vec8: 0.9,   // 高中性度
      emo_text: '专业，正式',
      emo_random: false,
      param_19: 0.6   // 降低随机性
    }
  },
  'emotional': {
    name: '情感电台',
    description: '温暖细腻的情感语调',
    params: {
      emo_control_method: 'Same as the voice reference',
      emo_weight: 0.7,
      vec1: 0.4,   // 中等欢乐度
      vec2: 0,     // 生气
      vec3: 0.3,   // 微妙的悲伤
      vec4: 0,     // 害怕
      vec5: 0,     // 厌恶
      vec6: 0.2,   // 微妙的忧郁
      vec7: 0.1,   // 轻微惊讶
      vec8: 0.3,   // 中性
      emo_text: '温暖，细腻',
      emo_random: false,
      param_19: 0.7
    }
  }
};

/**
 * 生成参数的默认值
 */
const DEFAULT_GEN_PARAMS = {
  max_text_tokens_per_segment: 120,
  param_16: true,   // do_sample
  param_17: 0.8,    // top_p
  param_18: 30,     // top_k
  param_19: 0.8,    // temperature (会被风格覆盖)
  param_20: 0,      // length_penalty
  param_21: 3,      // num_beams
  param_22: 10,     // repetition_penalty
  param_23: 1500    // max_mel_tokens
};

/**
 * 测试音频生成
 */
class VoiceCloneTest {
  constructor() {
    this.client = null;
    this.testResults = [];
  }

  /**
   * 初始化客户端
   */
  async initialize() {
    console.log('🔌 正在连接到 IndexTTS-2-Demo 服务...\n');
    try {
      this.client = await Client.connect('IndexTeam/IndexTTS-2-Demo');
      console.log('✅ 连接成功\n');
      return true;
    } catch (error) {
      console.error('❌ 连接失败:', error.message);
      return false;
    }
  }

  /**
   * 测试单个风格
   */
  async testStyle(styleName, text) {
    const styleConfig = STYLE_CONFIGS[styleName];
    if (!styleConfig) {
      console.error(`❌ 未知风格: ${styleName}`);
      return false;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📡 测试风格: ${styleConfig.name}`);
    console.log(`📝 描述: ${styleConfig.description}`);
    console.log(`📄 文本: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
    console.log('='.repeat(60));

    try {
      const audioBlob = createDummyAudioBlob();
      const promptFile = handle_file(audioBlob);
      const emoFile = handle_file(audioBlob);

      const params = {
        ...DEFAULT_GEN_PARAMS,
        ...styleConfig.params,
        prompt: promptFile,
        text: text,
        emo_ref_path: emoFile
      };

      console.log('📤 发送生成请求...');
      const startTime = Date.now();

      const result = await this.client.predict('/gen_single', params);

      const duration = (Date.now() - startTime) / 1000;
      console.log(`✅ 生成成功 (耗时: ${duration.toFixed(2)}秒)`);

      // 验证返回结果
      if (result.data) {
        console.log('📊 返回数据类型:', result.data.constructor.name);
        if (result.data.url) {
          console.log('🔗 音频URL:', result.data.url.substring(0, 60) + '...');
        }
      }

      this.testResults.push({
        style: styleName,
        status: 'success',
        duration,
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('❌ 生成失败:', error.message);
      this.testResults.push({
        style: styleName,
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  /**
   * 测试所有风格
   */
  async testAllStyles() {
    console.log('\n🎤 开始完整的语音克隆测试套件\n');

    // 示例文本
    const testTexts = {
      'guo-de-gang': '各位观众大家好！今天给大家讲一个特别有意思的故事。您说这相声啊，讲究的就是一个"包袱"。',
      'news-anchor': '今天是2024年11月2日，全球经济形势继续向好，多国采取措施支持产业发展。',
      'emotional': '有时候我们会在夜晚想起某个人，那些温暖的回忆就像星星一样闪闪发光。'
    };

    // 测试每个风格
    for (const [styleName, text] of Object.entries(testTexts)) {
      await this.testStyle(styleName, text);
      // 避免API限流，风格之间稍作停顿
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  /**
   * 测试长文本处理
   */
  async testLongText() {
    console.log('\n🎤 测试长文本处理\n');

    const longText = `
      这是一个较长的文本示例。在现代社会中，信息传播的速度越来越快。
      我们需要学会如何有效地处理这些信息，从中提取有价值的内容。
      语音合成技术的发展为我们提供了新的可能性。
      通过这项技术，我们可以将文字转换为自然流畅的语音。
    `.replace(/\n\s+/g, ' ').trim();

    console.log('📝 测试文本长度:', longText.length, '字');
    await this.testStyle('news-anchor', longText);
  }

  /**
   * 测试参数边界值
   */
  async testParameterBoundaries() {
    console.log('\n🔧 测试参数边界值\n');

    const testText = '这是一个参数边界测试。';
    const audioBlob = createDummyAudioBlob();
    const promptFile = handle_file(audioBlob);
    const emoFile = handle_file(audioBlob);

    // 测试不同的生成参数
    const paramTests = [
      {
        name: '保守生成 (低随机性)',
        params: {
          param_16: false,  // 不使用采样
          param_19: 0.3,    // 低温度
          param_22: 20      // 高重复惩罚
        }
      },
      {
        name: '激进生成 (高随机性)',
        params: {
          param_16: true,
          param_19: 1.5,    // 高温度
          param_22: 1       // 低重复惩罚
        }
      },
      {
        name: '平衡生成',
        params: {
          param_16: true,
          param_19: 0.8,
          param_22: 10
        }
      }
    ];

    for (const paramTest of paramTests) {
      console.log(`\n📡 ${paramTest.name}`);
      try {
        const result = await this.client.predict('/gen_single', {
          ...DEFAULT_GEN_PARAMS,
          ...STYLE_CONFIGS['news-anchor'].params,
          ...paramTest.params,
          prompt: promptFile,
          text: testText,
          emo_ref_path: emoFile
        });

        console.log(`✅ 生成成功`);
      } catch (error) {
        console.error(`❌ 生成失败:`, error.message);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  /**
   * 测试情感向量
   */
  async testEmotionVectors() {
    console.log('\n😊 测试情感向量配置\n');

    const testText = '这是一个情感测试。';
    const audioBlob = createDummyAudioBlob();
    const promptFile = handle_file(audioBlob);
    const emoFile = handle_file(audioBlob);

    const emotionTests = [
      { name: '极度开心', vec1: 1.0, vec2: 0, vec3: 0, vec4: 0, vec5: 0, vec6: 0, vec7: 0, vec8: 0 },
      { name: '中度开心', vec1: 0.5, vec2: 0, vec3: 0, vec4: 0, vec5: 0, vec6: 0, vec7: 0, vec8: 0 },
      { name: '轻度悲伤', vec1: 0, vec2: 0, vec3: 0.3, vec4: 0, vec5: 0, vec6: 0.2, vec7: 0, vec8: 0 },
      { name: '完全中性', vec1: 0, vec2: 0, vec3: 0, vec4: 0, vec5: 0, vec6: 0, vec7: 0, vec8: 1.0 }
    ];

    for (const emotion of emotionTests) {
      console.log(`\n📡 ${emotion.name}`);
      try {
        const result = await this.client.predict('/gen_single', {
          ...DEFAULT_GEN_PARAMS,
          ...STYLE_CONFIGS['news-anchor'].params,
          vec1: emotion.vec1,
          vec2: emotion.vec2,
          vec3: emotion.vec3,
          vec4: emotion.vec4,
          vec5: emotion.vec5,
          vec6: emotion.vec6,
          vec7: emotion.vec7,
          vec8: emotion.vec8,
          prompt: promptFile,
          text: testText,
          emo_ref_path: emoFile
        });

        console.log(`✅ 生成成功`);
      } catch (error) {
        console.error(`❌ 生成失败:`, error.message);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  /**
   * 输出测试报告
   */
  reportResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 测试报告');
    console.log('='.repeat(60));

    if (this.testResults.length === 0) {
      console.log('⚠️  没有测试结果');
      return;
    }

    const successful = this.testResults.filter(r => r.status === 'success').length;
    const failed = this.testResults.filter(r => r.status === 'failed').length;

    console.log(`\n总测试数: ${this.testResults.length}`);
    console.log(`✅ 成功: ${successful}`);
    console.log(`❌ 失败: ${failed}`);
    console.log(`成功率: ${((successful / this.testResults.length) * 100).toFixed(2)}%`);

    // 计算平均耗时
    const timings = this.testResults.filter(r => r.duration).map(r => r.duration);
    if (timings.length > 0) {
      const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
      console.log(`\n平均生成时间: ${avgTime.toFixed(2)}秒`);
      console.log(`最快: ${Math.min(...timings).toFixed(2)}秒`);
      console.log(`最慢: ${Math.max(...timings).toFixed(2)}秒`);
    }

    // 详细结果
    console.log('\n📋 详细结果:');
    this.testResults.forEach((result, index) => {
      const status = result.status === 'success' ? '✅' : '❌';
      const time = result.duration ? ` (${result.duration.toFixed(2)}s)` : '';
      console.log(`  ${index + 1}. ${status} ${result.style}${time}`);
    });

    console.log('\n' + '='.repeat(60));
  }
}

/**
 * 主测试函数
 */
async function main() {
  const tester = new VoiceCloneTest();

  if (!await tester.initialize()) {
    process.exit(1);
  }

  try {
    // 运行所有测试
    await tester.testAllStyles();
    await tester.testLongText();
    await tester.testParameterBoundaries();
    await tester.testEmotionVectors();

    // 输出报告
    tester.reportResults();

    console.log('\n✨ 测试完成！');
  } catch (error) {
    console.error('❌ 测试过程出错:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行测试
main();
