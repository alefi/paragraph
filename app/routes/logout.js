/**
  * Logout route end point configuration
  */
'use strict'

const auth = require('./../helpers/auth')
const winston = require('winston')

module.exports = router => {
  /* Protect all routes */
  router.all('*', auth.secureRoute)

  /* Check role */
  router.all('*', auth.checkPrivilege)

  /* This will handle the url calls for /logout/:userLogin */
  router.route('/:userLogin')
  /* Sends res for delete token */
  .post((req, res, next) => {
    console.log('!!!!!!!!!!!!!!')
    const token = auth.getToken(req.headers)
    auth.purgeToken(token)
    .then(result => res.json(result))
    .catch(err => {
      let result = {
        success: false
      }
      if (err.name === 'Error') {
        result.message = err.message
      } else {
        /* Possible unknown errors */
        winston.debug(err)
        result.message = err.errmsg
      }
      return res.json(result)
    })
  })
}
