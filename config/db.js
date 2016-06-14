'use strict';

const mongoose = require('mongoose');
const Config = require('./serverConfig');
mongoose.connect('mongodb://'+Config.DATABASE.host+'/'+Config.DATABASE.database);
const db = mongoose.connection;
db.on('error',console.error.bind(console,'connection error'));
db.once('open',()=>{
 console.log("connection with database successful");
});
 
exports.mongoose = mongoose;
exports.db = db;
