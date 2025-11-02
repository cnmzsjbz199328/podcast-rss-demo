// 测试Gradio客户端
import * as gradio from '@gradio/client';

console.log('Gradio module:', gradio);
console.log('Gradio exports:', Object.keys(gradio));

async function testGradio() {
  try {
    console.log('🔧 测试Gradio客户端连接...');

    if (gradio.client) {
      console.log('✅ gradio.client 方法存在');

      console.log('正在连接到IndexTTS...');
      const client = await gradio.client('Tom1986/indextts2');
      console.log('✅ 连接成功');
      console.log('Client instance:', typeof client);
      console.log('Client methods:', Object.getOwnPropertyNames(client));

    } else {
      console.log('❌ gradio.client 方法不存在');
    }

  } catch (error) {
    console.error('❌ Gradio测试失败:', error.message);
  }
}

testGradio();
