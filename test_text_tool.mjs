import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleLogs = {
    testCase1: [],
    testCase2: [],
    testCase3: [],
  };

  page.on('console', msg => {
    const text = msg.text();
    if (currentTestCase) {
      // Store all logs for potential debugging, not just finalizeText ones
      consoleLogs[currentTestCase].push(text);
    }
    // For live debugging from the run_in_bash_session output:
    // console.log(`[Browser Console (${currentTestCase || 'general'})] ${msg.type()}: ${text}`);
  });

  let currentTestCase = null;
  const INPUT_SELECTOR = '#canvasContainer > input[type="text"]';
  const CANVAS_CONTAINER_SELECTOR = '#canvasContainer'; // Added for clarity

  try {
    await page.goto('file:///app/index.html', { waitUntil: 'networkidle' });
    console.log('Page loaded.');

    async function ensureNoTextInput() {
      console.log('Ensuring no text input is present before next action...');
      // Wait for any existing input to be hidden (or not present)
      // This is important to prevent interactions with a stale input from a previous test step
      await page.waitForSelector(INPUT_SELECTOR, { state: 'hidden', timeout: 5000 })
        .catch(() => console.log('No text input was visible to become hidden, or it was already hidden/not present.'));
      console.log('No text input detected or it became hidden.');
    }

    async function activateTextToolAndClickCanvas(x, y, testName) {
      console.log(`[${testName}] Ensuring no prior text input.`);
      await ensureNoTextInput();

      console.log(`[${testName}] Clicking text tool button.`);
      await page.click('#textTool');

      console.log(`[${testName}] Clicking canvas at ${x}, ${y}.`);
      await page.locator('#drawingCanvas').click({ position: { x, y } });

      // Adding a small explicit delay to allow the app to react and create the input
      await page.waitForTimeout(250); // Adjusted from 200

      // Diagnostic check (can be removed if tests pass consistently)
      const isCanvasContainerVisible = await page.isVisible(CANVAS_CONTAINER_SELECTOR);
      console.log(`[${testName}] Is ${CANVAS_CONTAINER_SELECTOR} visible? ${isCanvasContainerVisible}`);
      const inputExists = await page.locator(INPUT_SELECTOR).count();
      console.log(`[${testName}] Does input element exist (${INPUT_SELECTOR}) after click & delay? ${inputExists > 0 ? 'Yes' : 'No (' + inputExists + ' found)' }`);
      if (inputExists === 0) {
          const canvasContainerHTML = await page.innerHTML(CANVAS_CONTAINER_SELECTOR);
          console.log(`[${testName}] ${CANVAS_CONTAINER_SELECTOR} HTML: ${canvasContainerHTML}`);
      }


      console.log(`[${testName}] Waiting for text input to be visible using selector: ${INPUT_SELECTOR}`);
      await page.waitForSelector(INPUT_SELECTOR, { state: 'visible', timeout: 10000 });
      console.log(`[${testName}] Text input is visible.`);
    }

    // Test Case 1: Empty Text
    currentTestCase = 'testCase1';
    console.log('Starting Test Case 1: Empty Text');
    await activateTextToolAndClickCanvas(50, 50, 'Test Case 1');
    console.log('[Test Case 1] Input located. Pressing Enter.');
    await page.locator(INPUT_SELECTOR).press('Enter');
    await page.waitForTimeout(500); // Wait for finalizeText logs
    console.log('Finished Test Case 1');

    // Test Case 2: Single Character
    currentTestCase = 'testCase2';
    console.log('Starting Test Case 2: Single Character "a"');
    await activateTextToolAndClickCanvas(100, 100, 'Test Case 2');
    console.log('[Test Case 2] Input located. Typing "a".');
    await page.locator(INPUT_SELECTOR).type('a');
    console.log('[Test Case 2] Pressing Enter.');
    await page.locator(INPUT_SELECTOR).press('Enter');
    await page.waitForTimeout(500);
    console.log('Finished Test Case 2');

    // Test Case 3: Whitespace Only
    currentTestCase = 'testCase3';
    console.log('Starting Test Case 3: Whitespace Only "   "');
    await activateTextToolAndClickCanvas(150, 150, 'Test Case 3');
    console.log('[Test Case 3] Input located. Typing "   ".');
    await page.locator(INPUT_SELECTOR).type('   '); // Three spaces
    console.log('[Test Case 3] Pressing Enter.');
    await page.locator(INPUT_SELECTOR).press('Enter');
    await page.waitForTimeout(500);
    console.log('Finished Test Case 3');

  } catch (error) {
    console.error(`Error during Playwright test (${currentTestCase || 'setup'}):`, error.name, error.message);
    if (error.stack) {
        console.error(error.stack);
    }
  } finally {
    await browser.close();
    console.log('Playwright browser closed.');

    console.log('\n--- Collected Browser Console Logs ---');
    for (const tc of ['testCase1', 'testCase2', 'testCase3']) {
        console.log(`\nLogs for ${tc}:`);
        const logs = consoleLogs[tc] || [];
        if (logs.length === 0) {
            console.log('(No logs captured)');
        } else {
            logs.forEach(log => console.log(log));
        }
    }
    console.log('--- End of Collected Console Logs ---');
  }
})();
