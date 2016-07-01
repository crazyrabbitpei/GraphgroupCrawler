var request = require('request');
var http = require('http');
var fs = require('fs');
var S = require('string');
var dateFormat = require('dateformat');
var now = new Date();
var matchGame = require('./tool/notice');
var myModule = require('./run');
var HashMap = require('hashmap');
var LineByLineReader = require('line-by-line');
var CronJob = require('cron').CronJob;
var group_id = new HashMap();
var crawled_map = new HashMap();
var comments_map = new HashMap();

var count=0;

var service1 = JSON.parse(fs.readFileSync('./service/shadow'));
var write2fileInterval = service1['write2fileInterval'];
var id_manage_dir = service1['id_manage_dir'];
var crawled_file = service1['crawled_file'];
var comments_file = service1['comments_file'];
var group_lasttime_file = service1['group_lasttime_file'];

var job = new CronJob(write2fileInterval, function() {
        console.log('write2file...');
        write2file();
}, null, false, 'Asia/Taipei');
job.start();

function crawlerFB(token,fin){
    var groupid = myModule.groupid;
    var version = myModule.version;
    var limit = myModule.limit;
    var dir = myModule.dir;
    var depth = myModule.depth;
    var appid = myModule.appid;
    var yoyo = myModule.yoyo;
    if(group_id.count()<=0){
        readGroup_id(function(){
            readCrawled_map(function(){
                readComments_map(function(){
                    var lasttime = group_id.get(groupid);
                    if(typeof lasttime==='undefined'){
                        console.log('['+groupid+'] first crawle');
                    }
                    else{
                        console.log('['+groupid+']  last time:'+lasttime);
                    }
                    crawlerFB(token,fin);
                });
            });
        });
    }
    else{

        //console.log("url:"+"https://graph.facebook.com/"+version+"/"+groupid+"/feed?access_token="+token+"&limit="+limit);
        request({
            uri: "https://graph.facebook.com/"+version+"/"+groupid+"/feed?access_token="+token+"&limit="+limit,
        },function(error, response, body){
	    //console.log("error:"+error);
	    if(!error&&response.statusCode==200){

		var err_flag=0;
		try{
		    var feeds = JSON.parse(body);
		}
		catch(e){
		    console.log("[crawlerFB] error:"+e);
		    fs.appendFile(dir+"/"+groupid+"/err_log","error:"+e+"\ncrawlerFB:"+body+"\n",function(){});
		    err_flag=1;
		}
		finally{
		    if(err_flag==1){
			fin("err");
		    }
		    else{
			if(feeds['error']){
			    fs.appendFile(dir+"/"+groupid+"/err_log","crawlerFB:"+body+"\n",function(){});
			    console.log("[crawlerFB] error:"+feeds['error']);
			    fin("err");
			    return;
			}
			fs.writeFile(dir+"/"+groupid+"/nextpage",feeds['paging'].next,function(){
			});
			isCrawled(feeds,token,function(result){
			    if(result!=-1){
				try{
				    nextPage(feeds['paging'].next,depth-1,token,fin);
				}
				catch(e){
				    console.log("crawlerFB:"+e);
				    fin('err');
				}
			    }
			    else{
				fin('end');
			    }
			});
		    }

		}
	    }
	    else{
		if(error){
		    console.log("error:"+error);
		    if(error.code.indexOf('TIME')!=-1){
			setTimeout(function(){
			    crawlerFB(token,fin);
			},again_time*1000);
		    }
		}
		else if(response.statusCode>600&&response.statusCode<=500){
		    setTimeout(function(){
			crawlerFB(token,fin);
		    },again_time*1000);
		}
		else{
		    fin('error');
		}
	    }

        });
    }

}

exports.crawlerFB = crawlerFB;

function nextPage(npage,depth_link,token,fin){
    var groupid = myModule.groupid;
    var version = myModule.version;
    var limit = myModule.limit;
    var dir = myModule.dir;
    var depth = myModule.depth;
    var appid = myModule.appid;
    var yoyo = myModule.yoyo;
    request({
        uri:npage,
    },function(error, response, body){
	if(!error&&response.statusCode==200){
	    var err_flag=0;
            try{
                var feeds = JSON.parse(body);
            }
            catch(e){
                console.log("nextPage:"+e);
		fs.appendFile(dir+"/"+groupid+"/err_log","error:"+e+"\nnextPage:"+body+"\n",function(){});
		err_flag=1;
            }
	    finally{
		if(err_flag==1){
		    fin('err');
		    return;
		}

                if(feeds['error']){
                    fs.appendFile(dir+"/"+groupid+"/err_log","nextPage:"+body+"\n",function(){});
		    console.log("[nextPage] error:"+feeds['error']);
		    fin('err');
                    return;
                }
                if(feeds['data']){
                    fs.writeFile(dir+"/"+groupid+"/nextpage",feeds['paging'].next,function(){
                    });
                    isCrawled(feeds,token,function(result){
                        if(result!=-1){
                            nextPage(feeds['paging'].next,depth_link-1,token,fin);
                        }
                        else{
                            fin('end');
                        }
                    });
                }

            }

        }
        else{
            if(error){
                console.log("error:"+error);
                if(error.code.indexOf('TIME')!=-1){
                    setTimeout(function(){
                        nextPage(npage,depth_link,token,fin);
                    },again_time*1000);
                }
            }
            else if(response.statusCode>600&&response.statusCode<=500){
                setTimeout(function(){
                    nextPage(npage,depth_link,token,fin);
                },again_time*1000);
            }
            else{
                fin('error');
            }
        }

    });

}

function isCrawled(feeds,token,fin){
    var check=0;
    var full_id,article_id,article_id,article_updated,blink;
    var i;
    var groupid = myModule.groupid;
    var version = myModule.version;
    var limit = myModule.limit;
    var dir = myModule.dir;
    var depth = myModule.depth;
    var appid = myModule.appid;
    var yoyo = myModule.yoyo;
    for(i=0;i < feeds['data'].length;i++){
        full_id = feeds['data'][i].id;
        article_id = feeds['data'][i].id.split("_");
        article_id = article_id[1];
        article_updated = feeds['data'][i].updated_time;
        if(group_id.has(groupid)){
            var last_time = group_id.get(groupid);
            if(new Date(last_time).getTime()>=new Date(article_updated).getTime()){
                //console.log("==end==");
                check=-1;
                break;
            }
        }
        if(crawled_map.has(article_id)&&check!=-1){
            var last_time = crawled_map.get(article_id);
            if(new Date(last_time).getTime()<new Date(article_updated).getTime()){
                crawled_map.set(article_id,article_updated);
                console.log("["+article_id+"] was updated:");
                fetchComment(full_id,article_updated,token);
            }
            else{
                if(new Date(last_time).getTime()<new Date(article_updated).getTime()){
                    console.log("["+article_id+"] post was not updated");
                }
            }
        }
        else{
            crawled_map.set(article_id,article_updated);
            console.log("new posts");
            blink="https://www.facebook.com/groups/"+groupid+"/permalink/"+article_id;
            matchGame.convert(article_updated,feeds['data'][i].message,blink,"","ori");
        }
    }//for loop end
    group_id.set(groupid,feeds['data'][0].updated_time);
    fin(check);
}
function fetchComment(full_id,article_updated,token){
    var groupid = myModule.groupid;
    var again_time = myModule.again_time;
    var version = myModule.version;
    var limit = myModule.limit;
    var dir = myModule.dir;
    var depth = myModule.depth;
    var appid = myModule.appid;
    var yoyo = myModule.yoyo;
    request({
        uri: "https://graph.facebook.com/"+version+"/"+full_id+"/?fields=message,from,comments,updated_time,id&access_token="+token,
    },function(error, response, body){
        if(!error&&response.statusCode==200){
            if(typeof body ==="undefined"){
                fs.appendFile(dir+"/"+groupid+"/err_log","body undefined\n",function(){});
                setTimeout(function(){
                    fetchComment(full_id,article_updated,token);
                },again_time*1000);
            }
            else{
                var err_flag=0;
                try{
                    var detail = JSON.parse(body);
                    if(typeof detail ==="undefined"){
                        fs.appendFile(dir+"/"+groupid+"/err_log","detail undefined:"+body+"\n",function(){});
                        setTimeout(function(){
                            fetchComment(full_id,article_updated,token);
                        },again_time*1000);
                        err_flag=1;
                        return;

                    }
                }
                catch(e){
                    console.log("[fetchComment] error:"+e);
                    err_flag=1;
                    fs.appendFile(dir+"/"+groupid+"/err_log","error:"+e+"\nisCrawled:"+body+"\n",function(){});
                }
                finally{
                    if(err_flag==1){
                        return;
                    }
                    else{
                        if(detail['error']){
                            fs.appendFile(dir+"/"+groupid+"/err_log","isCrawled:"+body+"\n",function(){});
                            console.log("[fetchComment] error seed:"+dir+"/"+groupid+"/err_log");
                            return;
                        }

                        if(detail['comments']){
                            var j,comments_length,index;
                            var comment_id,updated_id;
                            var has_author_comment=0;
                            comments_length = detail['comments'].data.length;
                            for(j=comments_length-1;j>=0;j--){
                                comment_id = detail['comments'].data[j].id;
                                //the new comment which was written by author is the newset comment.
                                if(!comments_map.has(comment_id)&&detail['comments'].data[j].from.id==detail['from'].id&&detail['comments'].data[j].created_time==detail['updated_time']){
                                    comments_map.set(comment_id,1);
                                    has_author_comment=1;
                                    updated_id = detail['id'].split("_");
                                    blink="https://www.facebook.com/groups/"+groupid+"/permalink/"+updated_id[1];
                                    matchGame.convert(detail['comments'].data[j].created_time,detail['message'],blink,detail['comments'].data[j].message,"comment");
                                }
                                //the new comment which was written by author is not the newset comment.
                                else if(!comments_map.has(comment_id)&&detail['comments'].data[j].from.id==detail['from'].id){
                                    comments_map.set(comment_id,1);
                                    has_author_comment=2;
                                    updated_id = detail['id'].split("_");
                                    blink="https://www.facebook.com/groups/"+groupid+"/permalink/"+updated_id[1];
                                    matchGame.convert(detail['comments'].data[j].created_time,detail['message'],blink,detail['comments'].data[j].message,"comment");
                                    break;//only read one comment that is post by author last time
                                }
                                else if(comments_map.has(comment_id)){
                                    break;//no new commwnts
                                }
                            }
                            if(has_author_comment==0){
                                console.log("["+detail['id']+"] was not updated by author skip it");
                            }
                            else if(has_author_comment==1){
                                console.log("["+detail['id']+"] comment written by author is the newest");
                            }
                            else if(has_author_comment==2){
                                console.log("["+detail['id']+"] comment written by author is not the newest");
                            }
                        }
                        else{
                            console.log('['+detail['id']+'] no comments');
                        }
                    }
                }
            }
        }
        else{
            if(error){
                console.log("[fetchComment] error:"+error);
                if(error.code.indexOf('TIME')!=-1){
                    setTimeout(function(){
                        fetchComment(full_id,article_updated,token);
                    },again_time*1000);
                }
                else{
                    fs.appendFile(dir+"/"+groupid+"/err_log",error+"\n",function(){});
                }
            }
            else if(response.statusCode<600&&response.statusCode>=500){
                setTimeout(function(){
                    fetchComment(full_id,article_updated,token);
                },again_time*1000);
            }
        }
    });
}

function write2file(){
    var groupid = myModule.groupid;
    var dir = myModule.dir;
    var i;
    var keys,values,result='';

    keys = group_id.keys();
    values = group_id.values();
    for(i=0;i<keys.length;i++){
        if(result==''){
            result=keys[i]+','+values[i];
        }
        else{
            result+='\n'+keys[i]+','+values[i];
        }
    }
    if(result!=''){
        fs.writeFile(id_manage_dir+"/"+group_lasttime_file,result+'\n',function(err){
            if(err){console.log(err)};
            console.log('[group_lasttime_file] done');
        });

    }


    result='';
    keys = crawled_map.keys();
    values = crawled_map.values();
    for(i=0;i<keys.length;i++){
        if(result==''){
            result=keys[i]+','+values[i];
        }
        else{
            result+='\n'+keys[i]+','+values[i];
        }
    }
    if(result!=''){
        fs.writeFile(dir+"/"+groupid+"/"+crawled_file,result+'\n',function(err){
            if(err){console.log(err)};
            console.log('[crawled_file] done');
        });
    }

    result='';
    keys = comments_map.keys();
    values = comments_map.values();
    for(i=0;i<keys.length;i++){
        if(result==''){
            result=keys[i]+','+values[i];
        }
        else{
            result+='\n'+keys[i]+','+values[i];
        }

    }
    if(result!=''){
        fs.writeFile(dir+"/"+groupid+"/"+comments_file,result+'\n',function(err){
            if(err){console.log(err)};
            console.log('[comments_file] done');
        });

    }
}

function readGroup_id(fin){
    var groupid = myModule.groupid;
    var dir = myModule.dir;
    var lr = new LineByLineReader(id_manage_dir+'/'+group_lasttime_file);
    lr.on('error', function (err) {
        console.log('[readGroup_id] '+err);
    });

    lr.on('line', function (line) {
        var parts = line.split(',');
        group_id.set(parts[0],parts[1]);
    });

    lr.on('end', function () {
        fin('');
    });

}
function readCrawled_map(fin){
    var groupid = myModule.groupid;
    var dir = myModule.dir;
    var lr = new LineByLineReader(dir+'/'+groupid+'/'+crawled_file);
    lr.on('error', function (err) {
        console.log('[readCrawled_map] '+err);
    });

    lr.on('line', function (line) {
        var parts = line.split(',');
        crawled_map.set(parts[0],parts[1]);
    });

    lr.on('end', function () {
        fin('');
    });
}
function readComments_map(fin){
    var groupid = myModule.groupid;
    var dir = myModule.dir;
    var lr = new LineByLineReader(dir+'/'+groupid+'/'+comments_file);

    lr.on('error', function (err) {
        console.log('[readComments_map] '+err);
    });

    lr.on('line', function (line) {
        var parts = line.split(',');
        comments_map.set(parts[0],parts[1]);
    });

    lr.on('end', function () {
        fin('');
    });

}
