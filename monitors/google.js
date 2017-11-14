
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

exports.slowThreshold = '30s'
exports.monitors = [
  {
    id: 'google.com #searchform',
    parameters: {
      url: 'https://google.com',
      selector: '#searchform',
    },

    beforeEach,
    monitor,
    afterEach,

    slowThreshold: '5s',
    timeout: '30s',
    retries: 1,
  },
]
