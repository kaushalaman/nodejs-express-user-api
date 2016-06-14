var expressJoi = require('express-joi');
var Joi = expressJoi.Joi;

var getUserDetails = {
    Name:expressJoi.Joi.types.String().alphanum().min(2).max(25),
    email: expressJoi.Joi.types.String(),
    username: expressJoi.Joi.types.String(),
    password: expressJoi.Joi.types.String(),
    contact: expressJoi.Joi.types.Number(),
    age: expressJoi.Joi.types.Number()
};

var getLoginParameters = {
    id: expressJoi.Joi.types.String(),
    password: expressJoi.Joi.types.String()
};

module.exports = {
	getUserDetails,
	getLoginParameters
};