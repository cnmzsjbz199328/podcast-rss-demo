#!/usr/bin/env node

/**
 * 语音长度限制测试
 * 使用现有的API端点测试不同长度文本的处理
 */

const testTexts = {
  short: "Hello world, this is a short test message with about fifty words to check basic functionality of the text to speech system and ensure everything works correctly with minimal text input.",

  medium: "The United Kingdom government is poised to announce a significant shake-up of its asylum system, with Home Secretary Shabana Mahmood reportedly considering models based on some of Europe's most stringent migration laws, including the Danish approach, as the government seeks new strategies to manage migration flows and border controls in response to increasing global migration pressures and changing international relations.",

  long: "The UK government is preparing to unveil major reforms to its asylum system, with Home Secretary Shabana Mahmood exploring European models including Denmark's strict migration policies. This comes as the government develops new approaches to handle migration challenges. In related news, Metropolitan Police officers face disciplinary action following BBC Panorama investigations into police conduct at Charing Cross station, where officers were filmed discussing physical restraint of a detainee. Meanwhile, former footballer Joey Barton has been convicted of grossly offensive social media posts directed at broadcaster Jeremy Vine and football pundits Lucy Ward and Eni Aluko. An international legal development involves British ex-soldier Robert James Purkiss, who now faces extradition to Kenya over the alleged 2012 murder of Agnes Manjiru. Shifting to political matters, four Labour MPs have had their party whip restored after a period of rebellion, with Chris Hinchliff emphasizing continued focus on Labour's historic mission. Financial disputes continue within the Your Party, with officials accusing MP Zarah Sultana of withholding approximately eight hundred thousand pounds despite previous transfer agreements.",

  extraLong: "The UK government is preparing to unveil major reforms to its asylum system, with Home Secretary Shabana Mahmood exploring European models including Denmark's strict migration policies. This comes as the government develops new approaches to handle migration challenges. In related news, Metropolitan Police officers face disciplinary action following BBC Panorama investigations into police conduct at Charing Cross station, where officers were filmed discussing physical restraint of a detainee. Meanwhile, former footballer Joey Barton has been convicted of grossly offensive social media posts directed at broadcaster Jeremy Vine and football pundits Lucy Ward and Eni Aluko. An international legal development involves British ex-soldier Robert James Purkiss, who now faces extradition to Kenya over the alleged 2012 murder of Agnes Manjiru. Shifting to political matters, four Labour MPs have had their party whip restored after a period of rebellion, with Chris Hinchliff emphasizing continued focus on Labour's historic mission. Financial disputes continue within the Your Party, with officials accusing MP Zarah Sultana of withholding approximately eight hundred thousand pounds despite previous transfer agreements. On the international stage, former US President Donald Trump has suggested Hungary might receive an exemption from sanctions on Russian oil, marking a potential shift in his administration's energy policy approach. In the scientific community, the death of DNA pioneer James Watson at age ninety-seven has been announced, with the Nobel Prize winner having reportedly felt ostracized by colleagues following controversial statements on race and intelligence. A deeply concerning social issue has emerged with mothers coming forward to report that AI chatbots encouraged their sons toward self-harm, as detailed in a powerful interview with Megan Garcia discussing her teenage son's tragic experience. Adding to royal family coverage, Prince George joined the Princess of Wales, King Charles, and Queen Camilla at the annual Festival of Remembrance ceremony at the Royal Albert Hall. Finally, insights into the financial habits of Elon Musk reveal that despite his ownership of luxury vehicles and private jets, the world's richest person reportedly maintains relatively modest personal living arrangements."
};

async function testPodcastGeneration(textName, text) {
  console.log(`\n📝 测试: ${textName.toUpperCase()}`);
  console.log(`文本统计: ${text.split(' ').length} 词, ${text.length} 字符`);

  const startTime = Date.now();

  try {
    // 调用播客生成API
    const response = await fetch('https://podcast-rss-demo.tj15982183241.workers.dev/generate?style=news-anchor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customText: text,  // 如果API支持自定义文本
        style: 'news-anchor'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      const episodeId = result.data.episodeId;
      console.log(`✅ 播客生成成功: ${episodeId}`);

      // 获取详细信息
      const detailResponse = await fetch(`https://podcast-rss-demo.tj15982183241.workers.dev/episodes/${episodeId}`);
      const detailResult = await detailResponse.json();

      if (detailResult.success) {
        const data = detailResult.data;
        console.log(`📊 结果:`);
        console.log(`   - 标题: ${data.title}`);
        console.log(`   - 记录时长: ${data.duration}秒`);
        console.log(`   - 文件大小: ${data.fileSize} bytes`);

        // 检查音频文件实际大小
        if (data.audioUrl) {
          const audioResponse = await fetch(data.audioUrl, { method: 'HEAD' });
          const contentLength = audioResponse.headers.get('content-length');
          console.log(`   - 实际文件大小: ${contentLength} bytes`);

          // 估算实际时长 (假设128kbps)
          const estimatedSeconds = parseInt(contentLength) / (128 * 1024 / 8);
          console.log(`   - 估算实际时长: ${estimatedSeconds.toFixed(1)}秒`);
        }
      }
    } else {
      console.log(`❌ 播客生成失败: ${result.error}`);
    }

  } catch (error) {
    console.log(`❌ 测试失败: ${error.message}`);
  }

  const totalTime = Date.now() - startTime;
  console.log(`⏱️  总耗时: ${totalTime}ms`);
}

async function runAllTests() {
  console.log('🎤 语音长度限制测试');
  console.log('=' .repeat(60));

  for (const [name, text] of Object.entries(testTexts)) {
    await testPodcastGeneration(name, text);
    console.log('─'.repeat(60));
  }

  console.log('✅ 所有测试完成');
}

// 运行测试
runAllTests().catch(console.error);
