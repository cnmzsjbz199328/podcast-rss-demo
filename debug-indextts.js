#!/usr/bin/env node

/** 调试IndexTTS API调用 */

const BASE_URL = 'https://indexteam-indextts-2-demo.hf.space';

// 测试数据 - 基于我们的代码构建的参数
const testData = [
  'Same as the voice reference',
  {
    path: 'https://pub-b436254f85684e9e95bebad4567b11ff.r2.dev/voice/kaluoling.mp3',
    url: 'https://pub-b436254f85684e9e95bebad4567b11ff.r2.dev/voice/kaluoling.mp3',
    size: null,
    orig_name: 'voice_sample.mp3',
    mime_type: 'audio/mpeg',
    is_stream: false,
    meta: { _type: 'gradio.FileData' }
  },
  '剑桥郡火车刺伤案中，一名列车工作人员生命垂危。然而，警方赞扬司机、乘务员及乘客英勇施救，避免了更严重后果。与此同时，一名因贩毒被捕的英国19岁怀孕少女，在格鲁吉亚监狱获释，她已怀孕八个月。这两起事件都提醒我们，在挑战面前，总有生命韧性与人道光辉闪耀。',
  null,
  0.3,  // emo_weight
  0,    // vec1 Happy
  0,    // vec2 Angry
  0,    // vec3 Sad
  0,    // vec4 Fear
  0,    // vec5 Hate
  0,    // vec6 Low
  0,    // vec7 Surprise
  0.9,  // vec8 Neutral
  '',
  false,
  120,
  true,
  0.8,
  30,
  0.8,
  0,
  3,
  10,
  1500
];

console.log('测试数据长度:', testData.length);
console.log('测试数据:');
console.log(JSON.stringify(testData, null, 2));

async function testApiCall() {
  console.log('\\n发送API请求...');

  try {
    const response = await fetch(`${BASE_URL}/gradio_api/call/gen_single`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; PodcastBot/1.0)'
      },
      body: JSON.stringify({ data: testData })
    });

    console.log('响应状态:', response.status);
    console.log('响应头:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('错误响应:', errorText);
      return;
    }

    const result = await response.json();
    console.log('成功响应:');
    console.log(JSON.stringify(result, null, 2));

    // 如果有event_id，尝试轮询
    if (result.event_id) {
      console.log('\\n轮询SSE...');
      await testSSE(result.event_id);
    }

  } catch (error) {
    console.error('请求失败:', error.message);
  }
}

async function testSSE(eventId) {
  try {
    const statusUrl = `${BASE_URL}/gradio_api/call/gen_single/${eventId}`;

    const response = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    });

    console.log('SSE响应状态:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SSE错误:', errorText);
      return;
    }

    const text = await response.text();
    console.log('SSE响应长度:', text.length);
    console.log('SSE响应内容:');
    console.log(text);

  } catch (error) {
    console.error('SSE请求失败:', error.message);
  }
}

// 运行测试
testApiCall();
