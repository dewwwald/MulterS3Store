/// <reference path="../node_modules/aws-sdk/index.d.ts"/>

interface MulterS3StoreCallbackFunction {
    (e: Error | null, ...args: any[]): void;
}

interface MulterS3StoreFunction {
    (req: any, file: any, cb: MulterS3StoreCallbackFunction): void;
} 

interface MulterS3StoreConfig {
    s3: AWS.S3,
    bucket: MulterS3StoreFunction | string,
    key?: MulterS3StoreFunction,
    acl?: MulterS3StoreFunction | string,
    contentType?: MulterS3StoreFunction,
    metadata?: MulterS3StoreFunction,
    cacheControl?: MulterS3StoreFunction | string,
    contentDisposition?: MulterS3StoreFunction | string,
    storageClass?: MulterS3StoreFunction | string,
    serverSideEncryption?: MulterS3StoreFunction | string,
    sseKmsKeyId?: MulterS3StoreFunction | string,
}