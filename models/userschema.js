'use strict';
'use strict';
var Mongoose = require('mongoose');
var Schema = Mongoose.Schema;
var bcrypt = require('bcrypt');
var moment = require('moment-timezone');
var constants = require('../config/constants.js');

var UserSchema = new Schema(
{
	names: {type: String, required:true},
	email: {type: String, unique:true,required:true,match:/.+@.+\..+/,lowercase:true},
	username : {type: String, unique: true, required: true},
	password : {type: String, required:true},
	contact: {type: String},
	gender : {type: String, enum: ['M', 'F']},
	age: {type:Number},
	isActive: {type: Boolean},

	facebook_id :{type: String, default: 0},
	twitter_id :{type:String},
	google_id :{type:String},
	location_name :{type:String},
	country_name :{type:String},
	location: {
        	'type': {type: String, enum: constants.GEO_JSON_TYPES.Point, default: constants.GEO_JSON_TYPES.Point},
        	 coordinates: {type: [Number], default: [0, 0]}
    },
    description:{type: String,default:null},
    loggedInCount:{type:Number,default:0},
    profile_image_url : {type:String},
    url: {type: String},
    friends_count: {type:Number,default:0},
    status_count : {type: Number,default:0},
    time_zone:{type:String, default:moment().tz('Asia/Kolkata').format()}
},
{ timestamps: { createdAt: 'created_at' } }
);

UserSchema.pre('save',function(next){

	let user = this;
	let SALT_WORK_FACTOR = 10;
	
	bcrypt.genSalt(SALT_WORK_FACTOR,function(err,salt){
		
		if(err){
			return next(err);
		}
		
		bcrypt.hash(user.password,salt,function(err,hash){
			
			if(err)
			{
				return next(err);
			}

			user.password = hash;
			next();
		});
	});

});

//schemaname.methods.fucntion_name predefined method to add methods to models 
UserSchema.methods.comparePassword = function(candidatePassword,cb){
	
	bcrypt.compare(candidatePassword,this.password,function(err,isMatch){
		if(err)
			return cb(err);

		cb(null,isMatch);
	}
	
)};
/*
const TweetSchema = new Schema(
{
	tweet_id : {type: String, unique:true},
	tweet_text : {type: String},
	entities: {},
	location: {
        'type': {type: String, enum: constants.GEO_JSON_TYPES.Point, default: constants.GEO_JSON_TYPES.Point},
        coordinates: {type: [Number], default: [0, 0]}
    },
    username : {type: String},
    name: {type: String},
    profile_image_url : {type:String},
},
{ timestamps: { createdAt: 'created_at' } }
);*/







module.exports = Mongoose.model('UserSchema', UserSchema);
//module.exports = Mongoose.model('TweetSchema',TweetSchema);
