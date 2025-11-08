#!/usr/bin/env node

/** 参数格式对比调试 */

const BASE_URL = 'https://indexteam-indextts-2-demo.hf.space';

// test-simple-tts.js 的参数 (成功的)
const successfulParams = [
  'Same as the voice reference',
  {
    path: 'https://pub-b436254f85684e9e95bebad4567b11ff.r2.dev/voice/guodegang.mp3',
    url: 'https://pub-b436254f85684e9e95bebad4567b11ff.r2.dev/voice/guodegang.mp3',
    size: null,
    orig_name: 'guodegang.mp3',
    mime_type: 'audio/mpeg',
    is_stream: false,
    meta: { _type: 'gradio.FileData' }
  },
  '剑桥郡火车刺伤案中，一名列车工作人员生命垂危。然而，警方赞扬司机、乘务员及乘客英勇施救，避免了更严重后果。与此同时，一名因贩毒被捕的英国19岁怀孕少女，在格鲁吉亚监狱获释，她已怀孕八个月。这两起事件都提醒我们，在挑战面前，总有生命韧性与人道光辉闪耀。',
  null, // emo_ref_path
  0.9, // emo_weight - 高情感权重
  0.8, // vec1 - Happy
  0, 0, 0, 0, 0,
  0.6, // vec7 - Surprise
  0, // vec8 - Neutral
  '', // emo_text
  false, // emo_random
  120, true, 0.8, 30, 0.8, 0, 3, 10, 1500
];

// 模拟部署系统的参数构建
function buildDeploymentParams(style = 'news-anchor') {
  // 获取风格配置 (简化版本)
  const styleConfigs = {
    'news-anchor': {
      voiceSample: 'https://pub-b436254f85684e9e95bebad4567b11ff.r2.dev/voice/kaluoling.mp3',
      emotionSample: null,
      params: {
        emo_weight: 0.3,
        vec1: 0, vec2: 0, vec3: 0, vec4: 0, vec5: 0,
        vec6: 0, vec7: 0, vec8: 0.9
      }
    },
    'guo-de-gang': {
      voiceSample: 'https://pub-b436254f85684e9e95bebad4567b11ff.r2.dev/voice/guodegang.mp3',
      emotionSample: 'https://pub-b436254f85684e9e95bebad4567b11ff.r2.dev/emotions/comedy.wav',
      params: {
        emo_weight: 0.9,
        vec1: 0.8, vec2: 0, vec3: 0, vec4: 0, vec5: 0,
        vec6: 0, vec7: 0.6, vec8: 0
      }
    }
  };

  const styleConfig = styleConfigs[style];

  // 模拟部署系统的脚本内容
  const deploymentScript = `好的，这是一份专业新闻播报员风格的播客脚本，整合了您提供的新闻内容：

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

  // 构建语音文件数据对象
  const voiceFileData = {
    path: styleConfig.voiceSample,
    url: styleConfig.voiceSample,
    size: null,
    orig_name: 'voice_sample.mp3',
    mime_type: 'audio/mpeg',
    is_stream: false,
    meta: { _type: 'gradio.FileData' }
  };

  // 构建情感文件数据对象（可选）
  const emotionFileData = styleConfig.emotionSample ? {
    path: styleConfig.emotionSample,
    url: styleConfig.emotionSample,
    size: null,
    orig_name: 'emotion_sample.wav',
    mime_type: 'audio/wav',
    is_stream: false,
    meta: { _type: 'gradio.FileData' }
  } : null;

  // 构建参数数组
  const deploymentParams = [
    'Same as the voice reference',  // emo_control_method
    voiceFileData,                  // prompt (voice reference)
    deploymentScript,               // text
    emotionFileData,                // emo_ref_path
    styleConfig.params.emo_weight,  // emo_weight
    styleConfig.params.vec1,        // vec1 (Happy)
    styleConfig.params.vec2,        // vec2 (Angry)
    styleConfig.params.vec3,        // vec3 (Sad)
    styleConfig.params.vec4,        // vec4 (Afraid)
    styleConfig.params.vec5,        // vec5 (Disgusted)
    styleConfig.params.vec6,        // vec6 (Melancholic)
    styleConfig.params.vec7,        // vec7 (Surprised)
    styleConfig.params.vec8,        // vec8 (Calm)
    '',                             // emo_text
    false,                          // emo_random
    120,                            // max_text_tokens_per_segment
    true,                           // param_16 (do_sample)
    0.8,                            // param_17 (top_p)
    30,                             // param_18 (top_k)
    0.8,                            // param_19 (temperature)
    0,                              // param_20 (length_penalty)
    3,                              // param_21 (num_beams)
    10,                             // param_22 (repetition_penalty)
    1500                            // param_23 (max_mel_tokens)
  ];

  return deploymentParams;
}

async function testBothMethods() {
  console.log('🔬 对比测试：简单脚本 vs 部署系统参数\n');

  console.log('=' .repeat(60));
  console.log('方法1: test-simple-tts.js (成功的)');
  console.log('=' .repeat(60));

  console.log('参数数量:', successfulParams.length);
  console.log('脚本长度:', successfulParams[2].length, '字符');
  console.log('语音文件:', successfulParams[1].url);

  console.log('\n发送测试请求...');
  try {
    const response1 = await fetch(`${BASE_URL}/gradio_api/call/gen_single`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: successfulParams })
    });

    console.log('响应状态:', response1.status);
    if (response1.ok) {
      const result1 = await response1.json();
      console.log('Event ID:', result1.event_id);

      // 轮询结果
      const pollResponse1 = await fetch(`${BASE_URL}/gradio_api/call/gen_single/${result1.event_id}`, {
        headers: { 'Accept': 'text/event-stream' }
      });

      if (pollResponse1.ok) {
        const text1 = await pollResponse1.text();
        console.log('SSE响应长度:', text1.length);
        console.log('包含"complete":', text1.includes('complete'));
      }
    }
  } catch (error) {
    console.error('方法1失败:', error.message);
  }

  console.log('\n' + '=' .repeat(60));
  console.log('方法2: 部署系统参数 (失败的)');
  console.log('=' .repeat(60));

  const deploymentParams = buildDeploymentParams('news-anchor');
  console.log('参数数量:', deploymentParams.length);
  console.log('脚本长度:', deploymentParams[2].length, '字符');
  console.log('语音文件:', deploymentParams[1].url);

  console.log('\n发送测试请求...');
  try {
    const response2 = await fetch(`${BASE_URL}/gradio_api/call/gen_single`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: deploymentParams })
    });

    console.log('响应状态:', response2.status);
    if (response2.ok) {
      const result2 = await response2.json();
      console.log('Event ID:', result2.event_id);

      // 轮询结果
      const pollResponse2 = await fetch(`${BASE_URL}/gradio_api/call/gen_single/${result2.event_id}`, {
        headers: { 'Accept': 'text/event-stream' }
      });

      if (pollResponse2.ok) {
        const text2 = await pollResponse2.text();
        console.log('SSE响应长度:', text2.length);
        console.log('包含"complete":', text2.includes('complete'));
        console.log('包含"error":', text2.includes('event: error'));
      }
    } else {
      const errorText = await response2.text();
      console.log('API错误:', errorText);
    }
  } catch (error) {
    console.error('方法2失败:', error.message);
  }

  console.log('\n' + '=' .repeat(60));
  console.log('参数差异分析');
  console.log('=' .repeat(60));

  console.log('方法1参数数量:', successfulParams.length);
  console.log('方法2参数数量:', deploymentParams.length);
  console.log('参数数量差异:', deploymentParams.length - successfulParams.length);

  console.log('\n脚本内容差异:');
  console.log('方法1脚本长度:', successfulParams[2].length);
  console.log('方法2脚本长度:', deploymentParams[2].length);
  console.log('脚本长度差异:', deploymentParams[2].length - successfulParams[2].length);

  console.log('\n语音文件差异:');
  console.log('方法1语音文件:', successfulParams[1].url.split('/').pop());
  console.log('方法2语音文件:', deploymentParams[1].url.split('/').pop());
}

// 运行测试
testBothMethods();
