
let i = 0

exports.monitors = [
  {
    id: 1,
    parameters: {
    },
    monitor () {
      if (++i < 3) throw new Error('boom')
    },
    retries: 3,
  },
]
