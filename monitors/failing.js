
const noop = () => {}

exports.monitors = [
  {
    id: 1,
    parameters: {
    },
    monitor: noop,
  },

  {
    id: 2,
    parameters: {
    },
    monitor () {
      if (process.env.NODE_ENV === 'test') throw new Error('boom')
    },
  },

  {
    id: 3,
    parameters: {
    },
    monitor: noop,
  },
]
