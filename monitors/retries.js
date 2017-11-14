
let i = 0

exports.monitors = [
  {
    id: 1,
    parameters: {
    },
    monitor (monitorSet, monitorSetConfig, { log }) {
      log('woohoo!')
      if (++i < 3) throw new Error('boom')
    },
    retries: 2,
  },
]
