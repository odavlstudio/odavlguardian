const { detectIntent, _extractSignals, _classifyFromSignals } = require('../src/guardian/intent-detector');
const { GuardianBrowser } = require('../src/guardian/browser');

async function analyzeHTML(html) {
  const browser = new GuardianBrowser();
  await browser.launch(10000, { headless: true });
  await browser.page.setContent(html);
  const signals = await _extractSignals(browser.page);
  const { intent, confidence } = _classifyFromSignals(signals);
  await browser.context.close();
  await browser.browser.close();
  return { intent, confidence, signals };
}

async function run() {
  console.log('intent-detector.unit.test: start');

  const saasHTML = `
    <a href="/pricing">Pricing</a>
    <button>Sign up</button>
    <form><input type="email" /></form>
  `;
  const shopHTML = `
    <a href="/shop">Shop</a>
    <a href="/cart">Cart</a>
    <button>Add to cart</button>
    <button>Checkout</button>
  `;
  const landingHTML = `
    <a href="/contact">Contact</a>
    <form><input name="name" /><textarea name="message"></textarea></form>
  `;

  const saasRes = await analyzeHTML(saasHTML);
  if (saasRes.intent !== 'saas') throw new Error('SAAS intent misclassified: ' + JSON.stringify(saasRes));
  if (saasRes.confidence < 20) throw new Error('SAAS confidence too low: ' + saasRes.confidence);

  const shopRes = await analyzeHTML(shopHTML);
  if (shopRes.intent !== 'shop') throw new Error('SHOP intent misclassified: ' + JSON.stringify(shopRes));
  if (shopRes.confidence < 20) throw new Error('SHOP confidence too low: ' + shopRes.confidence);

  const landingRes = await analyzeHTML(landingHTML);
  if (landingRes.intent !== 'landing') throw new Error('LANDING intent misclassified: ' + JSON.stringify(landingRes));
  if (landingRes.confidence < 20) throw new Error('LANDING confidence too low: ' + landingRes.confidence);

  console.log('intent-detector.unit.test: PASS');
}

run().catch(err => { console.error(err); process.exit(1); });
