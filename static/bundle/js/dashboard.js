function createBlock(x,y){return use=document.createElementNS("http://www.w3.org/2000/svg","use"),use.setAttributeNS(null,"href","#cube"),use.setAttributeNS(null,"x",x),use.setAttributeNS(null,"y",y),use}function appendBlocks(blocks){$(".blue-cube g.move").each(function(){$(this).empty()});for(var cubes=document.querySelectorAll(".blue-cube g.move"),i=0;i<blocks.length;i++){var block=blocks[i];for(let i2=0;i2<cubes.length;i2++){var cube=cubes[i2];cube.appendChild(createBlock(block[0],block[1]))}}for(let i2=0;i2<cubes.length;i2++){var cube=cubes[i2],use2=document.createElementNS("http://www.w3.org/2000/svg","use");use2.setAttributeNS(null,"href","#cube-small"),use2.setAttributeNS(null,"x",129),use2.setAttributeNS(null,"y",56),cube.appendChild(use2)}}var selectedBTNindex=null;const VALLIMIT=200;function showValidatorHist(index){$.fn.dataTable.isDataTable("#dash-validator-history-table")&&$("#dash-validator-history-table").DataTable().destroy(),$("#dash-validator-history-table").DataTable({processing:!0,serverSide:!0,lengthChange:!1,ordering:!1,searching:!1,details:!1,pagingType:"simple",pageLength:10,ajax:"/validator/"+index+"/history",language:{searchPlaceholder:"Search by Epoch Number",search:"",paginate:{previous:"<",next:">"}},drawCallback:function(settings){formatTimestamps()}}),$("#validator-history-table_wrapper > div:nth-child(3) > div:nth-child(1)").removeClass("col-md-5").removeClass("col-sm-12"),$("#validator-history-table_wrapper > div:nth-child(3) > div:nth-child(2)").removeClass("col-md-7").removeClass("col-sm-12"),$("#validator-history-table_wrapper > div:nth-child(3)").addClass("justify-content-center"),$("#validator-history-table_paginate").attr("style","padding-right: 0 !important"),$("#validator-history-table_info").attr("style","padding-top: 0;"),$("#dash-validator-history-table").removeClass("d-none"),$("#dash-validator-history-art").attr("class","d-none"),$("#dash-validator-history-index").text(index),selectedBTNindex=index,showSelectedValidator(),updateValidatorInfo(index)}function toggleFirstrow(){$("#dashChartTabs a:first").tab("show");let id=$("#validators tbody>tr:nth-child(1)>td>button").attr("id");setTimeout(function(){$("#"+id).focus()},200)}function updateValidatorInfo(index){fetch(`/validator/${index}/proposedblocks?draw=1&start=1&length=1`,{method:"GET"}).then(res=>{res.json().then(data=>{$("#blockCount span").text(data.recordsTotal)})}),fetch(`/validator/${index}/attestations?draw=1&start=1&length=1`,{method:"GET"}).then(res=>{res.json().then(data=>{$("#attestationCount span").text(data.recordsTotal)})}),fetch(`/validator/${index}/slashings?draw=1&start=1&length=1`,{method:"GET"}).then(res=>{res.json().then(data=>{var total=parseInt(data.recordsTotal);total>0?($("#slashingsCountDiv").removeClass("d-none"),$("#slashingsCount span").text(total)):$("#slashingsCountDiv").addClass("d-none")})}),fetch(`/validator/${index}/effectiveness`,{method:"GET"}).then(res=>{res.json().then(data=>{setValidatorEffectiveness("effectiveness",data.effectiveness)})})}function getValidatorQueryString(){return window.location.href.slice(window.location.href.indexOf("?"),window.location.href.length)}var boxAnimationDirection="";function addValidatorUpdateUI(){$("#validators-tab").removeClass("disabled"),$("#validator-art").attr("class","d-none"),$("#dash-validator-history-info").removeClass("d-none"),$("#dash-validator-history-index-div").removeClass("d-none"),$("#dash-validator-history-index-div").addClass("d-flex");let anim="goinboxanim";boxAnimationDirection==="out"&&(anim="gooutboxanim"),$("#selected-validators-input-button-box").addClass("zoomanim"),$("#selected-validators-input-button-val").addClass(anim),setTimeout(()=>{$("#selected-validators-input-button-box").removeClass("zoomanim"),$("#selected-validators-input-button-val").removeClass(anim)},1100),fetch(`/dashboard/data/effectiveness${getValidatorQueryString()}`,{method:"GET"}).then(res=>{res.json().then(data=>{let eff=0;for(let incDistance of data){if(incDistance===0)continue;eff+=1/incDistance*100}eff=eff/data.length,setValidatorEffectiveness("validator-eff-total",eff)})}),showProposedHistoryTable()}function showSelectedValidator(){setTimeout(function(){$("span[id^=dropdownMenuButton]").each(function(el,item){$(item).attr("id")==="dropdownMenuButton"+selectedBTNindex?$(item).addClass("bg-primary"):selectedBTNindex!=null&&$(item).removeClass("bg-primary")})},100),$(".hbtn").hover(function(){$(this).addClass("shadow")},function(){$(this).removeClass("shadow")})}function showValidatorsInSearch(qty){qty=parseInt(qty);let i=0,l=[];$("#selected-validators-input li:not(:last)").remove(),$("#selected-validators.val-modal li").each(function(el,item){if(i===qty)return;l.push($(item).clone()),i++});for(let i2=0;i2<l.length;i2++)$("#selected-validators-input").prepend(l[l.length-(i2+1)])}function setValidatorEffectiveness(elem,eff){if(elem===void 0)return;eff=parseInt(eff),eff>=100?$("#"+elem).html(`<span class="text-success"> ${eff}% - Perfect <i class="fas fa-grin-stars"></i>`):eff>80?$("#"+elem).html(`<span class="text-success"> ${eff}% - Good <i class="fas fa-smile"></i></span>`):eff>60?$("#"+elem).html(`<span class="text-warning"> ${eff}% - Fair <i class="fas fa-meh"></i></span>`):$("#"+elem).html(`<span class="text-danger"> ${eff}% - Bad <i class="fas fa-frown"></i></span>`)}function renderProposedHistoryTable(data){$.fn.dataTable.isDataTable("#proposals-table")&&$("#proposals-table").DataTable().destroy(),$("#proposals-table").DataTable({serverSide:!1,data,processing:!1,ordering:!1,paginate:!1,searching:!1,columnDefs:[{targets:0,data:"0",render:function(data2,type,row,meta){return'<a href="/validator/'+data2+'"><i class="fas fa-male fa-sm mr-1"></i>'+data2+"</a>"}},{targets:1,data:"1",render:function(data2,type,row,meta){return"<span>"+luxon.DateTime.fromMillis(data2*1e3).toRelative({style:"long"})+"</span>"}},{targets:2,data:"2",render:function(data2,type,row,meta){return'<span class="text-success p-1">'+data2[0]+'</span>/<span class="text-danger p-1">'+data2[1]+'</span>/<span class="text-info p-1">'+data2[2]+"</span>"}}]})}function showProposedHistoryTable(){fetch("/dashboard/data/proposalshistory"+getValidatorQueryString(),{method:"GET"}).then(res=>{res.json().then(function(data){let proposedHistTableData=[];for(let item of data)proposedHistTableData.push([item[0],item[1],[item[2],item[3],item[4]]]);renderProposedHistoryTable(proposedHistTableData)})})}function switchFrom(el1,el2,el3,el4){$(el1).removeClass("proposal-switch-selected"),$(el2).addClass("proposal-switch-selected"),$(el3).addClass("d-none"),$(el4).removeClass("d-none")}$(document).ready(function(){$(".proposal-switch").on("click",()=>{$(".switch-chart").hasClass("proposal-switch-selected")?switchFrom(".switch-chart",".switch-table","#proposed-chart","#proposed-table-div"):$(".switch-table").hasClass("proposal-switch-selected")&&switchFrom(".switch-table",".switch-chart","#proposed-table-div","#proposed-chart")}),$("#validators").on("page.dt",function(){showSelectedValidator()}),$("#bookmark-button").on("click",function(event){var tickIcon2=$("<i class='fas fa-check' style='width:15px;'></i>"),spinnerSmall=$('<div class="spinner-border spinner-border-sm" role="status"><span class="sr-only">Loading...</span></div>'),bookmarkIcon=$("<i class='far fa-bookmark' style='width:15px;'></i>"),errorIcon=$("<i class='fas fa-exclamation' style='width:15px;'></i>");fetch("/dashboard/save",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(state.validators)}).then(function(res){console.log("response",res),res.status===200&&!res.redirected?(console.log("success"),$("#bookmark-button").empty().append(tickIcon2),setTimeout(function(){$("#bookmark-button").empty().append(bookmarkIcon)},1e3)):res.redirected?(console.log("redirected!"),$("#bookmark-button").attr("data-original-title","Please login or sign up first."),$("#bookmark-button").tooltip("show"),$("#bookmark-button").empty().append(errorIcon),setTimeout(function(){$("#bookmark-button").empty().append(bookmarkIcon),$("#bookmark-button").tooltip("hide"),$("#bookmark-button").attr("data-original-title","Save all to Watchlist")},2e3)):($("#bookmark-button").empty().append(errorIcon),setTimeout(function(){$("#bookmark-button").empty().append(bookmarkIcon)},2e3))}).catch(function(err){$("#bookmark-button").empty().append(errorIcon),setTimeout(function(){$("#bookmark-button").empty().append(bookmarkIcon)},2e3),console.log(err)})});var clearSearch=$("#clear-search"),copyIcon=$("<i class='fa fa-copy' style='width:15px'></i>"),tickIcon=$("<i class='fas fa-check' style='width:15px;'></i>");clearSearch.on("click",function(){clearSearch.empty().append(tickIcon),setTimeout(function(){clearSearch.empty().append(copyIcon)},500)});var validatorsDataTable=window.vdt=$("#validators").DataTable({processing:!0,serverSide:!1,ordering:!0,searching:!0,pagingType:"full_numbers",lengthMenu:[10,25,50],info:!1,preDrawCallback:function(){try{$("#validators").find('[data-toggle="tooltip"]').tooltip("dispose")}catch(e){}},drawCallback:function(settings){$("#validators").find('[data-toggle="tooltip"]').tooltip()},order:[[1,"asc"]],columnDefs:[{targets:0,data:"0",render:function(data,type,row,meta){return type=="sort"||type=="type"?data:'<a href="/validator/'+data+'">0x'+data.substr(0,8)+"...</a>"}},{targets:1,data:"1",render:function(data,type,row,meta){return type=="sort"||type=="type"?data:`<span class="m-0 p-1 hbtn" id="dropdownMenuButton${data}" style="cursor: pointer;" onclick="showValidatorHist('${data}')">
                      ${data}
                  </span>
                 `}},{targets:2,data:"2",render:function(data,type,row,meta){return type=="sort"||type=="type"?data?data[0]:null:`${data[0]}`}},{targets:3,data:"3",render:function(data,type,row,meta){if(type=="sort"||type=="type")return data?data[0]:-1;var d=data.split("_"),s=d[0].charAt(0).toUpperCase()+d[0].slice(1);return d[1]==="offline"?`<span style="display:none">${d[1]}</span><span data-toggle="tooltip" data-placement="top" title="No attestation in the last 2 epochs">${s} <i class="fas fa-power-off fa-sm text-danger"></i></span>`:d[1]==="online"?`<span style="display:none">${d[1]}</span><span>${s} <i class="fas fa-power-off fa-sm text-success"></i></span>`:`<span>${s}</span>`}},{targets:4,visible:!1,data:"4",render:function(data,type,row,meta){return type=="sort"||type=="type"?data?data[0]:null:data===null?"-":`<span data-toggle="tooltip" data-placement="top" title="${luxon.DateTime.fromMillis(data[1]*1e3).toRelative({style:"short"})}">${luxon.DateTime.fromMillis(data[1]*1e3).toRelative({style:"short"})} (<a href="/epoch/${data[0]}">Epoch ${data[0]}</a>)</span>`}},{targets:5,visible:!1,data:"5",render:function(data,type,row,meta){return type=="sort"||type=="type"?data?data[0]:null:data===null?"-":`<span data-toggle="tooltip" data-placement="top" title="${luxon.DateTime.fromMillis(data[1]*1e3).toRelative({style:"short"})}">${luxon.DateTime.fromMillis(data[1]*1e3).toRelative({style:"short"})} (<a href="/epoch/${data[0]}">Epoch ${data[0]}</a>)</span>`}},{targets:6,data:"6",render:function(data,type,row,meta){return type=="sort"||type=="type"?data?data[0]:null:data===null?"-":`<span data-toggle="tooltip" data-placement="top" title="${luxon.DateTime.fromMillis(data[1]*1e3).toRelative({style:"short"})}">${luxon.DateTime.fromMillis(data[1]*1e3).toRelative({style:"short"})} (<a href="/epoch/${data[0]}">Epoch ${data[0]}</a>)</span>`}},{targets:7,data:"7",render:function(data,type,row,meta){return type=="sort"||type=="type"?data?data[0]:null:data===null?"No Attestation found":`<span>${luxon.DateTime.fromMillis(data[1]*1e3).toRelative({style:"short"})}</span>`}},{targets:8,data:"8",render:function(data,type,row,meta){return type=="sort"||type=="type"?data?data[0]+data[1]:null:`<span data-toggle="tooltip" data-placement="top" title="${data[0]} executed / ${data[1]} missed"><span class="text-success">${data[0]}</span> / <span class="text-danger">${data[1]}</span></span>`}}]}),bhValidators=new Bloodhound({datumTokenizer:Bloodhound.tokenizers.whitespace,queryTokenizer:Bloodhound.tokenizers.whitespace,identify:function(obj){return obj.index},remote:{url:"/search/indexed_validators/%QUERY",wildcard:"%QUERY"}}),bhEth1Addresses=new Bloodhound({datumTokenizer:Bloodhound.tokenizers.whitespace,queryTokenizer:Bloodhound.tokenizers.whitespace,identify:function(obj){return obj.eth1_address},remote:{url:"/search/indexed_validators_by_eth1_addresses/%QUERY",wildcard:"%QUERY"}}),bhName=new Bloodhound({datumTokenizer:Bloodhound.tokenizers.whitespace,queryTokenizer:Bloodhound.tokenizers.whitespace,identify:function(obj){return obj.name},remote:{url:"/search/indexed_validators_by_name/%QUERY",wildcard:"%QUERY"}}),bhGraffiti=new Bloodhound({datumTokenizer:Bloodhound.tokenizers.whitespace,queryTokenizer:Bloodhound.tokenizers.whitespace,identify:function(obj){return obj.graffiti},remote:{url:"/search/indexed_validators_by_graffiti/%QUERY",wildcard:"%QUERY"}});$(".typeahead-dashboard").typeahead({minLength:1,highlight:!0,hint:!1,autoselect:!1},{limit:5,name:"validators",source:bhValidators,display:"index",templates:{header:"<h3>Validators</h3>",suggestion:function(data){return`<div class="text-monospace text-truncate high-contrast">${data.index}: ${data.pubkey}</div>`}}},{limit:5,name:"addresses",source:bhEth1Addresses,display:"address",templates:{header:"<h3>Validators by ETH1 Addresses</h3>",suggestion:function(data){var len=data.validator_indices.length>100?"100+":data.validator_indices.length;return`<div class="text-monospace high-contrast" style="display:flex"><div class="text-truncate" style="flex:1 1 auto;">${data.eth1_address}</div><div style="max-width:fit-content;white-space:nowrap;">${len}</div></div>`}}},{limit:5,name:"graffiti",source:bhGraffiti,display:"graffiti",templates:{header:"<h3>Validators by Graffiti</h3>",suggestion:function(data){var len=data.validator_indices.length>100?"100+":data.validator_indices.length;return`<div class="text-monospace high-contrast" style="display:flex"><div class="text-truncate" style="flex:1 1 auto;">${data.graffiti}</div><div style="max-width:fit-content;white-space:nowrap;">${len}</div></div>`}}},{limit:5,name:"name",source:bhName,display:"name",templates:{header:"<h3>Validators by Name</h3>",suggestion:function(data){var len=data.validator_indices.length>100?"100+":data.validator_indices.length;return`<div class="text-monospace high-contrast" style="display:flex"><div class="text-truncate" style="flex:1 1 auto;">${data.name}</div><div style="max-width:fit-content;white-space:nowrap;">${len}</div></div>`}}}),$(".typeahead-dashboard").on("focus",function(event){event.target.value!==""&&$(this).trigger($.Event("keydown",{keyCode:40}))}),$(".typeahead-dashboard").on("input",function(){$(".tt-suggestion").first().addClass("tt-cursor")}),$(".typeahead-dashboard").on("typeahead:select",function(ev,sug){sug.validator_indices?addValidators(sug.validator_indices):addValidator(sug.index),boxAnimationDirection="in",$(".typeahead-dashboard").typeahead("val","")}),$("#pending").on("click","button",function(){var data=pendingTable.row($(this).parents("tr")).data();removeValidator(data[1])}),$("#active").on("click","button",function(){var data=activeTable.row($(this).parents("tr")).data();removeValidator(data[1])}),$("#ejected").on("click","button",function(){var data=ejectedTable.row($(this).parents("tr")).data();removeValidator(data[1])}),$("#selected-validators").on("click",".remove-validator",function(){removeValidator(this.parentElement.dataset.validatorIndex)}),$("#selected-validators-input").on("click",".remove-validator",function(){removeValidator(this.parentElement.dataset.validatorIndex)}),$(".multiselect-border input").on("focus",function(event){$(".multiselect-border").addClass("focused")}),$(".multiselect-border input").on("blur",function(event){$(".multiselect-border").removeClass("focused")}),$("#clear-search").on("click",function(event){state&&(state=setInitialState(),localStorage.removeItem("dashboard_validators"),window.location="/dashboard",selectedBTNindex=null)});function setInitialState(){var _state={};return _state.validators=[],_state.validatorsCount={pending:0,active:0,ejected:0,offline:0},_state}var state=setInitialState();setValidatorsFromURL(),renderSelectedValidators(),updateState();function renderSelectedValidators(){if(state.validators.length>VALLIMIT)return;var elHolder=document.getElementById("selected-validators");$("#selected-validators .item").remove();for(var elsItems=[],i=0;i<state.validators.length;i++){var v=state.validators[i],elItem=document.createElement("li");elItem.classList="item",elItem.dataset.validatorIndex=v,elItem.innerHTML=v+' <i class="fas fa-times-circle remove-validator"></i>',elsItems.push(elItem)}elHolder.prepend(...elsItems)}function renderDashboardInfo(){var el=document.getElementById("dashboard-info");el.innerText=`Found ${state.validatorsCount.pending} pending, ${state.validatorsCount.active_online+state.validatorsCount.active_offline} active and ${state.validatorsCount.exited} exited validators`,state.validators.length>0?(showSelectedValidator(),addValidatorUpdateUI(),selectedBTNindex!=state.validators[0]&&showValidatorHist(state.validators[0]),showValidatorsInSearch(3)):$("#validatorModal").modal("hide"),state.validators.length>3?($("#selected-validators-input-button").removeClass("d-none"),$("#selected-validators-input-button").addClass("d-flex"),$("#selected-validators-input-button span").html(state.validators.length)):($("#selected-validators-input-button").removeClass("d-flex"),$("#selected-validators-input-button").addClass("d-none"))}function setValidatorsFromURL(){var usp=new URLSearchParams(window.location.search),validatorsStr=usp.get("validators");if(!validatorsStr){var validatorsStr=localStorage.getItem("dashboard_validators");validatorsStr?(state.validators=JSON.parse(validatorsStr),state.validators=state.validators.filter((v,i)=>(v=escape(v),isNaN(parseInt(v))?!1:state.validators.indexOf(v)===i)),state.validators.sort(sortValidators)):state.validators=[];return}state.validators=validatorsStr.split(","),state.validators=state.validators.filter((v,i)=>(v=escape(v),isNaN(parseInt(v))?!1:state.validators.indexOf(v)===i)),state.validators.sort(sortValidators),state.validators.length>VALLIMIT&&(state.validators=state.validators.slice(0,VALLIMIT),console.log(`${VALLIMIT} validators limit reached`),alert(`You can not add more than ${VALLIMIT} validators to your dashboard`))}function addValidators(indices){var limitReached=!1;indicesLoop:for(var j=0;j<indices.length;j++){if(state.validators.length>=VALLIMIT){limitReached=!0;break indicesLoop}for(var index=indices[j]+"",i=0;i<state.validators.length;i++)if(state.validators[i]===index)continue indicesLoop;state.validators.push(index)}limitReached&&(console.log(`${VALLIMIT} validators limit reached`),alert(`You can not add more than ${VALLIMIT} validators to your dashboard`)),state.validators.sort(sortValidators),renderSelectedValidators(),updateState()}function addValidator(index){if(state.validators.length>=VALLIMIT){alert(`Too many validators, you can not add more than ${VALLIMIT} validators to your dashboard!`);return}index=index+"";for(var i=0;i<state.validators.length;i++)if(state.validators[i]===index)return;state.validators.push(index),state.validators.sort(sortValidators),renderSelectedValidators(),updateState()}function removeValidator(index){boxAnimationDirection="out";for(var i=0;i<state.validators.length;i++)if(state.validators[i]===index){if(state.validators.splice(i,1),state.validators.sort(sortValidators),state.validators.length===0){state=setInitialState(),localStorage.removeItem("dashboard_validators"),window.location="/dashboard";return}else renderSelectedValidators(),updateState();return}}function sortValidators(a,b){var ai=parseInt(a),bi=parseInt(b);return ai-bi}function addChange(selector,value){if(selector!==void 0||selector!==null){var element=document.querySelector(selector);element!==void 0?(element.classList.remove("decreased"),element.classList.remove("increased"),value<0&&element.classList.add("decreased"),value>0&&element.classList.add("increased")):console.error("Could not find element with selector",selector)}else console.error("selector is not defined",selector)}function updateState(){if(state.validators.length>VALLIMIT)return;if(localStorage.setItem("dashboard_validators",JSON.stringify(state.validators)),state.validators.length){var qryStr="?validators="+state.validators.join(","),newUrl=window.location.pathname+qryStr;window.history.replaceState(null,"Dashboard",newUrl)}var t0=Date.now();state.validators&&state.validators.length?(document.querySelector("#bookmark-button").style.visibility="visible",document.querySelector("#copy-button").style.visibility="visible",document.querySelector("#clear-search").style.visibility="visible",$.ajax({url:"/dashboard/data/earnings"+qryStr,success:function(result){var t1=Date.now();if(console.log(`loaded earnings: fetch: ${t1-t0}ms`),!result)return;var lastDay=(result.lastDay/1e9*exchangeRate).toFixed(4),lastWeek=(result.lastWeek/1e9*exchangeRate).toFixed(4),lastMonth=(result.lastMonth/1e9*exchangeRate).toFixed(4),total=result.total/1e9*exchangeRate,totalDeposits=result.totalDeposits/1e9*exchangeRate,totalChange=total+totalDeposits;addChange("#earnings-day",lastDay),addChange("#earnings-week",lastWeek),addChange("#earnings-month",lastMonth),document.querySelector("#earnings-day").innerHTML=(lastDay||"0.000")+" <span class='small text-muted'>"+currency+"</span>",document.querySelector("#earnings-week").innerHTML=(lastWeek||"0.000")+" <span class='small text-muted'>"+currency+"</span>",document.querySelector("#earnings-month").innerHTML=(lastMonth||"0.000")+" <span class='small text-muted'>"+currency+"</span>",document.querySelector("#earnings-total").innerHTML=(totalChange.toFixed(2)||"0.000")+`<span id="earnings-total-change">${total.toFixed(4)}</span> <span class='small text-muted'>`+currency+"</span>",addChange("#earnings-total-change",total)}}),$.ajax({url:"/dashboard/data/validators"+qryStr,success:function(result){var t1=Date.now();if(console.log(`loaded validators-data: length: ${result.data.length}, fetch: ${t1-t0}ms`),!result||!result.data.length){document.getElementById("validators-table-holder").style.display="none";return}state.validatorsCount.pending=0,state.validatorsCount.active_online=0,state.validatorsCount.active_offline=0,state.validatorsCount.slashing_online=0,state.validatorsCount.slashing_offline=0,state.validatorsCount.exiting_online=0,state.validatorsCount.exiting_offline=0,state.validatorsCount.exited=0,state.validatorsCount.slashed=0;for(var i=0;i<result.data.length;i++){var v=result.data[i],vIndex=v[1],vState=v[3];state.validatorsCount[vState]||(state.validatorsCount[vState]=0),state.validatorsCount[vState]++;var el=document.querySelector(`#selected-validators .item[data-validator-index="${vIndex}"]`);el&&(el.dataset.state=vState)}validatorsDataTable.clear(),validatorsDataTable.rows.add(result.data).draw(),validatorsDataTable.column(6).visible(!1),requestAnimationFrame(()=>{validatorsDataTable.columns.adjust().responsive.recalc()}),document.getElementById("validators-table-holder").style.display="block",renderDashboardInfo()}})):(document.querySelector("#copy-button").style.visibility="hidden",document.querySelector("#bookmark-button").style.visibility="hidden",document.querySelector("#clear-search").style.visibility="hidden"),$("#copy-button").attr("data-clipboard-text",window.location.href),renderCharts()}window.onpopstate=function(event){setValidatorsFromURL(),renderSelectedValidators(),updateState()},window.addEventListener("storage",function(e){var validatorsStr=localStorage.getItem("dashboard_validators");if(JSON.stringify(state.validators)===validatorsStr)return;validatorsStr?state.validators=JSON.parse(validatorsStr):state.validators=[],state.validators=state.validators.filter((v,i)=>state.validators.indexOf(v)===i),state.validators.sort(sortValidators),renderSelectedValidators(),updateState()});function renderCharts(){var t0=Date.now();if(state.validators&&state.validators.length){var qryStr="?validators="+state.validators.join(",");$.ajax({url:"/dashboard/data/balance"+qryStr,success:function(result){var t1=Date.now(),t2=Date.now();createBalanceChart(result);var t3=Date.now();console.log(`loaded balance-data: length: ${result.length}, fetch: ${t1-t0}ms, aggregate: ${t2-t1}ms, render: ${t3-t2}ms`)}}),$.ajax({url:"/dashboard/data/proposals"+qryStr,success:function(result){var t1=Date.now(),t2=Date.now();result&&result.length&&createProposedChart(result);var t3=Date.now();console.log(`loaded proposal-data: length: ${result.length}, fetch: ${t1-t0}ms, render: ${t3-t2}ms`)}})}}});function createBalanceChart(income){Highcharts.stockChart("balance-chart",{exporting:{scale:1},rangeSelector:{enabled:!1},chart:{type:"column",height:"500px"},legend:{enabled:!0},title:{text:"Daily Income for all Validators"},xAxis:{type:"datetime",range:31*24*60*60*1e3,labels:{formatter:function(){var epoch=timeToEpoch(this.value),orig=this.axis.defaultLabelFormatter.call(this);return`${orig}<br/>Epoch ${epoch}`}}},tooltip:{formatter:function(tooltip){var orig=tooltip.defaultFormatter.call(this,tooltip),epoch=timeToEpoch(this.x);return orig[0]=`${orig[0]}<span style="font-size:10px">Epoch ${epoch}</span>`,currency!=="ETH"&&(orig[1]=`<span style="color:${this.points[0].color}">\u25CF</span> Daily Income: <b>${this.y.toFixed(2)}</b><br/>`),orig},dateTimeLabelFormats:{day:"%A, %b %e, %Y",minute:"%A, %b %e",hour:"%A, %b %e"}},yAxis:[{title:{text:"Income ["+currency+"]"},opposite:!1,labels:{formatter:function(){return currency!=="ETH"?this.value.toFixed(2):this.value.toFixed(5)}}}],series:[{name:"Daily Income",data:income}]})}function createProposedChart(data){var proposed=[],missed=[],orphaned=[];data.map(d=>{d[1]==1?proposed.push([d[0]*1e3,1]):d[1]==2?missed.push([d[0]*1e3,1]):d[1]==3&&orphaned.push([d[0]*1e3,1])}),Highcharts.stockChart("proposed-chart",{chart:{type:"column"},title:{text:"Proposal History for all Validators"},legend:{enabled:!0},colors:["#7cb5ec","#ff835c","#e4a354","#2b908f","#f45b5b","#91e8e1"],xAxis:{lineWidth:0,tickColor:"#e5e1e1"},yAxis:[{title:{text:"# of Possible Proposals"},opposite:!1}],plotOptions:{column:{stacking:"normal",dataGrouping:{enabled:!0,forced:!0,units:[["day",[1]]]}}},series:[{name:"Proposed",color:"#7cb5ec",data:proposed},{name:"Missed",color:"#ff835c",data:missed},{name:"Orphaned",color:"#e4a354",data:orphaned}],rangeSelector:{enabled:!1}})}
