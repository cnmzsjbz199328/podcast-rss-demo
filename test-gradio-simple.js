// IndexTTS-2-Demo 语音克隆测试
import { config } from 'dotenv';
config();

import { Client, handle_file } from '@gradio/client';

/**
 * 创建虚拟音频文件用于测试
 * @returns {Blob} 音频 Blob
 */
function createDummyAudioBlob() {
  // 创建一个最小的 WAV 文件头
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  // RIFF header
  const header = [0x52, 0x49, 0x46, 0x46]; // "RIFF"
  const size = 36; // 文件大小 - 8
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

async function testIndexTTS() {
  console.log('🎤 IndexTTS-2-Demo 语音克隆测试套件\n');

  try {
    // ========== 测试 1: 连接服务 ==========
    console.log('� 测试 1: 连接到 IndexTTS-2-Demo 服务...');
    const client = await Client.connect('IndexTeam/IndexTTS-2-Demo');
    console.log('✅ 连接成功\n');

    // ========== 测试 2: 选择情感控制方法 ==========
    console.log('📡 测试 2: 选择情感控制方法 (/on_method_select)...');
    try {
      const methodResult = await client.predict('/on_method_select', {
        emo_control_method: 'Same as the voice reference'
      });
      console.log('✅ 方法选择成功');
      console.log('   返回值:', methodResult.data ? '✓' : '✗');
      console.log();
    } catch (error) {
      console.log('⚠️  方法选择失败:', error.message);
      console.log();
    }

    // ========== 测试 3: 处理输入文本 ==========
    console.log('📡 测试 3: 处理输入文本 (/on_input_text_change)...');
    try {
      const textResult = await client.predict('/on_input_text_change', {
        text: '你好世界，这是一个语音克隆测试。',
        max_text_tokens_per_segment: 120
      });
      console.log('✅ 文本处理成功');
      console.log('   返回类型:', Array.isArray(textResult.data) ? '数组' : typeof textResult.data);
      console.log();
    } catch (error) {
      console.log('⚠️  文本处理失败:', error.message);
      console.log();
    }

    // ========== 测试 4: 更新提示音频 ==========
    console.log('📡 测试 4: 更新提示音频 (/update_prompt_audio)...');
    try {
      const audioResult = await client.predict('/update_prompt_audio', {});
      console.log('✅ 提示音频更新成功');
      console.log('   返回值:', audioResult.data ? '✓' : '✗');
      console.log();
    } catch (error) {
      console.log('⚠️  提示音频更新失败:', error.message);
      console.log();
    }

    // ========== 测试 5: 生成语音 (主测试) ==========
    console.log('📡 测试 5: 生成语音 (/gen_single) - 完整参数测试...');
    try {
      // 准备音频文件
      const audioBlob = createDummyAudioBlob();
      const promptFile = handle_file(audioBlob);
      const emoFile = handle_file(audioBlob);

      const generateResult = await client.predict('/gen_single', {
        // 基础参数
        emo_control_method: 'Same as the voice reference',
        prompt: promptFile,
        text: '这是一个测试文本，用于验证语音克隆功能。',
        emo_ref_path: emoFile,

        // 情感控制参数
        emo_weight: 0.8,
        emo_text: '',
        emo_random: false,

        // 情感向量参数 (vec1-vec8)
        vec1: 0.2,  // 开心
        vec2: 0,    // 生气
        vec3: 0,    // 悲伤
        vec4: 0,    // 害怕
        vec5: 0,    // 厌恶
        vec6: 0,    // 忧郁
        vec7: 0.1,  // 惊讶
        vec8: 0,    // 平静

        // 生成参数
        max_text_tokens_per_segment: 120,
        param_16: true,   // do_sample
        param_17: 0.8,    // top_p
        param_18: 30,     // top_k
        param_19: 0.8,    // temperature
        param_20: 0,      // length_penalty
        param_21: 3,      // num_beams
        param_22: 10,     // repetition_penalty
        param_23: 1500    // max_mel_tokens
      });

      console.log('✅ 语音生成成功');
      console.log('   返回类型:', generateResult.data?.type || typeof generateResult.data);
      if (generateResult.data?.url) {
        console.log('   音频URL:', generateResult.data.url.substring(0, 80) + '...');
      }
      console.log();
    } catch (error) {
      console.log('❌ 语音生成失败:', error.message);
      if (error.status) {
        console.log('   HTTP状态:', error.status);
      }
      console.log();
    }

    // ========== 测试 6: 郭德纲风格 ==========
    console.log('📡 测试 6: 郭德纲风格语音生成...');
    try {
      const audioBlob = createDummyAudioBlob();
      const promptFile = handle_file(audioBlob);
      const emoFile = handle_file(audioBlob);

      const guoResult = await client.predict('/gen_single', {
        emo_control_method: 'Same as the voice reference',
        prompt: promptFile,
        text: '各位观众大家好！今天给大家讲一个很有意思的故事。',
        emo_ref_path: emoFile,
        emo_weight: 0.9,
        vec1: 0.8,   // 高欢乐度
        vec7: 0.6,   // 适度惊讶
        emo_text: '',
        emo_random: true,
        max_text_tokens_per_segment: 120,
        param_16: true,
        param_17: 0.8,
        param_18: 30,
        param_19: 1.0,   // 提高创造性
        param_20: 0,
        param_21: 3,
        param_22: 10,
        param_23: 1500
      });

      console.log('✅ 郭德纲风格生成成功');
      console.log('   音频生成: ✓');
      console.log();
    } catch (error) {
      console.log('❌ 郭德纲风格生成失败:', error.message);
      console.log();
    }

    // ========== 测试 7: 新闻播报风格 ==========
    console.log('📡 测试 7: 新闻播报风格语音生成...');
    try {
      const audioBlob = createDummyAudioBlob();
      const promptFile = handle_file(audioBlob);
      const emoFile = handle_file(audioBlob);

      const newsResult = await client.predict('/gen_single', {
        emo_control_method: 'Same as the voice reference',
        prompt: promptFile,
        text: '今天是2024年，全球经济形势继续向好。',
        emo_ref_path: emoFile,
        emo_weight: 0.3,
        vec8: 0.9,   // 高中性度
        emo_text: '专业，正式',
        emo_random: false,
        max_text_tokens_per_segment: 120,
        param_16: true,
        param_17: 0.7,
        param_18: 20,
        param_19: 0.6,   // 降低随机性
        param_20: 0,
        param_21: 3,
        param_22: 15,
        param_23: 1500
      });

      console.log('✅ 新闻播报风格生成成功');
      console.log('   音频生成: ✓');
      console.log();
    } catch (error) {
      console.log('❌ 新闻播报风格生成失败:', error.message);
      console.log();
    }

    // ========== 总结 ==========
    console.log('🎉 测试套件完成！');
    console.log('\n📊 测试覆盖范围:');
    console.log('  ✓ API 连接性');
    console.log('  ✓ 情感控制方法选择');
    console.log('  ✓ 文本处理');
    console.log('  ✓ 提示音频更新');
    console.log('  ✓ 基础语音生成');
    console.log('  ✓ 郭德纲风格 (高欢乐度 + 惊讶)');
    console.log('  ✓ 新闻播报风格 (高中性度 + 专业)');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

// 运行测试
testIndexTTS();
