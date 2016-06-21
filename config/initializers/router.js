/**
  * Client router configuration module
  */
'use strict'

const changeCase = require('change-case')
const express = require('express')
const routes = require('require-dir')(global.NODE_ROOT + '/app/routes')

module.exports = app => {
  /* Initialize all other routes */
  Object.keys(routes).forEach(routeName => {
    let router = express.Router()

    /* Initialize the route to add its functionality to router */
    require(global.NODE_ROOT + '/app/routes/' + routeName)(router)

    /* Add router to the specified route name in the app */
    app.use('/' + changeCase.paramCase(routeName), router)
  })
}
