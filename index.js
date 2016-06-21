/**
  * Main app starter module
  */
'use strict'

const path = require('path')

/* Load Environment variables from .env file */
require('dotenv').load()

/* Setting global application root path */
global.NODE_ROOT = path.resolve(__dirname)

/* Load configuration file for the environment */
require(global.NODE_ROOT + '/config/environments/' + process.env.NODE_ENV)

/* Initialize and run the app */
module.exports = require(global.NODE_ROOT + '/app/main')
