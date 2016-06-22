/**
  * Stores route end point configuration
  */
'use strict'

const auth = require('./../helpers/auth')
const db = require('./../helpers/server').db
const ObjectId = require('mongodb').ObjectId
const toObjectId = require('./../helpers/common').toObjectId
const validator = require('validator')
const winston = require('winston')

function isAdmin (user) {
  return user.roles.indexOf('admin') >= 0
}

module.exports = router => {
  /* Protect all routes */
  router.all('*', auth.secureRoute)

  /* Check role */
  router.all('*', auth.checkPrivilege)

  /* This will handle the url calls for /stores/:storeId */
  router.route('/:storeId')

  .get((req, res, next) => {
    let storeId
    let query

    if (req.params.storeId && validator.isMongoId('' + req.params.storeId)) {
      storeId = req.params.storeId
    } else {
      return res.json({
        success: false,
        messsage: 'Wrong store\'s Id provided.'
      })
    }
    if (isAdmin(req.user)) {
      query = { _id: ObjectId(storeId) }
    } else {
      query = {
        $and:
          [ { _id: ObjectId(storeId) },
            { _id: { $in: req.user.stores } } ]
      }
    }
    db.collection('stores').find(query)
    .limit(1).next((err, store) => {
      if (err) {
        return next(err)
      }
      return res.json(store || [])
    })
  })

  .put((req, res, next) => {
    let storeId

    if (req.params.storeId && validator.isMongoId('' + req.params.storeId)) {
      storeId = req.params.storeId
    } else {
      return res.json({
        success: false,
        messsage: 'Wrong store\'s Id provided.'
      })
    }
    /* Modify existing user */
    const modStore = {
      name: req.body.name,
      stock: req.body.stock.map(item => ({
        bookId: toObjectId(item.bookId),
        quantity: item.quantity
      }))
    }
    db.collection('stores').findOneAndUpdate({ _id: ObjectId(storeId) },
    { $set: modStore },
    { returnOriginal: false })
    .then(r => {
      if (r.lastErrorObject.n === 1) {
        return res.json({
          success: true,
          message: 'Магазин отредактирован.',
          user: r.value
        })
      } else {
        winston.debug(r)
        return res.json({
          success: false,
          message: 'Ошибка при сохранении.'
        })
      }
    })
    .catch(err => {
      winston.debug(err)
      res.status(500)
      return next(err)
    })
  })

  router.route('/')

  .get((req, res, next) => {
    /* Returns stores as JSON */
    let query = []

    if (req.user.roles) {
      !isAdmin(req.user) && query.push(
        { $match: { _id: ObjectId(req.user._id) } },
        { $unwind: '$stores' },
        { $lookup:
          { from: 'stores',
            localField: 'stores',
            foreignField: '_id',
            as: 'stores'
          }
        },
        { $unwind: '$stores' },
        { $project:
          { _id: '$stores._id',
            name: '$stores.name',
            stock: '$stores.stock'
          }
        })
      winston.debug('query is:')
      winston.debug(query)

      db.collection(isAdmin(req.user) ? 'stores' : 'users')
      .aggregate(query, (err, stores) => {
        if (err) {
          return next(err)
        } else {
          return res.json(stores)
        }
      })
    } else {
      /* No property roles, somehow */
      return res.json([])
    }
  })

  .post((req, res, next) => {
    /* Create new store */
    const newStore = {
      name: req.body.name,
      stock: req.body.stock.map(item => ({
        bookId: toObjectId(item.bookId),
        quantity: item.quantity
      }))
    }

    db.collection('stores').insertOne(newStore)
    .then(r => {
      if (r.insertedCount === 1) {
        return res.json({
          success: true,
          message: 'Новый магазин создан.'
        })
      } else {
        return res.json({
          success: false,
          message: 'Ошибка при сохранении.'
        })
      }
    })
    .catch(err => {
      winston.debug(err)
      res.status(500)
      return next(err)
    })
  })
}
