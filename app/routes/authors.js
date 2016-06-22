/**
  * Authors route end point configuration
  */
'use strict'

const auth = require('./../helpers/auth')
const db = require('./../helpers/server').db
const ObjectId = require('mongodb').ObjectId
const toObjectId = require('./../helpers/common').toObjectId
const validator = require('validator')
const winston = require('winston')

module.exports = router => {
  /* Protect all routes */
  router.all('*', auth.secureRoute)

  /* Check role */
  router.all('*', auth.checkPrivilege)

  /* This will handle the url calls for /authors/:authorId */
  router.route('/:authorId')

  .get((req, res, next) => {
    let authorId

    if (req.params.authorId && validator.isMongoId('' + req.params.authorId)) {
      authorId = req.params.authorId
    } else {
      return res.json({
        success: false,
        messsage: 'Wrong author\'s Id provided.'
      })
    }

    db.collection('authors').find({ _id: ObjectId(authorId) }).limit(1)
    .next((err, author) => {
      if (err) {
        winston.debug(err)
        res.status(500)
        return next(err)
      } else {
        return res.json(author)
      }
    })
  })

  .put((req, res, next) => {
    let authorId

    if (req.params.authorId && validator.isMongoId('' + req.params.authorId)) {
      authorId = req.params.authorId
    } else {
      return res.json({
        success: false,
        messsage: 'Wrong author\'s Id provided.'
      })
    }
    /* Modify existing user */
    const modAuthor = {
      born: req.body.born,
      books: toObjectId(req.body.books),
      comments: req.body.comments,
      city: req.body.city,
      name: req.body.name
    }
    db.collection('authors').findOneAndUpdate({ _id: ObjectId(authorId) },
    { $set: modAuthor },
    { returnOriginal: false })
    .then(r => {
      if (r.lastErrorObject.n === 1) {
        return res.json({
          success: true,
          message: 'Автор отредактирован.',
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
    let authorId

    if (req.params.authorId && validator.isMongoId('' + req.params.authorId)) {
      authorId = req.params.authorId
    } else {
      return res.json({
        success: false,
        messsage: 'Wrong author\'s Id provided.'
      })
    }
    db.collection('authors').findOneAndDelete({ _id: ObjectId(authorId) })
    .then(r => {
      if (r.lastErrorObject.n === 1) {
        return res.json({
          success: true,
          message: 'Автор удален.',
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
    db.collection('authors').find()
    .toArray((err, authors) => {
      if (err) {
        winston.debug(err)
        res.status(500)
        return next(err)
      } else {
        return res.json(authors)
      }
    })
  })

  .post((req, res, next) => {
    /* Create new author */
    const newAuthor = {
      born: req.body.born,
      books: toObjectId(req.body.books),
      comments: req.body.comments,
      city: req.body.city,
      name: req.body.name
    }

    /* Save the author */
    db.collection('authors').insertOne(newAuthor)
    .then(r => {
      if (r.insertedCount === 1) {
        return res.json({
          success: true,
          message: 'Новый автор создан.'
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
