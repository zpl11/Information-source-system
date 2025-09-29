const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

// --- 请在这里配置你的路径 ---

// 1. Chrome 主程序路径
const CHROME_EXECUTABLE_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// 2. 你的用户数据目录
const USER_DATA_DIR = 'D:\\tongyiLingma\\User Data';

// 3. ‼️ 你的网络代理插件的完整路径 (请务必替换成你自己的)
const PROXY_EXTENSION_PATH = 'D:\\tongyiLingma\\User Data\\Default\\Extensions\\ncldcbhpeplkfijdhnoepdgdnmjkckij\\2.3.8_0';

// ---------------------------------

const OUTPUT_DIR = path.join(__dirname, 'articles');

(async () => {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
    console.log(`已创建文章保存目录: ${OUTPUT_DIR}`);
  }

  let browser = null;
  try {
    console.log('正在启动浏览器并加载代理插件...');
    browser = await puppeteer.launch({
      executablePath: CHROME_EXECUTABLE_PATH,
      userDataDir: USER_DATA_DIR,
      headless: false,
      defaultViewport: null,
      ignoreDefaultArgs: ["--disable-extensions"],
      args: [
        '--start-maximized',
        `--load-extension=${PROXY_EXTENSION_PATH}`
      ]
    });

    console.log('等待代理插件初始化...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const page = await browser.newPage();
    
    // 步骤 1: 抓取索引页列表 (已成功)
    const url = 'https://news.ycombinator.com/';
    console.log(`正在访问信息源: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2' });

    console.log('页面加载完成，开始提取头条新闻...');
    await page.waitForSelector('.titleline > a');
    const headlines = await page.$$eval('.titleline > a', (elements) => 
      elements.map(el => ({ title: el.innerText, link: el.href }))
    );
    fs.writeFileSync('headlines.json', JSON.stringify(headlines, null, 2));
    console.log(`新闻索引已保存到 headlines.json，共 ${headlines.length} 条。`);
    
    // ==========================================================
    // 步骤 2: 【新增部分】遍历链接列表，访问并抓取每篇文章的内容
    // ==========================================================
    console.log('--- 开始逐一抓取文章内容 ---');
    for (const [index, article] of headlines.entries()) {
      console.log(`\n[${index + 1}/${headlines.length}] 正在处理: ${article.title}`);
      
      try {
        console.log(`  -> 访问链接: ${article.link}`);
        const response = await page.goto(article.link, { waitUntil: 'networkidle2', timeout: 60000 });

        const contentType = response.headers()['content-type'];
        if (!contentType || !contentType.includes('text/html')) {
          console.log(`  -> 跳过非 HTML 内容: ${contentType}`);
          continue;
        }

        const contentSelectors = ['article', '.prose', '.post-content', '.entry-content', '.main-content', 'main', 'body'];
        let articleContent = '';
        for (const selector of contentSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 3000 });
            articleContent = await page.$eval(selector, (el) => el.innerText);
            if (articleContent && articleContent.trim().length > 150) {
                console.log(`  -> 成功使用选择器 "${selector}" 提取到内容。`);
                break;
            }
          } catch (e) { /* 选择器未找到，继续尝试下一个 */ }
        }

        if (!articleContent) {
            console.log('  -> 未能使用通用选择器找到合适的文章内容。');
            continue;
        }

        const safeTitle = article.title.replace(/[\/\\?%*:|"<>]/g, '-').substring(0, 100);
        const fileName = `${String(index + 1).padStart(2, '0')}-${safeTitle}.txt`;
        const filePath = path.join(OUTPUT_DIR, fileName);

        fs.writeFileSync(filePath, articleContent);
        console.log(`  -> 文章已保存到: ${fileName}`);

      } catch (error) {
        console.error(`  -> 处理文章 "${article.title}" 时出错: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('出现错误:', error);
  } finally {
    if (browser) {
      console.log('\n所有任务完成，浏览器将关闭。');
      await browser.close();
      console.log('浏览器已关闭。');
    }
  }
})();