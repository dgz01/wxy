// MCP 自动上传脚本 (Node.js)
// 用法：node mcp_upload.js
// 如需 AI 生成 commit message，请配置 OPENAI_API_KEY 环境变量

const { execSync } = require('child_process');
const https = require('https');

// 配置区
const BRANCH = 'main'; // 如需推送到其他分支请修改
const USE_AI = false;   // 是否启用 AI 生成 commit message (true/false)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// 获取 git 变更状态
function hasChanges() {
  const status = execSync('git status --porcelain').toString();
  return status.trim().length > 0;
}

// AI 生成 commit message（以 OpenAI GPT-3/4 API 为例）
async function generateCommitMessage() {
  if (!OPENAI_API_KEY) return `AI自动提交：${new Date().toLocaleString()}`;
  const prompt = '请为以下 git 变更生成简洁的中文提交说明：\n' + execSync('git diff --cached').toString();
  const data = JSON.stringify({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 60,
    temperature: 0.7
  });
  const options = {
    hostname: 'api.openai.com',
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    }
  };
  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          const msg = result.choices?.[0]?.message?.content?.trim();
          resolve(msg || `AI自动提交：${new Date().toLocaleString()}`);
        } catch {
          resolve(`AI自动提交：${new Date().toLocaleString()}`);
        }
      });
    });
    req.on('error', () => resolve(`AI自动提交：${new Date().toLocaleString()}`));
    req.write(data);
    req.end();
  });
}

async function main() {
  if (!hasChanges()) {
    console.log('没有检测到本地变更，无需上传。');
    return;
  }
  try {
    execSync('git add .');
    let message = `AI自动提交：${new Date().toLocaleString()}`;
    if (USE_AI) {
      message = await generateCommitMessage();
    }
    execSync(`git commit -m "${message}"`);
    execSync(`git push origin ${BRANCH}`);
    console.log('变更已成功上传到服务器。');
  } catch (e) {
    console.error('上传失败：', e.message);
  }
}

main(); 