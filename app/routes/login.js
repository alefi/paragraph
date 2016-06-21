/**
  * Login route end point configuration
  */
'use strict'

const assert = require('assert')
const auth = require('./../helpers/auth')
const winston = require('winston')

module.exports = router => {
  /* This will handle the url calls for /login/:userLogin */
  router.route('/:credential')

  .post((req, res, next) => {
    /**
      * Validates token, provided by client.
      * Query format POST /login/validate
      * Body "token" : String
      */
    const token = req.body.token

    if ((req.params.credential.toLowerCase() === 'validate') && (token)) {
      /* Validate token: */
      auth.validateTokenAndUser(token)
      .then(user => {
        /* Here we sure the token is valid. */
        return res.json({
          success: true,
          messsage: 'Token is valid.',
          user: {
            login: user.login,
            name: user.name
          }
        })
      })
      .catch(err => {
        let result = {
          success: false
        }

        switch (err.name) {
          case ('TokenExpiredError'):
            res.status(403)
            result.message = 'Token expired, please renew.'
            break
          case ('JsonWebTokenError'):
            result.message = 'The token provided has wrong format.'
            break
          default:
            if (err.message === 'Token expired cause user has changed his password.' ||
            err.message === 'User was not found.') {
              result.message = err.message
            } else {
              /* Possible unknown errors */
              winston.debug(err)
              result.message = err.errmsg || 'Failed to authenticate token.'
            }
            break
        }
        return res.json(result)
      })
    } else {
      if (!token) {
        /**
          * No idea what to validate
          * Silently exits with callback to next method: 'Not implemented'
          */
        next()
      }
    }
  })

  .all((req, res, next) => {
    res.json({
      success: false,
      messsage: 'Not implemented.'
    })
  })

  router.route('/')

  /* Issue a token or send en error to the user */
  .post((req, res, next) => {
    assert(req.body)

    /*  Determining what to patch */
    if (!req.body && !req.body.login && !req.body.password) {
      return res.json({
        success: false,
        messsage: 'Wrong query parameters provided.'
      })
    };

    const credential = {
      login: req.body.login,
      password: req.body.password
    }

    auth.produceToken(credential)
    .then(token => {
      /* Send new token to the user */
      return res.json({
        success: true,
        messsage: 'Authentication token successful produced.',
        token: token
      })
    })
    .catch(err => {
      let result = {
        success: false
      }
      if (err.name === 'Error') {
        result.message = err.message
      } else {
        /* Possible unknown errors */
        winston.debug(err)
        result.message = err.errmsg || err.message
      }
      return res.json(result)
    })
  })

  .all((req, res, next) => {
    res.json({
      success: false,
      messsage: 'Not implemented.'
    })
  })
}
