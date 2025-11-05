#!/usr/bin/env node

/** 专门测试IndexTTS API调用 */

const BASE_URL = 'https://podcast-rss-demo.tj15982183241.workers.dev';

// 使用之前生成的成功脚本内容
const testScript = `好的，这是一份专业新闻播报员风格的播客脚本，整合了您提供的新闻内容：

---

**(开场音乐渐弱)**

**播报员：** 各位听众，大家好，欢迎收听由[播客名称，此处可填：全球新闻速览/焦点透视]为您带来的今日新闻快报。我是您的播报员[您的姓名，此处可省略]。

今天，我们将聚焦三则重要的国际新闻：英国一项揭露非法劳工网络的深度调查、法国一桩驾车冲撞人群的恶性事件，以及英国移民政策执行的最新进展。

---

**(新闻一：英国犯罪网络)**

**播报员：** 首先，我们将目光投向英国。一项来自英国广播公司（BBC）的深度调查近日揭露了一个在英国迷你超市背后运作的庞大犯罪网络。该网络涉嫌利用非法劳工，并大规模销售违禁商品。

根据BBC的报道，卧底记者在调查中被告知，通过贩卖非法电子烟和卷烟，犯罪分子可以轻易获取巨额利润。这一发现不仅揭示了英国境内非法贸易活动的猖獗，更凸显了非法移民劳工问题的严峻性，引发了对相关监管漏洞和执法力度的广泛关注。调查指出，这些迷你超市成为了非法活动的前沿阵地，对英国的社会经济和法律秩序构成了挑战。

---

**(过渡语)**

**播报员：** 接下来，我们将把目光转向法国，关注一起令人痛心的公共安全事件。

---

**(新闻二：法国驾车冲撞事件)**

**播报员：** 法国西海岸的奥莱龙岛（Ile d'Oléron）昨日发生一起驾车冲撞人群事件，造成至少十人受伤，其中数人伤势危重。

据当地市长透露，一名三十出头的男子驾驶车辆，蓄意冲撞了岛上的多名民众。事件发生后，当地警方迅速介入处理，伤者被紧急送往医院进行救治。目前，嫌疑人已被控制，事件的动机仍在深入调查中。这起恶性事件在当地引发了广泛的震惊和不安。

---

**(过渡语)**

**播报员：** 而在移民政策方面，英国今日也公布了一项引人关注的后续行动。

---

**(新闻三：移民二次遣返)**

**播报员：** 英国内政部消息人士透露，一名此前已被遣返，但在上月又设法重返英国的移民，已于本周三的遣返航班上再次被送回法国。

这一事件再次凸显了英国政府在应对非法移民问题上的决心，以及其对边境管控政策的持续执行力度。内政部消息人士强调，此举旨在明确英国的移民法规不容侵犯，并将继续严格执行相关法律，以维护边境安全和国家利益。这一行动也反映出英法两国在处理非法移民问题上所面临的复杂性和持续挑战。

---

**(总结与结束语)**

**播报员：** 今天的《新闻快报》就到这里。感谢您的收听，我们将持续为您关注这些事件的最新进展。

更多详细报道，请您留意我们的后续更新。我是[您的姓名，此处可省略]，下次节目，我们再会。

**(背景音乐渐强并淡出)**

---`;

async function testIndexTTS() {
  console.log('🎵 测试IndexTTS语音合成...\n');

  // 使用测试端点来专门测试语音合成
  const testData = {
    action: 'test-tts',
    script: testScript,
    style: 'news-anchor'
  };

  try {
    console.log('发送IndexTTS测试请求...');
    console.log(`脚本长度: ${testScript.length} 字符`);

    const response = await fetch(`${BASE_URL}/test/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    console.log(`响应状态: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ IndexTTS调用失败:');

      try {
        const errorJson = JSON.parse(errorText);
        console.log('错误详情:', JSON.stringify(errorJson, null, 2));

        if (errorJson.error && errorJson.error.includes('SSE stream error')) {
          console.log('\n🔍 IndexTTS错误分析:');
          console.log('这通常表示IndexTTS API调用出现问题:');
          console.log('1. API密钥或访问权限问题');
          console.log('2. 请求参数格式错误');
          console.log('3. 语音样本文件无法访问');
          console.log('4. 脚本内容过长或格式问题');
          console.log('5. IndexTTS服务暂时不可用');
          console.log('6. 网络连接或超时问题');
        }
      } catch (e) {
        console.log('原始错误文本:', errorText);
      }
      return;
    }

    const result = await response.json();
    console.log('✅ IndexTTS调用成功:');
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('💥 网络错误:', error.message);
  }
}

async function testDirectIndexTTS() {
  console.log('\n🔗 直接测试IndexTTS API连通性...\n');

  try {
    // 测试IndexTTS API的可用性
    const response = await fetch('https://indexteam-indextts-2-demo.hf.space/gradio_api/info', {
      method: 'GET',
      headers: {
        'User-Agent': 'PodcastBot/1.0'
      }
    });

    console.log(`IndexTTS API状态: ${response.status}`);

    if (response.ok) {
      const info = await response.json();
      console.log('✅ IndexTTS API可访问');
      console.log('可用端点:', Object.keys(info.named_endpoints || {}));
    } else {
      console.log('❌ IndexTTS API不可访问');
      const errorText = await response.text();
      console.log('错误:', errorText);
    }

  } catch (error) {
    console.error('💥 连接IndexTTS API失败:', error.message);
  }
}

// 运行测试
async function runTests() {
  console.log('='.repeat(60));
  console.log('🎵 IndexTTS API 专项诊断测试');
  console.log('='.repeat(60));
  console.log('');

  await testDirectIndexTTS();
  await testIndexTTS();

  console.log('');
  console.log('='.repeat(60));
  console.log('📋 IndexTTS测试完成');
  console.log('='.repeat(60));
}

runTests();
