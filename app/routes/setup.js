/**
  * Node admin route end point configuration
  */
'use strict'

const auth = require('./../helpers/auth')
const db = require('./../helpers/server').db
const merge = require('merge')
const winston = require('winston')

module.exports = router => {
  /**
    * This route have only one method used for initial admin creation.
    * If any already exists into database, nothing happened.
    * There is no protection on this route by default.
    * This route may be safety deleted.
    */

  router.route('/')

  /**
    * Creates admin if any doesn't already exists into db
    * and also ensuring indexes for db
    */
  .get((req, res, next) => {
    /* Set indexes to db */
    db.collection('authors').createIndex({ name: 1 },
    { background: true })

    db.collection('books').createIndex({ name: 1, series: 1 },
    { background: true })

    db.collection('users').createIndex({ login: 1 },
    { background: true, unique: true })

    db.collection('stores').createIndex({ name: 1 },
    { background: true })

    db.collection('users').find({ roles: 'admin' })
    .limit(1).next((err, admin) => {
      if (err) {
        const errMsg = err.errmsg ? err.errmsg : err.toString()
        return res.json({
          success: false,
          messsage: errMsg
        })
      }
      /* No any admins found so lets create one */
      if (!admin) {
        /* Create admin with predefined credential { admin : admin } */
        const defaultAdmin = merge({
          login: 'admin',
          isActive: true,
          roles: [ 'admin' ]
        }, auth.setPassword('admin'))
        /* Save the new admin */
        db.collection('users').insertOne(defaultAdmin)
        .then(r => {
          if (r.insertedCount === 1) {
            return res.json({
              success: true,
              message: 'Первый администратор создан.'
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
        /**
          * At least one admin already exist.
          * Silently exiting with res from method .all below
          */
        next()
      };
    })
  })

  .all((req, res, next) => {
    return res.json({
      success: false,
      messsage: 'Not implemented.'
    })
  })
}
