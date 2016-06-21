/**
  * Auth module: JWT tokens and user authorization
  */
'use strict'

const aclRolesPath = global.NODE_ROOT + '/config/acl/roles'
const aclRoles = require('require-dir')(aclRolesPath)
const assert = require('assert')
const db = require('./server').db
const crypto = require('crypto-js')
const jwt = require('jsonwebtoken')
const ObjectId = require('mongodb').ObjectId
const path = require('path')
const winston = require('winston')

/* acl object lifetime == node process lifetime */
let acl = require('acl')
acl = new acl(new acl.memoryBackend())

winston.debug('Parent for %s is %s.', module.id, module.parent.id)

/**
  * Bootstrap roles. This happens once when node process starts.
  * If we change user role programmatically, we should tell to acl about it.
  * Otherway it will be unpredictive behavior of the acl for that user.
  */
winston.debug('[ACL] Loading roles:')
Object.keys(aclRoles).forEach((aclRoleName) => {
  acl.allow(require(path.join(aclRolesPath, aclRoleName)))
  winston.info('Role ' + aclRoleName + ' loaded.')
})
winston.debug('[ACL] roles and access permissions loaded successful.')

module.exports.acl = acl

module.exports.checkPrivilege = (req, res, next) => {
  /**
    * Checkout privileges
    * We didn't load user roles to acl here.
    * We just checks embedded [user.roles] for these.
    **/
  acl.areAnyRolesAllowed(req.user.roles, req.baseUrl,
  req.method.toLowerCase(), (err, isPermit) => {
    if (err) {
      return next(err)
    }
    if (isPermit) {
      /* User have access */
      return next(null)
    } else {
      /**
        * User have no access to that area
        * Show fake data to him
        */
      return res.status(200).json([])
    }
  })
}

/**
  * getToken - checks for token in headers
  *
  * @param {Object} headers
  * @return {String}
  * @api public
  */

function getToken (headers) {
  if (headers && headers.authorization) {
    return headers.authorization
  }
}

module.exports.getToken = getToken

/**
  * whenExpires - checks when token expires
  *
  * @param {Object} token
  * @return {Number} days to expires
  * @api public
  */

module.exports.whenExpires = (exp) => {
  const seconds = exp - Math.floor(new Date().getTime() / 1000)
  return Math.floor(seconds / 86400)
}

/**
  * setTokenExp - determine tokens's exp to set
  *
  * @param {Object} user
  * @return {Date}
  * @api private
  */

function setTokenExp (user) {
  return +(process.env.JWT_TOKEN_EXP || 86400)  // default: 24 hours
}

/**
  * makeJti - creates unique JTI for the token
  *
  * @param {Object} user
  * @return {String}
  * @api public
  */

function makeJti (user) {
  let jti

  /* There is no user.salt. We generate new one here: */
  const _salt = Math.round((new Date().valueOf() * Math.random())) + ''
  try {
    jti = crypto.SHA3(user._id + _salt).toString(crypto.enc.Base64)
  } catch (err) {
    throw (err)
  }
  return jti
}

module.exports.makeJti = makeJti

/**
  * produceToken - issue token for user
  *
  * @param {Object} credential
  * @return {String}
  * @api public
  */

function produceToken (credential) {
  assert.notEqual(db, undefined)
  assert(credential)
  assert(credential.login)
  assert(credential.password)

  winston.debug('func produceToken, input credential:', credential)

  return new Promise((resolve, reject) => {
    db.collection('users').find({ login: credential.login })
    .limit(1).next((err, user) => {
      if (err) {
        return reject(err)
      }

      if (!user) {
        /* User not found */
        return reject(new Error('Authentication failed: user not found.'))
      } else {
        /* User found so lets authenticate him */
        const isMatch = authenticate(credential.password,
          user.hashedPassword, user.salt)

        if (isMatch) {
          /* Check for blocking after user success authenticated */
          if (user.isActive) {
            /**
              * User found and authenticated so create a token
              * Tokens exp may vary in depends of user role
              */
            winston.debug('func produceToken, user\'s password is match:', isMatch)
            generateToken(user)
            .then(token => {
              winston.debug('func produceToken, new token:', token)
              if (token) {
                return resolve(token)
              } else {
                return reject(new Error('Failed to generate token.'))
              }
            })
            .catch(err => {
              winston.debug(err)
              return reject(err)
            })
          } else {
            /* User found but blocked right now */
            return reject(new Error('Authentication failed: User temporary blocked.'))
          }
        } else {
          /* Password mismatch */
          winston.debug(err)
          return reject(new Error('Authenticate failed. Password mismatch.'))
        }
      }
    })
  })
}

module.exports.produceToken = produceToken

/**
  * Token generator
  *
  * @param {Object} user
  * @return {Object} token
  * @api public
  */

function generateToken (user) {
  return new Promise((resolve, reject) => {
    const exp = setTokenExp(user)
    /* Sign token */
    jwt.sign({ lastLogin: Math.floor(Date.now() / 1000) },
    process.env.JWT_SECRET, {
      subject: '' + user._id,
      jwtid: makeJti(user),
      expiresIn: exp
    }, (err, token) => {
      if (err) {
        winston.debug(err)
        return reject(err)
      }
      return resolve(token)
    })
  })
}

module.exports.generateToken = generateToken

/**
  * validateTokenAndUserRights
  *
  * @param {String} token
  * @return Promise {Object} user
  * @api public
  */

function validateTokenAndUser (token) {
  return new Promise((resolve, reject) => {
    validateToken(token)
    .then(claims => isTokenInBl(claims))
    .then(isValid => validateUserRights(token))
    .then(user => {
      /* User not found, temporary locked for login or was deleted */
      if (!user) {
        return reject(new Error('Invalid or expired token.'), null)
      } else {
        return resolve(user)
      }
    })
    .catch(err => reject(err))
  })
}

module.exports.validateTokenAndUser = validateTokenAndUser

/**
  * validateToken - check if token is valid
  *
  * @param {Objects} token
  * @return Promise {Object} claims if token is valid
  * @api private
  */

function validateToken (token) {
  return new Promise((resolve, reject) => {
    /* Validate token's signature */
    jwt.verify(token, process.env.JWT_SECRET, (err, claims) => {
      /* Exit when token in wrong format or invalid */
      if (err) {
        winston.debug('Token invalid.')
        return reject(err)
      } else {
        winston.debug('Token is valid. Claims:', claims)
        return resolve(claims)
      }
    })
  })
}

/**
  * isTokenInBl - check for token into black list
  *
  * @param {Objects} token
  * @param {Function}
  * @return {Boolean} true if token is valid or false otherwise
  * @api private
  */

function isTokenInBl (claims) {
  assert.notEqual(db, undefined)

  return new Promise((resolve, reject) => {
    /* Make sure that token isn't in black list */
    /* We know that token is already verified so assume it's valid. */
    db.collection('tokens_blacklist').find({ jti: claims.jti })
    .limit(1).next((err, found) => {
      if (err) {
        return reject(err)
      } else {
        winston.debug('Token is valid.')
        if (found) {
          winston.debug('The token has been blocked.')
          return reject(new Error('The token has been blocked.'))
        } else {
          winston.debug('Token not found in blacklist.')
          return resolve(found)
        }
      }
    })
  })
}

/**
  * validateUserRights - check if user have enough rights
  *
  * @param {Object} token
  * @return Promise {Object} user
  * @api private
  */

function validateUserRights (token) {
  assert(token)

  return new Promise((resolve, reject) => {
    /* Validate token's signature */
    const decToken = jwt.decode(token)
    winston.debug('decToken:', decToken)
    /**
      * At this point we assume that token format correct
      * and token itself is valid. We checked that early.
      * So there are no additional checks for errors.
      */
    db.collection('users').find({ _id: ObjectId(decToken.sub) })
    .limit(1).next((err, user) => {
      /* Only database error maybe here */
      if (err) {
        return reject(err)
      }
      if (!user) {
        return reject(new Error('User was not found.'))
      } else {
        winston.debug('User found:', user.login)
        if (!user.isActive) {
          return reject(new Error('User temporary blocked.'))
        }
        /* Check if user changed password after token has been issued */
        const issuedDateOk = Math.floor(new Date(user.passwordChangedAt).getTime() / 1000) <= decToken.iat

        if (issuedDateOk) {
          return resolve(user)
        } else {
          return reject(new Error('Token expired cause user has changed his password.'))
        }
      }
    })
  })
}

/**
  * secureRoute middleware - sets security check for route, acts as middleware
  *
  * @param {Objects} req, res
  * @param {Function} callback
  * @return {Object} req.user
  * @api public
  */

module.exports.secureRoute = (req, res, next) => {
  /* Set security to route path */
  const token = getToken(req.headers)
  if (!token) {
    /* There was no token, exiting */
    return res.status(403).json({
      success: false,
      message: 'No token provided.'
    })
  }
  /* Validate the token */
  validateTokenAndUser(token)
  .then(user => {
    /** Attach user to request
      * Attach token exp to request, too
      */
    req.user = user
    req.tokenExpiresIn = jwt.decode(token).exp

    return next()
  })
  .catch(err => {
    let result = { success: false }

    switch (err.name) {
      case ('TokenExpiredError'):
        res.status(403)
        result.message = 'Token expired, please renew.'
        break
      case ('JsonWebTokenError'):
        result.message = 'The token provided has wrong format.'
        break
      default:
        if (err.message === 'Token expired cause user has changed his password.' ||
        err.message === 'User was not found.' || err.message === 'User temporary blocked.') {
          result.message = err.message
        } else {
          /* Possible unknown errors */
          winston.debug(err)
          result.message = err.errmsg || 'Failed to authenticate token.'
        }
        break
    }
    return res.json(result)
  })
}

/**
  * purgeToken - current user session stands invalid
  *
  * @param {Objects} token
  * @return {Object}
  * @api public
  */

function purgeToken (token) {
  assert(token)

  return new Promise((resolve, reject) => {
    if (!token) {
      return reject(new Error('There was no token to make it void.'))
    }
    /* We should add JIT & EXP of the users's token to black list */
    const decToken = jwt.decode(token)
    db.collection('tokens_blacklist').find({ jti: decToken.jti })
    .limit(1).next((err, found) => {
      if (err) {
        return reject(err)
      }
      if (!found) {
        const newToken = {
          jti: decToken.jti,
          exp: decToken.exp
        }
        /* Save the token */
        db.collection('tokens_blacklist').insertOne(newToken, (err, result) => {
          assert.equal(err, null)
          assert.equal(result.insertedCount, 1)

          if (err) {
            return reject(err)
          } else {
            return resolve({
              success: true,
              message: 'The token successful invalidated.'
            })
          }
        })
      /* The token in black list */
      } else {
        return reject(new Error('The token already has been invalidated.'))
      }
    })
  })
}

module.exports.purgeToken = purgeToken

/** authenticate - checks if the plain & hashed passwords are the same
  *
  * @param {String} plainText
  * @return {Boolean}
  * @api public
  */

function authenticate (plainText, hashedPassword, salt) {
  return hashPassword(plainText, salt) === hashedPassword
}

module.exports.authenticate = authenticate
/** setPassword
  *
  * @param {String} plainText
  * @return {Promise}
  * @api public
  */

module.exports.setPassword = plainText => {
  if (plainText && plainText.length) {
    let user = {}
    user.salt = makeSalt()
    user.hashedPassword = hashPassword(plainText, user.salt)
    user.passwordChangedAt = new Date().toUTCString()
    return (user)
  }
}

/**
  * Make salt
  *
  * @return {String}
  * @api private
  */

function makeSalt () {
  return Math.round((new Date().valueOf() * Math.random())) + ''
}

/**
  * Hash password
  *
  * @param {String} plainText
  * @return {String}
  * @api private
 */

function hashPassword (plainText, salt) {
  let _hash = plainText + salt

  for (var i = 0; i < 500; i++) {
    _hash = crypto.SHA3(_hash + plainText + salt)
  }
  return _hash.toString(crypto.enc.Base64)
}
