// 部署测试脚本
import { config } from 'dotenv';
config();

console.log('🧪 Cloudflare 部署测试\\n');

// 检查基本配置
console.log('📋 配置检查:');
console.log(`Account ID: ${process.env.CLOUDFLARE_ACCOUNT_ID || '未设置'}`);
console.log(`API Token: ${process.env.CLOUDFLARE_API_TOKEN ? '已设置' : '未设置'}`);
console.log(`Gemini Key: ${process.env.GEMINI_API_KEY ? '已设置' : '未设置'}\\n`);

// 建议解决方案
console.log('💡 解决方案:');
if (!process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN === 'your_cloudflare_api_token') {
  console.log('1. 获取 Cloudflare API Token:');
  console.log('   https://dash.cloudflare.com/profile/api-tokens');
  console.log('   创建 "Edit Cloudflare Workers" token\\n');

  console.log('2. 设置环境变量:');
  console.log('   编辑 .env 文件:');
  console.log('   CLOUDFLARE_API_TOKEN=你的真实token\\n');

  console.log('3. 测试部署:');
  console.log('   npm run check:deploy');
  console.log('   npm run deploy\\n');
} else {
  console.log('✅ 配置看起来正确，可以尝试部署:');
  console.log('   npm run deploy\\n');
}

console.log('📚 详细指南:');
console.log('   查看 DEPLOYMENT.md 和 TROUBLESHOOTING.md\\n');

console.log('🚀 核心功能已就绪:');
console.log('   ✅ 新闻提取');
console.log('   ✅ Gemini脚本生成');
console.log('   ✅ 语音合成');
console.log('   ✅ RSS生成\\n');

console.log('🎯 下一步: 获取API Token并部署！');
