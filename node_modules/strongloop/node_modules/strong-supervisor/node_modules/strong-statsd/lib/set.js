// Copyright IBM Corp. 2014. All Rights Reserved.
// Node module: strong-statsd
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

// Copyright (c) 2010-2014 Etsy, see LICENSE.etsy
/*jshint node:true, laxcomma:true */

var Set = function() {
  this.store = {};
};

Set.prototype = {
  has: function(value) {
    if (value) {
      return this.store.hasOwnProperty(value);
    } else {
      return false;
    }
  },
  insert: function(value) {
    if (value) {
      this.store[value] = value;
    }
  },
  clear: function() {
    this.store = {};
  },
  values: function() {
    var values = [];
    for (var value in this.store) {
      values.push(value);
    }
    return values;
  }
};

exports.Set = Set;
