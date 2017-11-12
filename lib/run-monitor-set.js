
const shuffle = require('lodash/shuffle')
const chalk = require('chalk')

const {
  toMS,
  getElapsedTime,
  logElapsedTime,
  sleep,
  createTimeoutError,
} = require('./utils')

module.exports = class RunMonitorSet {
  constructor (runner, monitorSetConfig) {
    this.runner = runner
    this.monitorSetConfig = monitorSetConfig

    this._shuffle = runner.options.shuffleMonitors
    this._stream = runner.options.concurrency === 1
  }

  async exec () {
    const stream = !!this._stream
    if (stream) console.log(this.logMonitorSetStart())
    const result = await this._runMonitorSet()
    if (stream) console.log(this.logMonitorSetEnd(result) + '\n')
    else {
      const logs = [this.logMonitorSetResult(result)]
        .concat(result.results.map(x =>
          x.results.map(this.logMonitorResult, this)
        ).reduce((a, b) => a.concat(b), []))
      console.log(logs.join('\n') + '\n')
    }

    return result
  }

  async _runMonitorSet () {
    const start = process.hrtime()

    const { monitorSetConfig } = this
    let { monitors } = monitorSetConfig
    if (this._shuffle) monitors = shuffle(monitors)

    const results = []
    for (const monitorConfig of monitors) {
      results.push(await this.runMonitor(monitorConfig))
    }

    return {
      monitorSetConfig,
      results,
      success: results.every(result => result.success),
      elapsedTime: getElapsedTime(start),
    }
  }

  // runs the monitor with retries with each retry being in .results
  async runMonitor (monitorConfig) {
    const start = process.hrtime()
    const { monitorSetConfig } = this
    let retries = ~~monitorConfig.retries || 1
    let run = 0
    const results = []
    while (run++ < retries && !results.some(x => x.success)) {
      const result = await this._runMonitor(monitorConfig, monitorSetConfig)
      // NOTE: logs each try, not the final result of the monitor
      if (this._stream) console.log(this.logMonitorResult(result))
      results.push(result)
    }

    return {
      monitorConfig,
      elapsedTime: getElapsedTime(start),
      success: results.some(x => x.success),
      results,
    }
  }

  // a single monitor run
  async _runMonitor (monitorConfig) {
    const { monitorSetConfig } = this
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

  logMonitorSetStart () {
    return `${chalk.underline(this.monitorSetConfig.id)}:`
  }

  logMonitorSetEnd ({ monitorSetConfig, elapsedTime, success, results }) {
    const slow = toMS(monitorSetConfig.slowThreshold, '30s')
    const time = chalk[elapsedTime > slow ? 'yellow' : 'green'](`(${logElapsedTime(elapsedTime)})`)
    if (success) return `  ${chalk.green('✔')} ${time}`
    return `  ${chalk.red('✕')} ${time}`
  }

  logMonitorSetResult ({ monitorSetConfig, elapsedTime, success, results }) {
    const slow = toMS(monitorSetConfig.slowThreshold, '30s')
    const time = chalk[elapsedTime > slow ? 'yellow' : 'green'](`(${logElapsedTime(elapsedTime)})`)
    if (success) return `${chalk.green('✔')} ${chalk.underline(monitorSetConfig.id)} ${time}:`
    return `${chalk.red('✕')} ${chalk.underline(monitorSetConfig.id)} ${time}:`
  }

  logMonitorResult ({ monitorConfig, elapsedTime, success, error }, i) {
    const slow = toMS(monitorConfig.slowThreshold, '1s')
    const time = chalk[elapsedTime > slow ? 'yellow' : 'green'](`(${logElapsedTime(elapsedTime)})`)
    if (success) return `    ${chalk.green('✔')} ${monitorConfig.id} ${time}`

    return [
      '    ' + chalk.red(error.stack).replace(/\n/g, '\n    '),
      `    ${chalk.red('✕')} ${monitorConfig.id} ${time}`,
    ].join('\n')
  }
}
