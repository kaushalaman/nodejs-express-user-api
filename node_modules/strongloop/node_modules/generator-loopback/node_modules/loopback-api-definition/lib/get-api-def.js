// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: loopback-api-definition
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';
var path = require('path');
var yaml = require('js-yaml');
var createSwaggerObject = require('loopback-swagger').generateSwaggerSpec;

/**
 * Generate swagger api definitions
 * Can take in options format and output file.
 * Default format is yaml and output location to current location.

 * @param {Object} loopbackApplication
 * @param {Object} options
 * @returns {String}
 */
function getApiDef(loopbackApplication, options) {
  options = options || {};

  var swaggerObject = createSwaggerObject(loopbackApplication);
  var data = '';
  var outputLocation = options.output;
  var format = options.format || 'yaml';

  if ((format && format.match(/json/i)) ||
    (outputLocation && path.extname(outputLocation) === '.json')) {
    data = JSON.stringify(swaggerObject);
  } else {
    // Remove noises such as undefined from the JSON object so that it won't
    // generate yaml with JS extensions
    swaggerObject = JSON.parse(JSON.stringify(swaggerObject));
    data = yaml.dump(swaggerObject);
  }

  return data;
}

exports.getApiDef = getApiDef;
