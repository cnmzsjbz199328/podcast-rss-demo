/**
 * Kokoro TTS Worker - 纯 HTTP 实现
 * 支持标准生成和流式生成两种模式
 */

const KOKORO_BASE_URL = "https://tom1986-kokoro-tts.hf.space";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 测试页面 - 带音频播放器
    if (url.pathname === '/test' && request.method === 'GET') {
      return new Response(getTestHTML(), {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }
    
    // 调试端点：查看 Space 配置
    if (url.pathname === '/debug' && request.method === 'GET') {
      try {
        const infoResponse = await fetch(`${KOKORO_BASE_URL}/info`);
        const config = await infoResponse.json();
        return new Response(JSON.stringify(config, null, 2), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ 
          error: error.message,
          hint: "Try /gradio_api/info or /api/predict"
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 流式生成端点
    if (url.pathname === '/stream' && request.method === 'GET') {
      console.log("🌊 Starting streaming TTS test");
      try {
        const result = await generateAudioStreaming();
        return new Response(result.audioData, {
          headers: {
            "Content-Type": "audio/wav",
            "Content-Length": result.audioData.byteLength.toString(),
            "Cache-Control": "no-cache",
            "X-Generation-Method": "streaming",
            "Content-Disposition": "inline; filename=streaming.wav"
          }
        });
      } catch (error) {
        console.error("❌ Streaming failed:", error);
        return new Response(JSON.stringify({
          error: error.message,
          stack: error.stack
        }), { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 标准生成端点（默认）
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    console.log("🎤 Starting standard TTS test");

    try {
      const result = await generateAudio();

      return new Response(result.audioData, {
        headers: {
          "Content-Type": "audio/wav",
          "Content-Length": result.audioData.byteLength.toString(),
          "Cache-Control": "no-cache",
          "X-Generation-Method": "standard"
        }
      });
    } catch (error) {
      console.error("❌ Failed:", error);
      return new Response(JSON.stringify({
        error: error.message,
        stack: error.stack,
        hint: "Visit /debug to see available endpoints"
      }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
};

/**
 * 标准生成模式 - 使用 /predict 端点
 */
async function generateAudio() {
  const text = "Hello world. This is a standard test of the Kokoro TTS system.";
  const voice = "af_heart";
  const speed = 1.0;

  console.log("📝 Standard mode - Text:", text.substring(0, 50), "...");
  console.log("🎵 Voice:", voice);

  // 步骤 1: 发起请求
  console.log("📤 Step 1: Initiating generation");
  
  const callUrl = `${KOKORO_BASE_URL}/gradio_api/call/predict`;
  
  const callResponse = await fetch(callUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: [text, voice, speed]
    })
  });

  if (!callResponse.ok) {
    const errorText = await callResponse.text();
    throw new Error(`Call failed: ${callResponse.status} - ${errorText}`);
  }

  const callResult = await callResponse.json();
  console.log("✅ Call initiated, event_id:", callResult.event_id);

  if (!callResult.event_id) {
    throw new Error('No event_id returned from API');
  }

  // 步骤 2: 连接 SSE 获取结果
  console.log("📡 Step 2: Connecting to SSE stream");
  
  const statusUrl = `${KOKORO_BASE_URL}/gradio_api/call/predict/${callResult.event_id}`;
  
  const statusResponse = await fetch(statusUrl, {
    method: 'GET',
    headers: {
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache'
    }
  });

  if (!statusResponse.ok) {
    const errorText = await statusResponse.text();
    throw new Error(`SSE connection failed: ${statusResponse.status} - ${errorText}`);
  }

  const text_sse = await statusResponse.text();
  console.log("📨 SSE stream received, length:", text_sse.length);

  // 解析 SSE 流
  const result = parseSSEResponse(text_sse);

  if (!result) {
    throw new Error('No complete event found in SSE stream');
  }

  if (result.status === 'error') {
    throw new Error(`API Error: ${result.error}`);
  }

  // 步骤 3: 下载音频
  return await downloadAudio(result.data);
}

/**
 * 流式生成模式 - 使用 /generate_all 端点
 */
async function generateAudioStreaming() {
  // 使用较长的文本测试流式生成
  const text = "Good morning and welcome to your comprehensive news briefing. Today, we bring you crucial political reforms from the UK, escalating international tensions, significant weather events, and updates from the realms of sports and entertainment. Leading our broadcast this hour, Home Secretary Shabana Mahmood is expected to announce sweeping reforms to the asylum system on Monday, proposals that could see refugees facing a stringent twenty-year wait before being eligible to settle permanently within the country.";
  const voice = "af_heart";
  const speed = 1.0;
  const usegpu = false;  // 布尔值，不是字符串

  console.log("📝 Streaming mode - Text length:", text.length, "chars");
  console.log("🎵 Voice:", voice);
  console.log("⚡ Speed:", speed);
  console.log("🖥️ GPU:", usegpu);

  // 步骤 1: 发起流式请求
  console.log("📤 Step 1: Initiating streaming generation");
  
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
    throw new Error(`Streaming call failed: ${callResponse.status} - ${errorText}`);
  }

  const callResult = await callResponse.json();
  console.log("✅ Streaming call initiated, event_id:", callResult.event_id);

  if (!callResult.event_id) {
    throw new Error('No event_id returned from streaming API');
  }

  // 步骤 2: 连接 SSE 获取流式结果
  console.log("📡 Step 2: Connecting to streaming SSE");
  
  const statusUrl = `${KOKORO_BASE_URL}/gradio_api/call/generate_all/${callResult.event_id}`;
  
  const statusResponse = await fetch(statusUrl, {
    method: 'GET',
    headers: {
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache'
    }
  });

  if (!statusResponse.ok) {
    const errorText = await statusResponse.text();
    throw new Error(`Streaming SSE failed: ${statusResponse.status} - ${errorText}`);
  }

  const text_sse = await statusResponse.text();
  console.log("📨 Streaming SSE received, length:", text_sse.length);

  // 解析 SSE 流
  const result = parseSSEResponse(text_sse);

  if (!result) {
    throw new Error('No complete event found in streaming SSE');
  }

  if (result.status === 'error') {
    throw new Error(`Streaming API Error: ${result.error || 'Unknown error'}`);
  }

  // 步骤 3: 下载音频
  return await downloadAudio(result.data);
}

/**
 * 下载音频文件
 */
async function downloadAudio(data) {
  // 提取音频 URL
  const audioUrl = data?.[0]?.url || data?.[0];

  if (!audioUrl) {
    console.error("❌ No audio URL in data:", JSON.stringify(data));
    throw new Error('No audio URL in result');
  }

  // 构建完整 URL
  const fullAudioUrl = audioUrl.startsWith('http') ? audioUrl : `${KOKORO_BASE_URL}${audioUrl}`;

  console.log("📥 Step 3: Downloading audio from:", fullAudioUrl);
  
  // 检查是否是 HLS 流（.m3u8）
  if (fullAudioUrl.endsWith('.m3u8')) {
    console.log("🎬 Detected HLS stream, parsing playlist...");
    return await downloadHLSStream(fullAudioUrl);
  }
  
  // 直接下载音频文件
  const audioResponse = await fetch(fullAudioUrl);
  if (!audioResponse.ok) {
    throw new Error(`Download failed: ${audioResponse.status}`);
  }

  const audioData = await audioResponse.arrayBuffer();

  console.log("✅ Audio downloaded:", audioData.byteLength, "bytes");

  return {
    audioData: audioData,
    format: 'wav'
  };
}

/**
 * 下载并合并 HLS 流
 */
async function downloadHLSStream(m3u8Url) {
  console.log("📋 Fetching HLS playlist...");
  
  const playlistResponse = await fetch(m3u8Url);
  if (!playlistResponse.ok) {
    throw new Error(`Failed to fetch playlist: ${playlistResponse.status}`);
  }
  
  const playlistText = await playlistResponse.text();
  console.log("📄 Playlist content:", playlistText.substring(0, 500));
  
  // 解析 m3u8 文件，提取 .ts 分片 URL
  const lines = playlistText.split('\n');
  const segmentUrls = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    // 跳过注释和空行
    if (trimmed && !trimmed.startsWith('#')) {
      // 构建完整 URL
      const baseUrl = m3u8Url.substring(0, m3u8Url.lastIndexOf('/') + 1);
      const segmentUrl = trimmed.startsWith('http') ? trimmed : baseUrl + trimmed;
      segmentUrls.push(segmentUrl);
    }
  }
  
  console.log(`🎞️ Found ${segmentUrls.length} segments`);
  
  if (segmentUrls.length === 0) {
    throw new Error('No segments found in HLS playlist');
  }
  
  // 下载所有分片
  const segments = [];
  for (let i = 0; i < segmentUrls.length; i++) {
    console.log(`⬇️ Downloading segment ${i + 1}/${segmentUrls.length}...`);
    
    const segmentResponse = await fetch(segmentUrls[i]);
    if (!segmentResponse.ok) {
      throw new Error(`Failed to download segment ${i}: ${segmentResponse.status}`);
    }
    
    const segmentData = await segmentResponse.arrayBuffer();
    segments.push(new Uint8Array(segmentData));
    console.log(`✅ Segment ${i + 1} downloaded: ${segmentData.byteLength} bytes`);
  }
  
  // 合并所有分片
  const totalLength = segments.reduce((sum, seg) => sum + seg.length, 0);
  const mergedAudio = new Uint8Array(totalLength);
  
  let offset = 0;
  for (const segment of segments) {
    mergedAudio.set(segment, offset);
    offset += segment.length;
  }
  
  console.log(`✅ HLS stream merged: ${mergedAudio.byteLength} bytes total`);
  
  return {
    audioData: mergedAudio.buffer,
    format: 'ts' // HLS 通常是 MPEG-TS 格式
  };
}

/**
 * 解析 SSE 响应
 */
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
        console.warn("⚠️ Failed to parse SSE data:", line);
      }
    }
  }

  console.log("🔍 Parsed SSE - eventType:", eventType, "hasData:", !!eventData);

  // 检查是否完成
  if (eventType === 'complete' && eventData) {
    console.log("✅ Found complete event with data");
    return { status: 'completed', data: eventData };
  }

  // 检查是否出错
  if (eventType === 'error') {
    console.error("❌ Found error event:", eventData);
    return { status: 'error', error: eventData || 'Unknown error' };
  }

  // 仍在处理中或解析失败
  console.warn("⚠️ No complete/error event found");
  return null;
}

/**
 * 生成测试页面 HTML
 */
function getTestHTML() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kokoro TTS Test</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .card {
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    h1 { color: #333; margin-top: 0; }
    h2 { color: #666; font-size: 1.2em; margin-top: 0; }
    button {
      background: #007bff;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
      margin-right: 10px;
    }
    button:hover { background: #0056b3; }
    button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    audio {
      width: 100%;
      margin-top: 15px;
    }
    .status {
      margin-top: 15px;
      padding: 10px;
      border-radius: 6px;
      font-size: 14px;
    }
    .success { background: #d4edda; color: #155724; }
    .error { background: #f8d7da; color: #721c24; }
    .info { background: #d1ecf1; color: #0c5460; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🎤 Kokoro TTS Test</h1>
    <p>Test standard and streaming audio generation</p>
  </div>

  <div class="card">
    <h2>Standard Mode (Short Text)</h2>
    <button onclick="testStandard()">Generate Standard Audio</button>
    <div id="standard-status"></div>
    <audio id="standard-audio" controls style="display:none;"></audio>
  </div>

  <div class="card">
    <h2>Streaming Mode (Long Text)</h2>
    <button onclick="testStreaming()">Generate Streaming Audio</button>
    <div id="streaming-status"></div>
    <audio id="streaming-audio" controls style="display:none;"></audio>
  </div>

  <script>
    async function testStandard() {
      const statusDiv = document.getElementById('standard-status');
      const audio = document.getElementById('standard-audio');
      
      statusDiv.innerHTML = '<div class="status info">⏳ Generating standard audio...</div>';
      audio.style.display = 'none';
      
      try {
        const response = await fetch('/');
        
        if (!response.ok) {
          throw new Error(\`HTTP \${response.status}\`);
        }
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        audio.src = url;
        audio.style.display = 'block';
        
        statusDiv.innerHTML = \`
          <div class="status success">
            ✅ Generated successfully! Size: \${(blob.size / 1024).toFixed(1)} KB
            <br><a href="\${url}" download="standard.wav">Download</a>
          </div>
        \`;
      } catch (error) {
        statusDiv.innerHTML = \`<div class="status error">❌ Error: \${error.message}</div>\`;
      }
    }
    
    async function testStreaming() {
      const statusDiv = document.getElementById('streaming-status');
      const audio = document.getElementById('streaming-audio');
      
      statusDiv.innerHTML = '<div class="status info">⏳ Generating streaming audio (this may take longer)...</div>';
      audio.style.display = 'none';
      
      try {
        const response = await fetch('/stream');
        
        if (!response.ok) {
          throw new Error(\`HTTP \${response.status}\`);
        }
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        audio.src = url;
        audio.style.display = 'block';
        
        statusDiv.innerHTML = \`
          <div class="status success">
            ✅ Generated successfully! Size: \${(blob.size / 1024).toFixed(1)} KB
            <br><a href="\${url}" download="streaming.aac">Download</a>
          </div>
        \`;
      } catch (error) {
        statusDiv.innerHTML = \`<div class="status error">❌ Error: \${error.message}</div>\`;
      }
    }
  </script>
</body>
</html>`;
}