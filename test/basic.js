/* eslint-env mocha */

const multerS3StoreLib = require('../dist')
const { AUTO_CONTENT_TYPE } = multerS3StoreLib;
const MulterS3Store = multerS3StoreLib.default;
var fs = require('fs')
var path = require('path')
var extend = require('xtend')
var assert = require('assert')
var multer = require('multer')
var stream = require('stream')
var FormData = require('form-data')
var onFinished = require('on-finished')
var mockS3 = require('./util/mock-s3')

var VALID_OPTIONS = {
  bucket: 'string'
}

function submitForm (multer, form, cb) {
  form.getLength(function (err, length) {
    if (err) return cb(err)

    var req = new stream.PassThrough()

    req.complete = false
    form.once('end', function () {
      req.complete = true
    })

    form.pipe(req)
    req.headers = {
      'content-type': 'multipart/form-data; boundary=' + form.getBoundary(),
      'content-length': length
    }

    multer(req, null, function (err) {
      onFinished(req, function () { cb(err, req) })
    })
  })
}

describe('MulterS3Store', function () {
  it('is exposed as a class', function () {
    assert.equal(typeof MulterS3Store, 'function')
  })

  it('upload files', function (done) {
    var s3 = mockS3()
    var form = new FormData()
    var storage = new MulterS3Store({ s3: s3, bucket: 'test' })
    var upload = multer({ storage: storage })
    var parser = upload.single('image')
    var image = fs.createReadStream(path.join(__dirname, 'files', 'ffffff.png'))

    form.append('name', 'Multer')
    form.append('image', image)

    submitForm(parser, form, function (err, req) {
      assert.ifError(err)

      assert.equal(req.body.name, 'Multer')

      assert.equal(req.file.fieldname, 'image')
      assert.equal(req.file.originalname, 'ffffff.png')
      assert.equal(req.file.size, 68)
      assert.equal(req.file.bucket, 'test')
      assert.equal(req.file.etag, 'mock-etag')
      assert.equal(req.file.location, 'mock-location')

      done()
    })
  })

  it('uploads file with AES256 server-side encryption', function (done) {
    var s3 = mockS3()
    var form = new FormData()
    var storage = new MulterS3Store({ s3: s3, bucket: 'test', serverSideEncryption: 'AES256' })
    var upload = multer({ storage: storage })
    var parser = upload.single('image')
    var image = fs.createReadStream(path.join(__dirname, 'files', 'ffffff.png'))

    form.append('name', 'Multer')
    form.append('image', image)

    submitForm(parser, form, function (err, req) {
      assert.ifError(err)

      assert.equal(req.body.name, 'Multer')

      assert.equal(req.file.fieldname, 'image')
      assert.equal(req.file.originalname, 'ffffff.png')
      assert.equal(req.file.size, 68)
      assert.equal(req.file.bucket, 'test')
      assert.equal(req.file.etag, 'mock-etag')
      assert.equal(req.file.location, 'mock-location')
      assert.equal(req.file.serverSideEncryption, 'AES256')

      done()
    })
  })

  it('uploads file with AWS KMS-managed server-side encryption', function (done) {
    var s3 = mockS3()
    var form = new FormData()
    var storage = new MulterS3Store({ s3: s3, bucket: 'test', serverSideEncryption: 'aws:kms' })
    var upload = multer({ storage: storage })
    var parser = upload.single('image')
    var image = fs.createReadStream(path.join(__dirname, 'files', 'ffffff.png'))

    form.append('name', 'Multer')
    form.append('image', image)

    submitForm(parser, form, function (err, req) {
      assert.ifError(err)

      assert.equal(req.body.name, 'Multer')

      assert.equal(req.file.fieldname, 'image')
      assert.equal(req.file.originalname, 'ffffff.png')
      assert.equal(req.file.size, 68)
      assert.equal(req.file.bucket, 'test')
      assert.equal(req.file.etag, 'mock-etag')
      assert.equal(req.file.location, 'mock-location')
      assert.equal(req.file.serverSideEncryption, 'aws:kms')

      done()
    })
  })

  it('uploads PNG file with correct content-type', function (done) {
    var s3 = mockS3()
    var form = new FormData()
    var storage = new MulterS3Store({ s3: s3, bucket: 'test', serverSideEncryption: 'aws:kms', contentType: AUTO_CONTENT_TYPE })
    var upload = multer({ storage: storage })
    var parser = upload.single('image')
    var image = fs.createReadStream(path.join(__dirname, 'files', 'ffffff.png'))

    form.append('name', 'Multer')
    form.append('image', image)

    submitForm(parser, form, function (err, req) {
      assert.ifError(err)

      assert.equal(req.body.name, 'Multer')

      assert.equal(req.file.fieldname, 'image')
      assert.equal(req.file.contentType, 'image/png')
      assert.equal(req.file.originalname, 'ffffff.png')
      assert.equal(req.file.size, 68)
      assert.equal(req.file.bucket, 'test')
      assert.equal(req.file.etag, 'mock-etag')
      assert.equal(req.file.location, 'mock-location')
      assert.equal(req.file.serverSideEncryption, 'aws:kms')

      done()
    })
  })

  it('uploads SVG file with correct content-type', function (done) {
    var s3 = mockS3()
    var form = new FormData()
    var storage = new MulterS3Store({ s3: s3, bucket: 'test', serverSideEncryption: 'aws:kms', contentType: AUTO_CONTENT_TYPE })
    var upload = multer({ storage: storage })
    var parser = upload.single('image')
    var image = fs.createReadStream(path.join(__dirname, 'files', 'test.svg'))

    form.append('name', 'Multer')
    form.append('image', image)

    submitForm(parser, form, function (err, req) {
      assert.ifError(err)

      assert.equal(req.body.name, 'Multer')

      assert.equal(req.file.fieldname, 'image')
      assert.equal(req.file.contentType, 'image/svg+xml')
      assert.equal(req.file.originalname, 'test.svg')
      assert.equal(req.file.size, 100)
      assert.equal(req.file.bucket, 'test')
      assert.equal(req.file.etag, 'mock-etag')
      assert.equal(req.file.location, 'mock-location')
      assert.equal(req.file.serverSideEncryption, 'aws:kms')

      done()
    })
  })
})
