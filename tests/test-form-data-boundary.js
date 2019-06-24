'use strict'

var http = require('http')
var path = require('path')
var request = require('../')
var fs = require('fs')
var tape = require('tape')
var destroyable = require('server-destroy')

var server = http.createServer(function (req, res) {
  var data = ''

  req.on('data', function (d) {
    data += d
  })

  req.once('end', function () {
    res.writeHead(200)
    res.end(JSON.stringify({
      headers: req.headers,
      body: data
    }))
  })
})

destroyable(server)

tape('setup', function (t) {
  server.listen(0, function () {
    server.url = 'http://localhost:' + this.address().port
    t.end()
  })
})

tape('default boundary', function (t) {
  request.post({
    url: server.url,
    formData: {
      formKey: 'formValue'
    }
  }, function (err, res, body) {
    var req = JSON.parse(body)
    var boundary
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.ok(/multipart\/form-data; boundary=--------------------------\d+/
      .test(req.headers['content-type']))

    boundary = req.headers['content-type'].split('boundary=')[1];
    t.ok(/--------------------------\d+/.test(boundary))
    t.ok(req.body.startsWith('--' + boundary))
    t.ok(req.body.indexOf('name="formKey"') !== -1)
    t.ok(req.body.indexOf('formValue') !== -1)
    t.ok(req.body.endsWith(boundary + '--\r\n'))
    t.end()
  })
})

tape('custom boundary', function (t) {
  var boundary = 'X-FORM-DATA-BOUNDARY'
  request.post({
    url: server.url,
    headers: {
      'content-type': 'multipart/form-data; boundary=' + boundary
    },
    formData: {
      formKey: 'formValue'
    }
  }, function (err, res, body) {
    var req = JSON.parse(body)
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(req.headers['content-type'], 'multipart/form-data; boundary=' + boundary)
    t.ok(req.body.startsWith('--' + boundary))
    t.ok(req.body.indexOf('name="formKey"') !== -1)
    t.ok(req.body.indexOf('formValue') !== -1)
    t.ok(req.body.endsWith(boundary + '--\r\n'))
    t.end()
  })
})

tape('custom boundary within quotes', function (t) {
  var boundary = 'X-FORM-DATA-BOUNDARY'
  request.post({
    url: server.url,
    headers: {
      'content-type': 'multipart/form-data; boundary="' + boundary + '"'
    },
    formData: {
      formKey: 'formValue'
    }
  }, function (err, res, body) {
    var req = JSON.parse(body)
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(req.headers['content-type'], 'multipart/form-data; boundary=' + boundary)
    t.ok(req.body.startsWith('--' + boundary))
    t.ok(req.body.indexOf('name="formKey"') !== -1)
    t.ok(req.body.indexOf('formValue') !== -1)
    t.ok(req.body.endsWith(boundary + '--\r\n'))
    t.end()
  })
})

tape('custom boundary with content-length', function (t) {
  var boundary = 'X-FORM-DATA-BOUNDARY'
  request.post({
    url: server.url,
    headers: {
      // @note `content-type` header is not re-calculated if `content-length`
      // is present for formData body
      'content-type': 'multipart/anything; boundary=' + boundary,
      'content-length': '111'
    },
    formData: {
      formKey: 'formValue'
    }
  }, function (err, res, body) {
    var req = JSON.parse(body)
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(req.headers['content-type'], 'multipart/anything; boundary=' + boundary)
    t.equal(req.headers['content-length'], '111')
    t.ok(req.body.startsWith('--' + boundary))
    t.ok(req.body.indexOf('name="formKey"') !== -1)
    t.ok(req.body.indexOf('formValue') !== -1)
    t.ok(req.body.endsWith(boundary + '--\r\n'))
    t.end()
  })
})

tape('custom boundary with single quotations', function (t) {
  var boundary = '"X-FORM-DATA-BOUNDARY'
  request.post({
    url: server.url,
    headers: {
      'content-type': 'multipart/form-data; boundary=' + boundary
    },
    formData: {
      formKey: 'formValue'
    }
  }, function (err, res, body) {
    var req = JSON.parse(body)
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(req.headers['content-type'], 'multipart/form-data; boundary=' + boundary)
    t.ok(req.body.startsWith('--' + boundary))
    t.ok(req.body.indexOf('name="formKey"') !== -1)
    t.ok(req.body.indexOf('formValue') !== -1)
    t.ok(req.body.endsWith(boundary + '--\r\n'))
    t.end()
  })
})

tape('cleanup', function (t) {
  server.destroy(function () {
    t.end()
  })
})