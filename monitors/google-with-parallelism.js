
const puppeteer = require('puppeteer')

let browser

async function beforeEach () {
  browser = await puppeteer.launch()
}

async function monitor ({ parameters }) {
  const page = await browser.newPage()
  await page.goto(parameters.url)
  await page.waitForSelector(parameters.selector)
}

async function afterEach () {
  try {
    await browser.close()
  } catch (_) {}
}

exports.parallelism = 4
exports.slowThreshold = '30s'
exports.monitors = new Array(12).fill(0).map((NULL, i) => ({
  id: `google.com #searchform ${i}`,
  parameters: {
    url: 'https://google.com',
    selector: '#searchform',
  },

  beforeEach,
  monitor,
  afterEach,

  slowThreshold: '1s',
  timeout: '5s',
  retries: 1,
}))
