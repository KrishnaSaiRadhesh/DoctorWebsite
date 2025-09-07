const Aws = require("aws-sdk")
const dotenv = require("dotenv")
dotenv.config()
const s3 = new Aws.S3({
    region: process.env.AWS_REGION || "eu-north-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
})

module.exports = s3;