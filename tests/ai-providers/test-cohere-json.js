/**
 * Cohere JSON 结构化返回测试
 * 测试 Cohere Command 是否能稳定返回 JSON 格式
 */

// 测试用的 API Key（从环境变量读取）
const COHERE_API_KEY = process.env.COHERE_API_KEY || 'LZm1ofmZmkR11EQo4WhKCHMlCueE8mKsmVAyAQju';

/**
 * 测试 Cohere JSON 响应格式
 */
async function testCohereJsonResponse() {
  console.log('🧪 测试 1: Cohere JSON 响应格式');
  console.log('=' .repeat(60));

  const url = 'https://api.cohere.com/v2/chat';

  const systemPrompt = `You are a professional podcast content generator. You MUST respond with valid JSON only.

Required JSON structure:
{
  "title": "Episode title",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "abstract": "Episode summary",
  "script": "Full podcast script"
}

Do not include any text outside the JSON structure. Do not use markdown code blocks.`;

  const userPrompt = `Generate episode 1 about Artificial Intelligence for a podcast series.

Requirements:
- Title: Engaging and educational
- Keywords: 3-5 unique keywords
- Abstract: 2-3 sentence summary
- Script: Approximately 600 words of spoken content

Return ONLY the JSON object, nothing else.`;

  const requestBody = {
    model: 'command-r-plus-08-2024',
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userPrompt
      }
    ],
    response_format: {
      type: 'json_object' // 🔑 关键：强制 JSON 输出
    },
    temperature: 0.7,
    max_tokens: 2048
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${COHERE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const data = await response.json();
    
    // Cohere v2 API 响应结构
    const rawText = data.message?.content?.[0]?.text || data.text;
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
      provider: 'Cohere',
      mode: 'JSON Response Format',
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
      provider: 'Cohere',
      mode: 'JSON Response Format',
      error: error.message
    };
  }
}

/**
 * 测试 Cohere 纯文本提示
 */
async function testCohereTextPrompt() {
  console.log('\n🧪 测试 2: Cohere 纯文本提示 (无 response_format)');
  console.log('=' .repeat(60));

  const url = 'https://api.cohere.com/v2/chat';

  const requestBody = {
    model: 'command-r-plus-08-2024',
    messages: [
      {
        role: 'user',
        content: `Generate podcast episode about AI. Return ONLY valid JSON:
{"title": "...", "keywords": ["..."], "abstract": "...", "script": "..."}`
      }
    ],
    temperature: 0.7,
    max_tokens: 2048
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${COHERE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    const rawText = data.message?.content?.[0]?.text || data.text;
    
    console.log('📄 Raw Response:', rawText.substring(0, 200) + '...\n');

    // 尝试清理和解析
    let cleaned = rawText.trim();
    
    // 移除可能的 markdown 或说明文字
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }
    
    const parsed = JSON.parse(cleaned);
    
    console.log('✅ JSON 解析成功（可能需要清理）');
    console.log(`  - 需要提取 JSON: ${rawText !== cleaned ? '是' : '否'}`);
    
    return {
      success: true,
      provider: 'Cohere',
      mode: 'Text Prompt',
      needsCleaning: rawText !== cleaned,
      parsed: parsed
    };

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    return {
      success: false,
      provider: 'Cohere',
      mode: 'Text Prompt',
      error: error.message
    };
  }
}

/**
 * 测试 Cohere 工具调用（Tool Use）
 */
async function testCohereToolUse() {
  console.log('\n🧪 测试 3: Cohere Tool Use (Function Calling)');
  console.log('=' .repeat(60));

  const url = 'https://api.cohere.com/v2/chat';

  const requestBody = {
    model: 'command-r-plus-08-2024',
    messages: [
      {
        role: 'user',
        content: 'Generate episode 1 about AI for a podcast series'
      }
    ],
    tools: [
      {
        type: 'function',
        function: {
          name: 'create_podcast_episode',
          description: 'Creates a podcast episode with title, keywords, abstract and script',
          parameters: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Episode title'
              },
              keywords: {
                type: 'array',
                items: { type: 'string' },
                description: '3-5 keywords for the episode'
              },
              abstract: {
                type: 'string',
                description: '2-3 sentence summary'
              },
              script: {
                type: 'string',
                description: 'Full podcast script (600 words)'
              }
            },
            required: ['title', 'keywords', 'abstract', 'script']
          }
        }
      }
    ],
    tool_choice: { type: 'function', function: { name: 'create_podcast_episode' } }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${COHERE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const data = await response.json();
    
    // 提取工具调用参数
    const toolCall = data.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call returned');
    }

    const parsed = toolCall.function?.arguments;
    
    console.log('✅ Tool Call 成功！');
    console.log('📋 结构验证:');
    console.log(`  - title: ${parsed.title ? '✓' : '✗'}`);
    console.log(`  - keywords: ${Array.isArray(parsed.keywords) ? '✓' : '✗'} (${parsed.keywords?.length} items)`);
    console.log(`  - abstract: ${parsed.abstract ? '✓' : '✗'}`);
    console.log(`  - script: ${parsed.script ? '✓' : '✗'}`);
    
    return {
      success: true,
      provider: 'Cohere',
      mode: 'Tool Use',
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
      provider: 'Cohere',
      mode: 'Tool Use',
      error: error.message
    };
  }
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('🚀 Cohere JSON 结构化返回能力测试');
  console.log('='.repeat(60));
  console.log(`测试时间: ${new Date().toISOString()}\n`);

  const results = [];

  // 测试 1: JSON Response Format（推荐）
  results.push(await testCohereJsonResponse());
  
  // 测试 2: 纯文本提示
  results.push(await testCohereTextPrompt());
  
  // 测试 3: Tool Use
  results.push(await testCohereToolUse());

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
  
  const successfulMethods = results.filter(r => r.success);
  if (successfulMethods.length > 0) {
    console.log('✅ Cohere 可用的方法:');
    successfulMethods.forEach(r => {
      console.log(`   - ${r.mode}`);
    });
    console.log('\n推荐优先级:');
    console.log('   1. JSON Response Format (最简单)');
    console.log('   2. Tool Use (最结构化)');
    console.log('   3. Text Prompt (需要清理)');
  } else {
    console.log('❌ 所有方法都失败，Cohere 可能不支持当前 API 版本');
  }
}

// 执行测试
runAllTests().catch(console.error);
