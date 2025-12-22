const { chromium } = require('playwright');

async function connect() {
  const hosts = ['10.255.255.254', '172.17.0.1', '127.0.0.1'];

  for (const host of hosts) {
    console.log('Trying ' + host + ':9222...');
    try {
      const browser = await chromium.connectOverCDP('http://' + host + ':9222', { timeout: 5000 });
      console.log('SUCCESS! Connected via ' + host);

      const contexts = browser.contexts();
      console.log('Found ' + contexts.length + ' context(s)');

      if (contexts.length > 0) {
        const pages = contexts[0].pages();
        console.log('Found ' + pages.length + ' page(s):');
        for (const page of pages) {
          console.log('  - ' + page.url());
        }
      }

      await browser.close();
      return;
    } catch (e) {
      console.log('  Failed: ' + e.message.split('\n')[0]);
    }
  }
  console.log('\nCould not connect. Chrome may not have debug port enabled.');
}

connect();
