#!/usr/bin/env node

/** 详细调试播客生成过程 */

const BASE_URL = 'https://podcast-rss-demo.tj15982183241.workers.dev';

async function testStepByStep() {
  console.log('🔍 详细调试播客生成过程...\n');

  try {
    // 步骤1: 检查系统状态
    console.log('步骤1: 检查系统状态');
    const healthResponse = await fetch(`${BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('健康状态:', JSON.stringify(healthData, null, 2));

    // 步骤2: 尝试生成播客
    console.log('\n步骤2: 尝试生成播客');
    console.log('发送请求到:', `${BASE_URL}/generate?style=news-anchor`);

    const startTime = Date.now();
    const generateResponse = await fetch(`${BASE_URL}/generate?style=news-anchor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const generateTime = Date.now() - startTime;

    console.log(`响应状态: ${generateResponse.status}`);
    console.log(`响应时间: ${generateTime}ms`);

    const responseHeaders = {};
    for (const [key, value] of generateResponse.headers.entries()) {
      responseHeaders[key] = value;
    }
    console.log('响应头:', responseHeaders);

    let responseData;
    try {
      responseData = await generateResponse.json();
      console.log('响应数据:', JSON.stringify(responseData, null, 2));
    } catch (e) {
      const text = await generateResponse.text();
      console.log('响应文本:', text);
    }

    if (!generateResponse.ok) {
      console.log('\n❌ 生成失败，分析错误原因...');

      if (responseData && responseData.error) {
        console.log('错误信息:', responseData.error);

        // 检查是否包含SSE错误
        if (responseData.error.includes('SSE stream error')) {
          console.log('\n🔍 SSE错误分析:');
          console.log('这通常表示:');
          console.log('1. 脚本生成失败 → 返回空内容');
          console.log('2. IndexTTS收到无效输入 → API调用失败');
          console.log('3. SSE流返回错误事件');

          console.log('\n建议检查:');
          console.log('- Gemini API密钥是否有效');
          console.log('- Gemini API调用是否成功');
          console.log('- IndexTTS API是否可访问');
        }
      }
    } else {
      console.log('\n✅ 生成成功！');
      if (responseData && responseData.data) {
        console.log('剧集ID:', responseData.data.episodeId);
        console.log('标题:', responseData.data.title);
        console.log('音频URL:', responseData.data.audioUrl);
      }
    }

    // 步骤3: 检查最近的剧集
    console.log('\n步骤3: 检查最近生成的剧集');
    const episodesResponse = await fetch(`${BASE_URL}/episodes?limit=3`);
    if (episodesResponse.ok) {
      const episodesData = await episodesResponse.json();
      console.log('最近剧集:', JSON.stringify(episodesData.data.episodes, null, 2));
    }

  } catch (error) {
    console.error('\n💥 测试过程中发生错误:', error.message);
    console.error('错误详情:', error);
  }
}

// 运行测试
testStepByStep();
