#!/usr/bin/env node

/**
 * Kokoro-TTS 简单测试 - 直接测试 Kokoro-TTS API
 */

import fs from 'fs';
import { KokoroTtsApiClient } from '../../src/implementations/tts/KokoroTtsApiClient.js';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testKokoroTTS() {
  console.log('🎤 测试 Kokoro-TTS 语音生成\n');

  const testText = '剑桥郡火车刺伤案中，一名列车工作人员生命垂危。然而，警方赞扬司机、乘务员及乘客英勇施救，避免了更严重后果。与此同时，一名因贩毒被捕的英国19岁怀孕少女，在格鲁吉亚监狱获释，她已怀孕八个月。这两起事件都提醒我们，在挑战面前，总有生命韧性与人道光辉闪耀。';
  console.log(`测试文本: "${testText}"\n`);

  // 创建API客户端
  const apiClient = new KokoroTtsApiClient();

  try {
    console.log('步骤 1: 初始化 Kokoro-TTS 客户端...');
    await apiClient.initialize();
    console.log('✅ 客户端初始化成功\n');

    console.log('步骤 2: 生成音频...');

    // 生成音频
    const result = await apiClient.generateAudio(testText, 'af_heart', 1);

    console.log('✅ 音频生成成功');
    console.log(`文件大小: ${result.audioData.byteLength} 字节 (${(result.audioData.byteLength / 1024).toFixed(1)} KB)`);
    console.log(`格式: ${result.format}`);

    if (result.audioData.byteLength < 1000) {
      console.warn('\n⚠️  警告: 文件太小，可能不是有效的音频文件');
    } else {
      console.log('\n✅ 音频文件大小正常，测试成功！');
    }

    // 保存到本地
    const outputPath = '/tmp/test-kokoro.wav';
    fs.writeFileSync(outputPath, Buffer.from(result.audioData));
    console.log(`\n💾 音频已保存到: ${outputPath}`);
    console.log(`   可以使用以下命令播放: afplay ${outputPath}`);

    console.log('\n✅ 测试完成！');

  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

testKokoroTTS().catch(error => {
  console.error('\n❌ 测试失败:', error);
  console.error(error.stack);
  process.exit(1);
});
