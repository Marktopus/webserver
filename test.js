var request = require('request');
var moment = require('moment');

var user = process.argv[2];
if(!user)
	user = 'mark-lauzon';

request('http://' + user + '.cs261.net/api/v1/motd', function(error, response. body){

	if(error)
		console.log(error);
	else if(response.statusCode !== 200)
		console.log(response.statusCode);
	else
	{
		var result = JSON.parse(body);
		console.log(result.data.motd);
		console.log("");

		var ago = moment(result.data.lastModified).fromNow();
		console.log("last modified " + ago + ".");
	}
});

console.log("request called but not returned.");
