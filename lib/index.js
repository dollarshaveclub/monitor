
const debug = require('debug')('face-monitor:lib')
const shuffle = require('lodash/shuffle')
const colors = require('colors/safe')
const assert = require('assert')
const throat = require('throat')

const config = require('./config')
const {
  getDuplicates,
  toMS,
  getElapsedTime,
  logElapsedTime,
  sleep,
  createTimeoutError,
} = require('./utils')

class RunMonitors {
  constructor (monitorSetConfigs, _options = {}) {
    this.monitorSetConfigs = monitorSetConfigs
    debug(this.monitorSetConfigs)

    this.validate(monitorSetConfigs)

    const options = this.options = Object.assign({}, config, _options)
    debug(options)
    this.throttle = throat(options.concurrency)
  }

  async exec () {
    const promises = []
    let { monitorSetConfigs } = this
    if (this.options.shuffleMonitorSets) monitorSetConfigs = shuffle(monitorSetConfigs)

    console.log('')

    for (const monitorSetConfig of monitorSetConfigs) {
      promises.push(this.throttle(async () => {
        const result = await this.runMonitorSet(monitorSetConfig)
        this.logMonitorSet(result)
        return result
      }))
    }
    return Promise.all(promises)
  }

  // i.e. a whole module
  async runMonitorSet (monitorSetConfig) {
    const start = process.hrtime()

    let { monitors } = monitorSetConfig
    if (this.options.shuffleMonitors) monitors = shuffle(monitors)

    const results = []
    for (const monitorConfig of monitors) {
      results.push(await this.runMonitor(monitorConfig, monitorSetConfig))
    }

    return {
      monitorSetConfig,
      results,
      success: results.every(result => result.success),
      elapsedTime: getElapsedTime(start),
    }
  }

  async runMonitor (monitorConfig, monitorSetConfig) {
    const start = process.hrtime()
    let retries = ~~monitorConfig.retries || 1
    let run = 0
    const results = []
    while (run++ < retries && !results.some(x => x.success)) {
      results.push(await this._runMonitor(monitorConfig, monitorSetConfig))
    }

    return {
      monitorConfig,
      elapsedTime: getElapsedTime(start),
      success: results.some(x => x.success),
      results,
    }
  }

  async _runMonitor (monitorConfig, monitorSetConfig) {
    const { monitor } = monitorConfig
    const start = process.hrtime()
    const timeout = toMS(monitorConfig.timeout || '5s')

    try {
      await Promise.race([
        monitor(monitorConfig, monitorSetConfig),
        sleep(timeout).then(() => {
          throw createTimeoutError(`monitor ${monitorConfig.id} timed out!`)
        }),
      ])
      return {
        monitorConfig,
        elapsedTime: getElapsedTime(start),
        success: true,
      }
    } catch (error) {
      return {
        monitorConfig,
        elapsedTime: getElapsedTime(start),
        success: false,
        error,
      }
    }
  }

  logMonitorSet ({ monitorSetConfig, elapsedTime, success, results }) {
    const slow = toMS(monitorSetConfig.slowThreshold, '30s')
    const time = colors[elapsedTime > slow ? 'yellow' : 'green'](`(${logElapsedTime(elapsedTime)})`)
    if (success) {
      console.log(`${colors.green('✔')} ${colors.underline(monitorSetConfig.id)} ${time}:`)
    } else {
      console.error(`${colors.red('✕')} ${colors.underline(monitorSetConfig.id)} ${time}:`)
    }

    results.forEach(result => result.results.forEach(this.logMonitor, this))

    console.log('')
  }

  logMonitor ({ monitorConfig, elapsedTime, success, error }, i) {
    const slow = toMS(monitorConfig.slowThreshold, '1s')
    const time = colors[elapsedTime > slow ? 'yellow' : 'green'](`(${logElapsedTime(elapsedTime)})`)
    if (success) {
      console.log(`  ${colors.green('✔')} ${monitorConfig.id} ${time}`)
      return
    }

    console.error(error.stack)
    console.error(`  ${colors.red('✕')} ${monitorConfig.id} ${time}`)
  }

  validate (monitorSetConfigs) {
    monitorSetConfigs.forEach(x => assert(x.id, 'Every monitor set needs an .id'))
    const duplicateMonitorSetIds = getDuplicates(monitorSetConfigs.map(x => x.id))
    assert(!duplicateMonitorSetIds.length, `Duplicate monitor set ids found: ${duplicateMonitorSetIds.join(', ')}`)

    monitorSetConfigs.forEach((monitorSetConfig) => {
      const { monitors } = monitorSetConfig
      monitors.forEach(x => assert(x.id, 'Every monitor needs an .id'))
      const duplicateMonitorIds = getDuplicates(monitors.map(x => x.id))
      assert(!duplicateMonitorIds.length, `Duplicate monitor ids found: ${duplicateMonitorIds.join(', ')}`)
    })
  }
}

module.exports = (...args) => new RunMonitors(...args)
