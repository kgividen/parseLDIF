var fs = require('fs');
var _ = require('underscore');
var userIds = require("./AmerUserIDS.json");
// Compatibility shims
if (!String.prototype.trim) {
  String.prototype.trim = function () {
      return this.replace(/^\s+|\s+$/g,'');
    };
}

if (!String.prototype.trimRight) {
  String.prototype.trimRight = function () {
      return this.replace(/\s+$/,'');
    };
}

if (!Array.isArray) {
  Array.isArray = function (vArg) {
      return Object.prototype.toString.call(vArg) === "[object Array]";
    };
}

const debugState = false;

/**
*
*  Base64 encode / decode
*  http://www.webtoolkit.info/
*  From http://stackoverflow.com/questions/246801\
*    /how-can-you-encode-to-base64-using-javascript
*
**/
var Base64 = {

  // private property
  _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

  // public method for encoding
  encode : function (input) {
    var output = "";
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    var i = 0;

    input = Base64._utf8_encode(input);

    while (i < input.length) {

      chr1 = input.charCodeAt(i++);
      chr2 = input.charCodeAt(i++);
      chr3 = input.charCodeAt(i++);

      enc1 = chr1 >> 2;
      enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
      enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
      enc4 = chr3 & 63;

      if (isNaN(chr2)) {
        enc3 = enc4 = 64;
      } else if (isNaN(chr3)) {
        enc4 = 64;
      }

      output = output +
        this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
        this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);

    }

    return output;
  },

  // public method for decoding
  decode : function (input) {
    var output = "";
    var chr1, chr2, chr3;
    var enc1, enc2, enc3, enc4;
    var i = 0;

    input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

    while (i < input.length) {

      enc1 = this._keyStr.indexOf(input.charAt(i++));
      enc2 = this._keyStr.indexOf(input.charAt(i++));
      enc3 = this._keyStr.indexOf(input.charAt(i++));
      enc4 = this._keyStr.indexOf(input.charAt(i++));

      chr1 = (enc1 << 2) | (enc2 >> 4);
      chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      chr3 = ((enc3 & 3) << 6) | enc4;

      output = output + String.fromCharCode(chr1);

      if (enc3 != 64) {
        output = output + String.fromCharCode(chr2);
      }
      if (enc4 != 64) {
        output = output + String.fromCharCode(chr3);
      }

    }

    output = Base64._utf8_decode(output);

    return output;

  },

  // private method for UTF-8 encoding
  _utf8_encode : function (string) {
    string = string.replace(/\r\n/g,"\n");
    var utftext = "";

    for (var n = 0; n < string.length; n++) {

      var c = string.charCodeAt(n);

      if (c < 128) {
        utftext += String.fromCharCode(c);
      }
      else if((c > 127) && (c < 2048)) {
        utftext += String.fromCharCode((c >> 6) | 192);
        utftext += String.fromCharCode((c & 63) | 128);
      }
      else {
        utftext += String.fromCharCode((c >> 12) | 224);
        utftext += String.fromCharCode(((c >> 6) & 63) | 128);
        utftext += String.fromCharCode((c & 63) | 128);
      }

    }

    return utftext;
  },

  // private method for UTF-8 decoding
  _utf8_decode : function (utftext) {
    var string = "";
    var i = 0;
    var c = c1 = c2 = 0;

    while ( i < utftext.length ) {

      c = utftext.charCodeAt(i);

      if (c < 128) {
        string += String.fromCharCode(c);
        i++;
      }
      else if((c > 191) && (c < 224)) {
        c2 = utftext.charCodeAt(i+1);
        string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
        i += 2;
      }
      else {
        c2 = utftext.charCodeAt(i+1);
        c3 = utftext.charCodeAt(i+2);
        string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
        i += 3;
      }

    }

    return string;
  }

};

/*
 * All collected fields in my LDIF file

birthday, birthmonth, birthyear, c, cn, description, dn,
facsimiletelephonenumber, givenName, homePhone, l, mail,
mobile, modifytimestamp, mozillaHomeCountryName, mozillaHomeLocalityName,
mozillaHomePostalCode, mozillaHomeState, mozillaHomeStreet,
mozillaHomeUrl, mozillaNickname, mozillaSecondEmail,
mozillaWorkStreet2, mozillaWorkUrl, o, objectclass, ou, postalCode,
sn, st, street, telephoneNumber, title
 */


// RFC 2849 uses givenname, RFC 4519 uses givenName, we rather support
// both
// const usefulFields = ["birthyear", "birthmonth", "birthday", "c", "cn",
//     "description", "facsimiletelephonenumber", "givenName", "homePhone", "l",
//     "mail", "mobile", "mozillaHomeCountryName", "mozillaHomeLocalityName",
//     "mozillaHomePostalCode", "mozillaHomeState", "mozillaHomeStreet",
//     "mozillaHomeUrl", "mozillaNickname", "mozillaSecondEmail",
//     "mozillaWorkStreet2", "mozillaWorkUrl", "o", "ou", "postalCode", "sn",
//     "st", "street", "telephoneNumber", "title", "objectclass", "givenname"
//     ];

const usefulFields = ["dn","cn","givenName", "mail","L",
  "postalCode","postOfficeBox","st","street","sn","telephoneNumber",
  "title","WebidSynchID","webidAddress2","webidCountryCode","webidUserEnteredCompany"
];

function debug(str) {
  if (debugState) {
    if (console) {
      console.log(str);
    }
    else {
      print(str);
    }
  }
}

/**
 * parse LDIF string into JavaScript Object
 *
 * @inStr String
 * @returns Object
 *
 * @todo
 * Tries to follow RFC2849, but
 *   - doesn’t even consider change requests, only complete values
 *   - doesn’t include version: field (seems to be ignored by
 *     Thunderbird as well).
 *   - ignores < links
 */
function parseLDIF(inStr) {
  var record = {},
      key = "",
      value = null,
      splitLine = [],
      colon_idx = 0,
      out_records = [];

  function handleAdding(key, value) {
    value = value ? value.trim() : "";

    // base64 encoded value
    if (value[0] === ":") {
      value = Base64.decode(value.slice(1).trim());
    }

    if (key && (usefulFields.indexOf(key) != -1) &&
         value.length > 0) {
      if (key in this) {
        if (Array.isArray(this[key])) {
          this[key].push(value);
        }
        else {
          this[key] = new Array(this[key]);
          this[key].push(value);
        }
      }
      else {
        this[key] = value;
      }
    }

    key = "";
    value = null;
  }

  record.add = handleAdding; //This gets all the attrs and adds them to the record

  inStr.forEach(function (line) {
      if (line != undefined) {
        line = line.trim();

        if (line.length == 0) {
          // > 1, because we have always .add property
          if (Object.keys(record).length > 1) {
            record.add(key, value);
            delete record.add;
            out_records.push(record);
          }
          record = {};
          record.add = handleAdding;
          key = "";
          value = null;
        }
        else {
          // comment line
          if (line[0] === "#") {
            return ;
          }
          else {
            //This is being used to find the colon indext of the attrs.
            colon_idx = line.indexOf(":");
            line = line.trim();

            // Line continuation
            // This is how it works in THunderbird exported LDIF
            // files, but not what RFC describes ... the first character
            // of continuing entry should be space, and the first line
            // of value should never be empty. Hopefully, this solution
            // should be at least compatible for reading of RFC LDIF
            // files (so it doesn’t hurt)
            if (colon_idx == -1) {
              // multiline value
              if (line[0] === " ") {
                line = line.slice(1);
              }
              value += line;
            }
            else {
              record.add(key, value);

              key = line.slice(0, colon_idx);
              value = line.slice(colon_idx + 1);
            }

          }
        }
      }
  });

  return out_records;
}

if (typeof(exports) !== "undefined") {
  exports.parseLDIF = parseLDIF;
}

// var wantedObjects = ["cn=pcook,ou=AMER,o=Customers", "cn=sehjah,ou=AMER,o=Customers"];

var wantedObjects = [];
//add the ldap junk to the uids
userIds.forEach(function(id){
  var newId = "cn=" + id + ",ou=AMER,o=Customers";
  wantedObjects.push(newId);
});


// fs.readFile('/Users/kgividen/Desktop/joe/smallSample.ldif', 'utf8', function (err,data) {
fs.readFile('/Users/kgividen/Desktop/joe/PartnerBackupAMER.ldif', 'utf8', function (err,data) {
  if (err) {
    return console.log(err);
  }
  data = data.replace(/\r\n/g,"\n");
  var parsedLDIF = parseLDIF(data.split("\n"));

  var wantedLDIFArray = _.filter(parsedLDIF, function(item){
      return _.contains(wantedObjects,item.dn);
  });

  var newLDIF  = "";
  wantedLDIFArray.forEach(function(item){
    _.each(item, function(attr, key){
      //Add each of the attributes to the ldif file
      newLDIF=newLDIF + key + ":" + attr + "\n";
      console.log(attr);
    });
    newLDIF = newLDIF + "\n"; //add a blank line between objs.
    console.log(item);
  });

  console.log(newLDIF);
  fs.writeFile("/Users/kgividen/Desktop/joe/newLDIFFile.ldif", newLDIF, function(err) {
    if(err) {
      return console.log(err);
    }
    console.log("New LDIF is called newLDIFFile.ldif");
  });
});
