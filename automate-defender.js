const { chromium } = require('playwright');

(async () => {
  console.log("Launching Microsoft Edge/Chrome via Playwright...");
  const browser = await chromium.launch({ headless: false, channel: 'msedge' });
  // Create context with no timeouts
  const context = await browser.newContext();
  context.setDefaultTimeout(0);
  
  const page = await context.newPage();
  page.setDefaultTimeout(0);

  console.log("Navigating to Microsoft Defender Vulnerability Management...");
  // Do not wait for 'load', just 'commit' to avoid timeout on SPA
  await page.goto('https://security.microsoft.com/vulnerabilities/devices', { waitUntil: 'domcontentloaded' });

  console.log(">>> PLEASE LOG IN AND COMPLETE MFA <<<");
  console.log("Waiting for the Vulnerabilities page to load completely...");

  // Just wait for the text to appear anywhere on the page, avoiding strict URL matching that breaks on SPA auth flows
  await page.waitForSelector('text=Vulnerabilities in my organization', { state: 'visible', timeout: 0 });
  console.log("Login successful! Table detected.");

  // Wait an extra 5 seconds for the virtualized list to settle
  await page.waitForTimeout(5000);

  let processedCount = 0;
  
  while (true) {
    const rows = await page.getByRole('row').filter({ hasText: 'CVE-' }).all();
    
    if (processedCount >= rows.length) {
      console.log("Scrolling to load more CVEs...");
      await page.mouse.wheel(0, 1500);
      await page.waitForTimeout(3000); 
      
      const newRows = await page.getByRole('row').filter({ hasText: 'CVE-' }).all();
      if (processedCount >= newRows.length) {
        console.log(`Finished processing all visible rows. Total processed: ${processedCount}`);
        break;
      }
    }

    try {
      console.log(`Processing CVE #${processedCount + 1}...`);
      const row = page.getByRole('row').filter({ hasText: 'CVE-' }).nth(processedCount);
      await row.click();
      
      const mitigationBtn = page.getByRole('button', { name: /Exception options|Mitigation options/i }).first();
      await mitigationBtn.waitFor({ state: 'visible', timeout: 15000 });
      await mitigationBtn.click();
      
      const exceptionRadio = page.getByRole('radio', { name: /Exception/i });
      await exceptionRadio.waitFor({ state: 'visible', timeout: 15000 });
      await exceptionRadio.click();
      
      const justificationDropdown = page.getByRole('combobox', { name: /Justification/i }).first();
      await justificationDropdown.click();
      const acceptedRiskOption = page.getByRole('option', { name: /Accepted risk/i });
      await acceptedRiskOption.click();
      
      const durationDropdown = page.getByRole('combobox', { name: /Duration/i }).first();
      await durationDropdown.click();
      const oneYearOption = page.getByRole('option', { name: /1 year/i });
      await oneYearOption.click();
      
      const submitBtn = page.getByRole('button', { name: /Submit/i });
      await submitBtn.click();
      
      await page.waitForTimeout(2000); 
      
      const closeBtn = page.getByRole('button', { name: /Close/i }).first();
      if (await closeBtn.isVisible()) {
          await closeBtn.click();
      } else {
          await page.keyboard.press('Escape');
      }
      
      await page.waitForTimeout(1000); 
      console.log(`Successfully applied 1-year exception to CVE #${processedCount + 1}`);

    } catch (err) {
      console.log(`Error processing row #${processedCount + 1}. Attempting to recover. Error: ${err.message}`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    }

    processedCount++;
  }

  console.log("Automation bot has completed its run!");
  await browser.close();
})();
