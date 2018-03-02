
const debug = require('debug')('dsc-monitor:helpers:monitor-browser-selector')
const puppeteer = require('puppeteer')
const mkdirp = require('mkdirp')

const onPageRequestDisableAnalytics = require('./on-page-request-disable-analytics')

const screenshotsDir = '.artifacts/screenshots'
const tracingsDir = '.artifacts/tracings'
mkdirp.sync(screenshotsDir)
mkdirp.sync(tracingsDir)

module.exports = (exports, routes, {
  disableAnalytics,
  shards,
  shardIndex,
  slowThreshold,
}) => {
  let browser
  let page
  let tracingFilename
  const monitors = exports.monitors = []
  exports.slowThreshold = slowThreshold || '1m'

  routes.filter((route, i) => {
    if (!shards || typeof shardIndex !== 'number') return true
    return (i % shards) === shardIndex
  }).forEach(({ url, selector }) => {
    monitors.push({
      id: `${url} ${selector}`,
      parameters: {
        url,
        selector,
      },

      beforeEach,
      monitor,
      afterEach,

      slowThreshold: '3s',
      timeout: '15s',
      retries: 1,
    })
  })

  async function beforeEach ({ parameters }) {
    tracingFilename = `${tracingsDir}/${Math.random().toString(36).slice(2)}.json`
    debug('launched browser')
    browser = await puppeteer.launch({
      headless: process.env.CHROME_HEADLESS !== '0',
      executablePath: process.env.CHROME_EXECUTABLE_PATH || null,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    })
    debug('parameters: %o', parameters)
    page = await browser.newPage()
    debug('new page')
    await page.tracing.start({
      path: tracingFilename,
    })
    debug('create tracings')
    await page.setViewport({
      width: 1280,
      height: 800,
    })
    debug('set viewport')
    if (disableAnalytics !== false) {
      await page.setRequestInterception(true)
      page.on('request', onPageRequestDisableAnalytics)
      debug('intercept requests')
    }
  }

  async function afterEach (monitorConfig, monitorSetConfig, {
    attempt,
    log,
  }) {
    const screenshotFilename = `${screenshotsDir}/${Math.random().toString(36).slice(2)}.png`
    await page.screenshot({
      path: screenshotFilename,
      fullPage: true,
    })
    log(`screenshot: ${screenshotFilename}`)
    try {
      await page.tracing.stop()
      log(`tracing: ${tracingFilename}`)
    } catch (err) {
      console.error('Error Chrome page stopping tracing')
      console.error(err.stack)
    }
    await browser.close()
    debug('browser closed')
  }

  async function monitor ({ parameters }) {
    await page.goto(parameters.url, {
      waitUntil: 'domcontentloaded',
    })
    debug('loaded homepage %s', parameters.url)
    await page.waitForSelector(parameters.selector, {
      visible: true,
    })
    debug('done')
  }
}
