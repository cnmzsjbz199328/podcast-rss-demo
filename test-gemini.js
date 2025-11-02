// 简单的Gemini API测试
import { config } from 'dotenv';
config();

import { GoogleGenAI } from '@google/genai';

async function testGeminiAPI() {
  console.log('🔧 测试Gemini API连接...');

  try {
    console.log('API Key:', process.env.GEMINI_API_KEY ? '已设置' : '未设置');

    const client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });

    console.log('Client created:', typeof client);

    // 检查client的属性
    console.log('Client methods:', Object.getOwnPropertyNames(client));
    console.log('Client prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(client)));

    // 检查models属性
    if (client.models) {
      console.log('✅ client.models 存在');
      console.log('Models methods:', Object.getOwnPropertyNames(client.models));

      // 先尝试列出可用模型
      try {
        console.log('🔍 尝试获取可用模型列表...');
        const models = await client.models.list();
        console.log('可用模型:', models);
      } catch (error) {
        console.log('无法获取模型列表:', error.message);
      }

      // 使用用户指定的正确方式
      try {
        console.log('尝试模型: gemini-2.0-flash-exp');
        const result = await client.models.generateContent({
          model: 'gemini-2.0-flash-exp',
          contents: 'Hello, how are you?'
        });

        console.log('✅ API调用成功');
        console.log('Result object:', Object.keys(result));

        // 检查candidates数组
        if (result.candidates && result.candidates.length > 0) {
          const candidate = result.candidates[0];
          console.log('Candidate object:', Object.keys(candidate));

          if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
            const text = candidate.content.parts[0].text;
            console.log('Response text:', text);
          } else {
            console.log('Candidate structure:', JSON.stringify(candidate, null, 2));
          }
        } else {
          console.log('No candidates found');
          console.log('Result structure:', JSON.stringify(result, null, 2));
        }
        return; // 成功就退出
      } catch (error) {
        console.log(`❌ 模型 gemini-2.0-flash-exp 失败:`, error.message);
      }

      // 尝试其他模型
      const modelsToTry = ['gemini-1.5-flash-latest', 'gemini-pro'];

      for (const modelName of modelsToTry) {
        try {
          console.log(`尝试模型: ${modelName}`);
          const result = await client.models.generateContent({
            model: modelName,
            contents: 'Hello, how are you?'
          });

          console.log('✅ API调用成功');
          console.log('Response:', result.response.text());
          return; // 成功就退出
        } catch (error) {
          console.log(`❌ 模型 ${modelName} 失败:`, error.message);
        }
      }
    } else {
      console.log('❌ client.models 不存在');
    }

  } catch (error) {
    console.error('❌ Gemini API测试失败:', error.message);
  }
}

testGeminiAPI();
