const { chromium } = require('playwright');
const fs = require('fs');

// Storage for recorded actions
const recording = {
  startTime: new Date().toISOString(),
  actions: [],
  screenshots: []
};

async function main() {
  console.log('========================================');
  console.log('  GHL ACTION RECORDER');
  console.log('========================================');
  console.log('');
  console.log('Instructions:');
  console.log('1. Login to GHL manually');
  console.log('2. Navigate to Automation > Workflows');
  console.log('3. Click through the workflow builder');
  console.log('4. I will record every click position');
  console.log('5. Press Ctrl+C when done');
  console.log('');
  console.log('Recording will be saved to: ghl-recording.json');
  console.log('========================================');
  console.log('');

  const browser = await chromium.launch({ 
    headless: false,
    args: ['--start-maximized']
  });
  
  const context = await browser.newContext({ 
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  let clickCount = 0;
  
  // Track all mouse clicks
  await page.exposeFunction('recordClick', async (x, y, target) => {
    clickCount++;
    const action = {
      id: clickCount,
      type: 'click',
      x: x,
      y: y,
      target: target,
      url: page.url(),
      timestamp: new Date().toISOString()
    };
    recording.actions.push(action);
    console.log('[CLICK #' + clickCount + '] (' + x + ', ' + y + ') on "' + target.substring(0,40) + '" - ' + page.url().split('/').pop());
  });
  
  // Inject click listener into every page
  await page.addInitScript(`
    document.addEventListener('click', (e) => {
      const target = e.target.innerText || e.target.placeholder || e.target.tagName;
      window.recordClick(e.clientX, e.clientY, target || 'unknown');
    }, true);
  `);
  
  // Track navigation
  page.on('framenavigated', async (frame) => {
    if (frame === page.mainFrame()) {
      const url = frame.url();
      recording.actions.push({
        type: 'navigation',
        url: url,
        timestamp: new Date().toISOString()
      });
      console.log('[NAV] ' + url);
      
      // Re-inject click listener after navigation
      try {
        await page.addInitScript(`
          document.addEventListener('click', (e) => {
            const target = e.target.innerText || e.target.placeholder || e.target.tagName;
            window.recordClick(e.clientX, e.clientY, target || 'unknown');
          }, true);
        `);
      } catch(e) {}
    }
  });
  
  // Go to GHL
  console.log('Opening GHL login page...');
  await page.goto('https://app.gohighlevel.com/');
  
  // Keep running until user closes
  console.log('');
  console.log('>>> Browser is ready. Start clicking! <<<');
  console.log('>>> Press Ctrl+C in terminal when done <<<');
  console.log('');
  
  // Save recording on exit
  process.on('SIGINT', async () => {
    console.log('');
    console.log('========================================');
    console.log('RECORDING COMPLETE');
    console.log('========================================');
    console.log('Total clicks recorded: ' + recording.actions.filter(a => a.type === 'click').length);
    
    // Save auth state
    try {
      await context.storageState({ path: 'ghl-auth.json' });
      console.log('Auth state saved to ghl-auth.json');
    } catch(e) {}
    
    // Save recording
    recording.endTime = new Date().toISOString();
    fs.writeFileSync('ghl-recording.json', JSON.stringify(recording, null, 2));
    console.log('Recording saved to ghl-recording.json');
    
    // Generate readable summary
    let summary = '# GHL Click Recording\n\n';
    summary += 'Recorded: ' + recording.startTime + '\n\n';
    summary += '## Recorded Actions\n\n';
    summary += '| # | Type | Position | Target | URL |\n';
    summary += '|---|------|----------|--------|-----|\n';
    recording.actions.forEach((a, i) => {
      if (a.type === 'click') {
        summary += '| ' + a.id + ' | click | (' + a.x + ', ' + a.y + ') | ' + (a.target || '').substring(0,30) + ' | ' + (a.url || '').split('/').pop() + ' |\n';
      } else {
        summary += '| - | nav | - | - | ' + (a.url || '').substring(0,50) + ' |\n';
      }
    });

    fs.writeFileSync('ghl-recording.md', summary);
    console.log('Summary saved to ghl-recording.md');
    
    await browser.close();
    process.exit(0);
  });
  
  // Keep alive
  await new Promise(() => {});
}

main().catch(console.error);
