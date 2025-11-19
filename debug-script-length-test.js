#!/usr/bin/env node

/** 测试脚本长度对IndexTTS的影响 */

const BASE_URL = 'https://indexteam-indextts-2-demo.hf.space';

const voiceFileData = {
  path: 'https://pub-b436254f85684e9e95bebad4567b11ff.r2.dev/voice/kaluoling.mp3',
  url: 'https://pub-b436254f85684e9e95bebad4567b11ff.r2.dev/voice/kaluoling.mp3',
  size: null,
  orig_name: 'kaluoling.mp3',
  mime_type: 'audio/mpeg',
  is_stream: false,
  meta: { _type: 'gradio.FileData' }
};

// 测试不同长度的脚本
const testScripts = {
  short: '今天天气很好，我们来聊聊News。',
  medium: '剑桥郡火车刺伤案中，一名列车工作人员生命垂危。然而，警方赞扬司机、乘务员及乘客英勇施救，避免了更严重后果。',
  long: `好的，这是一份专业News播报员风格的Podcast脚本，整合了您提供的News内容：

---

**播报员：** 各位听众，大家好，欢迎收听今日News快报。今天我们聚焦三则重要国际News。

---

首先，英国一项深度调查揭露非法劳工网络。该网络涉嫌利用非法劳工，并大规模销售违禁商品。

根据报道，卧底记者调查发现，这些迷你超市成为了非法活动的前沿阵地。

---

接下来，法国西海岸发生驾车冲撞人群事件，造成多人受伤。

当地警方迅速介入，嫌疑人已被控制，事件动机仍在调查中。

---

而在移民政策方面，英国公布一项移民遣返行动。

---

**播报员：** 今天的News快报到这里，感谢收听。

---`
};

async function testScriptLength(scriptName, script) {
  console.log(`\n🧪 测试脚本: ${scriptName}`);
  console.log(`长度: ${script.length} 字符`);
  console.log(`预览: ${script.substring(0, 100)}...`);

  const params = [
    'Same as the voice reference',
    voiceFileData,
    script,
    null, // emo_ref_path
    0.3, // emo_weight
    0, 0, 0, 0, 0, 0, 0, 0.9, // emotion vector
    '', // emo_text
    false, // emo_random
    120, true, 0.8, 30, 0.8, 0, 3, 10, 1500
  ];

  try {
    // 发送生成请求
    const response = await fetch(`${BASE_URL}/gradio_api/call/gen_single`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: params })
    });

    console.log(`API响应状态: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ API调用失败: ${errorText}`);
      return false;
    }

    const result = await response.json();
    const eventId = result.event_id;
    console.log(`Event ID: ${eventId}`);

    // 轮询结果
    await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒

    const pollResponse = await fetch(`${BASE_URL}/gradio_api/call/gen_single/${eventId}`, {
      headers: { 'Accept': 'text/event-stream' }
    });

    console.log(`SSE响应状态: ${pollResponse.status}`);

    if (!pollResponse.ok) {
      console.log(`❌ SSE轮询失败`);
      return false;
    }

    const text = await pollResponse.text();
    console.log(`SSE响应长度: ${text.length}`);

    const hasComplete = text.includes('event: complete');
    const hasError = text.includes('event: error');

    console.log(`包含complete: ${hasComplete}`);
    console.log(`包含error: ${hasError}`);

    if (hasComplete) {
      console.log(`✅ ${scriptName} 成功！`);
      return true;
    } else if (hasError) {
      console.log(`❌ ${scriptName} 失败！`);
      return false;
    } else {
      console.log(`⚠️ ${scriptName} 仍在处理中`);
      return null; // 仍在处理
    }

  } catch (error) {
    console.error(`💥 ${scriptName} 异常:`, error.message);
    return false;
  }
}

async function runTests() {
  console.log('🎯 IndexTTS脚本长度测试');
  console.log('=' .repeat(50));

  const results = {};

  for (const [name, script] of Object.entries(testScripts)) {
    results[name] = await testScriptLength(name, script);
    // 每次测试间隔，避免频率限制
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  console.log('\n' + '=' .repeat(50));
  console.log('📊 测试结果总结');
  console.log('=' .repeat(50));

  for (const [name, result] of Object.entries(results)) {
    const status = result === true ? '✅' : result === false ? '❌' : '⏳';
    console.log(`${status} ${name}: ${result === true ? '成功' : result === false ? '失败' : '处理中'}`);
  }

  console.log('\n🔍 分析结果:');
  if (results.short && !results.medium && !results.long) {
    console.log('结论: 脚本长度过长导致失败！IndexTTS无法处理长脚本。');
  } else if (results.short && results.medium && !results.long) {
    console.log('结论: 只有最长脚本失败，可能是长度阈值问题。');
  } else if (!results.short && !results.medium && !results.long) {
    console.log('结论: 所有脚本都失败，可能不是长度问题。');
  } else {
    console.log('结论: 结果不一致，需要进一步分析。');
  }

  console.log('\n💡 建议解决方案:');
  console.log('1. 限制脚本长度在500字符以内');
  console.log('2. 对长脚本进行分段处理');
  console.log('3. 简化脚本格式，去除特殊字符');
}

// 运行测试
runTests();
