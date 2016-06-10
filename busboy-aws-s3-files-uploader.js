var Busboy = require('busboy');
var AWS = require('aws-sdk');
var _ = require('lodash');

module.exports = function(s3Bucket, s3KeyMaker, additonalS3Options) {
	if (typeof s3KeyMaker !== 'function') throw 's3KeyMaker is required';
	return (function (req, res, next) {
		var contentType = req.headers['content-type'];
		if (req.method.toUpperCase() === 'POST' && contentType && contentType.match(/multipart\/form-data/)){
			var num_files_processed = 0;
			var num_files_to_upload_to_s3 = null;
			req.files = [];
			req.fields = {};
			var busboy = new Busboy({ headers: req.headers });
			busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
				// file is a readable stream
				//console.log('File [' + fieldname + ']: filename: ' + filename + ', encoding: ' + encoding + ', mimetype: ' + mimetype);
				var fileInfo = {fieldname: fieldname, filename: filename, encoding: encoding, mimetype: mimetype};
				var fileObject = {fileInfo: fileInfo, s3Info: {}};
				req.files.push(fileObject);
				var s3 = new AWS.S3();
				var params = {
					Bucket: s3Bucket
					,Key: s3KeyMaker(fileInfo, req)
					,Body: file
				};
				if (additonalS3Options) params = _.assignIn(params, additonalS3Options);
				s3.upload(params)
				.on('httpUploadProgress', function(evt) {
					//console.log(evt);
				}).send(function(err, data) {
					// send completed
					num_files_processed++;
					if (err)
						fileObject.s3Info.err = JSON.parse(JSON.stringify(err));
					else
						fileObject.s3Info.result = JSON.parse(JSON.stringify(data));
					if (typeof num_files_to_upload_to_s3 === 'number') {
						if (num_files_to_upload_to_s3 === num_files_processed) {
							//console.log('All files processed');
							next();
						}
					}
				});
				/*
				file.on('data', function(data) {
					console.log('File [' + fieldname + '] got ' + data.length + ' bytes');
				});
				file.on('end', function() {
					console.log('File [' + fieldname + '] Finished');
				});
				*/
			});
			busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
				req.fields[fieldname] = val;
			});
			busboy.on('finish', function() {
				num_files_to_upload_to_s3 = req.files.length;
			});
			req.pipe(busboy);
		} else
			next();
	});
}