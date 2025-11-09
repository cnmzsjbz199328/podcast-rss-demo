#!/usr/bin/env node

/**
 * Kokoro TTS 长度限制测试脚本
 * 直接测试不同长度文本的处理情况
 */

import { Client } from "@gradio/client";

const SPACE_URL = "Tom1986/Kokoro-TTS";

// 测试文本
const testTexts = {
  short: "Hello world, this is a short test message with about fifty words to check basic functionality of the text to speech system and ensure everything works correctly with minimal text input.",

  medium: "The United Kingdom government is poised to announce a significant shake-up of its asylum system, with Home Secretary Shabana Mahmood reportedly considering models based on some of Europe's most stringent migration laws, including the Danish approach, as the government seeks new strategies to manage migration flows and border controls in response to increasing global migration pressures and changing international relations.",

  long: "The UK government is preparing to unveil major reforms to its asylum system, with Home Secretary Shabana Mahmood exploring European models including Denmark's strict migration policies. This comes as the government develops new approaches to handle migration challenges. In related news, Metropolitan Police officers face disciplinary action following BBC Panorama investigations into police conduct at Charing Cross station, where officers were filmed discussing physical restraint of a detainee. Meanwhile, former footballer Joey Barton has been convicted of grossly offensive social media posts directed at broadcaster Jeremy Vine and football pundits Lucy Ward and Eni Aluko. An international legal development involves British ex-soldier Robert James Purkiss, who now faces extradition to Kenya over the alleged 2012 murder of Agnes Manjiru. Shifting to political matters, four Labour MPs have had their party whip restored after a period of rebellion, with Chris Hinchliff emphasizing continued focus on Labour's historic mission. Financial disputes continue within the Your Party, with officials accusing MP Zarah Sultana of withholding approximately eight hundred thousand pounds despite previous transfer agreements.",

  extraLong: "The UK government is preparing to unveil major reforms to its asylum system, with Home Secretary Shabana Mahmood exploring European models including Denmark's strict migration policies. This comes as the government develops new approaches to handle migration challenges. In related news, Metropolitan Police officers face disciplinary action following BBC Panorama investigations into police conduct at Charing Cross station, where officers were filmed discussing physical restraint of a detainee. Meanwhile, former footballer Joey Barton has been convicted of grossly offensive social media posts directed at broadcaster Jeremy Vine and football pundits Lucy Ward and Eni Aluko. An international legal development involves British ex-soldier Robert James Purkiss, who now faces extradition to Kenya over the alleged 2012 murder of Agnes Manjiru. Shifting to political matters, four Labour MPs have had their party whip restored after a period of rebellion, with Chris Hinchliff emphasizing continued focus on Labour's historic mission. Financial disputes continue within the Your Party, with officials accusing MP Zarah Sultana of withholding approximately eight hundred thousand pounds despite previous transfer agreements. On the international stage, former US President Donald Trump has suggested Hungary might receive an exemption from sanctions on Russian oil, marking a potential shift in his administration's energy policy approach. In the scientific community, the death of DNA pioneer James Watson at age ninety-seven has been announced, with the Nobel Prize winner having reportedly felt ostracized by colleagues following controversial statements on race and intelligence. A deeply concerning social issue has emerged with mothers coming forward to report that AI chatbots encouraged their sons toward self-harm, as detailed in a powerful interview with Megan Garcia discussing her teenage son's tragic experience. Adding to royal family coverage, Prince George joined the Princess of Wales, King Charles, and Queen Camilla at the annual Festival of Remembrance ceremony at the Royal Albert Hall. Finally, insights into the financial habits of Elon Musk reveal that despite his ownership of luxury vehicles and private jets, the world's richest person reportedly maintains relatively modest personal living arrangements."
};

async function testKokoroLimits() {
  console.log('🎤 Kokoro TTS 长度限制测试\n');

  let client;
  try {
    console.log('初始化 Kokoro TTS 客户端...');
    client = await Client.connect(SPACE_URL);
    console.log('✅ 客户端连接成功\n');

    for (const [name, text] of Object.entries(testTexts)) {
      console.log(`📝 测试: ${name.toUpperCase()}`);
      console.log(`文本长度: ${text.split(' ').length} 词, ${text.length} 字符`);

      try {
        const startTime = Date.now();

        const result = await client.predict("/predict", {
          text: text,
          voice: "af_heart",
          speed: 1,
        });

        const duration = Date.now() - startTime;

        console.log(`✅ API 调用成功 (${duration}ms)`);

        if (result.data && typeof result.data === 'string' && result.data.startsWith('data:audio')) {
          console.log(`🎵 返回音频数据URL: ${result.data.substring(0, 50)}...`);
        } else {
          console.log(`🎵 返回数据类型: ${typeof result.data}`);
        }

        // 估算音频时长（假设150词/分钟）
        const estimatedWords = text.split(' ').length;
        const estimatedDuration = (estimatedWords / 150) * 60;
        console.log(`⏱️  估算时长: ${estimatedDuration.toFixed(1)}秒`);

      } catch (error) {
        console.log(`❌ API 调用失败: ${error.message}`);
      }

      console.log('─'.repeat(60) + '\n');
    }

  } catch (error) {
    console.error('❌ 客户端初始化失败:', error.message);
  }
}

// 运行测试
testKokoroLimits().catch(console.error);
