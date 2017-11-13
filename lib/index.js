
const debug = require('debug')('monitor:lib')
const shuffle = require('lodash/shuffle')
const EventEmitter = require('events')
const assert = require('assert')
const pAll = require('p-all')

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

    this.events = new EventEmitter()
  }

  async exec () {
    let { monitorSetConfigs } = this
    if (this.options.shuffleMonitorSets) monitorSetConfigs = shuffle(monitorSetConfigs)

    return pAll(monitorSetConfigs.map(x => async () => {
      this.events.emit('monitor-set:start', x)
      const result = await new RunMonitorSet(this, x).exec()
      this.events.emit('monitor-set', result)
      return result
    }), {
      concurrency: this.options.concurrency,
    })
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
