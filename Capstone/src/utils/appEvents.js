const { EventEmitter } = require('events');

// Domain events keep business operations independent from notification side effects.
module.exports = new EventEmitter();
