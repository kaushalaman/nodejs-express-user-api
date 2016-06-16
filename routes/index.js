var express = require('express');
var path = require('path');
var router = express.Router();
var User = require('../models/userschema');
var expressJoi = require('express-joi');
var Config = require('../config');
var Joi = expressJoi.Joi;
var async = require('async');
var uid = require('uid2');
var mime = require('mime');
var fs = require('fs');
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'User API' });
  next();
});


// GET test
router.get('/:id',function(req, res){
    res.send({id:req.params.id});
});


// POST test
router.post('/post', function(request, response){
  console.log(request.body);      // your JSON
  response.send(request.body);    // echo the result back
});


//New User register
router.post('/user/api/register', expressJoi.joiValidate(Config.validation.getUserDetails), function(request, response){

var user = new User({
    names: request.body.Name,
    email: request.body.email,
    username: request.body.username,
    password: request.body.password,
    contact: request.body.contact,
    age: request.body.age
});

user.save(user, function(err){
    if(err) {
        response.send({
            statusCode:503,
            message:'User not inserted',
            data:err
        });
        process.exit(1);
    }
    else{
        //console.log('else');
        //console.log(""+request.body.Name);
        User.find({names: request.body.Name},function(err,res){
            if(err){
                console.log(err);
                process.exit(1);
            }
            
            console.log(require('util').inspect(res));
            response.send({
            statusCode:201,
            message:'User is inserted'
            });
        });
      
        console.log('User saved successfully!');
        //process.exit(0);
    }
    
} );
});

//Get users data json
router.get('/users/data', function(request, response){
    async.waterfall([
            function(callback){
                User.find(function(err,res){
            
                        if(err)
                            throw err;
                        if(!res)
                            callback(null,"no result");
                        callback(null,res);
                });
            },

            function(arg, callback){
                callback(null, arg);
            }
        
            ], function(err,res){
                response.send({res});
            });
});

// Login validation
router.post('/user/api/login', expressJoi.joiValidate(Config.validation.getLoginParameters), function(request, response){
    async.waterfall(
        [
            function(callback){
                User.findOne({$or: [{email:request.body.id},{username:request.body.id}]}
                                    , function(err,user){
            
                    if(err)
                        throw err;
                    if(!user)
                    {
                        callback(null,2);
                    }
                    else{
                        callback(null, user);
                    }
                    
                });
            },
            function(arg,callback){
                if(arg===2){
                    callback(null, 2);
                }
                else{
                    arg.comparePassword(request.body.password,function(err,isMatch){
                    if(err)
                        throw err;
                    else if(isMatch)
                    {
                        callback(null, isMatch);
                    }
                    else{
                        callback(null, 'false');
                    }
                }
                );
                }               
            
            }
        ], function(err,res){
            if(res===2){
                response.send({data:"User not found"});
            }
            else if(res==true){
                response.send({
                            statusCode:200,
                            message:'Login Successful',
                            result:res,
                            data:"Welcome "+request.body.id
                        });
                }
            
            else if(res == 'false')
            {
                response.send({
                            message:'Login Failed',
                            result:res,
                            data:"Sorry "
                        });
                }
            }

    );
});

// Delete users collection

router.post('/user/api/delete', function(request, response){
        User.remove({},(err)=>{
            
            if(err){
                response.send({
                    statuscode:503,
                    message:'Problem in deleting users'
                });
            }
            else
            {
                response.send({
                    statusCode:204,
                    message:'All users deleted'
                });
            }
        });
});

// Logout

router.post('/user/api/logout', function(request, response){
    response.send({msg:"all cleared"});
});

// Image Upload
console.log(__dirname);
var TARGET_PATH = path.resolve(__dirname, '../writable/');  
var IMAGE_TYPES = ['image/jpeg', 'image/png'];  
router.post('/image/upload', multipartMiddleware, function(req, res){  
    console.log(req.body, req.files);
    var is;
    var os;
    var targetPath;
    var targetName;
    var tempPath = req.files.file.path;
    console.log(tempPath);
    //get the mime type of the file
    var type = mime.lookup(req.files.file.path);
    console.log("type "+type);
    //get the extension of the file
    var extension = req.files.file.path.split(/[. ]+/).pop();
    console.log("extension "+extension);
    //console.log("try "+TARGET_PATH);
    console.log("image types "+IMAGE_TYPES);
    console.log(IMAGE_TYPES.indexOf(type));
    //check to see if we support the file type
    if (IMAGE_TYPES.indexOf(type) == -1) {
      return res.send(415, 'Supported image formats: jpeg, jpg, jpe, png.');
    }
    console.log("yes");
    //create a new name for the image
    targetName = uid(22) + '.' + extension;
    console.log("target name ",targetName);
    //determine the new path to save the image
    targetPath = path.join(TARGET_PATH, targetName);
    console.log("target path ",targetPath);
    //create a read stream in order to read the file
    is = fs.createReadStream(tempPath);

    //create a write stream in order to write the a new file
    os = fs.createWriteStream(targetPath);

    is.pipe(os);

    //handle error
    is.on('error', function() {
      if (err) {
        return res.send(500, 'Something went wrong');
      }
    });

    //if we are done moving the file
    is.on('end', function() {

      //delete file from temp folder
      fs.unlink(tempPath, function(err) {
        if (err) {
          return res.send(500, 'Something went wrong');
        }

        //send something nice to user
        /*
        res.render('image', {
          name: targetName,
          type: type,
          extension: extension
        });
    */
      });//#end - unlink
    });//#end - on.end
  });

module.exports = router;