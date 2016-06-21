/**
  * Server helper class
  */
'use strict'

const express = require('express')
const http = require('http')
const path = require('path')

  /**
    * create the express app
    * configure middle wares
    */
const bodyParser = require('body-parser')
const morgan = require('morgan')
const winston = require('winston')
const errorHandlersPath = global.NODE_ROOT + '/app/errors'
const errorHandlers = require('require-dir')(errorHandlersPath)

let db = Symbol()
winston.debug('Parent for %s is %s.', module.id, module.parent.id)

module.exports = new class Server {
  init (_db) {
    return new Promise((resolve, reject) => {
      this[db] = _db

      /* Configure express */
      this.app = express()

      /* Router init */
      const router = require(global.NODE_ROOT + '/config/initializers/router')

      this.app.use(bodyParser.urlencoded({
        extended: true,
        limit: 20 * 1024,
        parameterLimit: 50
      }))
      this.app.use(bodyParser.json({
        limit: 20 * 1024,
        type: '*/*'
      }))

      /* Add routes */
      winston.info('[SERVER] Starting router initialization')
      router(this.app)
      winston.info('[SERVER] Router initialized successful.')

      /* Development and test only */
      if (this.app.get('env') !== 'production') {
        this.app.use(morgan('dev'))
        this.app.locals.pretty = true
      } else {
        this.app.use(morgan('common'))
      }

      /**
       * Error handler
       */

      /* 404 error handler */
      this.app.use(function error404 (req, res) {
        return res.status(404).json({
          success: false,
          message: 'Not found.'
        })
      })

      Object.keys(errorHandlers).forEach(handlerName => {
        this.app.use(require(path.join(errorHandlersPath, handlerName)))
      })
      return resolve(this)
    })
  }

  get db () {
    return this[db]
  }

  /**
    * Server starter
    */
  listen () {
    return new Promise((resolve, reject) => {
      http.createServer(this.app)
      .listen(process.env.HTTP_PORT, process.env.NODE_HOST)

      /* After start */
      winston.info('[SERVER] Listening on %s:%s',
        process.env.NODE_HOST, process.env.HTTP_PORT)
      return resolve(this)
    })
  }
}
