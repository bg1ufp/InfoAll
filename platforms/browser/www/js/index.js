/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

var app = {
    url:"http://192.168.0.106/public/yklj/",
    userlogin:0,
    roadlist:[],
    activejob:{},
    gpsx:0,
    gpsy:0,
    cfgfile:null,

    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        //app.receivedEvent('deviceready');
        app.showabout();
        app.checklogin();
        setInterval(app.getactivedata,2000);    
        setInterval(app.reloadroadselect,30000);
        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fs) {
            console.log('file system open: ' + fs.name);
            fs.root.getFile("config.txt", { create: true, exclusive: false }, function (fileEntry) {
                console.log(fileEntry);
                cfgfile=fileEntry;
                app.readFile(cfgfile);
            }, onErrorCreateFile);

        }, onErrorLoadFs);
        function onErrorCreateFile(evt){
            console.log(evt);
        }
        function onErrorLoadFs(evt){
          console.log(evt);  
        }

        $("#bcamera").click(function(evt){
            navigator.camera.getPicture(onSuccess, onFail, { quality: 50,
                destinationType: Camera.DestinationType.DATA_URL,targetWidth:720,targetHeight:1280
            });
        });

        function onSuccess(imageData) {
            $.post(app.url,{_action:'sendphoto',photo:imageData},function(data){
                alert (data.msg);
            },'json')
        };

        function onFail(message) {
            alert('Failed because: ' + message);
        };
        $("#bhome").click(function(evt){
            app.showabout();
        });
        $("#blogin").click(function(evt){
            var hostip=$("#ihostip").val();
            app.writeFile(cfgfile,JSON.stringify({hostip:hostip}));
            app.url="http://"+hostip+"/public/yklj/";
            console.log(app.url);
            $.post(app.url,{_action:'login',username:$("#iusername").val(),password:$("#ipassword").val(),cid:device.uuid},function(data){
                app.applylogin(data);
                        
            },'json');

        });
        $("#blogout").click(function(evt){
            $.post(app.url,{_action:'logout'},function(data){
                app.applylogout(data);
            },'json');

        });

        $("#roadselect").change(function(evt){
            var rdid = $(this).children('option:selected').val(); 
            if(rdid>0){
                $("#baddjob").removeClass('disabled');
            }
            else{
                $("#baddjob").addClass('disabled'); 
            }
        })

        $("#baddjob").click(function(evt){
            var rdid=$("#roadselect").children('option:selected').val();
            $.post(app.url,{_action:'addjob',roadid:rdid},function(data){
                app.getactivedata();
            },'json');
        }); 
        $("#jobtable").on('click',"a",function(evt){
            var act=$(this).attr('action');
            var id=$(this).attr('jobid');
            $.post(app.url,{_action:act,jobid:id},function(data){
                app.getactivedata();
            },'json');
        })

        $("#bstart").click(function(evt){
            var jobid=app.activejob.id;
            $.post(app.url,{_action:'startjob',jobid:jobid},function(data){
                app.getactivedata();
            },'json');
        }); 
        $("#bfinish").click(function(evt){
            var jobid=app.activejob.id;
            $.post(app.url,{_action:'finishjob',jobid:jobid},function(data){
                app.getactivedata();
            },'json');
        }); 
    },
    writeFile:function(fileEntry, dataObj) {
        fileEntry.createWriter(function (fileWriter) {

            fileWriter.onwriteend = function() {
                console.log("Successful file write...");
            };

            fileWriter.onerror = function (e) {
                console.log("Failed file write: " + e.toString());
            };

            // If data object is not passed in,
            // create a new Blob instead.
            if (!dataObj) {
                dataObj = new Blob(['some file data'], { type: 'text/plain' });
            }

            fileWriter.write(dataObj);
        });
    },
    readFile:function(fileEntry) {
        fileEntry.file(function (file) {
            var reader = new FileReader();
            reader.onloadend = function() {
                console.log("Successful file read: " + this.result);
                console.log(fileEntry.fullPath + ": " + this.result);
                var cfg=JSON.parse(this.result);
                $("#ihostip").val(cfg.hostip);
                app.url="http://"+cfg.hostip+"/public/yklj/";
            };

            reader.readAsText(file);

        }, function(evt){
            console.log(evt);
        });
    },
    showabout:function(){
            var msg="道路检测数据平台测试APP\n Copyright ©2017  bg1ufp@163.com";
            navigator.notification.alert(msg, null, "关于", '确定');
    },

    applylogin:function(data){
        if(data.success){
            this.userlogin=1;
            $("#loginrow").addClass("hide");
            $("#inforow").removeClass("hide");
            $("#gpsrow").removeClass("hide");
            $("#listrow").removeClass("hide");

            $("#lusername").text(data.opName);
            $("#lvehname").text(data.vehName);
            this.getroadlist();
            this.getactivedata();
        }
    },
    applylogout:function(data){
        this.userlogin=0;
        $("#loginrow").removeClass("hide");
        $("#inforow").addClass("hide");
        $("#gpsrow").addClass("hide");
        $("#listrow").addClass("hide");
    },
    checklogin:function(){
        $.post(app.url,{_action:'checklogin'},function(data){
            app.applylogin(data);
        },'json');
    },

    getroadlist:function(){
        $.post(app.url,{_action:'roadlist'},function(data){
            //console.log(data);
            app.roadlist=data.roadlist;
            app.gpsx=data.gpsx;
            app.gpsy=data.gpsy;
            app.reloadroadselect();
        },'json')
    },
    Distance:function( lngA,latA, lngB, latB){
        var earthR = 6371000;
        var pi=3.14;
        latA *= pi / 180;
        lngA *= pi / 180;
        latB *= pi / 180;
        lngB *= pi / 180;
        x = Math.cos(latA) * Math.cos(latB) * Math.cos(lngA - lngB);
        y = Math.sin(latA) * Math.sin(latB);
        s = x + y;
        if (s > 1) {
            s = 1;
        }
        if (s < -1) {
            s = -1;
        }
        return Math.acos(s) * earthR;
    },

    reloadroadselect:function(){
        if(!app.userlogin)return;
        //if(app.activejob)return;
        if(app.gpsx>0){
            $.each(app.roadlist,function(k,d){
                var dist=app.Distance(app.gpsx,app.gpsy,d.rdGpsX,d.rdGpsY);
                d.dist=(dist/1000).toFixed(1)*1.0;
            })  
        }
        app.roadlist.sort(function(r1,r2){
            var d1=r1.dist*1.0;
            var d2=r2.dist*1.0;
            if(d1<d2){
                return -1;
            }
            else if(d1==d2){
                return 0;
            }
            else{
                return 1;
            }
        });
        
        var rdid=$("#roadselect").val();
        $("#roadselect").empty();
        $("#roadselect").append("<option value=0></option>");
        $.each(app.roadlist,function(k,d){
            var label=d.rdName;
            if(d.dist){
                label=d.rdName+"("+d.dist+"km)"             
            }
            $("#roadselect").append("<option value="+d.rdID+">"+label+"</option>");
        })
        $("#roadselect").val(rdid);

    },

    getactivedata:function(){
        if(!app.userlogin){
            app.checklogin();
            return;
        }
        $.post(app.url,{_action:'jobdata',jobid:0},function(data){
            //console.log(data);
            if(!data.authsuccess){
                app.applylogout([]);
            }
            app.updatelisttable(data.joblist);
            $("#l_jobdatatime").text(data.time);
            $("#gpsspeed").text((data.gps.speed*1.852).toFixed(1));
            $("#gpsx").text((data.gps.gpsx*1).toFixed(5));
            $("#gpsy").text((data.gps.gpsy*1).toFixed(5));
            if(data.gps.gpsx>0){
                app.gpsx=data.gps.gpsx;
                app.gpsy=data.gps.gpsy;
            }
        },'json');
    },

    updatelisttable:function(data){
        this.activejob=0;
        $("#bstart").addClass('hide');
        $("#bfinish").addClass('hide');
        $("#bconfirm").addClass('hide');
        $("#jobinfodiv").addClass('hide');
        $("#newjobdiv").addClass('hide');
        $("#jobtable").html("");
        $.each(data,function(k,d){
            info="<tr";
            if(d.state==0){
                info+=" class='success' ";
            }
            info+=">";
            info+="<td>"+d.id
            info+="</td>";
            info+="<td>";
            info+=d.roadname;   
            info+="</td>";
            info+="<td>"+d.timescheduledstrd+" "+d.timescheduledstr+"</td>";
            info+="<td>"+d.timestartstr+"</td>";
            info+="<td>"+d.timefinishstr+"</td>";
            info+="<td>"+d.timeconfirmstr;
            if(d.state==0){
                if(d.timefinish>0){
                    info+="<a href='#' class='btn btn-default btn-xs btn-info' action='confirmjob' jobid="+d.id+">确认</a>";
                }
                if(d.timestart==0){
                    app.activejob=d;
                    $("#bstart").removeClass('hide');
                }
                else if(d.timefinish==0){
                    app.activejob=d;
                    $("#bfinish").removeClass('hide');
                }

            }
            info+="</td>";
            info+="<td>";
            if(d.state==1){
                info+="已确认";
            }
            else if(d.state==-1){
                info+="已取消";
            }
            else if(d.state==0){
                info+="<a href='#' class='btn btn-default btn-xs btn-danger' action='canclejob' jobid="+d.id+">取消</a>";
            }
            info+="</td>";
            info+="<td>"+d.memo+"</td>";
            info+="</tr>";
            $("#jobtable").append(info);//prepend
        })  
        //console.log(activejob);
        if(this.activejob){
            app.showactive(this.activejob);
            $("#jobinfodiv").removeClass('hide');
            $("#newjobdiv").addClass('hide');
            $("#baddjob").addClass('hide');
        }
        else{
            $("#jobinfodiv").addClass('hide');
            $("#newjobdiv").removeClass('hide');
            $("#baddjob").removeClass('hide');
        }
    },

    showactive:function(d){
        $.each(d,function(k,v){
            $("#l_"+k).text(v);
        });
    },


    receivedEvent: function(id) {
        //var parentElement = document.getElementById(id);
        //var listeningElement = parentElement.querySelector('.listening');
        //var receivedElement = parentElement.querySelector('.received');
        //listeningElement.setAttribute('style', 'display:none;');
        //receivedElement.setAttribute('style', 'display:block;');
     }
};
