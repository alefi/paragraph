/**
  * Users route end point configuration
  */
'use strict'

const auth = require('./../helpers/auth')
const db = require('./../helpers/server').db
const merge = require('merge')
const ObjectId = require('mongodb').ObjectId
const toObjectId = require('./../helpers/common').toObjectId
const validator = require('validator')
const winston = require('winston')

module.exports = router => {
  /* Protect all routes */
  router.all('*', auth.secureRoute)

  /* Agents allowed only GET */
  router.all('*', auth.checkPrivilege)

  /* This will handle the url calls for /users/:userId */
  router.route('/:userId')

  .get((req, res, next) => {
    let userId

    if (req.params.userId && validator.isMongoId('' + req.params.userId)) {
      userId = req.params.userId
    } else {
      return res.json({
        success: false,
        messsage: 'Wrong user\'s Id provided.'
      })
    }
    db.collection('users').find({ _id: ObjectId(userId) },
    { _id: 1,
      login: 1,
      isActive: 1,
      roles: 1,
      stores: 1
    }).limit(1).next((err, user) => {
      if (err) {
        res.status(500)
        return next(err)
      } else {
        return res.json(user)
      }
    })
  })

  .put((req, res, next) => {
    let userId

    if (req.params.userId && validator.isMongoId('' + req.params.userId)) {
      userId = req.params.userId
    } else {
      return res.json({
        success: false,
        messsage: 'Wrong user\'s Id provided.'
      })
    }
    /* Modify existing user */
    const modUser = {
      login: req.body.login,
      isActive: req.body.isActive,
      roles: req.body.roles,
      stores: toObjectId(req.body.stores)
    }
    db.collection('users').findOneAndUpdate({ _id: ObjectId(userId) },
    { $set: modUser },
    { projection: { _id: 1, login: 1, isActive: 1, roles: 1, stores: 1 },
      returnOriginal: false
    })
    .then(r => {
      if (r.lastErrorObject.n === 1) {
        return res.json({
          success: true,
          message: 'Пользователь отредактирован.',
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

  .delete((req, res, next) => {
    let userId

    if (req.params.userId && validator.isMongoId('' + req.params.userId)) {
      userId = req.params.userId
    } else {
      return res.json({
        success: false,
        messsage: 'Wrong user\'s Id provided.'
      })
    }
    /* User should't delete himself anyway */
    db.collection('users').findOneAndDelete({
      $and:
      [
        { _id: ObjectId(userId) },
        { _id: { $ne: ObjectId(req.user._id) } }
      ]
    },
    { projection: { _id: 1, login: 1, isActive: 1, roles: 1, stores: 1 }
    })
    .then(r => {
      if (r.lastErrorObject.n === 1) {
        return res.json({
          success: true,
          message: 'Пользователь удален.',
          user: r.value
        })
      } else {
        winston.debug(r)
        return res.json({
          success: false,
          message: 'Ошибка при удалении.'
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
    db.collection('users').find({}, {
      _id: 1,
      isActive: 1,
      login: 1,
      roles: 1,
      stores: 1
    })
    .toArray((err, users) => {
      if (err) {
        winston.debug(err)
        res.status(500)
        return next(err)
      } else {
        return res.json(users)
      }
    })
  })

  .post((req, res, next) => {
    /* Create new user */
    const newUser = merge({
      login: req.body.login,
      isActive: req.body.isActive,
      roles: req.body.roles,
      stores: toObjectId(req.body.stores)
    }, auth.setPassword(req.body.password))

    if (newUser.hashedPassword) {
      db.collection('users').insertOne(newUser)
      .then(r => {
        if (r.insertedCount === 1) {
          return res.json({
            success: true,
            message: 'Новый пользователь создан.'
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
    } else {
      return res.json({
        success: false,
        message: 'Ошибка при создании пароля пользователя.'
      })
    }
  })
}
