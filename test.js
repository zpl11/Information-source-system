const puppeteer = require('puppeteer-core');
// chrom 的启动位置
const CHROME_EXECUTABLE_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
// 设置的用户信息位置
const USER_DATA_DIR = 'D:\\tongyiLingma\\User Data';
// 扩展程序的位置
const Google_FanQiang = 'D:\\tongyiLingma\\User Data\\Default\\Extensions\\ncldcbhpeplkfijdhnoepdgdnmjkckij\\2.3.8_0'; // <--- 在这里加上了分号

(async () => {
  let browser = null;
  try {
    console.log('正在启动浏览器，并开启 9222 远程调试端口...');
    
    browser = await puppeteer.launch({
      executablePath: CHROME_EXECUTABLE_PATH,
      userDataDir: USER_DATA_DIR,
      headless: false,
      defaultViewport: null,
      ignoreDefaultArgs: ["--disable-extensions"],
      args: [
        '--start-maximized',
        '--remote-debugging-port=9222', // <--- 关键：开启远程调试端口
        `--load-extension=${Google_FanQiang}`
      ] 
    });

    const wsEndpoint = browser.wsEndpoint();
    console.log(`浏览器已启动，WebSocket Endpoint: ${wsEndpoint}`);
    
    const page = await browser.newPage();
    await page.goto('https://www.baidu.com');

    console.log('页面加载完成，浏览器正由 Puppeteer 控制，并等待外部工具连接...');

  } catch (error) {
    console.error('出现错误:', error);
  }
})();