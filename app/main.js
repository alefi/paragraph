/**
  * App initialization module
  */
'use strict'

const MongoClient = require('mongodb').MongoClient
const server = require('./helpers/server')
const winston = require('winston')

/* Initialize App */
winston.info('[APP] Starting initialization.')
winston.debug('Parent for %s is %s.', module.id, module.parent.id)

/* DB init goes first. If it fails then stop app. */
MongoClient.connect(process.env.DATABASE_URI, { auto_reconnect: true })
.then(db => {
  winston.info('[DB] connection established.')

  /* Initializing Scheduler class. */
  server.init(db)
  .then(server.listen())
  .catch(err => {
    winston.debug(err)
  })
})
.catch(err => {
  winston.debug(err)
  process.exit(1)
})
