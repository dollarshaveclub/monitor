
exports.concurrency = ~~process.env.MONITOR_CONCURRENCY || 2
exports.shuffleMonitorSets = !!process.env.MONITOR_SHUFFLE_MONITOR_SETS || !!process.env.MONITOR_SHUFFLE
exports.shuffleMonitors = !!process.env.MONITOR_SHUFFLE_MONITORS || !!process.env.MONITOR_SHUFFLE
