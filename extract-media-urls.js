const { chromium } = require('playwright');
const fs = require('fs');

// Extract GHL Media URLs by finding image src attributes

(async () => {
  console.log('📤 GHL Media URL Extractor');
  console.log('='.repeat(50));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 400
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(45000);

  const imageUrls = {
    owl: null,
    apply: null,
    equal: null
  };

  try {
    // ===== LOGIN =====
    console.log('📍 Step 1: Logging into GHL...');
    await page.goto('https://app.gohighlevel.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const googleIframe = await page.$('#g_id_signin iframe');
    if (googleIframe) {
      const frame = await googleIframe.contentFrame();
      if (frame) {
        await frame.click('div[role="button"]');
        console.log('   ✓ Clicked Google sign-in');
      }
    }
    await page.waitForTimeout(3000);

    const allPages = context.pages();
    const googlePage = allPages.find(p => p.url().includes('accounts.google.com'));

    if (googlePage) {
      console.log('   Entering credentials...');
      await googlePage.waitForLoadState('domcontentloaded');
      await googlePage.fill('input[type="email"]', 'david@lendwisemtg.com');
      await googlePage.keyboard.press('Enter');
      await googlePage.waitForTimeout(3000);

      await googlePage.waitForSelector('input[type="password"]:visible', { timeout: 15000 });
      await googlePage.fill('input[type="password"]:visible', 'Fafa2185!');
      await googlePage.keyboard.press('Enter');
      await page.waitForTimeout(10000);
    }

    console.log('✅ Logged in!\n');

    // ===== SWITCH TO SUB-ACCOUNT =====
    console.log('📍 Step 2: Switching to Lendwise Mortgage...');
    const switcher = page.locator('text=Click here to switch');
    if (await switcher.isVisible({ timeout: 5000 }).catch(() => false)) {
      await switcher.click();
      await page.waitForTimeout(2000);
      const lendwise = page.locator('text=LENDWISE MORTGA').first();
      if (await lendwise.isVisible({ timeout: 5000 }).catch(() => false)) {
        await lendwise.click();
        await page.waitForTimeout(5000);
      }
    }
    console.log('✅ In sub-account!\n');

    // ===== GO TO MEDIA STORAGE =====
    console.log('📍 Step 3: Going to Media Storage...');
    await page.goto('https://app.gohighlevel.com/v2/location/e6yMsslzphNw8bgqRgtV/media-library', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/media-page.png' });

    // ===== EXTRACT IMAGE URLs FROM DOM =====
    console.log('📍 Step 4: Extracting image URLs from page...');

    // Get all image elements on the page
    const images = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img');
      const results = [];
      imgs.forEach(img => {
        if (img.src && img.src.includes('msgsndr.com')) {
          results.push({
            src: img.src,
            alt: img.alt || '',
            title: img.title || ''
          });
        }
      });
      return results;
    });

    console.log(`   Found ${images.length} GHL-hosted images:`);
    images.forEach((img, i) => {
      console.log(`   ${i + 1}. ${img.alt || 'No alt'}: ${img.src.substring(0, 80)}...`);
    });

    // Match images to our files
    for (const img of images) {
      const srcLower = img.src.toLowerCase();
      const altLower = (img.alt || '').toLowerCase();

      if (srcLower.includes('owl') || altLower.includes('owl')) {
        imageUrls.owl = img.src;
        console.log(`   ✓ Found owl logo`);
      } else if (srcLower.includes('apply') || altLower.includes('apply')) {
        imageUrls.apply = img.src;
        console.log(`   ✓ Found apply button`);
      } else if (srcLower.includes('equal') || srcLower.includes('housing') || altLower.includes('equal')) {
        imageUrls.equal = img.src;
        console.log(`   ✓ Found equal housing`);
      }
    }

    // If not found by name, try clicking thumbnails
    if (!imageUrls.owl || !imageUrls.apply || !imageUrls.equal) {
      console.log('\n📍 Step 5: Clicking thumbnails to get URLs...');

      // Get all media card elements
      const cards = await page.$$('[class*="media-card"], [class*="MediaCard"], .n-card');
      console.log(`   Found ${cards.length} media cards`);

      for (let i = 0; i < Math.min(cards.length, 5); i++) {
        try {
          await cards[i].click();
          await page.waitForTimeout(2000);

          // Take screenshot of details panel
          await page.screenshot({ path: `/mnt/c/Users/dyoun/ghl-automation/screenshots/media-detail-${i}.png` });

          // Try to find URL input or text
          const urlText = await page.evaluate(() => {
            // Look for input with URL
            const inputs = document.querySelectorAll('input[readonly], input[type="text"]');
            for (const input of inputs) {
              if (input.value && input.value.includes('msgsndr.com')) {
                return input.value;
              }
            }
            // Look for any text containing the URL
            const allText = document.body.innerText;
            const match = allText.match(/https:\/\/[^\s]*msgsndr\.com[^\s]*/);
            return match ? match[0] : null;
          });

          if (urlText) {
            console.log(`   Card ${i}: ${urlText.substring(0, 60)}...`);

            // Determine which image this is
            if (urlText.includes('owl')) imageUrls.owl = urlText;
            else if (urlText.includes('apply')) imageUrls.apply = urlText;
            else if (urlText.includes('equal') || urlText.includes('housing')) imageUrls.equal = urlText;
            else {
              // Assign to first empty slot
              if (!imageUrls.owl) imageUrls.owl = urlText;
              else if (!imageUrls.apply) imageUrls.apply = urlText;
              else if (!imageUrls.equal) imageUrls.equal = urlText;
            }
          }

          // Close details panel
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
        } catch (e) {
          console.log(`   Card ${i} error: ${e.message}`);
        }
      }
    }

    // ===== OUTPUT RESULTS =====
    console.log('\n' + '='.repeat(50));
    console.log('📋 IMAGE URLs FOUND:');
    console.log('='.repeat(50));
    console.log(`Owl Logo:      ${imageUrls.owl || 'NOT FOUND'}`);
    console.log(`Apply Button:  ${imageUrls.apply || 'NOT FOUND'}`);
    console.log(`Equal Housing: ${imageUrls.equal || 'NOT FOUND'}`);
    console.log('='.repeat(50));

    // Save URLs to file
    fs.writeFileSync('/mnt/c/Users/dyoun/ghl-automation/ghl-image-urls.json', JSON.stringify(imageUrls, null, 2));
    console.log('\n✅ URLs saved to ghl-image-urls.json');

    // If we have at least the owl URL, generate the signature
    if (imageUrls.owl || imageUrls.apply || imageUrls.equal) {
      console.log('\n📍 Generating updated signature HTML...');
      generateSignature(imageUrls);
    }

    console.log('\nBrowser will stay open for 5 minutes for manual URL copying.');
    console.log('Click an image → Right panel shows URL → Click "Copy" button');

    await page.waitForTimeout(300000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: '/mnt/c/Users/dyoun/ghl-automation/screenshots/extract-error.png' });
    await page.waitForTimeout(60000);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();

function generateSignature(urls) {
  // Use GHL URLs if available, otherwise fall back to GitHub (which doesn't work)
  const owlUrl = urls.owl || 'https://raw.githubusercontent.com/DYoung-cpu/Lendwise---Signature-Assets/main/logos/static-template-owl-optimized.gif';
  const applyUrl = urls.apply || 'https://raw.githubusercontent.com/DYoung-cpu/Lendwise---Signature-Assets/main/buttons/apply-now-button.png';
  const equalUrl = urls.equal || 'https://raw.githubusercontent.com/DYoung-cpu/Lendwise---Signature-Assets/main/icons/equal-housing-logo.png';

  const signature = `<table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, sans-serif; max-width: 600px;">
  <tr>
    <td style="padding: 20px; background: linear-gradient(135deg, #1a3a2a 0%, #0d1f17 100%); border-radius: 12px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <!-- Logo and Name Row -->
        <tr>
          <td width="120" style="vertical-align: top; padding-right: 20px;">
            <img src="${owlUrl}" alt="LendWise Mortgage" width="100" height="100" style="border-radius: 8px; border: 2px solid #c9a227;">
          </td>
          <td style="vertical-align: top;">
            <p style="margin: 0 0 5px 0; font-size: 22px; font-weight: bold; color: #c9a227;">David Young</p>
            <p style="margin: 0 0 3px 0; font-size: 14px; color: #ffffff;">Mortgage Loan Originator</p>
            <p style="margin: 0 0 10px 0; font-size: 12px; color: #888888;">NMLS #2108837</p>

            <!-- Contact Info -->
            <p style="margin: 0 0 5px 0;">
              <a href="tel:+13109547772" style="color: #c9a227; text-decoration: none; font-size: 14px;">📞 (310) 954-7772</a>
            </p>
            <p style="margin: 0 0 5px 0;">
              <a href="mailto:david@lendwisemtg.com" style="color: #c9a227; text-decoration: none; font-size: 14px;">✉️ david@lendwisemtg.com</a>
            </p>
            <p style="margin: 0 0 10px 0;">
              <a href="https://www.lendwisemtg.com" style="color: #c9a227; text-decoration: none; font-size: 14px;">🌐 www.lendwisemtg.com</a>
            </p>
          </td>
        </tr>

        <!-- Buttons Row -->
        <tr>
          <td colspan="2" style="padding-top: 15px;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding-right: 10px;">
                  <a href="https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ3XZSjJXeqh9_1JUyJgklH4RfTRwNqKjFTpBGPvqmkvxxGQo8x4iKR01CGGN_S7L6WVQUe-KIm6" style="text-decoration: none;">
                    <span style="display: inline-block; padding: 10px 20px; background-color: #c9a227; color: #1a3a2a; font-weight: bold; border-radius: 5px; font-size: 14px;">📅 Schedule a Call</span>
                  </a>
                </td>
                <td>
                  <a href="https://lendwisemtg.com/apply" style="text-decoration: none;">
                    <img src="${applyUrl}" alt="Apply Now" height="38" style="border-radius: 5px;">
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Social Icons Row -->
        <tr>
          <td colspan="2" style="padding-top: 15px;">
            <a href="https://www.facebook.com/lendwisemtg" style="text-decoration: none; margin-right: 10px;">
              <img src="https://cdn-icons-png.flaticon.com/24/733/733547.png" alt="Facebook" width="24" height="24">
            </a>
            <a href="https://www.instagram.com/lendwisemortgage" style="text-decoration: none; margin-right: 10px;">
              <img src="https://cdn-icons-png.flaticon.com/24/2111/2111463.png" alt="Instagram" width="24" height="24">
            </a>
            <a href="https://www.tiktok.com/@lendwisemortgage" style="text-decoration: none; margin-right: 10px;">
              <img src="https://cdn-icons-png.flaticon.com/24/3046/3046121.png" alt="TikTok" width="24" height="24">
            </a>
            <a href="https://www.linkedin.com/company/lendwise-mortgage" style="text-decoration: none; margin-right: 10px;">
              <img src="https://cdn-icons-png.flaticon.com/24/733/733561.png" alt="LinkedIn" width="24" height="24">
            </a>
            <a href="https://g.page/r/CZR7vPqH2pLHEAE/review" style="text-decoration: none;">
              <img src="https://cdn-icons-png.flaticon.com/24/2991/2991148.png" alt="Google" width="24" height="24">
            </a>
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td colspan="2" style="padding-top: 15px;">
            <hr style="border: none; border-top: 1px solid #c9a227; margin: 0;">
          </td>
        </tr>

        <!-- Disclosures Row -->
        <tr>
          <td colspan="2" style="padding-top: 10px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="vertical-align: top; padding-right: 10px;">
                  <img src="${equalUrl}" alt="Equal Housing Opportunity" width="50" height="50">
                </td>
                <td style="vertical-align: top;">
                  <p style="margin: 0; font-size: 9px; color: #888888; line-height: 1.4;">
                    <strong>LendWise Mortgage</strong> | NMLS #2544447<br>
                    2701 Ocean Park Blvd Suite 140, Santa Monica, CA 90405<br><br>
                    This is not a commitment to lend. Programs, rates, terms and conditions subject to change without notice.
                    All loans subject to credit approval. Equal Housing Opportunity.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

  fs.writeFileSync('/mnt/c/Users/dyoun/ghl-automation/templates/email-signature-ghl.html', signature);
  console.log('✅ Signature saved to templates/email-signature-ghl.html');
}
