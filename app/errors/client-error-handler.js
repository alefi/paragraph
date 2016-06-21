'use strict'

function clientErrorHandler (err, req, res, next) {
  if (req.xhr) {
    res.status(500).send({ error: 'Something failed!' })
  }
  return next(err)
}

module.exports = clientErrorHandler
