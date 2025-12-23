#!/usr/bin/env node

/**
 * Start the Guardian test fixture server
 * Usage: node test/start-fixture.js [port]
 */

const { startFixtureServer } = require('./fixture-server');

async function main() {
  const port = process.argv[2] ? parseInt(process.argv[2], 10) : 3000;

  try {
    const fixture = await startFixtureServer(port);

    console.log(`\n🛡️  Guardian Test Fixture Server`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`\n📍 Running at: ${fixture.baseUrl}`);
    console.log(`\nAvailable modes:`);
    console.log(`  • OK mode (success): ${fixture.baseUrl}?mode=ok`);
    console.log(`  • Fail mode: ${fixture.baseUrl}?mode=fail`);
    console.log(`  • Friction mode: ${fixture.baseUrl}?mode=friction`);
    console.log(`\nTest attempt with:`);
    console.log(`  npx guardian attempt --url "${fixture.baseUrl}" --attempt contact_form`);
    console.log(`  npx guardian attempt --url "${fixture.baseUrl}?mode=fail" --attempt contact_form`);
    console.log(`  npx guardian attempt --url "${fixture.baseUrl}?mode=friction" --attempt contact_form`);
    console.log(`\n⏹️  Press Ctrl+C to stop`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // Keep server running
    process.on('SIGINT', async () => {
      console.log('\n\n👋 Shutting down...');
      await fixture.close();
      process.exit(0);
    });
  } catch (err) {
    console.error('Error starting fixture server:', err);
    process.exit(1);
  }
}

main();
