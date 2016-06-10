var http = require('http');
var express = require('express');
var busboy_s3 = require('./busboy-aws-s3-files-uploader');

var app = express();
				
app.use(function(req, res, next) {
	var req_address = req.connection.remoteAddress;
	console.log('incoming request from ' + req_address + ', path='+ req.path);
	
	next();
})

// setup the s3 uploader
/////////////////////////////////////////////////////////////////////////////////
var s3Bucket = 's3-fkh-tst';

function s3KeyMaker(fileInfo, req) {
	return 'busboy_upload/' + fileInfo.filename;
}
var additonalS3Options = {
	'ACL': 'public-read'
	,'ServerSideEncryption': 'AES256'	
};

app.use(busboy_s3(s3Bucket, s3KeyMaker, additonalS3Options));
/////////////////////////////////////////////////////////////////////////////////

app.post('/upload', function(req, res) {
	console.log('Done parsing form and S3 upload');
	console.log("files=" + JSON.stringify(req.files));
	console.log("form fields=" + JSON.stringify(req.fields));
	res.writeHead(303, { Connection: 'close', Location: '/' });
	res.end();
});

app.get('/', function(req, res) {
    res.writeHead(200, { Connection: 'close' });
    res.end('<html><head></head><body>\
               <form method="POST" enctype="multipart/form-data" action="/upload">\
                <input type="text" name="textfield"><br />\
                <input type="file" name="filefield"><br />\
                <input type="submit">\
              </form>\
            </body></html>');	
});

var server = http.createServer(app);

var port = 8000;
var host = '127.0.0.1';

server.listen(port, host, function() { 
	var host = server.address().address; 
	var port = server.address().port; 
	console.log('application listening at %s://%s:%s', 'http', host, port); 
});