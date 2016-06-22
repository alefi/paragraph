/**
  * Books route end point configuration
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

  /* This will handle the url calls for /books/:bookId */
  router.route('/:bookId')

  .get((req, res, next) => {
    let bookId

    if (req.params.bookId && validator.isMongoId('' + req.params.bookId)) {
      bookId = req.params.bookId
    } else {
      return res.json({
        success: false,
        messsage: 'Wrong book\'s Id provided.'
      })
    }
    db.collection('books').find({ _id: ObjectId(bookId) })
    .limit(1).next((err, book) => {
      if (err) {
        return next(err)
      }
      if (!book) {
        return res.json({
          success: false,
          message: 'Book was not found.'
        })
      } else {
        return res.json(book)
      }
    })
  })

  .put((req, res, next) => {
    let bookId

    if (req.params.bookId && validator.isMongoId('' + req.params.bookId)) {
      bookId = req.params.bookId
    } else {
      return res.json({
        success: false,
        messsage: 'Wrong book\'s Id provided.'
      })
    }
    /* Modify existing user */
    const modBook = {
      authors: toObjectId(req.body.authors),
      issuedYear: req.body.issuedYear,
      name: req.body.name,
      series: req.body.series
    }
    db.collection('books').findOneAndUpdate({ _id: ObjectId(bookId) },
    { $set: modBook },
    { returnOriginal: false })
    .then(r => {
      if (r.lastErrorObject.n === 1) {
        return res.json({
          success: true,
          message: 'Книга отредактирована.',
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
    let bookId

    if (req.params.bookId && validator.isMongoId('' + req.params.bookId)) {
      bookId = req.params.bookId
    } else {
      return res.json({
        success: false,
        messsage: 'Wrong book\'s Id provided.'
      })
    }
    db.collection('books').findOneAndDelete({ _id: ObjectId(bookId) })
    .then(r => {
      if (r.lastErrorObject.n === 1) {
        return res.json({
          success: true,
          message: 'Книга удалена.',
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
    /* Returns books as JSON */
    /* Get queries and limit support */
    let query = {}

    /* Maximum book name length no more than 50 symbols */
    if (req.query.q && req.query.q.length <= 50) {
      query = {
        'name': { '$regex': req.query.q, '$options': 'i' }
      }
    }
    db.collection('books').find(query)
    .limit(+(req.query.limit || 10)).toArray((err, books) => {
      if (err) {
        return next(err)
      }
      if (!books) {
        return res.json({
          success: false,
          messsage: 'There are no books was found.'
        })
      } else {
        return res.json(books)
      }
    })
  })

  .post((req, res, next) => {
    /* Create new book */
    const newBook = {
      authors: toObjectId(req.body.authors),
      issuedYear: req.body.issuedYear,
      name: req.body.name,
      series: req.body.series
    }

    /* Save the book */
    db.collection('books').insertOne(newBook)
    .then(r => {
      if (r.insertedCount === 1) {
        return res.json({
          success: true,
          message: 'Новая книга создана.'
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
