'use strict';

const PORT = 8000;
const HOST = 'localhost';

const DATABASE =  {
	host: 'localhost',
	database:'user',
	user:'',
	password:'',
	port:27017
};

const key = 'secretkey';

module.exports = {
	PORT : PORT,
	HOST : HOST,
	DATABASE : DATABASE,
	key : key
};
