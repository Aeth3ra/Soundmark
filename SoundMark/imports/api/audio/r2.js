import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Meteor } from "meteor/meteor";

const { accountId, accessKeyId, secretAccessKey, bucketName } =
  Meteor.settings.private.r2 || {};

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey
  }
});

export const r2Helpers = {
  getSignedUrl: (...args) => getSignedUrl(...args)
};

export const r2Bucket = bucketName;
export {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  getSignedUrl
};
