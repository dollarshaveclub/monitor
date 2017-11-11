
const debug = require('debug')('monitor:lib')
const shuffle = require('lodash/shuffle')
const assert = require('assert')
const throat = require('throat')

const RunMonitorSet = require('./run-monitor-set')
const config = require('./config')
const {
  getDuplicates,
} = require('./utils')

class RunAllMonitorSets {
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
      promises.push(this.throttle(async () => new RunMonitorSet(this, monitorSetConfig).exec()))
    }

    return Promise.all(promises)
  }

  validate (monitorSetConfigs) {
    monitorSetConfigs.forEach((x) => {
      assert(x.id, 'Every monitor set needs an .id')
      assert(Array.isArray(x.monitors), `Monitor "${x.id}" does not have any monitors!`)
    })
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

module.exports = (...args) => new RunAllMonitorSets(...args)
