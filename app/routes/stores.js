/**
  * Stores route end point configuration
  */
'use strict'

const auth = require('./../helpers/auth')
const db = require('./../helpers/server').db
const validator = require('validator')

module.exports = router => {
  /* Protect all routes */
  router.all('*', auth.secureRoute)

  /* Check role */
  router.all('*', auth.checkPrivilege)

  /* This will handle the url calls for /stores/:storeId */
  router.route('/:storeId')

  .get((req, res, next) => {
    let storeId

    if (req.params.storeId && validator.isMongoId('' + req.params.storeId)) {
      storeId = req.params.storeId
    } else {
      return res.json({
        success: false,
        messsage: 'Wrong book\'s Id provided.'
      })
    }
    db.collection('stores').find({ _id: storeId })
    .limit(1).next((err, store) => {
      if (err) {
        return next(err)
      }
      if (!store) {
        return res.json({
          success: false,
          message: 'Store was not found.'
        })
      } else {
        return res.json(store)
      }
    })
  })

  router.route('/')

  .get((req, res, next) => {
    /* Returns stores as JSON */
    /* Get queries and limit support */
    let query = {}

    /* Maximum store name length no more than 50 symbols */
    if (req.query.q && req.query.q.length <= 50) {
      query = { 'name': { '$regex': req.query.q, '$options': 'i' } }
    }
    db.collection('stores').find(query, {_id: 1, name: 1, stock: 1})
    .limit(+(req.query.limit || 10)).toArray((err, stores) => {
      if (err) {
        return next(err)
      }
      if (!stores) {
        return res.json({
          success: false,
          messsage: 'There are no stores found.'
        })
      } else {
        return res.json(stores)
      }
    })
  })
}
