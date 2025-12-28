/**
 * Phase B: Recipe Runtime Integration Test
 * 
 * End-to-end test with local HTML site, 3-step recipe, and deterministic failure.
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { addRecipe, getRecipe } = require('./src/recipes/recipe-store');
const { executeRecipeRuntime } = require('./src/recipes/recipe-runtime');
const { analyzeRecipeFailure } = require('./src/recipes/recipe-failure-analysis');

// Determine port
const port = 9876;
const baseUrl = `http://127.0.0.1:${port}`;

// Create test recipe
const testRecipe = {
  id: 'test-contact-form-runtime',
  name: 'Test Contact Form',
  platform: 'landing',
  version: '1.0.0',
  intent: 'Submit a contact form to verify lead capture',
  steps: [
    'Navigate to the homepage',
    "Click on 'Contact' button",
    "Fill email with 'test@example.com'"
  ],
  expectedGoal: 'success'
};

// Create test server
const server = http.createServer((req, res) => {
  const url = new URL(req.url, baseUrl);
  const pathname = url.pathname;

  if (pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head><title>Test Site</title></head>
        <body>
          <h1>Welcome</h1>
          <button id="contact-btn" class="contact-button">Contact</button>
          <div id="contact-form" style="display:none;">
            <form>
              <input type="email" name="email" placeholder="Email">
              <input type="submit" value="Submit">
            </form>
          </div>
          <div id="success" style="display:none;">
            <p>Form submitted successfully! Success!</p>
          </div>
          <script>
            document.getElementById('contact-btn').addEventListener('click', () => {
              document.getElementById('contact-form').style.display = 'block';
            });
            document.querySelector('input[type="submit"]').addEventListener('click', (e) => {
              e.preventDefault();
              document.getElementById('success').style.display = 'block';
            });
          </script>
        </body>
      </html>
    `);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

async function runTest() {
  server.listen(port, async () => {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🧪 Recipe Runtime Integration Test');
    console.log('═══════════════════════════════════════════════════════════\n');

    try {
      // Test 1: Successful recipe execution
      console.log('Test 1: Execute recipe successfully');
      console.log(`  Target: ${baseUrl}`);
      console.log(`  Recipe: ${testRecipe.name}\n`);

      // Add test recipe to store
      try {
        addRecipe(testRecipe);
      } catch (err) {
        if (!err.message.includes('already exists')) throw err;
        // Recipe already exists
      }

      const result = await executeRecipeRuntime(testRecipe.id, baseUrl, { 
        timeout: 10000,
        headless: true 
      });

      console.log(`  Steps executed: ${result.steps.length}`);
      console.log(`  Success: ${result.success}`);
      console.log(`  Duration: ${result.duration}s`);

      if (result.success) {
        console.log('  ✓ Recipe executed successfully\n');
      } else {
        console.log(`  ✗ Recipe failed: ${result.failureReason}\n`);
        
        // Analyze failure
        const analysis = analyzeRecipeFailure(result);
        if (analysis) {
          console.log(`  Failure Type: ${analysis.failureType}`);
          console.log(`  Severity: ${analysis.severity}`);
          console.log(`  Progress: ${analysis.stepProgress.completed}/${analysis.stepProgress.total}\n`);
        }
      }

      // Test 2: Recipe with broken step (missing element)
      console.log('Test 2: Execute recipe with broken step');
      const brokenRecipe = {
        id: 'test-broken-recipe',
        name: 'Broken Recipe',
        platform: 'landing',
        version: '1.0.0',
        intent: 'Test broken step',
        steps: [
          'Navigate to homepage',
          "Click on 'NonExistent' button"
        ],
        expectedGoal: 'success'
      };

      try {
        addRecipe(brokenRecipe);
      } catch (err) {
        if (!err.message.includes('already exists')) throw err;
      }

      const brokenResult = await executeRecipeRuntime(brokenRecipe.id, baseUrl, {
        timeout: 5000,
        headless: true
      });

      console.log(`  Steps attempted: ${brokenResult.steps.length}`);
      console.log(`  Success: ${brokenResult.success}`);
      console.log(`  Failed step: ${brokenResult.failedStep}`);
      console.log(`  Reason: ${brokenResult.failureReason}`);

      if (!brokenResult.success && brokenResult.failedStep) {
        console.log('  ✓ Recipe correctly failed on missing element\n');

        const brokenAnalysis = analyzeRecipeFailure(brokenResult);
        assert.strictEqual(brokenAnalysis.failureType, 'ELEMENT_NOT_FOUND');
        console.log(`  Detected as: ${brokenAnalysis.failureType}\n`);
      } else {
        console.log('  ✗ Recipe should have failed\n');
      }

      // Test 3: Verify failure does not affect next recipe
      console.log('Test 3: Execute second recipe after failure');
      const secondRecipe = {
        id: 'test-second-recipe',
        name: 'Second Recipe',
        platform: 'landing',
        version: '1.0.0',
        intent: 'Verify no cross-contamination',
        steps: [
          'Navigate to homepage'
        ],
        expectedGoal: 'success'
      };

      try {
        addRecipe(secondRecipe);
      } catch (err) {
        if (!err.message.includes('already exists')) throw err;
      }

      const secondResult = await executeRecipeRuntime(secondRecipe.id, baseUrl, {
        timeout: 5000,
        headless: true
      });

      console.log(`  Success: ${secondResult.success}`);
      if (secondResult.success) {
        console.log('  ✓ Second recipe executed independently\n');
      } else {
        console.log(`  ✗ Second recipe failed: ${secondResult.failureReason}\n`);
      }

      console.log('═══════════════════════════════════════════════════════════');
      console.log('✅ Integration test completed!');
      console.log('═══════════════════════════════════════════════════════════\n');

      server.close();
      process.exit(0);
    } catch (err) {
      console.error('\n❌ Test failed:', err.message);
      console.error(err.stack);
      server.close();
      process.exit(1);
    }
  });
}

const assert = require('assert');
runTest();
