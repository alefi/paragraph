/**
  * Statistics and reports
  */
'use strict'

const auth = require('./../helpers/auth')
const db = require('./../helpers/server').db
const winston = require('winston')

module.exports = router => {
  /* Protect all routes */
  router.all('*', auth.secureRoute)

  /* Check role */
  router.all('*', auth.checkPrivilege)

  /* This will handle the url calls for /stat/:reportId */
  router.route('/:reportId')

  .get((req, res, next) => {
    winston.debug('GET /stat/%s with options:', req.params.reportId, req.query)

    switch (req.params.reportId.toLowerCase()) {
      case ('books-in-stores'):
        db.collection('stores').aggregate([
          { $unwind: '$stock' },
          { $lookup:
            { from: 'books',
              localField: 'stock.bookId',
              foreignField: '_id',
              as: 'books'
            }
          },
          { $unwind: '$books' },
          { $group:
            { _id: { _id: '$stock.bookId', name: '$books.name' },
              total: { $sum: '$stock.quantity' }
            }
          },
          { $project:
            { _id: '$_id._id',
              name: '$_id.name',
              total: '$total'
            }
          },
          { $sort: { _id: 1 } }
        ], (err, stats) => {
          if (err) {
            return next(err)
          } else {
            return res.json(stats)
          }
        })
        break
      default:
        return res.json({
          success: false,
          message: 'Wrong query provided.'
        })
    }
  })
}
