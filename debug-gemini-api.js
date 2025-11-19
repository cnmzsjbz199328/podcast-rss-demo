#!/usr/bin/env node

/** 专门测试Gemini API调用 */

const BASE_URL = 'https://podcast-rss-demo.tj15982183241.workers.dev';

// 模拟News数据
const mockNews = [
  {
    title: "Test News 1",
    description: "This is a test news item for debugging purposes.",
    link: "https://example.com/news1",
    pubDate: new Date().toISOString()
  },
  {
    title: "Test News 2",
    description: "This is another test news item for debugging.",
    link: "https://example.com/news2",
    pubDate: new Date().toISOString()
  }
];

async function testGeminiDirectly() {
  console.log('🔬 直接测试Gemini API调用...\n');

  // 创建一个简单的测试请求，专门用于测试脚本生成
  const testData = {
    action: 'test-script',
    news: mockNews,
    style: 'news-anchor'
  };

  try {
    console.log('发送测试请求到脚本生成端点...');
    const response = await fetch(`${BASE_URL}/test/script`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    console.log(`响应状态: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ 脚本生成失败:');
      console.log(errorText);
      return;
    }

    const result = await response.json();
    console.log('✅ 脚本生成成功:');
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('💥 测试过程中发生错误:', error.message);
  }
}

async function testFullGeneration() {
  console.log('\n🎙️ 测试完整Podcast生成流程...\n');

  try {
    console.log('发送完整生成请求...');
    const startTime = Date.now();

    const response = await fetch(`${BASE_URL}/generate?style=news-anchor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const duration = Date.now() - startTime;
    console.log(`响应状态: ${response.status} (耗时: ${duration}ms)`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ 生成失败，尝试解析错误:');

      try {
        const errorJson = JSON.parse(errorText);
        console.log('错误详情:', JSON.stringify(errorJson, null, 2));

        if (errorJson.error && errorJson.error.includes('SSE stream error')) {
          console.log('\n🔍 诊断结果:');
          console.log('问题出现在脚本生成或语音合成阶段');
          console.log('可能原因:');
          console.log('1. Gemini API密钥无效或配额不足');
          console.log('2. Gemini API调用失败');
          console.log('3. 脚本内容为空或格式错误');
          console.log('4. IndexTTS API调用失败');
          console.log('5. 网络超时或连接问题');
        }
      } catch (e) {
        console.log('原始错误文本:', errorText);
      }
      return;
    }

    const result = await response.json();
    console.log('✅ 生成成功!');
    console.log('结果:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('💥 网络错误:', error.message);
  }
}

// 运行测试
async function runTests() {
  console.log('='.repeat(60));
  console.log('🎯 Gemini API 和完整流程诊断测试');
  console.log('='.repeat(60));
  console.log('');

  await testGeminiDirectly();
  await testFullGeneration();

  console.log('');
  console.log('='.repeat(60));
  console.log('📋 测试完成');
  console.log('='.repeat(60));
}

runTests();
