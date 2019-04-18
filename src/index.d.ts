interface MulterS3StoreCallbackFunction {
    (e: Error | null, options?: any): void;
}

interface MulterS3StoreFunction {
    (req: any, file: any, cb: MulterS3StoreCallbackFunction): void;
} 

interface MulterS3StoreConfig {
    s3: Object,
    bucket: MulterS3StoreFunction | string,
    key?: MulterS3StoreFunction,
    acl?: () => {} | string,
    contentType?: () => {},
    metadata?: () => {},
    cacheControl?: () => {} | string,
    contentDisposition?: () => {} | string,
    storageClass?: () => {} | string,
    serverSideEncryption?: () => {} | string,
    sseKmsKeyId?: () => {} | string,
}