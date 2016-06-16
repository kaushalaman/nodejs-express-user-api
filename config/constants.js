'use strict';
const path = require('path');  
const STATUS_CODE = {
	OK: 200,
    CREATED: 201,
    DO_NOT_PROCESS: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    PAYMENT_FAILURE: 402,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    ALREADY_EXISTS_CONFLICT: 409,
    UNSUPPORTED_MEDIA_TYPE: 415,
    SERVER_ERROR: 500
};

const GEO_JSON_TYPES = {
    "Point": "Point"
};


module.exports = {
	STATUS_CODE: STATUS_CODE,
	GEO_JSON_TYPES: GEO_JSON_TYPES,
    
};
