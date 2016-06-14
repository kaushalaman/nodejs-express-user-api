var express = require('express');
var router = express.Router();
var User = require('../models/userschema');
var expressJoi = require('express-joi');
var Config = require('../config');
var Joi = expressJoi.Joi;
var async = require('async');

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
    }
    else{
        response.send({
        statusCode:201,
        message:'User is inserted'
        });
        console.log('User saved successfully!');
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


module.exports = router;