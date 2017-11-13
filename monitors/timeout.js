
let i = 0

exports.monitors = [
  {
    id: 1,
    parameters: {
    },
    async monitor () {
      if (++i < 3) {
        await new Promise(resolve => {
          setTimeout(resolve, 150)
        })
      }
    },
    timeout: 100,
    retries: 2,
  },
]
