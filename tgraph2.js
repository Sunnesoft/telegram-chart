window.CHRT = (function() {

    var WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var WEEKDAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    var NUMBER_PREF = {
        "3":'K',
        "6":'M',
        "9":'G',
        "12":'T',
        "15":'P',
        "18":'E'
    };

    var ZOOMOUT_ICON = '<div class="tchart_zoom"><span class="tchart_zoom_inner"></span></div>';

    var ISTOUCH = isTouchDevice();
    var MOUSEDOWN = ISTOUCH ? 'touchstart' :'mousedown';
    var MOUSEUP = ISTOUCH? 'touchend' :'mouseup';
    var MOUSEMOVE = ISTOUCH ? 'touchmove' : 'mousemove';
    var MOUSEENTER = ISTOUCH ? 'touchstart' : 'mouseenter';
    var MOUSELEAVE = ISTOUCH ? 'touchend' : 'mouseleave';

    function isTouchDevice() {
        var prefixes = ' -webkit- -moz- -o- -ms- '.split(' ');  
        var mq = function(query) { return window.matchMedia(query).matches; }   
        if (('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch) {return true;}
        var query = ['(', prefixes.join('touch-enabled),('), 'heartz', ')'].join('');
        return mq(query);
    }

    function clientX(e)
    {
        return ISTOUCH ? e.touches[0].clientX : e.clientX;
    }

    function clientY(e)
    {
        return ISTOUCH ? e.touches[0].clientY : e.clientY;
    }

    function offsetX(e)
    {
        return ISTOUCH ?  (e.touches[0].pageX - e.touches[0].target.offsetLeft) : e.offsetX; 
    }

    function target(e)
    {
        return ISTOUCH ?   e.touches[0].target : e.target; 
    }

    function getClosest(elem,cl)
    {
        for ( ; elem && elem !== document; elem = elem.parentNode ) {
            if(elem.classList && elem.classList.contains(cl))
            {
                return elem;
            }
        }

        return undefined;
    }

    function formatDate(date, opt, isFullNames) {
        var result = [];
        isFullNames = isFullNames || false;

        for(var i in opt)
        {
            if(opt.hasOwnProperty(i))
            {
                if (opt[i] == "weekday") 
                {
                    var v = isFullNames ? WEEKDAYS_FULL[date.getDay()] : WEEKDAYS[date.getDay()];
                    result.push(v);
                }
                else if (opt[i] == "month") 
                {
                    var v = isFullNames ? MONTHS_FULL[date.getMonth()] : MONTHS[date.getMonth()];
                    result.push(v);
                }
                else if (opt[i] == "day") 
                {
                    result.push(date.getDate());
                }
                else if (opt[i] == "year") 
                {
                    result.push(date.getFullYear());
                }
                else if (opt[i] == "hour") 
                {
                    result.push(("0" + date.getHours()).substr(-2));
                }
                else if (opt[i] == "min") 
                {
                    result.push(("0" + date.getMinutes()).substr(-2));
                }
                else
                {
                    result.push(opt[i]);
                }  
            }
        }

        return result.join('');
    }

    function round(val,pow) {
        var d = Math.pow(10,pow-1);
        return Math.floor(val / d)/10;
    }

    function roundPow(val,pow) {
        var d = Math.pow(10,pow);
        return Math.floor(val / d)*d;
    }

    function digitsCount(val)
    {
        return Math.log(val) * Math.LOG10E + 1 | 0;
    }

    function formatIntNumber(n, max, min, count)
    {
        var lsb = (max - min)/count;
        var length = digitsCount(lsb) - 1;
        var res = parseInt(n);
        var index = Math.floor(length/3)*3;

        if(NUMBER_PREF.hasOwnProperty(index))
        {
            res = round(res,index);
            res = res != 0 ? res + NUMBER_PREF[index] : res;
        }
        else
        {
            length = length > 1 ? 1 : length;
            res = roundPow(res,length)
        }

        return res;
    }

    function formatPath(parentFolder,timestamp)
    {
        var date = new Date(timestamp);

        var p = [];
        p.push(parentFolder);
        p.push(date.getFullYear());
        p.push("-");
        p.push(("0" + (parseInt(date.getMonth()) + 1)).substr(-2));
        p.push("/");
        p.push(("0" + parseInt(date.getDate())).substr(-2));
        p.push(".json");;

        return p.join('');
    }

    function createElementNS(name,opt)
    {
        var el = document.createElementNS("http://www.w3.org/2000/svg", name);

        for(var k in opt)
        {
            if(opt.hasOwnProperty(k))
            {
                el.setAttributeNS(null, k, opt[k]);
            }
        }

        return el;
    }

    function createElement(name,opt)
    {
        var el = document.createElement(name);

        for(var k in opt)
        {
            if(opt.hasOwnProperty(k))
            {
                el.setAttribute(k, opt[k]);
            }
        }

        return el;
    }

    function getMinOfArray(numArray) {
      return Math.min.apply(null, numArray);
    }

    function getMaxOfArray(numArray) {
      return Math.max.apply(null, numArray);
    }

    function saturation(val,max)
    {
        val = val < 0 ? 0 : val;
        val = val > max ? max : val;
        return val;
    }

    function fetchJSONFile(path, callback) 
    {
        var httpRequest = new XMLHttpRequest();
        httpRequest.onreadystatechange = function() 
        {
            if (httpRequest.readyState === 4) 
            {
                if (httpRequest.status === 200) 
                {
                    var data = JSON.parse(httpRequest.responseText);
                    callback.call(this,data);
                }
            }
        };

        httpRequest.open('GET', path);
        httpRequest.send(); 
    }

    function sortInputData(data)
    {
        var res = {
            data:[],
            yMin:undefined,
            yMax:undefined,
            type:undefined
        };

        var n = data.columns.length;
        res.x = data.columns[0].slice(1,data.columns[0].length);
        res.xMin = getMinOfArray(res.x);
        res.xMax = getMaxOfArray(res.x);
        res.stacked = data.stacked || false;
        res.y_scaled = data.y_scaled || false;
        res.percentage = data.percentage || false;

        for(var i = 1; i < n; ++i)
        {
            var id = data.columns[i][0];
            var el = {opt:{}};
            el.opt["mycolor"] = data.colors[id];
            el.opt["fill"] = "none";
            el.opt["myid"] = id;
            el.opt["mytype"] = data.types[id];
            el.opt["myname"] = data.names[id];
            el.visible = true;
            el.y = data.columns[i].slice(1,data.columns[i].length);
            el.yMin = getMinOfArray(el.y);
            el.yMax = getMaxOfArray(el.y);
            res.type = data.types[id];

            if(el.yMin < res.yMin || res.yMin === undefined)
            {
                res.yMin = el.yMin;
            }

            if(el.yMax > res.yMax || res.yMax === undefined)
            {
                res.yMax = el.yMax;
            }

            res.data.push(el);
        }

        return res;
    }

    function linesCreate(chart)
    {
        chart.viewport = createElementNS("g",{"class":chart.viewportClass});

        chart.res.data.forEach(function(vala, i, a) {
            if(vala.visible == false)
            {
                return;
            }

            var path = [];

            chart.res.x.forEach(function(valb, j, b) {
                var x = (valb-chart.res.xMin)/(chart.res.xMax-chart.res.xMin)*chart.viewportWidth;
                var yMin = chart.res.yMin;
                var yMax = chart.res.yMax;

                if(chart.res.y_scaled == true)
                {
                    yMin = vala.yMin;
                    yMax = vala.yMax;
                }

                var y = (1 - (vala.y[j]-yMin)/(yMax-yMin))*chart.viewportHeight;
                path.push(x+','+y);
            });

            vala.opt["d"] = 'M ' + path.join(' L ');
            vala.opt["fill"] = "none";
            vala.opt["stroke"] = vala.opt["mycolor"];
            vala.opt["stroke-width"] = "2px";

            chart.viewport.appendChild(createElementNS("path",vala.opt));
        });
    }

    function linesUpdate(chart)
    {
        chart.res.data.forEach(function(vala, i, a) {
            chart.viewport.childNodes[i].setAttributeNS(null,"opacity", Number(vala.visible));

            if(vala.visible == false)
            {
                return;
            }

            var path = [];

            chart.res.x.forEach(function(valb, j, b) {
                var x = (valb-chart.res.xMin)/(chart.res.xMax-chart.res.xMin)*chart.viewportWidth;
                var yMin = chart.res.yMin;
                var yMax = chart.res.yMax;

                if(chart.res.y_scaled == true)
                {
                    yMin = vala.yMin;
                    yMax = vala.yMax;
                }

                var y = (1 - (vala.y[j]-yMin)/(yMax-yMin))*chart.viewportHeight;
                path.push(x+','+y);
            });

            var d = 'M ' + path.join(' L ');

            chart.viewport.childNodes[i].setAttributeNS(null,"stroke",vala.opt["mycolor"]);
            chart.viewport.childNodes[i].setAttributeNS(null,"d",d);
        });
    }

    function barsCreate(chart)
    {
        chart.viewport = createElementNS("g",{"class":chart.viewportClass});
        var sumMax = 0;
        var barWidth = chart.viewportWidth/(chart.res.x.length-1);

        chart.res.x.forEach(function(valb, j, b) {
            var x = (valb-chart.res.xMin)/(chart.res.xMax-chart.res.xMin)*chart.viewportWidth;
            
            var sum = 0;
            chart.res.data.forEach(function(vala, i, a) {
                if(vala.visible == false)
                {
                    return;
                }

                if(!a[i].hasOwnProperty('bar'))
                {
                    a[i].bar = [];
                }

                a[i].bar.push([x - barWidth/2,sum,vala.y[j],barWidth]);
                sum += vala.y[j];    
            });

            if(sum > sumMax)
            {
                sumMax = sum;
            }
        });

        chart.res.yMin = 0;
        chart.res.yMax = sumMax;

        chart.res.data.forEach(function(vala, i, a) {
            if(vala.visible == false)
            {
                return;
            }

            vala.opt["fill"] = vala.opt["mycolor"];
            vala.opt["stroke-width"] = "0px";
            vala.opt["stroke"] = vala.opt["mycolor"];

            var y = createElementNS("g",{});

            var up = [];
            var down = [];

            vala.bar.forEach(function(valb, j, b) {
                var y1 = (1 - (valb[1]+valb[2])/sumMax)*chart.viewportHeight;
                var y2 = (1 - (valb[1])/sumMax)*chart.viewportHeight;

                up.push(valb[0] + ',' + y2);
                up.push((valb[0] + valb[3]) + ',' + y2);
                down.unshift(valb[0] + ',' + y1);
                down.unshift((valb[0] + valb[3]) + ',' + y1);
                
            });

            vala.opt["d"] = 'M ' + up.join(' L ') + ' L ' + down.join(' L ') + ' Z';

            y.appendChild(createElementNS("path",vala.opt));  

            chart.viewport.appendChild(y);  
        });  
    }

    function barsMaskCreate(chart)
    {
        var id = Math.floor(Math.random() * (1000 - 0)) + 0;
        chart.defs = createElementNS("defs"); 
        chart.mask = createElementNS("mask",{"id":"tmask"+id}); 
        chart.mask.appendChild(createElementNS("rect",{width:'100%',height:'100%',fill:'white'})); 
        chart.maskActive = createElementNS("path",{fill:'white'});
        chart.mask.appendChild(chart.maskActive);
        chart.defs.appendChild(chart.mask);
        chart.viewport.setAttributeNS(null,"mask","url(#tmask"+id+")");  

        var barWidth = chart.viewportWidth/(chart.res.x.length+1);
        chart.maskActive.setAttributeNS(null,"d",
                ' M ' + 0 + ',' + chart.viewportHeight + ' v -' + chart.viewportHeight
                    + ' h ' + barWidth + ' v ' + chart.viewportHeight + ' h -' + barWidth);       
    }

    function barsMaskUpdate(chart)
    {
        var barWidth = chart.viewportWidth/(chart.res.x.length-1);
        chart.maskActive.setAttributeNS(null,"d",
                ' M ' + 0 + ',' + chart.viewportHeight + ' v -' + chart.viewportHeight
                    + ' h ' + barWidth + ' v ' + chart.viewportHeight + ' h -' + barWidth); 
    }

    function barsForCircleCreate(chart)
    {
        chart.tlvp = createElementNS("g",{"class":chart.viewportClass});
        var sumMax = 0;

        var sum = [];

        chart.res.x.forEach(function(valb, j, b) {
            if(chart.res.xMin > valb || valb > chart.res.xMax)
            {
                return;
            }

            var x = (valb-chart.res.xMin)/(chart.res.xMax-chart.res.xMin)*chart.viewportWidth;

            sum.push(0);
            
            chart.res.data.forEach(function(vala, i, a) {
                if(vala.visible == false)
                {
                    return;
                }

                if(!a[i].hasOwnProperty('bar'))
                {
                    a[i].bar = [];
                }

                a[i].bar.push([x,sum[sum.length-1],vala.y[j]]);
                sum[sum.length-1] += vala.y[j];    
            });
        });

        var barWidth = chart.viewportWidth/(sum.length-1);

        chart.res.data.forEach(function(vala, i, a) {
            if(vala.visible == false)
            {
                return;
            }

            vala.opt["fill"] = vala.opt["mycolor"];
            vala.opt["stroke-width"] = "0px";
            vala.opt["stroke"] = vala.opt["mycolor"];

            var y = createElementNS("g",{});

            var up = [];
            var down = [];

            vala.bar.forEach(function(valb, j, b) {
                var y1 = (1 - (valb[1]+valb[2])/sum[j])*chart.viewportHeight;
                var y2 = (1 - (valb[1])/sum[j])*chart.viewportHeight;

                up.push((valb[0]) + ',' + y2);
                up.push((valb[0]+barWidth) + ',' + y2);
                down.unshift((valb[0]) + ',' + y1);
                down.unshift((valb[0]+barWidth) + ',' + y1);
                
            });

            vala.opt["d"] = 'M ' + up.join(' L ') + ' L ' + down.join(' L ') + ' Z';

            y.appendChild(createElementNS("path",vala.opt)); 

            chart.tlvp.appendChild(y);  
        });   
    }

    function barsUpdate(chart)
    {
        var sumMax = 0;
        var barWidth = chart.viewportWidth/(chart.res.x.length-1);

        chart.res.x.forEach(function(valb, j, b) {
            var x = (valb-chart.res.xMin)/(chart.res.xMax-chart.res.xMin)*chart.viewportWidth;
            
            var sum = 0;
            chart.res.data.forEach(function(vala, i, a) {
                if(vala.visible == false)
                {
                    return;
                }

                 if(!a[i].hasOwnProperty('bar'))
                {
                    a[i].bar = [];
                }

                if(!a[i].bar.hasOwnProperty(j))
                {
                    a[i].bar.push([x - barWidth/2,sum,vala.y[j],barWidth]);
                }
                else
                {
                    a[i].bar[j] = [x - barWidth/2,sum,vala.y[j],barWidth];
                }

                sum += vala.y[j];    
            });

            if(sum > sumMax)
            {
                sumMax = sum;
            }
        });

        chart.res.yMin = 0;
        chart.res.yMax = sumMax;

        chart.res.data.forEach(function(vala, i, a) {
            chart.viewport.childNodes[i].setAttributeNS(null,"opacity", Number(vala.visible));

            if(vala.visible == false)
            {
                return;
            }

            var up = [];
            var down = [];

            vala.bar.forEach(function(valb, j, b) {
                var y1 = (1 - (valb[1]+valb[2])/sumMax)*chart.viewportHeight;
                var y2 = (1 - (valb[1])/sumMax)*chart.viewportHeight;

                up.push(valb[0] + ',' + y2);
                up.push((valb[0] + valb[3]) + ',' + y2);
                down.unshift(valb[0] + ',' + y1);
                down.unshift((valb[0] + valb[3]) + ',' + y1);

            });

            vala.opt["d"] = 'M ' + up.join(' L ') + ' L ' + down.join(' L ') + ' Z';

            chart.viewport.childNodes[i].firstChild.setAttributeNS(null,"d",vala.opt["d"]); 
            chart.viewport.childNodes[i].firstChild.setAttributeNS(null,"fill",vala.opt["mycolor"]);
            chart.viewport.childNodes[i].firstChild.setAttributeNS(null,"stroke",vala.opt["mycolor"]); 
            chart.viewport.childNodes[i].firstChild.setAttributeNS(null,"stroke-width","0px");  
            chart.viewport.childNodes[i].firstChild.setAttributeNS(null,"opacity","1"); 
        }); 
    }

    function areaCreate(chart)
    {
        chart.viewport = createElementNS("g",{"class":chart.viewportClass});

        chart.res.data.forEach(function(vala, i, a) {
            a[i].area = [];
        });

        chart.res.x.forEach(function(valb, j, b) {
            var x = (valb-chart.res.xMin)/(chart.res.xMax-chart.res.xMin)*chart.viewportWidth;
            
            var sum = 0;
            var tmp = {};
            chart.res.data.forEach(function(vala, i, a) {
                if(vala.visible == false)
                {
                    return;
                }

                sum += vala.y[j]; 
                tmp[i] = sum;     
            });

            chart.res.data.forEach(function(vala, i, a) {
                if(vala.visible == false)
                {
                    return;
                }

                var y = (1 - tmp[i]/sum)*chart.viewportHeight;  
                a[i].area.push(x+','+y);     
            });
        });

        chart.res.data.reverse();

        chart.res.data.forEach(function(vala, i, a) {
            if(vala.visible == false)
            {
                return;
            }

            vala.opt["fill"] = vala.opt["mycolor"];
            vala.opt["stroke-width"] = "0px";
            vala.opt["stroke"] = vala.opt["mycolor"];
            vala.opt["transform"] = '';

            vala.opt["d"] = 'M 0,' + chart.viewportHeight + ' L ' + vala.area.join(' L ') + ' L '
                          + chart.viewportWidth + ',' + chart.viewportHeight + ' Z';

            var el = createElementNS("path",vala.opt);

            el.addEventListener(MOUSEENTER,function(e){
                var t = target(e);

                chart.viewport.childNodes.forEach(function(val,i,arr){
                    var trc = val.getAttributeNS(null,"trc");

                    if(!trc)
                    {
                        return;
                    }

                    if(val == t)
                    {
                        val.setAttributeNS(null,"transform",trc);
                        return;                    
                    }

                    val.setAttributeNS(null,"transform","");
                });


                e.preventDefault();
            });  

            el.addEventListener(MOUSELEAVE,function(e){
                chart.viewport.childNodes.forEach(function(val,i,arr){
                    var trc = val.getAttributeNS(null,"trc");

                    if(trc)
                    {
                        val.setAttributeNS(null,"transform","");
                    }
                });
                e.preventDefault();
            });  

            chart.viewport.appendChild(el); 
        });

        chart.res.data.reverse(); 
    }

    function areaUpdate(chart)
    {
        chart.res.data.forEach(function(vala, i, a) {
            a[i].area = a[i].area || [];
        });

        chart.res.x.forEach(function(valb, j, b) {
            var x = (valb-chart.res.xMin)/(chart.res.xMax-chart.res.xMin)*chart.viewportWidth;
            
            var sum = 0;
            var tmp = {};
            chart.res.data.forEach(function(vala, i, a) {
                if(vala.visible == false)
                {
                    return;
                }

                sum += vala.y[j]; 
                tmp[i] = sum;     
            });

            chart.res.data.forEach(function(vala, i, a) {
                if(vala.visible == false)
                {
                    return;
                }

                var y = (1 - tmp[i]/sum)*chart.viewportHeight;  

                if(a[i].area.hasOwnProperty(j))
                {
                    a[i].area[j] = x+','+y;
                }
                else
                {
                    a[i].area.push(x+','+y); 
                } 
            });
        });

        if((chart.viewport.childNodes.length > chart.res.data.length) && chart.history.mode == true)
        {

            for(var i = chart.viewport.childNodes.length; i--;)
            {
                if(chart.viewport.childNodes[i].tagName == "text")
                {
                    chart.viewport.childNodes[i].remove();
                    delete chart.viewport.childNodes[i];
                }
            }
        }

        chart.res.data.reverse();

        chart.res.data.forEach(function(vala, i, a) {

            chart.viewport.childNodes[i].setAttributeNS(null,"opacity", Number(vala.visible));

            if(vala.visible == false)
            {
                return;
            }

            var d = 'M 0,' + chart.viewportHeight + ' L ' + vala.area.join(' L ') + ' L '
                          + chart.viewportWidth + ',' + chart.viewportHeight + ' Z'; 

            chart.viewport.childNodes[i].setAttributeNS(null,"d",d);   
            chart.viewport.childNodes[i].setAttributeNS(null,"fill",vala.opt["mycolor"]);   
            chart.viewport.childNodes[i].setAttributeNS(null,"stroke",vala.opt["mycolor"]);                 
        });

        chart.res.data.reverse(); 
    }

    function circAreaCreate(chart)
    {
        var l = chart.viewportHeight > chart.viewportWidth ? chart.viewportWidth : chart.viewportHeight;
        l /= 2;

        chart.viewport = createElementNS("g",{
            "class":chart.viewportClass, 
            "transform":'translate(' + (chart.viewportWidth/2-l) + ', '+ 0 + ')'}
        );
        var sum = 0;

        chart.res.data.forEach(function(vala, i, a) {
            if(vala.visible == false)
            {
                return;
            }

            a[i].sumy = vala.y.reduce(function(acc, val) { return acc + val; }, 0);
            sum += a[i].sumy; 
        });

        var seg = 0;
        var lastx = l;
        var lasty = 0;

        chart.res.data.forEach(function(vala, i, a) {
            if(vala.visible == false)
            {
                return;
            }

            var arc = "0";
            seg = vala.sumy/sum * 360 + seg;
            if ((vala.sumy/sum) > 0.5)
            {
                arc = "1";
            }

            var d = "";
            var textx = l;
            var texty = l;

            if(vala.sumy/sum > 0.99)
            {
                d = 'M '+ 0 +','+ l + ' a' + l + ', ' + l + ' 0 1,0 '+l*2+',0 a'+l +',' +l+ ' 0 1,0' + (-l*2) + ',' + 0;
            }
            else
            {
                var radseg = seg * Math.PI / 180;
                var nextx = Math.cos(radseg) * l;
                var nexty = Math.sin(radseg) * l;

                var gg = (seg - (vala.sumy/sum * 180)) * Math.PI / 180;
                textx = l + l/2*Math.cos(gg);
                texty = l - l/2*Math.sin(gg);

                d = 'M '+l+','+l + ' l '+lastx+','+-(lasty)+' a' + l + ', ' + l + ' 0 ' + arc + ',0 '+(nextx - lastx)+','+(-(nexty - lasty))+ ' z'; 

                lastx = nextx;
                lasty = nexty;
            }

            vala.opt["fill"] = vala.opt["mycolor"]; 
            vala.opt["stroke-width"] = "1px";
            vala.opt["stroke"] = vala.opt["mycolor"];
            vala.opt["d"] = d; 
            vala.opt["class"] = chart.circleAreaPathClass;

            var el = createElementNS("path",vala.opt);

            el.addEventListener(MOUSEENTER,function(e){
                var t = target(e);

                chart.viewport.childNodes.forEach(function(val,i,arr){
                    var trc = val.getAttributeNS(null,"trc");

                    if(!trc)
                    {
                        return;
                    }

                    if(val == t)
                    {
                        val.setAttributeNS(null,"transform",trc);
                        return;                    
                    }

                    val.setAttributeNS(null,"transform","");
                });


                e.preventDefault();
            });  

            el.addEventListener(MOUSELEAVE,function(e){
                chart.viewport.childNodes.forEach(function(val,i,arr){
                    var trc = val.getAttributeNS(null,"trc");

                    if(trc)
                    {
                        val.setAttributeNS(null,"transform","");
                    }
                });
                e.preventDefault();
            });  

            chart.viewport.appendChild(el);  

            var textNode = createElementNS("text",{
                "x": textx,
                "y": texty,
                "fill": "#fff",
                "text-anchor":"middle",
                "alignment-baseline":"middle",
                "font-size": chart.circleAreaTextSize*(1+vala.sumy/sum)
            });
            textNode.appendChild(document.createTextNode(
                Math.floor(vala.sumy/sum*100)+"%"));

            chart.viewport.appendChild(textNode);
        });   
    }


    function circAreaUpdate(chart)
    {
        var misal = 20;
        var l = chart.viewportHeight > chart.viewportWidth ? chart.viewportWidth : chart.viewportHeight;
        l /= 2;
        l -= misal;

        var sum = 0;

        chart.viewport.setAttributeNS(null, 
            "transform",'translate(' + (chart.viewportWidth/2-l) + ', '+ misal + ')');

        chart.res.data.forEach(function(vala, i, a) {
            if(vala.visible == false)
            {
                return;
            }

            a[i].sumy = 0;

            chart.res.x.forEach(function(valb,j,b){
                if(chart.events.xMin <= valb && valb <= chart.events.xMax)
                {
                    a[i].sumy += vala.y[j];
                }
            });

            sum += a[i].sumy; 
        });

        var seg = 0;
        var lastx = l;
        var lasty = 0;

        chart.history = chart.history || {};

        chart.res.data.forEach(function(vala, i, a) {

            if((chart.viewport.childNodes.length < 2*chart.res.data.length) && chart.history.mode == false)
            {
                var textNode = createElementNS("text",{
                    "fill": "#fff",
                    "text-anchor":"middle",
                    "alignment-baseline":"middle",
                });
                textNode.appendChild(document.createTextNode(
                    Math.round(vala.sumy/sum*100)+"%"));

                if(chart.viewport.childNodes.hasOwnProperty(2*i+1))
                {
                    chart.viewport.insertBefore(textNode,chart.viewport.childNodes[2*i+1]);
                }
                else
                {
                    chart.viewport.appendChild(textNode);
                }
            }

            chart.viewport.childNodes[2*i].setAttributeNS(null,"opacity", Number(vala.visible));
            chart.viewport.childNodes[2*i+1].setAttributeNS(null,"opacity", Number(vala.visible));

            if(vala.visible == false)
            {
                return;
            }

            var arc = "0";
            seg = vala.sumy/sum * 360 + seg;
            if ((vala.sumy/sum) > 0.5)
            {
                arc = "1";
            }

            var d = "";
            var textx = l;
            var texty = l;

            var xx = 0;
            var yy = 0;
            var rr = 1;

            if(vala.sumy/sum > 0.99)
            {
                d = 'M '+ 0 +','+ l + ' a' + l + ', ' + l + ' 0 1,0 '+l*2+',0 a'+l +',' +l+ ' 0 1,0' + (-l*2) + ',' + 0;
            }
            else
            {
                var radseg = seg * Math.PI / 180;
                var nextx = Math.cos(radseg) * l;
                var nexty = Math.sin(radseg) * l;
                var gg = (seg - (vala.sumy/sum * 180)) * Math.PI / 180;
                textx = l + l/2*Math.cos(gg);
                texty = l - l/2*Math.sin(gg);

                d = 'M '+l+','+l + ' l '+lastx+','+-(lasty)+' a' + l + ', ' + l + ' 0 ' + arc + ',0 '+(nextx - lastx)+','+(-(nexty - lasty))+ ' z'; 

                xx = (nextx + lastx)/2;
                yy = -(nexty + lasty)/2;

                if(arc == "1")
                {
                    xx *= -1;
                    yy *= -1;
                }

                rr = Math.sqrt(xx*xx+yy*yy);

                lastx = nextx;
                lasty = nexty;
            }

            chart.viewport.childNodes[2*i].setAttributeNS(null,"d",d); 
            chart.viewport.childNodes[2*i].setAttributeNS(null,"fill",vala.opt["mycolor"]);   
            chart.viewport.childNodes[2*i].setAttributeNS(null,"stroke",vala.opt["mycolor"]); 
            chart.viewport.childNodes[2*i].setAttributeNS(null,"class",chart.circleAreaPathClass);
            chart.viewport.childNodes[2*i].setAttributeNS(null,"trc","translate("+(misal*xx/rr)+","+(misal*yy/rr)+")");
            chart.viewport.childNodes[2*i+1].setAttributeNS(null,"x",textx); 
            chart.viewport.childNodes[2*i+1].setAttributeNS(null,"y",texty); 
            chart.viewport.childNodes[2*i+1].setAttributeNS(null,"font-size",chart.circleAreaTextSize*(1+vala.sumy/sum));

            chart.viewport.childNodes[2*i+1].innerHTML = '';
            chart.viewport.childNodes[2*i+1].appendChild(document.createTextNode(
                Math.round(vala.sumy/sum*100)+"%"));
        });   
    }

    function viewPortCreate(chart)
    {
        if(chart.res.type == "line")
        {
            linesCreate(chart);
        }
        else if(chart.res.type == "bar")
        {
            barsCreate(chart);
            barsMaskCreate(chart);
        }
        else if(chart.res.type == "area" && chart.mode == false)
        {
            areaCreate(chart);
        }
        else if(chart.res.type == "area" && chart.mode == true)
        {
            circAreaCreate(chart);
        }
    }

    function viewPortUpdate(chart)
    {
        if(chart.res.type == "line")
        {
            linesUpdate(chart);
        }
        else if(chart.res.type == "bar")
        {
            barsUpdate(chart);
            barsMaskUpdate(chart);
        }
        else if(chart.res.type == "area" && chart.mode == false)
        {
            areaUpdate(chart);
        }
        else if(chart.res.type == "area" && chart.mode == true)
        {
            circAreaUpdate(chart);
        }
    }

    function viewPortRemove(chart)
    {
        chart.viewport ? chart.viewport.remove() : '';
        delete chart.viewport;

        chart.mask ? chart.mask.remove() : '';
        chart.defs ? chart.defs.remove() : '';
        chart.maskActive ? chart.maskActive.remove() : '';

        delete chart.defs;
        delete chart.mask;
        delete chart.maskActive;
    }

    function tlRemove(chart)
    {
        tlEventsDettach(chart);

        chart.tlhr ? chart.tlhr.remove() : '';
        chart.tlhl ? chart.tlhl.remove() : '';
        chart.tlh ? chart.tlh.remove() : '';
        chart.tlvp ? chart.tlvp.remove() : '';
        chart.tlplot ? chart.tlplot.remove() : '';
        chart.tl ? chart.tl.remove() : '';

        delete chart.events.vpChild;
        delete chart.events.vp;
        
        delete chart.tlhr;
        delete chart.tlhl;
        delete chart.tlh;
        delete chart.tlvp;
        delete chart.tlplot;
        delete chart.tl;    
    }

    function tlCreate(chart)
    {
        // if(chart.mode == true)
        // {
        //     chart.mode = false;
        //     viewPortCreate(chart);
        //     chart.mode = true;
        // }

        // viewPortTransform(chart,{right:0,left:0});

        chart.tlplot = createElementNS("svg",{
            "role":"img",
            "width":chart.tlplotWidth,
            "height":chart.tlplotHeight,
            "class":chart.tlplotClass}); 

        if(chart.mode == true)
        {
            barsForCircleCreate(chart)
        }
        else
        {
            chart.tlvp = chart.viewport.cloneNode(true);
        }
        
        chart.tlvp.setAttributeNS(null,'mask','');
        chart.tlplot.appendChild(chart.tlvp);

        // if(chart.mode == true)
        // {
        //     viewPortCreate(chart);
        // }

        chart.events.left = chart.events.left === undefined ? 100-chart.tlStartSize : chart.events.left;
        chart.events.right = chart.events.right === undefined ? 0 : chart.events.right;

        chart.tlvp.setAttributeNS(null,"transform","scale(1,"+chart.tlvpHeightRatio+")");
        viewPortTransform(chart,{
            right:chart.events.right,
            left:chart.events.left});

        chart.tl = createElement("div",{"class":chart.tlClass});
        chart.tl.style.width = chart.tlWidth;
        chart.tl.style.height = chart.tlHeight;

        chart.tlh = createElement("div",{"class":chart.tlhClass}); 
        chart.tlh.style.height = chart.tlhHeight;
        chart.tlh.style.left = chart.events.left + "%";
        chart.tlh.style.right = chart.events.right + "%";

        chart.tlhr = createElement("div",{"class":chart.tlhrClass}); 
        chart.tlhr.style.height = chart.tlHeight;

        chart.tlhl = createElement("div",{"class":chart.tlhlClass}); 
        chart.tlhl.style.height = chart.tlHeight;

        chart.tl.appendChild(chart.tlplot);
        chart.tl.appendChild(chart.tlh);
        chart.tlh.appendChild(chart.tlhr);
        chart.tlh.appendChild(chart.tlhl);
    }

    function xLabelCreate(chart)
    {
        chart.xlRoot = createElement("div",{"class":chart.xlRootClass}); 
        chart.xlRoot.style.width = chart.xlRootWidth;

        if(chart.mode == true && chart.res.type == "area")
        {
            return;
        }

        var xlWidth = chart.viewportWidth/(chart.xLabelCount);
        var plotWidth = chart.viewportWidth*chart.events.vp.scale.x;
        var lsb = plotWidth/(chart.res.xMax - chart.res.xMin);

        chart.xl = createElement("div",{"class":chart.xlClass}); 
        chart.xl.style.width = plotWidth;
        chart.xlRoot.appendChild(chart.xl);

        xLabelUpdate(chart);
    }

    function xLabelRemove(chart)
    {
        if(!(chart.mode == true && chart.res.type == "area"))
        {
            chart.xl.remove();
            delete chart.xl;
        }
         
        chart.xlRoot.remove(); 
        delete chart.xlRoot;

        delete chart.labels.el;
        delete chart.labels.delta;
    }

    function xLabelUpdate(chart)
    {
        if(chart.mode == true && chart.res.type == "area")
        {
            chart.events.xMin = chart.res.xMin + (chart.res.xMax-chart.res.xMin)*chart.events.vp.tr.x/100;
            chart.events.xMax = chart.res.xMin + (chart.res.xMax-chart.res.xMin)*(100-chart.events.vp.tr.y)/100;
            return;
        }

        var xlWidth = chart.viewportWidth/(chart.xLabelCount);
        var plotWidth = chart.viewportWidth*chart.events.vp.scale.x;
        var lsb = plotWidth/(chart.res.xMax - chart.res.xMin);

        var g = chart.res.x[1] - chart.res.x[0];

        var dayMode = g/86400000 > 0.9;
        var hourMode = g/86400000 < 0.5;

        var pointsCountTotal = (chart.res.xMax - chart.res.xMin)/g;
        var d = plotWidth/pointsCountTotal;
        var pointsCountVp = Math.floor(chart.viewportWidth/d);
        var delta = Math.ceil(pointsCountVp/chart.xLabelCount);

        var left = -chart.events.vp.tr.x*chart.events.vp.scale.x;
        var right = left + chart.viewportWidth;

        var leftm = left;
        var rightm = right;

        left -= d*delta;
        right += d*delta;

        chart.labels.el = chart.labels.el||{};
        chart.labels.delta = chart.labels.delta == undefined ? delta : chart.labels.delta;
        chart.events.xMin = undefined;
        chart.events.xMax = undefined;

        var deltak = chart.labels.delta;
        var deltaOld = delta;

        var kkk = 0;

        while(1 && kkk < 300)
        {
            if(delta >= deltak && delta < deltak*2)
            {
                delta = deltak;
                break;
            }

            deltak *= 2;
            ++kkk;
        }

        var hasIntersect = deltaOld > delta;

        for(var i = chart.res.x.length-1, k = i, l = 1; i >= 0; --i)
        {
            var hasEl = chart.labels.el.hasOwnProperty(i);
            var val = chart.res.x[i];
            var xpos = lsb*(val - chart.res.xMin);

            if(k != i || (k == i && (xpos < left || xpos > right)))
            {
                if(hasEl)
                {
                    chart.labels.el[i].remove();
                    delete chart.labels.el[i];
                }        
            }

            if(k == i)
            {
                if(left <= xpos && xpos <= right)
                {
                    if(!hasEl)
                    {
                        var date = new Date(val);
                        var label;

                        if(dayMode) 
                        { 
                            label = formatDate(date,["month"," ","day"],false);
                        }
                        else if(hourMode)
                        {
                            label = formatDate(date,["hour",":","min"],false);
                        }

                        var p = createElement("p",{"class":chart.xlTextClass});         
                        p.style.width = xlWidth;
                        p.iterator = val.iter;
                        p.appendChild(document.createTextNode(label));
                        chart.xl.appendChild(p);   
                        chart.labels.el[i] = p;          
                    }

                    chart.labels.el[i].style.left = xpos;
                    chart.labels.el[i].style.opacity = 1;

                    if(hasIntersect && l % 2 == 0)
                    {
                        chart.labels.el[i].style.opacity = 0;
                    }
                }

                k -= delta;
                ++l;
            }

            if(leftm <= xpos && xpos <= rightm)
            {
                if(chart.events.xMin == undefined || chart.events.xMin > val)
                {
                    chart.events.xMin = val;
                }

                if(chart.events.xMax == undefined || chart.events.xMax < val)
                {
                    chart.events.xMax = val;
                }
            }     
        }

        chart.xl.style.left = chart.events.vp.tr.x*chart.events.vp.scale.x;
    }

    function gridCreate(chart)
    {
        var width = chart.viewportWidth;
        var height = chart.viewportHeight;
        var yStep = height/chart.gridLinesCount;

        chart.grid = createElement("div",{"class":chart.gridClass});
        chart.grid.style.width = width;
        chart.grid.style.height = height;

        chart.gridLabels = [];
        chart.gridLines = [];

        if(chart.mode == true && chart.res.type == "area")
        {
            return;
        }

        for(var i = 0; i < chart.gridLinesCount; ++i)
        {
            var line = createElement("div",{"class":chart.gridLineClass});
            line.style.top = i*yStep;
            line.style.width = width;
            line.style.height = yStep;
            chart.grid.appendChild(line);
            chart.gridLines.push(line);

            chart.lim.forEach(function(val,j,a){
                if(chart.res.y_scaled != true && j > 0)
                {
                    return;
                }

                var dist = val.yMaxNew - val.yMinNew;
                var step = dist/chart.gridLinesCount;

                var label = createElement("div",{"class":chart.gridLabelClass + (j == 0 ? '' : "_right")});
                label.style.top = (i+1)*yStep;
                label.style.left = j == 0 ? 0 : width;

                if(chart.res.y_scaled == true)
                {
                    label.style.color = chart.res.data[j].opt.mycolor;                  
                }

                label.appendChild(document.createTextNode(
                    formatIntNumber((val.yMaxNew - (i+1)*step),
                        val.yMaxNew,
                        val.yMinNew,
                        chart.gridLinesCount)
                ));
                label.iterator = i;
                chart.grid.appendChild(label);
                chart.gridLabels.push(label);
            });
        }

        chart.pointer = createElement("div",{"class":chart.gridContainerPointerClass});
        chart.grid.appendChild(chart.pointer);

        if(chart.res.type == "line")
        {
            chart.pointerList = [];
            chart.res.data.forEach(function(vala,i,a){
                var p = createElement("div",{"class":chart.gridPointerClass});
                p.style.borderColor = vala.opt.mycolor;

                chart.pointer.appendChild(p);
                chart.pointerList.push(p);
            }); 
        }

        if(chart.res.type == "line" ||
           chart.res.type == "bar" ||
           (chart.res.type == "area" && chart.mode == false))
        {
            chart.pointerBar = createElement("div",{"class":chart.gridPointerBarClass});
            chart.pointer.appendChild(chart.pointerBar);          
        }

        chart.info = createElement("div",{"class":chart.gridInfoClass});
        chart.pointer.appendChild(chart.info);

        chart.infoDate = createElement("div",{"class":chart.gridInfoDateClass});
        chart.info.appendChild(chart.infoDate);
        chart.info.appendChild(createElement("div",{"class":chart.gridInfoLinkClass}));

        chart.infoLabels = createElement("div",{"class":chart.gridInfoLabelsClass});
        chart.info.appendChild(chart.infoLabels);
    }

    function gridUpdate(chart)
    {
        if(chart.mode == true && chart.res.type == "area")
        {
            return;
        }

        chart.gridLabels.forEach(function(vala,i,a){
            var j = 0;
            var visible = true;

            if(chart.res.y_scaled === true &&
                (i + 1) % 2 == 0)
            {
                j = 1;

                if(!chart.res.data[j].visible)
                {
                    visible = false;
                }
            } else if(chart.res.y_scaled === true &&
                i % 2 == 0)
            {
                if(!chart.res.data[j].visible)
                {
                    visible = false;
                }                
            }

            var dist = chart.lim[j].yMaxNew - chart.lim[j].yMinNew;
            var step = dist/chart.gridLinesCount;
            vala.innerHTML = '';

            if(visible)
            {
                vala.appendChild(document.createTextNode(
                    formatIntNumber(chart.lim[j].yMaxNew - (vala.iterator+1)*step,
                        chart.lim[j].yMaxNew,
                        chart.lim[j].yMinNew,
                        chart.gridLinesCount)
                ));                 
            }
        });

        gridAnimate(chart);
    }

    function gridRemove(chart)
    {
        viewPortEventDettach(chart);

        chart.grid ? chart.grid.remove() : '';
        delete chart.grid;

        chart.gridLabels = [];
        chart.gridLines = [];
        delete chart.gridLabels;
        delete chart.gridLines;

        chart.pointer ? chart.pointer.remove() : '';
        delete chart.pointer;

        chart.info ? chart.info.remove() : '';
        delete chart.info;

        chart.infoDate ? chart.infoDate.remove() : '';
        delete chart.infoDate;

        chart.pointerBar ? chart.pointerBar.remove() : '';
        delete chart.pointerBar;

        chart.infoLabels ? chart.infoLabels.remove() : '';
        delete chart.infoLabels;
    }

    function gridAnimate(chart)
    {
        if(chart.events.yScaleIsChanged)
        {
            var dir = chart.events.yScaleDir == true ? -1: +1;
            var height = chart.viewportHeight;
            var yStep = height/chart.gridLinesCount;

            chart.gridLines.forEach(function(vala,i,a){
                if(chart.gridLines.length - 1 == i)
                {
                    return;
                }

                var newTop = parseFloat(vala.style.top) + dir*yStep;

                if(newTop < 0)
                {
                    newTop = (chart.gridLinesCount - 2)*yStep;
                }
                else if(newTop > (chart.gridLinesCount - 2)*yStep)
                {
                    newTop = 0;
                }

                vala.style.top = newTop;
            });
        }
    }

    function yLimitsCalc(res,opt)
    {
        var min = res.xMin + (res.xMax-res.xMin)*opt.left/100;
        var max = res.xMin + (res.xMax-res.xMin)*(100-opt.right)/100;

        var lim = [];

        if(res.type == "area" && res.percentage === true)
        {
            res.data.forEach(function(vala, j, a) {
                lim.push({
                "yMinNew":0,
                "yMaxNew":100,
                "yMinOld":0,
                "yMaxOld":100});
            });

            return lim;          
        }

        res.data.forEach(function(vala, j, a) {
            var yMinNew = undefined;
            var yMaxNew = undefined;
            var yMinOld = res.yMin;
            var yMaxOld = res.yMax;
            
            if(res.y_scaled === true)
            {
                if(vala.visible === false)
                {
                    yMinNew = vala.yMin;
                    yMaxNew = vala.yMax;
                }

                yMinOld = vala.yMin;
                yMaxOld = vala.yMax;
            }

            lim.push({
                "yMinNew":yMinNew,
                "yMaxNew":yMaxNew,
                "yMinOld":yMinOld,
                "yMaxOld":yMaxOld});
        });

        var sumMax = undefined;
        var yMinGlob = undefined;
        var yMaxGlob = undefined;

        res.x.forEach(function(valb, i, b) {
            if(valb < min || valb > max)
            {
                return;
            }

            var sum = 0;

            res.data.forEach(function(vala, j, a) {
                if(vala.visible == false)
                {
                    return;
                }

                var val = vala.y[i];
                sum += val;

                if(val < lim[j].yMinNew || lim[j].yMinNew === undefined)
                {
                    lim[j].yMinNew = val;
                }

                if(val > lim[j].yMaxNew || lim[j].yMaxNew === undefined)
                {
                    lim[j].yMaxNew = val;
                } 

                if(yMinGlob > val || yMinGlob === undefined)
                {
                    yMinGlob = val;
                }

                if(yMaxGlob < val || yMaxGlob === undefined)
                {
                    yMaxGlob = val;
                }
            });  

            if(sum > sumMax || sumMax === undefined)
            {
                sumMax = sum;
            }
        });

        if(res.y_scaled !== true)
        {
            res.data.forEach(function(vala, j, a) {
                lim[j].yMinNew = yMinGlob;
                lim[j].yMaxNew = yMaxGlob;
            });
        }

        if(res.stacked === true || res.type == "bar")
        {
            lim.forEach(function(vala, j, a) {
                a[j].yMinNew = 0;
                a[j].yMaxNew = sumMax;
            });
        }

        return lim;    
    }

    function viewPortTransform(chart,opt)
    {
        chart.lim = yLimitsCalc(chart.res,opt);
        chart.events.yScaleIsChanged = false;

        var op = function(scX,scY,trX,trY)
        {
            return {        
                scale: { x:scX, y:scY },
                tr: { x:trX, y:trY },
                toOp: function()
                {
                    return  'scale(' + this.scale.x  + ', '+ this.scale.y + ')' +
                            ' translate(' + this.tr.x  + ', '+ this.tr.y + ')'; 
                }
            };
        }

        if(chart.res.type == "area" && chart.mode == true)
        {
            chart.events.vp = op(1,1,opt.left,opt.right);
            return;
        }

        if(chart.lim.length && (chart.res.stacked === true || chart.res.type == "bar" || chart.res.y_scaled !== true))
        {
            var x = chart.lim[0].yMaxOld - chart.lim[0].yMinOld;
            var xn = chart.lim[0].yMaxNew - chart.lim[0].yMinNew;
            var xt = (chart.lim[0].yMaxNew - chart.lim[0].yMaxOld)/(chart.lim[0].yMaxOld - chart.lim[0].yMinOld);

            chart.events.vp = op(100/(100 - opt.right - opt.left),x/xn,-chart.viewportWidth*opt.left/100,xt*chart.viewportHeight);
            chart.viewport.setAttributeNS(null,"transform", chart.events.vp.toOp());
            return;
        }

        chart.events.vp = op(100/(100 - opt.right - opt.left),1,-chart.viewportWidth*opt.left/100,0);
        chart.viewport.setAttributeNS(null,"transform", chart.events.vp.toOp());

        if(chart.lim.length && chart.res.type != "area")
        {
            chart.events.vpChild = chart.events.vpChild||[];

            chart.viewport.childNodes.forEach(function (val,i,a){
                var x = chart.lim[i].yMaxOld - chart.lim[i].yMinOld;
                var xn = chart.lim[i].yMaxNew - chart.lim[i].yMinNew;
                var xt = (chart.lim[i].yMaxNew - chart.lim[i].yMaxOld)/(chart.lim[i].yMaxOld - chart.lim[i].yMinOld);

                var d = op(1,x/xn,0,xt*chart.viewportHeight);

                if(chart.events.vpChild.hasOwnProperty(i))
                {
                    if(chart.events.vpChild[i].scale.y != d.scale.y)
                    {
                        chart.events.yScaleIsChanged = true;
                    }

                    chart.events.yScaleDir = chart.events.vpChild[i].scale.y < d.scale.y;

                    chart.events.vpChild[i] = d;
                }
                else
                {
                    chart.events.yScaleIsChanged = true;
                    chart.events.vpChild.push(d);
                }

                val.setAttributeNS(null,"transform", chart.events.vpChild[i].toOp());
            });        
        }
    }

    function titleCreate(chart)
    {
        chart.title = createElement("div",{"class":chart.titleClass});
        chart.title.style.width = chart.rootWidth;   

        chart.titleLabel = createElement("div",{"class":chart.titleLabelClass});
        chart.titleLabel.appendChild(document.createTextNode(chart.titleLabelText));
        chart.titleZoomOut = createElement("div",{"class":chart.titleZoomOutClass});
        chart.titleZoomOut.innerHTML = ZOOMOUT_ICON;
        var p = createElement("p",{});
        p.appendChild(document.createTextNode(chart.titleZoomOutText));
        chart.titleZoomOut.appendChild(p);
        chart.titleStatusF = createElement("div",{"class":chart.titleStatusClass});
        chart.titleStatusS = createElement("div",{"class":chart.titleStatusClass});

        if(chart.func == "zoomout")
        {
            chart.titleLabel.classList.toggle(chart.titleActiveClass,true);
            chart.titleStatusF.classList.toggle(chart.titleActiveClass,true);
        }
        else if(chart.func == "zoomin")
        {
            chart.titleZoomOut.classList.toggle(chart.titleActiveClass,true);
            chart.titleStatusS.classList.toggle(chart.titleActiveClass,true);          
        }

        chart.title.appendChild(chart.titleLabel);
        chart.title.appendChild(chart.titleZoomOut);
        chart.title.appendChild(chart.titleStatusF);
        chart.title.appendChild(chart.titleStatusS);

        titleUpdate(chart);
    }

    function titleUpdate(chart)
    {
        chart.events = chart.events || {};
        chart.events.xMin = chart.events.xMin || chart.res.xMin;
        chart.events.xMax = chart.events.xMax || chart.res.xMax;

        var dateMin = new Date(chart.events.xMin);
        var dateMax = new Date(chart.events.xMax);

        var labelMin;
        var labelMax;

        var active;

        if(chart.func == "zoomin")
        {
            chart.titleZoomOut.classList.toggle(chart.titleActiveClass,true);
            chart.titleStatusS.classList.toggle(chart.titleActiveClass,true);
            chart.titleLabel.classList.toggle(chart.titleActiveClass,false);
            chart.titleStatusF.classList.toggle(chart.titleActiveClass,false);
            labelMin = formatDate(dateMin,["weekday",", ","day"," ","month"," ","year"],true);
            labelMax = formatDate(dateMax,["weekday",", ","day"," ","month"," ","year"],true);  
            active = chart.titleStatusS;         
        }
        else if(chart.func == "zoomout")
        {
            chart.titleZoomOut.classList.toggle(chart.titleActiveClass,false);
            chart.titleStatusS.classList.toggle(chart.titleActiveClass,false);
            chart.titleLabel.classList.toggle(chart.titleActiveClass,true);
            chart.titleStatusF.classList.toggle(chart.titleActiveClass,true);
            labelMin = formatDate(dateMin,["day"," ","month"," ","year"],true);
            labelMax = formatDate(dateMax,["day"," ","month"," ","year"],true);   
            active = chart.titleStatusF;       
        }

        active.innerHTML = '';
        
        if(labelMin == labelMax)
        {
            active.appendChild(document.createTextNode(labelMin));
        }  
        else
        {
            active.appendChild(document.createTextNode(labelMin + " - " + labelMax));
        }  
    }

    function titleEventsAttach(chart)
    {
        chart.titleZoomOut.addEventListener(MOUSEUP,function(e){
            chartDataToggle(chart);
        });
    }

    function legendCreate(chart)
    {
        chart.legend = createElement("div",{"class":chart.legendClass});
        chart.legend.style.width = chart.rootWidth; 
        chart.legendEl = chart.legendEl||[];     

        chart.res.data.forEach(function(val,i,a){
            var c = createElement("div",{"class":chart.legendElClass});
            var cmark = createElement("div",{"class":chart.legendElCheckmark});
            var ctext = createElement("p",{"class":chart.legendElText});
            ctext.appendChild(document.createTextNode(val.opt.myname)); 

            cmark.style.borderColor = val.opt.mycolor;
            c.iterator = i;
            c.appendChild(cmark);
            c.appendChild(ctext);
            chart.legend.appendChild(c);
            chart.legendEl.push(c);
            
            legendElToggle(c,chart,!val.visible);
        });
    }

    function legendRemove(chart)
    {
        legendEventsDettach(chart);

        chart.legend.remove();
        chart.legendEl.length = 0;  

        delete chart.legend;
        delete chart.legendEl;
    }

    function chartToggle(val,chart,status)
    {
        chart.res.data[val].visible = !status;
        viewPortUpdate(chart);
    }

    function legendElToggle(val,chart,status)
    {
        val.classList.toggle(chart.legendElActiveClass,!status);
        val.classList.remove(chart.legendElNopeClass);

        val.status = !status;
        chartToggle(val.iterator,chart,status);

        var color = status ? '' : chart.res.data[val.iterator].opt.mycolor;
        val.firstChild.style.backgroundColor = color;
        val.style.backgroundColor = color; 
        val.style.color = !status ? '' : chart.res.data[val.iterator].opt.mycolor;
    }

    function legendEventsAttach(chart)
    {
        chart.legendEl.forEach(function(vala,i,a){
            function step(timestamp) 
            {
                if(!chart.events.onLegendElementClick)
                {
                    chart.events.timestart = undefined; 
                    return;
                }

                chart.events.timestart = chart.events.timestart || timestamp;

                if(chart.legendElLongClickInterval <= timestamp - chart.events.timestart)
                {
                    chart.legendEl.forEach(function(valb,j,b){
                        if(j == i)
                        {
                            legendElToggle(valb,chart,false);
                            return;
                        }
                        legendElToggle(valb,chart,true);
                        valb.classList.toggle(chart.legendElNopeClass);
                    }); 

                    chart.events.onLegendElementClick = false; 
                    chart.events.timestart = undefined;   

                    sceneUpdate(chart);                 
                }
                else
                {
                    requestAnimationFrame(step);
                }                    
            }

            vala.addEventListener(MOUSEDOWN,function(e){
                chart.events.onLegendElementClick = true;
                requestAnimationFrame(step);

                chart.legendEl.forEach(function(valb,j,b){
                    valb.classList.remove(chart.legendElNopeClass);
                });

                e.preventDefault();
            }); 

            vala.addEventListener(MOUSEUP,function(e){
                if(chart.events.onLegendElementClick)
                {
                    var visCount = 0;
                    chart.legendEl.forEach(function(valb,j,b){
                        visCount += valb.status;
                    });

                    if(!(visCount <= 1 && vala.status))
                    {
                        legendElToggle(vala,chart,vala.status);
                        sceneUpdate(chart);
                    }
                    else
                    {
                        vala.classList.toggle(chart.legendElNopeClass);
                    }  
                }

                chart.events.onLegendElementClick = false;
            });          
        });
    }

    function legendEventsDettach(chart)
    {

    }

    function gridPointerShow(val,chart)
    {
        var xpos = undefined;
        var x = undefined;

        if(chart.res.type == "area" && chart.mode == false)
        {
            var left = -chart.events.vp.tr.x*chart.events.vp.scale.x;
            var plotWidth = chart.viewportWidth*chart.events.vp.scale.x;
            var lsbx = plotWidth/(chart.res.xMax - chart.res.xMin);
            x = chart.res.x[val];
            xpos = lsbx*(chart.res.x[val] - chart.res.xMin) - left;
        }

        if(chart.res.type == "line")
        {
            var left = -chart.events.vp.tr.x*chart.events.vp.scale.x;
            var plotWidth = chart.viewportWidth*chart.events.vp.scale.x;
            var lsbx = plotWidth/(chart.res.xMax - chart.res.xMin);
            x = chart.res.x[val];
            xpos = lsbx*(x - chart.res.xMin) - left;

            chart.res.data.forEach(function(vala,j,a){

                if(vala.visible == false)
                {
                    return;
                }

                var lsby = chart.viewportHeight/(chart.lim[j].yMaxNew - chart.lim[j].yMinNew);
                var ypos = chart.viewportHeight - (lsby*(vala.y[val] - chart.lim[j].yMinNew));

                chart.pointerList[j].style.opacity = 1;
                chart.pointerList[j].style.left = xpos;
                chart.pointerList[j].style.top = ypos;
            });
        }

        if(chart.res.type == "bar")
        {
            var left = -chart.events.vp.tr.x*chart.events.vp.scale.x;
            var plotWidth = chart.viewportWidth*chart.events.vp.scale.x;
            var lsbx = plotWidth/(chart.res.xMax - chart.res.xMin);
            x = chart.res.x[val];
            xpos = lsbx*(x - chart.res.xMin) - left;

            // barOpacityToggle(chart,chart.barOpacityNotHover);

            var barWidth = chart.viewportWidth/(chart.res.x.length+1);
            var pp = chart.viewportWidth*(x - chart.res.xMin)/(chart.res.xMax - chart.res.xMin);

            chart.maskActive.setAttributeNS(null,"transform","translate("+(pp-barWidth/2)+",0)");
        }

        if(x !== undefined && xpos !== undefined)
        {
            chart.pointerBar.style.opacity = 1;
            chart.pointerBar.style.left = xpos;

            chart.info.style.opacity = 1; 
            chart.info.style.left = xpos; 

            var date = new Date(x);
            var label;

            if(chart.func == "zoomin")
            {
                label = formatDate(date,["hour",":","min"],true);
            }
            else if(chart.func == "zoomout")
            {
                label = formatDate(date,["weekday",", ","day"," ","month"," ","year"],false);
            }

            chart.infoDate.innerHTML = '';
            chart.infoDate.appendChild(document.createTextNode(label));

            chart.infoLabels.innerHTML = '';

            var sum = 0;
            var count = 0;

            chart.res.data.forEach(function(vala, i, a) {
                if(vala.visible == false)
                {
                    return;
                }

                var y = createElement("div",{});
                y.appendChild(document.createTextNode(vala.y[val]));
                y.style.color = vala.opt["mycolor"];
                var name = createElement("div",{});
                name.appendChild(document.createTextNode(vala.opt.myname));

                var p = createElement("div",{class:chart.gridInfoLabelsItemClass});
                p.appendChild(name);
                p.appendChild(y);
                chart.infoLabels.appendChild(p);

                sum += vala.y[val];
                ++count;
            });

            if((chart.res.percentage == true || chart.res.stacked == true) && count > 1)
            {
                var y = createElement("div",{});
                y.appendChild(document.createTextNode(sum));
                var name = createElement("div",{});
                name.appendChild(document.createTextNode(chart.gridInfoTotalLabelText));

                var p = createElement("div",{class:chart.gridInfoLabelsItemClass});
                p.appendChild(name);
                p.appendChild(y);
                chart.infoLabels.appendChild(p);
            }

            chart.info.style.visibility = 'hidden';

            var infoPos = chart.info.offsetLeft + chart.info.offsetWidth/1.5;
            var rootPos = chart.root.offsetLeft + chart.root.offsetWidth;

            if(infoPos > rootPos)
            {
                chart.info.style.left = chart.info.offsetLeft - chart.info.offsetWidth/2;                 
            }

            infoPos = chart.info.offsetLeft - chart.info.offsetWidth/1.5;
            rootPos = chart.root.offsetLeft;

            if(infoPos < rootPos)
            {
                chart.info.style.left = chart.info.offsetLeft + chart.info.offsetWidth/2;                 
            }

            chart.info.style.visibility = '';
        }
    }

    function gridPointerHide(chart)
    {
        if(chart.res.type == "line")
        {
            chart.res.data.forEach(function(vala,j,a){
                chart.pointerList[j].style.opacity = 0;
            });
        }

        if(chart.res.type == "line" ||
           chart.res.type == "bar" ||
           (chart.res.type == "area" && chart.mode == false))
        {
            chart.pointerBar.style.opacity = 0;
            chart.info.style.opacity = 0; 
        }

        barOpacityToggle(chart,1);
    }

    function barOpacityToggle(chart,opacity)
    {
        if(chart.res.type == "bar")
        {
            chart.maskActive.setAttributeNS(null,"transform","");

            if(opacity == 1)
            {
                chart.mask.firstChild.setAttributeNS(null,"fill","white");
            }
            else
            {
                chart.mask.firstChild.setAttributeNS(null,"fill","gray");
            }
        }
    }

    function chartDataToggle(chart)
    {
        if(chart.events.activeX < 0 && chart.func == "zoomout")
        {
            return;
        }

        chartDataLoading(chart);

        var left = chart.history.events ? chart.history.events.left : 0;
        var right = chart.history.events ? chart.history.events.right : 0;

        chart.history = {
            data : chart.data,
            mode : chart.mode,
            func : chart.func,
            events : {
                onMouseMoveGrid : chart.events.onMouseMoveGrid,
                xMin: chart.events.xMin || chart.res.xMin,
                xMax: chart.events.xMax || chart.res.xMax,
                left: chart.events.left,
                right: chart.events.right
            },
            res : {
                type : chart.res.type
            }
        };

        chart.mode = false;

        var path = "";
        var delayFunc = function(){};

        if(chart.func == "zoomout")
        {
            if(chart.res.type == "area" &&
                chart.res.percentage == true)
            {
                chart.mode = true;
                path = chart.parentFolder + chart.mainFile;
            }
            else
            {
                path = formatPath(chart.parentFolder,chart.events.activeX)
            }
            
            chart.func = "zoomin";
            // chart.mode = true;                   
        }
        else if(chart.func == "zoomin")
        {
            path = chart.parentFolder + chart.mainFile;
            chart.func = "zoomout";
            chart.events.left = left;
            chart.events.right = right; 
        }
        

        fetchJSONFile(path, function(data){ 
            chart.data = data;
            chartUpdate(chart); 
        });
    }

    function chartDataLoading(chart)
    {
        chart.events = chart.events || {};
        chart.events.loading = true;
    }

    function chartDataLoaded(chart)
    {
        chart.events ? (chart.events.loading = false) : 0;
    }

    function chartDataLoad(chart,callback)
    {    
        chartDataLoading(chart);
        var path = chart.parentFolder + chart.mainFile;
        fetchJSONFile(path, callback);
    }

    function viewPortEventAttach(chart)
    {
        chart.lockEvents = false;

        function move(cx,targ)
        {        
            chart.events.activeX = -1;
            chart.events.axtiveXi = -1;

            if(!targ || targ != chart.grid)
            {
                return;
            }

            var x = cx - chart.root.offsetLeft;

            var left = -chart.events.vp.tr.x*chart.events.vp.scale.x;
            var right = left + chart.viewportWidth;
            var curx = left + x;

            var plotWidth = chart.viewportWidth*chart.events.vp.scale.x;
            var lsb = plotWidth/(chart.res.xMax - chart.res.xMin);
            var area = plotWidth/(chart.res.x.length);

            var i = 0;

            for(; i < chart.res.x.length; ++i)
            {
                var val = chart.res.x[i];
                var xpos = lsb*(val - chart.res.xMin);
                if(Math.abs(xpos - curx) <= area/2)
                {  
                    break;
                }                
            }

            if(i == chart.res.x.length)
            {
                return;
            }

            chart.events.activeX = chart.res.x[i];
            chart.events.axtiveXi = i;
        }

        chart.grid.addEventListener(MOUSEMOVE,function(e){
            if(chart.lockEvents)
            {
                return;
            }

            if(chart.events.onMouseMoveGrid)
            {
                move(clientX(e),getClosest(target(e),chart.gridClass)); 

                if(chart.events.axtiveXi && chart.events.axtiveXi > 0)
                {
                    gridPointerShow(chart.events.axtiveXi,chart,false); 
                } 
            }
        });

        chart.grid.addEventListener(MOUSELEAVE,function(e){
            if(chart.lockEvents)
            {
                return;
            }
            chart.events.onMouseMoveGrid = false;
            gridPointerHide(chart);
        });

        chart.grid.addEventListener(MOUSEENTER,function(e){
            if(chart.lockEvents)
            {
                return;
            }
            chart.events.onMouseMoveGrid = true;
            barOpacityToggle(chart,chart.barOpacityNotHover);

            move(clientX(e),getClosest(target(e),chart.gridClass)); 

            if(chart.events.axtiveXi && chart.events.axtiveXi > 0)
            {
                gridPointerShow(chart.events.axtiveXi,chart,false); 
            } 
        });

        if(chart.info)
        {
            chart.info.addEventListener(MOUSEUP, function(e){
                if(chart.lockEvents)
                {
                    return;
                }
                chart.lockEvents = true;
                chartDataToggle(chart);
            });            
        }
    }

    function viewPortEventDettach(chart)
    {

    }

    function tlUpdate(chart)
    {
        chart.tlh.style.left = chart.events.left + "%";
        chart.tlh.style.right = chart.events.right + "%";     
    }

    function sceneUpdate(chart)
    {
        viewPortTransform(chart,{
        left:chart.events.left,
        right:chart.events.right});
        xLabelUpdate(chart);
        gridUpdate(chart);
        titleUpdate(chart);

        if(chart.res.type == "area" && chart.mode == true)
        {
            viewPortUpdate(chart);
        }
    }

    function tlEventsAttach(chart)
    {
        chart.tlListeners.push([chart.tlhl,MOUSEDOWN,function(e){
            chart.events.onDragLeftHandler = true;
            chart.events.x = clientX(e);
            chart.events.left = parseFloat(chart.tlh.style.left);
            chart.events.right = parseFloat(chart.tlh.style.right);
        }]);

        chart.tlListeners.push([chart.tlhr,MOUSEDOWN,function(e){
            chart.events.onDragRightHandler = true;
            chart.events.x = clientX(e);
            chart.events.left = parseFloat(chart.tlh.style.left);
            chart.events.right = parseFloat(chart.tlh.style.right);
        }]);

        chart.tlListeners.push([chart.tlh,MOUSEDOWN,function(e){
            chart.events.onDragFrame = true;
            chart.events.x = clientX(e);
            chart.events.left = parseFloat(chart.tlh.style.left);
            chart.events.right = parseFloat(chart.tlh.style.right);
        }]);

        chart.tlListeners.push([window,MOUSEUP,function(e){
            if(chart.events.onDragFrame || 
                chart.events.onDragRightHandler || 
                chart.events.onDragLeftHandler)
            {
                chart.events.onDragLeftHandler = false;
                chart.events.onDragRightHandler = false;
                chart.events.onDragFrame = false;
                chart.events.left = parseFloat(chart.tlh.style.left);
                chart.events.right = parseFloat(chart.tlh.style.right); 
            }
        }]);

        chart.tlListeners.push([window,MOUSEMOVE,function(e){
            var tlMin = chart.tlMinSize;

            if(chart.res.type == "area" && chart.mode == true)
            {
                tlMin = 100/((chart.res.xMax - chart.res.xMin)/86400000);
            }

            var minX = chart.tl.offsetLeft;
            var maxX = chart.tl.offsetLeft + chart.tl.offsetWidth;
            var x = clientX(e);
            var dx = (chart.events.x-x)/chart.tl.offsetWidth*100;
            var maxPerc = 100 - tlMin;
            var curLeft = parseFloat(chart.tlh.style.left);
            var curRight = parseFloat(chart.tlh.style.right);
            chart.labels.dir = dx > 0 ? -1 : +1;

            if(chart.events.onDragFrame && 
                !chart.events.onDragRightHandler && 
                !chart.events.onDragLeftHandler)
            {
                var newLeft = saturation(chart.events.left  - dx,maxPerc);
                var newRight = saturation(chart.events.right  + dx,maxPerc);

                newRight = newLeft == 0 && dx > 0 ? chart.events.left+chart.events.right : newRight;
                newLeft = newRight == 0 && dx < 0 ? chart.events.left+chart.events.right : newLeft;

                chart.tlh.style.left = newLeft + "%";
                chart.tlh.style.right = newRight + "%";

                viewPortTransform(chart,{
                    left:newLeft,
                    right:newRight});
                xLabelUpdate(chart);
                gridUpdate(chart);
                titleUpdate(chart);

                if(chart.res.type == "area" && chart.mode == true)
                {
                    viewPortUpdate(chart);
                }
            }

            if(chart.events.onDragRightHandler)
            {
                var newRight = saturation(chart.events.right  + dx,maxPerc);
                newRight = 100 - chart.events.left - newRight < tlMin ? 100 - chart.events.left - tlMin : newRight;
                chart.tlh.style.right = newRight + "%";

                viewPortTransform(chart,{
                    left:curLeft,
                    right:newRight});
                xLabelUpdate(chart);
                gridUpdate(chart);
                titleUpdate(chart);

                if(chart.res.type == "area" && chart.mode == true)
                {
                    viewPortUpdate(chart);
                }
            }

            if(chart.events.onDragLeftHandler)
            {
                var newLeft = saturation(chart.events.left  - dx,maxPerc);
                newLeft = 100 - chart.events.right - newLeft < tlMin ? 100 - chart.events.right - tlMin : newLeft;
                chart.tlh.style.left = newLeft + "%";

                viewPortTransform(chart,{
                    left:newLeft,
                    right:curRight});
                xLabelUpdate(chart);
                gridUpdate(chart);
                titleUpdate(chart);

                if(chart.res.type == "area" && chart.mode == true)
                {
                    viewPortUpdate(chart);
                }
            }
        }]);

        for(var i in chart.tlListeners)
        {
            chart.tlListeners[i][0].addEventListener(chart.tlListeners[i][1],chart.tlListeners[i][2]);
        }
    }

    function tlEventsDettach(chart)
    {

        chart.events.onMouseMoveGrid = false;
        chart.events.onDragLeftHandler = false;
        chart.events.onDragRightHandler = false;
        chart.events.onDragFrame = false;

        for(var i in chart.tlListeners)
        {
            chart.tlListeners[i][0].removeEventListener(chart.tlListeners[i][1],chart.tlListeners[i][2]);
        }

        chart.tlListeners.length = 0;
    }

    function chartUpdate(chart)
    {

        chart.res = sortInputData(chart.data);

        var line2bar = false;
        var bar2line = false;

        if((chart.mode == true && chart.res.type == "area") && chart.events.activeX > 0)
        {
            chart.res.xMin = chart.events.activeX - 3*86400000 < chart.res.xMin ? chart.res.xMin : chart.events.activeX - 3*86400000;
            chart.res.xMax = chart.events.activeX + 4*86400000 > chart.res.xMax ? chart.res.xMax : chart.events.activeX + 4*86400000;        
        }

        if(chart.history.res.type != chart.res.type)
        {
            tlRemove(chart);
            legendRemove(chart);
            xLabelRemove(chart);
            viewPortRemove(chart);
            gridRemove(chart); 

            viewPortCreate(chart);

            if(chart.res.type == "bar" &&
               chart.history.res.type == "line")
            {
                line2bar = true;
            }

            if(chart.res.type == "line" &&
               chart.history.res.type == "bar")
            {
                bar2line = true;
            }

            line2bar ? tlCreate(chart) : '';

            viewPortTransform(chart,{right:0,left:0});
            xLabelCreate(chart);
            gridCreate(chart);   
            titleUpdate(chart);
            legendCreate(chart);

            line2bar ? tlEventsAttach(chart) : '';
            legendEventsAttach(chart);
            viewPortEventAttach(chart);

            chart.root.insertBefore(chart.grid,chart.plot);
            chart.plot.appendChild(chart.viewport);  
            chart.defs !== undefined ? chart.plot.appendChild(chart.defs) : ''; 
            chart.root.appendChild(chart.xlRoot);

            line2bar ? chart.root.appendChild(chart.tl) : ''; 

            chart.root.appendChild(chart.legend); 
        }
        else
        {
            tlRemove(chart);
            legendRemove(chart);
            xLabelRemove(chart);

            viewPortUpdate(chart);
            viewPortTransform(chart,{right:0,left:0});
            tlCreate(chart); 
            xLabelCreate(chart);

            if((chart.mode == true && chart.res.type == "area") || chart.history.mode == true)
            {
                gridRemove(chart); 
                
                if(chart.history.mode == true)
                {
                    gridCreate(chart);
                    chart.root.insertBefore(chart.grid,chart.plot);
                    viewPortEventAttach(chart);
                }
            }
            else
            {
                gridUpdate(chart);
            }

            titleUpdate(chart);
            legendCreate(chart);

            tlEventsAttach(chart);
            legendEventsAttach(chart);

            chart.root.appendChild(chart.xlRoot);
            chart.root.appendChild(chart.tl);   
            chart.root.appendChild(chart.legend); 

            gridPointerHide(chart);

            if(chart.history.events.onMouseMoveGrid && !ISTOUCH)
            {
                chart.events.onMouseMoveGrid = chart.history.events.onMouseMoveGrid;
                barOpacityToggle(chart,chart.barOpacityNotHover);
            } 
        }

        if(chart.func == "zoomout")
        {
            tlUpdate(chart);
            sceneUpdate(chart); 
        }

        if(chart.func == "zoomin")
        {
            var left = chart.events.activeX;
            var right = chart.events.activeX + 86400000;

            chart.events.left = (left - chart.res.xMin)/(chart.res.xMax - chart.res.xMin)*100;
            chart.events.right = (chart.res.xMax - right)/(chart.res.xMax - chart.res.xMin)*100;

            chart.events.left = chart.events.left < 0 ? 0 : chart.events.left;
            chart.events.right = chart.events.right < 0 ? 0 : chart.events.right;

            chart.events.left = chart.events.left > 100 - chart.tlMinSize ? 100 - chart.tlMinSize : chart.events.left;
            chart.events.right = chart.events.right > 100 - chart.tlMinSize ? 100 - chart.tlMinSize : chart.events.right;

            !bar2line ? tlUpdate(chart) : 0;
            sceneUpdate(chart); 
        }

        chartDataLoaded(chart);
        chart.lockEvents = false;
    }

    function chartCreate(chart)
    {
        chart.events = {};
        chart.labels = {};
        chart.tlListeners = [];
        chart.history = {};
        chart.res = sortInputData(chart.data);
        chart.root = createElement("div",{"class":chart.rootClass + ' ' + chart.res.type});
        chart.root.style.width = chart.rootWidth;

        chart.plot = createElementNS("svg",{
            "role":"img",
            "width":chart.plotWidth,
            "height":chart.plotHeight,
            "class":chart.plotClass + '_' + chart.res.type});

        viewPortCreate(chart);
        tlCreate(chart); 
        xLabelCreate(chart);
        gridCreate(chart);   
        titleCreate(chart);
        legendCreate(chart);

        tlEventsAttach(chart);
        legendEventsAttach(chart);
        viewPortEventAttach(chart);
        titleEventsAttach(chart);

        chart.root.appendChild(chart.title);
        chart.root.appendChild(chart.grid);
        chart.plot.appendChild(chart.viewport); 
        chart.defs !== undefined ? chart.plot.appendChild(chart.defs) : ''; 
        chart.root.appendChild(chart.plot);
        chart.root.appendChild(chart.xlRoot);
        chart.root.appendChild(chart.tl); 
        chart.root.appendChild(chart.legend); 

        chart.parent.appendChild(chart.root);

        chartDataLoaded(chart);
        chart.lockEvents = false;
    }

    function run(chart)
    {
        chartDataLoad(chart,function(data){
            chart.data = data;
            chartCreate(chart);
        });
    }

    return {
        create: run
    };
})();

var s = document.getElementById('wrapper');
var width = parseFloat(s.offsetWidth) - 60;
var height = 400;
var tlHeight = 50;
var strokeWidth = 2;
var tlhHeight = tlHeight - strokeWidth*2;
var pHeight = height - tlHeight;
var vHeight = pHeight;
var tlvpHeightRatio = (tlHeight)/(vHeight);
var tlMinSize = 5;
var tlStartSize = 30;
var xLabelCount = 10;
var gridLinesCount = 5;

var NAMES = [
    "",
    "Followers",
    "Interactions",
    "Messages",
    "Views",
    "Apps"
];

for(var i = 1; i < 6; ++i)
{
    var chart = {
        mode: false,
        func: "zoomout",
        data: undefined,
        strokeWidth : strokeWidth,
        rootClass: "tchart_root",        
        rootWidth: width,
        tlClass: "tchart_tl",        
        tlWidth: width,
        tlHeight: tlHeight,
        plotWidth: width,
        plotHeight: pHeight,
        plotClass: "tchart_plot",
        viewportWidth: width,
        viewportHeight: vHeight,
        viewportClass: "tchart_vp",
        tlvpHeightRatio: tlvpHeightRatio,
        tlplotWidth: width,
        tlplotHeight: tlHeight,
        tlplotClass: "tchart_tl_plot", 
        tlhClass: "tchart_tl_h",         
        tlhHeight: tlhHeight, 
        tlhrClass: "tchart_tl_h_r",        
        tlhlClass: "tchart_tl_h_l",       
        tlMinSize: tlMinSize,
        tlStartSize: tlStartSize,
        xlRootClass: "tchart_xl_root",
        xlRootWidth:  width,
        xlClass: "tchart_xl",
        xlTextClass: "tchart_xl_text",
        xLabelCount: xLabelCount,
        gridClass: "tchart_grid",
        gridLinesCount: gridLinesCount,
        gridLineClass: "tchart_grid_line",
        gridLabelClass: "tchart_grid_label",
        titleLabelText: NAMES[i],
        titleClass: "tchart_title",
        titleLabelClass: "tchart_title_label",
        titleZoomOutClass: "tchart_title_zoomout",
        titleZoomOutText: "Zoom out",
        titleStatusClass: "tchart_title_status",
        titleActiveClass: "active",
        legendClass: "tchart_legend",
        legendElClass: "tchart_legend_el",
        legendElCheckmark: "tchart_checkmark",
        legendElText: "tchart_legend_el_text",
        legendElActiveClass: "active",
        legendElNopeClass: "nope",
        legendElLongClickInterval: 500,
        circleAreaPathClass: "tchart_circle_area_path",
        circleAreaTextSize: 14,
        gridContainerPointerClass: "tchart_grid_cpointer",
        gridPointerClass: "tchart_grid_pointer",
        gridPointerBarClass: "tchart_grid_pointer_bar",
        barOpacityNotHover: 0.5,
        gridInfoClass: "tchart_grid_info",
        gridInfoDateClass: "tchart_grid_info_date",
        gridInfoLinkClass: "tchart_grid_info_link",
        gridInfoLabelsClass: "tchart_grid_info_label",
        gridInfoLabelsItemClass: "tchart_grid_info_label_item",
        gridInfoTotalLabelText: "Total",
        mainFile: "overview.json",
        parentFolder: "./"+i+"/",
        parent: s
    };

    window.CHRT.create(chart); 
}
