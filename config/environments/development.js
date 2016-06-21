const MongoLogger = require('mongodb').Logger
const winston = require('winston')

MongoLogger.filter('class', ['Cursor'])
winston.level = 'debug'

/* For develompent token exp =  30 days */
process.env.JWT_TOKEN_EXP *= 30
