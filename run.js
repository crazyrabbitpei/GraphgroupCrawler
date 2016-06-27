var CronJob = require('cron').CronJob;
var request = require('request');
var http = require('http');
var fs = require('fs');
var iconv = require('iconv-lite');
var cheerio = require("cheerio");
var S = require('string');
var he = require('he');
var punycode = require('punycode');
var dateFormat = require('dateformat');
var now = new Date();
var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport();
var matchGame = require('./tool/notice');
var fbBot = require('./fbbot');

var Bot_runStatus=1;
exports.Bot_runStatus=Bot_runStatus;

try {
    service1 = JSON.parse(fs.readFileSync('./service/shadow'));
    var groupid = service1['id'];
    var again_time = service1['again_time'];
    var write2fileInterval = service1['write2fileInterval'];
    var id_manage_dir = service1['id_manage_dir'];
    var crawled_file = service1['crawled_file'];
    var comments_file = service1['comments_file'];
    var group_lasttime_file = service1['group_lasttime_file'];
    var version = service1['version'];
    var limit = service1['limit'];
    var dir = service1['dir'];
    var depth = service1['depth'];
    var readInterval = service1['readInterval'];

    service2 = JSON.parse(fs.readFileSync('./service/shadowap'));
    var appid = service2['id'];
    var yoyo = service2['yoyo'];
    var tomail = service2['tomail'];
    var frommail = service2['frommail'];
    var mailNoticeTime = service2['mailNoticeTime'];

    exports.groupid=groupid;
    exports.again_time=again_time;
    exports.write2fileInterval=write2fileInterval;
    exports.version=version;
    exports.limit=limit;
    exports.dir=dir;
    exports.depth=depth;
    exports.appid=appid;
    exports.yoyo=yoyo;
    exports.tomail=tomail;
    exports.frommail=frommail;
    
    initFile(dir,groupid,crawled_file);
    initFile(dir,groupid,comments_file);
    initFile(id_manage_dir,'',group_lasttime_file);

}
catch (err) {
    console.error(err);
    process.exit(9);
}
finally{
    get_accessToken(function(token){
        console.log("token:"+token);
        if(token=="error"){
            return;
        }
        else{
            setBot(token,tomail,frommail,readInterval,mailNoticeTime);       
        }
    });
}
function initFile(fdir,fgroupid,filename){
    if(fgroupid==''){
        console.log(fdir+"/"+filename);
        fs.exists(fdir+"/"+filename,function(exists){
            if(!exists){
                fs.mkdir(fdir,function(){
                    console.log("Create "+fdir);
                    fs.writeFile(fdir+"/"+filename,'',function(){
                    });
                });
            }
        });

    }
    else{
        console.log(fdir+"/"+fgroupid+"/"+filename);
        fs.exists(fdir+"/"+fgroupid+"/"+filename,function(exists){
            if(!exists){
                fs.mkdir(fdir,function(){
                    console.log("Create "+fdir);
                    fs.mkdir(fdir+"/"+fgroupid,function(){
                        console.log("Create "+fdir+"/"+fgroupid);
                        fs.writeFile(fdir+"/"+fgroupid+"/"+filename,'',function(){
                        });

                    });

                });
            }
        });

    }

}
function get_accessToken(fin){
    //get access token
    request({
        uri:"https://graph.facebook.com/"+version+"/oauth/access_token?client_id="+appid+"&client_secret="+yoyo+"&grant_type=client_credentials",
    //uri: "https://graph.facebook.com/"+version+"/"+groupid+"/feed?access_token="+accesst+"&limit="+limit,
    },function(error, response, body){
        var token = JSON.parse(body);
        if(token['error']){
            fs.appendFile(dir+"/"+groupid+"/err_log","get_accessToken:"+body+"\n",function(){});
            fin("error");
            return;
        }
        else{
            fin(token['access_token']);
        }
    });

}

function setBot(token,tomail,frommail,readInter,mailNoticeT){
    new CronJob(readInter, function() {//http://sweet.io/p/ncb000gt/node-cron
        try{
            fbBot.crawlerFB(token,function(result){
            });
        }
        catch(e){
            console.log(e);
        }
    }, null, true, 'Asia/Taipei');
    
    new CronJob(mailNoticeT, function() {
        transporter.sendMail({
            from:frommail,
            to:tomail,
            subject:'[FB] Bot Running',
            text:"I'm alive. :)"
        },function(error,info){
            if(error){
                fs.appendFile(dir+"/"+groupid+"/err_log","Can't send mail:"+error+"\n",function(){});
            }
        });

    }, null, true, 'Asia/Taipei');

}
