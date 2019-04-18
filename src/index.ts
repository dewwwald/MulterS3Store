/// <reference path="index.d.ts" />

import crypto from 'crypto';
import stream from 'stream';
import fileType from 'file-type';
import isSvg from 'is-svg';
import parallel from 'run-parallel';

function staticValue (value): MulterS3StoreFunction {
  return function (req: any, file: any, cb: MulterS3StoreCallbackFunction) {
    cb(null, value)
  }
}

const defaultAcl = staticValue('private');
const defaultContentType = staticValue('application/octet-stream');
const defaultMetadata = staticValue(null);
const defaultCacheControl = staticValue(null);
const defaultContentDisposition = staticValue(null);
const defaultStorageClass = staticValue('STANDARD');
const defaultSSE = staticValue(null);
const defaultSSEKMS = staticValue(null);

function defaultKey (req: any, file: any, cb: MulterS3StoreCallbackFunction) {
  crypto.randomBytes(16, function (err, raw) {
    cb(err, err ? undefined : raw.toString('hex'))
  })
}

function getChunkMime(firstChunk) {
  const type = fileType(firstChunk)
  if (type) {
    return type.mime;
  } else if (isSvg(firstChunk)) {
    return 'image/svg+xml';
  } else {
    return 'application/octet-stream';
  }
}

function autoContentType (req, file, cb) {
  file.stream.once('data', function (firstChunk) {
    const mime = getChunkMime(firstChunk);
    const outStream = new stream.PassThrough()
    outStream.write(firstChunk)
    file.stream.pipe(outStream)
    cb(null, mime, outStream)
  })
}

export default class MulterS3Storage {
  s3;
  getBucket: MulterS3StoreFunction;
  getKey: MulterS3StoreFunction;
  getAcl;
  getContentType;
  getMetadata;
  getCacheControl;
  getContentDisposition;
  getStorageClass;
  getSSE;
  getSSEKMS;

  private collect(req: any, file: any, cb: MulterS3StoreCallbackFunction) {
    parallel([
      this.getBucket.bind(this, req, file),
      this.getKey.bind(this, req, file),
      this.getAcl.bind(this, req, file),
      this.getMetadata.bind(this, req, file),
      this.getCacheControl.bind(this, req, file),
      this.getContentDisposition.bind(this, req, file),
      this.getStorageClass.bind(this, req, file),
      this.getSSE.bind(this, req, file),
      this.getSSEKMS.bind(this, req, file)
    ], (err, values) => {
      if (err) return cb(err)
  
      this.getContentType(req, file, (err, contentType, replacementStream) => {
        if (err) {
          cb(err);
        } else {
          cb.call(this, null, {
            "bucket": values[0],
            "key": values[1],
            "acl": values[2],
            "metadata": values[3],
            "cacheControl": values[4],
            "contentDisposition": values[5],
            "storageClass": values[6],
            "contentType": contentType,
            "replacementStream": replacementStream,
            "serverSideEncryption": values[7],
            "sseKmsKeyId": values[8]
          });
        }
      });
    })
  }

  constructor(opts: MulterS3StoreConfig) {
    this.s3 = opts.s3
    this.getKey = opts.key || defaultKey;

    switch (typeof opts.bucket) {
      case 'function': this.getBucket = opts.bucket; break
      case 'string': this.getBucket = staticValue(opts.bucket); break
      default: throw new TypeError('Expected opts.bucket to be undefined, string or function')
    }
  
    switch (typeof opts.acl) {
      case 'function': this.getAcl = opts.acl; break
      case 'string': this.getAcl = staticValue(opts.acl); break
      case 'undefined': this.getAcl = defaultAcl; break
    }
  
    switch (typeof opts.contentType) {
      case 'function': this.getContentType = opts.contentType; break
      case 'undefined': this.getContentType = defaultContentType; break
    }
  
    switch (typeof opts.metadata) {
      case 'function': this.getMetadata = opts.metadata; break
      case 'undefined': this.getMetadata = defaultMetadata; break
    }
  
    switch (typeof opts.cacheControl) {
      case 'function': this.getCacheControl = opts.cacheControl; break
      case 'string': this.getCacheControl = staticValue(opts.cacheControl); break
      case 'undefined': this.getCacheControl = defaultCacheControl; break
    }
  
    switch (typeof opts.contentDisposition) {
      case 'function': this.getContentDisposition = opts.contentDisposition; break
      case 'string': this.getContentDisposition = staticValue(opts.contentDisposition); break
      case 'undefined': this.getContentDisposition = defaultContentDisposition; break
    }
  
    switch (typeof opts.storageClass) {
      case 'function': this.getStorageClass = opts.storageClass; break
      case 'string': this.getStorageClass = staticValue(opts.storageClass); break
      case 'undefined': this.getStorageClass = defaultStorageClass; break
    }
  
    switch (typeof opts.serverSideEncryption) {
      case 'function': this.getSSE = opts.serverSideEncryption; break
      case 'string': this.getSSE = staticValue(opts.serverSideEncryption); break
      case 'undefined': this.getSSE = defaultSSE; break
    }
  
    switch (typeof opts.sseKmsKeyId) {
      case 'function': this.getSSEKMS = opts.sseKmsKeyId; break
      case 'string': this.getSSEKMS = staticValue(opts.sseKmsKeyId); break
      case 'undefined': this.getSSEKMS = defaultSSEKMS; break
    }
  }

  _handleFile: MulterS3StoreFunction = (req: any, file: any, cb: MulterS3StoreCallbackFunction) => {
    this.collect(req, file, (err: Error | null, opts) => {
      if (err) {
        cb(err)
      } else {
        let currentSize = 0
    
        const params: any = {
          "Bucket": opts.bucket,
          "Key": opts.key,
          "ACL": opts.acl,
          "CacheControl": opts.cacheControl,
          "ContentType": opts.contentType,
          "Metadata": opts.metadata,
          "StorageClass": opts.storageClass,
          "ServerSideEncryption": opts.serverSideEncryption,
          "SSEKMSKeyId": opts.sseKmsKeyId,
          "Body": (opts.replacementStream || file.stream)
        };
    
        if (opts.contentDisposition) {
          params.ContentDisposition = opts.contentDisposition
        }
    
        const upload = this.s3.upload(params);
    
        upload.on('httpUploadProgress', function (event) {
          if (event.total) {
            currentSize = event.total;
          }
        });
    
        upload.send(function (err: Error, result) {
          if (err) {
            cb(err);
          } else {
            cb(null, {
              "size": currentSize,
              "bucket": opts.bucket,
              "key": opts.key,
              "acl": opts.acl,
              "contentType": opts.contentType,
              "contentDisposition": opts.contentDisposition,
              "storageClass": opts.storageClass,
              "serverSideEncryption": opts.serverSideEncryption,
              "metadata": opts.metadata,
              "location": result.Location,
              "etag": result.ETag,
              "versionId": result.VersionId
            });
          }
        });
      }    
    });
  }
  
  _removeFile: MulterS3StoreFunction = (req, file, cb: MulterS3StoreCallbackFunction) => {
    this.s3.deleteObject({ "Bucket": file.bucket, "Key": file.key }, cb)
  }
}
export const AUTO_CONTENT_TYPE = autoContentType;
export const DEFAULT_CONTENT_TYPE = defaultContentType;
