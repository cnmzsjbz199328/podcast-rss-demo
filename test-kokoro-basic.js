/**
 * 简单的 Kokoro TTS 基本功能测试
 */
const KOKORO_BASE_URL = "https://tom1986-kokoro-tts.hf.space";

async function testKokoroBasic() {
  console.log("🎵 Testing Kokoro TTS basic functionality...");

  try {
    // 步骤 1: 发起生成请求
    console.log("📤 Step 1: Initiating generation...");
    const text = "Hello world, this is a test.";
    const voice = "af_heart";
    const speed = 1.0;
    const usegpu = false;

    const callUrl = `${KOKORO_BASE_URL}/gradio_api/call/generate_all`;

    const callResponse = await fetch(callUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [text, voice, speed, usegpu]
      })
    });

    if (!callResponse.ok) {
      const errorText = await callResponse.text();
      throw new Error(`Failed to initiate: ${callResponse.status} - ${errorText}`);
    }

    const callResult = await callResponse.json();
    console.log("✅ Call result:", callResult);

    const eventId = callResult.event_id;
    if (!eventId) {
      throw new Error('No event_id returned');
    }

    // 步骤 2: 监听 SSE
    console.log("📡 Step 2: Listening to SSE...");
    const statusUrl = `${KOKORO_BASE_URL}/gradio_api/call/generate_all/${eventId}`;

    const statusResponse = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    });

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      throw new Error(`SSE failed: ${statusResponse.status} - ${errorText}`);
    }

    const sseText = await statusResponse.text();
    console.log(`📨 SSE received, length: ${sseText.length}`);

    // 步骤 3: 解析结果
    console.log("🔍 Step 3: Parsing SSE...");
    const result = parseSSEResponse(sseText);
    console.log("🎯 Parsed result:", result);

    if (!result || result.status !== 'completed') {
      throw new Error('Generation did not complete successfully');
    }

    // 步骤 4: 下载音频
    console.log("⬇️ Step 4: Downloading audio...");
    const audioUrl = result.data?.[0]?.url || result.data?.[0];
    if (!audioUrl) {
      throw new Error('No audio URL in result');
    }

    const fullAudioUrl = audioUrl.startsWith('http') ? audioUrl : `${KOKORO_BASE_URL}${audioUrl}`;
    console.log("Audio URL:", fullAudioUrl);

    const audioResponse = await fetch(fullAudioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Download failed: ${audioResponse.status}`);
    }

    const arrayBuffer = await audioResponse.arrayBuffer();
    console.log(`✅ Audio downloaded: ${arrayBuffer.byteLength} bytes`);

    return {
      success: true,
      audioSize: arrayBuffer.byteLength,
      textLength: text.length
    };

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

function parseSSEResponse(text) {
  const lines = text.split('\n');
  let eventType = null;
  let eventData = null;

  for (const line of lines) {
    if (line.startsWith('event: ')) {
      eventType = line.substring(7).trim();
    } else if (line.startsWith('data: ')) {
      try {
        eventData = JSON.parse(line.substring(6));
      } catch (parseError) {
        console.warn('Failed to parse SSE data:', line);
      }
    }
  }

  console.log('Parsed SSE - eventType:', eventType, 'hasData:', !!eventData);

  if (eventType === 'complete' && eventData) {
    console.log('Found complete event with data');
    return { status: 'completed', data: eventData };
  }

  if (eventType === 'error') {
    console.error('Found error event:', eventData);
    return { status: 'error', error: eventData || 'Unknown error' };
  }

  return null;
}

// 运行测试
testKokoroBasic().then(result => {
  console.log("\n📊 Test Result:", result);
  process.exit(result.success ? 0 : 1);
});
