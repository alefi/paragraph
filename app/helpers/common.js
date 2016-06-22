/**
  * Common methods
  */
'use strict'

const ObjectId = require('mongodb').ObjectId
const validator = require('validator')

/**
  * If value is ObjectId, convert it. Rest params leaves as is.
  * Inputs strings and arrays only
  */
module.exports.toObjectId = obj => {
  if (obj instanceof Array) {
    let arr = []

    for (let i = 0, len = obj.length; i < len; i++) {
      if (validator.isMongoId('' + obj[i])) {
        arr.push(ObjectId(obj[i]))
      } else {
        arr.push(obj[i])
      }
    }
    return arr
  } else {
    if (validator.isMongoId('' + obj)) {
      return ObjectId(obj)
    } else {
      return obj
    }
  }
}
