/**
 * Gemini JSON 结构化返回测试
 * 测试 Google Gemini 是否能稳定返回 JSON 格式
 */

// 测试用的 API Key（从环境变量读取）
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyAW6CgIzHas3fGsXv6mnxXpG1Tv6ourQkw' || 'AIzaSyAkjjowqCQtpe5WSPVoAYzvKSQ1U-7Vn50';

/**
 * 测试 Gemini JSON 模式
 */
async function testGeminiJsonMode() {
  console.log('🧪 测试 1: Gemini JSON Schema 模式 (gemini-2.5-flash)');
  console.log('=' .repeat(60));

  // gemini-2.5-flash 支持 Structured outputs，需要使用 v1beta API
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const prompt = `You are a professional podcast host creating a series about Artificial Intelligence.

Please generate episode 1 content following these requirements:

Previous Episodes: None (this is the first episode)
Previously Used Keywords: None

Requirements:
1. Title should be engaging and educational
2. Choose 3-5 unique keywords (avoid duplicates with previous episodes)
3. Abstract should be a compelling 2-3 sentence summary
4. Script should be approximately 600 words of pure spoken content

Please return in JSON format:
{
  "title": "Episode title here",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "abstract": "Episode abstract here",
  "script": "Full podcast script here"
}`;

  const requestBody = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
      responseMimeType: "application/json", // 🔑 关键：强制 JSON 输出
      responseSchema: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Episode title"
          },
          keywords: {
            type: "array",
            items: {
              type: "string"
            },
            description: "3-5 keywords for the episode"
          },
          abstract: {
            type: "string",
            description: "2-3 sentence summary"
          },
          script: {
            type: "string",
            description: "Full podcast script (600 words)"
          }
        },
        required: ["title", "keywords", "abstract", "script"]
      }
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const data = await response.json();
    
    // 提取返回的文本
    const rawText = data.candidates[0].content.parts[0].text;
    console.log('✅ Raw Response:', rawText.substring(0, 200) + '...\n');

    // 尝试解析 JSON
    const parsed = JSON.parse(rawText);
    
    console.log('✅ JSON 解析成功！');
    console.log('📋 结构验证:');
    console.log(`  - title: ${parsed.title ? '✓' : '✗'} (${parsed.title?.substring(0, 50)}...)`);
    console.log(`  - keywords: ${Array.isArray(parsed.keywords) ? '✓' : '✗'} (${parsed.keywords?.length} items)`);
    console.log(`  - abstract: ${parsed.abstract ? '✓' : '✗'} (${parsed.abstract?.length} chars)`);
    console.log(`  - script: ${parsed.script ? '✓' : '✗'} (${parsed.script?.split(' ').length} words)`);
    
    return {
      success: true,
      provider: 'Gemini',
      mode: 'JSON Schema',
      parsed: parsed,
      stats: {
        titleLength: parsed.title?.length,
        keywordCount: parsed.keywords?.length,
        abstractLength: parsed.abstract?.length,
        scriptWords: parsed.script?.split(' ').length
      }
    };

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    return {
      success: false,
      provider: 'Gemini',
      mode: 'JSON Schema',
      error: error.message
    };
  }
}

/**
 * 测试 Gemini 纯文本提示
 */
async function testGeminiTextPrompt() {
  console.log('\n🧪 测试 2: Gemini 纯文本提示 (无 JSON Schema)');
  console.log('=' .repeat(60));

  // 使用 gemini-2.5-flash 和 v1 API 进行普通文本生成
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const prompt = `You are a professional podcast host. Generate episode 1 about AI.

Return ONLY valid JSON (no markdown, no code blocks):
{"title": "...", "keywords": ["..."], "abstract": "...", "script": "..."}`;

  const requestBody = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    const rawText = data.candidates[0].content.parts[0].text;
    
    console.log('📄 Raw Response:', rawText.substring(0, 200) + '...\n');

    // 尝试清理和解析
    let cleaned = rawText.trim();
    
    // 移除可能的 markdown 代码块
    cleaned = cleaned.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    const parsed = JSON.parse(cleaned);
    
    console.log('✅ JSON 解析成功（需要清理）');
    console.log(`  - 需要清理 markdown: ${rawText !== cleaned ? '是' : '否'}`);
    
    return {
      success: true,
      provider: 'Gemini',
      mode: 'Text Prompt',
      needsCleaning: rawText !== cleaned,
      parsed: parsed
    };

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    return {
      success: false,
      provider: 'Gemini',
      mode: 'Text Prompt',
      error: error.message
    };
  }
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('🚀 Gemini JSON 结构化返回能力测试');
  console.log('='.repeat(60));
  console.log(`测试时间: ${new Date().toISOString()}\n`);

  const results = [];

  // 测试 1: JSON Schema 模式（推荐）
  results.push(await testGeminiJsonMode());
  
  // 测试 2: 纯文本提示
  results.push(await testGeminiTextPrompt());

  // 汇总结果
  console.log('\n📊 测试结果汇总');
  console.log('='.repeat(60));
  
  results.forEach((result, index) => {
    console.log(`\n测试 ${index + 1}: ${result.mode}`);
    console.log(`  状态: ${result.success ? '✅ 成功' : '❌ 失败'}`);
    if (result.success) {
      console.log(`  需要清理: ${result.needsCleaning ? '是' : '否'}`);
      if (result.stats) {
        console.log(`  统计信息:`);
        console.log(`    - 标题长度: ${result.stats.titleLength} chars`);
        console.log(`    - 关键词数量: ${result.stats.keywordCount}`);
        console.log(`    - 摘要长度: ${result.stats.abstractLength} chars`);
        console.log(`    - 脚本字数: ${result.stats.scriptWords} words`);
      }
    } else {
      console.log(`  错误: ${result.error}`);
    }
  });

  // 推荐方案
  console.log('\n💡 推荐方案');
  console.log('='.repeat(60));
  const jsonSchemaResult = results[0];
  if (jsonSchemaResult.success) {
    console.log('✅ 使用 Gemini JSON Schema 模式 (responseMimeType + responseSchema)');
    console.log('   优势: 稳定、无需清理、类型安全');
  } else {
    console.log('⚠️  JSON Schema 模式不可用，需要使用文本提示 + 清理');
  }
}

// 执行测试
runAllTests().catch(console.error);
