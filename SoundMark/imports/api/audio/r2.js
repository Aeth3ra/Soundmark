import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Meteor } from "meteor/meteor";

const { accountId, accessKeyId, secretAccessKey, bucketName } =
  Meteor.settings.r2 || {};

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey
  }
});

export const r2Helpers = {
  getSignedUrl: (...args) => awsGetSignedUrl(...args)
};

export const r2Bucket = bucketName;
export {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  getSignedUrl
};
