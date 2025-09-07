const AWS = require('aws-sdk');
const fs = require('fs');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const uploadToS3 = (filePath, fileName, bucketName) => {
  const fileContent = fs.readFileSync(filePath);
  
  const params = {
    Bucket: bucketName,
    Key: fileName,
    Body: fileContent
  };
  
  return s3.upload(params).promise();
};

module.exports = { uploadToS3 };