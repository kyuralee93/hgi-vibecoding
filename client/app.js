
(function(){try{var V='gra_demo_consistent_2026_06_19_v7';if(localStorage.getItem('gra_data_version')!==V){Object.keys(localStorage).filter(function(k){return k.indexOf('gra_')===0&&k!=='gra_data_version';}).forEach(function(k){localStorage.removeItem(k);});localStorage.setItem('gra_data_version',V);}}catch(e){}})();
const DATA = window.__SERVER_DATA__ || {meta:{},contracts:[],facInward:[],accidents:[],inwardClaims:[],docs:[],treaties:[],layerStatus:[],fxRates:{},layerClaims:[],intake:[],cessions:[]};
const PAGE = 10;
let state = {
  user: JSON.parse(sessionStorage.getItem('gra_v34_user') || 'null'),
  users: JSON.parse(localStorage.getItem('gra_v34_users') || '[]'),
  fac: JSON.parse(localStorage.getItem('gra_v34_fac') || JSON.stringify(DATA.facInward)),
  accidents: JSON.parse(localStorage.getItem('gra_v34_accidents') || JSON.stringify(DATA.accidents)),
  inwardClaims: JSON.parse(localStorage.getItem('gra_v34_inwardClaims') || JSON.stringify(DATA.inwardClaims)),
  docs: JSON.parse(localStorage.getItem('gra_v34_docs') || JSON.stringify(DATA.docs)),
  layers: JSON.parse(localStorage.getItem('gra_v34_layers') || JSON.stringify(DATA.layerStatus)),
  meta: JSON.parse(localStorage.getItem('gra_v34_meta') || JSON.stringify(DATA.meta)),
  pages: {fac:1, ppw:1, acc:1, contract:1, region:1},
  selectedRegion: null
};
function saveAll(){localStorage.setItem('gra_v34_fac',JSON.stringify(state.fac));localStorage.setItem('gra_v34_accidents',JSON.stringify(state.accidents));localStorage.setItem('gra_v34_inwardClaims',JSON.stringify(state.inwardClaims));localStorage.setItem('gra_v34_docs',JSON.stringify(state.docs));localStorage.setItem('gra_v34_layers',JSON.stringify(state.layers));localStorage.setItem('gra_v34_meta',JSON.stringify(state.meta));}
function eok(n){return Math.round(Number(n||0)).toLocaleString()+'억원';}
function dayDiff(d){return Math.ceil((new Date(d)-new Date(DATA.meta.asOfDate))/(86400000));}
function currentUser(){return state.user?.empNo || 'DEMO';}
function login(){const emp=document.getElementById('loginEmpNo').value||'DEMO';state.user={empNo:emp,role:'DEMO',approved:true};sessionStorage.setItem('gra_v34_user',JSON.stringify(state.user));if(!state.users.find(u=>u.empNo===emp)){state.users.push({empNo:emp,role:'USER',approved:true});localStorage.setItem('gra_v34_users',JSON.stringify(state.users));}document.getElementById('loginScreen').style.display='none';document.getElementById('userBadge').innerText=emp+' · DEMO';renderUsers();}
function logout(){sessionStorage.removeItem('gra_v34_user');state.user=null;document.getElementById('loginScreen').style.display='flex';}
function switchTab(tab){document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.id===tab));document.getElementById('pageTitle').innerText=document.querySelector(`[data-tab="${tab}"]`).innerText;if(tab==='dashboard')renderDashboard();if(tab==='contract')renderContractTable();if(tab==='location')renderMap();if(tab==='inward'){renderFacTable();renderPPW();}if(tab==='inwardClaim')renderInwardClaims();if(tab==='accident')renderAccidentTable();if(tab==='treaty')renderTreatyCards();if(tab==='impact')renderTreatyChoices();if(tab==='layer')renderLayerTable();if(tab==='pnl')renderPnlCandidates();if(tab==='docs')renderDocs();if(tab==='admin')renderUsers();}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
function toggleChecks(sel,checked){document.querySelectorAll(sel).forEach(x=>{if(!x.disabled)x.checked=checked;});}
function setMetaText(){['contractUpdate1','contractUpdate2','contractUpdate3'].forEach(id=>{let el=document.getElementById(id);if(el)el.innerText=state.meta.contractUploadAt;});['accidentUpdate','accidentUpdate2'].forEach(id=>{let el=document.getElementById(id);if(el)el.innerText=state.meta.accidentUploadAt;});let d=document.getElementById('docUpdate');if(d)d.innerText=state.meta.docUploadAt;}
function renewRows(){return DATA.contracts.filter(c=>dayDiff(c.renewalDate)>=0&&dayDiff(c.renewalDate)<=30).sort((a,b)=>dayDiff(a.renewalDate)-dayDiff(b.renewalDate));}
function ppwRows(){return state.fac.filter(f=>f.receivableStatus!=='정상'||dayDiff(f.ppwDate)<=14).sort((a,b)=>dayDiff(a.ppwDate)-dayDiff(b.ppwDate));}
function renderDashboard(){setMetaText();const renew=renewRows(), ppw=ppwRows();const topLayer=state.layers.map(l=>({...l,burn:(Number(l.paidUsedEok)+Number(l.outstandingUsedEok))/Math.max(1,Number(l.baseLimitEok)+Number(l.reinstatedLimitEok))*100})).sort((a,b)=>b.burn-a.burn)[0];document.getElementById('kpiRenew').innerText=renew.length+'건';document.getElementById('kpiPPW').innerText=ppw.length+'건';document.getElementById('kpiAccident').innerText=state.accidents.length+'건';document.getElementById('kpiLayer').innerText=topLayer?Math.round(topLayer.burn)+'%':'-';document.getElementById('todayTasks').innerHTML=`<div class="card-item" onclick="showDashboardList('renew')"><b>30일 이내 갱신계약</b><br>${renew.length}건 확인 필요</div><div class="card-item" onclick="showDashboardList('ppw')"><b>PPW 도래/미수 건</b><br>${ppw.length}건 담당자 확인 필요</div>`;document.getElementById('dashboardLayerBars').innerHTML=state.layers.slice(0,8).map(l=>{const burn=(l.paidUsedEok+l.outstandingUsedEok)/Math.max(1,l.baseLimitEok+l.reinstatedLimitEok)*100;return `<div class="layer-row"><b>${l.treatyName} / ${l.layer}</b><br>Paid ${eok(l.paidUsedEok)} + OS ${eok(l.outstandingUsedEok)} / 한도 ${eok(l.baseLimitEok+l.reinstatedLimitEok)}<div class="track"><span style="width:${Math.min(100,burn)}%"></span></div></div>`;}).join('');}
function showDashboardList(kind){const rows=kind==='renew'?renewRows():ppwRows();let html='<h3>'+(kind==='renew'?'30일 이내 갱신계약':'PPW 도래/미수 목록')+'</h3><div class="table-scroll"><table><thead><tr>';if(kind==='renew')html+='<th>증권번호</th><th>피보험자</th><th>보험종목</th><th>만기일</th><th>D-Day</th>';else html+='<th>수재관리번호</th><th>피보험자</th><th>PPW</th><th>미수상태</th><th>담당자</th>';html+='</tr></thead><tbody>';html+=rows.slice(0,20).map(r=>kind==='renew'?`<tr><td>${r.policyNo}</td><td>${r.insured}</td><td>${r.line}</td><td>${r.renewalDate}</td><td>D-${dayDiff(r.renewalDate)}</td></tr>`:`<tr><td>${r.inwardRef}</td><td>${r.insured}</td><td>${r.ppwDate}</td><td>${r.receivableStatus}</td><td>${r.owner}</td></tr>`).join('');html+='</tbody></table></div>';document.getElementById('dashboardList').innerHTML=html;}
function contractFiltered(){const q=(contractSearch?.value||'').toLowerCase(),s=contractLineFilter?.value||'전체';return DATA.contracts.filter(c=>(!q||JSON.stringify(c).toLowerCase().includes(q))&&(s==='전체'||c.line===s));}
function renderContractTable(){setMetaText();let rows=contractFiltered(),total=Math.max(1,Math.ceil(rows.length/PAGE));state.pages.contract=Math.min(state.pages.contract,total);let page=rows.slice((state.pages.contract-1)*PAGE,state.pages.contract*PAGE);contractCount.innerText=`검색 결과 ${rows.length}건`;document.querySelector('#contractTable tbody').innerHTML=page.map(c=>`<tr><td>${c.policyNo}</td><td>${c.insured}</td><td>${c.country}/${c.city}</td><td>${c.line}</td><td>${eok(c.tsiEok)}</td><td>${eok(c.premiumEok)}</td><td>${c.renewalDate}</td></tr>`).join('');contractPage.innerText=`${state.pages.contract} / ${total}`;}
function pageContract(d){state.pages.contract=Math.max(1,state.pages.contract+d);renderContractTable();}
function allRiskContracts(){return DATA.contracts.concat(state.fac.map(f=>({policyNo:f.inwardRef, insured:f.insured, country:f.country, city:f.city, line:f.line, tsiEok:f.tsiEok, sourceType:'플랫폼 수기등록', lat:f.lat, lng:f.lng})));}
function regionKey(c){return c.country+' / '+c.city;}
function regionAgg(){let m={};allRiskContracts().forEach(c=>{let k=regionKey(c);if(!m[k])m[k]={country:c.country,city:c.city,tsi:0,cnt:0,lat:c.lat,lng:c.lng};m[k].tsi+=Number(c.tsiEok||0);m[k].cnt++;});return Object.values(m).sort((a,b)=>b.tsi-a.tsi);}
function mapPos(lat,lng){return {x:(lng+180)/360*100,y:(90-lat)/180*100};}
function renderMap(){riskAsOf.innerText='기준일: '+DATA.meta.asOfDate+' / 단위: 억원';let regs=regionAgg();worldMap.innerHTML=regs.slice(0,30).map(r=>{let p=mapPos(r.lat,r.lng);return `<div class="map-pin" style="left:${p.x}%;top:${p.y}%" onclick="selectRegion('${r.country}','${r.city}')">${r.country}<br>${Math.round(r.tsi/1000)}k</div>`;}).join('');regionCards.innerHTML=regs.slice(0,12).map(r=>`<div class="region-card" onclick="selectRegion('${r.country}','${r.city}')"><b>${r.country} / ${r.city}</b><br>누적 가입금액 ${eok(r.tsi)} · 계약 ${r.cnt}건</div>`).join('');selectRegion(regs[0].country,regs[0].city);}
function selectRegion(country,city){state.selectedRegion={country,city};state.pages.region=1;renderRegionDrill();}
function regionRows(){if(!state.selectedRegion)return[];let q=(regionSearch?.value||'').toLowerCase();return allRiskContracts().filter(c=>c.country===state.selectedRegion.country&&c.city===state.selectedRegion.city&&(!q||JSON.stringify(c).toLowerCase().includes(q)));}
function renderRegionDrill(){let rows=regionRows(),total=Math.max(1,Math.ceil(rows.length/PAGE));state.pages.region=Math.min(state.pages.region,total);let page=rows.slice((state.pages.region-1)*PAGE,state.pages.region*PAGE);regionInfo.innerText=state.selectedRegion?`${state.selectedRegion.country} / ${state.selectedRegion.city} · ${rows.length}건`:'';document.querySelector('#regionTable tbody').innerHTML=page.map(c=>`<tr><td>${c.policyNo}</td><td>${c.insured}</td><td>${c.line}</td><td>${eok(c.tsiEok)}</td><td>${c.sourceType||'기간계 데이터'}</td></tr>`).join('');regionPage.innerText=`${state.pages.region} / ${total}`;}
function pageRegion(d){state.pages.region=Math.max(1,state.pages.region+d);renderRegionDrill();}
function nextInwardRef(){let nums=state.fac.map(f=>Number(String(f.inwardRef).replace(/\D/g,''))).filter(Boolean);return 'IR'+String(Math.max(...nums,202606000000)+1);}
function registerFac(){const cur=facCurrency.value,fx=DATA.fxRates[cur];const orig=Number(facPremiumOriginal.value||0);const row={inwardRef:nextInwardRef(),insured:facInsured.value,country:facCountry.value,city:facCity.value,line:facLine.value,tsiEok:Number(facTsi.value||0),premiumOriginal:orig,currency:cur,fxRate:fx,premiumEok:Math.max(1,Math.round(orig*fx/100000000)),cedant:facCedant.value,slipSummary:facSlipSummary.value,memo:facMemo.value,ppwDate:facPPW.value,receivableStatus:'미수',owner:facOwner.value||currentUser(),receivableOwner:'',receivableUpdatedAt:'',sourceType:'플랫폼 수기등록'};state.fac.unshift(row);saveAll();facMsg.innerText=row.inwardRef+' 등록 완료';renderFacTable();renderPPW();renderDashboard();}
function facFiltered(){const q=(facSearch?.value||'').toLowerCase(),s=facStatusFilter?.value||'전체';return state.fac.filter(f=>(!q||JSON.stringify(f).toLowerCase().includes(q))&&(s==='전체'||f.receivableStatus===s));}
function renderFacTable(){const rows=facFiltered();const total=Math.max(1,Math.ceil(rows.length/PAGE));state.pages.fac=Math.min(state.pages.fac,total);const page=rows.slice((state.pages.fac-1)*PAGE,state.pages.fac*PAGE);facCount.innerText=`검색 결과 ${rows.length}건 / 한 화면 10건 조회`;document.querySelector('#facTable tbody').innerHTML=page.map(f=>`<tr><td><input class="fac-check small-check" type="checkbox" value="${f.inwardRef}"/></td><td><button class="link-btn" onclick="showFac('${f.inwardRef}')">${f.inwardRef}</button></td><td>${f.insured}</td><td>${f.country}/${f.city}</td><td>${f.line}</td><td>${eok(f.premiumEok)}<br><small>${f.currency} / FX ${f.fxRate}</small></td><td>${f.ppwDate}</td><td>${f.receivableStatus}</td></tr>`).join('');facPage.innerText=`${state.pages.fac} / ${total}`;}
function pageFac(d){state.pages.fac=Math.max(1,state.pages.fac+d);renderFacTable();}
function deleteSelectedFac(){const ids=[...document.querySelectorAll('.fac-check:checked')].map(x=>x.value);if(!ids.length)return alert('삭제할 수재건을 선택하세요.');if(!confirm(ids.length+'건 삭제할까요?'))return;state.fac=state.fac.filter(f=>!ids.includes(f.inwardRef));state.inwardClaims=state.inwardClaims.filter(c=>!ids.includes(c.inwardRef));saveAll();renderFacTable();renderPPW();renderInwardClaimOptions();renderDashboard();}
function showFac(id){const f=state.fac.find(x=>x.inwardRef===id);facModalBody.innerHTML=`<div class="detail-grid"><b>수재관리번호</b><span>${f.inwardRef}</span><b>피보험자</b><span>${f.insured}</span><b>국가/도시</b><span>${f.country} / ${f.city}</span><b>보험종목</b><span>${f.line}</span><b>보험료</b><span>${eok(f.premiumEok)} (${f.currency})</span><b>출재사</b><span>${f.cedant}</span><b>PPW</b><span>${f.ppwDate}</span><b>미수상태</b><span>${f.receivableStatus}</span><b>등록 담당자</b><span>${f.owner}</span><b>미수 담당자</b><span>${f.receivableOwner||'-'}</span><b>Slip/인수내용</b><span>${f.slipSummary||'-'}</span></div><div class="result-box"><b>메모</b><br>${f.memo||'-'}</div>`;facModal.classList.add('show');}
function closeModal(e){if(e&&e.target.id!=='facModal')return;facModal.classList.remove('show');}
function ppwFiltered(){const q=(ppwSearch?.value||'').toLowerCase(),s=ppwStatusFilter?.value||'전체';return state.fac.filter(f=>(!q||JSON.stringify(f).toLowerCase().includes(q))&&(s==='전체'||f.receivableStatus===s)).sort((a,b)=>dayDiff(a.ppwDate)-dayDiff(b.ppwDate));}
function renderPPW(){const rows=ppwFiltered();const total=Math.max(1,Math.ceil(rows.length/PAGE));state.pages.ppw=Math.min(state.pages.ppw,total);const page=rows.slice((state.pages.ppw-1)*PAGE,state.pages.ppw*PAGE);document.querySelector('#ppwTable tbody').innerHTML=page.map(f=>`<tr><td>${f.inwardRef}</td><td>${f.insured}</td><td>${f.ppwDate}</td><td>D-${dayDiff(f.ppwDate)}</td><td><select id="recv_${f.inwardRef}"><option ${f.receivableStatus==='정상'?'selected':''}>정상</option><option ${f.receivableStatus==='미수'?'selected':''}>미수</option><option ${f.receivableStatus==='부분입금'?'selected':''}>부분입금</option><option ${f.receivableStatus==='확인중'?'selected':''}>확인중</option></select></td><td>${f.owner}</td><td>${f.receivableOwner||'-'}${f.receivableUpdatedAt?'<br><small>'+f.receivableUpdatedAt+'</small>':''}</td><td><button class="save-btn" onclick="savePPW('${f.inwardRef}')">저장</button></td></tr>`).join('');ppwPage.innerText=`${state.pages.ppw} / ${total}`;}
function pagePPW(d){state.pages.ppw=Math.max(1,state.pages.ppw+d);renderPPW();}
function savePPW(id){let f=state.fac.find(x=>x.inwardRef===id);f.receivableStatus=document.getElementById('recv_'+id).value;f.receivableOwner=currentUser();f.receivableUpdatedAt=new Date().toISOString().slice(0,16).replace('T',' ');saveAll();renderPPW();renderFacTable();renderDashboard();}
function renderInwardClaimOptions(){if(!icInwardRef)return;icInwardRef.innerHTML=state.fac.map(f=>`<option value="${f.inwardRef}">${f.inwardRef} / ${f.insured}</option>`).join('');}
function registerInwardClaim(){let f=state.fac.find(x=>x.inwardRef===icInwardRef.value);let no='ICL-USER-'+String(state.inwardClaims.length+1).padStart(4,'0');state.inwardClaims.unshift({claimNo:no,inwardRef:f.inwardRef,insured:f.insured,cause:icCause.value,estimatedLossEok:Number(icLoss.value||0),noticeDate:icDate.value||DATA.meta.asOfDate,status:'접수',surveyStatus:'미등록',sourceType:'사용자 수기등록'});saveAll();icMsg.innerText=no+' 등록 완료';renderInwardClaims();}
function renderInwardClaims(){renderInwardClaimOptions();document.querySelector('#icTable tbody').innerHTML=state.inwardClaims.slice(0,30).map(c=>`<tr><td>${c.claimNo}</td><td>${c.inwardRef}</td><td>${c.insured}</td><td>${c.cause}</td><td>${eok(c.estimatedLossEok)}</td><td>${c.status}</td><td><button class="save-btn" onclick="state.selectedIC='${c.claimNo}';surveySummary.innerHTML='${c.claimNo} 선택됨. 서베이리포트를 업로드하거나 AI 요약을 실행하세요.'">선택</button></td></tr>`).join('');}
function summarizeSurvey(){let c=state.inwardClaims.find(x=>x.claimNo===state.selectedIC)||state.inwardClaims[0];surveySummary.innerHTML=`<b>AI 서베이리포트 요약</b><br>대상 클레임: ${c.claimNo} / ${c.insured}<br>사고유형: ${c.cause}<br>추산손해액: ${eok(c.estimatedLossEok)}<br>추가 요청자료: 최종 손해사정서, 복구견적서, 사고 전후 사진, 원인조사보고서`;}
function nextClaimNo(){let n=state.accidents.filter(a=>String(a.claimNo).startsWith('UCLM-USER')).length+1;return 'UCLM-USER-'+String(n).padStart(4,'0');}
function registerAccident(){const paid=Number(accPaid.value||0),os=Number(accOS.value||0);state.accidents.unshift({claimNo:accClaimNo.value||nextClaimNo(),policyNo:accPolicyNo.value,insured:accInsured.value,line:accLine.value,country:accCountry.value,city:accCity.value,cause:accCause.value,claimDate:accDate.value||DATA.meta.asOfDate,paidLossEok:paid,outstandingLossEok:os,grossLossEok:paid+os,status:accStatus.value,sourceType:'사용자 수기등록',sourceSystem:'Accident Data Register',memo:''});saveAll();accMsg.innerText='사고데이터 등록 완료';renderAccidentTable();renderDashboard();}
function normalizeAcc(r,src){const paid=Number(r['Paid손해액']||r['Paid']||r.paidLossEok||0),os=Number(r['Outstanding손해액']||r['Outstanding']||r.outstandingLossEok||0);return {claimNo:String(r['사고번호']||r.claimNo||nextClaimNo()),policyNo:String(r['증권번호']||r.policyNo||''),insured:String(r['피보험자']||r.insured||''),country:String(r['국가']||r.country||''),city:String(r['도시']||r.city||''),line:String(r['보험종목']||r.line||''),cause:String(r['사고유형']||r.cause||''),paidLossEok:paid,outstandingLossEok:os,grossLossEok:paid+os,claimDate:String(r['사고일']||r.claimDate||''),status:String(r['처리상태']||r.status||'접수'),sourceType:src,sourceSystem:'Excel Upload',memo:String(r['메모']||'')};}
function parseCsv(txt){const lines=txt.split(/\r?\n/).filter(x=>x.trim());const h=lines[0].split(',').map(x=>x.trim());return lines.slice(1).map(line=>{let v=line.split(',');let o={};h.forEach((k,i)=>o[k]=v[i]||'');return o;});}
async function previewAccidentFile(file){if(!file)return;let rows=[];if(file.name.endsWith('.csv'))rows=parseCsv(await file.text());else{if(typeof XLSX==='undefined')return accUploadMsg.innerHTML='엑셀 파서가 로드되지 않았습니다. CSV를 이용하세요.';const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});}state.previewAcc=rows.map(r=>normalizeAcc(r,'엑셀 업로드'));accUploadMsg.innerHTML=`${file.name} 미리보기 ${state.previewAcc.length}건`;}
function importAccidents(){let rows=state.previewAcc||[];if(!rows.length)return alert('먼저 파일을 선택하세요.');if(accUploadMode.value==='replace')state.accidents=state.accidents.filter(a=>a.sourceType!=='엑셀 업로드').concat(rows);else state.accidents=rows.concat(state.accidents);state.meta.accidentUploadAt=new Date().toISOString().slice(0,16).replace('T',' ');saveAll();setMetaText();renderAccidentTable();renderDashboard();accUploadMsg.innerHTML=`${rows.length}건 업로드 반영 완료. 수기등록 데이터는 유지됩니다.`;}
function accFiltered(){const q=(accSearch?.value||'').toLowerCase(),s=accSourceFilter?.value||'전체';return state.accidents.filter(a=>(!q||JSON.stringify(a).toLowerCase().includes(q))&&(s==='전체'||a.sourceType===s));}
function renderAccidentTable(){setMetaText();const rows=accFiltered();const total=Math.max(1,Math.ceil(rows.length/PAGE));state.pages.acc=Math.min(state.pages.acc,total);const page=rows.slice((state.pages.acc-1)*PAGE,state.pages.acc*PAGE);accCount.innerText=`검색 결과 ${rows.length}건 / 한 화면 10건 조회`;document.querySelector('#accTable tbody').innerHTML=page.map(a=>`<tr><td>${a.claimNo}</td><td>${a.policyNo}</td><td>${a.insured}</td><td>${a.cause}</td><td>${eok(a.paidLossEok)}</td><td>${eok(a.outstandingLossEok)}</td><td>${eok(a.grossLossEok)}</td><td>${a.status}</td><td>${a.sourceType==='기간계 데이터'?'<span class="data-badge">기간계 데이터</span>':a.sourceType}</td></tr>`).join('');accPage.innerText=`${state.pages.acc} / ${total}`;}
function pageAcc(d){state.pages.acc=Math.max(1,state.pages.acc+d);renderAccidentTable();}
function renderTreatyCards(){treatyCards.innerHTML=DATA.treaties.map(t=>`<div class="panel"><h3>${t.name}</h3><p class="muted">${t.description}</p><p><b>유형</b> ${t.type}</p><p><b>Exclusion</b> ${t.exclusions.join(', ')}</p><table><thead><tr><th>Layer</th><th>From</th><th>To</th><th>Lead</th></tr></thead><tbody>${t.layers.map(l=>`<tr><td>${l.layer}</td><td>${eok(l.from)}</td><td>${eok(l.to)}</td><td>${l.lead}</td></tr>`).join('')}</tbody></table></div>`).join('');}
function calcRecoverable(){const paid=Number(impactPaid.value||0),os=Number(impactOS.value||0),gross=paid+os,ded=Number(impactExcluded.value||0)+Number(impactDeductible.value||0)+Number(impactOver.value||0)+Number(impactNonRec.value||0),rec=Math.max(0,gross-ded);recoverableBox.innerHTML=`Gross ${eok(gross)} - 차감항목 ${eok(ded)} = <b>${eok(rec)}</b>`;return {paid,os,gross,ded,rec};}
function renderTreatyChoices(){const type=impactType?.value||'Risk';treatyChoices.innerHTML=DATA.treaties.map(t=>{let text=t.name+' '+t.type;let checked=(type==='Risk'&&/Risk|Marine|Casualty/.test(text))||(type!=='Risk'&&/Cat/.test(text));return `<label><input type="checkbox" class="impact-treaty" value="${t.treatyId}" ${checked?'checked':''}> <b>${t.name}</b><br><small>${t.description}</small></label>`;}).join('');}
function fillImpactExample(){impactName.value='미국 공장 화재 손해 분석';impactType.value='Risk';impactCause.value='화재, 전기설비 사고';impactCnt.value=1;impactHours.value='해당 없음';impactRegion.value='미국 Georgia';impactPaid.value=100;impactOS.value=100;impactExcluded.value=20;impactDeductible.value=30;impactOver.value=0;impactNonRec.value=0;impactDesc.value='단일 공장 전기설비 화재로 건물 및 기계설비 손상. 최종 원인보고서 확인 필요.';renderTreatyChoices();calcRecoverable();}
function calcTreaty(rec,t){let out=[];let total=0;t.layers.forEach((l,i)=>{let cap=l.to-l.from;let used=i===0?Math.min(rec,cap):Math.max(0,Math.min(rec,l.to)-l.from);let isRet=i===0||/Retention/.test(l.layer);let recover=isRet?0:used;if(!isRet)total+=recover;out.push({...l,cap,used,recover,isRet});});return {rows:out,total};}
function runImpact(){const c=calcRecoverable();let ids=[...document.querySelectorAll('.impact-treaty:checked')].map(x=>x.value);let html='',total=0;ids.forEach(id=>{let t=DATA.treaties.find(x=>x.treatyId===id),r=calcTreaty(c.rec,t);total+=r.total;html+=`<div class="chart-row"><b>${t.name}</b>${r.rows.map(row=>`<div class="layer-row"><b>${row.layer}</b> ${row.isRet?'(회사 보유/Retention)':'(재보험 회수 대상)'}<br>구간 ${eok(row.from)} 초과~${eok(row.to)} / 사용 ${eok(row.used)} / 회수 ${eok(row.recover)}<div class="track"><span style="width:${Math.min(100,row.used/Math.max(1,row.cap)*100)}%"></span></div></div>`).join('')}</div>`;});total=Math.min(total,c.rec);impactGross.innerText=eok(c.gross);impactRecovBase.innerText=eok(c.rec);impactRecovery.innerText=eok(total);impactNet.innerText=eok(Math.max(0,c.gross-total));impactChart.innerHTML=html||'프로그램을 선택하세요.';impactComment.innerHTML=`① Gross 손해액 = Paid ${eok(c.paid)} + Outstanding ${eok(c.os)} = <b>${eok(c.gross)}</b><br>② 회수 가능 손해액 = Gross ${eok(c.gross)} - 차감항목 ${eok(c.ded)} = <b>${eok(c.rec)}</b><br>③ 각 Treaty의 Retention/회사 보유구간을 먼저 차감하고 초과 Layer만 회수액으로 계산합니다.<br>④ 재보험 회수액 <b>${eok(total)}</b>, 회사 보유손해 <b>${eok(Math.max(0,c.gross-total))}</b>`;}
function renderLayerTable(){document.querySelector('#layerTable tbody').innerHTML=state.layers.map((l,i)=>{let denom=l.baseLimitEok+l.reinstatedLimitEok,burn=(l.paidUsedEok+l.outstandingUsedEok)/Math.max(1,denom)*100,remain=Math.max(0,denom-l.paidUsedEok-l.outstandingUsedEok);return `<tr><td>${l.treatyName}</td><td>${l.layer}</td><td>${eok(l.baseLimitEok)}</td><td><input id="ly_paid_${i}" type="number" value="${l.paidUsedEok}" style="width:90px"/></td><td><input id="ly_os_${i}" type="number" value="${l.outstandingUsedEok}" style="width:90px"/></td><td><input id="ly_re_${i}" type="number" value="${l.reinstatedLimitEok}" style="width:90px"/></td><td>${eok(remain)}</td><td>${Math.round(burn)}%</td><td><button class="save-btn" onclick="saveLayer(${i})">저장</button></td></tr>`;}).join('');}
function saveLayer(i){let l=state.layers[i];l.paidUsedEok=Number(document.getElementById('ly_paid_'+i).value||0);l.outstandingUsedEok=Number(document.getElementById('ly_os_'+i).value||0);l.reinstatedLimitEok=Number(document.getElementById('ly_re_'+i).value||0);l.updatedBy=currentUser();l.updatedAt=new Date().toISOString().slice(0,16).replace('T',' ');saveAll();renderLayerTable();renderDashboard();}
function calcReinstatement(){let prem=Number(rpAnnual.value||0),limit=Number(rpLimit.value||1),used=Number(rpUsed.value||0),rate=Number(rpRate.value||0)/100,remain=Number(rpRemainDays.value||0),days=Number(rpPolicyDays.value||365);let amt=prem*(used/limit)*rate*(remain/days);rpResult.innerHTML=`계산식: 연간 재보험료 × 사용액/Layer한도 × 복원보험료율 × 잔여기간/보험기간<br>${eok(prem)} × ${used}/${limit} × ${Math.round(rate*100)}% × ${remain}/${days} = <b>${eok(amt)}</b>`;}
function renderPnlCandidates(){const q=(pnlSearch?.value||'').toLowerCase();let rows=DATA.contracts.filter(c=>!q||JSON.stringify(c).toLowerCase().includes(q)).slice(0,80);pnlCandidates.innerHTML=rows.map(c=>`<label class="candidate"><input type="checkbox" class="pnl-check" value="${c.policyNo}"> <b>${c.policyNo}</b> / ${c.insured} / ${c.country} ${c.city} / ${c.line} / 보험료 ${eok(c.premiumEok)}</label>`).join('');}
function applyPnl(){const ids=[...document.querySelectorAll('.pnl-check:checked')].map(x=>x.value);const rows=DATA.contracts.filter(c=>ids.includes(c.policyNo));const earned=rows.reduce((a,c)=>a+c.premiumEok*0.92,0);const actualLoss=state.accidents.filter(a=>ids.includes(a.policyNo)).reduce((a,c)=>a+Number(c.grossLossEok||0),0);const claimPolicies=new Set(state.accidents.filter(a=>ids.includes(a.policyNo)).map(a=>a.policyNo));const estimate=rows.filter(c=>!claimPolicies.has(c.policyNo)).reduce((a,c)=>a+c.premiumEok*0.92*c.lossRatio/100,0);const loss=actualLoss+estimate;pnlCount.innerText=rows.length+'건';pnlEarned.innerText=eok(earned);pnlLoss.innerText=eok(loss);pnlLR.innerText=earned?((loss/earned*100).toFixed(1)+'%'):'-';pnlDetail.innerHTML=`실제 사고 Gross 손해액: <b>${eok(actualLoss)}</b><br>사고 없는 계약 손해율 추정액: <b>${eok(estimate)}</b><br>합산 발생손해액: <b>${eok(loss)}</b>`;}
function registerDoc(){let id='USER-'+String(state.docs.filter(d=>d.docId.startsWith('USER-')).length+1).padStart(3,'0');state.docs.unshift({docId:id,title:docTitle.value,type:docType.value,keywords:docKeywords.value,file:'',sourceType:'사용자등록'});saveAll();docMsg.innerText=id+' 등록 완료';renderDocs();}
function renderDocs(){setMetaText();document.querySelector('#docTable tbody').innerHTML=state.docs.map(d=>`<tr><td><input class="doc-check small-check" type="checkbox" value="${d.docId}" ${d.sourceType==='기본제공'?'disabled':''}></td><td>${d.docId}</td><td>${d.title}</td><td>${d.type}</td><td>${d.keywords}</td><td>${d.file?'<a href="'+d.file+'" target="_blank">PDF</a>':'사용자 업로드'}</td><td>${d.sourceType}</td></tr>`).join('');}
function deleteSelectedDocs(){let ids=[...document.querySelectorAll('.doc-check:checked')].map(x=>x.value);if(!ids.length)return alert('삭제할 문서를 선택하세요.');state.docs=state.docs.filter(d=>!ids.includes(d.docId));saveAll();renderDocs();}
function askCopilot(){let q=copilotQ.value||'';copilotA.innerHTML=`<b>AI Copilot 예시 답변</b><br>질문: ${q}<br><br>관련 문서: Package 보험 보통약관, Property Risk XL Treaty Wording, Cat XL Hours Clause Memo를 우선 참고합니다.<br>검토 방향: 사고원인/소재지 → 약관 담보·면책 → 회수 가능 손해액 → 영향 Treaty 및 Layer → 추가 요청자료 순으로 확인하세요.`;}
function updateSystemDate(type){let now=new Date().toISOString().slice(0,16).replace('T',' ');if(type==='contract'){state.meta.contractUploadAt=now;adminContractMsg.innerText='계약데이터 업로드일 갱신: '+now;}else{state.meta.accidentUploadAt=now;adminAccidentMsg.innerText='사고데이터 업로드일 갱신: '+now;}saveAll();setMetaText();renderDashboard();}
function renderUsers(){let tb=document.querySelector('#userTable tbody');if(!tb)return;tb.innerHTML=state.users.map(u=>`<tr><td>${u.empNo}</td><td>${u.role}</td><td>승인</td><td><button class="danger-btn" onclick="state.users=state.users.filter(x=>x.empNo!=='${u.empNo}');localStorage.setItem('gra_v34_users',JSON.stringify(state.users));renderUsers();">삭제</button></td></tr>`).join('');}
window.addEventListener('load',()=>{if(state.user){loginScreen.style.display='none';userBadge.innerText=state.user.empNo+' · DEMO';}setMetaText();renderDashboard();renderContractTable();renderMap();renderFacTable();renderPPW();renderInwardClaims();renderAccidentTable();renderTreatyCards();renderTreatyChoices();renderLayerTable();renderDocs();renderUsers();});


/* ===== v36 기능 보완 ===== */

// 1) v17 방식 Leaflet 지도 복원
let leafletMapV36 = null;
let leafletLayerV36 = null;
function renderMap(){
  riskAsOf.innerText = '기준일: ' + DATA.meta.asOfDate + ' / 단위: 억원';
  const regs = regionAgg();
  regionCards.innerHTML = regs.slice(0,12).map(r => `<div class="region-card" onclick="selectRegion('${r.country}','${r.city}')"><b>${r.country} / ${r.city}</b><br>누적 가입금액 ${eok(r.tsi)} · 계약 ${r.cnt}건</div>`).join('');

  if(typeof L === 'undefined'){
    const el = document.getElementById('leafletMap');
    if(el) el.innerHTML = '<div class="result-box">지도 라이브러리를 불러오지 못했습니다. 사내망에서는 Leaflet JS/CSS를 내부망 정적자원으로 배포하면 확대/축소 지도가 작동합니다.</div>';
    if(regs[0]) selectRegion(regs[0].country, regs[0].city);
    return;
  }

  if(!leafletMapV36){
    leafletMapV36 = L.map('leafletMap', {scrollWheelZoom:true}).setView([25, 105], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap'
    }).addTo(leafletMapV36);
  }
  if(leafletLayerV36) leafletLayerV36.remove();
  leafletLayerV36 = L.layerGroup().addTo(leafletMapV36);

  regs.forEach(r => {
    const level = r.tsi > 120000 ? 'high' : (r.tsi < 45000 ? 'low' : '');
    const icon = L.divIcon({className:'risk-marker', html:`<div class="risk-pin ${level}">${Math.round(r.tsi/1000)}k</div>`, iconSize:[36,36], iconAnchor:[18,18]});
    L.marker([r.lat, r.lng], {icon}).addTo(leafletLayerV36)
      .bindPopup(`<b>${r.country} / ${r.city}</b><br>누적가입금액 ${eok(r.tsi)}<br>계약 ${r.cnt}건`)
      .on('click', () => selectRegion(r.country, r.city));
  });
  setTimeout(()=>leafletMapV36.invalidateSize(), 100);
  if(regs[0]) selectRegion(regs[0].country, regs[0].city);
}

// 2) 임의수재 상세 수정 기능
function showFac(id){
  const f = state.fac.find(x=>x.inwardRef===id);
  if(!f) return;
  facModalBody.innerHTML = `
    <div class="form-grid labeled">
      <label>수재관리번호<input id="editFacId" value="${f.inwardRef}" disabled/></label>
      <label>피보험자<input id="editFacInsured" value="${f.insured||''}"/></label>
      <label>국가<input id="editFacCountry" value="${f.country||''}"/></label>
      <label>도시<input id="editFacCity" value="${f.city||''}"/></label>
      <label>보험종목<input id="editFacLine" value="${f.line||''}"/></label>
      <label>가입금액 TSI(억원)<input id="editFacTsi" type="number" value="${f.tsiEok||0}"/></label>
      <label>보험료(억원)<input id="editFacPremium" type="number" value="${f.premiumEok||0}"/></label>
      <label>통화<input id="editFacCurrency" value="${f.currency||''}"/></label>
      <label>출재사<input id="editFacCedant" value="${f.cedant||''}"/></label>
      <label>PPW<input id="editFacPPW" type="date" value="${f.ppwDate||''}"/></label>
      <label>미수상태<select id="editFacReceivable"><option ${f.receivableStatus==='정상'?'selected':''}>정상</option><option ${f.receivableStatus==='미수'?'selected':''}>미수</option><option ${f.receivableStatus==='부분입금'?'selected':''}>부분입금</option><option ${f.receivableStatus==='확인중'?'selected':''}>확인중</option></select></label>
      <label>등록 담당자<input id="editFacOwner" value="${f.owner||''}"/></label>
    </div>
    <label class="full-label">Slip/인수내용 요약<input id="editFacSlip" value="${f.slipSummary||''}"/></label>
    <label class="full-label">수재계약 메모<textarea id="editFacMemo" rows="4">${f.memo||''}</textarea></label>
    <div class="result-box">미수 담당자: ${f.receivableOwner||'-'} ${f.receivableUpdatedAt ? '/ 최종변경 ' + f.receivableUpdatedAt : ''}</div>
    <div class="edit-actions"><button class="secondary-btn" onclick="closeModal()">취소</button><button onclick="saveFacEdit()">수정 저장</button></div>
  `;
  facModal.classList.add('show');
}
function saveFacEdit(){
  const id = document.getElementById('editFacId').value;
  const f = state.fac.find(x=>x.inwardRef===id);
  if(!f) return;
  f.insured = editFacInsured.value;
  f.country = editFacCountry.value;
  f.city = editFacCity.value;
  f.line = editFacLine.value;
  f.tsiEok = Number(editFacTsi.value||0);
  f.premiumEok = Number(editFacPremium.value||0);
  f.currency = editFacCurrency.value;
  f.cedant = editFacCedant.value;
  f.ppwDate = editFacPPW.value;
  f.receivableStatus = editFacReceivable.value;
  f.owner = editFacOwner.value;
  f.slipSummary = editFacSlip.value;
  f.memo = editFacMemo.value;
  f.lastEditedBy = currentUser();
  f.lastEditedAt = new Date().toISOString().slice(0,16).replace('T',' ');
  saveAll();
  renderFacTable();
  renderPPW();
  renderDashboard();
  closeModal();
}

// 3) 해외수재 클레임 검색형 등록
state.selectedClaimContract = state.selectedClaimContract || null;
function renderClaimContractSearch(){
  const q = (document.getElementById('icContractSearch')?.value || '').toLowerCase();
  const rows = state.fac
    .filter(f => !q || JSON.stringify(f).toLowerCase().includes(q))
    .slice(0, 20);
  const box = document.getElementById('icContractResults');
  if(!box) return;
  box.innerHTML = rows.map(f => `<div class="candidate"><span><b>${f.inwardRef}</b><br><small>${f.insured} / ${f.cedant || '-'} / ${f.country} ${f.city} / PPW ${f.ppwDate}</small></span><button onclick="selectClaimContract('${f.inwardRef}')">선택</button></div>`).join('') || '<div class="mini-msg">검색 결과가 없습니다.</div>';
}
function selectClaimContract(ref){
  const f = state.fac.find(x=>x.inwardRef===ref);
  state.selectedClaimContract = ref;
  document.getElementById('icSelectedContract').innerHTML = `<b>${f.inwardRef}</b><br>${f.insured}<br>${f.country}/${f.city} · ${f.line}<br>출재사 ${f.cedant || '-'} · PPW ${f.ppwDate} · 미수상태 ${f.receivableStatus}`;
  if(!document.getElementById('icOwner').value) document.getElementById('icOwner').value = currentUser();
}
function nextInwardClaimNoV36(){
  const n = state.inwardClaims.filter(c => String(c.claimNo).startsWith('ICL-USER')).length + 1;
  return 'ICL-USER-' + String(n).padStart(4,'0');
}
function registerInwardClaim(){
  const f = state.fac.find(x=>x.inwardRef===state.selectedClaimContract);
  if(!f) return alert('먼저 수재계약을 검색해 선택하세요.');
  const paid = Number(icPaid.value||0), os = Number(icOS.value||0);
  const no = icClaimNo.value || nextInwardClaimNoV36();
  state.inwardClaims.unshift({
    claimNo:no, inwardRef:f.inwardRef, insured:f.insured, cedant:f.cedant,
    country:f.country, city:f.city, line:f.line, cause:icCause.value,
    lossDate:icLossDate.value, noticeDate:icDate.value||DATA.meta.asOfDate,
    paidLossEok:paid, outstandingLossEok:os, estimatedLossEok:Number(icLoss.value||paid+os),
    status:icStatus.value, owner:icOwner.value||currentUser(), surveyStatus:icSurveyStatus.value,
    desc:icDesc.value, sourceType:'사용자 수기등록'
  });
  saveAll();
  icMsg.innerText = no + ' 등록 완료';
  renderInwardClaims();
}
function renderInwardClaims(){
  renderClaimContractSearch();
  const q = (document.getElementById('icQueueSearch')?.value || '').toLowerCase();
  const st = document.getElementById('icQueueStatus')?.value || '전체';
  const rows = state.inwardClaims.filter(c => (!q || JSON.stringify(c).toLowerCase().includes(q)) && (st==='전체' || c.status===st)).slice(0, 40);
  const tbody = document.querySelector('#icTable tbody');
  if(!tbody) return;
  tbody.innerHTML = rows.map(c => `<tr><td>${c.claimNo}</td><td>${c.inwardRef}</td><td>${c.insured}</td><td>${c.cause}</td><td>${eok(c.paidLossEok||0)} / ${eok(c.outstandingLossEok||0)}</td><td>${c.status}</td><td><button class="save-btn" onclick="state.selectedIC='${c.claimNo}';surveySummary.innerHTML='${c.claimNo} 선택됨. 서베이리포트를 업로드하거나 AI 요약을 실행하세요.'">선택</button></td></tr>`).join('');
}
function summarizeSurvey(){
  const c = state.inwardClaims.find(x=>x.claimNo===state.selectedIC) || state.inwardClaims[0];
  if(!c) return;
  surveySummary.innerHTML = `<b>AI 서베이리포트 요약</b><br>대상 클레임: ${c.claimNo} / ${c.insured}<br>사고유형: ${c.cause}<br>Paid/OS: ${eok(c.paidLossEok||0)} / ${eok(c.outstandingLossEok||0)}<br>추산손해액: ${eok(c.estimatedLossEok)}<br>담보 쟁점: Slip, 약관, PPW/on-risk 및 Exclusion 검토 필요<br>추가 요청자료: 최종 손해사정서, 복구견적서, 사고 전후 사진, 원인조사보고서`;
}
function draftClaimMemo(){
  const c = state.inwardClaims.find(x=>x.claimNo===state.selectedIC) || state.inwardClaims[0];
  if(!c) return;
  surveySummary.innerHTML = `<b>처리문서 초안</b><br>1) 접수: ${c.noticeDate || '-'} 기준 ${c.claimNo} 접수<br>2) 대상 수재계약: ${c.inwardRef} / ${c.insured}<br>3) 사고개요: ${c.cause}, 추산손해액 ${eok(c.estimatedLossEok)}<br>4) 확인사항: on-risk, PPW 수납, 담보/면책, 재보험 회수 가능성<br>5) 추가자료: 서베이리포트, 복구견적, 사진, 출재사 질의 회신`;
}

// 4) 재보험 프로그램 시각화 + Hover 상세
function participantsFor(treatyId, layer){
  const pool = {
    'TR-01':['Korean Re 35%','Swiss Re 25%','Munich Re 20%','Hannover Re 20%'],
    'TR-02':['Swiss Re 30%','Munich Re 25%','Hannover Re 25%','Partner Re 20%'],
    'TR-03':['Lloyds 30%','Canopius 25%','Arundo Re 25%','Korean Re 20%'],
    'TR-04':['Partner Re 35%','Hannover Re 30%','SCOR 20%','Korean Re 15%']
  };
  return (pool[treatyId] || ['Korean Re 40%','Global Re 30%','Lloyds 30%']).join(', ');
}
function renderTreatyCards(){
  treatyCards.innerHTML = DATA.treaties.map(t => `
    <div class="treaty-visual-card">
      <h3>${t.name}</h3>
      <p class="muted">${t.description}</p>
      <p><b>유형</b> ${t.type} · <b>Exclusion</b> ${t.exclusions.join(', ')}</p>
      <div class="treaty-layer-stack">
        ${t.layers.map(l => `
          <div class="treaty-layer-box" onmouseenter="showTreatyHover(event,'${t.treatyId}','${l.layer.replace(/'/g,"\\'")}')" onmousemove="moveTreatyHover(event)" onmouseleave="hideTreatyHover()">
            <b>${l.layer}</b>
            <div>구간: ${eok(l.from)} 초과 ~ ${eok(l.to)}</div>
            <div>Lead: ${l.lead}</div>
            <div class="participants">참여: ${participantsFor(t.treatyId,l.layer)}</div>
          </div>
        `).join('')}
      </div>
    </div>`).join('');
}
function showTreatyHover(e, treatyId, layerName){
  const t = DATA.treaties.find(x=>x.treatyId===treatyId);
  const l = t.layers.find(x=>x.layer===layerName);
  const pop = document.getElementById('treatyHoverPopover');
  pop.innerHTML = `<b>${t.name} / ${l.layer}</b><br>유형: ${t.type}<br>Layer 구간: ${eok(l.from)} 초과 ~ ${eok(l.to)}<br>Lead: ${l.lead}<br>참여재보험자: ${participantsFor(treatyId, layerName)}<br>주요 Exclusion: ${t.exclusions.join(', ')}<br><br><span class="muted">실제 구축 시 Treaty wording, 참여율, 복원조건, Notice 기준을 문서관리와 연계합니다.</span>`;
  pop.classList.add('show');
  moveTreatyHover(e);
}
function moveTreatyHover(e){
  const pop = document.getElementById('treatyHoverPopover');
  pop.style.left = Math.min(window.innerWidth - 760, e.clientX + 18) + 'px';
  pop.style.top = Math.min(window.innerHeight - 420, e.clientY + 18) + 'px';
}
function hideTreatyHover(){
  document.getElementById('treatyHoverPopover')?.classList.remove('show');
}

// 5) Layer 초기화
function resetLayers(){
  if(!confirm('Layer 사용액과 복원 후 추가한도를 모두 0으로 초기화할까요?')) return;
  state.layers.forEach(l => {
    l.paidUsedEok = 0;
    l.outstandingUsedEok = 0;
    l.reinstatedLimitEok = 0;
    l.updatedBy = currentUser();
    l.updatedAt = new Date().toISOString().slice(0,16).replace('T',' ');
  });
  saveAll();
  renderLayerTable();
  renderDashboard();
}

// 6) 손익·PML 분석 검색형 다중선택으로 재구성
state.pnlSelected = state.pnlSelected || [];
function renderPnlCandidates(){
  const q = (pnlSearch?.value || '').toLowerCase().trim();
  if(!q || q.length < 2){
    pnlCandidates.innerHTML = '<div class="mini-msg">증권번호, 피보험자, 국가, 보험종목을 2글자 이상 입력해 검색하세요.</div>';
    renderPnlSelected();
    return;
  }
  const rows = DATA.contracts
    .filter(c => JSON.stringify(c).toLowerCase().includes(q))
    .slice(0, 30);
  pnlCandidates.innerHTML = rows.map(c => `<div class="candidate"><span><b>${c.policyNo}</b><br><small>${c.insured} / ${c.country} ${c.city} / ${c.line} / 보험료 ${eok(c.premiumEok)}</small></span><button onclick="addPnlContract('${c.policyNo}')">추가</button></div>`).join('') || '<div class="mini-msg">검색 결과가 없습니다.</div>';
  renderPnlSelected();
}
function addPnlContract(no){
  if(!state.pnlSelected.includes(no)) state.pnlSelected.push(no);
  renderPnlSelected();
}
function removePnlContract(no){
  state.pnlSelected = state.pnlSelected.filter(x => x !== no);
  renderPnlSelected();
}
function renderPnlSelected(){
  const box = document.getElementById('pnlSelectedList');
  if(!box) return;
  const rows = DATA.contracts.filter(c => state.pnlSelected.includes(c.policyNo));
  box.innerHTML = rows.length ? rows.map(c => `<span class="chip">${c.policyNo} · ${c.insured.slice(0,18)} <button onclick="removePnlContract('${c.policyNo}')">×</button></span>`).join('') : '검색 후 계약을 추가하세요.';
}
function applyPnl(){
  const ids = state.pnlSelected || [];
  const rows = DATA.contracts.filter(c => ids.includes(c.policyNo));
  const earned = rows.reduce((a,c)=>a+c.premiumEok*0.92,0);
  const expense = rows.reduce((a,c)=>a+c.premiumEok*0.92*(c.expenseRatio||18)/100,0);
  const actualLoss = state.accidents.filter(a=>ids.includes(a.policyNo)).reduce((a,c)=>a+Number(c.grossLossEok||0),0);
  const tsi = rows.reduce((a,c)=>a+Number(c.tsiEok||0),0);
  const pml = tsi * Number(document.getElementById('pmlRate')?.value || 0) / 100;
  const underwriting = earned - expense - actualLoss;
  pnlCount.innerText = rows.length + '건';
  pnlEarned.innerText = eok(earned);
  pnlLoss.innerText = eok(actualLoss);
  pnlPML.innerText = eok(pml);
  pnlDetail.innerHTML = `
    <b>계산 기준</b><br>
    선택 계약 ${rows.length}건의 경과보험료, 사업비, 실제 사고데이터를 합산합니다.<br>
    사고가 없는 계약은 현재 발생손해액을 0으로 두며, 미래 대형손해 가능성은 PML 시나리오로 별도 확인합니다.<br><br>
    경과보험료: <b>${eok(earned)}</b><br>
    사업비 추정: <b>${eok(expense)}</b><br>
    실제 발생손해액: <b>${eok(actualLoss)}</b><br>
    약식 Underwriting Result: <b>${eok(underwriting)}</b><br>
    선택 가입금액 합계: <b>${eok(tsi)}</b><br>
    PML ${document.getElementById('pmlRate')?.value || 0}% 시나리오 예상손해액: <b>${eok(pml)}</b>
  `;
}

// 7) AI Copilot 대화형 화면
state.chat = state.chat || [];
function renderCopilotChat(){
  const log = document.getElementById('chatLog');
  if(!log) return;
  log.innerHTML = state.chat.map(m => `<div class="msg ${m.role}">${m.text}</div>`).join('') || '<div class="msg ai">안녕하세요. 계약, 사고, 수재, 재보험, 약관·특약에 대해 질문해 주세요.</div>';
  log.scrollTop = log.scrollHeight;
}
function quickPrompt(text){
  copilotQ.value = text;
  sendCopilot();
}
function sendCopilot(){
  const q = (copilotQ.value || '').trim();
  if(!q) return;
  state.chat.push({role:'user', text:q});
  const lower = q.toLowerCase();
  let ans = '';
  if(lower.includes('ppw') || q.includes('미수')){
    const rows = state.fac.filter(f => f.receivableStatus !== '정상' || dayDiff(f.ppwDate) <= 14).slice(0,5);
    ans = `<b>PPW/미수 점검 결과</b><br>${rows.map(f=>`${f.inwardRef} / ${f.insured} / PPW ${f.ppwDate} / ${f.receivableStatus} / 담당 ${f.owner}`).join('<br>')}<br><br>우선 PPW 임박, 미수상태, 담당자 공백 여부를 확인하세요.`;
  }else if(lower.includes('hours') || q.includes('태풍') || q.includes('cat')){
    ans = `<b>Cat/Event 검토 방향</b><br>1) 사고 발생 기간과 지역을 확인해 Hours Clause 범위 내 Event인지 판단<br>2) 영향 계약 수와 총 손해액 집계<br>3) Cat XL Treaty의 Exclusion 및 Notice 조건 확인<br>4) Layer 소진 관리에서 Paid/Outstanding 사용액 업데이트`;
  }else{
    ans = `<b>AI 검토 예시</b><br>질문 내용 기준으로 관련 문서는 Package 보험 보통약관, Property Risk XL Treaty Wording, 사용자 업로드 Slip 문서를 우선 참고합니다.<br>검토 순서: 사고원인/소재지 → 약관 담보·면책 → 회수 가능 손해액 → 영향 Treaty 및 Layer → 추가 요청자료입니다.`;
  }
  state.chat.push({role:'ai', text:ans});
  copilotQ.value = '';
  renderCopilotChat();
}

// switchTab 보강
const oldSwitchTabV36 = switchTab;
switchTab = function(tab){
  oldSwitchTabV36(tab);
  if(tab === 'location') setTimeout(renderMap, 80);
  if(tab === 'inwardClaim') { renderClaimContractSearch(); renderInwardClaims(); }
  if(tab === 'treaty') renderTreatyCards();
  if(tab === 'pnl') { renderPnlCandidates(); renderPnlSelected(); }
  if(tab === 'copilot') renderCopilotChat();
};

window.addEventListener('load', () => {
  setTimeout(() => {
    renderClaimContractSearch();
    renderPnlSelected();
    renderCopilotChat();
  }, 300);
});


/* ===== v37: 클레임/업로드 검증/재보험 그래프/Layer 사고계약 관리 ===== */

// Excel/CSV helpers with strict column validation
function validateHeaders(rows, required, msgBoxId){
  if(!rows || !rows.length){
    document.getElementById(msgBoxId).innerHTML = '<div class="required-warn">등록불가 파일입니다. 데이터 행이 없습니다.</div>';
    return false;
  }
  const headers = new Set(Object.keys(rows[0]));
  const missing = required.filter(h => !headers.has(h));
  if(missing.length){
    document.getElementById(msgBoxId).innerHTML = `<div class="required-warn">등록불가 파일입니다. 필수 컬럼이 없습니다: ${missing.join(', ')}</div>`;
    return false;
  }
  return true;
}
async function readExcelOrCsvStrict(file, msgBoxId){
  if(!file) return [];
  let rows = [];
  if(file.name.toLowerCase().endsWith('.csv')){
    rows = parseCsv(await file.text());
  }else{
    if(typeof XLSX === 'undefined'){
      document.getElementById(msgBoxId).innerHTML = '<div class="required-warn">엑셀 파서를 불러오지 못했습니다. CSV 파일을 사용하세요.</div>';
      return [];
    }
    const wb = XLSX.read(await file.arrayBuffer(), {type:'array'});
    const sheet = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(sheet, {defval:''});
  }
  return rows;
}

// 사고데이터 업로드 검증/삭제
const ACC_REQUIRED = ['사고번호','증권번호','피보험자','국가','도시','보험종목','사고유형','Paid손해액','Outstanding손해액','사고일','처리상태'];
async function previewAccidentFile(file){
  const rows = await readExcelOrCsvStrict(file, 'accUploadMsg');
  if(!rows.length){ state.previewAcc = []; return; }
  if(!validateHeaders(rows, ACC_REQUIRED, 'accUploadMsg')){ state.previewAcc = []; return; }
  state.previewAcc = rows.map(r=>normalizeAcc(r,'엑셀 업로드'));
  accUploadMsg.innerHTML = `<b>${file.name}</b> 미리보기 ${state.previewAcc.length}건<br>업로드 반영 버튼을 누르면 등록됩니다.`;
}
function renderAccidentTable(){
  setMetaText();
  const rows = accFiltered();
  const total = Math.max(1, Math.ceil(rows.length/PAGE));
  state.pages.acc = Math.min(state.pages.acc,total);
  const page = rows.slice((state.pages.acc-1)*PAGE,state.pages.acc*PAGE);
  accCount.innerText = `검색 결과 ${rows.length}건 / 한 화면 10건 조회`;
  document.querySelector('#accTable tbody').innerHTML = page.map(a => {
    const deletable = a.sourceType !== '기간계 데이터';
    return `<tr><td><input class="acc-check small-check" type="checkbox" value="${a.claimNo}" ${deletable?'':'disabled'}/></td><td>${a.claimNo}</td><td>${a.policyNo}</td><td>${a.insured}</td><td>${a.cause}</td><td>${eok(a.paidLossEok)}</td><td>${eok(a.outstandingLossEok)}</td><td>${eok(a.grossLossEok)}</td><td>${a.status}</td><td>${a.sourceType==='기간계 데이터'?'<span class="data-badge">기간계 데이터</span>':a.sourceType}</td></tr>`;
  }).join('');
  accPage.innerText = `${state.pages.acc} / ${total}`;
}
function deleteSelectedAccidents(){
  const ids = [...document.querySelectorAll('.acc-check:checked')].map(x=>x.value);
  if(!ids.length) return alert('삭제할 사고데이터를 선택하세요.');
  if(!confirm(`선택한 사고데이터 ${ids.length}건을 삭제할까요? 기간계 데이터는 삭제되지 않습니다.`)) return;
  state.accidents = state.accidents.filter(a => !(ids.includes(a.claimNo) && a.sourceType !== '기간계 데이터'));
  saveAll();
  renderAccidentTable();
  renderDashboard();
}

// 해외수재 클레임: 검색한 수재건에 클레임 등록 + 필수값 검증
state.selectedClaimContract = state.selectedClaimContract || null;
function renderClaimContractSearch(){
  const q = (document.getElementById('icContractSearch')?.value || '').toLowerCase();
  const rows = state.fac.filter(f => !q || JSON.stringify(f).toLowerCase().includes(q)).slice(0, 25);
  const box = document.getElementById('icContractResults');
  if(!box) return;
  box.innerHTML = rows.map(f => `<div class="candidate"><span><b>${f.inwardRef}</b><br><small>${f.insured} / ${f.cedant || '-'} / ${f.country} ${f.city} / PPW ${f.ppwDate}</small></span><button onclick="selectClaimContract('${f.inwardRef}')">선택</button></div>`).join('') || '<div class="mini-msg">검색 결과가 없습니다.</div>';
}
function selectClaimContract(ref){
  const f = state.fac.find(x=>x.inwardRef===ref);
  state.selectedClaimContract = ref;
  document.getElementById('icSelectedContract').innerHTML = `<b>선택된 수재계약</b><br>${f.inwardRef} / ${f.insured}<br>${f.country}/${f.city} · ${f.line}<br>출재사 ${f.cedant || '-'} · PPW ${f.ppwDate} · 미수상태 ${f.receivableStatus}`;
  if(!document.getElementById('icOwner').value) document.getElementById('icOwner').value = currentUser();
}
function nextInwardClaimNoV37(){
  const n = state.inwardClaims.filter(c => String(c.claimNo).startsWith('ICL-USER')).length + 1;
  return 'ICL-USER-' + String(n).padStart(4,'0');
}
function requiredClaimOk(){
  const missing = [];
  if(!state.selectedClaimContract) missing.push('대상 수재계약 선택');
  if(!icCause.value.trim()) missing.push('사고유형');
  if(!icLossDate.value) missing.push('사고일');
  if(!icDate.value) missing.push('통지일');
  if(!icOwner.value.trim()) missing.push('담당자');
  if(missing.length){
    icMsg.innerHTML = `<span class="required-warn">필수값을 입력하세요: ${missing.join(', ')}</span>`;
    return false;
  }
  return true;
}
function registerInwardClaim(){
  if(!requiredClaimOk()) return;
  const f = state.fac.find(x=>x.inwardRef===state.selectedClaimContract);
  if(!f) return alert('선택된 수재계약을 찾을 수 없습니다.');
  const paid = Number(icPaid.value||0), os = Number(icOS.value||0);
  const no = icClaimNo.value || nextInwardClaimNoV37();
  state.inwardClaims.unshift({
    claimNo:no, inwardRef:f.inwardRef, insured:f.insured, cedant:f.cedant,
    country:f.country, city:f.city, line:f.line, cause:icCause.value,
    lossDate:icLossDate.value, noticeDate:icDate.value,
    paidLossEok:paid, outstandingLossEok:os, estimatedLossEok:Number(icLoss.value||paid+os),
    status:icStatus.value, owner:icOwner.value||currentUser(), surveyStatus:icSurveyStatus.value,
    desc:icDesc.value, sourceType:'사용자 수기등록'
  });
  saveAll();
  icMsg.innerText = `${no} 등록 완료 · 클레임 Queue에 집적되었습니다.`;
  renderInwardClaims();
}

// 해외수재 클레임 업로드 검증/등록/삭제
const IC_REQUIRED = ['사고번호','수재관리번호','사고유형','사고일','통지일','Paid손해액','Outstanding손해액','추산손해액','처리상태','담당자','서베이상태'];
function normalizeInwardClaimUpload(r){
  const ref = String(r['수재관리번호']||'');
  const f = state.fac.find(x=>x.inwardRef===ref) || {};
  return {
    claimNo:String(r['사고번호']||nextInwardClaimNoV37()),
    inwardRef:ref,
    insured:f.insured || String(r['피보험자']||''),
    cedant:f.cedant || String(r['출재사']||''),
    country:f.country || String(r['국가']||''),
    city:f.city || String(r['도시']||''),
    line:f.line || String(r['보험종목']||''),
    cause:String(r['사고유형']||''),
    lossDate:String(r['사고일']||''),
    noticeDate:String(r['통지일']||''),
    paidLossEok:Number(r['Paid손해액']||0),
    outstandingLossEok:Number(r['Outstanding손해액']||0),
    estimatedLossEok:Number(r['추산손해액']||0),
    status:String(r['처리상태']||'접수'),
    owner:String(r['담당자']||currentUser()),
    surveyStatus:String(r['서베이상태']||'미등록'),
    desc:String(r['사고개요']||''),
    sourceType:'엑셀 업로드'
  };
}
async function previewInwardClaimFile(file){
  const rows = await readExcelOrCsvStrict(file, 'icUploadMsg');
  if(!rows.length){ state.previewInwardClaims = []; return; }
  if(!validateHeaders(rows, IC_REQUIRED, 'icUploadMsg')){ state.previewInwardClaims = []; return; }
  const invalidRefs = rows.map(r=>String(r['수재관리번호']||'')).filter(ref => !state.fac.find(f=>f.inwardRef===ref));
  if(invalidRefs.length){
    icUploadMsg.innerHTML = `<div class="required-warn">등록불가 파일입니다. 존재하지 않는 수재관리번호가 있습니다: ${[...new Set(invalidRefs)].slice(0,5).join(', ')}</div>`;
    state.previewInwardClaims = [];
    return;
  }
  state.previewInwardClaims = rows.map(normalizeInwardClaimUpload);
  icUploadMsg.innerHTML = `<b>${file.name}</b> 미리보기 ${state.previewInwardClaims.length}건<br>업로드 반영 버튼을 누르면 클레임 Queue에 등록됩니다.`;
}
function importInwardClaims(){
  const rows = state.previewInwardClaims || [];
  if(!rows.length) return alert('먼저 정상 양식의 클레임 파일을 선택하세요.');
  if(icUploadMode.value === 'replace'){
    state.inwardClaims = state.inwardClaims.filter(c => c.sourceType !== '엑셀 업로드').concat(rows);
  }else{
    state.inwardClaims = rows.concat(state.inwardClaims);
  }
  saveAll();
  icUploadMsg.innerHTML = `<b>${rows.length}건 등록 완료</b><br>클레임 Queue에 반영되었습니다.`;
  renderInwardClaims();
}
function renderInwardClaims(){
  renderClaimContractSearch();
  const q = (document.getElementById('icQueueSearch')?.value || '').toLowerCase();
  const st = document.getElementById('icQueueStatus')?.value || '전체';
  const rows = state.inwardClaims.filter(c => (!q || JSON.stringify(c).toLowerCase().includes(q)) && (st==='전체' || c.status===st)).slice(0, 80);
  const tbody = document.querySelector('#icTable tbody');
  if(!tbody) return;
  tbody.innerHTML = rows.map(c => `<tr><td><input class="ic-check small-check" type="checkbox" value="${c.claimNo}"/></td><td>${c.claimNo}</td><td>${c.inwardRef}</td><td>${c.insured}</td><td>${c.cause}</td><td>${eok(c.paidLossEok||0)} / ${eok(c.outstandingLossEok||0)}</td><td>${c.status}</td><td><button class="save-btn" onclick="state.selectedIC='${c.claimNo}';surveySummary.innerHTML='${c.claimNo} 선택됨. 서베이리포트를 업로드하거나 AI 요약을 실행하세요.'">선택</button></td></tr>`).join('');
}
function deleteSelectedInwardClaims(){
  const ids = [...document.querySelectorAll('.ic-check:checked')].map(x=>x.value);
  if(!ids.length) return alert('삭제할 클레임을 선택하세요.');
  if(!confirm(`선택한 클레임 ${ids.length}건을 삭제할까요?`)) return;
  state.inwardClaims = state.inwardClaims.filter(c => !ids.includes(c.claimNo));
  saveAll();
  renderInwardClaims();
}

// 재보험 프로그램 그래프형 시각화
function renderTreatyCards(){
  treatyCards.innerHTML = DATA.treaties.map(t => {
    const maxTo = Math.max(...t.layers.map(l=>l.to));
    return `<div class="treaty-graph-card">
      <h3>${t.name}</h3>
      <p class="muted">${t.description}</p>
      <p><b>유형</b> ${t.type} · <b>Exclusion</b> ${t.exclusions.join(', ')}</p>
      <div class="program-graph">
        <div class="layer-axis"><span>${eok(maxTo)}</span><span>${eok(0)}</span></div>
        <div class="layer-bars">
          ${t.layers.map(l => {
            const height = Math.max(42, (l.to-l.from)/maxTo*280);
            const ret = /Retention/i.test(l.layer) ? 'retention' : '';
            return `<div class="layer-visual ${ret}" style="height:${height}px" onmouseenter="showTreatyHover(event,'${t.treatyId}','${l.layer.replace(/'/g,"\\'")}')" onmousemove="moveTreatyHover(event)" onmouseleave="hideTreatyHover()">
              <b>${l.layer}</b><br>
              <span>${eok(l.from)} 초과 ~ ${eok(l.to)}</span>
              <div class="lead">Lead: ${l.lead}</div>
              <div class="participants">참여: ${participantsFor(t.treatyId,l.layer)}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
  }).join('');
}

// Layer별 사고계약 연결 관리
state.layerClaims = JSON.parse(localStorage.getItem('gra_v37_layer_claims') || JSON.stringify(DATA.layerClaims || []));
function saveLayerClaims(){
  localStorage.setItem('gra_v37_layer_claims', JSON.stringify(state.layerClaims || []));
}
function renderLayerTable(){
  const tbody = document.querySelector('#layerTable tbody');
  tbody.innerHTML = state.layers.map((l,i)=>{
    let denom=l.baseLimitEok+l.reinstatedLimitEok;
    let burn=(l.paidUsedEok+l.outstandingUsedEok)/Math.max(1,denom)*100;
    let remain=Math.max(0,denom-l.paidUsedEok-l.outstandingUsedEok);
    const linked = (state.layerClaims||[]).filter(x=>x.statusId===l.statusId);
    return `<tr><td>${l.treatyName}</td><td>${l.layer}</td><td>${eok(l.baseLimitEok)}</td><td><input id="ly_paid_${i}" type="number" value="${l.paidUsedEok}" style="width:90px"/></td><td><input id="ly_os_${i}" type="number" value="${l.outstandingUsedEok}" style="width:90px"/></td><td><input id="ly_re_${i}" type="number" value="${l.reinstatedLimitEok}" style="width:90px"/></td><td>${eok(remain)}</td><td>${Math.round(burn)}%</td><td><button class="save-btn" onclick="saveLayer(${i})">저장</button><br><button onclick="addLayerClaim('${l.statusId}')" style="margin-top:6px">사고/계약 추가</button></td></tr>
    <tr><td colspan="9"><div class="layer-claim-box"><b>연결 사고/계약</b>${linked.length?linked.map(x=>`<span class="layer-claim-chip">${x.claimNo || x.policyNo} · ${x.insured || ''} <button onclick="deleteLayerClaim('${l.statusId}','${x.claimNo || x.policyNo}')">×</button></span>`).join(''):'<span class="mini-msg">연결된 사고/계약 없음</span>'}</div></td></tr>`;
  }).join('');
}
function addLayerClaim(statusId){
  const key = prompt('추가할 사고번호 또는 증권번호를 입력하세요.');
  if(!key) return;
  const acc = state.accidents.find(a => a.claimNo===key || a.policyNo===key || (a.insured||'').includes(key));
  const pol = DATA.contracts.find(c => c.policyNo===key || (c.insured||'').includes(key));
  if(!acc && !pol) return alert('일치하는 사고/계약을 찾지 못했습니다.');
  const rec = acc ? {statusId, claimNo:acc.claimNo, policyNo:acc.policyNo, insured:acc.insured, paidLossEok:acc.paidLossEok, outstandingLossEok:acc.outstandingLossEok, note:'사용자 추가'} : {statusId, claimNo:'', policyNo:pol.policyNo, insured:pol.insured, paidLossEok:0, outstandingLossEok:0, note:'사용자 추가'};
  state.layerClaims = state.layerClaims || [];
  if(state.layerClaims.find(x=>x.statusId===statusId && (x.claimNo||x.policyNo)===(rec.claimNo||rec.policyNo))) return alert('이미 연결된 사고/계약입니다.');
  state.layerClaims.push(rec);
  saveLayerClaims();
  renderLayerTable();
}
function deleteLayerClaim(statusId, key){
  state.layerClaims = (state.layerClaims||[]).filter(x => !(x.statusId===statusId && (x.claimNo||x.policyNo)===key));
  saveLayerClaims();
  renderLayerTable();
}
function resetLayers(){
  if(!confirm('Layer 사용액과 복원 후 추가한도를 모두 0으로 초기화할까요? 연결 사고/계약 정보는 유지됩니다.')) return;
  state.layers.forEach(l => {
    l.paidUsedEok = 0;
    l.outstandingUsedEok = 0;
    l.reinstatedLimitEok = 0;
    l.updatedBy = currentUser();
    l.updatedAt = new Date().toISOString().slice(0,16).replace('T',' ');
  });
  saveAll();
  renderLayerTable();
  renderDashboard();
}

// 최초 진입 보강
const oldSwitchTabV37 = switchTab;
switchTab = function(tab){
  oldSwitchTabV37(tab);
  if(tab === 'inwardClaim'){ renderClaimContractSearch(); renderInwardClaims(); }
  if(tab === 'treaty'){ renderTreatyCards(); }
  if(tab === 'layer'){ renderLayerTable(); }
};
window.addEventListener('load', () => {
  setTimeout(() => {
    renderClaimContractSearch();
    renderInwardClaims();
    renderTreatyCards();
    renderLayerTable();
  }, 300);
});


/* ===== v38: workflow quality improvements ===== */

// ---------- 해외수재 클레임: 실제 선택 연동/필수값/Queue/업로드 삭제 안정화 ----------
state.selectedClaimContract = state.selectedClaimContract || null;
state.previewInwardClaims = state.previewInwardClaims || [];

function setClaimContractReadOnly(f){
  const box = document.getElementById('icSelectedContract');
  if(!box) return;
  box.innerHTML = `<div class="claim-selected-strong">선택된 수재계약: ${f.inwardRef}</div>
    <div class="detail-grid" style="margin-top:10px">
      <b>피보험자</b><span>${f.insured}</span>
      <b>출재사</b><span>${f.cedant || '-'}</span>
      <b>소재지</b><span>${f.country} / ${f.city}</span>
      <b>보험종목</b><span>${f.line}</span>
      <b>PPW</b><span>${f.ppwDate || '-'}</span>
      <b>미수상태</b><span>${f.receivableStatus || '-'}</span>
    </div>`;
}
function selectClaimContract(ref){
  const f = state.fac.find(x=>x.inwardRef===ref);
  if(!f) return alert('선택한 수재계약을 찾을 수 없습니다.');
  state.selectedClaimContract = ref;
  setClaimContractReadOnly(f);
  if(document.getElementById('icOwner') && !icOwner.value) icOwner.value = currentUser();
  if(document.getElementById('icQueueSearch')) icQueueSearch.value = ref;
  renderInwardClaims();
}
function renderClaimContractSearch(){
  const q = (document.getElementById('icContractSearch')?.value || '').toLowerCase();
  const rows = state.fac
    .filter(f => !q || JSON.stringify(f).toLowerCase().includes(q))
    .slice(0, 25);
  const box = document.getElementById('icContractResults');
  if(!box) return;
  box.innerHTML = rows.map(f => `<div class="candidate"><span><b>${f.inwardRef}</b><br><small>${f.insured} / ${f.cedant || '-'} / ${f.country} ${f.city} / PPW ${f.ppwDate} / ${f.receivableStatus}</small></span><button onclick="selectClaimContract('${f.inwardRef}')">이 계약 선택</button></div>`).join('') || '<div class="mini-msg">검색 결과가 없습니다.</div>';
  if(state.selectedClaimContract){
    const f = state.fac.find(x=>x.inwardRef===state.selectedClaimContract);
    if(f) setClaimContractReadOnly(f);
  }
}
function requiredClaimOk(){
  const missing = [];
  if(!state.selectedClaimContract) missing.push('대상 수재계약 선택');
  if(!document.getElementById('icCause')?.value.trim()) missing.push('사고유형');
  if(!document.getElementById('icLossDate')?.value) missing.push('사고일');
  if(!document.getElementById('icDate')?.value) missing.push('통지일');
  if(!document.getElementById('icOwner')?.value.trim()) missing.push('담당자');
  const paid = Number(document.getElementById('icPaid')?.value || 0);
  const os = Number(document.getElementById('icOS')?.value || 0);
  const est = Number(document.getElementById('icLoss')?.value || 0);
  if(paid + os + est <= 0) missing.push('손해액');
  if(missing.length){
    icMsg.innerHTML = `<span class="required-warn">필수값을 입력하세요: ${missing.join(', ')}</span>`;
    return false;
  }
  return true;
}
function registerInwardClaim(){
  if(!requiredClaimOk()) return;
  const f = state.fac.find(x=>x.inwardRef===state.selectedClaimContract);
  const paid = Number(icPaid.value||0), os = Number(icOS.value||0);
  const no = icClaimNo.value || nextInwardClaimNoV37();
  const row = {
    claimNo:no, inwardRef:f.inwardRef, insured:f.insured, cedant:f.cedant,
    country:f.country, city:f.city, line:f.line, cause:icCause.value,
    lossDate:icLossDate.value, noticeDate:icDate.value,
    paidLossEok:paid, outstandingLossEok:os, estimatedLossEok:Number(icLoss.value||paid+os),
    status:icStatus.value, owner:icOwner.value||currentUser(), surveyStatus:icSurveyStatus.value,
    desc:icDesc.value, sourceType:'사용자 수기등록',
    createdBy: currentUser(), createdAt: new Date().toISOString().slice(0,16).replace('T',' ')
  };
  state.inwardClaims.unshift(row);
  saveAll();
  icMsg.innerText = `${no} 등록 완료 · ${f.inwardRef} 클레임 Queue에 집적되었습니다.`;
  icQueueSearch.value = f.inwardRef;
  renderInwardClaims();
}
function renderInwardClaims(){
  renderClaimContractSearch();
  const q = (document.getElementById('icQueueSearch')?.value || '').toLowerCase();
  const st = document.getElementById('icQueueStatus')?.value || '전체';
  const rows = state.inwardClaims.filter(c => (!q || JSON.stringify(c).toLowerCase().includes(q)) && (st==='전체' || c.status===st)).slice(0, 120);
  const tbody = document.querySelector('#icTable tbody');
  if(!tbody) return;
  tbody.innerHTML = rows.map(c => `<tr>
    <td><input class="ic-check small-check" type="checkbox" value="${c.claimNo}"/></td>
    <td>${c.claimNo}</td><td>${c.inwardRef}</td><td>${c.insured}</td><td>${c.cause}</td>
    <td>${eok(c.paidLossEok||0)} / ${eok(c.outstandingLossEok||0)}</td>
    <td>${c.status}<br><small>${c.sourceType||''}</small></td>
    <td><button class="save-btn" onclick="selectInwardClaim('${c.claimNo}')">선택</button></td>
  </tr>`).join('');
}
function selectInwardClaim(no){
  const c = state.inwardClaims.find(x=>x.claimNo===no);
  if(!c) return;
  state.selectedIC = no;
  surveySummary.innerHTML = `<b>${c.claimNo} 선택됨</b><br>${c.inwardRef} / ${c.insured}<br>사고유형 ${c.cause} · Paid/OS ${eok(c.paidLossEok||0)} / ${eok(c.outstandingLossEok||0)}<br>서베이리포트를 업로드하거나 AI 요약/처리문서 초안을 실행하세요.`;
}
function deleteSelectedInwardClaims(){
  const ids = [...document.querySelectorAll('.ic-check:checked')].map(x=>x.value);
  if(!ids.length) return alert('삭제할 클레임을 선택하세요.');
  if(!confirm(`선택한 클레임 ${ids.length}건을 삭제할까요?`)) return;
  state.inwardClaims = state.inwardClaims.filter(c => !ids.includes(c.claimNo));
  saveAll();
  renderInwardClaims();
}
function normalizeInwardClaimUpload(r){
  const ref = String(r['수재관리번호']||'');
  const f = state.fac.find(x=>x.inwardRef===ref) || {};
  return {
    claimNo:String(r['사고번호']||nextInwardClaimNoV37()),
    inwardRef:ref,
    insured:f.insured || String(r['피보험자']||''),
    cedant:f.cedant || String(r['출재사']||''),
    country:f.country || String(r['국가']||''),
    city:f.city || String(r['도시']||''),
    line:f.line || String(r['보험종목']||''),
    cause:String(r['사고유형']||''),
    lossDate:String(r['사고일']||''),
    noticeDate:String(r['통지일']||''),
    paidLossEok:Number(r['Paid손해액']||0),
    outstandingLossEok:Number(r['Outstanding손해액']||0),
    estimatedLossEok:Number(r['추산손해액']||0),
    status:String(r['처리상태']||'접수'),
    owner:String(r['담당자']||currentUser()),
    surveyStatus:String(r['서베이상태']||'미등록'),
    desc:String(r['사고개요']||''),
    sourceType:'엑셀 업로드'
  };
}

// ---------- 문서관리 필수값/PDF 텍스트 인덱싱 ----------
state.pendingDocText = '';
state.pendingDocFileName = '';
async function previewDocPdf(file){
  state.pendingDocText = '';
  state.pendingDocFileName = file ? file.name : '';
  if(!file){
    docPreviewMsg.innerText = 'PDF 파일을 선택하세요.';
    return;
  }
  if(file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')){
    docPreviewMsg.innerHTML = '<span class="required-warn">PDF 파일만 등록할 수 있습니다.</span>';
    return;
  }
  docPreviewMsg.innerText = 'PDF 텍스트 추출 중...';
  try{
    if(typeof pdfjsLib === 'undefined'){
      docPreviewMsg.innerHTML = 'PDF 텍스트 추출 라이브러리를 불러오지 못했습니다. 문서는 등록되지만 AI 본문요약은 파일명/키워드 기준으로만 동작합니다.';
      return;
    }
    if(pdfjsLib.GlobalWorkerOptions) pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({data:buf}).promise;
    let text = '';
    const maxPages = Math.min(pdf.numPages, 20);
    for(let p=1; p<=maxPages; p++){
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      text += content.items.map(x=>x.str).join(' ') + '\n';
    }
    state.pendingDocText = text.slice(0, 20000);
    docPreviewMsg.innerHTML = `<span class="doc-index-ok">PDF 텍스트 추출 완료</span> · ${pdf.numPages}페이지 중 ${maxPages}페이지 인덱싱`;
  }catch(e){
    docPreviewMsg.innerHTML = 'PDF 텍스트 추출에 실패했습니다. 문서는 등록되지만 AI 본문요약은 파일명/키워드 기준으로만 동작합니다.';
  }
}
function registerDoc(){
  const title = (docTitle.value || '').trim();
  const type = (docType.value || '').trim();
  const keywords = (docKeywords.value || '').trim();
  const file = document.getElementById('docFile')?.files?.[0];
  const missing = [];
  if(!title) missing.push('문서명');
  if(!type) missing.push('구분');
  if(!keywords) missing.push('키워드');
  if(!file && !state.pendingDocFileName) missing.push('PDF 파일');
  if(missing.length){
    docMsg.innerHTML = `<span class="required-warn">필수값을 입력하세요: ${missing.join(', ')}</span>`;
    return;
  }
  const id = 'USER-' + String(state.docs.filter(d=>String(d.docId).startsWith('USER-')).length+1).padStart(3,'0');
  state.docs.unshift({
    docId:id, title, type, keywords,
    file: state.pendingDocFileName ? '(브라우저 업로드) ' + state.pendingDocFileName : '',
    sourceType:'사용자등록',
    fileName: state.pendingDocFileName || '',
    text: state.pendingDocText || '',
    indexed: !!state.pendingDocText,
    registeredBy: currentUser(),
    registeredAt: new Date().toISOString().slice(0,16).replace('T',' ')
  });
  saveAll();
  docMsg.innerText = `${id} 등록 완료`;
  ['docTitle','docType','docKeywords'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  const f = document.getElementById('docFile'); if(f) f.value = '';
  state.pendingDocText = ''; state.pendingDocFileName = '';
  docPreviewMsg.innerText = '문서명, 구분, 키워드, PDF 파일은 필수입니다.';
  renderDocs();
}
function renderDocs(){
  setMetaText();
  const tbody = document.querySelector('#docTable tbody');
  if(!tbody) return;
  tbody.innerHTML = state.docs.map(d => `<tr>
    <td><input class="doc-check small-check" type="checkbox" value="${d.docId}" ${d.sourceType==='기본제공'?'disabled':''}></td>
    <td>${d.docId}</td><td>${d.title}</td><td>${d.type}</td><td>${d.keywords}</td>
    <td>${d.file && String(d.file).startsWith('assets/') ? '<a href="'+d.file+'" target="_blank">PDF</a>' : (d.fileName || d.file || '-')}</td>
    <td>${d.indexed || d.text ? '<span class="doc-index-ok">본문 인덱싱</span>' : '<span class="doc-index-no">메타데이터</span>'}</td>
    <td>${d.sourceType}</td>
  </tr>`).join('');
}

// ---------- AI Copilot: 등록 PDF 텍스트 검색/요약 ----------
function searchDocsForQuery(q){
  const terms = q.toLowerCase().split(/\s+/).filter(x=>x.length>1);
  const scored = state.docs.map(d => {
    const hay = ((d.title||'') + ' ' + (d.type||'') + ' ' + (d.keywords||'') + ' ' + (d.text||'')).toLowerCase();
    const score = terms.reduce((a,t)=>a+(hay.includes(t)?1:0),0) + (d.text?1:0);
    return {d,score};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,3);
  return scored;
}
function summarizeDocText(d, q){
  const txt = (d.text||'').replace(/\s+/g,' ').trim();
  if(!txt) return `${d.title}: 등록된 본문 텍스트가 없어 문서명/키워드 기준으로만 검토합니다. 키워드: ${d.keywords || '-'}`;
  const parts = txt.split(/(?<=[.。다])\s+/).filter(s=>s.length>20);
  const qterms = q.toLowerCase().split(/\s+/).filter(x=>x.length>1);
  const picked = parts.filter(s => qterms.some(t => s.toLowerCase().includes(t))).slice(0,4);
  return `<b>${d.title}</b><br>${(picked.length ? picked : parts.slice(0,4)).join('<br>')}`;
}
function sendCopilot(){
  const q = (copilotQ.value || '').trim();
  if(!q) return;
  state.chat.push({role:'user', text:q});
  const lower = q.toLowerCase();
  let ans = '';
  const docHits = searchDocsForQuery(q);
  if(lower.includes('pdf') || q.includes('문서') || q.includes('약관') || q.includes('특약') || q.includes('요약')){
    ans = `<b>문서 기반 답변</b><br>${docHits.length ? docHits.map(x=>summarizeDocText(x.d,q)).join('<br><br>') : '질문과 일치하는 등록 문서를 찾지 못했습니다.'}`;
    if(docHits.length) ans += `<div class="chat-source">참고문서: ${docHits.map(x=>x.d.title).join(', ')}</div>`;
  }else if(lower.includes('ppw') || q.includes('미수')){
    const rows = state.fac.filter(f => f.receivableStatus !== '정상' || dayDiff(f.ppwDate) <= 14).slice(0,5);
    ans = `<b>PPW/미수 점검 결과</b><br>${rows.map(f=>`${f.inwardRef} / ${f.insured} / PPW ${f.ppwDate} / ${f.receivableStatus} / 담당 ${f.owner}`).join('<br>')}<br><br>우선 PPW 임박, 미수상태, 담당자 공백 여부를 확인하세요.`;
  }else if(lower.includes('hours') || q.includes('태풍') || q.includes('cat')){
    ans = `<b>Cat/Event 검토 방향</b><br>1) 사고 발생 기간과 지역을 확인해 Hours Clause 범위 내 Event인지 판단<br>2) 영향 계약 수와 총 손해액 집계<br>3) Cat XL Treaty의 Exclusion 및 Notice 조건 확인<br>4) Layer 소진 관리에서 Paid/Outstanding 사용액 업데이트`;
  }else{
    ans = `<b>AI 검토 예시</b><br>질문 내용 기준으로 관련 문서는 Package 보험 보통약관, Property Risk XL Treaty Wording, 사용자 업로드 Slip 문서를 우선 참고합니다.<br>검토 순서: 사고원인/소재지 → 약관 담보·면책 → 회수 가능 손해액 → 영향 Treaty 및 Layer → 추가 요청자료입니다.`;
    if(docHits.length) ans += `<div class="chat-source">관련 등록문서: ${docHits.map(x=>x.d.title).join(', ')}</div>`;
  }
  state.chat.push({role:'ai', text:ans});
  copilotQ.value = '';
  renderCopilotChat();
}

// ---------- 재보험 프로그램 그래프 안정화 ----------
function renderTreatyCards(){
  const safe = (s) => String(s||'').replace(/'/g,'&#39;');
  treatyCards.innerHTML = `<div class="program-waterfall">` + DATA.treaties.map(t => {
    const maxTo = Math.max(...t.layers.map(l=>l.to));
    const w = 900, h = 340, x = 150, barW = 250;
    const scale = (v) => h - 40 - (v / maxTo) * 260;
    const layerSvg = t.layers.map((l, idx) => {
      const yTop = scale(l.to), yBot = scale(l.from), height = Math.max(30, yBot-yTop);
      const cls = /Retention/i.test(l.layer) ? 'layer-rect retention' : 'layer-rect';
      return `<rect class="${cls}" x="${x}" y="${yTop}" width="${barW}" height="${height}" rx="10" onmouseenter="showTreatyHover(event,'${t.treatyId}','${safe(l.layer)}')" onmousemove="moveTreatyHover(event)" onmouseleave="hideTreatyHover()"></rect>
        <text class="layer-label" x="${x+12}" y="${yTop+20}">${l.layer}</text>
        <text class="layer-sub" x="${x+12}" y="${yTop+38}">${eok(l.from)} 초과 ~ ${eok(l.to)}</text>
        <line x1="${x+barW}" y1="${yTop+height/2}" x2="${x+barW+80}" y2="${yTop+height/2}" stroke="#cbd5e1" stroke-width="2"></line>
        <circle class="lead-node" cx="${x+barW+100}" cy="${yTop+height/2}" r="20"></circle>
        <text class="node-text" x="${x+barW+130}" y="${yTop+height/2+4}">Lead: ${l.lead}</text>`;
    }).join('');
    return `<div class="treaty-graph-card"><h3>${t.name}</h3><p class="muted">${t.description}</p>
      <svg class="program-layers-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMinYMin meet">
        <text class="layer-sub" x="22" y="38">${eok(maxTo)}</text>
        <text class="layer-sub" x="22" y="${h-42}">${eok(0)}</text>
        <line x1="120" y1="40" x2="120" y2="${h-40}" stroke="#94a3b8" stroke-dasharray="4 4"></line>
        ${layerSvg}
        <text class="layer-sub" x="520" y="38">참여재보험자: ${participantsFor(t.treatyId,'').replace(/&/g,'&amp;')}</text>
      </svg>
    </div>`;
  }).join('') + `</div>`;
}

// ---------- Layer 연결 초기화 + Layer 연결사고 화면 보강 ----------
function resetLayerClaims(){
  if(!confirm('Layer에 연결된 사고/계약 정보를 모두 초기화할까요? 사용액은 유지됩니다.')) return;
  state.layerClaims = [];
  saveLayerClaims();
  renderLayerTable();
}
function addLayerClaim(statusId){
  const key = prompt('추가할 사고번호, 증권번호 또는 피보험자명을 입력하세요.');
  if(!key) return;
  const acc = state.accidents.find(a => a.claimNo===key || a.policyNo===key || (a.insured||'').includes(key));
  const pol = DATA.contracts.find(c => c.policyNo===key || (c.insured||'').includes(key));
  if(!acc && !pol) return alert('일치하는 사고/계약을 찾지 못했습니다.');
  const rec = acc ? {statusId, claimNo:acc.claimNo, policyNo:acc.policyNo, insured:acc.insured, paidLossEok:acc.paidLossEok, outstandingLossEok:acc.outstandingLossEok, note:'사용자 추가'} : {statusId, claimNo:'', policyNo:pol.policyNo, insured:pol.insured, paidLossEok:0, outstandingLossEok:0, note:'사용자 추가'};
  state.layerClaims = state.layerClaims || [];
  if(state.layerClaims.find(x=>x.statusId===statusId && (x.claimNo||x.policyNo)===(rec.claimNo||rec.policyNo))) return alert('이미 연결된 사고/계약입니다.');
  state.layerClaims.push(rec);
  saveLayerClaims();
  renderLayerTable();
}

// switch/load 보강
const oldSwitchTabV38 = switchTab;
switchTab = function(tab){
  oldSwitchTabV38(tab);
  if(tab === 'inwardClaim'){ renderClaimContractSearch(); renderInwardClaims(); }
  if(tab === 'docs'){ renderDocs(); }
  if(tab === 'copilot'){ renderCopilotChat(); }
  if(tab === 'treaty'){ renderTreatyCards(); }
  if(tab === 'layer'){ renderLayerTable(); }
};
window.addEventListener('load', () => {
  setTimeout(() => {
    renderClaimContractSearch();
    renderInwardClaims();
    renderDocs();
    renderTreatyCards();
    renderLayerTable();
  }, 400);
});


/* ===== v39: 해외수재 클레임 등록 경로 단순화 ===== */
function renderFacTable(){
  const rows = facFiltered();
  const total = Math.max(1, Math.ceil(rows.length/PAGE));
  state.pages.fac = Math.min(state.pages.fac,total);
  const page = rows.slice((state.pages.fac-1)*PAGE,state.pages.fac*PAGE);
  facCount.innerText = `검색 결과 ${rows.length}건 / 한 화면 10건 조회`;
  document.querySelector('#facTable tbody').innerHTML = page.map(f => `
    <tr>
      <td><input class="fac-check small-check" type="checkbox" value="${f.inwardRef}"/></td>
      <td><button class="link-btn" onclick="showFac('${f.inwardRef}')">${f.inwardRef}</button></td>
      <td>${f.insured}</td>
      <td>${f.country}/${f.city}</td>
      <td>${f.line}</td>
      <td>${eok(f.premiumEok)}<br><small>${f.currency} / FX ${f.fxRate}</small></td>
      <td>${f.ppwDate}</td>
      <td>${f.receivableStatus}</td>
      <td><button class="claim-entry-btn" onclick="openClaimForFac('${f.inwardRef}')">클레임 등록</button></td>
    </tr>`).join('');
  facPage.innerText = `${state.pages.fac} / ${total}`;
}

function openClaimForFac(ref){
  const f = state.fac.find(x => x.inwardRef === ref);
  if(!f) return alert('수재계약을 찾지 못했습니다.');
  state.selectedClaimContract = ref;
  switchTab('inwardClaim');
  setTimeout(() => {
    setClaimContractReadOnly(f);
    const q = document.getElementById('icQueueSearch');
    if(q) q.value = ref;
    const owner = document.getElementById('icOwner');
    if(owner && !owner.value) owner.value = currentUser();
    const msg = document.getElementById('icMsg');
    if(msg) msg.innerHTML = `<span class="claim-link-note">${ref} 수재계약에 대한 클레임을 등록합니다.</span>`;
    renderInwardClaims();
  }, 80);
}

function showFac(id){
  const f = state.fac.find(x=>x.inwardRef===id);
  if(!f) return;
  facModalBody.innerHTML = `
    <div class="form-grid labeled">
      <label>수재관리번호<input id="editFacId" value="${f.inwardRef}" disabled/></label>
      <label>피보험자<input id="editFacInsured" value="${f.insured||''}"/></label>
      <label>국가<input id="editFacCountry" value="${f.country||''}"/></label>
      <label>도시<input id="editFacCity" value="${f.city||''}"/></label>
      <label>보험종목<input id="editFacLine" value="${f.line||''}"/></label>
      <label>가입금액 TSI(억원)<input id="editFacTsi" type="number" value="${f.tsiEok||0}"/></label>
      <label>보험료(억원)<input id="editFacPremium" type="number" value="${f.premiumEok||0}"/></label>
      <label>통화<input id="editFacCurrency" value="${f.currency||''}"/></label>
      <label>출재사<input id="editFacCedant" value="${f.cedant||''}"/></label>
      <label>PPW<input id="editFacPPW" type="date" value="${f.ppwDate||''}"/></label>
      <label>미수상태<select id="editFacReceivable"><option ${f.receivableStatus==='정상'?'selected':''}>정상</option><option ${f.receivableStatus==='미수'?'selected':''}>미수</option><option ${f.receivableStatus==='부분입금'?'selected':''}>부분입금</option><option ${f.receivableStatus==='확인중'?'selected':''}>확인중</option></select></label>
      <label>등록 담당자<input id="editFacOwner" value="${f.owner||''}"/></label>
    </div>
    <label class="full-label">Slip/인수내용 요약<input id="editFacSlip" value="${f.slipSummary||''}"/></label>
    <label class="full-label">수재계약 메모<textarea id="editFacMemo" rows="4">${f.memo||''}</textarea></label>
    <div class="result-box">미수 담당자: ${f.receivableOwner||'-'} ${f.receivableUpdatedAt ? '/ 최종변경 ' + f.receivableUpdatedAt : ''}</div>
    <div class="edit-actions">
      <button class="secondary-btn" onclick="closeModal()">취소</button>
      <button onclick="saveFacEdit()">수정 저장</button>
      <button class="claim-entry-btn" onclick="closeModal();openClaimForFac('${f.inwardRef}')">이 수재건 클레임 등록</button>
    </div>
  `;
  facModal.classList.add('show');
}

function setClaimContractReadOnly(f){
  const box = document.getElementById('icSelectedContract');
  if(!box) return;
  box.innerHTML = `<div class="claim-selected-strong">선택된 수재계약: ${f.inwardRef}</div>
    <div class="detail-grid" style="margin-top:10px">
      <b>피보험자</b><span>${f.insured}</span>
      <b>출재사</b><span>${f.cedant || '-'}</span>
      <b>소재지</b><span>${f.country} / ${f.city}</span>
      <b>보험종목</b><span>${f.line}</span>
      <b>PPW</b><span>${f.ppwDate || '-'}</span>
      <b>미수상태</b><span>${f.receivableStatus || '-'}</span>
    </div>
    <div class="claim-link-note">이 수재관리번호를 기준으로 클레임이 Queue에 저장됩니다.</div>`;
}

function renderClaimContractSearch(){
  // v39: 별도 대상 수재계약 검색 단계는 제거. 임의수재 계약조회에서 [클레임 등록] 버튼으로 진입.
  if(state.selectedClaimContract){
    const f = state.fac.find(x=>x.inwardRef===state.selectedClaimContract);
    if(f) setClaimContractReadOnly(f);
  }
}

function requiredClaimOk(){
  const missing = [];
  if(!state.selectedClaimContract) missing.push('임의수재 계약조회에서 수재계약 선택');
  if(!document.getElementById('icCause')?.value.trim()) missing.push('사고유형');
  if(!document.getElementById('icLossDate')?.value) missing.push('사고일');
  if(!document.getElementById('icDate')?.value) missing.push('통지일');
  if(!document.getElementById('icOwner')?.value.trim()) missing.push('담당자');
  const paid = Number(document.getElementById('icPaid')?.value || 0);
  const os = Number(document.getElementById('icOS')?.value || 0);
  const est = Number(document.getElementById('icLoss')?.value || 0);
  if(paid + os + est <= 0) missing.push('손해액');
  if(missing.length){
    icMsg.innerHTML = `<span class="required-warn">필수값을 입력하세요: ${missing.join(', ')}</span>`;
    return false;
  }
  return true;
}

const oldSwitchTabV39 = switchTab;
switchTab = function(tab){
  oldSwitchTabV39(tab);
  if(tab === 'inward') renderFacTable();
  if(tab === 'inwardClaim'){
    renderClaimContractSearch();
    renderInwardClaims();
  }
};


/* ===== v40: 문서등록/파일요약/관리자 업로드/수재번호 Layer 연결 ===== */

// ---------- 상태 확장 ----------
state.contracts = JSON.parse(localStorage.getItem('gra_v40_contracts') || JSON.stringify(DATA.contracts || []));
state.pendingDocText = state.pendingDocText || '';
state.pendingDocFileName = state.pendingDocFileName || '';
state.copilotFileText = state.copilotFileText || '';
state.copilotFileName = state.copilotFileName || '';

const oldSaveAllV40 = saveAll;
saveAll = function(){
  try{ oldSaveAllV40(); }catch(e){}
  localStorage.setItem('gra_v40_contracts', JSON.stringify(state.contracts || []));
  localStorage.setItem('gra_v34_docs', JSON.stringify(state.docs || []));
  localStorage.setItem('gra_v34_accidents', JSON.stringify(state.accidents || []));
  localStorage.setItem('gra_v34_meta', JSON.stringify(state.meta || {}));
};

function allContracts(){ return state.contracts && state.contracts.length ? state.contracts : DATA.contracts; }
function dataSourceLabel(type){
  if(type === 'contract') return `${state.meta.contractUploadAt || DATA.meta.contractUploadAt}${state.meta.contractSourceFile ? ' · ' + state.meta.contractSourceFile : ''}`;
  if(type === 'accident') return `${state.meta.accidentUploadAt || DATA.meta.accidentUploadAt}${state.meta.accidentSourceFile ? ' · ' + state.meta.accidentSourceFile : ''}`;
  return '';
}
function setMetaText(){
  ['contractUpdate1','contractUpdate2','contractUpdate3'].forEach(id=>{let el=document.getElementById(id);if(el)el.innerText=dataSourceLabel('contract');});
  ['accidentUpdate','accidentUpdate2'].forEach(id=>{let el=document.getElementById(id);if(el)el.innerText=dataSourceLabel('accident');});
  let d=document.getElementById('docUpdate');if(d)d.innerText=state.meta.docUploadAt || DATA.meta.docUploadAt;
  renderAdminDataStatus();
}
function renderAdminDataStatus(){
  const box = document.getElementById('adminDataStatus');
  if(!box) return;
  box.innerHTML = `<div class="admin-status-grid">
    <b>계약데이터</b><span>${allContracts().length}건 / ${dataSourceLabel('contract')}</span>
    <b>사고데이터</b><span>${state.accidents.length}건 / ${dataSourceLabel('accident')}</span>
    <b>임의수재</b><span>${state.fac.length}건 / 플랫폼 수기등록</span>
    <b>문서</b><span>${state.docs.length}건 / 기본제공 + 사용자등록</span>
  </div>`;
}

// ---------- PDF/Excel/TXT 파일 텍스트 추출 공통 ----------
async function extractFileText(file){
  if(!file) return {text:'', message:'파일이 없습니다.'};
  const name = file.name || '';
  try{
    if(name.toLowerCase().endsWith('.txt') || name.toLowerCase().endsWith('.csv')){
      const text = await file.text();
      return {text:text.slice(0,50000), message:`${name} 텍스트 추출 완료`};
    }
    if(name.toLowerCase().endsWith('.xlsx') || name.toLowerCase().endsWith('.xls')){
      if(typeof XLSX === 'undefined') return {text:'', message:'엑셀 파서를 불러오지 못했습니다.'};
      const wb = XLSX.read(await file.arrayBuffer(), {type:'array'});
      let text = '';
      wb.SheetNames.slice(0,5).forEach(sn=>{
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], {defval:''});
        text += `[${sn}]\n` + rows.slice(0,80).map(r=>JSON.stringify(r)).join('\n') + '\n';
      });
      return {text:text.slice(0,50000), message:`${name} 엑셀 ${wb.SheetNames.length}개 시트 추출 완료`};
    }
    if(name.toLowerCase().endsWith('.pdf')){
      if(typeof pdfjsLib === 'undefined') return {text:'', message:'PDF 텍스트 추출 라이브러리를 불러오지 못했습니다.'};
      if(pdfjsLib.GlobalWorkerOptions) pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const pdf = await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;
      let text = '';
      const maxPages = Math.min(pdf.numPages, 30);
      for(let p=1;p<=maxPages;p++){
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();
        text += content.items.map(x=>x.str).join(' ') + '\n';
      }
      return {text:text.slice(0,50000), message:`${name} PDF ${pdf.numPages}페이지 중 ${maxPages}페이지 추출 완료`};
    }
    return {text:'', message:'지원하지 않는 파일 형식입니다.'};
  }catch(e){
    return {text:'', message:'파일을 읽지 못했습니다: ' + (e.message || e)};
  }
}
function summarizeText(text, title){
  const clean = (text||'').replace(/\s+/g,' ').trim();
  if(!clean) return `${title||'파일'}에서 추출 가능한 텍스트가 없습니다. 스캔 PDF라면 OCR 연계가 필요합니다.`;
  const sents = clean.split(/(?<=[.!?。다])\s+/).filter(x=>x.length>20);
  const picked = (sents.length ? sents : [clean]).slice(0,6).join('<br>');
  return `<b>${title||'파일'} 요약</b><br>${picked}<br><br><span class="muted">※ 시연용 요약입니다. 실제 구축 시 문서 OCR/RAG와 권한관리를 연계합니다.</span>`;
}

// ---------- 약관·특약 문서관리: 등록 즉시 목록 표시 ----------
function seedBaseDocs(){
  const ids = new Set((state.docs||[]).map(d=>d.docId));
  (DATA.docs||[]).forEach(d=>{ if(!ids.has(d.docId)) state.docs.push(d); });
}
async function previewDocPdf(file){
  state.pendingDocText = '';
  state.pendingDocFileName = file ? file.name : '';
  if(!file){
    docPreviewMsg.innerText = 'PDF 파일을 선택하세요.';
    return;
  }
  if(!file.name.toLowerCase().endsWith('.pdf')){
    docPreviewMsg.innerHTML = '<span class="required-warn">PDF 파일만 등록할 수 있습니다.</span>';
    return;
  }
  docPreviewMsg.innerText = 'PDF 텍스트 추출 중...';
  const result = await extractFileText(file);
  state.pendingDocText = result.text || '';
  docPreviewMsg.innerHTML = result.text ? `<span class="doc-index-ok">${result.message}</span>` : `<span class="doc-index-no">${result.message}</span>`;
}
async function registerDoc(){
  const title = (docTitle.value || '').trim();
  const type = (docType.value || '').trim();
  const keywords = (docKeywords.value || '').trim();
  const file = document.getElementById('docFile')?.files?.[0];
  const missing = [];
  if(!title) missing.push('문서명');
  if(!type) missing.push('구분');
  if(!keywords) missing.push('키워드');
  if(!file && !state.pendingDocFileName) missing.push('PDF 파일');
  if(missing.length){
    docMsg.innerHTML = `<span class="required-warn">필수값을 입력하세요: ${missing.join(', ')}</span>`;
    return;
  }
  if(file && !state.pendingDocText){
    const result = await extractFileText(file);
    state.pendingDocText = result.text || '';
    state.pendingDocFileName = file.name;
  }
  const id = 'USER-' + String((state.docs||[]).filter(d=>String(d.docId).startsWith('USER-')).length+1).padStart(3,'0');
  const rec = {
    docId:id, title, type, keywords,
    file: '(브라우저 업로드) ' + (state.pendingDocFileName || file?.name || ''),
    fileName: state.pendingDocFileName || file?.name || '',
    sourceType:'사용자등록',
    text: state.pendingDocText || '',
    indexed: !!state.pendingDocText,
    registeredBy: currentUser(),
    registeredAt: new Date().toISOString().slice(0,16).replace('T',' ')
  };
  state.docs.unshift(rec);
  saveAll();
  docMsg.innerText = `${id} 등록 완료 · 등록 문서 목록에 반영되었습니다.`;
  ['docTitle','docType','docKeywords'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  const f = document.getElementById('docFile'); if(f) f.value = '';
  state.pendingDocText = ''; state.pendingDocFileName = '';
  docPreviewMsg.innerText = '문서명, 구분, 키워드, PDF 파일은 필수입니다.';
  renderDocs();
}
function renderDocs(){
  seedBaseDocs();
  setMetaText();
  const tbody = document.querySelector('#docTable tbody');
  if(!tbody) return;
  tbody.innerHTML = state.docs.map(d => `<tr>
    <td><input class="doc-check small-check" type="checkbox" value="${d.docId}" ${d.sourceType==='기본제공'?'disabled':''}></td>
    <td>${d.docId}</td><td>${d.title}</td><td>${d.type}</td><td>${d.keywords}</td>
    <td>${d.file && String(d.file).startsWith('assets/') ? '<a href="'+d.file+'" target="_blank">PDF</a>' : (d.fileName || d.file || '-')}</td>
    <td>${d.indexed || d.text ? '<span class="doc-index-ok">본문 인덱싱</span>' : '<span class="doc-index-no">메타데이터</span>'}</td>
    <td>${d.sourceType}</td>
  </tr>`).join('');
}

// ---------- AI Copilot 파일 업로드/요약 ----------
async function previewCopilotFile(file){
  if(!file){
    copilotFileMsg.innerText = '파일을 선택하세요.';
    return;
  }
  copilotFileMsg.innerText = '파일 내용 추출 중...';
  const result = await extractFileText(file);
  state.copilotFileText = result.text || '';
  state.copilotFileName = file.name;
  copilotFileMsg.innerHTML = result.text ? `<span class="doc-index-ok">${result.message}</span>` : `<span class="doc-index-no">${result.message}</span>`;
}
function searchDocsForQuery(q){
  const terms = q.toLowerCase().split(/\s+/).filter(x=>x.length>1);
  const docs = state.docs || [];
  const scored = docs.map(d => {
    const hay = ((d.title||'') + ' ' + (d.type||'') + ' ' + (d.keywords||'') + ' ' + (d.text||'')).toLowerCase();
    const score = terms.reduce((a,t)=>a+(hay.includes(t)?1:0),0) + (d.text?1:0);
    return {d,score};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,3);
  return scored;
}
function summarizeDocText(d, q){
  return summarizeText(d.text || `${d.title} ${d.keywords}`, d.title);
}
function sendCopilot(){
  const q = (copilotQ.value || '').trim();
  if(!q) return;
  state.chat.push({role:'user', text:q});
  const lower = q.toLowerCase();
  let ans = '';
  if(state.copilotFileText && (lower.includes('업로드') || lower.includes('파일') || lower.includes('요약') || lower.includes('pdf') || lower.includes('엑셀'))){
    ans = summarizeText(state.copilotFileText, state.copilotFileName);
  }else if(lower.includes('pdf') || q.includes('문서') || q.includes('약관') || q.includes('특약') || q.includes('요약')){
    const docHits = searchDocsForQuery(q);
    ans = `<b>문서 기반 답변</b><br>${docHits.length ? docHits.map(x=>summarizeDocText(x.d,q)).join('<br><br>') : '질문과 일치하는 등록 문서를 찾지 못했습니다. PDF를 Copilot에 직접 업로드하거나 약관·특약 문서관리에 먼저 등록하세요.'}`;
    if(docHits.length) ans += `<div class="chat-source">참고문서: ${docHits.map(x=>x.d.title).join(', ')}</div>`;
  }else if(lower.includes('ppw') || q.includes('미수')){
    const rows = state.fac.filter(f => f.receivableStatus !== '정상' || dayDiff(f.ppwDate) <= 14).slice(0,5);
    ans = `<b>PPW/미수 점검 결과</b><br>${rows.map(f=>`${f.inwardRef} / ${f.insured} / PPW ${f.ppwDate} / ${f.receivableStatus} / 담당 ${f.owner}`).join('<br>')}<br><br>우선 PPW 임박, 미수상태, 담당자 공백 여부를 확인하세요.`;
  }else{
    ans = `<b>AI 검토 예시</b><br>검토 순서: 사고원인/소재지 → 약관 담보·면책 → 회수 가능 손해액 → 영향 Treaty 및 Layer → 추가 요청자료입니다.`;
  }
  state.chat.push({role:'ai', text:ans});
  copilotQ.value = '';
  renderCopilotChat();
}

// ---------- 해외수재 클레임 서베이리포트: 실제 업로드 파일 기반 요약 ----------
async function summarizeSurvey(){
  const c = state.inwardClaims.find(x=>x.claimNo===state.selectedIC) || state.inwardClaims[0];
  const file = document.getElementById('surveyFile')?.files?.[0];
  if(!file){
    surveySummary.innerHTML = '<span class="required-warn">서베이리포트 PDF를 먼저 업로드하세요. 파일 없이 임의 요약하지 않습니다.</span>';
    return;
  }
  surveySummary.innerHTML = '서베이리포트 텍스트 추출 중...';
  const result = await extractFileText(file);
  if(!result.text){
    surveySummary.innerHTML = `<span class="required-warn">${result.message}</span><br>스캔 PDF라면 OCR 연계가 필요합니다.`;
    return;
  }
  surveySummary.innerHTML = `${summarizeText(result.text, file.name)}<br><br><b>연결 클레임</b><br>${c ? `${c.claimNo} / ${c.inwardRef} / ${c.insured}` : '선택된 클레임 없음'}`;
}

// ---------- 관리자 업로드: 실제 데이터 교체 ----------
function pickSheet(wb, preferred){
  if(wb.Sheets[preferred]) return wb.Sheets[preferred];
  const found = wb.SheetNames.find(s => s.toLowerCase().includes(preferred.toLowerCase().slice(3).replace(/_/g,'')));
  return wb.Sheets[found] || wb.Sheets[wb.SheetNames[0]];
}
async function readRowsFromWorkbookFile(file, preferredSheet, msgId){
  if(!file) { document.getElementById(msgId).innerHTML = '<span class="required-warn">업로드할 파일을 선택하세요.</span>'; return []; }
  if(file.name.toLowerCase().endsWith('.csv')){
    return parseCsv(await file.text());
  }
  if(typeof XLSX === 'undefined'){
    document.getElementById(msgId).innerHTML = '<span class="required-warn">엑셀 파서를 불러오지 못했습니다. CSV 파일을 사용하세요.</span>';
    return [];
  }
  const wb = XLSX.read(await file.arrayBuffer(), {type:'array'});
  const sheet = pickSheet(wb, preferredSheet);
  return XLSX.utils.sheet_to_json(sheet, {defval:''});
}
function normalizeSystemContract(r){
  return {
    policyNo:String(r['증권번호']||r.policyNo||''),
    insured:String(r['피보험자']||r.insured||''),
    country:String(r['국가']||r.country||''),
    city:String(r['도시']||r.city||''),
    lat:Number(r['위도']||r.lat||0),
    lng:Number(r['경도']||r.lng||0),
    line:String(r['보험종목']||r.line||''),
    industry:String(r['업종']||r.industry||''),
    tsiEok:Number(r['가입금액_TSI_억원']||r['가입금액']||r.tsiEok||0),
    premiumEok:Number(r['보험료_억원']||r['보험료']||r.premiumEok||0),
    currency:'KRW',
    sourceType:'기간계 데이터',
    sourceSystem:'업로드 파일',
    renewalDate:String(r['만기일']||r.renewalDate||''),
    status:String(r['상태']||r.status||'유효'),
    lossRatio:Number(r['손해율']||r.lossRatio||0),
    expenseRatio:Number(r['사업비율']||r.expenseRatio||18)
  };
}
function normalizeSystemAccident(r){
  const paid = Number(r['Paid_억원']||r['Paid손해액']||r['Paid']||r.paidLossEok||0);
  const os = Number(r['Outstanding_억원']||r['Outstanding손해액']||r['Outstanding']||r.outstandingLossEok||0);
  return {
    claimNo:String(r['사고번호']||r.claimNo||''),
    policyNo:String(r['증권번호']||r.policyNo||''),
    insured:String(r['피보험자']||r.insured||''),
    country:String(r['국가']||r.country||''),
    city:String(r['도시']||r.city||''),
    line:String(r['보험종목']||r.line||''),
    cause:String(r['사고유형']||r.cause||''),
    paidLossEok:paid,
    outstandingLossEok:os,
    grossLossEok:Number(r['Gross_억원']||r['Gross손해액']||r.grossLossEok||paid+os),
    claimDate:String(r['사고일']||r.claimDate||''),
    status:String(r['처리상태']||r.status||'접수'),
    sourceType:'기간계 데이터',
    sourceSystem:'업로드 파일',
    memo:String(r['메모']||r.memo||'')
  };
}
function validateRows(rows, required, msgId){
  if(!rows.length){ document.getElementById(msgId).innerHTML = '<span class="required-warn">파일에 데이터가 없습니다.</span>'; return false; }
  const keys = new Set(Object.keys(rows[0]));
  const missing = required.filter(k => !keys.has(k));
  if(missing.length){
    document.getElementById(msgId).innerHTML = `<span class="required-warn">업로드 불가: 필수 컬럼이 없습니다. ${missing.join(', ')}</span>`;
    return false;
  }
  return true;
}
async function importSystemContractsFromFile(){
  const file = document.getElementById('adminContractFile')?.files?.[0];
  const rows = await readRowsFromWorkbookFile(file, '01_Contracts_System', 'adminContractMsg');
  if(!validateRows(rows, ['증권번호','피보험자','국가','도시','보험종목'], 'adminContractMsg')) return;
  const mapped = rows.map(normalizeSystemContract).filter(r => r.policyNo);
  state.contracts = mapped;
  state.meta.contractUploadAt = new Date().toISOString().slice(0,16).replace('T',' ');
  state.meta.contractSourceFile = file.name;
  saveAll();
  adminContractMsg.innerHTML = `<span class="doc-index-ok">${mapped.length}건 계약데이터 반영 완료</span><br>원천 파일: ${file.name}`;
  renderContractTable();
  renderMap();
  renderDashboard();
  renderPnlCandidates();
  setMetaText();
}
async function importSystemAccidentsFromFile(){
  const file = document.getElementById('adminAccidentFile')?.files?.[0];
  const rows = await readRowsFromWorkbookFile(file, '03_Accident_Data_All', 'adminAccidentMsg');
  if(!validateRows(rows, ['사고번호','증권번호','피보험자','사고유형'], 'adminAccidentMsg')) return;
  const mapped = rows.map(normalizeSystemAccident).filter(r => r.claimNo);
  const manualAndExcel = state.accidents.filter(a => a.sourceType !== '기간계 데이터');
  state.accidents = mapped.concat(manualAndExcel);
  state.meta.accidentUploadAt = new Date().toISOString().slice(0,16).replace('T',' ');
  state.meta.accidentSourceFile = file.name;
  saveAll();
  adminAccidentMsg.innerHTML = `<span class="doc-index-ok">${mapped.length}건 사고데이터 반영 완료</span><br>원천 파일: ${file.name}<br>수기등록/엑셀업로드 데이터는 유지되었습니다.`;
  renderAccidentTable();
  renderDashboard();
  applyPnl();
  setMetaText();
}

// ---------- 계약/지도/손익: 업로드된 계약 state.contracts 사용 ----------
function renewRows(){return allContracts().filter(c=>dayDiff(c.renewalDate)>=0&&dayDiff(c.renewalDate)<=30).sort((a,b)=>dayDiff(a.renewalDate)-dayDiff(b.renewalDate));}
function contractFiltered(){
  const q=(contractSearch?.value||'').toLowerCase(), s=contractLineFilter?.value||'전체';
  return allContracts().filter(c=>(!q||JSON.stringify(c).toLowerCase().includes(q))&&(s==='전체'||c.line===s));
}
function renderContractTable(){
  setMetaText();
  let rows=contractFiltered(), total=Math.max(1,Math.ceil(rows.length/PAGE));
  state.pages.contract=Math.min(state.pages.contract,total);
  let page=rows.slice((state.pages.contract-1)*PAGE,state.pages.contract*PAGE);
  contractCount.innerText=`검색 결과 ${rows.length}건 · 원천 ${dataSourceLabel('contract')}`;
  document.querySelector('#contractTable tbody').innerHTML=page.map(c=>`<tr><td>${c.policyNo}</td><td>${c.insured}</td><td>${c.country}/${c.city}</td><td>${c.line}</td><td>${eok(c.tsiEok)}</td><td>${eok(c.premiumEok)}</td><td>${c.renewalDate}</td></tr>`).join('');
  contractPage.innerText=`${state.pages.contract} / ${total}`;
}
function allRiskContracts(){
  return allContracts().concat(state.fac.map(f=>({policyNo:f.inwardRef, insured:f.insured, country:f.country, city:f.city, line:f.line, tsiEok:f.tsiEok, sourceType:'플랫폼 수기등록', lat:f.lat, lng:f.lng})));
}
function renderPnlCandidates(){
  const q = (pnlSearch?.value || '').toLowerCase().trim();
  if(!q || q.length < 2){
    pnlCandidates.innerHTML = '<div class="mini-msg">증권번호, 피보험자, 국가, 보험종목을 2글자 이상 입력해 검색하세요.</div>';
    renderPnlSelected();
    return;
  }
  const rows = allContracts().filter(c => JSON.stringify(c).toLowerCase().includes(q)).slice(0, 30);
  pnlCandidates.innerHTML = rows.map(c => `<div class="candidate"><span><b>${c.policyNo}</b><br><small>${c.insured} / ${c.country} ${c.city} / ${c.line} / 보험료 ${eok(c.premiumEok)}</small></span><button onclick="addPnlContract('${c.policyNo}')">추가</button></div>`).join('') || '<div class="mini-msg">검색 결과가 없습니다.</div>';
  renderPnlSelected();
}
function renderPnlSelected(){
  const box = document.getElementById('pnlSelectedList');
  if(!box) return;
  const rows = allContracts().filter(c => (state.pnlSelected||[]).includes(c.policyNo));
  box.innerHTML = rows.length ? rows.map(c => `<span class="chip">${c.policyNo} · ${c.insured.slice(0,18)} <button onclick="removePnlContract('${c.policyNo}')">×</button></span>`).join('') : '검색 후 계약을 추가하세요.';
}
function applyPnl(){
  const ids = state.pnlSelected || [];
  const rows = allContracts().filter(c => ids.includes(c.policyNo));
  const earned = rows.reduce((a,c)=>a+Number(c.premiumEok||0)*0.92,0);
  const expense = rows.reduce((a,c)=>a+Number(c.premiumEok||0)*0.92*Number(c.expenseRatio||18)/100,0);
  const actualLoss = state.accidents.filter(a=>ids.includes(a.policyNo)).reduce((a,c)=>a+Number(c.grossLossEok||0),0);
  const tsi = rows.reduce((a,c)=>a+Number(c.tsiEok||0),0);
  const pml = tsi * Number(document.getElementById('pmlRate')?.value || 0) / 100;
  const underwriting = earned - expense - actualLoss;
  pnlCount.innerText = rows.length + '건';
  pnlEarned.innerText = eok(earned);
  pnlLoss.innerText = eok(actualLoss);
  pnlPML.innerText = eok(pml);
  pnlDetail.innerHTML = `<b>계산 기준</b><br>선택 계약 ${rows.length}건의 경과보험료, 사업비, 실제 사고데이터를 합산합니다.<br>사고가 없는 계약은 현재 발생손해액을 0으로 두며, 미래 대형손해 가능성은 PML 시나리오로 별도 확인합니다.<br><br>경과보험료: <b>${eok(earned)}</b><br>사업비 추정: <b>${eok(expense)}</b><br>실제 발생손해액: <b>${eok(actualLoss)}</b><br>약식 Underwriting Result: <b>${eok(underwriting)}</b><br>선택 가입금액 합계: <b>${eok(tsi)}</b><br>PML ${document.getElementById('pmlRate')?.value || 0}% 시나리오 예상손해액: <b>${eok(pml)}</b>`;
}

// ---------- 재보험 프로그램 크게 재구성 ----------
function renderTreatyCards(){
  treatyCards.innerHTML = DATA.treaties.map(t => {
    const maxTo = Math.max(...t.layers.map(l=>l.to));
    const w = 1180, h = 560, x = 190, barW = 360;
    const scale = (v) => h - 70 - (v / maxTo) * 420;
    const layerSvg = t.layers.map(l => {
      const yTop = scale(l.to), yBot = scale(l.from), height = Math.max(48, yBot-yTop);
      const cls = /Retention/i.test(l.layer) ? 'layer-band retention' : 'layer-band';
      const participants = participantsFor(t.treatyId,l.layer).replace(/&/g,'&amp;');
      return `<rect class="${cls}" x="${x}" y="${yTop}" width="${barW}" height="${height}" rx="14" onmouseenter="showTreatyHover(event,'${t.treatyId}','${String(l.layer).replace(/'/g,'&#39;')}')" onmousemove="moveTreatyHover(event)" onmouseleave="hideTreatyHover()"></rect>
        <text class="svg-label" x="${x+18}" y="${yTop+28}">${l.layer}</text>
        <text class="svg-sub" x="${x+18}" y="${yTop+52}">${eok(l.from)} 초과 ~ ${eok(l.to)}</text>
        <line x1="${x+barW}" y1="${yTop+height/2}" x2="${x+barW+105}" y2="${yTop+height/2}" stroke="#cbd5e1" stroke-width="2"></line>
        <circle class="svg-node" cx="${x+barW+130}" cy="${yTop+height/2}" r="26"></circle>
        <text class="svg-node-text" x="${x+barW+170}" y="${yTop+height/2-4}">Lead: ${l.lead}</text>
        <text class="svg-small" x="${x+barW+170}" y="${yTop+height/2+18}">참여: ${participants}</text>`;
    }).join('');
    return `<div class="treaty-big-card">
      <h3>${t.name}</h3>
      <p class="muted">${t.description}</p>
      <svg class="treaty-big-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMinYMin meet">
        <text class="svg-title" x="24" y="36">${t.name}</text>
        <text class="svg-small" x="24" y="62">유형: ${t.type} · Exclusion: ${t.exclusions.join(', ')}</text>
        <text class="svg-sub" x="34" y="96">${eok(maxTo)}</text>
        <text class="svg-sub" x="34" y="${h-55}">${eok(0)}</text>
        <line x1="150" y1="90" x2="150" y2="${h-70}" stroke="#94a3b8" stroke-dasharray="5 5"></line>
        ${layerSvg}
      </svg>
    </div>`;
  }).join('');
}

// ---------- Layer 사고/계약 추가: 수재관리번호도 허용 ----------
function addLayerClaim(statusId){
  const key = prompt('추가할 사고번호, 증권번호, 수재관리번호 또는 피보험자명을 입력하세요.');
  if(!key) return;
  const acc = state.accidents.find(a => a.claimNo===key || a.policyNo===key || (a.insured||'').includes(key));
  const pol = allContracts().find(c => c.policyNo===key || (c.insured||'').includes(key));
  const fac = state.fac.find(f => f.inwardRef===key || (f.insured||'').includes(key));
  if(!acc && !pol && !fac) return alert('일치하는 사고/계약/수재건을 찾지 못했습니다.');
  const rec = acc ? {statusId, claimNo:acc.claimNo, policyNo:acc.policyNo, inwardRef:'', insured:acc.insured, paidLossEok:acc.paidLossEok, outstandingLossEok:acc.outstandingLossEok, note:'사고데이터 연결'}
    : pol ? {statusId, claimNo:'', policyNo:pol.policyNo, inwardRef:'', insured:pol.insured, paidLossEok:0, outstandingLossEok:0, note:'계약 연결'}
    : {statusId, claimNo:'', policyNo:'', inwardRef:fac.inwardRef, insured:fac.insured, paidLossEok:0, outstandingLossEok:0, note:'임의수재 연결'};
  state.layerClaims = state.layerClaims || [];
  const keyId = rec.claimNo || rec.policyNo || rec.inwardRef;
  if(state.layerClaims.find(x=>x.statusId===statusId && (x.claimNo||x.policyNo||x.inwardRef)===keyId)) return alert('이미 연결된 사고/계약/수재건입니다.');
  state.layerClaims.push(rec);
  saveLayerClaims();
  renderLayerTable();
}
function renderLayerTable(){
  const tbody = document.querySelector('#layerTable tbody');
  if(!tbody) return;
  tbody.innerHTML = state.layers.map((l,i)=>{
    let denom=l.baseLimitEok+l.reinstatedLimitEok;
    let burn=(l.paidUsedEok+l.outstandingUsedEok)/Math.max(1,denom)*100;
    let remain=Math.max(0,denom-l.paidUsedEok-l.outstandingUsedEok);
    const linked = (state.layerClaims||[]).filter(x=>x.statusId===l.statusId);
    return `<tr><td>${l.treatyName}</td><td>${l.layer}</td><td>${eok(l.baseLimitEok)}</td><td><input id="ly_paid_${i}" type="number" value="${l.paidUsedEok}" style="width:90px"/></td><td><input id="ly_os_${i}" type="number" value="${l.outstandingUsedEok}" style="width:90px"/></td><td><input id="ly_re_${i}" type="number" value="${l.reinstatedLimitEok}" style="width:90px"/></td><td>${eok(remain)}</td><td>${Math.round(burn)}%</td><td><button class="save-btn" onclick="saveLayer(${i})">저장</button><br><button onclick="addLayerClaim('${l.statusId}')" style="margin-top:6px">사고/계약/수재 추가</button></td></tr>
    <tr><td colspan="9"><div class="layer-claim-box"><b>연결 사고/계약/수재</b>${linked.length?linked.map(x=>`<span class="layer-claim-chip">${x.claimNo || x.policyNo || x.inwardRef} · ${x.insured || ''} <button onclick="deleteLayerClaim('${l.statusId}','${x.claimNo || x.policyNo || x.inwardRef}')">×</button></span>`).join(''):'<span class="mini-msg">연결된 사고/계약/수재 없음</span>'}</div></td></tr>`;
  }).join('');
}
function deleteLayerClaim(statusId, key){
  state.layerClaims = (state.layerClaims||[]).filter(x => !(x.statusId===statusId && (x.claimNo||x.policyNo||x.inwardRef)===key));
  saveLayerClaims();
  renderLayerTable();
}

// ---------- 화면 전환 보강 ----------
const oldSwitchTabV40 = switchTab;
switchTab = function(tab){
  oldSwitchTabV40(tab);
  if(tab === 'contract') renderContractTable();
  if(tab === 'location') setTimeout(renderMap, 100);
  if(tab === 'pnl') { renderPnlCandidates(); renderPnlSelected(); }
  if(tab === 'docs') renderDocs();
  if(tab === 'copilot') renderCopilotChat();
  if(tab === 'admin') { renderUsers(); renderAdminDataStatus(); }
  if(tab === 'treaty') renderTreatyCards();
  if(tab === 'layer') renderLayerTable();
};
window.addEventListener('load', () => {
  setTimeout(() => {
    seedBaseDocs();
    setMetaText();
    renderContractTable();
    renderDocs();
    renderTreatyCards();
    renderLayerTable();
    renderAdminDataStatus();
  }, 500);
});


/* ===== v41: 수재 오퍼 Slip/이메일 본문 자동입력 ===== */
state.slipOfferText = state.slipOfferText || '';
state.slipExtract = state.slipExtract || null;

async function previewSlipOfferFile(file){
  if(!file){
    slipFileMsg.innerText = '파일을 선택하세요.';
    return;
  }
  slipFileMsg.innerText = 'Slip 파일 내용 추출 중...';
  const result = await extractFileText(file);
  state.slipOfferText = result.text || '';
  slipFileMsg.innerHTML = result.text ? `<span class="doc-index-ok">${result.message}</span>` : `<span class="doc-index-no">${result.message}</span>`;
}

function firstMatch(text, patterns){
  for(const p of patterns){
    const m = text.match(p);
    if(m && m[1]) return String(m[1]).trim().replace(/[;,]+$/,'');
  }
  return '';
}
function parseMoneyToOriginal(raw){
  if(!raw) return {currency:'', amount:0};
  const s = String(raw).replace(/,/g,' ').replace(/\s+/g,' ').trim();
  const curMatch = s.match(/\b(USD|US\$|EUR|JPY|GBP|KRW|₩|\$|€|£|¥)\b/i) || s.match(/(₩|\$|€|£|¥)/);
  let currency = '';
  if(curMatch){
    const c = curMatch[1].toUpperCase();
    currency = c.includes('USD') || c === '$' || c === 'US$' ? 'USD' : c.includes('EUR') || c === '€' ? 'EUR' : c.includes('JPY') || c === '¥' ? 'JPY' : c.includes('GBP') || c === '£' ? 'GBP' : 'KRW';
  }
  const numMatch = s.match(/([0-9]+(?:[,. ]?[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)/);
  let amount = numMatch ? Number(numMatch[1].replace(/[ ,]/g,'')) : 0;
  if(/million/i.test(s)) amount *= 1000000;
  if(/billion/i.test(s)) amount *= 1000000000;
  if(/억원/.test(s)) { amount *= 100000000; currency = currency || 'KRW'; }
  if(/백만/.test(s)) amount *= 1000000;
  return {currency: currency || 'USD', amount};
}
function countryCityFromLocation(raw){
  const s = (raw || '').trim();
  let country = '', city = '';
  const knownCountries = ['미국','USA','United States','Japan','일본','Indonesia','인도네시아','Vietnam','베트남','India','인도','Korea','한국','Republic of Korea'];
  for(const k of knownCountries){
    if(new RegExp(k,'i').test(s)){
      country = /usa|united states|미국/i.test(k) ? '미국' :
                /japan|일본/i.test(k) ? '일본' :
                /indonesia|인도네시아/i.test(k) ? '인도네시아' :
                /vietnam|베트남/i.test(k) ? '베트남' :
                /india|인도/i.test(k) ? '인도' : '한국';
      break;
    }
  }
  const parts = s.split(/[,/|-]/).map(x=>x.trim()).filter(Boolean);
  if(parts.length >= 2){
    if(country && new RegExp(parts[0],'i').test(country)) city = parts[1];
    else city = parts[0];
  }else{
    city = s.replace(/USA|United States|Japan|Indonesia|Vietnam|India|Korea|Republic of Korea|미국|일본|인도네시아|베트남|인도|한국/ig,'').replace(/[,/|-]/g,'').trim();
  }
  if(!country){
    if(/georgia|texas|california|new jersey|ohio/i.test(s)) country='미국';
    else if(/tokyo|osaka|fukuoka/i.test(s)) country='일본';
    else if(/jakarta|banten|west java/i.test(s)) country='인도네시아';
    else if(/hanoi|da nang|ho chi minh/i.test(s)) country='베트남';
    else if(/seoul|busan|incheon|ulsan/i.test(s)) country='한국';
  }
  return {country, city};
}
function normalizeLine(raw){
  const s = (raw||'').toLowerCase();
  if(/cargo|marine|적하|해상/.test(s)) return '해상적하';
  if(/engineering|construction|erection|machinery|기술|기계/.test(s)) return '기술보험';
  if(/liability|casualty|배상/.test(s)) return '배상책임';
  if(/cyber|사이버/.test(s)) return '사이버';
  return 'Package';
}
function extractSlipOffer(text){
  const t = '\n' + (text||'') + '\n';
  const insured = firstMatch(t, [
    /(?:insured|assured|policyholder|client|피보험자|보험계약자)\s*[:：]\s*(.+)/i,
    /(?:name of insured)\s*[:：]\s*(.+)/i
  ]);
  const locationRaw = firstMatch(t, [
    /(?:location|risk location|address|site|소재지|위치)\s*[:：]\s*(.+)/i,
    /(?:country\/city|country|territory)\s*[:：]\s*(.+)/i
  ]);
  const {country, city} = countryCityFromLocation(locationRaw);
  const lineRaw = firstMatch(t, [
    /(?:class|line of business|lob|coverage|product|보험종목|종목)\s*[:：]\s*(.+)/i,
    /(?:interest insured)\s*[:：]\s*(.+)/i
  ]);
  const tsiRaw = firstMatch(t, [
    /(?:tsi|total sum insured|sum insured|limit|가입금액|보험가입금액)\s*[:：]\s*(.+)/i
  ]);
  const premRaw = firstMatch(t, [
    /(?:premium|gross premium|ceded premium|deposit premium|보험료|수재보험료)\s*[:：]\s*(.+)/i
  ]);
  const ppw = firstMatch(t, [
    /(?:ppw|premium payment warranty|payment due|due date|납입기한)\s*[:：]\s*([0-9]{4}[-/.][0-9]{1,2}[-/.][0-9]{1,2})/i,
    /(?:ppw|premium payment warranty|payment due|due date|납입기한)\s*[:：]\s*(.+)/i
  ]);
  const cedant = firstMatch(t, [
    /(?:cedant|ceding company|reinsured|fronting carrier|출재사|원보험자)\s*[:：]\s*(.+)/i
  ]);
  const shareRaw = firstMatch(t, [
    /(?:share|participation|signed line|written line|수재지분|참여지분)\s*[:：]\s*(.+)/i
  ]);
  const period = firstMatch(t, [
    /(?:period|policy period|insurance period|보험기간)\s*[:：]\s*(.+)/i
  ]);
  const exclusions = firstMatch(t, [
    /(?:exclusion|exclusions|subjectivities|면책|제외)\s*[:：]\s*(.+)/i
  ]);
  const slipSummary = [
    insured ? `피보험자 ${insured}` : '',
    country || city ? `소재지 ${country} ${city}` : '',
    lineRaw ? `종목 ${lineRaw}` : '',
    period ? `보험기간 ${period}` : '',
    shareRaw ? `수재지분 ${shareRaw}` : ''
  ].filter(Boolean).join(' / ');
  const tsiMoney = parseMoneyToOriginal(tsiRaw);
  const premMoney = parseMoneyToOriginal(premRaw);
  const fx = DATA.fxRates || {USD:1450,EUR:1580,JPY:9.8,GBP:1850,KRW:1};
  const currency = premMoney.currency || tsiMoney.currency || 'USD';
  const premiumEok = premMoney.amount ? Math.max(1, Math.round(premMoney.amount * (fx[currency] || 1) / 100000000)) : 0;
  const tsiEok = tsiMoney.amount ? Math.max(1, Math.round(tsiMoney.amount * (fx[tsiMoney.currency || currency] || 1) / 100000000)) : 0;
  const fields = {
    insured, country, city,
    line: normalizeLine(lineRaw),
    tsiEok, premiumOriginal: Math.round(premMoney.amount || 0),
    currency,
    cedant, ppwDate: normalizeDate(ppw),
    slipSummary,
    memo: [
      `원문 자동추출 결과`,
      period ? `보험기간: ${period}` : '',
      shareRaw ? `수재지분: ${shareRaw}` : '',
      exclusions ? `Exclusion/Subjectivities: ${exclusions}` : '',
      `추출 원문 일부: ${(text||'').slice(0,700)}`
    ].filter(Boolean).join('\n')
  };
  const filled = Object.entries(fields).filter(([k,v]) => v && v !== 0).length;
  const confidence = Math.round(Math.min(95, Math.max(35, filled / Object.keys(fields).length * 110)));
  return {fields, confidence, raw:text};
}
function normalizeDate(s){
  if(!s) return '';
  const m = String(s).match(/([0-9]{4})[-/.]([0-9]{1,2})[-/.]([0-9]{1,2})/);
  if(m) return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
  return '';
}
function analyzeSlipOffer(){
  const pasted = (document.getElementById('slipEmailText')?.value || '').trim();
  const combined = [state.slipOfferText || '', pasted].filter(Boolean).join('\n\n');
  if(!combined){
    slipExtractResult.innerHTML = '<span class="required-warn">Slip 파일을 업로드하거나 이메일 본문을 붙여넣으세요.</span>';
    return;
  }
  state.slipExtract = extractSlipOffer(combined);
  renderSlipExtractResult();
}
function renderSlipExtractResult(){
  const r = state.slipExtract;
  if(!r){
    slipExtractResult.innerHTML = '추출 결과가 없습니다.';
    return;
  }
  const f = r.fields;
  const cls = r.confidence >= 75 ? 'confidence-high' : r.confidence >= 55 ? 'confidence-mid' : 'confidence-low';
  slipExtractResult.innerHTML = `
    <div><b>자동추출 신뢰도</b> <span class="${cls}">${r.confidence}%</span></div>
    <div class="slip-grid">
      <div class="slip-field"><b>피보험자</b>${f.insured || '-'}</div>
      <div class="slip-field"><b>국가/도시</b>${f.country || '-'} / ${f.city || '-'}</div>
      <div class="slip-field"><b>보험종목</b>${f.line || '-'}</div>
      <div class="slip-field"><b>가입금액 TSI</b>${f.tsiEok ? eok(f.tsiEok) : '-'}</div>
      <div class="slip-field"><b>보험료</b>${f.currency || '-'} ${f.premiumOriginal ? Number(f.premiumOriginal).toLocaleString() : '-'} / 환산 ${f.premiumOriginal ? eok(Math.max(1, Math.round(f.premiumOriginal * ((DATA.fxRates||{})[f.currency]||1) / 100000000))) : '-'}</div>
      <div class="slip-field"><b>PPW</b>${f.ppwDate || '-'}</div>
      <div class="slip-field"><b>출재사</b>${f.cedant || '-'}</div>
      <div class="slip-field"><b>Slip 요약</b>${f.slipSummary || '-'}</div>
    </div>
    <div class="extract-note">자동추출값은 초안입니다. 누락/오인식 가능성이 있으니 Slip 원문과 대조한 뒤 등록화면에 반영하세요.</div>
  `;
}
function applySlipOfferToFacForm(){
  if(!state.slipExtract) analyzeSlipOffer();
  if(!state.slipExtract) return;
  const f = state.slipExtract.fields || {};
  if(f.insured) facInsured.value = f.insured;
  if(f.country) facCountry.value = f.country;
  if(f.city) facCity.value = f.city;
  if(f.line) facLine.value = f.line;
  if(f.tsiEok) facTsi.value = f.tsiEok;
  if(f.premiumOriginal) facPremiumOriginal.value = f.premiumOriginal;
  if(f.currency) facCurrency.value = f.currency;
  if(f.cedant) facCedant.value = f.cedant;
  if(f.slipSummary) facSlipSummary.value = f.slipSummary;
  if(f.ppwDate) facPPW.value = f.ppwDate;
  if(f.memo) facMemo.value = f.memo;
  if(!facOwner.value) facOwner.value = currentUser();
  slipExtractResult.innerHTML += '<div class="extract-note"><b>등록화면 자동입력 완료.</b> 아래 등록 폼에서 값 확인·수정 후 [등록]을 누르세요.</div>';
}
function clearSlipOffer(){
  state.slipOfferText = '';
  state.slipExtract = null;
  const f = document.getElementById('slipOfferFile'); if(f) f.value = '';
  const t = document.getElementById('slipEmailText'); if(t) t.value = '';
  slipFileMsg.innerHTML = 'Slip PDF, 이메일 원문 TXT, 엑셀/CSV Bordereaux 파일을 업로드할 수 있습니다.';
  slipExtractResult.innerHTML = '추출 결과가 여기에 표시됩니다. 자동추출 후 사용자가 확인한 값만 등록화면으로 반영하세요.';
}
function registerFac(){
  const cur=facCurrency.value,fx=DATA.fxRates[cur] || 1;
  const orig=Number(facPremiumOriginal.value||0);
  const row={
    inwardRef:nextInwardRef(),
    insured:facInsured.value,
    country:facCountry.value,
    city:facCity.value,
    line:facLine.value,
    tsiEok:Number(facTsi.value||0),
    premiumOriginal:orig,
    currency:cur,
    fxRate:fx,
    premiumEok:Math.max(1,Math.round(orig*fx/100000000)),
    cedant:facCedant.value,
    slipSummary:facSlipSummary.value,
    memo:facMemo.value,
    ppwDate:facPPW.value,
    receivableStatus:'미수',
    owner:facOwner.value||currentUser(),
    receivableOwner:'',
    receivableUpdatedAt:'',
    sourceType:'플랫폼 수기등록',
    inputMethod: state.slipExtract ? 'Slip/Email 자동입력 후 사용자 확인' : '사용자 수기등록',
    originalSlipText: state.slipExtract ? (state.slipExtract.raw||'').slice(0,5000) : ''
  };
  state.fac.unshift(row);
  saveAll();
  facMsg.innerText=row.inwardRef+' 등록 완료';
  state.slipExtract = null;
  renderFacTable();
  renderPPW();
  renderDashboard();
}
const oldSwitchTabV41 = switchTab;
switchTab = function(tab){
  oldSwitchTabV41(tab);
  if(tab === 'inward' && state.slipExtract) renderSlipExtractResult();
};


/* ===== v42: PDF 텍스트 추출 fallback 보강 ===== */
async function maybeDecompressPdfStream(bytes){
  // Try browser-native zlib/deflate decompression. If unavailable/fails, return raw bytes.
  try{
    if(typeof DecompressionStream === 'undefined') return bytes;
    const ds = new DecompressionStream('deflate');
    const writer = ds.writable.getWriter();
    writer.write(bytes);
    writer.close();
    const ab = await new Response(ds.readable).arrayBuffer();
    return new Uint8Array(ab);
  }catch(e){
    try{
      if(typeof DecompressionStream === 'undefined') return bytes;
      const ds = new DecompressionStream('deflate-raw');
      const writer = ds.writable.getWriter();
      writer.write(bytes);
      writer.close();
      const ab = await new Response(ds.readable).arrayBuffer();
      return new Uint8Array(ab);
    }catch(e2){
      return bytes;
    }
  }
}
function decodePdfStringLiteral(s){
  // Basic PDF literal string decoding for text-based PDFs.
  return s
    .replace(/\\\n/g,'')
    .replace(/\\r/g,'')
    .replace(/\\n/g,'\n')
    .replace(/\\t/g,'\t')
    .replace(/\\\(/g,'(')
    .replace(/\\\)/g,')')
    .replace(/\\\\/g,'\\')
    .replace(/\\([0-7]{1,3})/g, (_,oct)=>String.fromCharCode(parseInt(oct,8)));
}
function extractStringsFromPdfContent(content){
  let out = [];
  // Literal strings followed by common text operators
  let re = /\((?:\\.|[^\\)])*\)\s*(?:Tj|'|"|TJ)/g;
  let m;
  while((m = re.exec(content))){
    const raw = m[0].match(/\((?:\\.|[^\\)])*\)/);
    if(raw) out.push(decodePdfStringLiteral(raw[0].slice(1,-1)));
  }
  // Arrays used by TJ: [(ABC) 120 (DEF)] TJ
  let arrRe = /\[(.*?)\]\s*TJ/gs;
  while((m = arrRe.exec(content))){
    const segment = m[1];
    const strRe = /\((?:\\.|[^\\)])*\)/g;
    let sm;
    let joined = '';
    while((sm = strRe.exec(segment))){
      joined += decodePdfStringLiteral(sm[0].slice(1,-1));
    }
    if(joined) out.push(joined);
  }
  // Hex strings sometimes used for simple encodings. Only keep readable ASCII chunks.
  let hexRe = /<([0-9A-Fa-f\s]{4,})>\s*(?:Tj|TJ)/g;
  while((m = hexRe.exec(content))){
    const hex = m[1].replace(/\s+/g,'');
    let txt = '';
    for(let i=0;i<hex.length-1;i+=2){
      const code = parseInt(hex.slice(i,i+2),16);
      if(code >= 32 && code <= 126) txt += String.fromCharCode(code);
      else if(code === 0) txt += ' ';
    }
    txt = txt.replace(/\s+/g,' ').trim();
    if(txt.length > 2) out.push(txt);
  }
  return out.join(' ').replace(/\s+/g,' ').trim();
}
async function extractPdfTextFallback(arrayBuffer){
  const u8 = new Uint8Array(arrayBuffer);
  const latin = new TextDecoder('latin1').decode(u8);
  let texts = [];

  // Extract all PDF streams. If stream has /FlateDecode nearby, try decompression.
  const streamRe = /<<(.*?)>>\s*stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m;
  while((m = streamRe.exec(latin))){
    const dict = m[1] || '';
    const rawStr = m[2] || '';
    let bytes = new Uint8Array(rawStr.length);
    for(let i=0;i<rawStr.length;i++) bytes[i] = rawStr.charCodeAt(i) & 0xff;
    let decodedBytes = bytes;
    if(/FlateDecode/i.test(dict)){
      decodedBytes = await maybeDecompressPdfStream(bytes);
    }
    let content = new TextDecoder('latin1').decode(decodedBytes);
    let extracted = extractStringsFromPdfContent(content);
    if(extracted) texts.push(extracted);
  }

  // Fallback: inspect full PDF for uncompressed literals.
  if(!texts.join('').trim()){
    const fullExtract = extractStringsFromPdfContent(latin);
    if(fullExtract) texts.push(fullExtract);
  }

  // Last fallback: readable ASCII scan, useful for very simple PDFs.
  if(!texts.join('').trim()){
    const ascii = latin.replace(/[^\x20-\x7E\n\r\t]+/g,' ').replace(/\s+/g,' ');
    const words = ascii.match(/[A-Za-z][A-Za-z0-9,.:;\/\-$% ]{3,}/g) || [];
    texts.push(words.slice(0,300).join(' '));
  }

  return texts.join('\n').replace(/\s+/g,' ').trim().slice(0,50000);
}

// Override extractFileText to make PDF work even when CDN pdf.js is blocked.
async function extractFileText(file){
  if(!file) return {text:'', message:'파일이 없습니다.'};
  const name = file.name || '';
  try{
    if(name.toLowerCase().endsWith('.txt') || name.toLowerCase().endsWith('.csv')){
      const text = await file.text();
      return {text:text.slice(0,50000), message:`${name} 텍스트 추출 완료`};
    }
    if(name.toLowerCase().endsWith('.xlsx') || name.toLowerCase().endsWith('.xls')){
      if(typeof XLSX === 'undefined') return {text:'', message:'엑셀 파서를 불러오지 못했습니다.'};
      const wb = XLSX.read(await file.arrayBuffer(), {type:'array'});
      let text = '';
      wb.SheetNames.slice(0,5).forEach(sn=>{
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], {defval:''});
        text += `[${sn}]\n` + rows.slice(0,80).map(r=>JSON.stringify(r)).join('\n') + '\n';
      });
      return {text:text.slice(0,50000), message:`${name} 엑셀 ${wb.SheetNames.length}개 시트 추출 완료`};
    }
    if(name.toLowerCase().endsWith('.pdf')){
      const buf = await file.arrayBuffer();
      // First try pdf.js if available.
      if(typeof pdfjsLib !== 'undefined'){
        try{
          if(pdfjsLib.GlobalWorkerOptions) pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          const pdf = await pdfjsLib.getDocument({data:buf}).promise;
          let text = '';
          const maxPages = Math.min(pdf.numPages, 30);
          for(let p=1;p<=maxPages;p++){
            const page = await pdf.getPage(p);
            const content = await page.getTextContent();
            text += content.items.map(x=>x.str).join(' ') + '\n';
          }
          if(text.trim()){
            return {text:text.slice(0,50000), message:`${name} PDF ${pdf.numPages}페이지 중 ${maxPages}페이지 추출 완료`};
          }
        }catch(e){
          // Continue to local fallback.
        }
      }
      const fallbackText = await extractPdfTextFallback(buf);
      if(fallbackText){
        return {text:fallbackText.slice(0,50000), message:`${name} PDF 텍스트 추출 완료(fallback)`};
      }
      return {text:'', message:`${name}에서 텍스트를 읽지 못했습니다. 스캔 이미지 PDF이면 OCR 연계가 필요합니다.`};
    }
    return {text:'', message:'지원하지 않는 파일 형식입니다.'};
  }catch(e){
    return {text:'', message:'파일을 읽지 못했습니다: ' + (e.message || e)};
  }
}

const oldPreviewSlipOfferFileV42 = previewSlipOfferFile;
previewSlipOfferFile = async function(file){
  if(!file){
    slipFileMsg.innerText = '파일을 선택하세요.';
    return;
  }
  slipFileMsg.innerText = 'Slip 파일 내용 추출 중...';
  const result = await extractFileText(file);
  state.slipOfferText = result.text || '';
  slipFileMsg.innerHTML = result.text
    ? `<span class="doc-index-ok">${result.message}</span><br><small>추출된 텍스트 ${result.text.length.toLocaleString()}자. 이제 [AI 자동추출]을 누르세요.</small>`
    : `<span class="doc-index-no">${result.message}</span><br><small>텍스트가 없는 스캔 PDF는 OCR 연계가 필요합니다. 메일 본문 붙여넣기 또는 텍스트 PDF를 사용하세요.</small>`;
};


/* ===== v43: 입력창 확대/클레임 Queue 선택삭제 보강 ===== */
function deleteSelectedInwardClaims(){
  const ids = [...document.querySelectorAll('.ic-check:checked')].map(x=>x.value);
  if(!ids.length) return alert('삭제할 클레임을 선택하세요.');
  if(!confirm(`선택한 클레임 ${ids.length}건을 클레임 Queue에서 삭제할까요?`)) return;
  state.inwardClaims = state.inwardClaims.filter(c => !ids.includes(c.claimNo));
  if(ids.includes(state.selectedIC)) state.selectedIC = null;
  saveAll();
  renderInwardClaims();
  const box = document.getElementById('surveySummary');
  if(box) box.innerHTML = `${ids.length}건 삭제 완료. 클레임 Queue에서 제거되었습니다.`;
}

function renderInwardClaims(){
  if(typeof renderClaimContractSearch === 'function') renderClaimContractSearch();
  const q = (document.getElementById('icQueueSearch')?.value || '').toLowerCase();
  const st = document.getElementById('icQueueStatus')?.value || '전체';
  const rows = state.inwardClaims
    .filter(c => (!q || JSON.stringify(c).toLowerCase().includes(q)) && (st==='전체' || c.status===st))
    .slice(0, 120);
  const tbody = document.querySelector('#icTable tbody');
  if(!tbody) return;
  tbody.innerHTML = rows.map(c => `<tr>
    <td><input class="ic-check small-check" type="checkbox" value="${c.claimNo}"/></td>
    <td>${c.claimNo}</td>
    <td>${c.inwardRef}</td>
    <td>${c.insured}</td>
    <td>${c.cause}</td>
    <td>${eok(c.paidLossEok||0)} / ${eok(c.outstandingLossEok||0)}</td>
    <td>${c.status}<br><small>${c.sourceType||''}</small></td>
    <td><button class="save-btn" onclick="selectInwardClaim('${c.claimNo}')">선택</button></td>
  </tr>`).join('') || `<tr><td colspan="8">조회된 클레임이 없습니다.</td></tr>`;
}

// textarea에서 Ctrl+Enter로 전송
window.addEventListener('load', () => {
  setTimeout(() => {
    const q = document.getElementById('copilotQ');
    if(q){
      q.addEventListener('keydown', (e) => {
        if((e.ctrlKey || e.metaKey) && e.key === 'Enter'){
          e.preventDefault();
          sendCopilot();
        }
      });
    }
    renderInwardClaims();
  }, 500);
});


/* ===== v44: AI Copilot 답변 품질 개선용 시연 로직 ===== */
function getRelevantDocs(q){
  const docs = state.docs || DATA.docs || [];
  const terms = q.toLowerCase().split(/\s+/).filter(x=>x.length>1);
  return docs.map(d => {
    const hay = `${d.title||''} ${d.type||''} ${d.keywords||''} ${d.text||''}`.toLowerCase();
    const score = terms.reduce((a,t)=>a+(hay.includes(t)?2:0),0) + (/xl|reinsurance|treaty|재보험/i.test(q) && /xl|treaty|재보험/i.test(hay) ? 3 : 0) + (d.text ? 1 : 0);
    return {d, score};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,5);
}
function topOpenClaims(){
  return (state.accidents || []).slice(0,20).sort((a,b)=>(b.grossLossEok||0)-(a.grossLossEok||0)).slice(0,5);
}
function topPPW(){
  return (state.fac || []).filter(f => f.receivableStatus !== '정상' || dayDiff(f.ppwDate) <= 14).sort((a,b)=>dayDiff(a.ppwDate)-dayDiff(b.ppwDate)).slice(0,6);
}
function buildInsuranceAnswer(q){
  const lower = q.toLowerCase();
  const docHits = getRelevantDocs(q);
  const docNames = docHits.length ? docHits.map(x=>x.d.title).join(', ') : '등록 문서 없음';
  const hasUpload = !!state.copilotFileText;

  if(hasUpload && (lower.includes('업로드') || lower.includes('파일') || lower.includes('요약') || lower.includes('pdf') || lower.includes('엑셀'))){
    return `<b>업로드 파일 기반 요약</b>
      <div class="answer-section">${summarizeText(state.copilotFileText, state.copilotFileName)}</div>
      <div class="answer-section"><b>업무상 확인 포인트</b><br>
      ① 피보험자/출재사/소재지/보험기간/TSI/Premium/PPW 등 등록 필드 누락 여부<br>
      ② Exclusion, Subjectivity, Deductible, Claims Notification 조항 확인<br>
      ③ 임의수재 등록 후 PPW 미수관리와 클레임 Queue 연결 필요</div>`;
  }

  if(lower.includes('ppw') || q.includes('미수')){
    const rows = topPPW();
    return `<b>PPW/미수 우선점검 결과</b>
      <div class="answer-section">현재 PPW 임박 또는 미수상태 수재건 중 우선 확인 대상은 ${rows.length}건입니다.</div>
      <table class="answer-table"><thead><tr><th>수재관리번호</th><th>피보험자</th><th>PPW</th><th>상태</th><th>담당자</th></tr></thead><tbody>
      ${rows.map(f=>`<tr><td>${f.inwardRef}</td><td>${f.insured}</td><td>${f.ppwDate}</td><td>${f.receivableStatus}</td><td>${f.owner||'-'}</td></tr>`).join('')}
      </tbody></table>
      <div class="logic-note">권고: D-7 이내 미수/부분입금 건은 출재사·브로커 확인 메일을 발송하고, 입금확인 후 미수 담당자와 저장 이력을 갱신하세요.</div>`;
  }

  if(lower.includes('hours') || lower.includes('cat') || q.includes('태풍') || q.includes('홍수') || q.includes('지진')){
    return `<b>Cat XL / Hours Clause 검토</b>
      <div class="answer-section"><b>판단 순서</b><br>
      ① 사고 원인이 Cat/Event 성인지 확인합니다. 예: 태풍, 홍수, 지진, 광역 침수<br>
      ② 사고 발생 시간대와 지역을 묶어 Hours Clause 범위에 들어오는지 확인합니다.<br>
      ③ 같은 Event로 묶을 계약/사고를 확정하고 Gross 손해액, Paid, Outstanding을 분리합니다.<br>
      ④ 회수 가능 손해액 산정 시 면책, 자기부담금, 한도초과, Exclusion, 회수불가 비용을 차감합니다.<br>
      ⑤ Cat XL Layer의 Retention 초과분부터 회수 가능성을 검토합니다.</div>
      <div class="answer-section"><b>추가 요청자료</b><br>사고 발생 타임라인, 소재지 목록, 기상청/공공기관 재난자료, 손해사정서, 사진, 복구견적서, 약관 및 Treaty wording.</div>
      <div class="chat-source">참고문서: ${docNames}</div>`;
  }

  if(lower.includes('risk xl') || lower.includes('xl') || q.includes('재보험') || q.includes('회수') || q.includes('화재') || q.includes('노후화') || q.includes('면책')){
    const claims = topOpenClaims();
    return `<b>사고·재보험 영향 검토</b>
      <div class="answer-section"><b>1. 담보/면책 검토</b><br>
      사고원인이 화재·폭발 등 급격하고 우연한 물적손해라면 Package 담보 검토 대상입니다. 다만 노후화, 마모, 점진적 열화, 고의, 전쟁/제재, 사이버성 손해 등은 약관·특약상 면책 또는 제한 가능성이 있으므로 원인조사보고서가 필요합니다.</div>
      <div class="answer-section"><b>2. Risk XL 회수 가능성</b><br>
      단일 소재지·단일 Risk 사고라면 Risk XL 검토 흐름이 적합합니다. Gross 손해액에서 자기부담금, 면책 손해, 한도초과, 회수불가 비용을 차감한 뒤 Retention 초과분이 Layer 회수대상입니다.</div>
      <div class="answer-section"><b>3. 실무 액션</b><br>
      사고·재보험 영향분석 메뉴에서 Paid/Outstanding을 구분 입력하고, 영향 Treaty로 Property Risk XL을 선택해 Layer별 회수액을 시뮬레이션하세요. 이후 Layer 소진 관리에 해당 사고번호 또는 증권번호를 연결해 사용액을 관리합니다.</div>
      <table class="answer-table"><thead><tr><th>사고번호</th><th>증권번호</th><th>피보험자</th><th>Gross</th><th>상태</th></tr></thead><tbody>
      ${claims.map(c=>`<tr><td>${c.claimNo}</td><td>${c.policyNo}</td><td>${c.insured}</td><td>${eok(c.grossLossEok||0)}</td><td>${c.status}</td></tr>`).join('')}
      </tbody></table>
      <div class="chat-source">참고문서: ${docNames}</div>`;
  }

  if(q.includes('문서') || q.includes('약관') || q.includes('특약') || q.includes('요약') || lower.includes('pdf')){
    if(docHits.length){
      return `<b>등록 문서 기반 답변</b>
        ${docHits.slice(0,3).map(x=>`<div class="answer-section">${summarizeDocText(x.d,q)}</div>`).join('')}
        <div class="chat-source">참고문서: ${docHits.map(x=>x.d.title).join(', ')}</div>`;
    }
    return `<b>문서 기반 답변</b><br>질문과 일치하는 등록 문서를 찾지 못했습니다. 약관·특약 문서관리에서 PDF를 등록하거나 Copilot 파일 업로드 영역에 직접 올려주세요.`;
  }

  return `<b>업무 검토 초안</b>
    <div class="answer-section">질문 내용을 기준으로 계약·사고·수재·재보험·문서 데이터를 함께 확인하는 방식으로 답변합니다.</div>
    <div class="answer-section"><b>확인 순서</b><br>
    ① 관련 계약/수재관리번호 확인 → ② 소재지와 가입금액 확인 → ③ 사고 또는 PPW 등 현안 확인 → ④ 약관/특약 문서 확인 → ⑤ 재보험 영향 및 손익 영향 검토</div>
    <div class="chat-source">실제 구축 시 이 영역은 Azure OpenAI + 내부 RAG + 권한 필터링으로 대체됩니다.</div>`;
}
function sendCopilot(){
  const q = (copilotQ.value || '').trim();
  if(!q) return;
  state.chat.push({role:'user', text:q});
  const ans = buildInsuranceAnswer(q);
  state.chat.push({role:'ai', text:ans});
  copilotQ.value = '';
  renderCopilotChat();
}
function renderCopilotChat(){
  const log = document.getElementById('chatLog');
  if(!log) return;
  log.innerHTML = state.chat.map(m => `<div class="msg ${m.role}">${m.text}</div>`).join('') || '<div class="msg ai">안녕하세요. 계약, 사고, 수재, 재보험, 약관·특약에 대해 질문해 주세요. 현재 화면은 시연용 로직이며, 실제 구축 시 Azure OpenAI/RAG와 연결하면 ChatGPT 수준의 자연어 답변이 가능합니다.</div>';
  log.scrollTop = log.scrollHeight;
}
window.addEventListener('load', () => {
  setTimeout(() => {
    const q = document.getElementById('copilotQ');
    if(q){
      q.addEventListener('keydown', (e) => {
        if((e.ctrlKey || e.metaKey) && e.key === 'Enter'){
          e.preventDefault();
          sendCopilot();
        }
      });
    }
    renderCopilotChat();
  }, 500);
});

/* ===== v45: 기간계 마감데이터 공식원천 + 마감 전 수기관리 분리 아키텍처 ===== */
state.closeMeta = JSON.parse(localStorage.getItem('gra_v45_closeMeta') || JSON.stringify({basis:'operational', closeMonth:'2026-06', snapshots:[]}));
state.pages.closing = state.pages.closing || 1;

const oldSaveAllV45 = saveAll;
saveAll = function(){
  try{ oldSaveAllV45(); }catch(e){}
  try{ localStorage.setItem('gra_v45_closeMeta', JSON.stringify(state.closeMeta || {})); }catch(e){}
};

function closeMonthNow(){
  const d = new Date();
  return d.toISOString().slice(0,7);
}
function ensureWorkflowFields(){
  state.closeMeta = state.closeMeta || {basis:'operational', closeMonth:'2026-06', snapshots:[]};
  state.closeMeta.basis = state.closeMeta.basis || 'operational';
  state.closeMeta.closeMonth = state.closeMeta.closeMonth || closeMonthNow();
  state.closeMeta.snapshots = state.closeMeta.snapshots || [];
  (state.fac || []).forEach((f, idx) => {
    if(!f.closeStatus) f.closeStatus = f.policyNoLinked ? '대사완료' : '수기등록';
    if(!f.closeMonth) f.closeMonth = state.closeMeta.closeMonth;
    if(!f.tempDataType) f.tempDataType = '마감 전 수기관리';
    if(!f.reconcileNote) f.reconcileNote = '';
    if(!f.createdAt) f.createdAt = `2026-06-${String((idx%20)+1).padStart(2,'0')}`;
  });
}
function sourcePill(type, text){
  const cls = type === 'official' ? 'official' : type === 'manual' ? 'manual' : type === 'reconciled' ? 'reconciled' : type === 'exception' ? 'exception' : '';
  return `<span class="source-pill ${cls}">${text}</span>`;
}
function manualOpenFac(){
  ensureWorkflowFields();
  return (state.fac || []).filter(f => f.closeStatus !== '대사완료');
}
function manualTargetFac(){ return manualOpenFac().filter(f => ['기간계 입력대상','기간계 입력완료','대사오류/확인필요'].includes(f.closeStatus)); }
function manualExceptionFac(){ return (state.fac || []).filter(f => f.closeStatus === '대사오류/확인필요'); }
function officialContracts(){ return allContracts().map(c => ({...c, sourceType:'기간계 마감데이터', sourceBucket:'official'})); }
function manualAsContracts(){
  return manualOpenFac().map(f => ({
    policyNo:f.inwardRef,
    inwardRef:f.inwardRef,
    insured:f.insured,
    country:f.country,
    city:f.city,
    line:f.line,
    tsiEok:Number(f.tsiEok||0),
    premiumEok:Number(f.premiumEok||0),
    renewalDate:f.ppwDate || '',
    status:f.closeStatus || '수기등록',
    sourceType:'마감 전 수기관리',
    sourceBucket:'manual',
    closeStatus:f.closeStatus,
    closeMonth:f.closeMonth,
    lat:f.lat,
    lng:f.lng
  }));
}
function contractsByBasis(basis){
  ensureWorkflowFields();
  const b = basis || state.closeMeta.basis || 'operational';
  if(b === 'official') return officialContracts();
  if(b === 'manual') return manualAsContracts();
  return officialContracts().concat(manualAsContracts());
}
function basisLabel(basis){
  const b = basis || state.closeMeta.basis || 'operational';
  if(b === 'official') return '공식 기준: 기간계 마감데이터만 반영';
  if(b === 'manual') return '수기 기준: 마감 전 수기데이터만 조회';
  return '운영 기준: 기간계 + 마감 전 수기데이터 포함';
}
function setGlobalBasis(basis){
  ensureWorkflowFields();
  state.closeMeta.basis = basis;
  saveAll();
  const ids = ['contractBasisSelect','locationBasisSelect','closingBasisSelect'];
  ids.forEach(id => { const el = document.getElementById(id); if(el) el.value = basis; });
  renderBasisExplain();
  renderDashboard();
  renderContractTable();
  try{ renderMap(); }catch(e){}
  try{ renderPnlCandidates(); }catch(e){}
  renderClosingTable();
}

function injectV45Controls(){
  // 계약조회 기준 선택
  const contractPanel = document.querySelector('#contract .panel h3');
  if(contractPanel && !document.getElementById('contractBasisSelect')){
    contractPanel.insertAdjacentHTML('afterend', `<div class="basis-bar"><label>조회 기준</label><select id="contractBasisSelect" onchange="setGlobalBasis(this.value)"><option value="official">공식 기준: 기간계 마감데이터</option><option value="operational">운영 기준: 기간계+마감 전 수기</option><option value="manual">수기 기준: 마감 전 수기만</option></select><span class="mini-msg">기간계는 공식 원천, 수기데이터는 마감 전 업무관리용입니다.</span></div>`);
  }
  // 소재지 지도 기준 선택
  const locPanel = document.querySelector('#location .panel h3');
  if(locPanel && !document.getElementById('locationBasisSelect')){
    locPanel.insertAdjacentHTML('afterend', `<div class="basis-bar"><label>지도 기준</label><select id="locationBasisSelect" onchange="setGlobalBasis(this.value)"><option value="official">공식 기준</option><option value="operational">운영 기준</option><option value="manual">수기 기준</option></select><span class="mini-msg">운영 기준 선택 시 마감 전 수기계약도 누적위험에 포함합니다.</span></div>`);
  }
  // 관리자 업로드 패널에 마감월/공식 원천 설명 추가
  const adminContractPanel = document.querySelector('#adminContractFile')?.closest('.panel');
  if(adminContractPanel && !document.getElementById('adminCloseMonth')){
    adminContractPanel.insertAdjacentHTML('afterbegin', `<div class="architecture-mini"><p class="notice"><b>기간계 → 플랫폼 단방향 업로드</b><br>월마감 완료 후 기간계에서 내려받은 확정 데이터를 업로드합니다. 이 데이터가 공식 원천이며, 업로드 후 마감 전 수기데이터와 대사합니다.</p><label class="full-label">마감월<input type="month" id="adminCloseMonth" value="${state.closeMeta.closeMonth || closeMonthNow()}"></label></div>`);
  }
  // 수재 등록 패널 안내 문구 변경
  const inwardNotice = document.querySelector('#inward .notice');
  if(inwardNotice){
    inwardNotice.innerHTML = '마감 전 발생한 해외수재 계약은 플랫폼에서 실시간 수기관리하고, 월마감 전 기간계 입력 후 마감데이터 업로드 시 공식 데이터와 대사합니다.';
  }
  // 선택값 동기화
  ['contractBasisSelect','locationBasisSelect','closingBasisSelect'].forEach(id => { const el=document.getElementById(id); if(el) el.value = state.closeMeta.basis || 'operational'; });
}

function renderBasisExplain(){
  const el = document.getElementById('basisExplain');
  if(!el) return;
  const b = state.closeMeta.basis || 'operational';
  const officialCnt = officialContracts().length;
  const manualCnt = manualOpenFac().length;
  el.innerHTML = `<b>${basisLabel(b)}</b><br>` +
    (b === 'official' ? `경영보고·공식 통계는 월마감 후 업로드된 기간계 데이터 ${officialCnt}건만 사용합니다.` :
     b === 'manual' ? `마감 전 업무관리 대상 ${manualCnt}건만 별도 조회합니다. 공식 통계에는 사용하지 않습니다.` :
     `실무 리스크 관리를 위해 기간계 공식계약 ${officialCnt}건과 마감 전 수기계약 ${manualCnt}건을 함께 봅니다.`);
}

// 공식/운영/수기 기준에 따라 계약 조회를 재정의
function contractFiltered(){
  const q=(document.getElementById('contractSearch')?.value||'').toLowerCase(), s=document.getElementById('contractLineFilter')?.value||'전체';
  return contractsByBasis(state.closeMeta.basis).filter(c=>(!q||JSON.stringify(c).toLowerCase().includes(q))&&(s==='전체'||c.line===s));
}
function renderContractTable(){
  ensureWorkflowFields();
  setMetaText();
  injectV45Controls();
  const rows=contractFiltered(), total=Math.max(1,Math.ceil(rows.length/PAGE));
  state.pages.contract=Math.min(state.pages.contract,total);
  const page=rows.slice((state.pages.contract-1)*PAGE,state.pages.contract*PAGE);
  const cc = document.getElementById('contractCount');
  if(cc) cc.innerHTML=`검색 결과 ${rows.length}건 · ${basisLabel(state.closeMeta.basis)} · 공식원천 ${dataSourceLabel('contract')}`;
  const tb = document.querySelector('#contractTable tbody');
  if(tb) tb.innerHTML=page.map(c=>{
    const pill = c.sourceBucket === 'manual' ? sourcePill('manual','마감 전 수기') : sourcePill('official','기간계 공식');
    const id = c.sourceBucket === 'manual' ? `<button class="link-btn" onclick="switchTab('closing')">${c.policyNo}</button>` : c.policyNo;
    return `<tr><td>${id}<br>${pill}</td><td>${c.insured}</td><td>${c.country||''}/${c.city||''}</td><td>${c.line||''}</td><td>${eok(c.tsiEok)}</td><td>${eok(c.premiumEok)}</td><td>${c.renewalDate||c.closeMonth||'-'}</td></tr>`;
  }).join('');
  const pg=document.getElementById('contractPage'); if(pg) pg.innerText=`${state.pages.contract} / ${total}`;
}

function allRiskContracts(){ return contractsByBasis(state.closeMeta.basis); }
function renderMap(){
  ensureWorkflowFields();
  injectV45Controls();
  const asOf = document.getElementById('riskAsOf');
  if(asOf) asOf.innerText = `기준: ${basisLabel(state.closeMeta.basis)} / 마감월 ${state.meta.contractCloseMonth || state.closeMeta.closeMonth || '-'} / 단위: 억원`;
  const regs = regionAgg();
  const cards = document.getElementById('regionCards');
  if(cards) cards.innerHTML = regs.slice(0,12).map(r => `<div class="region-card" onclick="selectRegion('${r.country}','${r.city}')"><b>${r.country} / ${r.city}</b><br>누적 가입금액 ${eok(r.tsi)} · 계약 ${r.cnt}건</div>`).join('') || '<div class="mini-msg">표시할 계약이 없습니다.</div>';
  if(typeof L === 'undefined'){
    const el = document.getElementById('leafletMap');
    if(el) el.innerHTML = '<div class="result-box">지도 라이브러리를 불러오지 못했습니다.</div>';
    if(regs[0]) selectRegion(regs[0].country, regs[0].city);
    return;
  }
  if(!leafletMapV36){
    leafletMapV36 = L.map('leafletMap', {scrollWheelZoom:true}).setView([25, 105], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:18, attribution:'&copy; OpenStreetMap'}).addTo(leafletMapV36);
  }
  if(leafletLayerV36) leafletLayerV36.remove();
  leafletLayerV36 = L.layerGroup().addTo(leafletMapV36);
  regs.forEach(r => {
    const level = r.tsi > 120000 ? 'high' : (r.tsi < 45000 ? 'low' : '');
    const icon = L.divIcon({className:'risk-marker', html:`<div class="risk-pin ${level}">${Math.round(r.tsi/1000)}k</div>`, iconSize:[36,36], iconAnchor:[18,18]});
    L.marker([r.lat, r.lng], {icon}).addTo(leafletLayerV36).bindPopup(`<b>${r.country} / ${r.city}</b><br>누적가입금액 ${eok(r.tsi)}<br>계약 ${r.cnt}건<br>${basisLabel(state.closeMeta.basis)}`).on('click', () => selectRegion(r.country, r.city));
  });
  setTimeout(()=>leafletMapV36.invalidateSize(),100);
  if(regs[0]) selectRegion(regs[0].country, regs[0].city);
}
function regionRows(){
  const q=(document.getElementById('regionSearch')?.value||'').toLowerCase();
  if(!state.selectedRegion)return [];
  return allRiskContracts().filter(c=>c.country===state.selectedRegion.country&&c.city===state.selectedRegion.city&&(!q||JSON.stringify(c).toLowerCase().includes(q)));
}
function renderRegionDrill(){
  const rows=regionRows(), total=Math.max(1,Math.ceil(rows.length/PAGE));
  state.pages.region=Math.min(state.pages.region,total);
  const page=rows.slice((state.pages.region-1)*PAGE,state.pages.region*PAGE);
  const info=document.getElementById('regionInfo'); if(info) info.innerText=state.selectedRegion?`${state.selectedRegion.country} / ${state.selectedRegion.city} · ${rows.length}건 · ${basisLabel(state.closeMeta.basis)}`:'';
  const tb=document.querySelector('#regionTable tbody');
  if(tb) tb.innerHTML=page.map(c=>`<tr><td>${c.policyNo}</td><td>${c.insured}</td><td>${c.line}</td><td>${eok(c.tsiEok)}</td><td>${c.sourceBucket==='manual'?sourcePill('manual','마감 전 수기'):sourcePill('official','기간계 공식')}</td></tr>`).join('');
  const pg=document.getElementById('regionPage'); if(pg) pg.innerText=`${state.pages.region} / ${total}`;
}

// 수기 수재 등록 시 워크플로우 상태 부여
const oldRegisterFacV45 = registerFac;
registerFac = function(){
  oldRegisterFacV45();
  ensureWorkflowFields();
  const f = state.fac && state.fac[0];
  if(f){
    f.closeStatus = '수기등록';
    f.tempDataType = '마감 전 수기관리';
    f.sourceType = '마감 전 수기관리';
    f.closeMonth = state.closeMeta.closeMonth || closeMonthNow();
    f.policyNoLinked = '';
    f.reconcileNote = '기간계 입력 전 실시간 업무관리 데이터';
    f.createdAt = new Date().toISOString().slice(0,10);
    saveAll();
  }
  renderClosingTable();
  renderDashboard();
};

function facStatusBadge(f){
  const st = f.closeStatus || '수기등록';
  const type = st === '대사완료' ? 'reconciled' : st === '대사오류/확인필요' ? 'exception' : 'manual';
  return sourcePill(type, st);
}
function facFiltered(){
  ensureWorkflowFields();
  const q=(document.getElementById('facSearch')?.value||'').toLowerCase(), s=document.getElementById('facStatusFilter')?.value||'전체';
  return state.fac.filter(f=>(!q||JSON.stringify(f).toLowerCase().includes(q))&&(s==='전체'||f.receivableStatus===s));
}
function renderFacTable(){
  ensureWorkflowFields();
  const head = document.querySelector('#facTable thead tr');
  if(head) head.innerHTML = `<th><input type="checkbox" onclick="toggleChecks('.fac-check',this.checked)"/></th><th>수재관리번호</th><th>피보험자</th><th>국가/도시</th><th>보험종목</th><th>보험료</th><th>PPW</th><th>미수상태</th><th>마감/기간계 상태</th><th>처리</th>`;
  const rows=facFiltered(), total=Math.max(1,Math.ceil(rows.length/PAGE));
  state.pages.fac=Math.min(state.pages.fac,total);
  const page=rows.slice((state.pages.fac-1)*PAGE,state.pages.fac*PAGE);
  const cnt=document.getElementById('facCount'); if(cnt) cnt.innerText=`검색 결과 ${rows.length}건 / 마감 전 수기관리와 대사완료 이력을 함께 조회`;
  const tb=document.querySelector('#facTable tbody');
  if(tb) tb.innerHTML=page.map(f=>`<tr><td><input class="fac-check small-check" type="checkbox" value="${f.inwardRef}"/></td><td><button class="link-btn" onclick="showFac('${f.inwardRef}')">${f.inwardRef}</button></td><td>${f.insured}</td><td>${f.country}/${f.city}</td><td>${f.line}</td><td>${eok(f.premiumEok)}<br><small>${f.currency} / FX ${f.fxRate}</small></td><td>${f.ppwDate||'-'}</td><td>${f.receivableStatus}</td><td class="status-cell">${facStatusBadge(f)}<small>${f.policyNoLinked?'<br>증권번호 '+f.policyNoLinked:''}</small></td><td><div class="closing-actions"><button onclick="markCoreTarget('${f.inwardRef}')">입력대상</button><button onclick="markCoreDone('${f.inwardRef}')">입력완료</button><button onclick="switchTab('closing')">대사관리</button></div></td></tr>`).join('');
  const pg=document.getElementById('facPage'); if(pg) pg.innerText=`${state.pages.fac} / ${total}`;
}

function markCoreTarget(ref){
  ensureWorkflowFields();
  const f = state.fac.find(x=>x.inwardRef===ref); if(!f) return;
  f.closeStatus = '기간계 입력대상';
  f.reconcileNote = '월마감 전 기간계 입력 필요';
  saveAll(); renderFacTable(); renderClosingTable(); renderDashboard();
}
function markCoreDone(ref){
  ensureWorkflowFields();
  const f = state.fac.find(x=>x.inwardRef===ref); if(!f) return;
  f.closeStatus = '기간계 입력완료';
  f.coreInputAt = new Date().toISOString().slice(0,16).replace('T',' ');
  f.reconcileNote = '기간계 입력 완료. 월마감 데이터 업로드 후 대사 필요';
  saveAll(); renderFacTable(); renderClosingTable(); renderDashboard();
}
function manualMatchScore(f,c){
  let score = 0;
  const fi = String(f.insured||'').toLowerCase(), ci = String(c.insured||'').toLowerCase();
  if(fi && ci && (fi===ci || fi.includes(ci) || ci.includes(fi))) score += 45;
  if(f.country && c.country && f.country === c.country) score += 15;
  if(f.city && c.city && f.city === c.city) score += 10;
  if(f.line && c.line && f.line === c.line) score += 10;
  const p1=Number(f.premiumEok||0), p2=Number(c.premiumEok||0); if(p1 && p2 && Math.abs(p1-p2)/Math.max(p1,p2) <= .12) score += 10;
  const t1=Number(f.tsiEok||0), t2=Number(c.tsiEok||0); if(t1 && t2 && Math.abs(t1-t2)/Math.max(t1,t2) <= .15) score += 10;
  return score;
}
function reconcileManualWithSystem(closeMonth){
  ensureWorkflowFields();
  const sys = officialContracts();
  let ok=0, warn=0;
  state.fac.forEach(f => {
    if(!['기간계 입력완료','기간계 입력대상','대사오류/확인필요'].includes(f.closeStatus)) return;
    let best = null, bestScore = -1;
    sys.forEach(c => { const sc = manualMatchScore(f,c); if(sc > bestScore){ bestScore=sc; best=c; } });
    if(best && bestScore >= 70){
      f.closeStatus = '대사완료';
      f.policyNoLinked = best.policyNo;
      f.closeMonth = closeMonth || state.closeMeta.closeMonth;
      f.reconcileScore = bestScore;
      f.reconcileNote = `기간계 마감데이터와 매칭 완료 (${best.policyNo}, score ${bestScore})`;
      ok++;
    }else if(['기간계 입력완료','기간계 입력대상'].includes(f.closeStatus)){
      f.closeStatus = '대사오류/확인필요';
      f.policyNoLinked = '';
      f.reconcileScore = Math.max(0,bestScore);
      f.reconcileNote = best ? `유사 후보 ${best.policyNo} 있으나 점수 ${bestScore}로 확인 필요` : '기간계 마감데이터에서 유사 계약 미발견';
      warn++;
    }
  });
  saveAll();
  return {ok,warn};
}

const oldImportSystemContractsFromFileV45 = importSystemContractsFromFile;
importSystemContractsFromFile = async function(){
  const monthInput = document.getElementById('adminCloseMonth');
  const closeMonth = monthInput?.value || state.closeMeta.closeMonth || closeMonthNow();
  await oldImportSystemContractsFromFileV45();
  state.closeMeta.closeMonth = closeMonth;
  state.meta.contractCloseMonth = closeMonth;
  state.closeMeta.snapshots = state.closeMeta.snapshots || [];
  state.closeMeta.snapshots.unshift({
    closeMonth,
    uploadedAt:state.meta.contractUploadAt,
    sourceFile:state.meta.contractSourceFile || '',
    contractCount:officialContracts().length
  });
  state.closeMeta.snapshots = state.closeMeta.snapshots.slice(0,12);
  const result = reconcileManualWithSystem(closeMonth);
  const msg = document.getElementById('adminContractMsg');
  if(msg){
    msg.innerHTML += `<br><span class="match-ok">대사완료 ${result.ok}건</span> · <span class="match-warn">확인필요 ${result.warn}건</span><br>마감월: ${closeMonth} / 기간계 공식원천 기준으로 저장되었습니다.`;
  }
  saveAll();
  renderClosingTable(); renderCloseSummary(); renderFacTable(); renderDashboard(); renderContractTable();
};

function closingRows(){
  ensureWorkflowFields();
  const q=(document.getElementById('closingSearch')?.value||'').toLowerCase();
  const s=document.getElementById('closingStatusFilter')?.value||'전체';
  return (state.fac||[]).filter(f => (!q || JSON.stringify(f).toLowerCase().includes(q)) && (s==='전체' || f.closeStatus===s));
}
function renderClosingTable(){
  ensureWorkflowFields();
  const table = document.querySelector('#closingTable tbody'); if(!table) return;
  const rows = closingRows();
  const total = Math.max(1, Math.ceil(rows.length/PAGE));
  state.pages.closing = Math.min(state.pages.closing, total);
  const page = rows.slice((state.pages.closing-1)*PAGE, state.pages.closing*PAGE);
  table.innerHTML = page.map(f => {
    const cls = f.closeStatus === '대사완료' ? 'match-ok' : f.closeStatus === '대사오류/확인필요' ? 'match-warn' : 'match-mid';
    return `<tr><td>${f.inwardRef}</td><td>${f.insured}<br><small>${f.cedant||''}</small></td><td>${f.country}/${f.city}</td><td>${eok(f.premiumEok)}<br><small>${f.currency||''} ${Number(f.premiumOriginal||0).toLocaleString()}</small></td><td class="status-cell"><b class="${cls}">${f.closeStatus}</b><small>${f.reconcileNote||''}</small></td><td>${f.policyNoLinked || '-'}</td><td>${f.closeMonth || '-'}</td><td><div class="closing-actions"><button onclick="markCoreTarget('${f.inwardRef}')">입력대상</button><button onclick="markCoreDone('${f.inwardRef}')">입력완료</button><button onclick="runSingleReconcile('${f.inwardRef}')">대사</button></div></td></tr>`;
  }).join('');
  const pg = document.getElementById('closingPage'); if(pg) pg.innerText = `${state.pages.closing} / ${total}`;
  renderCloseSummary();
}
function pageClosing(d){ state.pages.closing = Math.max(1, (state.pages.closing||1)+d); renderClosingTable(); }
function runSingleReconcile(ref){
  const f = state.fac.find(x=>x.inwardRef===ref); if(!f) return;
  if(!['기간계 입력완료','기간계 입력대상','대사오류/확인필요'].includes(f.closeStatus)) f.closeStatus='기간계 입력완료';
  reconcileManualWithSystem(f.closeMonth || state.closeMeta.closeMonth);
  renderClosingTable(); renderFacTable(); renderDashboard();
}
function renderCloseSummary(){
  ensureWorkflowFields();
  const official = officialContracts().length;
  const manual = manualOpenFac().length;
  const target = manualTargetFac().length;
  const except = manualExceptionFac().length;
  const set = (id,val) => { const el=document.getElementById(id); if(el) el.innerText=val; };
  set('closeOfficialCount', official+'건'); set('closeManualCount', manual+'건'); set('closeTargetCount', target+'건'); set('closeExceptionCount', except+'건');
  const snap = document.getElementById('closeSnapshotBox');
  if(snap){
    const arr = state.closeMeta.snapshots || [];
    snap.innerHTML = arr.length ? arr.slice(0,6).map(s => `<div class="card-item"><b>${s.closeMonth} 마감</b><br>계약 ${s.contractCount}건 · ${s.uploadedAt || '-'}<br><small>${s.sourceFile || '파일명 없음'}</small></div>`).join('') : `아직 월마감 업로드 이력이 없습니다.<br>관리자 메뉴에서 마감월을 지정하고 기간계 계약데이터를 업로드하세요.`;
  }
  renderBasisExplain();
}

// 대시보드를 아키텍처 관점으로 재구성
function renderDashboard(){
  ensureWorkflowFields();
  setMetaText();
  injectV45Controls();
  const renew = renewRows();
  const ppw = ppwRows();
  const topLayer=state.layers.map(l=>({...l,burn:(Number(l.paidUsedEok)+Number(l.outstandingUsedEok))/Math.max(1,Number(l.baseLimitEok)+Number(l.reinstatedLimitEok))*100})).sort((a,b)=>b.burn-a.burn)[0];
  const labels = document.querySelectorAll('#dashboard .kpi span');
  if(labels[0]) labels[0].innerText = '기간계 공식 계약';
  if(labels[1]) labels[1].innerText = '마감 전 수기계약';
  if(labels[2]) labels[2].innerText = '기간계 입력대상';
  if(labels[3]) labels[3].innerText = '대사 확인필요';
  const ems = document.querySelectorAll('#dashboard .kpi em');
  if(ems[0]) ems[0].innerHTML = `<span class="data-badge">기간계 마감데이터</span> ${dataSourceLabel('contract')}`;
  if(ems[1]) ems[1].innerText = '월마감 전 실시간 업무관리';
  if(ems[2]) ems[2].innerText = '기간계 입력/마감 전 확인';
  if(ems[3]) ems[3].innerText = '월마감 후 데이터 대사';
  document.getElementById('kpiRenew').innerText = officialContracts().length + '건';
  document.getElementById('kpiPPW').innerText = manualOpenFac().length + '건';
  document.getElementById('kpiAccident').innerText = manualTargetFac().length + '건';
  document.getElementById('kpiLayer').innerText = manualExceptionFac().length + '건';
  const task = document.getElementById('todayTasks');
  if(task) task.innerHTML = `<div class="card-item" onclick="switchTab('closing')"><b>마감 전 수기계약 관리</b><br>${manualOpenFac().length}건이 기간계 마감 전 업무관리 대상으로 남아 있습니다.</div><div class="card-item" onclick="switchTab('closing')"><b>기간계 입력/대사 확인</b><br>입력대상 ${manualTargetFac().length}건 · 확인필요 ${manualExceptionFac().length}건</div><div class="card-item" onclick="showDashboardList('ppw')"><b>PPW 도래/미수</b><br>${ppw.length}건 담당자 확인 필요</div><div class="card-item" onclick="showDashboardList('renew')"><b>30일 이내 갱신계약</b><br>공식 기간계 기준 ${renew.length}건</div>`;
  const layerBox = document.getElementById('dashboardLayerBars');
  if(layerBox) layerBox.innerHTML=state.layers.slice(0,8).map(l=>{const burn=(l.paidUsedEok+l.outstandingUsedEok)/Math.max(1,l.baseLimitEok+l.reinstatedLimitEok)*100;return `<div class="layer-row"><b>${l.treatyName} / ${l.layer}</b><br>Paid ${eok(l.paidUsedEok)} + OS ${eok(l.outstandingUsedEok)} / 한도 ${eok(l.baseLimitEok+l.reinstatedLimitEok)}<div class="track"><span style="width:${Math.min(100,burn)}%"></span></div></div>`;}).join('');
  renderCloseSummary();
}

// 손익/PML은 기본적으로 기간계 공식계약 기준을 유지하되 선택적으로 운영 기준 조회 가능
function renderPnlCandidates(){
  const q = (document.getElementById('pnlSearch')?.value || '').toLowerCase().trim();
  if(!q || q.length < 2){
    if(document.getElementById('pnlCandidates')) pnlCandidates.innerHTML = `<div class="mini-msg">증권번호, 피보험자, 국가, 보험종목을 2글자 이상 입력해 검색하세요. 현재 기준: ${basisLabel(state.closeMeta.basis)}</div>`;
    renderPnlSelected();
    return;
  }
  const rows = contractsByBasis(state.closeMeta.basis).filter(c => JSON.stringify(c).toLowerCase().includes(q)).slice(0, 30);
  if(document.getElementById('pnlCandidates')) pnlCandidates.innerHTML = rows.map(c => `<div class="candidate"><span><b>${c.policyNo}</b> ${c.sourceBucket==='manual'?sourcePill('manual','마감 전 수기'):sourcePill('official','기간계 공식')}<br><small>${c.insured} / ${c.country} ${c.city} / ${c.line} / 보험료 ${eok(c.premiumEok)}</small></span><button onclick="addPnlContract('${c.policyNo}')">추가</button></div>`).join('') || '<div class="mini-msg">검색 결과가 없습니다.</div>';
  renderPnlSelected();
}

const oldSwitchTabV45 = switchTab;
switchTab = function(tab){
  oldSwitchTabV45(tab);
  injectV45Controls();
  if(tab === 'closing'){ renderClosingTable(); renderCloseSummary(); }
  if(tab === 'dashboard') renderDashboard();
  if(tab === 'contract') renderContractTable();
  if(tab === 'location') setTimeout(renderMap, 100);
  if(tab === 'inward') renderFacTable();
  if(tab === 'admin') renderAdminDataStatus();
};

window.addEventListener('load', () => {
  setTimeout(() => {
    ensureWorkflowFields();
    injectV45Controls();
    renderDashboard();
    renderClosingTable();
    renderCloseSummary();
    renderContractTable();
    try{ renderMap(); }catch(e){}
    saveAll();
  }, 900);
});

/* ===== v45 patch: 손익 선택 계약도 기준별 데이터 사용 ===== */
function renderPnlSelected(){
  const box = document.getElementById('pnlSelectedList');
  if(!box) return;
  const rows = contractsByBasis(state.closeMeta.basis).filter(c => (state.pnlSelected||[]).includes(c.policyNo));
  box.innerHTML = rows.length ? rows.map(c => `<span class="chip">${c.policyNo} · ${String(c.insured||'').slice(0,18)} <button onclick="removePnlContract('${c.policyNo}')">×</button></span>`).join('') : '검색 후 계약을 추가하세요.';
}
function applyPnl(){
  const ids = state.pnlSelected || [];
  const rows = contractsByBasis(state.closeMeta.basis).filter(c => ids.includes(c.policyNo));
  const earned = rows.reduce((a,c)=>a+Number(c.premiumEok||0)*0.92,0);
  const expense = rows.reduce((a,c)=>a+Number(c.premiumEok||0)*0.92*Number(c.expenseRatio||18)/100,0);
  const actualLoss = state.accidents.filter(a=>ids.includes(a.policyNo)).reduce((a,c)=>a+Number(c.grossLossEok||0),0);
  const tsi = rows.reduce((a,c)=>a+Number(c.tsiEok||0),0);
  const pml = tsi * Number(document.getElementById('pmlRate')?.value || 0) / 100;
  const underwriting = earned - expense - actualLoss;
  if(document.getElementById('pnlCount')) pnlCount.innerText = rows.length + '건';
  if(document.getElementById('pnlEarned')) pnlEarned.innerText = eok(earned);
  if(document.getElementById('pnlLoss')) pnlLoss.innerText = eok(actualLoss);
  if(document.getElementById('pnlPML')) pnlPML.innerText = eok(pml);
  if(document.getElementById('pnlDetail')) pnlDetail.innerHTML = `<b>계산 기준</b><br>${basisLabel(state.closeMeta.basis)} 기준으로 선택 계약 ${rows.length}건을 산출합니다. 공식 경영보고는 기간계 마감데이터 기준으로 확정하고, 운영 기준은 마감 전 수기계약까지 포함한 실무 관리용입니다.<br><br>경과보험료: <b>${eok(earned)}</b><br>사업비 추정: <b>${eok(expense)}</b><br>실제 발생손해액: <b>${eok(actualLoss)}</b><br>약식 Underwriting Result: <b>${eok(underwriting)}</b><br>선택 가입금액 합계: <b>${eok(tsi)}</b><br>PML ${document.getElementById('pmlRate')?.value || 0}% 시나리오 예상손해액: <b>${eok(pml)}</b>`;
}

/* ===== v48: 해외계약 Intake menu + cleaner guidance ===== */
(function(){
  const INTAKE_KEY = 'gra_v48_intake';
  state.intake = JSON.parse(localStorage.getItem(INTAKE_KEY) || JSON.stringify(DATA.intake||[]));
  const baseSaveAllV48 = saveAll;
  saveAll = function(){
    baseSaveAllV48();
    localStorage.setItem(INTAKE_KEY, JSON.stringify(state.intake || []));
  };

  const helpText = {
    dashboard: '오늘 처리할 업무, 갱신계약, PPW 도래, 사고데이터, Layer 소진 현황을 요약합니다.',
    contract: '월마감 후 기간계에서 내려받은 공식 계약 데이터를 조회합니다. 보유계약과 공식 통계의 기준입니다.',
    intake: '주재원·브로커·계열사에서 메일로 전달한 초기 정보를 글로벌사업부가 표준 항목으로 정리하는 화면입니다. 정제된 Intake는 UW 검토 또는 임의수재 등록으로 이어집니다.',
    location: '기간계 보유계약과 마감 전 수기관리 계약을 기준에 따라 구분하여 국가·도시별 누적위험을 확인합니다.',
    inward: '기간계 입력 전 신규 수재계약을 실시간으로 관리합니다. 월마감 후 기간계 데이터와 대사해 공식 데이터와 연결합니다.',
    closing: '마감 전 수기관리 데이터와 월마감 후 기간계 공식데이터를 비교하여 반영 여부를 확인합니다.',
    inwardClaim: '수재관리번호 기준으로 클레임을 등록하고, 사고 접수·서베이리포트·처리 이력을 연결합니다.',
    accident: '기간계 사고 마감데이터와 사용자 업로드 사고데이터를 관리합니다.',
    treaty: '재보험 프로그램 구조와 주요 조건을 확인합니다.',
    impact: '사고 발생 시 회수 가능 손해액과 재보험 영향도를 약식으로 검토합니다.',
    layer: '재보험 Layer별 사용액과 잔여한도를 수기 기준으로 관리합니다.',
    reinstatement: '복원보험료 산출을 표준 계산식으로 확인합니다. 실제 적용은 Treaty wording 확인이 필요합니다.',
    pnl: '선택 계약의 손익과 PML 시나리오를 약식으로 분석합니다.',
    docs: '약관, 특약, Slip, Treaty 문서를 등록하고 업무지식으로 축적합니다.',
    copilot: '문서와 계약 정보를 기반으로 검토 초안을 작성하는 AI 활용 예시 화면입니다.',
    admin: '기간계 계약·사고 데이터 업로드, 사용자 승인 등 운영 기준을 관리합니다.'
  };
  function updatePageHelp(tab){
    const el = document.getElementById('pageHelpTooltip');
    if(el) el.textContent = helpText[tab] || '해당 화면의 업무 목적과 사용 기준을 확인합니다.';
  }

  const baseSwitchTabV48 = switchTab;
  switchTab = function(tab){
    baseSwitchTabV48(tab);
    updatePageHelp(tab);
    if(tab === 'intake') renderIntakeTable();
  };

  function todayISO(){ return new Date().toISOString().slice(0,10); }
  function nextIntakeNo(){
    const y = new Date().getFullYear();
    const nums = (state.intake||[]).map(x => String(x.id||'').match(/INT-\d{4}-(\d+)/)).filter(Boolean).map(m => Number(m[1]));
    return `INT-${y}-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3,'0')}`;
  }
  function val(id){ return document.getElementById(id)?.value || ''; }
  function setVal(id, v){ const el=document.getElementById(id); if(el) el.value = v ?? ''; }
  function parseNumberFromText(s){
    const m = String(s||'').match(/([0-9][0-9,]*(?:\.\d+)?)/);
    return m ? Number(m[1].replace(/,/g,'')) : 0;
  }
  function normalizeCurrency(raw){
    const s=String(raw||'').toUpperCase();
    if(s.includes('KRW')||s.includes('원')) return 'KRW';
    if(s.includes('EUR')) return 'EUR';
    if(s.includes('JPY')||s.includes('YEN')) return 'JPY';
    if(s.includes('GBP')) return 'GBP';
    return 'USD';
  }
  function moneyToEok(raw, fallbackCurrency){
    const n = parseNumberFromText(raw);
    if(!n) return 0;
    const cur = normalizeCurrency(raw || fallbackCurrency || 'USD');
    if(n < 100000) return Math.round(n); // 이미 억원 단위로 입력된 경우
    const fx = (DATA.fxRates||{})[cur] || 1;
    return Math.max(1, Math.round(n * fx / 100000000));
  }
  function first(patterns, text){
    for(const p of patterns){ const m = text.match(p); if(m) return String(m[1]||'').trim(); }
    return '';
  }
  function normalizeIntakeLine(s){
    const x = String(s||'').toLowerCase();
    if(x.includes('marine') || x.includes('cargo') || x.includes('해상') || x.includes('적하')) return '해상';
    if(x.includes('liab') || x.includes('casual') || x.includes('배상') || x.includes('특종')) return '특종';
    if(x.includes('engineering') || x.includes('builder') || x.includes('기술')) return '기술보험';
    if(x.includes('package')) return 'Package';
    return '재물';
  }
  function intakeFieldsFromRaw(text){
    const t = text || '';
    const insured = first([/insured\s*[:：\-]\s*([^\n]+)/i,/client\s*[:：\-]\s*([^\n]+)/i,/피보험자\s*[:：\-]\s*([^\n]+)/i,/계열사\s*[:：\-]\s*([^\n]+)/i], t);
    const country = first([/country\s*[:：\-]\s*([^,\n]+)/i,/국가\s*[:：\-]\s*([^,\n]+)/i,/location\s*[:：\-]\s*([^,\n]+)/i], t);
    const city = first([/city\s*[:：\-]\s*([^\n]+)/i,/도시\s*[:：\-]\s*([^\n]+)/i,/location\s*[:：\-]\s*[^,\n]+,\s*([^\n]+)/i], t);
    const lineRaw = first([/line\s*[:：\-]\s*([^\n]+)/i,/class\s*[:：\-]\s*([^\n]+)/i,/보험종목\s*[:：\-]\s*([^\n]+)/i], t);
    const tsiRaw = first([/tsi\s*[:：\-]\s*([^\n]+)/i,/sum insured\s*[:：\-]\s*([^\n]+)/i,/가입금액\s*[:：\-]\s*([^\n]+)/i], t);
    const premRaw = first([/premium\s*[:：\-]\s*([^\n]+)/i,/보험료\s*[:：\-]\s*([^\n]+)/i], t);
    const partner = first([/broker\s*[:：\-]\s*([^\n]+)/i,/fronting\s*[:：\-]\s*([^\n]+)/i,/partner\s*[:：\-]\s*([^\n]+)/i,/파트너\s*[:：\-]\s*([^\n]+)/i], t);
    const due = first([/(?:renewal|due|target date|희망일|갱신)\s*[:：\-]\s*(\d{4}[\-\/]\d{1,2}[\-\/]\d{1,2})/i], t).replaceAll('/','-');
    const lossHistoryRaw = first([/loss history\s*[:：\-]\s*([^\n]+)/i,/claim history\s*[:：\-]\s*([^\n]+)/i,/사고이력\s*[:：\-]\s*([^\n]+)/i], t);
    const lossAmountRaw = first([/claim amount\s*[:：\-]\s*([^\n]+)/i,/loss amount\s*[:：\-]\s*([^\n]+)/i,/사고금액\s*[:：\-]\s*([^\n]+)/i,/손해액\s*[:：\-]\s*([^\n]+)/i], t);
    const lossDesc = first([/claim description\s*[:：\-]\s*([^\n]+)/i,/loss description\s*[:：\-]\s*([^\n]+)/i,/incident\s*[:：\-]\s*([^\n]+)/i,/사고내용\s*[:：\-]\s*([^\n]+)/i], t);
    const currency = normalizeCurrency(premRaw || tsiRaw);
    const lossAmount = moneyToEok(lossAmountRaw, currency);
    return {
      insured, country, city, line: normalizeIntakeLine(lineRaw),
      tsiEok: moneyToEok(tsiRaw, currency), premiumOriginal: parseNumberFromText(premRaw), currency, partner, due,
      lossHistory: lossHistoryRaw ? (/no|none|없/i.test(lossHistoryRaw) ? '없음' : '있음') : '확인필요',
      lossAmountEok: lossAmount,
      lossDesc,
      memo: ['원문 기반 기본정제 결과입니다.', !lossHistoryRaw ? '사고이력 확인 필요' : '', !partner ? '현지 파트너 확인 필요' : ''].filter(Boolean).join('\n')
    };
  }

  window.readIntakeFile = async function(file){
    if(!file) return;
    const box = document.getElementById('normalizeResult');
    try{
      if(file.type === 'application/pdf' && typeof pdfjsLib !== 'undefined'){
        const ab = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({data:ab}).promise;
        let text='';
        for(let i=1;i<=Math.min(pdf.numPages,5);i++){
          const page = await pdf.getPage(i);
          const c = await page.getTextContent();
          text += c.items.map(it=>it.str).join(' ') + '\n';
        }
        setVal('rawIntakeText', text.trim());
      }else{
        setVal('rawIntakeText', await file.text());
      }
      if(box) box.textContent = `${file.name} 내용을 불러왔습니다. [기본정제]를 눌러 표준 항목으로 정리하세요.`;
    }catch(e){
      if(box) box.textContent = '파일 내용을 읽지 못했습니다. 메일 본문 또는 Slip 주요조건을 직접 붙여넣으세요.';
    }
  };

  window.loadSampleIntake = function(){
    setVal('rawIntakeText', `Subject: New overseas property opportunity\nInsured: Hanwha Qcells Georgia Plant\nCountry: USA\nCity: Georgia\nLine: Property Package\nTSI: USD 380,000,000\nPremium: USD 4,200,000\nBroker: Local Broker A / Fronting Co.\nRenewal: 2026-07-20\nLoss History: Yes, one fire incident in 2023\nClaim Amount: USD 1,200,000\nClaim Description: Minor electrical fire at auxiliary facility. Repairs completed and prevention measures implemented.`);
  };
  window.normalizeIntake = function(){
    const raw = val('rawIntakeText');
    if(!raw.trim()){ const box=document.getElementById('normalizeResult'); if(box) box.textContent='메일 본문 또는 Slip 주요조건을 먼저 입력하세요.'; return; }
    const f = intakeFieldsFromRaw(raw);
    setVal('intakeInsured', f.insured);
    setVal('intakeCountry', f.country);
    setVal('intakeCity', f.city);
    setVal('intakeLine', f.line);
    setVal('intakeTsi', f.tsiEok || '');
    setVal('intakePremiumOriginal', f.premiumOriginal || '');
    setVal('intakeCurrency', f.currency || 'USD');
    setVal('intakePartner', f.partner);
    setVal('intakeDue', f.due);
    setVal('intakeLossHistory', f.lossHistory);
    setVal('intakeLossAmount', f.lossAmountEok || 0);
    setVal('intakeLossDesc', f.lossDesc);
    setVal('intakeMemo', f.memo);
    const filled = ['insured','country','city','tsiEok','premiumOriginal','partner','due','lossHistory'].filter(k=>f[k]).length;
    const confidence = Math.min(95, 30 + filled*8);
    const box=document.getElementById('normalizeResult');
    if(box) box.textContent = `기본정제 완료 · 신뢰도 ${confidence}%\n피보험자: ${f.insured||'확인필요'}\n소재지: ${f.country||'확인필요'} / ${f.city||'확인필요'}\n보험종목: ${f.line}\n가입금액: ${f.tsiEok?eok(f.tsiEok):'확인필요'}\n사고이력: ${f.lossHistory} / 사고금액: ${f.lossAmountEok?eok(f.lossAmountEok):'확인필요'}\n\n정제 결과를 원문과 대조한 뒤 저장하세요.`;
  };

  function currentIntakePayload(){
    const cur = val('intakeCurrency') || 'USD';
    const premOriginal = Number(val('intakePremiumOriginal') || 0);
    const fx = (DATA.fxRates||{})[cur] || 1;
    return {
      id: val('intakeEditId') || nextIntakeNo(),
      source: val('intakeSource'), owner: val('intakeOwner'),
      insured: val('intakeInsured').trim(), country: val('intakeCountry').trim(), city: val('intakeCity').trim(), line: val('intakeLine'),
      tsiEok: Number(val('intakeTsi') || 0), premiumOriginal: premOriginal, currency: cur, fxRate: fx,
      premiumEok: premOriginal ? Math.max(1, Math.round(premOriginal * fx / 100000000)) : 0,
      partner: val('intakePartner').trim(), due: val('intakeDue'), stage: val('intakeStage'),
      lossHistory: val('intakeLossHistory'), lossAmountEok: Number(val('intakeLossAmount') || 0), lossDesc: val('intakeLossDesc').trim(),
      memo: val('intakeMemo').trim(), rawText: val('rawIntakeText').slice(0,5000),
      createdAt: todayISO(), updatedAt: new Date().toISOString().slice(0,16).replace('T',' '), createdBy: currentUser()
    };
  }
  window.saveIntakeEntry = function(){
    const row = currentIntakePayload();
    if(!row.insured || !row.country){ const msg=document.getElementById('intakeMsg'); if(msg) msg.textContent='피보험자와 국가는 필수입니다.'; return; }
    const idx = state.intake.findIndex(x=>x.id===row.id);
    if(idx >= 0){ state.intake[idx] = {...state.intake[idx], ...row}; }
    else { state.intake.unshift(row); }
    saveAll();
    const msg=document.getElementById('intakeMsg'); if(msg) msg.textContent=`${row.id} 저장 완료`;
    renderIntakeTable();
    clearIntakeForm(false);
  };
  window.clearIntakeForm = function(clearRaw=true){
    ['intakeEditId','intakeInsured','intakeCountry','intakeCity','intakeTsi','intakePremiumOriginal','intakePartner','intakeDue','intakeLossAmount','intakeLossDesc','intakeMemo'].forEach(id=>setVal(id,''));
    setVal('intakeLine','재물'); setVal('intakeCurrency','USD'); setVal('intakeLossHistory','확인필요'); setVal('intakeStage','접수'); setVal('intakeOwner','글로벌사업부'); setVal('intakeSource','주재원 메일');
    if(clearRaw) setVal('rawIntakeText','');
    const box=document.getElementById('normalizeResult'); if(box) box.textContent='정제 결과가 여기에 표시됩니다.';
  };
  window.editIntake = function(id){
    const x = (state.intake||[]).find(r=>r.id===id); if(!x) return;
    setVal('intakeEditId', x.id); setVal('intakeSource', x.source); setVal('intakeOwner', x.owner); setVal('intakeInsured', x.insured); setVal('intakeCountry', x.country); setVal('intakeCity', x.city); setVal('intakeLine', x.line); setVal('intakeTsi', x.tsiEok); setVal('intakePremiumOriginal', x.premiumOriginal); setVal('intakeCurrency', x.currency); setVal('intakePartner', x.partner); setVal('intakeDue', x.due); setVal('intakeStage', x.stage); setVal('intakeLossHistory', x.lossHistory); setVal('intakeLossAmount', x.lossAmountEok); setVal('intakeLossDesc', x.lossDesc); setVal('intakeMemo', x.memo); setVal('rawIntakeText', x.rawText || '');
    const msg=document.getElementById('intakeMsg'); if(msg) msg.textContent=`${id} 수정 중`;
    window.scrollTo({top:0, behavior:'smooth'});
  };
  window.deleteSingleIntake = function(id){
    if(!confirm(`${id}를 삭제할까요?`)) return;
    state.intake = (state.intake||[]).filter(x=>x.id!==id); saveAll(); renderIntakeTable();
  };
  window.deleteSelectedIntakes = function(){
    const ids=[...document.querySelectorAll('.intake-check:checked')].map(x=>x.value);
    if(!ids.length){ alert('삭제할 Intake를 선택하세요.'); return; }
    if(!confirm(`${ids.length}건을 삭제할까요?`)) return;
    state.intake = (state.intake||[]).filter(x=>!ids.includes(x.id)); saveAll(); renderIntakeTable();
  };
  window.sendCurrentIntakeToFac = function(){
    const row = currentIntakePayload();
    if(!row.insured || !row.country){ alert('먼저 접수 항목을 입력하거나 목록에서 수정할 건을 선택하세요.'); return; }
    setVal('facInsured', row.insured); setVal('facCountry', row.country); setVal('facCity', row.city); setVal('facLine', row.line==='재물'?'Package':row.line==='특종'?'배상책임':row.line==='해상'?'해상적하':row.line); setVal('facTsi', row.tsiEok); setVal('facPremiumOriginal', row.premiumOriginal); setVal('facCurrency', row.currency); setVal('facCedant', row.partner); setVal('facPPW', row.due); setVal('facOwner', currentUser());
    setVal('facSlipSummary', `${row.source} / ${row.partner || '파트너 확인필요'} / 사고이력 ${row.lossHistory}`);
    setVal('facMemo', [`접수번호: ${row.id}`, row.memo, row.lossDesc ? `사고내용: ${row.lossDesc}` : '', row.lossAmountEok ? `사고금액: ${eok(row.lossAmountEok)}` : ''].filter(Boolean).join('\n'));
    switchTab('inward');
  };
  window.sendIntakeToFac = function(id){ editIntake(id); sendCurrentIntakeToFac(); };

  window.renderIntakeTable = function(){
    const q=(val('intakeSearch')||'').toLowerCase(); const st=val('intakeStageFilter')||'전체';
    const rows=(state.intake||[]).filter(x=>{
      const hay=[x.id,x.insured,x.country,x.city,x.line,x.partner,x.owner,x.stage].join(' ').toLowerCase();
      return (!q || hay.includes(q)) && (st==='전체' || x.stage===st);
    });
    const tb=document.querySelector('#intakeTable tbody'); if(!tb) return;
    tb.innerHTML = rows.map(x=>{
      const pillCls = x.stage==='기간계 입력대상' ? 'ok' : x.stage==='보류' ? 'gray' : x.stage==='UW 검토' ? 'warn' : '';
      return `<tr><td><input class="intake-check small-check" type="checkbox" value="${x.id}"/></td><td><button class="link-btn" onclick="editIntake('${x.id}')">${x.id}</button><br><small>${x.source||'-'}</small></td><td>${x.insured||'-'}<br><small>${x.partner||''}</small></td><td>${x.country||'-'} / ${x.city||'-'}</td><td>${x.line||'-'}</td><td>${eok(x.tsiEok)}<br><small>${x.currency||''} ${Number(x.premiumOriginal||0).toLocaleString()}</small></td><td>${x.lossHistory||'확인필요'}<br><small>${x.lossAmountEok?eok(x.lossAmountEok):''}</small></td><td><span class="status-pill ${pillCls}">${x.stage||'접수'}</span><br><small>${x.owner||'글로벌사업부'}</small></td><td><div class="inline-actions"><button onclick="editIntake('${x.id}')">수정</button><button onclick="sendIntakeToFac('${x.id}')">수재등록</button><button class="danger-btn" onclick="deleteSingleIntake('${x.id}')">삭제</button></div></td></tr>`;
    }).join('');
    const cnt=document.getElementById('intakeCount'); if(cnt) cnt.textContent = `총 ${rows.length}건 · 마감 전 검토대상 초기정보`;
  };

  window.addEventListener('load', ()=>{ updatePageHelp('dashboard'); renderIntakeTable(); });
})();

/* ===== v49: v45 base + Intake only, simplified source model ===== */
(function(){
  const V49 = true;
  function q(id){ return document.getElementById(id); }
  function safeCall(fn){ try{ fn && fn(); }catch(e){ console.warn('[v49 patch]', e); } }
  function simpleStatus(){
    (state.fac||[]).forEach(f=>{
      f.closeStatus = f.closeStatus || '수기등록';
      f.tempDataType = '마감 전 수기관리';
    });
  }
  function getCoord(country, city){
    const pool = (allContracts ? allContracts() : DATA.contracts || []).concat(DATA.contracts||[]);
    const found = pool.find(c => String(c.country)===String(country) && String(c.city)===String(city) && c.lat && c.lng);
    if(found) return {lat:found.lat, lng:found.lng};
    const byCountry = {
      '미국':[38,-96], 'USA':[38,-96], '한국':[36,127.5], '일본':[36,138], '인도':[22,78], '베트남':[16,107], '인도네시아':[-2,118], '중국':[35,103], '독일':[51,10], '태국':[15,101]
    };
    const v = byCountry[country] || [20,105];
    return {lat:v[0], lng:v[1]};
  }
  function facAsRiskContracts(){
    simpleStatus();
    return (state.fac||[]).map(f=>{
      const c = getCoord(f.country, f.city);
      return {
        policyNo:f.inwardRef,
        inwardRef:f.inwardRef,
        insured:f.insured,
        country:f.country,
        city:f.city,
        line:f.line,
        tsiEok:Number(f.tsiEok||0),
        premiumEok:Number(f.premiumEok||0),
        renewalDate:f.ppwDate || '',
        sourceType:'마감 전 수기관리',
        sourceBucket:'manual',
        lat:f.lat || c.lat,
        lng:f.lng || c.lng
      };
    });
  }
  function officialInwardContracts(){
    return (allContracts ? allContracts() : DATA.contracts || []).map(c=>({
      ...c, sourceType:'기간계 수재계약', sourceBucket:'official'
    }));
  }
  window.allRiskContracts = function(){
    return officialInwardContracts().concat(facAsRiskContracts());
  };
  window.contractsByBasis = function(){ return officialInwardContracts(); };
  window.injectV45Controls = function(){
    document.querySelectorAll('.basis-bar,.architecture-mini').forEach(el=>el.remove());
    const inwardNotice = document.querySelector('#inward .notice');
    if(inwardNotice) inwardNotice.innerHTML = '기간계 입력 전 신규 해외수재 계약을 실시간으로 관리하는 화면입니다. 등록 후 PPW·클레임·소재지 누적위험 관리에 활용됩니다.';
  };

  window.renewRows = function(){
    return officialInwardContracts().filter(c=>dayDiff(c.renewalDate)>=0&&dayDiff(c.renewalDate)<=30).sort((a,b)=>dayDiff(a.renewalDate)-dayDiff(b.renewalDate));
  };
  window.contractFiltered = function(){
    const qv=(q('contractSearch')?.value||'').toLowerCase();
    const s=q('contractLineFilter')?.value||'전체';
    return officialInwardContracts().filter(c=>(!qv||JSON.stringify(c).toLowerCase().includes(qv))&&(s==='전체'||c.line===s));
  };
  window.renderContractTable = function(){
    setMetaText();
    const rows=contractFiltered(), total=Math.max(1,Math.ceil(rows.length/PAGE));
    state.pages.contract=Math.min(state.pages.contract,total);
    const page=rows.slice((state.pages.contract-1)*PAGE,state.pages.contract*PAGE);
    const cc = q('contractCount');
    if(cc) cc.innerHTML=`검색 결과 ${rows.length}건 · 월마감 후 기간계에서 내려받은 해외수재 계약 기준`;
    const tb = document.querySelector('#contractTable tbody');
    if(tb) tb.innerHTML=page.map(c=>`<tr><td>${c.policyNo}<br><span class="source-pill official">기간계 수재계약</span></td><td>${c.insured||''}</td><td>${c.country||''}/${c.city||''}</td><td>${c.line||''}</td><td>${eok(c.tsiEok)}</td><td>${eok(c.premiumEok)}</td><td>${c.renewalDate||'-'}</td></tr>`).join('');
    const pg=q('contractPage'); if(pg) pg.innerText=`${state.pages.contract} / ${total}`;
  };

  window.renderDashboard = function(){
    simpleStatus();
    setMetaText();
    const renew = renewRows();
    const ppw = ppwRows();
    const accidents = state.accidents || [];
    const topLayer=state.layers.map(l=>({...l,burn:(Number(l.paidUsedEok)+Number(l.outstandingUsedEok))/Math.max(1,Number(l.baseLimitEok)+Number(l.reinstatedLimitEok))*100})).sort((a,b)=>b.burn-a.burn)[0];
    const labels = document.querySelectorAll('#dashboard .kpi span');
    if(labels[0]) labels[0].innerText = '30일 이내 갱신계약';
    if(labels[1]) labels[1].innerText = 'PPW 도래/미수';
    if(labels[2]) labels[2].innerText = '사고계약 데이터';
    if(labels[3]) labels[3].innerText = '최고 Layer 소진율';
    const ems = document.querySelectorAll('#dashboard .kpi em');
    if(ems[0]) ems[0].innerHTML = `<span class="data-badge">기간계 수재계약</span> ${dataSourceLabel('contract')}`;
    if(ems[1]) ems[1].innerText = '수기 입력 수재계약 기준';
    if(ems[2]) ems[2].innerHTML = `<span class="data-badge">기간계 사고데이터</span> ${dataSourceLabel('accident')}`;
    if(ems[3]) ems[3].innerText = '재보험 프로그램 수기관리 기준';
    q('kpiRenew') && (q('kpiRenew').innerText = renew.length + '건');
    q('kpiPPW') && (q('kpiPPW').innerText = ppw.length + '건');
    q('kpiAccident') && (q('kpiAccident').innerText = accidents.length + '건');
    q('kpiLayer') && (q('kpiLayer').innerText = topLayer?Math.round(topLayer.burn)+'%':'-');
    const kpis = document.querySelectorAll('#dashboard .kpi');
    if(kpis[0]) kpis[0].onclick = () => showDashboardList('renew');
    if(kpis[1]) kpis[1].onclick = () => showDashboardList('ppw');
    if(kpis[2]) kpis[2].onclick = () => switchTab('accident');
    if(kpis[3]) kpis[3].onclick = () => switchTab('layer');
    const task = q('todayTasks');
    if(task) task.innerHTML = `<div class="card-item" onclick="showDashboardList('renew')"><b>30일 이내 갱신계약</b><br>${renew.length}건 확인 필요</div><div class="card-item" onclick="showDashboardList('ppw')"><b>PPW 도래/미수</b><br>${ppw.length}건 담당자 확인 필요</div><div class="card-item" onclick="switchTab('accident')"><b>사고계약 데이터</b><br>${accidents.length}건 재보험 영향분석 원천</div>`;
    const layerBox = q('dashboardLayerBars');
    if(layerBox) layerBox.innerHTML=state.layers.slice(0,8).map(l=>{const burn=(l.paidUsedEok+l.outstandingUsedEok)/Math.max(1,l.baseLimitEok+l.reinstatedLimitEok)*100;return `<div class="layer-row"><b>${l.treatyName} / ${l.layer}</b><br>Paid ${eok(l.paidUsedEok)} + OS ${eok(l.outstandingUsedEok)} / 한도 ${eok(l.baseLimitEok+l.reinstatedLimitEok)}<div class="track"><span style="width:${Math.min(100,burn)}%"></span></div></div>`;}).join('');
    const dashList = q('dashboardList');
    if(dashList && !dashList.innerHTML.trim()) dashList.innerHTML = '';
  };

  window.showDashboardList = function(kind){
    const rows=kind==='renew'?renewRows():ppwRows();
    let html='<h3>'+(kind==='renew'?'30일 이내 갱신계약':'PPW 도래/미수 목록')+'</h3><div class="table-scroll"><table><thead><tr>';
    if(kind==='renew')html+='<th>증권번호</th><th>피보험자</th><th>보험종목</th><th>만기일</th><th>D-Day</th>';
    else html+='<th>수재관리번호</th><th>피보험자</th><th>PPW</th><th>미수상태</th><th>담당자</th>';
    html+='</tr></thead><tbody>';
    html+=rows.slice(0,20).map(r=>kind==='renew'?`<tr><td>${r.policyNo}</td><td>${r.insured}</td><td>${r.line}</td><td>${r.renewalDate}</td><td>D-${dayDiff(r.renewalDate)}</td></tr>`:`<tr><td>${r.inwardRef}</td><td>${r.insured}</td><td>${r.ppwDate}</td><td>${r.receivableStatus}</td><td>${r.receivableOwner||r.owner||''}</td></tr>`).join('');
    html+='</tbody></table></div>';
    q('dashboardList').innerHTML=html;
  };

  window.renderFacTable = function(){
    simpleStatus();
    const rows=facFiltered();
    const total=Math.max(1,Math.ceil(rows.length/PAGE));
    state.pages.fac=Math.min(state.pages.fac,total);
    const page=rows.slice((state.pages.fac-1)*PAGE,state.pages.fac*PAGE);
    q('facCount') && (q('facCount').innerText=`검색 결과 ${rows.length}건 / 기간계 입력 전 실시간 수기관리 대상`);
    const head=document.querySelector('#facTable thead tr');
    if(head) head.innerHTML = `<th><input type="checkbox" onclick="toggleChecks('.fac-check',this.checked)"/></th><th>수재관리번호</th><th>피보험자</th><th>국가/도시</th><th>보험종목</th><th>보험료</th><th>PPW</th><th>미수상태</th><th>처리</th>`;
    const tb=document.querySelector('#facTable tbody');
    if(tb) tb.innerHTML=page.map(f=>`<tr><td><input class="fac-check small-check" type="checkbox" value="${f.inwardRef}"/></td><td><button class="link-btn" onclick="showFac('${f.inwardRef}')">${f.inwardRef}</button></td><td>${f.insured}</td><td>${f.country}/${f.city}</td><td>${f.line}</td><td>${eok(f.premiumEok)}<br><small>${f.currency} / FX ${f.fxRate}</small></td><td>${f.ppwDate||'-'}</td><td>${f.receivableStatus||'확인중'}</td><td><div class="inline-actions"><button onclick="showFac('${f.inwardRef}')">수정</button><button onclick="startClaimFromFac('${f.inwardRef}')">클레임</button></div></td></tr>`).join('');
    q('facPage') && (q('facPage').innerText=`${state.pages.fac} / ${total}`);
  };

  window.renderMap = function(){
    const asOf = q('riskAsOf');
    if(asOf) asOf.innerText = `해외수재계약 기준 / 기간계 수재계약 + 마감 전 수기계약 / 단위: 억원`;
    const regs = regionAgg();
    const cards = q('regionCards');
    if(cards) cards.innerHTML = regs.slice(0,12).map(r => `<div class="region-card" onclick="selectRegion('${r.country}','${r.city}')"><b>${r.country} / ${r.city}</b><br>누적 가입금액 ${eok(r.tsi)} · 계약 ${r.cnt}건</div>`).join('') || '<div class="mini-msg">표시할 해외수재 계약이 없습니다.</div>';
    if(typeof L === 'undefined'){
      const el = q('leafletMap');
      if(el) el.innerHTML = '<div class="result-box">지도 라이브러리를 불러오지 못했습니다.</div>';
      if(regs[0]) selectRegion(regs[0].country, regs[0].city);
      return;
    }
    if(!leafletMapV36){
      leafletMapV36 = L.map('leafletMap', {scrollWheelZoom:true}).setView([25, 105], 2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:18, attribution:'&copy; OpenStreetMap'}).addTo(leafletMapV36);
    }
    if(leafletLayerV36) leafletLayerV36.remove();
    leafletLayerV36 = L.layerGroup().addTo(leafletMapV36);
    regs.forEach(r => {
      const level = r.tsi > 120000 ? 'high' : (r.tsi < 45000 ? 'low' : '');
      const icon = L.divIcon({className:'risk-marker', html:`<div class="risk-pin ${level}">${Math.round(r.tsi/1000)}k</div>`, iconSize:[36,36], iconAnchor:[18,18]});
      L.marker([r.lat, r.lng], {icon}).addTo(leafletLayerV36).bindPopup(`<b>${r.country} / ${r.city}</b><br>누적가입금액 ${eok(r.tsi)}<br>계약 ${r.cnt}건`).on('click', () => selectRegion(r.country, r.city));
    });
    setTimeout(()=>leafletMapV36.invalidateSize(),100);
    if(regs[0]) selectRegion(regs[0].country, regs[0].city);
  };
  window.regionRows = function(){
    const qv=(q('regionSearch')?.value||'').toLowerCase();
    if(!state.selectedRegion)return [];
    return allRiskContracts().filter(c=>c.country===state.selectedRegion.country&&c.city===state.selectedRegion.city&&(!qv||JSON.stringify(c).toLowerCase().includes(qv)));
  };
  window.renderRegionDrill = function(){
    const rows=regionRows(), total=Math.max(1,Math.ceil(rows.length/PAGE));
    state.pages.region=Math.min(state.pages.region,total);
    const page=rows.slice((state.pages.region-1)*PAGE,state.pages.region*PAGE);
    const info=q('regionInfo');
    if(info) info.innerText=state.selectedRegion?`${state.selectedRegion.country}/${state.selectedRegion.city} · ${rows.length}건`:'지도 또는 우측 지역 카드를 선택하세요.';
    const tb=document.querySelector('#regionTable tbody');
    if(tb) tb.innerHTML=page.map(c=>`<tr><td>${c.policyNo}</td><td>${c.insured}</td><td>${c.line}</td><td>${eok(c.tsiEok)}</td><td>${c.sourceBucket==='manual'?'<span class="source-pill manual">마감 전 수기</span>':'<span class="source-pill official">기간계 수재계약</span>'}</td></tr>`).join('');
    q('regionPage') && (q('regionPage').innerText=`${state.pages.region} / ${total}`);
  };

  window.renderAccidentTable = function(){
    const rows=accFiltered ? accFiltered() : (state.accidents||[]);
    const total=Math.max(1,Math.ceil(rows.length/PAGE));
    state.pages.acc=Math.min(state.pages.acc,total);
    const page=rows.slice((state.pages.acc-1)*PAGE,state.pages.acc*PAGE);
    q('accCount') && (q('accCount').innerText=`검색 결과 ${rows.length}건 / 기간계 사고계약 데이터는 재보험 영향분석 원천입니다.`);
    const tb=document.querySelector('#accTable tbody');
    if(tb) tb.innerHTML=page.map(a=>`<tr><td><input class="acc-check small-check" type="checkbox" value="${a.claimNo}" ${a.sourceType==='기간계 데이터'?'disabled':''}/></td><td>${a.claimNo}</td><td>${a.policyNo}</td><td>${a.insured}</td><td>${a.cause}</td><td>${eok(a.paidLossEok)}</td><td>${eok(a.outstandingLossEok)}</td><td>${eok(a.grossLossEok)}</td><td>${a.status}</td><td>${a.sourceType==='기간계 데이터'?'<span class="source-pill official">기간계 사고</span>':a.sourceType}</td></tr>`).join('');
    q('accPage') && (q('accPage').innerText=`${state.pages.acc} / ${total}`);
  };

  window.importSystemContractsFromFile = async function(){
    const file = q('adminContractFile')?.files?.[0];
    const rows = await readRowsFromWorkbookFile(file, '01_Contracts_System', 'adminContractMsg');
    if(!validateRows(rows, ['증권번호','피보험자','국가','도시','보험종목'], 'adminContractMsg')) return;
    const mapped = rows.map(normalizeSystemContract).filter(r => r.policyNo);
    state.contracts = mapped;
    state.meta.contractUploadAt = new Date().toISOString().slice(0,16).replace('T',' ');
    state.meta.contractSourceFile = file.name;
    saveAll();
    q('adminContractMsg').innerHTML = `<span class="doc-index-ok">${mapped.length}건 기간계 수재계약 데이터 반영 완료</span><br>원천 파일: ${file.name}`;
    renderContractTable(); renderMap(); renderDashboard(); setMetaText();
  };
  window.importSystemAccidentsFromFile = async function(){
    const file = q('adminAccidentFile')?.files?.[0];
    const rows = await readRowsFromWorkbookFile(file, '03_Accident_Data_All', 'adminAccidentMsg');
    if(!validateRows(rows, ['사고번호','증권번호','피보험자','사고유형'], 'adminAccidentMsg')) return;
    const mapped = rows.map(normalizeSystemAccident).filter(r => r.claimNo);
    const manualAndExcel = state.accidents.filter(a => a.sourceType !== '기간계 데이터');
    state.accidents = mapped.concat(manualAndExcel);
    state.meta.accidentUploadAt = new Date().toISOString().slice(0,16).replace('T',' ');
    state.meta.accidentSourceFile = file.name;
    saveAll();
    q('adminAccidentMsg').innerHTML = `<span class="doc-index-ok">${mapped.length}건 기간계 사고계약 데이터 반영 완료</span><br>원천 파일: ${file.name}<br>수기등록/엑셀 업로드 사고데이터는 유지됩니다.`;
    renderAccidentTable(); renderDashboard(); setMetaText();
  };

  window.renderDocs = function(){
    setMetaText();
    const tb=document.querySelector('#docTable tbody');
    if(tb) tb.innerHTML=state.docs.map(d=>`<tr><td><input class="doc-check small-check" type="checkbox" value="${d.docId}" ${d.sourceType==='기본제공'?'disabled':''}></td><td>${d.docId}</td><td>${d.title}</td><td>${d.type}</td><td>${d.keywords}</td><td>${d.file?'<a href="'+d.file+'" target="_blank">PDF</a>':'사용자 업로드'}</td><td>${d.sourceType}</td></tr>`).join('');
    const sel=q('docAiSelect');
    if(sel) sel.innerHTML = state.docs.map(d=>`<option value="${d.docId}">${d.title}</option>`).join('');
  };
  function selectedDoc(){ return state.docs.find(d=>d.docId === q('docAiSelect')?.value) || state.docs[0]; }
  function docText(d){ return (d?.text || d?.summary || d?.keywords || d?.title || '').toString(); }
  window.summarizeSelectedDoc = function(){
    const d=selectedDoc(); if(!d) return;
    const text=docText(d);
    const lines = text.split(/[.\n]/).map(x=>x.trim()).filter(Boolean).slice(0,4);
    q('docAiResult').innerHTML = `<b>${d.title} 요약 초안</b><br>• 문서구분: ${d.type || '-'}<br>• 핵심 키워드: ${d.keywords || '-'}<br>• 주요 내용: ${lines.length?lines.join('<br>• '):'문서 원문 인덱싱 후 생성형 AI 요약이 가능합니다.'}<br><br><span class="muted">※ 시연용 요약입니다. 실제 구축 시 폐쇄형 생성형 AI/RAG로 원문 기반 요약을 제공합니다.</span>`;
  };
  window.translateSelectedDoc = function(){
    const d=selectedDoc(); if(!d) return;
    const lang=q('docTranslateLang')?.value || 'ko';
    const text=docText(d).slice(0,900);
    const title = lang==='ko' ? '한국어 번역 초안' : 'English translation draft';
    const body = lang==='ko'
      ? `이 문서는 ${d.type||'업무 문서'}에 해당하며, 주요 검토 키워드는 ${d.keywords||'문서 등록 후 확인 필요'}입니다. 원문 주요 내용은 담보조건, 적용범위, 면책 또는 특약 조건을 확인하기 위한 자료로 활용됩니다.`
      : `This document is classified as ${d.type||'business document'}. Key review terms include ${d.keywords||'to be indexed after upload'}. The document should be reviewed for coverage scope, exclusions, endorsements, and applicable treaty conditions.`;
    q('docAiResult').innerHTML = `<b>${title}</b><br>${body}<br><br><details><summary>원문 일부</summary><div class="result-box">${text || '원문 텍스트 인덱싱 필요'}</div></details><span class="muted">※ 시연용 번역입니다. 실제 구축 시 폐쇄형 생성형 AI 번역과 원문 대조 기능을 제공합니다.</span>`;
  };

  const helpTextV49 = {
    dashboard:'오늘 처리할 갱신, PPW, 사고계약, 재보험 Layer 현황을 간단히 확인합니다.',
    intake:'메일 또는 Slip으로 받은 해외계약 초기정보를 글로벌사업부가 표준 항목으로 등록합니다.',
    inward:'기간계 입력 전 신규 해외수재 계약을 실시간으로 수기 관리합니다.',
    contract:'월마감 후 기간계에서 내려받은 해외수재 계약을 공식 기준으로 조회합니다.',
    location:'해외수재 계약의 국가·도시별 누적 가입금액을 확인합니다.',
    inwardClaim:'수재계약에 연결된 클레임을 등록하고 처리 이력을 관리합니다.',
    accident:'기간계에서 내려받은 사고계약 데이터를 별도로 관리합니다. 국내 원수계약 사고도 재보험에 영향을 줄 수 있으므로 포함합니다.',
    treaty:'재보험 프로그램과 주요 Layer 조건을 확인합니다.',
    impact:'사고계약 데이터 또는 사고 시나리오를 기준으로 재보험 영향 여부를 검토합니다.',
    layer:'재보험 Layer별 사용액과 잔여한도를 관리합니다.',
    reinstatement:'복원보험료를 표준 산식으로 약식 계산합니다.',
    docs:'약관·특약·Slip·Treaty 문서를 등록하고 요약·번역 초안을 확인합니다.',
    admin:'기간계 수재계약 데이터와 사고계약 데이터를 업로드합니다.'
  };
  function updateHelp(tab){ const el=q('pageHelpTooltip'); if(el) el.textContent = helpTextV49[tab] || ''; }

  const prevSwitch = window.switchTab;
  window.switchTab = function(tab){
    if(tab === 'closing' || tab === 'pnl' || tab === 'copilot') tab = 'dashboard';
    prevSwitch(tab);
    updateHelp(tab);
    safeCall(()=>injectV45Controls());
    if(tab==='dashboard') renderDashboard();
    if(tab==='contract') renderContractTable();
    if(tab==='location') setTimeout(renderMap,100);
    if(tab==='inward') { renderFacTable(); renderPPW(); }
    if(tab==='accident') renderAccidentTable();
    if(tab==='docs') renderDocs();
    if(tab==='admin') renderAdminDataStatus();
  };

  function cleanStaticText(){
    document.querySelector('[data-tab="contract"]') && (document.querySelector('[data-tab="contract"]').textContent='출재·수재계약 조회');
    document.querySelector('[data-tab="accident"]') && (document.querySelector('[data-tab="accident"]').textContent='사고계약 데이터');
    document.querySelector('[data-tab="docs"]') && (document.querySelector('[data-tab="docs"]').textContent='약관·특약 문서관리');
    document.querySelectorAll('[data-tab="closing"],[data-tab="pnl"],[data-tab="copilot"]').forEach(x=>x.remove());
    q('pageTitle') && (q('pageTitle').textContent = document.querySelector('nav button.active')?.textContent || '대시보드');
  }

  window.addEventListener('load',()=>{
    setTimeout(()=>{
      cleanStaticText();
      injectV45Controls();
      updateHelp('dashboard');
      safeCall(renderDashboard); safeCall(renderContractTable); safeCall(renderMap); safeCall(renderFacTable); safeCall(renderAccidentTable); safeCall(renderDocs); safeCall(renderAdminDataStatus);
      saveAll();
    },1300);
  });
})();

/* ===== v50: 오퍼→계약 진행관리→기간계 수재계약 PPW 구조 정리 ===== */
(function(){
  const RECEIVABLE_KEY = 'gra_v50_contract_receivables';
  const FAC_WORKFLOW_KEY = 'gra_v50_fac_workflow';
  const statusOptions = ['접수','검토중','UW 검토요청','조건협의','수재확정','인수거절','기간계 입력완료'];
  const q = (id)=>document.getElementById(id);
  const safe = (fn)=>{try{fn&&fn();}catch(e){console.warn('[v50]',e);}};
  state.systemReceivables = JSON.parse(localStorage.getItem(RECEIVABLE_KEY) || '{}');

  const baseSaveAllV50 = saveAll;
  saveAll = function(){
    baseSaveAllV50();
    localStorage.setItem(RECEIVABLE_KEY, JSON.stringify(state.systemReceivables || {}));
    localStorage.setItem(FAC_WORKFLOW_KEY, JSON.stringify((state.fac||[]).map(f=>({
      inwardRef:f.inwardRef,intakeNo:f.intakeNo,reviewStatus:f.reviewStatus,reviewOwner:f.reviewOwner,requestSource:f.requestSource,confirmNote:f.confirmNote,statusHistory:f.statusHistory
    }))));
  };

  function officialInward(){
    const rows = (typeof allContracts === 'function' ? allContracts() : (state.contracts&&state.contracts.length?state.contracts:DATA.contracts)) || [];
    return rows.map(c=>({...c, ppwDate:c.ppwDate || c.ppwDueDate || c.ppwDue || c.renewalDate, sourceBucket:'official', sourceType:'기간계 수재계약'}));
  }
  function migrateFacWorkflow(){
    const saved = JSON.parse(localStorage.getItem(FAC_WORKFLOW_KEY) || '[]');
    const savedMap = Object.fromEntries(saved.map(x=>[x.inwardRef,x]));
    (state.fac||[]).forEach(f=>{
      const sv = savedMap[f.inwardRef] || {};
      f.intakeNo = f.intakeNo || sv.intakeNo || f.sourceIntakeNo || '';
      f.reviewStatus = f.reviewStatus || sv.reviewStatus || (f.closeStatus==='기간계 입력완료'?'기간계 입력완료':(f.closeStatus==='기간계 입력대상'?'UW 검토요청':'검토중'));
      if(f.reviewStatus === '수기등록') f.reviewStatus = '검토중';
      f.reviewOwner = f.reviewOwner || sv.reviewOwner || f.owner || currentUser();
      f.requestSource = f.requestSource || sv.requestSource || '메일/Slip 접수';
      f.confirmNote = f.confirmNote || sv.confirmNote || f.confirmNote || '';
      f.statusHistory = f.statusHistory || sv.statusHistory || [{status:f.reviewStatus, at:new Date().toISOString().slice(0,16).replace('T',' '), by:currentUser(), memo:'초기 상태'}];
      f.receivableStatus = f.receivableStatus || '확인중';
    });
  }
  function statusClass(st){
    if(st==='수재확정') return 'confirm';
    if(st==='인수거절') return 'decline';
    if(st==='기간계 입력완료') return 'inputdone';
    if(st==='조건협의') return 'negotiation';
    if(st==='검토중'||st==='UW 검토요청') return 'review';
    return '';
  }
  function statusSelectHtml(ref, selected){
    return `<select id="facst_${ref}" class="small-select">${statusOptions.map(s=>`<option ${s===selected?'selected':''}>${s}</option>`).join('')}</select><button class="save-btn" onclick="saveFacStatus('${ref}')">저장</button>`;
  }
  function addHistory(f, status, memo){
    f.statusHistory = f.statusHistory || [];
    f.statusHistory.unshift({status, at:new Date().toISOString().slice(0,16).replace('T',' '), by:currentUser(), memo:memo || ''});
    f.statusHistory = f.statusHistory.slice(0,20);
  }
  function setFacMessage(msg){ const el=q('facMsg'); if(el) el.innerText=msg; }
  function getFacPayload(){
    const cur = q('facCurrency')?.value || 'USD';
    const fx = (DATA.fxRates||{})[cur] || 1;
    const orig = Number(q('facPremiumOriginal')?.value || 0);
    return {
      inwardRef: q('facEditRef')?.value || nextInwardRef(),
      intakeNo: (q('facIntakeNo')?.value || '').trim(),
      reviewStatus: q('facReviewStatus')?.value || '검토중',
      reviewOwner: q('facReviewOwner')?.value || currentUser(),
      requestSource: (q('facRequestSource')?.value || '').trim(),
      insured: (q('facInsured')?.value || '').trim(),
      country: (q('facCountry')?.value || '').trim(),
      city: (q('facCity')?.value || '').trim(),
      line: q('facLine')?.value || 'Package',
      tsiEok: Number(q('facTsi')?.value || 0),
      premiumOriginal: orig,
      currency: cur,
      fxRate: fx,
      premiumEok: Math.max(0, Math.round(orig * fx / 100000000)),
      cedant: (q('facCedant')?.value || '').trim(),
      slipSummary: (q('facSlipSummary')?.value || '').trim(),
      memo: (q('facMemo')?.value || '').trim(),
      confirmNote: (q('facConfirmNote')?.value || '').trim(),
      ppwDate: q('facPPW')?.value || '',
      owner: q('facOwner')?.value || currentUser(),
      sourceType: '플랫폼 수기등록',
      tempDataType: '기간계 입력 전 관리',
      updatedAt: new Date().toISOString().slice(0,16).replace('T',' ')
    };
  }
  window.clearFacFormV50 = function(){
    ['facEditRef','facIntakeNo','facRequestSource','facInsured','facCountry','facCity','facTsi','facPremiumOriginal','facCedant','facSlipSummary','facPPW','facOwner','facMemo','facConfirmNote'].forEach(id=>{const el=q(id); if(el) el.value='';});
    if(q('facReviewStatus')) q('facReviewStatus').value='접수';
    if(q('facReviewOwner')) q('facReviewOwner').value='글로벌사업부';
    if(q('facLine')) q('facLine').value='Package';
    if(q('facCurrency')) q('facCurrency').value='USD';
  };
  window.registerFac = function(){
    migrateFacWorkflow();
    const row = getFacPayload();
    if(!row.insured || !row.country){ setFacMessage('피보험자와 국가는 필수입니다.'); return; }
    const idx = (state.fac||[]).findIndex(x=>x.inwardRef===row.inwardRef);
    const prevStatus = idx>=0 ? state.fac[idx].reviewStatus : '';
    const action = idx>=0 ? '수정' : '등록';
    if(!confirm(`${row.insured} 건을 ${action}할까요?\n진행상태: ${row.reviewStatus}`)) return;
    if(row.reviewStatus==='수재확정' && !row.confirmNote){
      if(!confirm('수재확정 상태입니다. 수재확정 노트가 비어 있습니다. 저장 후 노트를 입력하시겠습니까?')) return;
    }
    if(idx>=0){
      const old = state.fac[idx];
      state.fac[idx] = {...old, ...row, createdAt:old.createdAt || new Date().toISOString().slice(0,10)};
      if(prevStatus !== row.reviewStatus) addHistory(state.fac[idx], row.reviewStatus, '사용자 저장으로 상태 변경');
    }else{
      row.createdAt = new Date().toISOString().slice(0,10);
      row.statusHistory = [];
      addHistory(row, row.reviewStatus, '신규 등록');
      state.fac.unshift(row);
    }
    saveAll();
    setFacMessage(`${row.inwardRef} ${action} 완료`);
    renderFacTable(); renderDashboard(); safe(renderMap);
    if(row.reviewStatus==='수재확정') showFacConfirmPopup(row.inwardRef);
  };

  window.facFiltered = function(){
    migrateFacWorkflow();
    const qv=(q('facSearch')?.value||'').toLowerCase();
    const s=q('facStatusFilter')?.value||'전체';
    return (state.fac||[]).filter(f=>{
      const hay=[f.inwardRef,f.intakeNo,f.insured,f.country,f.city,f.line,f.cedant,f.reviewOwner,f.reviewStatus,f.memo,f.confirmNote].join(' ').toLowerCase();
      return (!qv || hay.includes(qv)) && (s==='전체'||f.reviewStatus===s);
    });
  };
  function pipelineHtml(rows){
    const counts = Object.fromEntries(statusOptions.map(s=>[s, rows.filter(r=>r.reviewStatus===s).length]));
    return `<div id="facPipeline" class="pipeline-board">
      <div class="pipeline-card"><span>검토 진행</span><b>${(counts['접수']||0)+(counts['검토중']||0)+(counts['UW 검토요청']||0)+(counts['조건협의']||0)}건</b><div class="workflow-note">접수·검토·조건협의 중</div></div>
      <div class="pipeline-card"><span>수재확정</span><b>${counts['수재확정']||0}건</b><div class="workflow-note">기간계 입력 전 계약정보 보관</div></div>
      <div class="pipeline-card"><span>인수거절</span><b>${counts['인수거절']||0}건</b><div class="workflow-note">Decline 사유와 검토근거 축적</div></div>
      <div class="pipeline-card"><span>기간계 입력완료</span><b>${counts['기간계 입력완료']||0}건</b><div class="workflow-note">마감·보험료 입력 등 최소정보 반영</div></div>
    </div>`;
  }
  window.renderFacTable = function(){
    migrateFacWorkflow();
    const rows=facFiltered();
    const total=Math.max(1,Math.ceil(rows.length/PAGE));
    state.pages.fac=Math.min(state.pages.fac,total);
    const page=rows.slice((state.pages.fac-1)*PAGE,state.pages.fac*PAGE);
    const cnt=q('facCount'); if(cnt) cnt.innerHTML=`검색 결과 ${rows.length}건 / 기간계 입력 전 계약 진행 이력 관리${pipelineHtml(rows)}`;
    const head=document.querySelector('#facTable thead tr');
    if(head) head.innerHTML = `<th><input type="checkbox" onclick="toggleChecks('.fac-check',this.checked)"/></th><th>관리번호</th><th>Intake</th><th>피보험자</th><th>국가/도시</th><th>종목</th><th>TSI/보험료</th><th>진행상태</th><th>담당</th><th>처리</th>`;
    const tb=document.querySelector('#facTable tbody');
    if(tb) tb.innerHTML=page.map(f=>`<tr>
      <td><input class="fac-check small-check" type="checkbox" value="${f.inwardRef}"/></td>
      <td><button class="link-btn" onclick="showFac('${f.inwardRef}')">${f.inwardRef}</button></td>
      <td>${f.intakeNo||'-'}<br><small>${f.requestSource||''}</small></td>
      <td>${f.insured||'-'}<br><small>${f.cedant||''}</small></td>
      <td>${f.country||'-'}/${f.city||'-'}</td>
      <td>${f.line||'-'}</td>
      <td>${eok(f.tsiEok)}<br><small>${f.currency||''} ${Number(f.premiumOriginal||0).toLocaleString()}</small></td>
      <td><span class="status-pill ${statusClass(f.reviewStatus)}">${f.reviewStatus}</span><br>${statusSelectHtml(f.inwardRef, f.reviewStatus)}</td>
      <td>${f.reviewOwner||f.owner||'-'}</td>
      <td><div class="inline-actions"><button onclick="editFacV50('${f.inwardRef}')">수정</button><button onclick="showFacConfirmPopup('${f.inwardRef}')">수재노트</button><button class="danger-btn" onclick="deleteFacOneV50('${f.inwardRef}')">삭제</button></div></td>
    </tr>`).join('');
    if(q('facPage')) q('facPage').innerText=`${state.pages.fac} / ${total}`;
  };
  window.editFacV50 = function(ref){
    migrateFacWorkflow();
    const f = (state.fac||[]).find(x=>x.inwardRef===ref); if(!f) return;
    const set=(id,v)=>{const el=q(id); if(el) el.value=v??'';};
    set('facEditRef', f.inwardRef); set('facIntakeNo', f.intakeNo); set('facReviewStatus', f.reviewStatus); set('facReviewOwner', f.reviewOwner); set('facRequestSource', f.requestSource);
    set('facInsured', f.insured); set('facCountry', f.country); set('facCity', f.city); set('facLine', f.line); set('facTsi', f.tsiEok); set('facPremiumOriginal', f.premiumOriginal); set('facCurrency', f.currency); set('facCedant', f.cedant); set('facSlipSummary', f.slipSummary); set('facPPW', f.ppwDate); set('facOwner', f.owner); set('facMemo', f.memo); set('facConfirmNote', f.confirmNote);
    setFacMessage(`${ref} 수정 중`);
    window.scrollTo({top:0,behavior:'smooth'});
  };
  window.saveFacStatus = function(ref){
    migrateFacWorkflow();
    const f=(state.fac||[]).find(x=>x.inwardRef===ref); if(!f) return;
    const newStatus=q('facst_'+ref)?.value || f.reviewStatus;
    if(newStatus===f.reviewStatus) return;
    if(!confirm(`${f.insured}의 진행상태를 [${f.reviewStatus}]에서 [${newStatus}]로 변경할까요?`)) { renderFacTable(); return; }
    f.reviewStatus = newStatus;
    addHistory(f, newStatus, '목록에서 상태 변경');
    saveAll(); renderFacTable(); renderDashboard(); safe(renderMap);
    if(newStatus==='수재확정') showFacConfirmPopup(ref);
  };
  window.showFacConfirmPopup = function(ref){
    migrateFacWorkflow();
    const f=(state.fac||[]).find(x=>x.inwardRef===ref); if(!f) return;
    facModalBody.innerHTML = `<div class="form-grid labeled">
      <label>관리번호<input value="${f.inwardRef}" disabled/></label>
      <label>진행상태<input value="${f.reviewStatus||''}" disabled/></label>
      <label>피보험자<input value="${f.insured||''}" disabled/></label>
      <label>보험종목<input value="${f.line||''}" disabled/></label>
    </div>
    <label class="full-label">수재확정 노트<textarea id="modalConfirmNote" rows="8" placeholder="지분, 보험료, 출재사, 재보험거래처, PPW, 특약조건, 기간계 입력 시 유의사항">${f.confirmNote||''}</textarea></label>
    <label class="full-label">검토 메모<textarea id="modalFacMemo" rows="5">${f.memo||''}</textarea></label>
    <div class="confirm-note-box"><b>상태 이력</b><br>${(f.statusHistory||[]).map(h=>`${h.at} · ${h.by} · ${h.status} ${h.memo?'- '+h.memo:''}`).join('<br>') || '이력 없음'}</div>
    <div class="bulk-action-row"><button onclick="saveFacConfirmNote('${ref}')">노트 저장</button><button class="secondary-btn" onclick="closeModal()">닫기</button></div>`;
    facModal.style.display='flex';
  };
  window.saveFacConfirmNote = function(ref){
    const f=(state.fac||[]).find(x=>x.inwardRef===ref); if(!f) return;
    if(!confirm('수재확정 노트와 검토 메모를 저장할까요?')) return;
    f.confirmNote = q('modalConfirmNote')?.value || '';
    f.memo = q('modalFacMemo')?.value || '';
    addHistory(f, f.reviewStatus, '수재확정/검토 노트 저장');
    saveAll(); renderFacTable(); closeModal();
  };
  window.showFac = function(ref){ showFacConfirmPopup(ref); };
  window.deleteFacOneV50 = function(ref){
    const f=(state.fac||[]).find(x=>x.inwardRef===ref); if(!f) return;
    if(!confirm(`${f.insured} (${ref}) 진행건을 삭제할까요?`)) return;
    state.fac = (state.fac||[]).filter(x=>x.inwardRef!==ref);
    saveAll(); renderFacTable(); renderDashboard(); safe(renderMap);
  };
  window.deleteSelectedFac = function(){
    const ids=[...document.querySelectorAll('.fac-check:checked')].map(x=>x.value);
    if(!ids.length){ alert('삭제할 진행건을 선택하세요.'); return; }
    if(!confirm(`${ids.length}건을 삭제할까요? 삭제 전 대상이 맞는지 확인하세요.`)) return;
    state.fac=(state.fac||[]).filter(x=>!ids.includes(x.inwardRef));
    saveAll(); renderFacTable(); renderDashboard(); safe(renderMap);
  };

  function systemPPWAll(){
    state.systemReceivables = state.systemReceivables || {};
    return officialInward().map(c=>{
      const key=c.policyNo;
      const rv=state.systemReceivables[key] || {};
      const ppwDate=c.ppwDate || c.renewalDate || '';
      const d=dayDiff(ppwDate);
      const defaultStatus = d<=14 ? '확인중' : '정상';
      return {...c, ppwDate, receivableStatus:rv.status||defaultStatus, receivableOwner:rv.owner||'', receivableUpdatedAt:rv.updatedAt||''};
    });
  }
  window.ppwRows = function(){
    return systemPPWAll().filter(c=>c.receivableStatus!=='정상' || dayDiff(c.ppwDate)<=14).sort((a,b)=>dayDiff(a.ppwDate)-dayDiff(b.ppwDate));
  };
  window.ppwFiltered = function(){
    const qv=(q('ppwSearch')?.value||'').toLowerCase();
    const st=q('ppwStatusFilter')?.value||'전체';
    return systemPPWAll().filter(c=>{
      const hay=[c.policyNo,c.insured,c.country,c.city,c.line,c.receivableOwner,c.receivableStatus].join(' ').toLowerCase();
      return (!qv||hay.includes(qv)) && (st==='전체'||c.receivableStatus===st);
    }).sort((a,b)=>dayDiff(a.ppwDate)-dayDiff(b.ppwDate));
  };
  window.renderPPW = function(){
    const panel=q('contractPPWPanel'); if(!panel) return;
    const rows=ppwFiltered();
    const total=Math.max(1,Math.ceil(rows.length/PAGE));
    state.pages.ppw=Math.min(state.pages.ppw,total);
    const page=rows.slice((state.pages.ppw-1)*PAGE,state.pages.ppw*PAGE);
    const due=ppwRows().length;
    panel.innerHTML = `<h3>PPW / 미수 관리 <span class="data-badge">체결 수재계약 기준</span></h3>
      <p class="muted">PPW와 미수관리는 이미 체결되어 기간계에서 내려받은 수재계약 기준으로 관리합니다. 계약 진행관리 화면의 검토 중 오퍼는 이 목록에 포함하지 않습니다.</p>
      <div class="contract-ppw-summary"><span class="chip">알림 대상 ${due}건</span><span class="chip">공식 수재계약 ${officialInward().length}건</span></div>
      <div class="toolbar-row"><input id="ppwSearch" placeholder="증권번호, 피보험자, 담당자 검색" oninput="renderPPW()"/><select id="ppwStatusFilter" onchange="renderPPW()"><option>전체</option><option>정상</option><option>미수</option><option>부분입금</option><option>확인중</option></select><button onclick="renderPPW()">검색</button></div>
      <div class="table-scroll"><table id="ppwTable"><thead><tr><th>증권번호</th><th>피보험자</th><th>보험종목</th><th>PPW</th><th>D-Day</th><th>미수상태</th><th>미수 담당자</th><th>저장</th></tr></thead><tbody>${page.map(c=>`<tr><td>${c.policyNo}</td><td>${c.insured}</td><td>${c.line}</td><td>${c.ppwDate||'-'}</td><td>${c.ppwDate?'D-'+dayDiff(c.ppwDate):'-'}</td><td><select id="sysrecv_${c.policyNo}"><option ${c.receivableStatus==='정상'?'selected':''}>정상</option><option ${c.receivableStatus==='미수'?'selected':''}>미수</option><option ${c.receivableStatus==='부분입금'?'selected':''}>부분입금</option><option ${c.receivableStatus==='확인중'?'selected':''}>확인중</option></select></td><td>${c.receivableOwner||'-'}${c.receivableUpdatedAt?'<br><small>'+c.receivableUpdatedAt+'</small>':''}</td><td><button class="save-btn" onclick="savePPW('${c.policyNo}')">저장</button></td></tr>`).join('')}</tbody></table></div>
      <div class="pager"><button onclick="pagePPW(-1)">이전</button><span id="ppwPage">${state.pages.ppw} / ${total}</span><button onclick="pagePPW(1)">다음</button></div>`;
  };
  window.savePPW = function(policyNo){
    const status=q('sysrecv_'+policyNo)?.value || '확인중';
    if(!confirm(`${policyNo}의 PPW/미수 상태를 [${status}]로 저장할까요?`)) return;
    state.systemReceivables = state.systemReceivables || {};
    state.systemReceivables[policyNo] = {status, owner:currentUser(), updatedAt:new Date().toISOString().slice(0,16).replace('T',' ')};
    saveAll(); renderPPW(); renderDashboard();
  };
  window.pagePPW = function(d){ state.pages.ppw=Math.max(1,(state.pages.ppw||1)+d); renderPPW(); };
  window.renderDashboard = function(){
    migrateFacWorkflow(); setMetaText();
    const renew = renewRows(); const ppw = ppwRows(); const accidents = state.accidents || [];
    const topLayer=state.layers.map(l=>({...l,burn:(Number(l.paidUsedEok)+Number(l.outstandingUsedEok))/Math.max(1,Number(l.baseLimitEok)+Number(l.reinstatedLimitEok))*100})).sort((a,b)=>b.burn-a.burn)[0];
    const labels=document.querySelectorAll('#dashboard .kpi span');
    if(labels[0]) labels[0].innerText='30일 이내 갱신계약';
    if(labels[1]) labels[1].innerText='PPW 도래/미수';
    if(labels[2]) labels[2].innerText='사고계약 데이터';
    if(labels[3]) labels[3].innerText='최고 Layer 소진율';
    const ems=document.querySelectorAll('#dashboard .kpi em');
    if(ems[0]) ems[0].innerHTML='<span class="data-badge">기간계 수재계약</span>';
    if(ems[1]) ems[1].innerText='체결 수재계약 기준';
    if(ems[2]) ems[2].innerHTML='<span class="data-badge">기간계 사고계약</span>';
    if(ems[3]) ems[3].innerText='재보험 프로그램 수기관리 기준';
    q('kpiRenew') && (q('kpiRenew').innerText=renew.length+'건'); q('kpiPPW') && (q('kpiPPW').innerText=ppw.length+'건'); q('kpiAccident') && (q('kpiAccident').innerText=accidents.length+'건'); q('kpiLayer') && (q('kpiLayer').innerText=topLayer?Math.round(topLayer.burn)+'%':'-');
    const kpis=document.querySelectorAll('#dashboard .kpi'); if(kpis[0]) kpis[0].onclick=()=>showDashboardList('renew'); if(kpis[1]) kpis[1].onclick=()=>showDashboardList('ppw'); if(kpis[2]) kpis[2].onclick=()=>switchTab('accident'); if(kpis[3]) kpis[3].onclick=()=>switchTab('layer');
    const task=q('todayTasks'); if(task) task.innerHTML=`<div class="card-item" onclick="switchTab('inward')"><b>검토 중 오퍼</b><br>${(state.fac||[]).filter(f=>!['수재확정','인수거절','기간계 입력완료'].includes(f.reviewStatus)).length}건 진행관리</div><div class="card-item" onclick="showDashboardList('ppw')"><b>체결 수재계약 PPW</b><br>${ppw.length}건 확인 필요</div><div class="card-item" onclick="switchTab('accident')"><b>사고계약 데이터</b><br>${accidents.length}건 재보험 영향분석 원천</div>`;
    const layerBox=q('dashboardLayerBars'); if(layerBox) layerBox.innerHTML=state.layers.slice(0,8).map(l=>{const burn=(l.paidUsedEok+l.outstandingUsedEok)/Math.max(1,l.baseLimitEok+l.reinstatedLimitEok)*100;return `<div class="layer-row"><b>${l.treatyName} / ${l.layer}</b><br>Paid ${eok(l.paidUsedEok)} + OS ${eok(l.outstandingUsedEok)} / 한도 ${eok(l.baseLimitEok+l.reinstatedLimitEok)}<div class="track"><span style="width:${Math.min(100,burn)}%"></span></div></div>`;}).join('');
  };
  window.showDashboardList = function(kind){
    const rows=kind==='renew'?renewRows():ppwRows();
    let html='<h3>'+(kind==='renew'?'30일 이내 갱신계약':'PPW 도래/미수 목록')+'</h3><div class="table-scroll"><table><thead><tr>';
    if(kind==='renew') html+='<th>증권번호</th><th>피보험자</th><th>보험종목</th><th>만기일</th><th>D-Day</th>';
    else html+='<th>증권번호</th><th>피보험자</th><th>PPW</th><th>미수상태</th><th>담당자</th>';
    html+='</tr></thead><tbody>';
    html += rows.slice(0,20).map(r=>kind==='renew'?`<tr><td>${r.policyNo}</td><td>${r.insured}</td><td>${r.line}</td><td>${r.renewalDate}</td><td>D-${dayDiff(r.renewalDate)}</td></tr>`:`<tr><td>${r.policyNo}</td><td>${r.insured}</td><td>${r.ppwDate}</td><td>${r.receivableStatus}</td><td>${r.receivableOwner||''}</td></tr>`).join('');
    html+='</tbody></table></div>';
    if(q('dashboardList')) q('dashboardList').innerHTML=html;
  };
  window.sendCurrentIntakeToFac = function(){
    const row = (typeof currentIntakePayload==='function') ? currentIntakePayload() : null;
    if(!row || !row.insured || !row.country){ alert('먼저 접수 항목을 입력하거나 목록에서 수정할 건을 선택하세요.'); return; }
    if(!confirm(`${row.id} 내용을 계약 진행관리 화면으로 전송할까요?`)) return;
    const set=(id,v)=>{const el=q(id); if(el) el.value=v??'';};
    set('facEditRef',''); set('facIntakeNo', row.id); set('facReviewStatus','검토중'); set('facReviewOwner', row.owner||'글로벌사업부'); set('facRequestSource', `${row.source||''} / ${row.partner||''}`);
    set('facInsured', row.insured); set('facCountry', row.country); set('facCity', row.city); set('facLine', row.line==='재물'?'Package':row.line==='특종'?'배상책임':row.line==='해상'?'해상적하':row.line); set('facTsi', row.tsiEok); set('facPremiumOriginal', row.premiumOriginal); set('facCurrency', row.currency); set('facCedant', row.partner); set('facPPW', row.due); set('facOwner', currentUser());
    set('facSlipSummary', `${row.source} / ${row.partner || '파트너 확인필요'} / 사고이력 ${row.lossHistory}`);
    set('facMemo', [`접수번호: ${row.id}`, row.memo, row.lossDesc ? `사고내용: ${row.lossDesc}` : '', row.lossAmountEok ? `사고금액: ${eok(row.lossAmountEok)}` : ''].filter(Boolean).join('\n'));
    set('facConfirmNote','');
    row.stage='계약관리 전송';
    saveAll(); renderIntakeTable(); switchTab('inward');
  };
  window.sendIntakeToFac = function(id){ if(typeof editIntake==='function') editIntake(id); setTimeout(()=>sendCurrentIntakeToFac(),50); };
  const helpV50 = {
    dashboard:'검토 중 오퍼, 체결 수재계약 PPW, 사고계약 데이터, 재보험 Layer 현황을 확인합니다.',
    intake:'메일 또는 Slip으로 접수된 해외계약 정보를 표준 항목으로 정리합니다. 이 단계는 계약을 확정하는 단계가 아니라 검토를 시작하기 위한 접수 단계입니다.',
    inward:'접수 이후 계약 진행상태를 관리합니다. 접수, 검토중, 조건협의, 수재확정, 인수거절, 기간계 입력완료까지의 이력을 축적합니다.',
    contract:'월마감 후 기간계에서 내려받은 체결 수재계약을 조회합니다. PPW와 미수관리는 체결계약 기준으로 이 화면에서 관리합니다.',
    location:'해외수재계약 기준으로 국가·도시별 누적 가입금액을 확인합니다.',
    inwardClaim:'수재계약에 연결된 클레임을 등록하고 처리 이력을 관리합니다.',
    accident:'기간계에서 내려받은 사고계약 데이터를 관리합니다. 국내 원수계약 사고도 재보험에 영향을 줄 수 있으므로 포함합니다.',
    treaty:'재보험 프로그램과 주요 Layer 조건을 확인합니다.',
    impact:'사고계약 데이터 또는 사고 시나리오를 기준으로 재보험 영향 여부를 약식 검토합니다.',
    layer:'재보험 Layer별 사용액과 잔여한도를 관리합니다.',
    reinstatement:'복원보험료를 표준 산식으로 약식 계산합니다.',
    docs:'약관·특약·Slip·Treaty 문서를 등록하고 요약·번역 초안을 확인합니다.',
    admin:'기간계 수재계약 데이터와 사고계약 데이터를 업로드합니다.'
  };
  function updateHelpV50(tab){ const el=q('pageHelpTooltip'); if(el) el.textContent=helpV50[tab]||''; }
  const prevSwitchV50 = window.switchTab;
  window.switchTab = function(tab){
    prevSwitchV50(tab);
    updateHelpV50(tab);
    if(tab==='inward') { migrateFacWorkflow(); renderFacTable(); }
    if(tab==='contract') { renderContractTable(); renderPPW(); }
    if(tab==='dashboard') renderDashboard();
    if(tab==='location') setTimeout(renderMap,100);
  };
  window.addEventListener('load',()=>{
    setTimeout(()=>{
      migrateFacWorkflow();
      document.querySelector('[data-tab="inward"]') && (document.querySelector('[data-tab="inward"]').textContent='수재계약 입력관리');
      document.querySelector('[data-tab="contract"]') && (document.querySelector('[data-tab="contract"]').textContent='출재·수재계약 조회');
      safe(renderFacTable); safe(renderContractTable); safe(renderPPW); safe(renderDashboard); safe(renderMap);
      updateHelpV50('dashboard'); saveAll();
    },1600);
  });
})();

/* ===== v50 hotfix: Intake → 계약 진행관리 전송 ===== */
(function(){
  const q = (id)=>document.getElementById(id);
  function v(id){ return q(id)?.value || ''; }
  function readIntakeDom(){
    const cur = v('intakeCurrency') || 'USD';
    const fx = (DATA.fxRates||{})[cur] || 1;
    const prem = Number(v('intakePremiumOriginal') || 0);
    return {
      id: v('intakeEditId') || '신규 Intake',
      source: v('intakeSource'), owner: v('intakeOwner'), insured:v('intakeInsured').trim(), country:v('intakeCountry').trim(), city:v('intakeCity').trim(), line:v('intakeLine'), tsiEok:Number(v('intakeTsi')||0), premiumOriginal:prem, currency:cur, premiumEok:prem?Math.max(1,Math.round(prem*fx/100000000)):0, partner:v('intakePartner').trim(), due:v('intakeDue'), lossHistory:v('intakeLossHistory'), lossAmountEok:Number(v('intakeLossAmount')||0), lossDesc:v('intakeLossDesc').trim(), memo:v('intakeMemo').trim()
    };
  }
  window.sendCurrentIntakeToFac = function(){
    const row = readIntakeDom();
    if(!row.insured || !row.country){ alert('먼저 접수 항목을 입력하거나 목록에서 수정할 건을 선택하세요.'); return; }
    if(!confirm(`${row.id} 내용을 계약 진행관리 화면으로 전송할까요?`)) return;
    const set=(id,val)=>{const el=q(id); if(el) el.value=val??'';};
    set('facEditRef',''); set('facIntakeNo', row.id); set('facReviewStatus','검토중'); set('facReviewOwner', row.owner||'글로벌사업부'); set('facRequestSource', `${row.source||''}${row.partner?' / '+row.partner:''}`);
    set('facInsured', row.insured); set('facCountry', row.country); set('facCity', row.city); set('facLine', row.line==='재물'?'Package':row.line==='특종'?'배상책임':row.line==='해상'?'해상적하':row.line); set('facTsi', row.tsiEok); set('facPremiumOriginal', row.premiumOriginal); set('facCurrency', row.currency); set('facCedant', row.partner); set('facPPW', row.due); set('facOwner', currentUser());
    set('facSlipSummary', `${row.source||'접수'} / ${row.partner || '파트너 확인필요'} / 사고이력 ${row.lossHistory}`);
    set('facMemo', [`접수번호: ${row.id}`, row.memo, row.lossDesc ? `사고내용: ${row.lossDesc}` : '', row.lossAmountEok ? `사고금액: ${eok(row.lossAmountEok)}` : ''].filter(Boolean).join('\n'));
    set('facConfirmNote','');
    const item = (state.intake||[]).find(x=>x.id===row.id); if(item){ item.stage='계약관리 전송'; saveAll(); if(typeof renderIntakeTable==='function') renderIntakeTable(); }
    switchTab('inward');
  };
  window.sendIntakeToFac = function(id){ if(typeof editIntake==='function') editIntake(id); setTimeout(()=>sendCurrentIntakeToFac(),80); };
})();

/* ===== v51: 접수 단계 제거, 상태변경 로그, 팝업 종료, 재보험 시각화 고도화 ===== */
(function(){
  const q = (id)=>document.getElementById(id);
  const nowText = ()=>new Date().toISOString().slice(0,16).replace('T',' ');
  const userText = ()=> (typeof currentUser==='function' ? currentUser() : (state.user?.empNo || 'DEMO'));
  const safeEok = (v)=> (typeof eok==='function' ? eok(Number(v||0)) : `${Number(v||0).toLocaleString()}억원`);
  const pct = (num,den)=> Math.round((Number(num||0)/Math.max(1,Number(den||0)))*100);
  const treatyColors = {'TR-01':'#2563eb','TR-02':'#059669','TR-03':'#7c3aed','TR-04':'#ea580c'};
  const treatyColor = (id)=>treatyColors[id] || '#f97316';
  function findTreaty(id){ return (DATA.treaties||[]).find(t=>t.treatyId===id) || {}; }
  function layerRange(treaty, layerName){
    const l=(treaty.layers||[]).find(x=>x.layer===layerName);
    if(!l) return '';
    return `${safeEok(l.from)} xs ${safeEok(l.to-l.from)}`;
  }
  function latestHistory(f){
    const arr = f?.statusHistory || [];
    return arr.length ? arr[arr.length-1] : {at:f.updatedAt||'-', by:f.reviewOwner||f.owner||'-', status:f.reviewStatus||'-', memo:''};
  }
  function addStatusHistory(f, status, memo){
    f.statusHistory = f.statusHistory || [];
    f.statusHistory.push({at:nowText(), by:userText(), status, memo: memo || '상태 변경'});
  }

  // 팝업 종료 오류 보정: class와 inline style을 모두 정리
  window.closeModal = function(e){
    const modal = q('facModal');
    if(!modal) return;
    if(e && e.target && e.target.id !== 'facModal') return;
    modal.classList.remove('show');
    modal.style.display = 'none';
  };
  function openModal(){
    const modal = q('facModal');
    if(!modal) return;
    modal.classList.add('show');
    modal.style.display = 'flex';
  }

  // Intake: 처리단계 제거. 접수정보 자체만 표준화하고, 진행상태는 계약 진행관리에서 관리.
  window.renderIntakeTable = function(){
    const qv=(q('intakeSearch')?.value||'').toLowerCase();
    const rows=(state.intake||[]).filter(x=>{
      const hay=[x.id,x.insured,x.country,x.city,x.line,x.partner,x.owner,x.source,x.memo,x.lossDesc].join(' ').toLowerCase();
      return !qv || hay.includes(qv);
    });
    const tb=document.querySelector('#intakeTable tbody'); if(!tb) return;
    tb.innerHTML = rows.map(x=>`<tr>
      <td><input class="intake-check small-check" type="checkbox" value="${x.id}"/></td>
      <td><button class="link-btn" onclick="editIntake('${x.id}')">${x.id}</button><br><small>${x.source||'-'} · ${x.createdAt||''}</small></td>
      <td>${x.insured||'-'}<br><small>${x.partner||''}</small></td>
      <td>${x.country||'-'} / ${x.city||'-'}</td>
      <td>${x.line||'-'}</td>
      <td>${safeEok(x.tsiEok)}<br><small>${x.currency||''} ${Number(x.premiumOriginal||0).toLocaleString()}</small></td>
      <td>${x.lossHistory||'확인필요'}<br><small>${x.lossAmountEok?safeEok(x.lossAmountEok):''}</small></td>
      <td>${x.owner||'글로벌사업부'}</td>
      <td><div class="inline-actions"><button onclick="editIntake('${x.id}')">수정</button><button onclick="sendIntakeToFac('${x.id}')">계약진행 등록</button><button class="danger-btn" onclick="deleteSingleIntake('${x.id}')">삭제</button></div></td>
    </tr>`).join('');
    const cnt=q('intakeCount'); if(cnt) cnt.textContent = `총 ${rows.length}건 · 접수된 오퍼/Slip 기본정보`;
  };

  // 계약 진행관리: 상태 변경 시 최신 변경 로그를 바로 노출
  const oldSaveFacStatus = window.saveFacStatus;
  window.saveFacStatus = function(ref){
    const f=(state.fac||[]).find(x=>x.inwardRef===ref); if(!f) return;
    const newStatus=q('facst_'+ref)?.value || f.reviewStatus;
    if(newStatus===f.reviewStatus) return;
    if(!confirm(`${f.insured}의 진행상태를 [${f.reviewStatus}]에서 [${newStatus}]로 변경할까요?`)) { renderFacTable(); return; }
    f.reviewStatus = newStatus;
    f.reviewOwner = f.reviewOwner || f.owner || userText();
    addStatusHistory(f, newStatus, '목록에서 상태 변경');
    f.updatedAt = nowText();
    saveAll(); renderFacTable(); renderDashboard(); if(typeof renderMap==='function') setTimeout(renderMap,80);
    if(newStatus==='수재확정') showFacConfirmPopup(ref);
  };

  const oldShowFacConfirmPopup = window.showFacConfirmPopup;
  window.showFacConfirmPopup = function(ref){
    const f=(state.fac||[]).find(x=>x.inwardRef===ref); if(!f) return;
    const hist=(f.statusHistory||[]).slice().reverse();
    const body=q('facModalBody'); if(!body) return;
    body.innerHTML = `<div class="form-grid labeled">
      <label>관리번호<input value="${f.inwardRef}" disabled/></label>
      <label>진행상태<input value="${f.reviewStatus||''}" disabled/></label>
      <label>피보험자<input value="${f.insured||''}" disabled/></label>
      <label>보험종목<input value="${f.line||''}" disabled/></label>
    </div>
    <label class="full-label">수재확정 노트<textarea id="modalConfirmNote" rows="8" placeholder="지분, 보험료, 출재사, 재보험거래처, PPW, 특약조건, 기간계 입력 시 유의사항">${f.confirmNote||''}</textarea></label>
    <label class="full-label">검토 메모<textarea id="modalFacMemo" rows="5" placeholder="검토 중 확인사항, UW 의견, 추가 요청자료, Decline 사유 등을 기록">${f.memo||''}</textarea></label>
    <div class="confirm-note-box"><b>상태 변경 이력</b><br>${hist.length?hist.map(h=>`${h.at} · ${h.by} · ${h.status}${h.memo?' - '+h.memo:''}`).join('<br>'):'이력 없음'}</div>
    <div class="bulk-action-row"><button onclick="saveFacConfirmNote('${ref}')">노트 저장</button><button class="secondary-btn" onclick="closeModal()">닫기</button></div>`;
    openModal();
  };
  window.saveFacConfirmNote = function(ref){
    const f=(state.fac||[]).find(x=>x.inwardRef===ref); if(!f) return;
    if(!confirm('수재확정 노트와 검토 메모를 저장할까요?')) return;
    f.confirmNote = q('modalConfirmNote')?.value || '';
    f.memo = q('modalFacMemo')?.value || '';
    addStatusHistory(f, f.reviewStatus || '검토중', '수재확정/검토 노트 저장');
    f.updatedAt = nowText();
    saveAll(); renderFacTable(); closeModal();
  };

  const oldRenderFacTable = window.renderFacTable;
  window.renderFacTable = function(){
    if(typeof migrateFacWorkflow==='function') migrateFacWorkflow();
    const rows = (typeof facFiltered==='function') ? facFiltered() : (state.fac||[]);
    const PAGE_SIZE = (typeof PAGE!=='undefined' ? PAGE : 10);
    const total=Math.max(1,Math.ceil(rows.length/PAGE_SIZE));
    state.pages.fac=Math.min(state.pages.fac||1,total);
    const page=rows.slice((state.pages.fac-1)*PAGE_SIZE,state.pages.fac*PAGE_SIZE);
    const cnt=q('facCount');
    if(cnt && typeof pipelineHtml==='function') cnt.innerHTML=`검색 결과 ${rows.length}건 / 기간계 입력 전 계약 진행 이력 관리${pipelineHtml(rows)}`;
    const head=document.querySelector('#facTable thead tr');
    if(head) head.innerHTML = `<th><input type="checkbox" onclick="toggleChecks('.fac-check',this.checked)"/></th><th>관리번호</th><th>Intake</th><th>피보험자</th><th>국가/도시</th><th>종목</th><th>TSI/보험료</th><th>진행상태</th><th>최근 변경 로그</th><th>처리</th>`;
    const tb=document.querySelector('#facTable tbody');
    if(tb) tb.innerHTML=page.map(f=>{
      const h=latestHistory(f);
      const cls=(typeof statusClass==='function') ? statusClass(f.reviewStatus) : '';
      const statuses=['접수','검토중','UW 검토요청','조건협의','수재확정','인수거절','기간계 입력완료'];
      const sel=`<select id="facst_${f.inwardRef}" onchange="saveFacStatus('${f.inwardRef}')">${statuses.map(s=>`<option ${s===(f.reviewStatus||'검토중')?'selected':''}>${s}</option>`).join('')}</select>`;
      return `<tr>
        <td><input class="fac-check small-check" type="checkbox" value="${f.inwardRef}"/></td>
        <td><button class="link-btn" onclick="showFac('${f.inwardRef}')">${f.inwardRef}</button></td>
        <td>${f.intakeNo||'-'}<br><small>${f.requestSource||''}</small></td>
        <td>${f.insured||'-'}<br><small>${f.cedant||''}</small></td>
        <td>${f.country||'-'}/${f.city||'-'}</td>
        <td>${f.line||'-'}</td>
        <td>${safeEok(f.tsiEok)}<br><small>${f.currency||''} ${Number(f.premiumOriginal||0).toLocaleString()}</small></td>
        <td><span class="status-pill ${cls}">${f.reviewStatus||'검토중'}</span><br>${sel}</td>
        <td><div class="fac-latest-log"><b>${h.status||'-'}</b><br>${h.by||'-'} · ${h.at||'-'}${h.memo?'<br>'+h.memo:''}</div></td>
        <td><div class="inline-actions"><button onclick="editFacV50('${f.inwardRef}')">수정</button><button onclick="showFacConfirmPopup('${f.inwardRef}')">수재노트</button><button class="danger-btn" onclick="deleteFacOneV50('${f.inwardRef}')">삭제</button></div></td>
      </tr>`;
    }).join('');
    if(q('facPage')) q('facPage').innerText=`${state.pages.fac} / ${total}`;
  };

  // Dashboard: 사고계약 데이터 KPI를 PPW 도래계약으로 정정
  window.renderDashboard = function(){
    if(typeof migrateFacWorkflow==='function') migrateFacWorkflow();
    if(typeof setMetaText==='function') setMetaText();
    const renew = (typeof renewRows==='function') ? renewRows() : [];
    const ppw = (typeof ppwRows==='function') ? ppwRows() : [];
    const ppwDue = ppw.filter(x=>{
      try{return typeof dayDiff==='function' ? dayDiff(x.ppwDate)<=14 : true;}catch(e){return true;}
    });
    const receivable = ppw.filter(x=>['미수','부분입금','확인중'].includes(x.receivableStatus));
    const topLayer=(state.layers||[]).map(l=>({...l,burn:pct(Number(l.paidUsedEok)+Number(l.outstandingUsedEok),Number(l.baseLimitEok)+Number(l.reinstatedLimitEok))})).sort((a,b)=>b.burn-a.burn)[0];
    const labels=document.querySelectorAll('#dashboard .kpi span');
    if(labels[0]) labels[0].innerText='30일 이내 갱신계약';
    if(labels[1]) labels[1].innerText='미수/확인필요 계약';
    if(labels[2]) labels[2].innerText='PPW 도래계약';
    if(labels[3]) labels[3].innerText='최고 Layer 소진율';
    const ems=document.querySelectorAll('#dashboard .kpi em');
    if(ems[0]) ems[0].innerHTML='<span class="data-badge">기간계 수재계약</span>';
    if(ems[1]) ems[1].innerText='체결 수재계약 기준';
    if(ems[2]) ems[2].innerHTML='<span class="data-badge">체결 수재계약 기준</span>';
    if(ems[3]) ems[3].innerText='재보험 프로그램별 수기관리';
    if(q('kpiRenew')) q('kpiRenew').innerText=renew.length+'건';
    if(q('kpiPPW')) q('kpiPPW').innerText=receivable.length+'건';
    if(q('kpiAccident')) q('kpiAccident').innerText=ppwDue.length+'건';
    if(q('kpiLayer')) q('kpiLayer').innerText=topLayer?topLayer.burn+'%':'-';
    const kpis=document.querySelectorAll('#dashboard .kpi');
    if(kpis[0]) kpis[0].onclick=()=>showDashboardList('renew');
    if(kpis[1]) kpis[1].onclick=()=>showDashboardList('ppw');
    if(kpis[2]) kpis[2].onclick=()=>showDashboardList('ppw');
    if(kpis[3]) kpis[3].onclick=()=>switchTab('layer');
    const task=q('todayTasks');
    if(task) task.innerHTML=`<div class="card-item" onclick="switchTab('inward')"><b>검토 중 오퍼</b><br>${(state.fac||[]).filter(f=>!['수재확정','인수거절','기간계 입력완료'].includes(f.reviewStatus)).length}건 진행관리</div><div class="card-item" onclick="showDashboardList('ppw')"><b>체결 수재계약 PPW</b><br>${ppw.length}건 확인 필요</div><div class="card-item" onclick="switchTab('impact')"><b>사고·재보험 영향분석</b><br>사고계약 데이터 업로드 후 영향 프로그램 검토</div>`;
    renderDashboardLayerModern();
  };
  function renderDashboardLayerModern(){
    const box=q('dashboardLayerBars'); if(!box) return;
    const by={};
    (state.layers||[]).forEach(l=>{(by[l.treatyId]=by[l.treatyId]||[]).push(l)});
    box.className='dashboard-layer-modern';
    box.innerHTML=Object.keys(by).map(tid=>{
      const treaty=findTreaty(tid); const color=treatyColor(tid);
      return `<div class="dashboard-program-card" style="--treaty-accent:${color}"><h4>${treaty.name || by[tid][0].treatyName}</h4>${by[tid].map(l=>{
        const burn=pct(Number(l.paidUsedEok)+Number(l.outstandingUsedEok),Number(l.baseLimitEok)+Number(l.reinstatedLimitEok));
        return `<div class="dashboard-layer-line"><div class="line-head"><span>${l.layer}</span><b>${burn}%</b></div><div class="track"><span style="width:${Math.min(100,burn)}%"></span></div></div>`;
      }).join('')}</div>`;
    }).join('');
  }

  // 재보험 프로그램: 프로그램별 색상·Layer 구간을 명확히 표시
  window.renderTreatyCards = function(){
    const box=q('treatyCards'); if(!box) return;
    box.className='modern-treaty-grid';
    box.innerHTML=(DATA.treaties||[]).map(t=>{
      const color=treatyColor(t.treatyId);
      return `<div class="treaty-card-modern" style="--treaty-accent:${color}">
        <div class="treaty-card-head"><div><h3>${t.name}</h3><p class="treaty-desc">${t.description||''}</p></div><span class="treaty-type-pill">${t.type}</span></div>
        <div class="layer-stack-modern">${(t.layers||[]).map(l=>{
          const st=(state.layers||[]).find(x=>x.treatyId===t.treatyId && x.layer===l.layer);
          const limit=st?Number(st.baseLimitEok)+Number(st.reinstatedLimitEok):Number(l.to)-Number(l.from);
          const used=st?Number(st.paidUsedEok)+Number(st.outstandingUsedEok):0;
          const burn=pct(used,limit);
          return `<div class="layer-block ${l.layer==='Company Retention'?'retention':''}">
            <div class="layer-topline"><span class="layer-name">${l.layer}</span><span class="layer-range">${safeEok(l.from)} ~ ${safeEok(l.to)}</span></div>
            <div class="layer-meta"><span>Lead: <b>${l.lead}</b></span><span>Limit: <b>${safeEok(Number(l.to)-Number(l.from))}</b></span></div>
            <div class="layer-track-modern"><span style="width:${Math.min(100,burn)}%"></span></div>
          </div>`;
        }).join('')}</div>
        <div class="workflow-note" style="margin-top:12px">Exclusion: ${(t.exclusions||[]).join(' · ')}</div>
      </div>`;
    }).join('');
  };

  // Layer 소진 관리: 표 대신 프로그램별 보드로 재구성
  window.renderLayerTable = function(){
    const table=q('layerTable'); if(!table) return;
    const wrap=table.closest('.table-scroll') || table.parentElement;
    if(!wrap) return;
    const by={};
    (state.layers||[]).forEach((l,i)=>{(by[l.treatyId]=by[l.treatyId]||[]).push({...l,_idx:i});});
    wrap.innerHTML = `<div class="layer-status-board">${Object.keys(by).map(tid=>{
      const treaty=findTreaty(tid); const color=treatyColor(tid);
      const totalLimit=by[tid].reduce((a,l)=>a+Number(l.baseLimitEok||0)+Number(l.reinstatedLimitEok||0),0);
      const totalUsed=by[tid].reduce((a,l)=>a+Number(l.paidUsedEok||0)+Number(l.outstandingUsedEok||0),0);
      return `<div class="program-board" style="--treaty-accent:${color}">
        <div class="program-board-title"><h3>${treaty.name || by[tid][0].treatyName}</h3><span class="program-total">총 소진율 ${pct(totalUsed,totalLimit)}%</span></div>
        ${by[tid].map(l=>{
          const limit=Number(l.baseLimitEok||0)+Number(l.reinstatedLimitEok||0);
          const used=Number(l.paidUsedEok||0)+Number(l.outstandingUsedEok||0);
          const burn=pct(used,limit);
          const burnCls=burn>=80?'danger':burn>=50?'warn':'';
          const linked=(state.layerClaims||[]).filter(x=>x.statusId===l.statusId);
          return `<div class="layer-control-card">
            <div class="layer-control-title"><strong>${l.layer}</strong><span class="layer-burn-pill ${burnCls}">${burn}% used</span></div>
            <div class="workflow-note">${layerRange(treaty,l.layer)} · 잔여 ${safeEok(Math.max(0,limit-used))}</div>
            <div class="layer-track-modern"><span style="width:${Math.min(100,burn)}%"></span></div>
            <div class="layer-control-grid">
              <label>Paid 사용액<input id="ly_paid_${l._idx}" type="number" value="${l.paidUsedEok}"/></label>
              <label>Outstanding<input id="ly_os_${l._idx}" type="number" value="${l.outstandingUsedEok}"/></label>
              <label>복원 후 추가한도<input id="ly_re_${l._idx}" type="number" value="${l.reinstatedLimitEok}"/></label>
              <div><button class="save-btn" onclick="saveLayer(${l._idx})">저장</button><br><button onclick="addLayerClaim('${l.statusId}')" style="margin-top:6px">사고/계약 추가</button></div>
            </div>
            <div class="layer-claims-modern"><b>연결 사고/계약</b><br>${linked.length?linked.map(x=>`<span class="layer-claim-chip modern">${x.claimNo || x.policyNo || x.inwardRef} · ${x.insured || ''} <button onclick="deleteLayerClaim('${l.statusId}','${x.claimNo || x.policyNo || x.inwardRef}')">×</button></span>`).join(''):'<span class="mini-msg">연결된 사고/계약 없음</span>'}</div>
          </div>`;
        }).join('')}
      </div>`;
    }).join('')}</div>`;
  };

  // 초기 로딩 후 UI 재렌더링
  window.addEventListener('load',()=>{
    setTimeout(()=>{
      const stageLabel = q('intakeStage')?.closest('label'); if(stageLabel) stageLabel.remove();
      const stageFilter = q('intakeStageFilter'); if(stageFilter) stageFilter.remove();
      if(typeof renderIntakeTable==='function') renderIntakeTable();
      if(typeof renderFacTable==='function') renderFacTable();
      if(typeof renderDashboard==='function') renderDashboard();
      if(typeof renderTreatyCards==='function') renderTreatyCards();
      if(typeof renderLayerTable==='function') renderLayerTable();
      if(typeof saveAll==='function') saveAll();
    },1900);
  });
})();

/* ===== v52 fix: Layer 연결 사고/계약 추가 저장/렌더링 보강 ===== */
(function(){
  const $ = (id)=>document.getElementById(id);
  const pct2 = (num,den)=>Math.round((Number(num||0)/Math.max(1,Number(den||0)))*100);
  const eok2 = (n)=> (typeof eok==='function' ? eok(n) : Math.round(Number(n||0)).toLocaleString()+'억원');
  const safeEok2 = (n)=>eok2(n);
  const tColor = (id)=>({
    'TR-01':'#d35a1f',
    'TR-02':'#2563eb',
    'TR-03':'#0891b2',
    'TR-04':'#7c3aed'
  }[id] || '#334155');
  const getTreaty = (tid)=> (DATA.treaties||[]).find(t=>t.treatyId===tid) || {name:tid,type:'',layers:[],exclusions:[]};
  const getLayerRange = (treaty, layerName)=>{
    const l=(treaty.layers||[]).find(x=>x.layer===layerName);
    if(!l) return '';
    return `${eok2(l.from)} 초과 ~ ${eok2(l.to)}`;
  };
  const linkKey = (x)=>String(x.claimNo || x.policyNo || x.inwardRef || x.manualKey || '').trim();
  const html = (v)=>String(v ?? '').replace(/[&<>"]/g, s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
  const persistLayerClaims = ()=>{
    try{
      if(typeof saveLayerClaims==='function') saveLayerClaims();
      else localStorage.setItem('gra_v37_layer_claims', JSON.stringify(state.layerClaims || []));
    }catch(e){ localStorage.setItem('gra_v37_layer_claims', JSON.stringify(state.layerClaims || [])); }
  };

  function layerHost(){
    let host = $('layerBoardHost');
    if(!host){
      const table = $('layerTable');
      if(table){
        host = document.createElement('div');
        host.id = 'layerBoardHost';
        host.className = 'layer-board-host';
        const parent = table.closest('.table-scroll') || table.parentElement;
        parent.innerHTML = '';
        parent.appendChild(host);
      }
    }
    return host;
  }

  window.addLayerClaim = function(statusId){
    const raw = prompt('연결할 사고번호, 증권번호 또는 피보험자명을 입력하세요.\n예: CLM-2026-0001 / FA2026... / ABC Solar');
    const key = (raw || '').trim();
    if(!key) return;

    const accidents = state.accidents || [];
    const contracts = (typeof allContracts==='function') ? allContracts() : ((DATA.contracts||[]).concat(state.contracts||[]));
    const facs = state.fac || [];

    const acc = accidents.find(a => String(a.claimNo||'')===key || String(a.policyNo||'')===key || String(a.insured||'').toLowerCase().includes(key.toLowerCase()));
    const pol = contracts.find(c => String(c.policyNo||'')===key || String(c.insured||'').toLowerCase().includes(key.toLowerCase()));
    const fac = facs.find(f => String(f.inwardRef||'')===key || String(f.insured||'').toLowerCase().includes(key.toLowerCase()));

    let rec;
    if(acc){
      rec = {statusId, claimNo:acc.claimNo||key, policyNo:acc.policyNo||'', inwardRef:'', manualKey:'', insured:acc.insured||'', paidLossEok:Number(acc.paidLossEok||0), outstandingLossEok:Number(acc.outstandingLossEok||0), note:'사고데이터 연결'};
    }else if(pol){
      rec = {statusId, claimNo:'', policyNo:pol.policyNo||key, inwardRef:'', manualKey:'', insured:pol.insured||'', paidLossEok:0, outstandingLossEok:0, note:'기간계 계약 연결'};
    }else if(fac){
      rec = {statusId, claimNo:'', policyNo:'', inwardRef:fac.inwardRef||key, manualKey:'', insured:fac.insured||'', paidLossEok:0, outstandingLossEok:0, note:'계약 진행관리 건 연결'};
    }else{
      if(!confirm('일치하는 사고/계약이 없습니다. 입력한 값 그대로 수기 연결할까요?')) return;
      const insured = prompt('피보험자/메모를 입력하세요. 생략 가능') || '';
      rec = {statusId, claimNo:'', policyNo:'', inwardRef:'', manualKey:key, insured, paidLossEok:0, outstandingLossEok:0, note:'수기 연결'};
    }

    state.layerClaims = state.layerClaims || [];
    const k = linkKey(rec);
    if(!k) return alert('연결 식별값이 없습니다.');
    if(state.layerClaims.some(x=>x.statusId===statusId && linkKey(x)===k)) return alert('이미 연결된 사고/계약입니다.');

    state.layerClaims.push(rec);
    persistLayerClaims();
    if(typeof saveAll==='function') saveAll();
    window.renderLayerTable();
    if(typeof renderDashboard==='function') renderDashboard();
    alert('연결했습니다.');
  };

  window.deleteLayerClaim = function(statusId, key){
    if(!confirm('연결된 사고/계약을 삭제할까요?')) return;
    state.layerClaims = (state.layerClaims||[]).filter(x => !(x.statusId===statusId && linkKey(x)===String(key)));
    persistLayerClaims();
    if(typeof saveAll==='function') saveAll();
    window.renderLayerTable();
    if(typeof renderDashboard==='function') renderDashboard();
  };

  window.renderLayerTable = function(){
    const host = layerHost();
    if(!host) return;
    const by = {};
    (state.layers||[]).forEach((l,i)=>{ (by[l.treatyId] = by[l.treatyId] || []).push({...l,_idx:i}); });
    host.innerHTML = `<div class="layer-status-board">${Object.keys(by).map(tid=>{
      const treaty = getTreaty(tid);
      const color = tColor(tid);
      const totalLimit = by[tid].reduce((a,l)=>a+Number(l.baseLimitEok||0)+Number(l.reinstatedLimitEok||0),0);
      const totalUsed = by[tid].reduce((a,l)=>a+Number(l.paidUsedEok||0)+Number(l.outstandingUsedEok||0),0);
      return `<div class="program-board" style="--treaty-accent:${color}">
        <div class="program-board-title"><h3>${html(treaty.name || by[tid][0].treatyName)}</h3><span class="program-total">총 소진율 ${pct2(totalUsed,totalLimit)}%</span></div>
        ${by[tid].map(l=>{
          const limit = Number(l.baseLimitEok||0)+Number(l.reinstatedLimitEok||0);
          const used = Number(l.paidUsedEok||0)+Number(l.outstandingUsedEok||0);
          const burn = pct2(used,limit);
          const burnCls = burn>=80 ? 'danger' : burn>=50 ? 'warn' : '';
          const linked = (state.layerClaims||[]).filter(x=>x.statusId===l.statusId);
          return `<div class="layer-control-card">
            <div class="layer-control-title"><strong>${html(l.layer)}</strong><span class="layer-burn-pill ${burnCls}">${burn}% used</span></div>
            <div class="workflow-note">${html(getLayerRange(treaty,l.layer))} · 잔여 ${safeEok2(Math.max(0,limit-used))}</div>
            <div class="layer-track-modern"><span style="width:${Math.min(100,burn)}%"></span></div>
            <div class="layer-control-grid">
              <label>Paid 사용액<input id="ly_paid_${l._idx}" type="number" value="${Number(l.paidUsedEok||0)}"/></label>
              <label>Outstanding<input id="ly_os_${l._idx}" type="number" value="${Number(l.outstandingUsedEok||0)}"/></label>
              <label>복원 후 추가한도<input id="ly_re_${l._idx}" type="number" value="${Number(l.reinstatedLimitEok||0)}"/></label>
              <div><button class="save-btn" onclick="saveLayer(${l._idx})">저장</button><br><button onclick="addLayerClaim('${html(l.statusId)}')" style="margin-top:6px">사고/계약 추가</button></div>
            </div>
            <div class="layer-claims-modern"><b>연결 사고/계약</b><br>${linked.length ? linked.map(x=>{
              const k = linkKey(x);
              const label = x.claimNo || x.policyNo || x.inwardRef || x.manualKey || '-';
              const note = x.note ? ` · ${x.note}` : '';
              return `<span class="layer-claim-chip modern">${html(label)} · ${html(x.insured||'')}${html(note)} <button onclick="deleteLayerClaim('${html(l.statusId)}','${html(k)}')">×</button></span>`;
            }).join('') : '<span class="mini-msg">연결된 사고/계약 없음</span>'}</div>
          </div>`;
        }).join('')}
      </div>`;
    }).join('')}</div>`;
  };

  window.addEventListener('load',()=>setTimeout(()=>{ try{window.renderLayerTable();}catch(e){console.error(e);} },2200));
})();

/* ===== v53: 재보험 프로그램 관리자 + Dashboard/Layer/Treaty 연동 개선 ===== */
(function(){
  const TREATY_KEY = 'gra_v53_treaties';
  const q = (id)=>document.getElementById(id);
  const esc = (v)=>String(v ?? '').replace(/[&<>"']/g, s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  const num = (v)=>Number(v || 0);
  const fmtEok = (v)=> (typeof eok === 'function') ? eok(v) : `${Math.round(num(v)).toLocaleString()}억원`;
  const pctV = (a,b)=> Math.round((num(a)/Math.max(1,num(b)))*100);
  const colorMap = {'TR-01':'#2563eb','TR-02':'#059669','TR-03':'#7c3aed','TR-04':'#ea580c','TR-05':'#0f766e','TR-06':'#be123c'};
  const colorFor = (id)=> colorMap[id] || ['#2563eb','#059669','#7c3aed','#ea580c','#0891b2','#be123c'][Math.abs(String(id||'').split('').reduce((a,c)=>a+c.charCodeAt(0),0))%6];

  function cloneTreaties(){
    return JSON.parse(JSON.stringify(DATA.treaties || []));
  }
  function normalizeTreaties(list){
    return (list||[]).map((t,ti)=>({
      treatyId: t.treatyId || `TR-${String(ti+1).padStart(2,'0')}`,
      name: t.name || 'Untitled Program',
      type: t.type || 'XL',
      description: t.description || '',
      exclusions: Array.isArray(t.exclusions) ? t.exclusions : String(t.exclusions||'').split(/[,·]/).map(x=>x.trim()).filter(Boolean),
      layers: (t.layers||[]).map((l,li)=>({
        layer: l.layer || (li===0?'Company Retention':`${li}st Layer`),
        from: num(l.from),
        to: num(l.to),
        lead: l.lead || 'TBD',
        participants: l.participants || defaultParticipants(t.treatyId, l.lead)
      }))
    }));
  }
  function defaultParticipants(tid, lead){
    if(tid==='TR-01') return `${lead||'Korean Re'} 35%, Swiss Re 20%, Munich Re 15%, Partner Re 10%`;
    if(tid==='TR-02') return `${lead||'Swiss Re'} 30%, Munich Re 25%, Hannover Re 15%, Korean Re 10%`;
    if(tid==='TR-03') return `${lead||'Lloyd\'s'} 40%, Canopius 20%, Arundo Re 15%`;
    if(tid==='TR-04') return `${lead||'Partner Re'} 35%, Hannover Re 25%, Korean Re 15%`;
    return `${lead||'Lead Re'} 40%, Panel Re 30%, Co-Re 20%`;
  }
  function getTreaties(){
    if(!state.treaties){
      try{ state.treaties = normalizeTreaties(JSON.parse(localStorage.getItem(TREATY_KEY) || 'null') || cloneTreaties()); }
      catch(e){ state.treaties = normalizeTreaties(cloneTreaties()); }
    }
    return state.treaties;
  }
  function saveTreaties(){
    localStorage.setItem(TREATY_KEY, JSON.stringify(getTreaties()));
    syncLayerStatusWithTreaties();
    if(typeof saveAll==='function') saveAll();
  }
  function treatyById(tid){ return getTreaties().find(t=>t.treatyId===tid) || getTreaties()[0] || {treatyId:'',name:'',type:'',layers:[],exclusions:[]}; }
  function layerStatusId(tid, layer){ return `${tid}_${String(layer).replace(/\s+/g,'_')}`; }
  function syncLayerStatusWithTreaties(){
    const old = state.layers || [];
    const next=[];
    getTreaties().forEach(t=>{
      (t.layers||[]).forEach(l=>{
        const id = layerStatusId(t.treatyId,l.layer);
        const prev = old.find(x=>x.statusId===id || (x.treatyId===t.treatyId && x.layer===l.layer));
        next.push({
          statusId:id,
          treatyId:t.treatyId,
          treatyName:t.name,
          layer:l.layer,
          baseLimitEok: Math.max(0, num(l.to)-num(l.from)),
          paidUsedEok: prev ? num(prev.paidUsedEok) : 0,
          outstandingUsedEok: prev ? num(prev.outstandingUsedEok) : 0,
          reinstatedLimitEok: prev ? num(prev.reinstatedLimitEok) : 0,
          updatedBy: prev ? prev.updatedBy : '',
          updatedAt: prev ? prev.updatedAt : ''
        });
      });
    });
    state.layers = next;
    try{ localStorage.setItem('gra_v34_layers', JSON.stringify(state.layers)); }catch(e){}
  }
  function layerInfo(status){
    const t=treatyById(status.treatyId);
    const l=(t.layers||[]).find(x=>x.layer===status.layer) || {};
    return {t,l};
  }
  function layerRangeText(t,l){
    if(!l) return '';
    return `${fmtEok(l.from)} 초과 ~ ${fmtEok(l.to)}`;
  }
  function participantsText(l){ return l?.participants || defaultParticipants('', l?.lead); }

  function renderLayerBarsHtml(layers, compact=false){
    return layers.map(s=>{
      const {t,l}=layerInfo(s);
      const limit=num(s.baseLimitEok)+num(s.reinstatedLimitEok);
      const used=num(s.paidUsedEok)+num(s.outstandingUsedEok);
      const burn=pctV(used,limit);
      const cls=burn>=80?'danger':burn>=50?'warn':'';
      return `<div class="dash-layer-item" data-tip="Lead: ${esc(l.lead||'-')}\n참여사: ${esc(participantsText(l))}\n구간: ${esc(layerRangeText(t,l))}\nPaid ${fmtEok(s.paidUsedEok)} / OS ${fmtEok(s.outstandingUsedEok)}">
        <div class="dash-layer-head"><span>${esc(s.layer)}</span><b class="burn-pill ${cls}">${burn}%</b></div>
        <div class="dash-layer-sub">${esc(l.lead||'-')} · ${fmtEok(used)} / ${fmtEok(limit)}</div>
        <div class="layer-track-modern"><span style="width:${Math.min(100,burn)}%"></span></div>
      </div>`;
    }).join('');
  }

  function renderDashboardLayerV53(){
    const box=q('dashboardLayerBars'); if(!box) return;
    syncLayerStatusWithTreaties();
    const by={};
    (state.layers||[]).forEach(s=>{ (by[s.treatyId]=by[s.treatyId]||[]).push(s); });
    box.className='dashboard-layer-v53';
    box.innerHTML=Object.keys(by).map(tid=>{
      const t=treatyById(tid); const color=colorFor(tid);
      const totalLimit=by[tid].reduce((a,s)=>a+num(s.baseLimitEok)+num(s.reinstatedLimitEok),0);
      const totalUsed=by[tid].reduce((a,s)=>a+num(s.paidUsedEok)+num(s.outstandingUsedEok),0);
      return `<div class="dash-program-card" style="--treaty-accent:${color}">
        <div class="dash-program-head"><div><h4>${esc(t.name)}</h4><span>${esc(t.type)} · 총한도 ${fmtEok(totalLimit)}</span></div><b>${pctV(totalUsed,totalLimit)}%</b></div>
        ${renderLayerBarsHtml(by[tid], true)}
      </div>`;
    }).join('');
  }

  const oldRenderDashboard = window.renderDashboard;
  window.renderDashboard = function(){
    try{ if(typeof oldRenderDashboard==='function') oldRenderDashboard(); }catch(e){ console.warn(e); }
    syncLayerStatusWithTreaties();
    const top=(state.layers||[]).map(s=>({s,burn:pctV(num(s.paidUsedEok)+num(s.outstandingUsedEok),num(s.baseLimitEok)+num(s.reinstatedLimitEok))})).sort((a,b)=>b.burn-a.burn)[0];
    if(q('kpiLayer')) q('kpiLayer').innerText=top ? `${top.burn}%` : '-';
    renderDashboardLayerV53();
  };

  window.renderTreatyCards = function(){
    const box=q('treatyCards'); if(!box) return;
    syncLayerStatusWithTreaties();
    box.className='modern-treaty-grid v53-treaty-grid';
    box.innerHTML=getTreaties().map(t=>{
      const color=colorFor(t.treatyId);
      return `<div class="treaty-card-modern v53" style="--treaty-accent:${color}">
        <div class="treaty-card-head"><div><h3>${esc(t.name)}</h3><p class="treaty-desc">${esc(t.description||'')}</p></div><span class="treaty-type-pill">${esc(t.type)}</span></div>
        <div class="layer-stack-modern">${(t.layers||[]).map(l=>{
          const st=(state.layers||[]).find(x=>x.treatyId===t.treatyId && x.layer===l.layer) || {};
          const limit=Math.max(0,num(l.to)-num(l.from));
          const used=num(st.paidUsedEok)+num(st.outstandingUsedEok);
          const burn=pctV(used,limit+num(st.reinstatedLimitEok));
          return `<div class="layer-block ${l.layer==='Company Retention'?'retention':''}" data-tip="Lead: ${esc(l.lead||'-')}\n참여사: ${esc(participantsText(l))}\nExclusion: ${esc((t.exclusions||[]).join(' · '))}">
            <div class="layer-topline"><span class="layer-name">${esc(l.layer)}</span><span class="layer-range">${fmtEok(l.from)} ~ ${fmtEok(l.to)}</span></div>
            <div class="layer-meta"><span>Lead: <b>${esc(l.lead||'-')}</b></span><span>Limit: <b>${fmtEok(limit)}</b></span></div>
            <div class="participant-line">${esc(participantsText(l))}</div>
            <div class="layer-track-modern"><span style="width:${Math.min(100,burn)}%"></span></div>
          </div>`;
        }).join('')}</div>
        <div class="workflow-note" style="margin-top:12px">Exclusion: ${esc((t.exclusions||[]).join(' · '))}</div>
      </div>`;
    }).join('');
  };

  function layerHost(){
    let host=q('layerBoardHost');
    if(!host){
      const table=q('layerTable');
      const parent=table?.closest('.table-scroll') || table?.parentElement;
      if(parent){ parent.innerHTML=''; host=document.createElement('div'); host.id='layerBoardHost'; host.className='layer-board-host'; parent.appendChild(host); }
    }
    return host;
  }

  window.renderLayerTable = function(){
    const host=layerHost(); if(!host) return;
    syncLayerStatusWithTreaties();
    const by={}; (state.layers||[]).forEach((s,i)=>{ (by[s.treatyId]=by[s.treatyId]||[]).push({...s,_idx:i}); });
    host.innerHTML=`<div class="layer-status-board v53-board">${Object.keys(by).map(tid=>{
      const t=treatyById(tid); const color=colorFor(tid);
      const totalLimit=by[tid].reduce((a,s)=>a+num(s.baseLimitEok)+num(s.reinstatedLimitEok),0);
      const totalUsed=by[tid].reduce((a,s)=>a+num(s.paidUsedEok)+num(s.outstandingUsedEok),0);
      return `<div class="program-board v53" style="--treaty-accent:${color}">
        <div class="program-board-title"><div><h3>${esc(t.name)}</h3><span>${esc(t.type)} · ${esc(t.description||'')}</span></div><span class="program-total">총 소진율 ${pctV(totalUsed,totalLimit)}%</span></div>
        ${by[tid].map(s=>{
          const {l}=layerInfo(s); const limit=num(s.baseLimitEok)+num(s.reinstatedLimitEok); const used=num(s.paidUsedEok)+num(s.outstandingUsedEok); const burn=pctV(used,limit); const cls=burn>=80?'danger':burn>=50?'warn':''; const linked=(state.layerClaims||[]).filter(x=>x.statusId===s.statusId);
          return `<div class="layer-control-card v53" data-tip="Lead: ${esc(l.lead||'-')}\n참여사: ${esc(participantsText(l))}\n구간: ${esc(layerRangeText(t,l))}">
            <div class="layer-control-title"><div><strong>${esc(s.layer)}</strong><span>${esc(layerRangeText(t,l))}</span></div><span class="layer-burn-pill ${cls}">${burn}% used</span></div>
            <div class="layer-admin-meta"><span>Lead <b>${esc(l.lead||'-')}</b></span><span>참여사 ${esc(participantsText(l))}</span></div>
            <div class="layer-track-modern"><span style="width:${Math.min(100,burn)}%"></span></div>
            <div class="layer-control-grid">
              <label>Paid 사용액<input id="ly_paid_${s._idx}" type="number" value="${num(s.paidUsedEok)}"/></label>
              <label>Outstanding<input id="ly_os_${s._idx}" type="number" value="${num(s.outstandingUsedEok)}"/></label>
              <label>복원 후 추가한도<input id="ly_re_${s._idx}" type="number" value="${num(s.reinstatedLimitEok)}"/></label>
              <div><button class="save-btn" onclick="saveLayer(${s._idx})">저장</button><br><button onclick="addLayerClaim('${esc(s.statusId)}')" style="margin-top:6px">사고/계약 추가</button></div>
            </div>
            <div class="layer-claims-modern"><b>연결 사고/계약</b><br>${linked.length?linked.map(x=>{const key=esc(x.claimNo||x.policyNo||x.inwardRef||x.manualKey||''); return `<span class="layer-claim-chip modern">${key} · ${esc(x.insured||'')} <button onclick="deleteLayerClaim('${esc(s.statusId)}','${key}')">×</button></span>`;}).join(''):'<span class="mini-msg">연결된 사고/계약 없음</span>'}</div>
          </div>`;
        }).join('')}
      </div>`;
    }).join('')}</div>`;
  };

  window.saveLayer = function(i){
    const s=state.layers[i]; if(!s) return;
    s.paidUsedEok=num(q('ly_paid_'+i)?.value);
    s.outstandingUsedEok=num(q('ly_os_'+i)?.value);
    s.reinstatedLimitEok=num(q('ly_re_'+i)?.value);
    s.updatedBy=(typeof currentUser==='function')?currentUser():'DEMO';
    s.updatedAt=new Date().toISOString().slice(0,16).replace('T',' ');
    if(typeof saveAll==='function') saveAll();
    window.renderLayerTable();
    window.renderDashboard();
  };

  function selectedTreaty(){ return treatyById(q('admTreatySelect')?.value); }
  window.renderReinsuranceAdmin = function(){
    const sel=q('admTreatySelect'); if(!sel) return;
    const treaties=getTreaties();
    const prev=sel.value || treaties[0]?.treatyId || '';
    sel.innerHTML=treaties.map(t=>`<option value="${esc(t.treatyId)}">${esc(t.name)} (${esc(t.treatyId)})</option>`).join('');
    if(treaties.some(t=>t.treatyId===prev)) sel.value=prev;
    loadTreatyAdminForm();
    renderReinsAdminTable();
  };
  window.loadTreatyAdminForm = function(){
    const t=selectedTreaty(); if(!t) return;
    q('admTreatyId').value=t.treatyId;
    q('admTreatyName').value=t.name;
    q('admTreatyType').value=t.type;
    q('admTreatyDesc').value=t.description||'';
    q('admTreatyExcl').value=(t.exclusions||[]).join(', ');
    const ls=q('admLayerSelect');
    if(ls){ ls.innerHTML=(t.layers||[]).map((l,i)=>`<option value="${i}">${esc(l.layer)}</option>`).join(''); ls.value='0'; }
    loadLayerAdminForm();
  };
  window.loadLayerAdminForm = function(){
    const t=selectedTreaty(); if(!t) return;
    const i=Number(q('admLayerSelect')?.value||0); const l=t.layers[i] || {layer:'',from:0,to:0,lead:'',participants:''};
    q('admLayerName').value=l.layer||''; q('admLayerFrom').value=num(l.from); q('admLayerTo').value=num(l.to); q('admLayerLead').value=l.lead||''; q('admLayerParticipants').value=l.participants||defaultParticipants(t.treatyId,l.lead);
  };
  window.saveTreatyAdminProgram = function(){
    const id=q('admTreatyId').value.trim(); if(!id) return alert('프로그램 ID를 입력하세요.');
    let t=getTreaties().find(x=>x.treatyId===id);
    const old=q('admTreatySelect')?.value;
    if(!t){ t={treatyId:id,layers:[]}; getTreaties().push(t); }
    t.treatyId=id; t.name=q('admTreatyName').value.trim()||id; t.type=q('admTreatyType').value.trim()||'XL'; t.description=q('admTreatyDesc').value.trim(); t.exclusions=q('admTreatyExcl').value.split(/[,·]/).map(x=>x.trim()).filter(Boolean);
    saveTreaties(); renderReinsuranceAdmin(); if(q('admTreatySelect')) q('admTreatySelect').value=id; renderTreatyCards(); renderLayerTable(); renderDashboard(); q('admTreatyMsg').innerText='저장되었습니다.';
  };
  window.addTreatyAdminProgram = function(){
    const n=getTreaties().length+1; const id=`TR-${String(n).padStart(2,'0')}`;
    getTreaties().push({treatyId:id,name:'New Reinsurance Program',type:'XL',description:'',exclusions:[],layers:[{layer:'Company Retention',from:0,to:50,lead:'Hanwha GI',participants:'Hanwha GI 100%'}]});
    saveTreaties(); renderReinsuranceAdmin(); q('admTreatySelect').value=id; loadTreatyAdminForm(); renderTreatyCards(); renderLayerTable(); renderDashboard();
  };
  window.deleteTreatyAdminProgram = function(){
    const id=q('admTreatySelect')?.value; if(!id) return; if(!confirm('해당 재보험 프로그램을 삭제할까요? Layer 소진 정보도 함께 정리됩니다.')) return;
    state.treaties=getTreaties().filter(t=>t.treatyId!==id); saveTreaties(); renderReinsuranceAdmin(); renderTreatyCards(); renderLayerTable(); renderDashboard();
  };
  window.saveTreatyAdminLayer = function(){
    const t=selectedTreaty(); if(!t) return;
    const i=Number(q('admLayerSelect')?.value||0); let l=t.layers[i]; if(!l){ l={}; t.layers.push(l); }
    l.layer=q('admLayerName').value.trim()||`Layer ${i+1}`; l.from=num(q('admLayerFrom').value); l.to=num(q('admLayerTo').value); if(l.to<l.from){ const tmp=l.to; l.to=l.from; l.from=tmp; }
    l.lead=q('admLayerLead').value.trim()||'TBD'; l.participants=q('admLayerParticipants').value.trim()||defaultParticipants(t.treatyId,l.lead);
    saveTreaties(); renderReinsuranceAdmin(); renderTreatyCards(); renderLayerTable(); renderDashboard(); q('admLayerMsg').innerText='Layer가 저장되었습니다.';
  };
  window.addTreatyAdminLayer = function(){
    const t=selectedTreaty(); if(!t) return;
    const last=t.layers[t.layers.length-1]; const from=last?num(last.to):0; const to=from+500;
    t.layers.push({layer:`${t.layers.length}th Layer`,from,to,lead:'TBD',participants:'TBD'});
    saveTreaties(); renderReinsuranceAdmin(); q('admLayerSelect').value=String(t.layers.length-1); loadLayerAdminForm(); renderTreatyCards(); renderLayerTable(); renderDashboard();
  };
  window.deleteTreatyAdminLayer = function(){
    const t=selectedTreaty(); if(!t) return; const i=Number(q('admLayerSelect')?.value||0); if(!t.layers[i]) return; if(!confirm('선택한 Layer를 삭제할까요?')) return;
    t.layers.splice(i,1); saveTreaties(); renderReinsuranceAdmin(); renderTreatyCards(); renderLayerTable(); renderDashboard();
  };
  function renderReinsAdminTable(){
    const box=q('reinsAdminTable'); if(!box) return;
    box.innerHTML=getTreaties().map(t=>`<div class="admin-program-row" style="--treaty-accent:${colorFor(t.treatyId)}"><h4>${esc(t.name)} <span>${esc(t.type)}</span></h4><table><thead><tr><th>Layer</th><th>구간</th><th>Lead</th><th>참여사</th></tr></thead><tbody>${(t.layers||[]).map(l=>`<tr><td>${esc(l.layer)}</td><td>${fmtEok(l.from)} ~ ${fmtEok(l.to)}</td><td>${esc(l.lead||'-')}</td><td>${esc(participantsText(l))}</td></tr>`).join('')}</tbody></table></div>`).join('');
  }

  const prevSwitch = window.switchTab;
  window.switchTab = function(tab){
    if(typeof prevSwitch==='function') prevSwitch(tab);
    if(tab==='reinsAdmin') renderReinsuranceAdmin();
    if(tab==='dashboard') renderDashboardLayerV53();
    if(tab==='treaty') renderTreatyCards();
    if(tab==='layer') renderLayerTable();
  };

  window.addEventListener('load',()=>setTimeout(()=>{
    getTreaties(); syncLayerStatusWithTreaties();
    if(q('reinsAdmin')) renderReinsuranceAdmin();
    try{ renderDashboardLayerV53(); renderTreatyCards(); renderLayerTable(); }catch(e){console.warn(e);}
  },2600));
})();

/* ===== v54 patch: PPW=기간계 체결 수재계약 기준 / Layer=기간계 사고계약 기준 ===== */
(function(){
  function q(id){ return document.getElementById(id); }
  function esc(s){ return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function num(v){ return Number(v || 0); }
  function fmtEok(v){ return (typeof eok === 'function') ? eok(num(v)) : `${num(v).toLocaleString()}억원`; }
  function pctV(used, limit){ return Math.round(num(used) / Math.max(1, num(limit)) * 100); }
  function contractRows(){
    try { return (typeof allContracts === 'function' ? allContracts() : (state.contracts && state.contracts.length ? state.contracts : DATA.contracts)) || []; }
    catch(e){ return DATA.contracts || []; }
  }
  function ppwDateOf(c){ return c.ppwDate || c.ppwDueDate || c.ppw || c.renewalDate || ''; }
  state.contractPPW = JSON.parse(localStorage.getItem('gra_v54_contract_ppw') || '{}');
  function ppwInfo(policyNo){ return state.contractPPW[policyNo] || {status:'확인중', owner:'-', updatedAt:''}; }
  function saveContractPPW(){ localStorage.setItem('gra_v54_contract_ppw', JSON.stringify(state.contractPPW || {})); }
  window.officialPPWRows = function(){
    const rows = contractRows().map(c => ({...c, ppwDate: ppwDateOf(c), ppwInfo: ppwInfo(c.policyNo)}));
    return rows.filter(c => {
      const d = c.ppwDate ? dayDiff(c.ppwDate) : 9999;
      return (d >= 0 && d <= 30) || (c.ppwInfo && c.ppwInfo.status && c.ppwInfo.status !== '정상');
    }).sort((a,b)=>dayDiff(a.ppwDate)-dayDiff(b.ppwDate));
  };
  window.ppwRows = window.officialPPWRows;

  window.showDashboardList = function(kind){
    const rows = kind === 'renew' ? (typeof renewRows === 'function' ? renewRows() : []) : window.officialPPWRows();
    let html = `<h3>${kind==='renew'?'30일 이내 갱신계약':'PPW 도래계약'}</h3><div class="table-scroll"><table><thead><tr>`;
    if(kind === 'renew') html += '<th>증권번호</th><th>피보험자</th><th>보험종목</th><th>만기일</th><th>D-Day</th>';
    else html += '<th>증권번호</th><th>피보험자</th><th>보험종목</th><th>PPW</th><th>D-Day</th><th>미수상태</th><th>담당자</th>';
    html += '</tr></thead><tbody>';
    html += rows.slice(0,30).map(r => kind==='renew'
      ? `<tr><td>${esc(r.policyNo)}</td><td>${esc(r.insured)}</td><td>${esc(r.line)}</td><td>${esc(r.renewalDate)}</td><td>D-${dayDiff(r.renewalDate)}</td></tr>`
      : `<tr><td>${esc(r.policyNo)}</td><td>${esc(r.insured)}</td><td>${esc(r.line)}</td><td>${esc(r.ppwDate)}</td><td>D-${dayDiff(r.ppwDate)}</td><td>${esc(r.ppwInfo.status)}</td><td>${esc(r.ppwInfo.owner||'-')}</td></tr>`
    ).join('');
    html += '</tbody></table></div>';
    if(q('dashboardList')) q('dashboardList').innerHTML = html;
  };

  window.renderPPW = function(){
    const tbody = document.querySelector('#ppwTable tbody');
    if(!tbody) return;
    const qstr = (q('ppwSearch')?.value || '').toLowerCase();
    const f = q('ppwStatusFilter')?.value || '전체';
    const rows = window.officialPPWRows().filter(c => (!qstr || JSON.stringify(c).toLowerCase().includes(qstr)) && (f==='전체' || ppwInfo(c.policyNo).status === f));
    const total = Math.max(1, Math.ceil(rows.length / (typeof PAGE !== 'undefined' ? PAGE : 10)));
    state.pages = state.pages || {}; state.pages.ppw = Math.min(state.pages.ppw || 1, total);
    const page = rows.slice((state.pages.ppw-1)*(typeof PAGE !== 'undefined' ? PAGE : 10), state.pages.ppw*(typeof PAGE !== 'undefined' ? PAGE : 10));
    tbody.innerHTML = page.map(c => {
      const info = ppwInfo(c.policyNo);
      return `<tr><td>${esc(c.policyNo)}</td><td>${esc(c.insured)}</td><td>${esc(c.ppwDate)}</td><td>D-${dayDiff(c.ppwDate)}</td><td><select id="recv_${esc(c.policyNo)}"><option ${info.status==='정상'?'selected':''}>정상</option><option ${info.status==='미수'?'selected':''}>미수</option><option ${info.status==='부분입금'?'selected':''}>부분입금</option><option ${info.status==='확인중'?'selected':''}>확인중</option></select></td><td>${esc(c.sourceType || '기간계 체결')}</td><td>${esc(info.owner||'-')}${info.updatedAt?'<br><small>'+esc(info.updatedAt)+'</small>':''}</td><td><button class="save-btn" onclick="savePPW('${esc(c.policyNo)}')">저장</button></td></tr>`;
    }).join('');
    if(q('ppwPage')) q('ppwPage').innerText = `${state.pages.ppw} / ${total}`;
  };
  window.savePPW = function(policyNo){
    const sel = q('recv_' + policyNo);
    if(!sel) return;
    state.contractPPW[policyNo] = {status:sel.value, owner:(typeof currentUser==='function'?currentUser():'DEMO'), updatedAt:new Date().toISOString().slice(0,16).replace('T',' ')};
    saveContractPPW();
    if(typeof saveAll === 'function') saveAll();
    window.renderPPW();
    window.renderDashboard();
  };

  function accidentRows(){ return (state.accidents || []).slice(); }
  function accidentSearch(key){
    const k = String(key || '').trim().toLowerCase();
    if(!k) return null;
    return accidentRows().find(a => String(a.claimNo||'').toLowerCase() === k || String(a.policyNo||'').toLowerCase() === k || String(a.insured||'').toLowerCase().includes(k));
  }
  window.addLayerClaim = function(statusId){
    const key = prompt('연결할 기간계 사고계약을 입력하세요.\n사고번호, 증권번호 또는 피보험자명으로 검색할 수 있습니다.');
    if(!key) return;
    const acc = accidentSearch(key);
    let rec;
    if(acc){
      rec = {statusId, claimNo:acc.claimNo || '', policyNo:acc.policyNo || '', insured:acc.insured || '', paidLossEok:num(acc.paidLossEok), outstandingLossEok:num(acc.outstandingLossEok), sourceType:acc.sourceType || '기간계 사고계약', note:'기간계 사고계약 연결'};
    }else{
      if(!confirm('일치하는 기간계 사고계약을 찾지 못했습니다. 수기 사고계약으로 연결할까요?')) return;
      const insured = prompt('피보험자명을 입력하세요.', key) || key;
      rec = {statusId, claimNo:'MANUAL-' + Date.now(), policyNo:'', insured, paidLossEok:0, outstandingLossEok:0, sourceType:'수기 사고계약', note:'기간계 업로드 전 임시 연결'};
    }
    state.layerClaims = state.layerClaims || [];
    const recKey = rec.claimNo || rec.policyNo || rec.insured;
    if(state.layerClaims.find(x => x.statusId === statusId && (x.claimNo || x.policyNo || x.insured) === recKey)) return alert('이미 연결된 사고계약입니다.');
    state.layerClaims.push(rec);
    if(typeof saveLayerClaims === 'function') saveLayerClaims(); else localStorage.setItem('gra_v37_layer_claims', JSON.stringify(state.layerClaims));
    window.renderLayerTable();
    window.renderDashboard();
  };
  window.deleteLayerClaim = function(statusId, key){
    if(!confirm('연결 사고계약을 삭제할까요?')) return;
    state.layerClaims = (state.layerClaims || []).filter(x => !(x.statusId === statusId && (x.claimNo || x.policyNo || x.insured) === key));
    if(typeof saveLayerClaims === 'function') saveLayerClaims(); else localStorage.setItem('gra_v37_layer_claims', JSON.stringify(state.layerClaims));
    window.renderLayerTable();
    window.renderDashboard();
  };

  function treatyFallbackById(tid){
    if(typeof getTreaties === 'function') return getTreaties().find(t=>t.treatyId===tid) || (DATA.treaties||[]).find(t=>t.treatyId===tid) || {};
    return (DATA.treaties||[]).find(t=>t.treatyId===tid) || {};
  }
  function colorForV(tid){
    if(typeof colorFor === 'function') return colorFor(tid);
    return {'TREATY-PR':'#2563eb','TREATY-CAT':'#059669','TREATY-MARINE':'#7c3aed','TREATY-CAS':'#ea580c'}[tid] || '#2563eb';
  }
  function layerInfoV(s){
    const t = treatyFallbackById(s.treatyId);
    const l = (t.layers||[]).find(x=>x.layer===s.layer) || {layer:s.layer, from:0, to:s.baseLimitEok, lead:'-', participants:'-'};
    return {t,l};
  }
  function renderDashboardLayerV54(){
    const box = q('dashboardLayerBars'); if(!box) return;
    const by = {};
    (state.layers || []).forEach(s => { (by[s.treatyId] = by[s.treatyId] || []).push(s); });
    box.className = 'dashboard-layer-v53 dashboard-layer-v54';
    box.innerHTML = Object.keys(by).map(tid => {
      const t = treatyFallbackById(tid); const color = colorForV(tid);
      const totalLimit = by[tid].reduce((a,s)=>a+num(s.baseLimitEok)+num(s.reinstatedLimitEok),0);
      const totalUsed = by[tid].reduce((a,s)=>a+num(s.paidUsedEok)+num(s.outstandingUsedEok),0);
      const linkCnt = (state.layerClaims||[]).filter(x => by[tid].some(s => s.statusId === x.statusId)).length;
      return `<div class="dash-program-card" style="--treaty-accent:${color}"><div class="dash-program-head"><div><h4>${esc(t.name||tid)}</h4><span>기간계 사고계약 연결 ${linkCnt}건 · 총한도 ${fmtEok(totalLimit)}</span></div><b>${pctV(totalUsed,totalLimit)}%</b></div>${by[tid].map(s=>{ const {l}=layerInfoV(s); const limit=num(s.baseLimitEok)+num(s.reinstatedLimitEok); const used=num(s.paidUsedEok)+num(s.outstandingUsedEok); const burn=pctV(used,limit); const linked=(state.layerClaims||[]).filter(x=>x.statusId===s.statusId); return `<div class="dash-layer-item" data-tip="Lead: ${esc(l.lead||'-')}\n참여사: ${esc(l.participants||'-')}\n연결 사고계약: ${linked.length}건"><div class="dash-layer-head"><span>${esc(s.layer)}</span><b class="burn-pill ${burn>=80?'danger':burn>=50?'warn':''}">${burn}%</b></div><div class="dash-layer-sub">${fmtEok(used)} / ${fmtEok(limit)} · 사고 ${linked.length}건</div><div class="layer-track-modern"><span style="width:${Math.min(100,burn)}%"></span></div></div>`; }).join('')}</div>`;
    }).join('');
  }

  const prevRenderDash = window.renderDashboard;
  window.renderDashboard = function(){
    try{ if(typeof prevRenderDash === 'function') prevRenderDash(); }catch(e){ console.warn(e); }
    const renew = (typeof renewRows === 'function' ? renewRows() : []);
    const ppw = window.officialPPWRows();
    const accidents = accidentRows();
    const top = (state.layers||[]).map(s => ({burn:pctV(num(s.paidUsedEok)+num(s.outstandingUsedEok), num(s.baseLimitEok)+num(s.reinstatedLimitEok))})).sort((a,b)=>b.burn-a.burn)[0];
    const labels = document.querySelectorAll('#dashboard .kpi span');
    if(labels[0]) labels[0].innerText = '30일 이내 갱신계약';
    if(labels[1]) labels[1].innerText = 'PPW 도래계약';
    if(labels[2]) labels[2].innerText = '사고계약 데이터';
    if(labels[3]) labels[3].innerText = '최고 Layer 소진율';
    const ems = document.querySelectorAll('#dashboard .kpi em');
    if(ems[0]) ems[0].innerHTML = '<span class="data-badge">기간계 수재계약</span>';
    if(ems[1]) ems[1].innerHTML = '<span class="data-badge">기간계 체결 수재계약</span>';
    if(ems[2]) ems[2].innerHTML = '<span class="data-badge">기간계 사고계약</span>';
    if(ems[3]) ems[3].innerText = '사고계약 기반 Layer 관리';
    if(q('kpiRenew')) q('kpiRenew').innerText = renew.length + '건';
    if(q('kpiPPW')) q('kpiPPW').innerText = ppw.length + '건';
    if(q('kpiAccident')) q('kpiAccident').innerText = accidents.length + '건';
    if(q('kpiLayer')) q('kpiLayer').innerText = top ? top.burn + '%' : '-';
    if(q('todayTasks')) q('todayTasks').innerHTML = `<div class="card-item" onclick="showDashboardList('ppw')"><b>PPW 도래계약</b><br>기간계 체결 수재계약 기준 ${ppw.length}건 확인 필요</div><div class="card-item" onclick="switchTab('accident')"><b>사고계약 데이터</b><br>재보험 Layer 영향분석 대상 ${accidents.length}건</div><div class="card-item" onclick="showDashboardList('renew')"><b>30일 이내 갱신계약</b><br>기간계 수재계약 기준 ${renew.length}건</div>`;
    renderDashboardLayerV54();
  };

  const prevRenderLayerTable = window.renderLayerTable;
  window.renderLayerTable = function(){
    try{ if(typeof prevRenderLayerTable === 'function') prevRenderLayerTable(); }catch(e){ console.warn(e); }
    document.querySelectorAll('.layer-control-card button').forEach(btn => {
      if((btn.textContent||'').includes('사고/계약') || (btn.textContent||'').includes('수재')) btn.textContent = '사고계약 추가';
    });
    document.querySelectorAll('.layer-claims-modern b, .layer-claim-box b').forEach(b => { b.textContent = '연결 사고계약'; });
    document.querySelectorAll('.layer-claims-modern .mini-msg, .layer-claim-box .mini-msg').forEach(m => { m.textContent = '연결된 사고계약 없음'; });
  };

  const prevSwitch = window.switchTab;
  window.switchTab = function(tab){
    if(typeof prevSwitch === 'function') prevSwitch(tab);
    if(tab === 'dashboard') window.renderDashboard();
    if(tab === 'inward') window.renderPPW();
    if(tab === 'layer') window.renderLayerTable();
  };
  window.addEventListener('load', () => setTimeout(() => { try{ window.renderDashboard(); window.renderPPW(); window.renderLayerTable(); }catch(e){ console.warn(e); } }, 3200));
})();

/* ===== v55: 계약 진행관리 UX 개선 + PPW 7일 기준 알림 ===== */
(function(){
  const q = (id)=>document.getElementById(id);
  const esc = (s)=>String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const num = (v)=>Number(v || 0);
  const nowText = ()=>new Date().toISOString().slice(0,16).replace('T',' ');
  const userText = ()=> (typeof currentUser === 'function' ? currentUser() : (state.user?.empNo || 'DEMO'));
  const fmtEok = (v)=> (typeof eok === 'function' ? eok(num(v)) : `${num(v).toLocaleString()}억원`);
  const DAY_MS = 24*60*60*1000;
  function dateDiff(d){
    if(!d) return 9999;
    try{
      const base = new Date((state.meta?.asOfDate || new Date().toISOString().slice(0,10)) + 'T00:00:00');
      const target = new Date(String(d).slice(0,10) + 'T00:00:00');
      return Math.ceil((target - base)/DAY_MS);
    }catch(e){ return 9999; }
  }
  function rowsOfficialContracts(){
    try{return (typeof allContracts === 'function' ? allContracts() : (state.contracts?.length ? state.contracts : DATA.contracts)) || [];}catch(e){return DATA.contracts || [];}
  }
  function ppwDateOf(c){ return c.ppwDate || c.ppwDueDate || c.ppwDue || c.renewalDate || ''; }
  const PPW_KEY = 'gra_v55_contract_ppw';
  const legacyPPW = (()=>{try{return JSON.parse(localStorage.getItem('gra_v54_contract_ppw') || '{}')}catch(e){return {}}})();
  state.contractPPW = JSON.parse(localStorage.getItem(PPW_KEY) || JSON.stringify(legacyPPW || {}));
  function ppwInfo(policyNo){
    const saved = state.contractPPW?.[policyNo];
    return saved || {status:'정상', owner:'-', updatedAt:''};
  }
  function savePPWStore(){ localStorage.setItem(PPW_KEY, JSON.stringify(state.contractPPW || {})); }
  function isSavedNonNormal(policyNo){
    const saved = state.contractPPW?.[policyNo];
    return !!(saved && saved.status && saved.status !== '정상');
  }
  window.officialPPWRows = function(){
    return rowsOfficialContracts().map(c=>({...c, ppwDate:ppwDateOf(c), ppwInfo:ppwInfo(c.policyNo)})).filter(c=>{
      const d = dateDiff(c.ppwDate);
      return (d >= 0 && d <= 7) || isSavedNonNormal(c.policyNo);
    }).sort((a,b)=>dateDiff(a.ppwDate)-dateDiff(b.ppwDate));
  };
  window.ppwRows = window.officialPPWRows;

  function addStatusHistory(f, status, memo){
    f.statusHistory = f.statusHistory || [];
    f.statusHistory.push({status, by:userText(), at:nowText(), memo:memo || '진행상태 변경'});
    f.statusHistory = f.statusHistory.slice(-30);
  }
  function latestHistory(f){
    const arr = (f?.statusHistory || []).filter(x=>x && x.at);
    if(!arr.length) return {status:f?.reviewStatus||'검토중', by:f?.reviewOwner||f?.owner||'-', at:f?.updatedAt||'-', memo:'-'};
    return arr.slice().sort((a,b)=>String(b.at).localeCompare(String(a.at)))[0];
  }
  function statusClassV55(st){
    if(st==='수재확정') return 'confirm';
    if(st==='인수거절') return 'decline';
    if(st==='기간계 입력완료') return 'inputdone';
    if(st==='조건협의') return 'negotiation';
    if(st==='검토중'||st==='UW 검토요청') return 'review';
    return '';
  }
  function ensureFacWorkflow(){
    (state.fac || []).forEach(f=>{
      f.reviewStatus = f.reviewStatus || '검토중';
      f.reviewOwner = f.reviewOwner || f.owner || userText();
      f.statusHistory = f.statusHistory || [{status:f.reviewStatus, by:f.reviewOwner, at:f.updatedAt || nowText(), memo:'초기 상태'}];
    });
  }
  function facRowsFiltered(){
    ensureFacWorkflow();
    const qv = (q('facSearch')?.value || '').toLowerCase();
    const st = q('facStatusFilter')?.value || '전체';
    return (state.fac || []).filter(f=>{
      const hay = [f.inwardRef, f.intakeNo, f.insured, f.country, f.city, f.line, f.cedant, f.reviewOwner, f.reviewStatus, f.memo, f.confirmNote].join(' ').toLowerCase();
      return (!qv || hay.includes(qv)) && (st === '전체' || f.reviewStatus === st || f.receivableStatus === st);
    });
  }
  function facSummaryHtml(rows){
    const active = rows.filter(f=>!['수재확정','인수거절','기간계 입력완료'].includes(f.reviewStatus)).length;
    const confirmed = rows.filter(f=>f.reviewStatus==='수재확정').length;
    const declined = rows.filter(f=>f.reviewStatus==='인수거절').length;
    const inputDone = rows.filter(f=>f.reviewStatus==='기간계 입력완료').length;
    return `<div class="fac-workspace-summary">
      <div class="summary-card"><span>검토 진행</span><b>${active}건</b><em>접수·검토·조건협의</em></div>
      <div class="summary-card"><span>수재확정</span><b>${confirmed}건</b><em>기간계 입력 전 확정정보</em></div>
      <div class="summary-card"><span>인수거절</span><b>${declined}건</b><em>Decline 사유 축적</em></div>
      <div class="summary-card"><span>기간계 입력완료</span><b>${inputDone}건</b><em>마감 전후 연결</em></div>
    </div>`;
  }
  function ensureInwardUX(){
    const sec = q('inward'); if(!sec) return;
    // 오래된 Slip/Email 패널은 접수 메뉴로 기능을 분리했으므로 화면에서 제거
    const firstPanel = sec.querySelector('.panel');
    if(firstPanel && firstPanel.textContent.includes('수재 오퍼 Slip')) firstPanel.style.display = 'none';
    // 계약 진행관리 검색 바 정리
    const panel = sec.querySelector('#facTable')?.closest('.panel');
    if(panel && !panel.classList.contains('fac-progress-panel')){
      panel.classList.add('fac-progress-panel');
      const h = panel.querySelector('h3'); if(h) h.textContent = '수재계약 입력관리';
      const toolbar = panel.querySelector('.toolbar-row');
      if(toolbar){
        toolbar.classList.add('fac-toolbar-modern');
        const sel = q('facStatusFilter');
        if(sel){ sel.innerHTML = '<option>전체</option><option>접수</option><option>검토중</option><option>UW 검토요청</option><option>조건협의</option><option>수재확정</option><option>인수거절</option><option>기간계 입력완료</option>'; }
      }
      const table = q('facTable'); if(table) table.classList.add('fac-table-modern');
    }
    // 계약 등록 제목 정리
    const regPanel = Array.from(sec.querySelectorAll('.panel')).find(p=>p.textContent.includes('임의수재 계약 등록'));
    if(regPanel){ const h=regPanel.querySelector('h3'); if(h) h.textContent='계약 진행정보 직접 등록'; }
  }
  function ensureIntakeUX(){
    const raw = q('rawIntakeText'); if(raw){
      raw.rows = 6;
      raw.placeholder = '메일 본문 또는 Slip 주요 조건을 붙여넣으세요. 필요한 경우 우측 표준 접수 항목을 직접 수정합니다.';
      const panel = raw.closest('.panel');
      if(panel){
        panel.classList.add('raw-input-compact','intake-source-panel');
        const h = panel.querySelector('h3'); if(h) h.textContent='메일·Slip 원문';
        if(!panel.querySelector('.source-caption')){
          const cap = document.createElement('div'); cap.className='source-caption'; cap.textContent='원문은 감사·검토 근거 보관용입니다. 화면 공간을 줄이기 위해 핵심 항목은 우측 표준 Intake에 정리합니다.';
          h && h.insertAdjacentElement('afterend', cap);
        }
      }
    }
  }

  window.renderFacPPWMini = function(){
    const box = q('facPPWMini'); if(!box) return;
    const rows = window.officialPPWRows().slice(0,6);
    box.innerHTML = `<h4>PPW·미수 알림</h4><div class="mini-msg">조회 기준일로부터 7일 이내 PPW 도래 또는 미수 표시 건만 보여줍니다. 기준: 기간계 체결 수재계약</div>
      <table class="fac-ppw-mini-table"><thead><tr><th>증권번호</th><th>피보험자</th><th>PPW</th><th>D-Day</th><th>미수상태</th><th>담당</th></tr></thead><tbody>${rows.length ? rows.map(c=>{const info=ppwInfo(c.policyNo); return `<tr><td>${esc(c.policyNo)}</td><td>${esc(c.insured)}</td><td>${esc(c.ppwDate)}</td><td>D-${dateDiff(c.ppwDate)}</td><td>${esc(info.status)}</td><td>${esc(info.owner||'-')}</td></tr>`;}).join('') : '<tr><td colspan="6">7일 이내 PPW 도래 또는 미수 표시 건이 없습니다.</td></tr>'}</tbody></table>`;
  };

  window.renderFacTable = function(){
    ensureInwardUX(); ensureFacWorkflow();
    const rows = facRowsFiltered();
    const PAGE_SIZE = (typeof PAGE !== 'undefined' ? PAGE : 10);
    const total = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    state.pages = state.pages || {}; state.pages.fac = Math.min(state.pages.fac || 1, total);
    const page = rows.slice((state.pages.fac-1)*PAGE_SIZE, state.pages.fac*PAGE_SIZE);
    const cnt = q('facCount');
    if(cnt) cnt.innerHTML = `${facSummaryHtml(rows)}<div class="mini-msg">검색 결과 ${rows.length}건 · 기간계 입력 전 오퍼/검토/확정 이력을 관리합니다.</div>`;
    const head = document.querySelector('#facTable thead tr');
    if(head) head.innerHTML = `<th><input type="checkbox" onclick="toggleChecks('.fac-check',this.checked)"/></th><th>관리번호</th><th>Intake</th><th>계약 정보</th><th>위험/보험료</th><th>진행상태</th><th>최근 변경 로그</th><th>처리</th>`;
    const tb = document.querySelector('#facTable tbody');
    if(tb) tb.innerHTML = page.map(f=>{
      const h = latestHistory(f);
      const statuses = ['접수','검토중','UW 검토요청','조건협의','수재확정','인수거절','기간계 입력완료'];
      return `<tr>
        <td><input class="fac-check small-check" type="checkbox" value="${esc(f.inwardRef)}"/></td>
        <td><button class="link-btn" onclick="showFac('${esc(f.inwardRef)}')">${esc(f.inwardRef)}</button></td>
        <td>${esc(f.intakeNo || '-')}<br><small>${esc(f.requestSource || '')}</small></td>
        <td><b>${esc(f.insured || '-')}</b><br><small>${esc(f.country || '-')} / ${esc(f.city || '-')} · ${esc(f.line || '-')} · ${esc(f.cedant || '')}</small></td>
        <td>${fmtEok(f.tsiEok)}<br><small>${esc(f.currency || '')} ${num(f.premiumOriginal).toLocaleString()} · PPW ${esc(f.ppwDate || '-')}</small></td>
        <td><div class="fac-progress-main"><span class="status-pill ${statusClassV55(f.reviewStatus)}">${esc(f.reviewStatus || '검토중')}</span><select id="facst_${esc(f.inwardRef)}" onchange="saveFacStatus('${esc(f.inwardRef)}')">${statuses.map(s=>`<option ${s===(f.reviewStatus||'검토중')?'selected':''}>${s}</option>`).join('')}</select></div></td>
        <td><div class="fac-latest-log"><b>${esc(h.status || '-')}</b><br>${esc(h.by || '-')} · ${esc(h.at || '-')}${h.memo ? '<br>'+esc(h.memo) : ''}</div></td>
        <td><div class="inline-actions"><button onclick="editFacV50('${esc(f.inwardRef)}')">수정</button><button onclick="showFacConfirmPopup('${esc(f.inwardRef)}')">수재노트</button><button class="danger-btn" onclick="deleteFacOneV50('${esc(f.inwardRef)}')">삭제</button></div></td>
      </tr>`;
    }).join('');
    if(q('facPage')) q('facPage').innerText = `${state.pages.fac} / ${total}`;
    window.renderFacPPWMini();
  };

  window.saveFacStatus = function(ref){
    const f = (state.fac || []).find(x=>x.inwardRef === ref); if(!f) return;
    const sel = q('facst_' + ref); const newStatus = sel?.value || f.reviewStatus;
    if(newStatus === f.reviewStatus) return;
    if(!confirm(`${f.insured}의 진행상태를 [${f.reviewStatus}]에서 [${newStatus}]로 변경할까요?`)){ window.renderFacTable(); return; }
    f.reviewStatus = newStatus;
    f.reviewOwner = userText();
    f.updatedAt = nowText();
    addStatusHistory(f, newStatus, '목록에서 진행상태 변경');
    if(typeof saveAll === 'function') saveAll();
    window.renderFacTable();
    if(typeof renderDashboard === 'function') renderDashboard();
    if(newStatus === '수재확정' && typeof showFacConfirmPopup === 'function') showFacConfirmPopup(ref);
  };

  window.renderPPW = function(){
    const tbody = document.querySelector('#ppwTable tbody'); if(!tbody) return;
    const qstr = (q('ppwSearch')?.value || '').toLowerCase();
    const st = q('ppwStatusFilter')?.value || '전체';
    const rows = window.officialPPWRows().filter(c => (!qstr || JSON.stringify(c).toLowerCase().includes(qstr)) && (st==='전체' || ppwInfo(c.policyNo).status === st));
    const PAGE_SIZE = (typeof PAGE !== 'undefined' ? PAGE : 10);
    const total = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    state.pages = state.pages || {}; state.pages.ppw = Math.min(state.pages.ppw || 1, total);
    const page = rows.slice((state.pages.ppw-1)*PAGE_SIZE, state.pages.ppw*PAGE_SIZE);
    const head = document.querySelector('#ppwTable thead tr');
    if(head) head.innerHTML = '<th>증권번호</th><th>피보험자</th><th>보험종목</th><th>PPW</th><th>D-Day</th><th>미수상태</th><th>미수 담당자</th><th>저장</th>';
    tbody.innerHTML = page.map(c=>{ const info = ppwInfo(c.policyNo); return `<tr><td>${esc(c.policyNo)}</td><td>${esc(c.insured)}</td><td>${esc(c.line)}</td><td>${esc(c.ppwDate)}</td><td>D-${dateDiff(c.ppwDate)}</td><td><select id="recv_${esc(c.policyNo)}"><option ${info.status==='정상'?'selected':''}>정상</option><option ${info.status==='미수'?'selected':''}>미수</option><option ${info.status==='부분입금'?'selected':''}>부분입금</option><option ${info.status==='확인중'?'selected':''}>확인중</option></select></td><td>${esc(info.owner||'-')}${info.updatedAt?'<br><small>'+esc(info.updatedAt)+'</small>':''}</td><td><button class="save-btn" onclick="savePPW('${esc(c.policyNo)}')">저장</button></td></tr>`; }).join('');
    if(q('ppwPage')) q('ppwPage').innerText = `${state.pages.ppw} / ${total}`;
    window.renderFacPPWMini();
  };

  window.savePPW = function(policyNo){
    const sel = q('recv_' + policyNo); if(!sel) return;
    state.contractPPW = state.contractPPW || {};
    state.contractPPW[policyNo] = {status:sel.value, owner:userText(), updatedAt:nowText()};
    savePPWStore();
    if(typeof saveAll === 'function') saveAll();
    window.renderPPW();
    window.renderFacPPWMini();
    if(typeof renderDashboard === 'function') renderDashboard();
  };

  window.showDashboardList = function(kind){
    const rows = kind === 'renew' ? (typeof renewRows === 'function' ? renewRows() : []) : window.officialPPWRows();
    let html = `<h3>${kind==='renew'?'30일 이내 갱신계약':'PPW 도래·미수 계약'}</h3><div class="table-scroll"><table><thead><tr>`;
    html += kind === 'renew' ? '<th>증권번호</th><th>피보험자</th><th>보험종목</th><th>만기일</th><th>D-Day</th>' : '<th>증권번호</th><th>피보험자</th><th>보험종목</th><th>PPW</th><th>D-Day</th><th>미수상태</th><th>담당자</th>';
    html += '</tr></thead><tbody>' + rows.slice(0,30).map(r => kind === 'renew'
      ? `<tr><td>${esc(r.policyNo)}</td><td>${esc(r.insured)}</td><td>${esc(r.line)}</td><td>${esc(r.renewalDate)}</td><td>D-${dateDiff(r.renewalDate)}</td></tr>`
      : `<tr><td>${esc(r.policyNo)}</td><td>${esc(r.insured)}</td><td>${esc(r.line)}</td><td>${esc(r.ppwDate)}</td><td>D-${dateDiff(r.ppwDate)}</td><td>${esc(ppwInfo(r.policyNo).status)}</td><td>${esc(ppwInfo(r.policyNo).owner||'-')}</td></tr>`
    ).join('') + '</tbody></table></div>';
    const box = q('dashboardList'); if(box) box.innerHTML = html;
  };

  const previousDashboard = window.renderDashboard;
  window.renderDashboard = function(){
    try{ if(typeof previousDashboard === 'function') previousDashboard(); }catch(e){ console.warn(e); }
    const ppw = window.officialPPWRows();
    if(q('kpiPPW')) q('kpiPPW').innerText = ppw.length + '건';
    const kpis = document.querySelectorAll('#dashboard .kpi');
    if(kpis[1]) kpis[1].onclick = ()=>showDashboardList('ppw');
    const ems = document.querySelectorAll('#dashboard .kpi em');
    if(ems[1]) ems[1].innerHTML = '<span class="data-badge">기간계 체결 수재계약 · 7일 이내</span>';
    const task = q('todayTasks');
    if(task){
      const active = (state.fac || []).filter(f=>!['수재확정','인수거절','기간계 입력완료'].includes(f.reviewStatus)).length;
      const acc = state.accidents ? state.accidents.length : 0;
      task.innerHTML = `<div class="card-item" onclick="switchTab('inward')"><b>계약 진행관리</b><br>검토 중 오퍼 ${active}건</div><div class="card-item" onclick="showDashboardList('ppw')"><b>PPW 도래·미수</b><br>7일 이내 또는 미수 표시 ${ppw.length}건</div><div class="card-item" onclick="switchTab('accident')"><b>사고계약 데이터</b><br>재보험 Layer 영향분석 대상 ${acc}건</div>`;
    }
  };

  const prevSwitch = window.switchTab;
  window.switchTab = function(tab){
    if(typeof prevSwitch === 'function') prevSwitch(tab);
    if(tab === 'intake') ensureIntakeUX();
    if(tab === 'inward') { ensureInwardUX(); window.renderFacTable(); window.renderPPW(); }
    if(tab === 'dashboard') window.renderDashboard();
  };

  window.addEventListener('load', ()=>setTimeout(()=>{
    ensureIntakeUX(); ensureInwardUX();
    try{ window.renderFacTable(); window.renderPPW(); window.renderDashboard(); }catch(e){ console.warn('[v55]', e); }
  }, 3600));
})();

/* ===== v56: 해외수재 클레임 화면 재구성 ===== */
state.selectedClaimAccident = state.selectedClaimAccident || null;

function findContractByPolicyNo(policyNo){
  return (state.contracts || DATA.contracts || []).find(c => c.policyNo === policyNo) || null;
}
function claimGross(c){ return Number(c?.grossLossEok || 0) || (Number(c?.paidLossEok||0)+Number(c?.outstandingLossEok||0)); }
function claimDateValue(c){ return c.claimDate || c.lossDate || c.accidentDate || c.date || ''; }
function getSelectedAccident(){
  const key = state.selectedClaimAccident;
  if(!key) return null;
  return (state.accidents || []).find(a => a.claimNo === key) || null;
}
function updateSelectedClaimSummary(acc){
  const box = document.getElementById('icSelectedAccident');
  const policyView = document.getElementById('icPolicyView');
  const insuredView = document.getElementById('icInsuredView');
  const claimView = document.getElementById('icClaimView');
  const grossView = document.getElementById('icGrossView');
  if(!box) return;
  if(!acc){
    box.innerHTML = '기간계 체결 수재계약을 선택하면 증권번호 기준으로 수재계약 정보와 사고금액이 표시됩니다.';
    if(policyView) policyView.innerText = '-';
    if(insuredView) insuredView.innerText = '-';
    if(claimView) claimView.innerText = '-';
    if(grossView) grossView.innerText = '-';
    return;
  }
  const c = findContractByPolicyNo(acc.policyNo);
  if(policyView) policyView.innerText = acc.policyNo || '-';
  if(insuredView) insuredView.innerText = acc.insured || c?.insured || '-';
  if(claimView) claimView.innerText = acc.claimNo || '-';
  if(grossView) grossView.innerText = eok(claimGross(acc));
  box.innerHTML = `<div class="claim-selected-strong">선택된 사고계약: ${acc.claimNo || '-'}</div>
    <div class="claim-auto-note">증권번호 <b>${acc.policyNo || '-'}</b> 기준으로 ${c ? '기간계 수재계약 정보가 연결되었습니다.' : '기간계 수재계약 정보는 별도 확인이 필요합니다.'}</div>
    <div class="claim-auto-note">피보험자 ${acc.insured || c?.insured || '-'} · 보험종목 ${acc.line || c?.line || '-'} · 사고유형 ${acc.cause || '-'} · Gross ${eok(claimGross(acc))}</div>`;
}
function renderClaimAccidentSearch(){
  const holder = document.getElementById('icAccidentResults');
  if(!holder) return;
  const q = (document.getElementById('icAccidentSearch')?.value || '').toLowerCase();
  const st = document.getElementById('icAccidentStatus')?.value || '전체';
  let rows = (state.accidents || [])
    .filter(a => (!q || JSON.stringify(a).toLowerCase().includes(q)) && (st === '전체' || a.status === st))
    .sort((a,b)=>claimGross(b)-claimGross(a))
    .slice(0,36);
  holder.innerHTML = rows.map(a => {
    const c = findContractByPolicyNo(a.policyNo);
    const active = state.selectedClaimAccident === a.claimNo ? ' active' : '';
    return `<div class="claim-source-card${active}" onclick="selectClaimAccident('${a.claimNo}')">
      <div class="rowtop"><h4>${a.claimNo || '-'}</h4><span class="status-chip">${a.status || '-'}</span></div>
      <small>증권번호 ${a.policyNo || '-'} · ${a.insured || c?.insured || '-'}</small>
      <small>${a.line || c?.line || '-'} · ${a.country || c?.country || '-'} / ${a.city || c?.city || '-'} · 사고일 ${claimDateValue(a) || '-'}</small>
      <div class="claim-amount">${eok(claimGross(a))}</div>
    </div>`;
  }).join('') || '<div class="mini-msg">조회된 기간계 사고계약 데이터가 없습니다. 관리자 메뉴에서 사고계약 데이터를 업로드하세요.</div>';
  updateSelectedClaimSummary(getSelectedAccident());
}
function renderClaimContractSearch(){ renderClaimAccidentSearch(); }
function selectClaimAccident(claimNo){
  const acc = (state.accidents || []).find(a => a.claimNo === claimNo);
  if(!acc) return alert('사고계약 데이터를 찾지 못했습니다.');
  state.selectedClaimAccident = claimNo;
  const c = findContractByPolicyNo(acc.policyNo);
  const set = (id, val) => { const el = document.getElementById(id); if(el) el.value = val ?? ''; };
  set('icClaimNo', acc.claimNo || '');
  set('icPolicyNo', acc.policyNo || '');
  set('icCause', acc.cause || '');
  set('icLossDate', claimDateValue(acc) || '');
  set('icDate', DATA.meta.asOfDate || new Date().toISOString().slice(0,10));
  set('icPaid', Number(acc.paidLossEok || 0));
  set('icOS', Number(acc.outstandingLossEok || 0));
  set('icLoss', claimGross(acc));
  set('icStatus', acc.status === '종결' ? '종결' : '접수');
  set('icOwner', currentUser());
  set('icDesc', `기간계 사고계약 기준 접수. ${acc.insured || c?.insured || ''} / ${acc.cause || ''} / ${acc.policyNo || ''}`);
  updateSelectedClaimSummary(acc);
  renderClaimAccidentSearch();
  const msg = document.getElementById('icMsg');
  if(msg) msg.innerText = `${acc.claimNo} 선택 완료. 필요 정보를 보완한 후 클레임 저장하세요.`;
}
function clearClaimForm(){
  if(!confirm('입력 중인 클레임 처리정보를 초기화할까요?')) return;
  state.selectedClaimAccident = null;
  ['icClaimNo','icPolicyNo','icCause','icLossDate','icDate','icPaid','icOS','icLoss','icOwner','icDesc'].forEach(id=>{const el=document.getElementById(id); if(el) el.value='';});
  const st=document.getElementById('icStatus'); if(st) st.value='접수';
  updateSelectedClaimSummary(null);
  renderClaimAccidentSearch();
}
function registerInwardClaim(){
  const acc = getSelectedAccident();
  if(!acc) return alert('먼저 기간계 사고계약 데이터를 선택하세요.');
  const claimNo = (document.getElementById('icClaimNo')?.value || acc.claimNo || '').trim();
  const policyNo = (document.getElementById('icPolicyNo')?.value || acc.policyNo || '').trim();
  const c = findContractByPolicyNo(policyNo);
  if(!claimNo || !policyNo) return alert('사고번호와 증권번호는 필수입니다.');
  const existingIdx = state.inwardClaims.findIndex(x => x.claimNo === claimNo);
  const message = existingIdx >= 0 ? `${claimNo} 클레임 정보를 수정 저장할까요?` : `${claimNo} 클레임을 Queue에 저장할까요?`;
  if(!confirm(message)) return;
  const row = {
    claimNo,
    policyNo,
    sourceClaimNo: acc.claimNo,
    inwardRef: policyNo,
    insured: acc.insured || c?.insured || '',
    cedant: acc.cedant || c?.cedant || '',
    line: acc.line || c?.line || '',
    country: acc.country || c?.country || '',
    city: acc.city || c?.city || '',
    cause: document.getElementById('icCause')?.value || acc.cause || '',
    claimDate: document.getElementById('icLossDate')?.value || claimDateValue(acc) || '',
    noticeDate: document.getElementById('icDate')?.value || DATA.meta.asOfDate,
    paidLossEok: Number(document.getElementById('icPaid')?.value || acc.paidLossEok || 0),
    outstandingLossEok: Number(document.getElementById('icOS')?.value || acc.outstandingLossEok || 0),
    estimatedLossEok: Number(document.getElementById('icLoss')?.value || claimGross(acc) || 0),
    grossLossEok: Number(document.getElementById('icLoss')?.value || claimGross(acc) || 0),
    status: document.getElementById('icStatus')?.value || '접수',
    owner: document.getElementById('icOwner')?.value || currentUser(),
    surveyStatus: '미등록',
    memo: document.getElementById('icDesc')?.value || '',
    sourceType: '기간계 사고계약 기반',
    updatedBy: currentUser(),
    updatedAt: new Date().toISOString().slice(0,16).replace('T',' ')
  };
  if(existingIdx >= 0) state.inwardClaims.splice(existingIdx,1,row);
  else state.inwardClaims.unshift(row);
  state.selectedIC = claimNo;
  saveAll();
  renderInwardClaims();
  const msg = document.getElementById('icMsg');
  if(msg) msg.innerText = `${claimNo} 저장 완료`;
}
function renderInwardClaims(){
  renderClaimAccidentSearch();
  const q = (document.getElementById('icQueueSearch')?.value || '').toLowerCase();
  const st = document.getElementById('icQueueStatus')?.value || '전체';
  const rows = (state.inwardClaims || [])
    .filter(c => (!q || JSON.stringify(c).toLowerCase().includes(q)) && (st === '전체' || c.status === st))
    .slice(0,120);
  const tbody = document.querySelector('#icTable tbody');
  if(!tbody) return;
  tbody.innerHTML = rows.map(c => `<tr>
    <td><input class="ic-check small-check" type="checkbox" value="${c.claimNo}"/></td>
    <td>${c.claimNo || '-'}</td>
    <td>${c.policyNo || c.inwardRef || '-'}</td>
    <td>${c.insured || '-'}</td>
    <td>${c.cause || '-'}</td>
    <td>${eok(c.paidLossEok||0)} / ${eok(c.outstandingLossEok||0)}</td>
    <td>${c.status || '-'}<br><small>${c.updatedAt || c.sourceType || ''}</small></td>
    <td><button class="save-btn" onclick="selectInwardClaim('${c.claimNo}')">선택</button></td>
  </tr>`).join('') || '<tr><td colspan="8">등록된 해외수재 클레임이 없습니다.</td></tr>';
}
function selectInwardClaim(no){
  const c = (state.inwardClaims || []).find(x => x.claimNo === no);
  if(!c) return alert('클레임을 찾지 못했습니다.');
  state.selectedIC = no;
  const acc = (state.accidents || []).find(a => a.claimNo === c.sourceClaimNo || a.claimNo === c.claimNo || a.policyNo === c.policyNo);
  if(acc) state.selectedClaimAccident = acc.claimNo;
  const set = (id, val) => { const el = document.getElementById(id); if(el) el.value = val ?? ''; };
  set('icClaimNo', c.claimNo || ''); set('icPolicyNo', c.policyNo || c.inwardRef || ''); set('icCause', c.cause || '');
  set('icLossDate', c.claimDate || ''); set('icDate', c.noticeDate || ''); set('icPaid', Number(c.paidLossEok || 0)); set('icOS', Number(c.outstandingLossEok || 0)); set('icLoss', Number(c.estimatedLossEok || c.grossLossEok || 0)); set('icStatus', c.status || '접수'); set('icOwner', c.owner || ''); set('icDesc', c.memo || '');
  updateSelectedClaimSummary(acc || {claimNo:c.claimNo, policyNo:c.policyNo || c.inwardRef, insured:c.insured, cause:c.cause, paidLossEok:c.paidLossEok, outstandingLossEok:c.outstandingLossEok, grossLossEok:c.estimatedLossEok, status:c.status});
  const box = document.getElementById('surveySummary');
  if(box) box.innerHTML = `<b>${c.claimNo} 선택됨</b><br>증권번호 ${c.policyNo || c.inwardRef || '-'} / ${c.insured || '-'}<br>Paid/OS ${eok(c.paidLossEok||0)} / ${eok(c.outstandingLossEok||0)}<br>서베이리포트 업로드 후 AI 요약을 실행하세요.`;
  renderClaimAccidentSearch();
}
function deleteSelectedInwardClaims(){
  const ids = [...document.querySelectorAll('.ic-check:checked')].map(x=>x.value);
  if(!ids.length) return alert('삭제할 클레임을 선택하세요.');
  if(!confirm(`선택한 클레임 ${ids.length}건을 삭제할까요?`)) return;
  state.inwardClaims = state.inwardClaims.filter(c => !ids.includes(c.claimNo));
  if(ids.includes(state.selectedIC)) state.selectedIC = null;
  saveAll(); renderInwardClaims();
}
async function summarizeSurvey(){
  const c = (state.inwardClaims || []).find(x=>x.claimNo===state.selectedIC);
  if(!c) return alert('먼저 클레임 Queue에서 클레임을 선택하거나 저장하세요.');
  const file = document.getElementById('surveyFile')?.files?.[0];
  let extracted = '';
  let msg = '';
  if(file && typeof extractFileText === 'function'){
    const result = await extractFileText(file);
    extracted = result.text || '';
    msg = result.message || '';
  }
  const base = `<b>AI 서베이리포트 요약</b><br>대상: ${c.claimNo} / ${c.policyNo || c.inwardRef || '-'} / ${c.insured}<br>사고유형: ${c.cause}<br>Paid/OS: ${eok(c.paidLossEok||0)} / ${eok(c.outstandingLossEok||0)}<br>`;
  const detail = extracted ? summarizeText(extracted, file.name) : `서베이리포트 원문이 없으므로 등록된 사고정보 기준으로 요약합니다.<br>① 사고원인: ${c.cause || '확인 필요'}<br>② 손상범위: 서베이리포트 확인 필요<br>③ 손해액: 추산 ${eok(c.estimatedLossEok || c.grossLossEok || 0)}<br>④ 추가 요청자료: 원인조사보고서, 사진, 복구견적서, 최종 손해사정서`;
  const box = document.getElementById('surveySummary');
  if(box) box.innerHTML = `${base}${msg?`<small>${msg}</small><br>`:''}${detail}<br><br><b>업무 체크</b><br>증권번호 기준 on-risk 여부, 담보·면책, 사고금액 산정근거, 재보험 통보 필요 여부를 확인하세요.`;
  const idx = state.inwardClaims.findIndex(x=>x.claimNo===c.claimNo);
  if(idx>=0){ state.inwardClaims[idx].surveyStatus = '요약완료'; state.inwardClaims[idx].surveySummary = box?.innerText || ''; saveAll(); renderInwardClaims(); }
}
function draftClaimMemo(){
  const c = (state.inwardClaims || []).find(x=>x.claimNo===state.selectedIC);
  if(!c) return alert('먼저 클레임을 선택하세요.');
  const contract = findContractByPolicyNo(c.policyNo || c.inwardRef);
  const box = document.getElementById('surveySummary');
  if(box) box.innerHTML = `<b>클레임 처리메모 초안</b><br>
  1) 대상계약: ${c.policyNo || c.inwardRef || '-'} / ${c.insured} / ${contract?.line || c.line || '-'}<br>
  2) 사고개요: ${c.claimDate || '-'} 발생 ${c.cause || '사고'} 건, 추산손해액 ${eok(c.estimatedLossEok || c.grossLossEok || 0)}<br>
  3) 확인사항: 보험기간 내 사고 여부, 담보/면책, 자기부담금, 손해액 산정근거, 출재사 통보자료<br>
  4) 재보험 검토: 사고계약 데이터 기준으로 영향 재보험 프로그램 및 Layer 소진 여부 확인 필요<br>
  5) 요청자료: 서베이리포트 원문, 사진, 원인조사보고서, 복구견적서, 최종 손해사정서`;
}
window.addEventListener('load', () => setTimeout(() => { renderClaimAccidentSearch(); renderInwardClaims(); }, 900));

/* ===== v57: 해외수재 클레임 - 기간계 체결 수재계약 기준 등록/수정 ===== */
(function(){
  state.selectedClaimPolicyNo = state.selectedClaimPolicyNo || null;

  function el(id){ return document.getElementById(id); }
  function safeText(v){ return (v===undefined || v===null || v==='') ? '-' : String(v); }
  function grossClaim(c){ return Number(c?.grossLossEok || c?.estimatedLossEok || 0) || (Number(c?.paidLossEok||0)+Number(c?.outstandingLossEok||0)); }
  function getContractsForClaim(){ return (state.contracts && state.contracts.length ? state.contracts : (DATA.contracts||[])); }
  function getSelectedContract(){ return getContractsForClaim().find(c => c.policyNo === state.selectedClaimPolicyNo) || null; }
  function claimRowsForPolicy(policyNo){ return (state.inwardClaims || []).filter(c => (c.policyNo || c.inwardRef) === policyNo); }
  function latestClaimForPolicy(policyNo){ return claimRowsForPolicy(policyNo).slice().sort((a,b)=>String(b.updatedAt||b.noticeDate||'').localeCompare(String(a.updatedAt||a.noticeDate||'')))[0] || null; }
  function nextInwardClaimNo(){
    const n = (state.inwardClaims || []).filter(c => String(c.claimNo||'').startsWith('ICL-USER')).length + 1;
    return 'ICL-USER-' + String(n).padStart(4,'0');
  }
  function setVal(id, val){ const x=el(id); if(x) x.value = val ?? ''; }
  function claimFormData(contract){
    const paid = Number(el('icPaid')?.value || 0), os = Number(el('icOS')?.value || 0), est = Number(el('icLoss')?.value || (paid+os));
    return {
      claimNo: (el('icClaimNo')?.value || '').trim() || nextInwardClaimNo(),
      policyNo: (el('icPolicyNo')?.value || contract?.policyNo || '').trim(),
      inwardRef: (el('icPolicyNo')?.value || contract?.policyNo || '').trim(),
      insured: contract?.insured || '',
      cedant: contract?.cedant || '',
      line: contract?.line || '',
      country: contract?.country || '',
      city: contract?.city || '',
      cause: el('icCause')?.value || '',
      claimDate: el('icLossDate')?.value || '',
      noticeDate: el('icDate')?.value || '',
      paidLossEok: paid,
      outstandingLossEok: os,
      estimatedLossEok: est,
      grossLossEok: est,
      portalStatus: el('icPortalStatus')?.value || '미등록',
      status: el('icStatus')?.value || '접수',
      owner: el('icOwner')?.value || (typeof currentUser === 'function' ? currentUser() : 'DEMO'),
      memo: el('icDesc')?.value || '',
      surveyStatus: '미등록',
      sourceType: '기간계 수재계약 기반',
      updatedBy: typeof currentUser === 'function' ? currentUser() : 'DEMO',
      updatedAt: new Date().toISOString().slice(0,16).replace('T',' ')
    };
  }

  window.updateSelectedClaimSummary = function(contract, claim){
    const box=el('icSelectedAccident'), p=el('icPolicyView'), i=el('icInsuredView'), cn=el('icClaimView'), g=el('icGrossView');
    if(!box) return;
    if(!contract){
      box.innerHTML='기간계 체결 수재계약을 선택하면 증권번호 기준으로 계약정보와 기존 클레임 등록여부가 표시됩니다.';
      if(p) p.innerText='-'; if(i) i.innerText='-'; if(cn) cn.innerText='-'; if(g) g.innerText='-';
      return;
    }
    const claimCount = claimRowsForPolicy(contract.policyNo).length;
    if(p) p.innerText = contract.policyNo || '-';
    if(i) i.innerText = contract.insured || '-';
    if(cn) cn.innerText = claim?.claimNo || (claimCount ? claimCount + '건 등록' : '미등록');
    if(g) g.innerText = claim ? eok(grossClaim(claim)) : '-';
    box.innerHTML = `<div class="claim-selected-strong">선택된 기간계 수재계약: ${contract.policyNo || '-'}</div>
      <div class="claim-auto-note">${contract.insured || '-'} · ${contract.country || '-'} / ${contract.city || '-'} · ${contract.line || '-'}</div>
      <div class="claim-auto-note">가입금액 ${eok(contract.tsiEok || 0)} · 보험료 ${eok(contract.premiumEok || 0)} · 클레임 등록 ${claimCount}건</div>
      <div class="claim-auto-note">이 화면에서 정리한 내용은 내부 기간계 포털의 수재사고 입력 전 검토자료로 활용합니다.</div>`;
  };

  window.renderClaimContractSearch = function(){
    const holder=el('icContractResults') || el('icAccidentResults');
    if(!holder) return;
    const q=(el('icContractSearch')?.value || el('icAccidentSearch')?.value || '').toLowerCase();
    const line=el('icContractLine')?.value || '전체';
    const rows = getContractsForClaim()
      .filter(c => (!q || JSON.stringify(c).toLowerCase().includes(q)) && (line==='전체' || c.line===line))
      .sort((a,b)=>String(a.policyNo).localeCompare(String(b.policyNo))).slice(0,48);
    holder.innerHTML = rows.map(c => {
      const claims=claimRowsForPolicy(c.policyNo);
      const latest=claims[0];
      const active = state.selectedClaimPolicyNo === c.policyNo ? ' active' : '';
      const portal = latest?.portalStatus || '미등록';
      return `<div class="claim-source-card${active}" onclick="selectClaimContract('${c.policyNo}')">
        <div class="rowtop"><h4>${c.policyNo || '-'}</h4><span class="status-chip ${claims.length?'ok-chip':''}">${portal}</span></div>
        <small>${c.insured || '-'} · ${c.line || '-'} · ${c.country || '-'} / ${c.city || '-'}</small>
        <small>가입금액 ${eok(c.tsiEok || 0)} · 보험료 ${eok(c.premiumEok || 0)} · 만기 ${c.renewalDate || '-'}</small>
        <div class="claim-amount">클레임 ${claims.length}건</div>
      </div>`;
    }).join('') || '<div class="mini-msg">조회된 기간계 체결 수재계약이 없습니다. 관리자 메뉴에서 수재계약 데이터를 업로드하세요.</div>';
    updateSelectedClaimSummary(getSelectedContract(), latestClaimForPolicy(state.selectedClaimPolicyNo));
  };
  window.renderClaimAccidentSearch = window.renderClaimContractSearch;

  window.selectClaimContract = function(policyNo){
    const c = getContractsForClaim().find(x=>x.policyNo===policyNo);
    if(!c) return alert('기간계 수재계약 데이터를 찾지 못했습니다.');
    state.selectedClaimPolicyNo = policyNo;
    const claim = latestClaimForPolicy(policyNo);
    setVal('icPolicyNo', c.policyNo || '');
    setVal('icClaimNo', claim?.claimNo || '');
    setVal('icCause', claim?.cause || '');
    setVal('icLossDate', claim?.claimDate || '');
    setVal('icDate', claim?.noticeDate || (DATA.meta?.asOfDate || new Date().toISOString().slice(0,10)));
    setVal('icPaid', Number(claim?.paidLossEok || 0));
    setVal('icOS', Number(claim?.outstandingLossEok || 0));
    setVal('icLoss', Number(claim?.estimatedLossEok || claim?.grossLossEok || 0));
    setVal('icPortalStatus', claim?.portalStatus || '미등록');
    setVal('icStatus', claim?.status || '접수');
    setVal('icOwner', claim?.owner || (typeof currentUser === 'function' ? currentUser() : 'DEMO'));
    setVal('icDesc', claim?.memo || `기간계 수재계약 기준 클레임 검토. ${c.insured || ''} / ${c.policyNo || ''}`);
    state.selectedIC = claim?.claimNo || null;
    updateSelectedClaimSummary(c, claim);
    renderClaimContractSearch();
    const msg=el('icMsg'); if(msg) msg.innerText = claim ? `${claim.claimNo} 기존 클레임 정보를 불러왔습니다.` : `${c.policyNo} 선택 완료. 사고정보를 입력한 후 저장하세요.`;
  };
  window.selectClaimAccident = function(key){ return window.selectClaimContract(key); };

  window.clearClaimForm = function(){
    if(!confirm('입력 중인 클레임 정보를 초기화할까요?')) return;
    state.selectedIC=null;
    ['icClaimNo','icPolicyNo','icCause','icLossDate','icDate','icPaid','icOS','icLoss','icOwner','icDesc'].forEach(id=>setVal(id,''));
    setVal('icPortalStatus','미등록'); setVal('icStatus','접수');
    updateSelectedClaimSummary(null,null);
    renderClaimContractSearch();
  };

  window.registerInwardClaim = function(){
    const contract = getSelectedContract() || findContractByPolicyNo(el('icPolicyNo')?.value || '');
    if(!contract) return alert('먼저 기간계 체결 수재계약을 선택하세요.');
    const row = claimFormData(contract);
    if(!row.policyNo) return alert('증권번호는 필수입니다.');
    const idx = (state.inwardClaims || []).findIndex(x => x.claimNo === row.claimNo);
    const msg = idx>=0 ? `${row.claimNo} 클레임 정보를 수정 저장할까요?` : `${contract.policyNo} 기준 클레임 정보를 신규 저장할까요?`;
    if(!confirm(msg)) return;
    state.inwardClaims = state.inwardClaims || [];
    if(idx>=0) state.inwardClaims.splice(idx,1,Object.assign({}, state.inwardClaims[idx], row)); else state.inwardClaims.unshift(row);
    state.selectedIC = row.claimNo; state.selectedClaimPolicyNo = row.policyNo;
    saveAll(); renderInwardClaims(); renderClaimContractSearch(); updateSelectedClaimSummary(contract,row);
    const m=el('icMsg'); if(m) m.innerText = `${row.claimNo} 저장 완료 · 기간계 입력상태: ${row.portalStatus}`;
  };

  window.renderInwardClaims = function(){
    renderClaimContractSearch();
    const q=(el('icQueueSearch')?.value || '').toLowerCase();
    const filter=el('icQueueStatus')?.value || '전체';
    const rows=(state.inwardClaims || []).filter(c => (!q || JSON.stringify(c).toLowerCase().includes(q)) && (filter==='전체' || (c.portalStatus||'미등록')===filter)).slice(0,120);
    const tbody=document.querySelector('#icTable tbody'); if(!tbody) return;
    tbody.innerHTML = rows.map(c=>`<tr>
      <td><input class="ic-check small-check" type="checkbox" value="${c.claimNo}"/></td>
      <td>${c.claimNo || '-'}</td>
      <td>${c.policyNo || c.inwardRef || '-'}</td>
      <td>${c.insured || '-'}</td>
      <td>${c.cause || '-'}</td>
      <td>${eok(c.paidLossEok||0)} / ${eok(c.outstandingLossEok||0)}</td>
      <td><select class="inline-status" onchange="updateClaimPortalStatus('${c.claimNo}', this.value)">
        ${['미등록','입력준비','기간계 입력완료','추가확인 필요','입력제외'].map(s=>`<option ${s===(c.portalStatus||'미등록')?'selected':''}>${s}</option>`).join('')}
      </select><br><small>${c.updatedBy || ''} ${c.updatedAt || ''}</small></td>
      <td><select class="inline-status" onchange="updateClaimWorkStatus('${c.claimNo}', this.value)">
        ${['접수','검토중','서베이 검토','추가자료 요청','재보험 검토','종결'].map(s=>`<option ${s===(c.status||'접수')?'selected':''}>${s}</option>`).join('')}
      </select></td>
      <td><button class="save-btn" onclick="selectInwardClaim('${c.claimNo}')">수정</button></td>
    </tr>`).join('') || '<tr><td colspan="9">등록된 해외수재 클레임이 없습니다.</td></tr>';
  };

  window.updateClaimPortalStatus = function(no, value){
    const idx=(state.inwardClaims||[]).findIndex(c=>c.claimNo===no); if(idx<0) return;
    if(!confirm(`${no}의 기간계 입력상태를 [${value}]로 변경할까요?`)){ renderInwardClaims(); return; }
    state.inwardClaims[idx].portalStatus=value;
    state.inwardClaims[idx].updatedBy=typeof currentUser==='function'?currentUser():'DEMO';
    state.inwardClaims[idx].updatedAt=new Date().toISOString().slice(0,16).replace('T',' ');
    saveAll(); renderInwardClaims(); renderClaimContractSearch();
  };
  window.updateClaimWorkStatus = function(no, value){
    const idx=(state.inwardClaims||[]).findIndex(c=>c.claimNo===no); if(idx<0) return;
    if(!confirm(`${no}의 업무상태를 [${value}]로 변경할까요?`)){ renderInwardClaims(); return; }
    state.inwardClaims[idx].status=value;
    state.inwardClaims[idx].updatedBy=typeof currentUser==='function'?currentUser():'DEMO';
    state.inwardClaims[idx].updatedAt=new Date().toISOString().slice(0,16).replace('T',' ');
    saveAll(); renderInwardClaims();
  };

  window.selectInwardClaim = function(no){
    const c=(state.inwardClaims || []).find(x=>x.claimNo===no); if(!c) return alert('클레임을 찾지 못했습니다.');
    const contract = findContractByPolicyNo(c.policyNo || c.inwardRef);
    state.selectedIC=no; state.selectedClaimPolicyNo = c.policyNo || c.inwardRef;
    setVal('icClaimNo', c.claimNo || ''); setVal('icPolicyNo', c.policyNo || c.inwardRef || ''); setVal('icCause', c.cause || '');
    setVal('icLossDate', c.claimDate || ''); setVal('icDate', c.noticeDate || ''); setVal('icPaid', Number(c.paidLossEok||0)); setVal('icOS', Number(c.outstandingLossEok||0)); setVal('icLoss', Number(c.estimatedLossEok||c.grossLossEok||0)); setVal('icPortalStatus', c.portalStatus || '미등록'); setVal('icStatus', c.status || '접수'); setVal('icOwner', c.owner || ''); setVal('icDesc', c.memo || '');
    updateSelectedClaimSummary(contract || {policyNo:c.policyNo||c.inwardRef, insured:c.insured, line:c.line, country:c.country, city:c.city, tsiEok:0, premiumEok:0}, c);
    const box=el('surveySummary'); if(box) box.innerHTML = `<b>${c.claimNo} 선택됨</b><br>기간계 입력상태: ${c.portalStatus || '미등록'}<br>증권번호 ${c.policyNo || c.inwardRef || '-'} / ${c.insured || '-'}<br>Paid/OS ${eok(c.paidLossEok||0)} / ${eok(c.outstandingLossEok||0)}`;
    renderClaimContractSearch();
  };

  window.draftClaimMemo = function(){
    const c=(state.inwardClaims || []).find(x=>x.claimNo===state.selectedIC); if(!c) return alert('먼저 클레임을 선택하거나 저장하세요.');
    const contract=findContractByPolicyNo(c.policyNo||c.inwardRef); const box=el('surveySummary');
    if(box) box.innerHTML = `<b>기간계 수재사고 입력메모 초안</b><br>
      1) 대상계약: ${c.policyNo || c.inwardRef || '-'} / ${c.insured || contract?.insured || '-'} / ${contract?.line || c.line || '-'}<br>
      2) 사고개요: ${c.claimDate || '-'} 발생 ${c.cause || '사고'} 건, 추산손해액 ${eok(c.estimatedLossEok || c.grossLossEok || 0)}<br>
      3) 기간계 입력상태: ${c.portalStatus || '미등록'}<br>
      4) 확인사항: 보험기간 내 사고 여부, 담보·면책, 자기부담금, 손해액 산정근거, 재보험 통보 필요 여부<br>
      5) 첨부자료: 서베이리포트 원문, 사고사진, 원인조사보고서, 복구견적서, 최종 손해사정서`;
  };

  window.addEventListener('load',()=>setTimeout(()=>{ renderClaimContractSearch(); renderInwardClaims(); },1200));
})();

/* ===== v58: 사고계약은 기간계 업로드 전용, Layer 소진 관리에서 프로그램/Layer 매핑 ===== */
(function(){
  const $ = (id)=>document.getElementById(id);
  const esc = (v)=>String(v ?? '').replace(/[&<>"']/g, s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  const num = (v)=>Number(v||0) || 0;
  const fmt = (v)=> (typeof eok === 'function') ? eok(num(v)) : `${Math.round(num(v)).toLocaleString()}억원`;
  const pct = (a,b)=>Math.round(num(a)/Math.max(1,num(b))*100);
  const now = ()=> new Date().toISOString().slice(0,16).replace('T',' ');
  const user = ()=> (typeof currentUser === 'function' ? currentUser() : 'DEMO');
  const treatyColor = (tid)=>({'TR-01':'#2563eb','TR-02':'#059669','TR-03':'#7c3aed','TR-04':'#ea580c'}[tid] || '#334155');
  const linkKey = (x)=>String(x?.claimNo || x?.policyNo || '').trim();
  const accidentKey = (a)=>String(a?.claimNo || a?.policyNo || a?.insured || '').trim();
  const getTreaties = ()=> (state.treaties && state.treaties.length ? state.treaties : (DATA.treaties||[]));
  const getTreaty = (tid)=> getTreaties().find(t=>t.treatyId===tid) || {name:tid,type:'',layers:[],exclusions:[]};
  const layerInfo = (status)=>{
    const t = getTreaty(status.treatyId);
    const l = (t.layers||[]).find(x=>x.layer===status.layer) || {};
    return {t,l};
  };
  const getAccidents = ()=> state.accidents || [];
  const layerClaims = ()=> state.layerClaims || (state.layerClaims=[]);
  const saveLayerMap = ()=>{
    try{ if(typeof saveLayerClaims==='function') saveLayerClaims(); }catch(e){}
    try{ localStorage.setItem('gra_v37_layer_claims', JSON.stringify(state.layerClaims || [])); }catch(e){}
    try{ if(typeof saveAll==='function') saveAll(); }catch(e){}
  };
  const findStatus = (sid)=> (state.layers||[]).find(x=>x.statusId===sid);
  const statusOptionsHtml = (selected)=> ['<option value="">프로그램/Layer 선택</option>'].concat((state.layers||[]).map(s=>{
    const t=getTreaty(s.treatyId);
    const lab=`${t.name || s.treatyName} / ${s.layer}`;
    return `<option value="${esc(s.statusId)}" ${s.statusId===selected?'selected':''}>${esc(lab)}</option>`;
  })).join('');
  const mappingForAccident = (acc)=>{
    const k=accidentKey(acc);
    return layerClaims().find(x=>String(x.claimNo||'')===k || (acc.policyNo && String(x.policyNo||'')===String(acc.policyNo)));
  };
  const recalcLayerUse = (statusId)=>{
    const s=findStatus(statusId); if(!s) return;
    const linked=layerClaims().filter(x=>x.statusId===statusId && x.claimNo);
    s.paidUsedEok = linked.reduce((a,x)=>a+num(x.paidLossEok),0);
    s.outstandingUsedEok = linked.reduce((a,x)=>a+num(x.outstandingLossEok),0);
    s.updatedBy = user();
    s.updatedAt = now();
  };
  const recalcAllLayerUse = ()=>{
    (state.layers||[]).forEach(s=>recalcLayerUse(s.statusId));
  };

  window.bindAccidentToLayer = function(claimNo){
    const acc = getAccidents().find(a=>String(a.claimNo||'')===String(claimNo));
    if(!acc) return alert('사고계약 데이터를 찾지 못했습니다.');
    const sel = $(`mapSelect_${claimNo}`);
    const statusId = sel?.value || '';
    if(!statusId) return alert('연결할 재보험 프로그램/Layer를 선택하세요.');
    const target = findStatus(statusId);
    if(!target) return alert('선택한 Layer를 찾지 못했습니다.');
    const prev = mappingForAccident(acc);
    const targetLabel = `${target.treatyName} / ${target.layer}`;
    const msg = prev ? `${acc.claimNo} 사고계약의 Layer 연결을 [${targetLabel}]로 변경할까요?` : `${acc.claimNo} 사고계약을 [${targetLabel}]에 연결할까요?`;
    if(!confirm(msg)) return;
    if(prev){
      const prevStatus=prev.statusId;
      state.layerClaims = layerClaims().filter(x=>x!==prev);
      recalcLayerUse(prevStatus);
    }
    state.layerClaims.push({
      statusId,
      claimNo: acc.claimNo || '',
      policyNo: acc.policyNo || '',
      insured: acc.insured || '',
      cause: acc.cause || '',
      paidLossEok: num(acc.paidLossEok),
      outstandingLossEok: num(acc.outstandingLossEok),
      grossLossEok: num(acc.grossLossEok) || num(acc.paidLossEok)+num(acc.outstandingLossEok),
      claimDate: acc.claimDate || '',
      note: '기간계 사고계약 Layer 연결',
      mappedBy: user(),
      mappedAt: now()
    });
    recalcLayerUse(statusId);
    saveLayerMap();
    renderLayerTable();
    if(typeof renderDashboard==='function') renderDashboard();
  };

  window.unlinkAccidentLayer = function(claimNo){
    const acc=getAccidents().find(a=>String(a.claimNo||'')===String(claimNo));
    if(!acc) return;
    const prev=mappingForAccident(acc);
    if(!prev) return alert('연결된 Layer가 없습니다.');
    if(!confirm(`${acc.claimNo} 사고계약의 Layer 연결을 해제할까요?`)) return;
    const sid=prev.statusId;
    state.layerClaims = layerClaims().filter(x=>x!==prev);
    recalcLayerUse(sid);
    saveLayerMap();
    renderLayerTable();
    if(typeof renderDashboard==='function') renderDashboard();
  };

  window.saveLayerV58 = function(index){
    const s=(state.layers||[])[index]; if(!s) return;
    s.paidUsedEok=num($(`ly_paid_${index}`)?.value);
    s.outstandingUsedEok=num($(`ly_os_${index}`)?.value);
    s.reinstatedLimitEok=num($(`ly_re_${index}`)?.value);
    s.updatedBy=user(); s.updatedAt=now();
    if(!confirm(`${s.treatyName} / ${s.layer}의 사용액을 저장할까요?`)) return;
    try{ if(typeof saveAll==='function') saveAll(); }catch(e){}
    renderLayerTable(); if(typeof renderDashboard==='function') renderDashboard();
  };

  window.removeLayerClaimV58 = function(statusId, claimNo){
    if(!confirm(`${claimNo} 사고계약 연결을 삭제할까요?`)) return;
    state.layerClaims = layerClaims().filter(x=>!(x.statusId===statusId && String(x.claimNo||'')===String(claimNo)));
    recalcLayerUse(statusId);
    saveLayerMap();
    renderLayerTable(); if(typeof renderDashboard==='function') renderDashboard();
  };

  function renderAccidentCard(a){
    const map=mappingForAccident(a);
    const st=map ? findStatus(map.statusId) : null;
    const {t}=st ? layerInfo(st) : {t:null};
    const mappedLabel = st ? `${t.name || st.treatyName} / ${st.layer}` : '미연결';
    const cls = map ? 'accident-map-card mapped' : 'accident-map-card';
    return `<div class="${cls}">
      <div class="accident-map-top"><div><b>${esc(a.claimNo||'-')}</b><br><small>${esc(a.policyNo||'-')}</small></div><span class="map-status-pill ${map?'done':''}">${esc(mappedLabel)}</span></div>
      <div class="accident-map-meta">${esc(a.insured||'-')} · ${esc(a.line||'-')} · ${esc(a.cause||'-')}<br>${esc(a.country||'-')} / ${esc(a.city||'-')} · 사고일 ${esc(a.claimDate||'-')}</div>
      <div class="accident-map-amount"><span>Paid ${fmt(a.paidLossEok)}</span><span>OS ${fmt(a.outstandingLossEok)}</span><span>Gross ${fmt(num(a.grossLossEok)||num(a.paidLossEok)+num(a.outstandingLossEok))}</span></div>
      <div class="accident-map-actions">
        <select id="mapSelect_${esc(a.claimNo||'')}">${statusOptionsHtml(map?.statusId)}</select>
        <button class="save-btn" onclick="bindAccidentToLayer('${esc(a.claimNo||'')}')">연결</button>
        <button class="secondary-btn" onclick="unlinkAccidentLayer('${esc(a.claimNo||'')}')">해제</button>
      </div>
    </div>`;
  }

  function renderProgramLayerCard(s, index){
    const {t,l}=layerInfo(s);
    const limit=num(s.baseLimitEok)+num(s.reinstatedLimitEok);
    const used=num(s.paidUsedEok)+num(s.outstandingUsedEok);
    const burn=pct(used, limit);
    const linked=layerClaims().filter(x=>x.statusId===s.statusId && x.claimNo);
    return `<div class="layer-v58">
      <div class="layer-v58-title"><div><b>${esc(s.layer)}</b><br><small>${l.from!=null?`${fmt(l.from)} 초과 ~ ${fmt(l.to)}`:`기본한도 ${fmt(s.baseLimitEok)}`}</small></div><span class="program-total-v58">${burn}%</span></div>
      <div class="layer-v58-bar"><div class="layer-v58-fill" style="width:${Math.min(100,burn)}%"></div></div>
      <div class="layer-v58-inputs">
        <label>Paid<input id="ly_paid_${index}" type="number" value="${num(s.paidUsedEok)}"></label>
        <label>Outstanding<input id="ly_os_${index}" type="number" value="${num(s.outstandingUsedEok)}"></label>
        <label>복원 후 한도<input id="ly_re_${index}" type="number" value="${num(s.reinstatedLimitEok)}"></label>
        <button class="save-btn" onclick="saveLayerV58(${index})">저장</button>
      </div>
      <div class="linked-accidents-v58">${linked.length ? linked.map(x=>`<span class="chip" title="${esc(x.insured||'')} / Paid ${fmt(x.paidLossEok)} / OS ${fmt(x.outstandingLossEok)}">${esc(x.claimNo)} · ${esc((x.insured||'').slice(0,14))}<button onclick="removeLayerClaimV58('${esc(s.statusId)}','${esc(x.claimNo)}')">×</button></span>`).join('') : '<span class="layer-empty">연결된 사고계약 없음</span>'}</div>
    </div>`;
  }

  window.renderLayerTable = function(){
    const oldTable=$('layerTable');
    let host=$('layerBoardHost');
    if(!host){
      host=document.createElement('div');
      host.id='layerBoardHost';
      if(oldTable){
        const parent=oldTable.closest('.table-scroll') || oldTable.parentElement;
        if(parent){ parent.innerHTML=''; parent.appendChild(host); }
      }else{
        const sec=$('layer'); if(sec) sec.appendChild(host);
      }
    }
    const q=($('layerAccSearch')?.value || '').toLowerCase().trim();
    const filter=$('layerAccFilter')?.value || '전체';
    const accidents=getAccidents().filter(a=>{
      const mapped=!!mappingForAccident(a);
      const okFilter = filter==='전체' || (filter==='미연결' && !mapped) || (filter==='연결완료' && mapped);
      const okQ = !q || JSON.stringify(a).toLowerCase().includes(q);
      return okFilter && okQ;
    }).slice(0,160);
    const mappedCnt=getAccidents().filter(a=>!!mappingForAccident(a)).length;
    const unlinkedCnt=Math.max(0,getAccidents().length-mappedCnt);
    const by={}; (state.layers||[]).forEach((s,i)=>{ (by[s.treatyId]=by[s.treatyId]||[]).push({...s,_idx:i}); });
    host.innerHTML = `<div class="layer-workspace-v58">
      <div class="layer-accident-panel">
        <div class="layer-panel-title"><div><h3>기간계 사고계약 데이터</h3><p>기간계에서 업로드한 사고계약을 선택해 재보험 프로그램/Layer에 연결합니다.</p></div></div>
        <div class="layer-map-summary"><div><span>전체</span><b>${getAccidents().length}</b></div><div><span>연결완료</span><b>${mappedCnt}</b></div><div><span>미연결</span><b>${unlinkedCnt}</b></div><div><span>표시</span><b>${accidents.length}</b></div></div>
        <div class="layer-accident-toolbar"><input id="layerAccSearch" placeholder="사고번호, 증권번호, 피보험자 검색" value="${esc($('layerAccSearch')?.value||'')}" oninput="renderLayerTable()"><select id="layerAccFilter" onchange="renderLayerTable()"><option ${filter==='전체'?'selected':''}>전체</option><option ${filter==='미연결'?'selected':''}>미연결</option><option ${filter==='연결완료'?'selected':''}>연결완료</option></select></div>
        <div class="layer-accident-list">${accidents.length ? accidents.map(renderAccidentCard).join('') : '<div class="mini-msg">표시할 사고계약 데이터가 없습니다. 관리자 메뉴에서 기간계 사고계약 데이터를 업로드하세요.</div>'}</div>
      </div>
      <div class="layer-program-panel">
        <div class="layer-panel-title"><div><h3>재보험 프로그램 / Layer 매핑 현황</h3><p>사고계약 연결 결과가 대시보드와 재보험 프로그램별 소진현황에 반영됩니다.</p></div></div>
        <div class="layer-program-board-v58">${Object.keys(by).map(tid=>{
          const t=getTreaty(tid); const color=treatyColor(tid); const totalLimit=by[tid].reduce((a,s)=>a+num(s.baseLimitEok)+num(s.reinstatedLimitEok),0); const totalUsed=by[tid].reduce((a,s)=>a+num(s.paidUsedEok)+num(s.outstandingUsedEok),0);
          return `<div class="program-v58" style="--program-color:${color}"><div class="program-v58-head"><div><h3>${esc(t.name||tid)}</h3><small>${esc(t.description||'')}</small></div><span class="program-total-v58">총 ${pct(totalUsed,totalLimit)}%</span></div>${by[tid].map(s=>renderProgramLayerCard(s,s._idx)).join('')}</div>`;
        }).join('')}</div>
      </div>
    </div>`;
  };

  const oldSwitch = window.switchTab;
  window.switchTab = function(tab){
    if(tab==='accident') tab='layer';
    if(typeof oldSwitch === 'function') oldSwitch(tab);
    if(tab==='layer') setTimeout(()=>window.renderLayerTable(),20);
  };

  const oldDashboard = window.renderDashboard;
  window.renderDashboard = function(){
    try{ if(typeof oldDashboard==='function') oldDashboard(); }catch(e){}
    const accidentKpi=$('kpiAccident'); if(accidentKpi) accidentKpi.innerText=(state.accidents||[]).length+'건';
    const layerBox=$('dashboardLayerBars');
    if(layerBox){
      const by={}; (state.layers||[]).forEach(s=>{ (by[s.treatyId]=by[s.treatyId]||[]).push(s); });
      layerBox.innerHTML=Object.keys(by).map(tid=>{
        const t=getTreaty(tid), color=treatyColor(tid); const totalLimit=by[tid].reduce((a,s)=>a+num(s.baseLimitEok)+num(s.reinstatedLimitEok),0); const totalUsed=by[tid].reduce((a,s)=>a+num(s.paidUsedEok)+num(s.outstandingUsedEok),0);
        const linkCnt=layerClaims().filter(x=>by[tid].some(s=>s.statusId===x.statusId)).length;
        return `<div class="dash-program-card" style="--treaty-accent:${color}"><div class="dash-program-head"><div><h4>${esc(t.name||tid)}</h4><span>연결 사고계약 ${linkCnt}건 · 총한도 ${fmt(totalLimit)}</span></div><b>${pct(totalUsed,totalLimit)}%</b></div>${by[tid].map(s=>{ const limit=num(s.baseLimitEok)+num(s.reinstatedLimitEok); const used=num(s.paidUsedEok)+num(s.outstandingUsedEok); const burn=pct(used,limit); const linked=layerClaims().filter(x=>x.statusId===s.statusId); return `<div class="dash-layer-item"><div class="dash-layer-head"><span>${esc(s.layer)}</span><b class="burn-pill ${burn>=80?'danger':burn>=50?'warn':''}">${burn}%</b></div><div class="dash-layer-sub">${fmt(used)} / ${fmt(limit)} · 사고 ${linked.length}건</div><div class="layer-track-modern"><span style="width:${Math.min(100,burn)}%"></span></div></div>`; }).join('')}</div>`;
      }).join('');
    }
  };

  window.resetLayerClaims = function(){
    if(!confirm('Layer에 연결된 사고계약 정보를 모두 초기화할까요?')) return;
    state.layerClaims=[];
    recalcAllLayerUse();
    saveLayerMap(); renderLayerTable(); if(typeof renderDashboard==='function') renderDashboard();
  };

  window.addEventListener('load',()=>setTimeout(()=>{
    document.querySelectorAll('nav button[data-tab="accident"]').forEach(b=>b.remove());
    const accKpi=$('kpiAccident'); if(accKpi){ const card=accKpi.closest('.kpi'); if(card) card.onclick=()=>switchTab('layer'); }
    recalcAllLayerUse(); saveLayerMap();
    renderLayerTable(); if(typeof renderDashboard==='function') renderDashboard();
  },1300));
})();

/* ===== v59: 사고계약 다중 프로그램/다중 Layer 연결 ===== */
(function(){
  const $ = (id)=>document.getElementById(id);
  const num = (v)=>Number(v||0) || 0;
  const fmt = (v)=> (typeof eok === 'function') ? eok(num(v)) : `${Math.round(num(v)).toLocaleString()}억원`;
  const esc = (v)=>String(v ?? '').replace(/[&<>"']/g, s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  const now = ()=> new Date().toISOString().slice(0,16).replace('T',' ');
  const user = ()=> (typeof currentUser === 'function' ? currentUser() : 'DEMO');
  const treatyColor = (tid)=>({'TR-01':'#2563eb','TR-02':'#059669','TR-03':'#7c3aed','TR-04':'#ea580c'}[tid] || '#334155');
  const getTreaties = ()=> (state.treaties && state.treaties.length ? state.treaties : (DATA.treaties||[]));
  const getTreaty = (tid)=> getTreaties().find(t=>t.treatyId===tid) || {treatyId:tid,name:tid,description:'',layers:[]};
  const getAccidents = ()=> state.accidents || [];
  const getLayerClaims = ()=> state.layerClaims || (state.layerClaims=[]);
  const accidentKey = (a)=> String(a?.claimNo || a?.policyNo || '').trim();
  const pct = (a,b)=> Math.round(num(a)/Math.max(1,num(b))*100);

  function statusForLayer(treatyId, layerName){
    return (state.layers||[]).find(s=>s.treatyId===treatyId && s.layer===layerName) || null;
  }
  function mappingEntriesForAccident(acc){
    const k = accidentKey(acc);
    return getLayerClaims().filter(x => String(x.claimNo||'')===k || (!!acc.policyNo && String(x.policyNo||'')===String(acc.policyNo)));
  }
  function mappingEntriesForStatus(statusId){
    return getLayerClaims().filter(x => x.statusId===statusId);
  }
  function selectedTreatyIdsForAccident(acc){
    return [...new Set(mappingEntriesForAccident(acc).map(m=>m.treatyId || ((state.layers||[]).find(s=>s.statusId===m.statusId)||{}).treatyId).filter(Boolean))];
  }
  function allocationSummaryForAccident(acc){
    const byTreaty = {};
    mappingEntriesForAccident(acc).forEach(m=>{
      const sid = (state.layers||[]).find(s=>s.statusId===m.statusId);
      const tid = m.treatyId || sid?.treatyId;
      if(!tid) return;
      (byTreaty[tid] = byTreaty[tid] || []).push(m);
    });
    return Object.keys(byTreaty).map(tid=>{
      const treaty = getTreaty(tid);
      const gross = byTreaty[tid].reduce((a,m)=>a+num(m.allocGrossEok||m.grossLossEok),0);
      const txt = byTreaty[tid].map(m=>`${m.layer}: ${fmt(m.allocGrossEok||0)}`).join(' / ');
      return {tid, name:treaty.name||tid, gross, text:txt};
    });
  }

  function allocateClaimToTreaty(acc, treatyId){
    const treaty = getTreaty(treatyId);
    const gross = num(acc.grossLossEok) || (num(acc.paidLossEok) + num(acc.outstandingLossEok));
    const paid = num(acc.paidLossEok);
    const os = num(acc.outstandingLossEok);
    const ratioPaid = gross > 0 ? paid / gross : 0;
    const ratioOs = gross > 0 ? os / gross : 0;
    const links = [];
    (treaty.layers || []).forEach(layer=>{
      if(String(layer.layer).toLowerCase().includes('retention')) return;
      const from = num(layer.from);
      const to = num(layer.to);
      const allocGross = Math.max(0, Math.min(gross, to) - from);
      if(allocGross <= 0) return;
      const status = statusForLayer(treatyId, layer.layer);
      if(!status) return;
      links.push({
        statusId: status.statusId,
        treatyId,
        treatyName: treaty.name,
        layer: layer.layer,
        claimNo: acc.claimNo || '',
        policyNo: acc.policyNo || '',
        insured: acc.insured || '',
        cause: acc.cause || '',
        country: acc.country || '',
        city: acc.city || '',
        claimDate: acc.claimDate || '',
        grossLossEok: gross,
        paidLossEok: paid,
        outstandingLossEok: os,
        allocGrossEok: allocGross,
        allocPaidEok: +(allocGross * ratioPaid).toFixed(1),
        allocOutstandingEok: +(allocGross * ratioOs).toFixed(1),
        note: '기간계 사고계약 다중 프로그램/Layer 연결',
        mappedBy: user(),
        mappedAt: now()
      });
    });
    return links;
  }

  function recalcLayerUse(statusId){
    const s = (state.layers||[]).find(x=>x.statusId===statusId); if(!s) return;
    const linked = mappingEntriesForStatus(statusId);
    s.paidUsedEok = +linked.reduce((a,m)=>a+num(m.allocPaidEok ?? m.paidLossEok),0).toFixed(1);
    s.outstandingUsedEok = +linked.reduce((a,m)=>a+num(m.allocOutstandingEok ?? m.outstandingLossEok),0).toFixed(1);
    s.updatedBy = user();
    s.updatedAt = now();
  }
  function recalcAllLayerUse(){ (state.layers||[]).forEach(s=>recalcLayerUse(s.statusId)); }
  function saveLayerMap(){
    try{ localStorage.setItem('gra_v37_layer_claims', JSON.stringify(state.layerClaims || [])); }catch(e){}
    try{ if(typeof saveAll==='function') saveAll(); }catch(e){}
  }

  function renderAccidentCard(acc){
    const selected = selectedTreatyIdsForAccident(acc);
    const summary = allocationSummaryForAccident(acc);
    const programs = getTreaties().map(t=>`
      <label class="prog-check"><input type="checkbox" class="accProgChk" data-claim="${esc(acc.claimNo||'')}" value="${esc(t.treatyId)}" ${selected.includes(t.treatyId)?'checked':''}> ${esc(t.name)}</label>
    `).join('');
    const chips = summary.length
      ? summary.map(s=>`<span class="map-status-pill done" title="${esc(s.text)}" style="background:${treatyColor(s.tid)}15;border-color:${treatyColor(s.tid)}55;color:${treatyColor(s.tid)}">${esc(s.name)} · ${fmt(s.gross)}</span>`).join('')
      : '<span class="map-status-pill">미연결</span>';
    return `<div class="accident-map-card ${summary.length?'mapped':''}">
      <div class="accident-map-top"><div><b>${esc(acc.claimNo||'-')}</b><br><small>${esc(acc.policyNo||'-')}</small></div><span class="map-status-pill ${summary.length?'done':''}">${summary.length ? '연결 '+summary.length+'개 프로그램' : '미연결'}</span></div>
      <div class="accident-map-meta">${esc(acc.insured||'-')} · ${esc(acc.line||'-')} · ${esc(acc.cause||'-')}<br>${esc(acc.country||'-')} / ${esc(acc.city||'-')} · 사고일 ${esc(acc.claimDate||'-')}</div>
      <div class="accident-map-amount"><span>Paid ${fmt(acc.paidLossEok)}</span><span>OS ${fmt(acc.outstandingLossEok)}</span><span>Gross ${fmt(num(acc.grossLossEok)||num(acc.paidLossEok)+num(acc.outstandingLossEok))}</span></div>
      <div class="multi-prog-box"><div class="multi-prog-title">적용 프로그램 선택</div><div class="multi-prog-grid">${programs}</div></div>
      <div class="allocation-box"><div class="multi-prog-title">현재 연결 결과</div><div class="allocation-pills">${chips}</div>${summary.length ? `<div class="alloc-note">${summary.map(s=>`<div><b>${esc(s.name)}</b> : ${esc(s.text)}</div>`).join('')}</div>` : ''}</div>
      <div class="accident-map-actions">
        <button class="save-btn" onclick="applyProgramsForClaim('${esc(acc.claimNo||'')}')">프로그램 반영</button>
        <button class="secondary-btn" onclick="clearProgramsForClaim('${esc(acc.claimNo||'')}')">전체 해제</button>
      </div>
    </div>`;
  }

  function renderProgramLayerCard(status, index){
    const treaty = getTreaty(status.treatyId);
    const layerDef = (treaty.layers||[]).find(x=>x.layer===status.layer) || {};
    const limit = num(status.baseLimitEok) + num(status.reinstatedLimitEok);
    const used = num(status.paidUsedEok) + num(status.outstandingUsedEok);
    const burn = pct(used, limit);
    const linked = mappingEntriesForStatus(status.statusId);
    return `<div class="layer-v58">
      <div class="layer-v58-title"><div><b>${esc(status.layer)}</b><br><small>${layerDef.from!=null ? `${fmt(layerDef.from)} 초과 ~ ${fmt(layerDef.to)}` : `기본한도 ${fmt(status.baseLimitEok)}`}</small></div><span class="program-total-v58">${burn}%</span></div>
      <div class="layer-v58-bar"><div class="layer-v58-fill" style="width:${Math.min(100,burn)}%"></div></div>
      <div class="layer-v58-inputs">
        <label>Paid<input id="ly_paid_${index}" type="number" value="${num(status.paidUsedEok)}"></label>
        <label>Outstanding<input id="ly_os_${index}" type="number" value="${num(status.outstandingUsedEok)}"></label>
        <label>복원 후 한도<input id="ly_re_${index}" type="number" value="${num(status.reinstatedLimitEok)}"></label>
        <button class="save-btn" onclick="saveLayerV59(${index})">저장</button>
      </div>
      <div class="linked-accidents-v58">
        ${linked.length ? linked.map(m=>`<span class="chip" title="${esc(m.claimNo)} / ${esc(m.insured||'')} / 할당 Gross ${fmt(m.allocGrossEok||0)} / Paid ${fmt(m.allocPaidEok||0)} / OS ${fmt(m.allocOutstandingEok||0)}">${esc(m.claimNo)} · ${fmt(m.allocGrossEok||0)}<button onclick="removeLayerClaimV59('${esc(status.statusId)}','${esc(m.claimNo)}')">×</button></span>`).join('') : '<span class="layer-empty">연결된 사고계약 없음</span>'}
      </div>
    </div>`;
  }

  window.applyProgramsForClaim = function(claimNo){
    const acc = getAccidents().find(a=>String(a.claimNo||'')===String(claimNo));
    if(!acc) return alert('사고계약 데이터를 찾지 못했습니다.');
    const checked = [...document.querySelectorAll(`input.accProgChk[data-claim="${claimNo}"]:checked`)].map(x=>x.value);
    if(!checked.length) return alert('최소 1개 프로그램을 선택하세요.');
    if(!confirm(`${claimNo} 사고계약을 선택한 프로그램에 반영할까요?\n(사고금액에 따라 여러 Layer에 자동 배분됩니다.)`)) return;
    state.layerClaims = getLayerClaims().filter(x=>String(x.claimNo||'')!==String(claimNo));
    checked.forEach(tid=>{
      const links = allocateClaimToTreaty(acc, tid);
      links.forEach(link=>state.layerClaims.push(link));
    });
    recalcAllLayerUse();
    saveLayerMap();
    window.renderLayerTable();
    if(typeof window.renderDashboard==='function') window.renderDashboard();
  };

  window.clearProgramsForClaim = function(claimNo){
    if(!confirm(`${claimNo} 사고계약의 프로그램/Layer 연결을 모두 해제할까요?`)) return;
    state.layerClaims = getLayerClaims().filter(x=>String(x.claimNo||'')!==String(claimNo));
    recalcAllLayerUse(); saveLayerMap();
    window.renderLayerTable(); if(typeof window.renderDashboard==='function') window.renderDashboard();
  };

  window.removeLayerClaimV59 = function(statusId, claimNo){
    if(!confirm(`${claimNo}의 ${statusId} 연결을 삭제할까요?`)) return;
    const entry = getLayerClaims().find(x=>x.statusId===statusId && String(x.claimNo||'')===String(claimNo));
    if(!entry) return;
    state.layerClaims = getLayerClaims().filter(x=>!(x.statusId===statusId && String(x.claimNo||'')===String(claimNo)));
    recalcLayerUse(statusId); saveLayerMap();
    window.renderLayerTable(); if(typeof window.renderDashboard==='function') window.renderDashboard();
  };

  window.saveLayerV59 = function(index){
    const s=(state.layers||[])[index]; if(!s) return;
    if(!confirm(`${s.treatyName} / ${s.layer}의 사용액을 저장할까요?`)) return;
    s.paidUsedEok=num($(`ly_paid_${index}`)?.value);
    s.outstandingUsedEok=num($(`ly_os_${index}`)?.value);
    s.reinstatedLimitEok=num($(`ly_re_${index}`)?.value);
    s.updatedBy=user(); s.updatedAt=now();
    try{ if(typeof saveAll==='function') saveAll(); }catch(e){}
    window.renderLayerTable(); if(typeof window.renderDashboard==='function') window.renderDashboard();
  };

  window.renderLayerTable = function(){
    const oldTable=$('layerTable');
    let host=$('layerBoardHost');
    if(!host){
      host=document.createElement('div'); host.id='layerBoardHost';
      if(oldTable){
        const parent=oldTable.closest('.table-scroll') || oldTable.parentElement;
        if(parent){ parent.innerHTML=''; parent.appendChild(host); }
      }else{
        const sec=$('layer'); if(sec) sec.appendChild(host);
      }
    }
    const q=($('layerAccSearch')?.value || '').toLowerCase().trim();
    const filter=$('layerAccFilter')?.value || '전체';
    const accidents=getAccidents().filter(a=>{
      const mapped = mappingEntriesForAccident(a).length>0;
      const okFilter = filter==='전체' || (filter==='미연결' && !mapped) || (filter==='연결완료' && mapped);
      const okQ = !q || JSON.stringify(a).toLowerCase().includes(q);
      return okFilter && okQ;
    }).slice(0,160);
    const mappedCnt=getAccidents().filter(a=>mappingEntriesForAccident(a).length>0).length;
    const unlinkedCnt=Math.max(0,getAccidents().length-mappedCnt);
    const by={}; (state.layers||[]).forEach((s,i)=>{ (by[s.treatyId]=by[s.treatyId]||[]).push({...s,_idx:i}); });
    host.innerHTML = `<div class="layer-workspace-v58">
      <div class="layer-accident-panel">
        <div class="layer-panel-title"><div><h3>기간계 사고계약 데이터</h3><p>사고계약은 여러 재보험 프로그램에 동시에 연결할 수 있으며, 프로그램별로 해당되는 Layer에 자동 배분됩니다.</p></div></div>
        <div class="layer-map-summary"><div><span>전체</span><b>${getAccidents().length}</b></div><div><span>연결완료</span><b>${mappedCnt}</b></div><div><span>미연결</span><b>${unlinkedCnt}</b></div><div><span>표시</span><b>${accidents.length}</b></div></div>
        <div class="layer-accident-toolbar"><input id="layerAccSearch" placeholder="사고번호, 증권번호, 피보험자 검색" value="${esc($('layerAccSearch')?.value||'')}" oninput="renderLayerTable()"><select id="layerAccFilter" onchange="renderLayerTable()"><option ${filter==='전체'?'selected':''}>전체</option><option ${filter==='미연결'?'selected':''}>미연결</option><option ${filter==='연결완료'?'selected':''}>연결완료</option></select></div>
        <div class="layer-accident-list">${accidents.length ? accidents.map(renderAccidentCard).join('') : '<div class="mini-msg">표시할 사고계약 데이터가 없습니다. 관리자 메뉴에서 기간계 사고계약 데이터를 업로드하세요.</div>'}</div>
      </div>
      <div class="layer-program-panel">
        <div class="layer-panel-title"><div><h3>재보험 프로그램 / Layer 소진 현황</h3><p>사고계약 연결 결과가 프로그램별 Layer 사용액으로 집계됩니다. 사고금액이 한도를 초과하면 여러 Layer에 나누어 반영됩니다.</p></div></div>
        <div class="layer-program-board-v58">${Object.keys(by).map(tid=>{
          const t=getTreaty(tid); const color=treatyColor(tid); const totalLimit=by[tid].reduce((a,s)=>a+num(s.baseLimitEok)+num(s.reinstatedLimitEok),0); const totalUsed=by[tid].reduce((a,s)=>a+num(s.paidUsedEok)+num(s.outstandingUsedEok),0);
          return `<div class="program-v58" style="--program-color:${color}"><div class="program-v58-head"><div><h3>${esc(t.name||tid)}</h3><small>${esc(t.description||'')}</small></div><span class="program-total-v58">총 ${pct(totalUsed,totalLimit)}%</span></div>${by[tid].map(s=>renderProgramLayerCard(s,s._idx)).join('')}</div>`;
        }).join('')}</div>
      </div>
    </div>`;
  };

  const oldDashboard = window.renderDashboard;
  window.renderDashboard = function(){
    try{ if(typeof oldDashboard==='function') oldDashboard(); }catch(e){}
    const layerBox=$('dashboardLayerBars');
    if(layerBox){
      const by={}; (state.layers||[]).forEach(s=>{ (by[s.treatyId]=by[s.treatyId]||[]).push(s); });
      layerBox.innerHTML=Object.keys(by).map(tid=>{
        const t=getTreaty(tid), color=treatyColor(tid); const totalLimit=by[tid].reduce((a,s)=>a+num(s.baseLimitEok)+num(s.reinstatedLimitEok),0); const totalUsed=by[tid].reduce((a,s)=>a+num(s.paidUsedEok)+num(s.outstandingUsedEok),0);
        const linkCnt=getLayerClaims().filter(x=>by[tid].some(s=>s.statusId===x.statusId)).length;
        return `<div class="dash-program-card" style="--treaty-accent:${color}"><div class="dash-program-head"><div><h4>${esc(t.name||tid)}</h4><span>연결 건수 ${linkCnt}건 · 총한도 ${fmt(totalLimit)}</span></div><b>${pct(totalUsed,totalLimit)}%</b></div>${by[tid].map(s=>{ const limit=num(s.baseLimitEok)+num(s.reinstatedLimitEok); const used=num(s.paidUsedEok)+num(s.outstandingUsedEok); const burn=pct(used,limit); const linked=mappingEntriesForStatus(s.statusId); return `<div class="dash-layer-item"><div class="dash-layer-head"><span>${esc(s.layer)}</span><b class="burn-pill ${burn>=80?'danger':burn>=50?'warn':''}">${burn}%</b></div><div class="dash-layer-sub">${fmt(used)} / ${fmt(limit)} · 연결 ${linked.length}건</div><div class="layer-track-modern"><span style="width:${Math.min(100,burn)}%"></span></div></div>`; }).join('')}</div>`;
      }).join('');
    }
  };

  function injectStyles(){
    if(document.getElementById('v59-layer-style')) return;
    const css = `
      .multi-prog-box,.allocation-box{margin-top:10px;padding:10px;border:1px solid #e2e8f0;border-radius:12px;background:#fff}
      .multi-prog-title{font-size:12px;font-weight:700;color:#475569;margin-bottom:8px}
      .multi-prog-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 12px}
      .prog-check{display:flex;align-items:center;gap:6px;font-size:12px;color:#1e293b}
      .allocation-pills{display:flex;flex-wrap:wrap;gap:6px}
      .alloc-note{margin-top:8px;font-size:12px;color:#475569;line-height:1.5}
    `;
    const style=document.createElement('style'); style.id='v59-layer-style'; style.innerHTML=css; document.head.appendChild(style);
  }

  window.addEventListener('load',()=>setTimeout(()=>{
    injectStyles();
    // 기존 1건 1연결 데이터가 있어도 다중 구조에서 재집계 가능하도록 refresh
    recalcAllLayerUse();
    saveLayerMap();
    if(typeof window.renderLayerTable==='function') window.renderLayerTable();
    if(typeof window.renderDashboard==='function') window.renderDashboard();
  },1600));
})();

/* ===== v60: 사고계약별 프로그램/Layer 수동 배분 ===== */
(function(){
  const $ = (id)=>document.getElementById(id);
  const num = (v)=>Number(v||0) || 0;
  const fmt = (v)=> (typeof eok === 'function') ? eok(num(v)) : `${Math.round(num(v)).toLocaleString()}억원`;
  const esc = (v)=>String(v ?? '').replace(/[&<>"']/g, s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  const now = ()=> new Date().toISOString().slice(0,16).replace('T',' ');
  const user = ()=> (typeof currentUser === 'function' ? currentUser() : 'DEMO');
  const treatyColor = (tid)=>({'TR-01':'#2563eb','TR-02':'#059669','TR-03':'#7c3aed','TR-04':'#ea580c'}[tid] || '#334155');
  const getTreaties = ()=> (state.treaties && state.treaties.length ? state.treaties : (DATA.treaties||[]));
  const getTreaty = (tid)=> getTreaties().find(t=>t.treatyId===tid) || {treatyId:tid,name:tid,description:'',layers:[]};
  const getAccidents = ()=> state.accidents || [];
  const getLayerClaims = ()=> state.layerClaims || (state.layerClaims=[]);
  const accidentKey = (a)=> String(a?.claimNo || a?.policyNo || '').trim();
  const slug = (v)=>String(v||'').replace(/[^a-zA-Z0-9가-힣]/g,'_');

  function mappingEntriesForAccident(acc){
    const k = accidentKey(acc);
    return getLayerClaims().filter(x => String(x.claimNo||'')===k || (!!acc.policyNo && String(x.policyNo||'')===String(acc.policyNo)));
  }
  function mappingEntriesForStatus(statusId){ return getLayerClaims().filter(x=>x.statusId===statusId); }
  function statusForLayer(treatyId, layerName){ return (state.layers||[]).find(s=>s.treatyId===treatyId && s.layer===layerName) || null; }

  function ensureDraftStore(){ if(!state.claimLayerDrafts) state.claimLayerDrafts = {}; return state.claimLayerDrafts; }
  function getClaimDraft(claimNo){ const all = ensureDraftStore(); if(!all[claimNo]) all[claimNo] = {}; return all[claimNo]; }
  function hydrateDraftFromMappings(acc){
    const draft = getClaimDraft(acc.claimNo);
    const maps = mappingEntriesForAccident(acc);
    if(Object.keys(draft).length===0 && maps.length){
      maps.forEach(m=>{
        const tid = m.treatyId || ((state.layers||[]).find(s=>s.statusId===m.statusId)||{}).treatyId;
        if(!tid) return;
        if(!draft[tid]) draft[tid] = {};
        draft[tid][m.layer] = num(m.allocGrossEok || m.grossLossEok);
      });
    }
    return draft;
  }
  function selectedTreatyIdsFromDraftOrMap(acc){
    const draft = hydrateDraftFromMappings(acc);
    const d = Object.keys(draft).filter(tid=>Object.keys(draft[tid]||{}).length>0 || draft[tid]===0 || draft[tid]);
    if(d.length) return d;
    return [...new Set(mappingEntriesForAccident(acc).map(m=>m.treatyId).filter(Boolean))];
  }
  function allocationSummaryForAccident(acc){
    const byTreaty = {};
    mappingEntriesForAccident(acc).forEach(m=>{
      const tid = m.treatyId || ((state.layers||[]).find(s=>s.statusId===m.statusId)||{}).treatyId;
      if(!tid) return;
      (byTreaty[tid] = byTreaty[tid] || []).push(m);
    });
    return Object.keys(byTreaty).map(tid=>{
      const treaty = getTreaty(tid);
      const gross = byTreaty[tid].reduce((a,m)=>a+num(m.allocGrossEok||m.grossLossEok),0);
      const txt = byTreaty[tid].map(m=>`${m.layer}: ${fmt(m.allocGrossEok||0)}`).join(' / ');
      return {tid, name:treaty.name||tid, gross, text:txt};
    });
  }
  function recalcLayerUse(statusId){
    const s = (state.layers||[]).find(x=>x.statusId===statusId); if(!s) return;
    const linked = mappingEntriesForStatus(statusId);
    s.paidUsedEok = +linked.reduce((a,m)=>a+num(m.allocPaidEok ?? m.paidLossEok),0).toFixed(1);
    s.outstandingUsedEok = +linked.reduce((a,m)=>a+num(m.allocOutstandingEok ?? m.outstandingLossEok),0).toFixed(1);
    s.updatedBy = user(); s.updatedAt = now();
  }
  function recalcAll(){ (state.layers||[]).forEach(s=>recalcLayerUse(s.statusId)); }
  function saveAllPlus(){
    try{ localStorage.setItem('gra_v37_layer_claims', JSON.stringify(state.layerClaims || [])); }catch(e){}
    try{ localStorage.setItem('gra_v37_claim_layer_drafts', JSON.stringify(state.claimLayerDrafts || {})); }catch(e){}
    try{ if(typeof saveAll==='function') saveAll(); }catch(e){}
  }
  function restoreDrafts(){
    try{
      if(!state.claimLayerDrafts){
        const raw = localStorage.getItem('gra_v37_claim_layer_drafts');
        if(raw) state.claimLayerDrafts = JSON.parse(raw);
      }
    }catch(e){}
    ensureDraftStore();
  }

  function renderAllocationEditor(acc, treatyId){
    const treaty = getTreaty(treatyId);
    const draft = getClaimDraft(acc.claimNo);
    const layerRows = (treaty.layers || []).map(layer=>{
      const status = statusForLayer(treatyId, layer.layer); if(!status) return '';
      const cap = num(status.baseLimitEok) + num(status.reinstatedLimitEok || 0);
      const value = num((draft[treatyId]||{})[layer.layer]);
      return `<div class="alloc-row">
        <div class="alloc-row-left"><b>${esc(layer.layer)}</b><small>${fmt(layer.from||0)} 초과 ~ ${fmt(layer.to||cap)}</small></div>
        <div class="alloc-row-right"><input type="number" id="alloc_${slug(acc.claimNo)}_${slug(treatyId)}_${slug(layer.layer)}" value="${value}" placeholder="0"><span>${fmt(cap)} 한도</span></div>
      </div>`;
    }).join('');
    return `<div class="alloc-program-box" style="--alloc-accent:${treatyColor(treatyId)}"><div class="alloc-program-title">${esc(treaty.name)}</div>${layerRows}</div>`;
  }

  function renderAccidentCardManual(acc){
    restoreDrafts();
    const selected = selectedTreatyIdsFromDraftOrMap(acc);
    const summary = allocationSummaryForAccident(acc);
    const programs = getTreaties().map(t=>`<label class="prog-check"><input type="checkbox" class="accProgChk" data-claim="${esc(acc.claimNo||'')}" value="${esc(t.treatyId)}" ${selected.includes(t.treatyId)?'checked':''} onchange="toggleProgramForClaim('${esc(acc.claimNo||'')}','${esc(t.treatyId)}',this.checked)"> ${esc(t.name)}</label>`).join('');
    const chips = summary.length ? summary.map(s=>`<span class="map-status-pill done" title="${esc(s.text)}" style="background:${treatyColor(s.tid)}15;border-color:${treatyColor(s.tid)}55;color:${treatyColor(s.tid)}">${esc(s.name)} · ${fmt(s.gross)}</span>`).join('') : '<span class="map-status-pill">미연결</span>';
    return `<div class="accident-map-card ${summary.length?'mapped':''}">
      <div class="accident-map-top"><div><b>${esc(acc.claimNo||'-')}</b><br><small>${esc(acc.policyNo||'-')}</small></div><span class="map-status-pill ${summary.length?'done':''}">${summary.length ? '연결 '+summary.length+'개 프로그램' : '미연결'}</span></div>
      <div class="accident-map-meta">${esc(acc.insured||'-')} · ${esc(acc.line||'-')} · ${esc(acc.cause||'-')}<br>${esc(acc.country||'-')} / ${esc(acc.city||'-')} · 사고일 ${esc(acc.claimDate||'-')}</div>
      <div class="accident-map-amount"><span>Paid ${fmt(acc.paidLossEok)}</span><span>OS ${fmt(acc.outstandingLossEok)}</span><span>Gross ${fmt(num(acc.grossLossEok)||num(acc.paidLossEok)+num(acc.outstandingLossEok))}</span></div>
      <div class="multi-prog-box"><div class="multi-prog-title">적용 프로그램 선택</div><div class="multi-prog-grid">${programs}</div></div>
      <div class="manual-alloc-section">${selected.length ? selected.map(tid=>renderAllocationEditor(acc, tid)).join('') : '<div class="mini-msg">먼저 적용 프로그램을 선택하세요. 선택 후 프로그램별 Layer에 금액을 직접 입력할 수 있습니다.</div>'}</div>
      <div class="allocation-box"><div class="multi-prog-title">현재 연결 결과</div><div class="allocation-pills">${chips}</div>${summary.length ? `<div class="alloc-note">${summary.map(s=>`<div><b>${esc(s.name)}</b> : ${esc(s.text)}</div>`).join('')}</div>` : ''}</div>
      <div class="accident-map-actions"><button class="save-btn" onclick="applyProgramsForClaimManual('${esc(acc.claimNo||'')}')">프로그램 반영</button><button class="secondary-btn" onclick="clearProgramsForClaimManual('${esc(acc.claimNo||'')}')">전체 해제</button></div>
    </div>`;
  }

  window.toggleProgramForClaim = function(claimNo, treatyId, checked){
    restoreDrafts();
    const draft = getClaimDraft(claimNo);
    if(checked){ if(!draft[treatyId]) draft[treatyId] = {}; }
    else delete draft[treatyId];
    saveAllPlus();
    if(typeof window.renderLayerTable==='function') window.renderLayerTable();
  };

  window.applyProgramsForClaimManual = function(claimNo){
    restoreDrafts();
    const acc = getAccidents().find(a=>String(a.claimNo||'')===String(claimNo));
    if(!acc) return alert('사고계약 데이터를 찾지 못했습니다.');
    const draft = getClaimDraft(claimNo);
    const selected = Object.keys(draft);
    if(!selected.length) return alert('최소 1개 프로그램을 선택하세요.');
    const gross = num(acc.grossLossEok) || (num(acc.paidLossEok)+num(acc.outstandingLossEok));
    const paidRatio = gross>0 ? num(acc.paidLossEok)/gross : 0;
    const osRatio = gross>0 ? num(acc.outstandingLossEok)/gross : 0;
    const newLinks = [];

    for(const treatyId of selected){
      const treaty = getTreaty(treatyId);
      let treatySum = 0;
      for(const layer of (treaty.layers||[])){
        const input = $(`alloc_${slug(acc.claimNo)}_${slug(treatyId)}_${slug(layer.layer)}`);
        const allocGross = num(input?.value);
        if(allocGross<=0) continue;
        const status = statusForLayer(treatyId, layer.layer);
        if(!status) continue;
        const layerCap = num(status.baseLimitEok) + num(status.reinstatedLimitEok || 0);
        if(allocGross > layerCap){
          alert(`${treaty.name} / ${layer.layer} 입력금액이 Layer 한도(${fmt(layerCap)})를 초과했습니다.`);
          return;
        }
        treatySum += allocGross;
        if(!draft[treatyId]) draft[treatyId] = {};
        draft[treatyId][layer.layer] = allocGross;
        newLinks.push({
          statusId: status.statusId,
          treatyId,
          treatyName: treaty.name,
          layer: layer.layer,
          claimNo: acc.claimNo || '',
          policyNo: acc.policyNo || '',
          insured: acc.insured || '',
          cause: acc.cause || '',
          country: acc.country || '',
          city: acc.city || '',
          claimDate: acc.claimDate || '',
          grossLossEok: gross,
          paidLossEok: num(acc.paidLossEok),
          outstandingLossEok: num(acc.outstandingLossEok),
          allocGrossEok: allocGross,
          allocPaidEok: +(allocGross * paidRatio).toFixed(1),
          allocOutstandingEok: +(allocGross * osRatio).toFixed(1),
          note: '사용자 수동 Layer 배분',
          mappedBy: user(),
          mappedAt: now()
        });
      }
      if(treatySum > gross){
        alert(`${treaty.name}에 배분한 금액 합계(${fmt(treatySum)})가 사고 Gross(${fmt(gross)})를 초과했습니다.`);
        return;
      }
    }

    if(!newLinks.length) return alert('선택한 프로그램의 Layer별 금액을 입력하세요.');
    if(!confirm(`${claimNo} 사고계약의 프로그램/Layer 배분을 저장할까요?`)) return;
    state.layerClaims = getLayerClaims().filter(x=>String(x.claimNo||'')!==String(claimNo));
    newLinks.forEach(x=>state.layerClaims.push(x));
    recalcAll();
    saveAllPlus();
    if(typeof window.renderLayerTable==='function') window.renderLayerTable();
    if(typeof window.renderDashboard==='function') window.renderDashboard();
  };

  window.clearProgramsForClaimManual = function(claimNo){
    if(!confirm(`${claimNo} 사고계약의 프로그램/Layer 연결을 모두 해제할까요?`)) return;
    restoreDrafts();
    delete state.claimLayerDrafts[claimNo];
    state.layerClaims = getLayerClaims().filter(x=>String(x.claimNo||'')!==String(claimNo));
    recalcAll();
    saveAllPlus();
    if(typeof window.renderLayerTable==='function') window.renderLayerTable();
    if(typeof window.renderDashboard==='function') window.renderDashboard();
  };

  window.removeLayerClaimV59 = function(statusId, claimNo){
    if(!confirm(`${claimNo}의 연결을 삭제할까요?`)) return;
    const entry = getLayerClaims().find(x=>x.statusId===statusId && String(x.claimNo||'')===String(claimNo));
    if(!entry) return;
    restoreDrafts();
    if(state.claimLayerDrafts?.[claimNo]?.[entry.treatyId]) delete state.claimLayerDrafts[claimNo][entry.treatyId][entry.layer];
    state.layerClaims = getLayerClaims().filter(x=>!(x.statusId===statusId && String(x.claimNo||'')===String(claimNo)));
    recalcAll(); saveAllPlus();
    if(typeof window.renderLayerTable==='function') window.renderLayerTable();
    if(typeof window.renderDashboard==='function') window.renderDashboard();
  };

  const oldRenderLayerTable = window.renderLayerTable;
  window.renderLayerTable = function(){
    restoreDrafts();
    const oldTable=$('layerTable');
    let host=$('layerBoardHost');
    if(!host){
      host=document.createElement('div'); host.id='layerBoardHost';
      if(oldTable){
        const parent=oldTable.closest('.table-scroll') || oldTable.parentElement;
        if(parent){ parent.innerHTML=''; parent.appendChild(host); }
      }else{
        const sec=$('layer'); if(sec) sec.appendChild(host);
      }
    }
    const q=($('layerAccSearch')?.value || '').toLowerCase().trim();
    const filter=$('layerAccFilter')?.value || '전체';
    const accidents=getAccidents().filter(a=>{
      const mapped = mappingEntriesForAccident(a).length>0;
      const okFilter = filter==='전체' || (filter==='미연결' && !mapped) || (filter==='연결완료' && mapped);
      const okQ = !q || JSON.stringify(a).toLowerCase().includes(q);
      return okFilter && okQ;
    }).slice(0,160);
    const mappedCnt=getAccidents().filter(a=>mappingEntriesForAccident(a).length>0).length;
    const unlinkedCnt=Math.max(0,getAccidents().length-mappedCnt);
    const by={}; (state.layers||[]).forEach((s,i)=>{ (by[s.treatyId]=by[s.treatyId]||[]).push({...s,_idx:i}); });
    host.innerHTML = `<div class="layer-workspace-v58">
      <div class="layer-accident-panel">
        <div class="layer-panel-title"><div><h3>기간계 사고계약 데이터</h3><p>사고계약은 여러 재보험 프로그램에 동시에 연결할 수 있으며, 프로그램별로 어느 Layer에 얼마를 배분할지 직접 입력합니다.</p></div></div>
        <div class="layer-map-summary"><div><span>전체</span><b>${getAccidents().length}</b></div><div><span>연결완료</span><b>${mappedCnt}</b></div><div><span>미연결</span><b>${unlinkedCnt}</b></div><div><span>표시</span><b>${accidents.length}</b></div></div>
        <div class="layer-accident-toolbar"><input id="layerAccSearch" placeholder="사고번호, 증권번호, 피보험자 검색" value="${esc($('layerAccSearch')?.value||'')}" oninput="renderLayerTable()"><select id="layerAccFilter" onchange="renderLayerTable()"><option ${filter==='전체'?'selected':''}>전체</option><option ${filter==='미연결'?'selected':''}>미연결</option><option ${filter==='연결완료'?'selected':''}>연결완료</option></select></div>
        <div class="layer-accident-list">${accidents.length ? accidents.map(renderAccidentCardManual).join('') : '<div class="mini-msg">표시할 사고계약 데이터가 없습니다. 관리자 메뉴에서 기간계 사고계약 데이터를 업로드하세요.</div>'}</div>
      </div>
      <div class="layer-program-panel">
        <div class="layer-panel-title"><div><h3>재보험 프로그램 / Layer 소진 현황</h3><p>사용자가 입력한 Layer 배분 결과가 프로그램별 사용액으로 집계됩니다.</p></div></div>
        <div class="layer-program-board-v58">${Object.keys(by).map(tid=>{
          const t=getTreaty(tid); const color=treatyColor(tid); const totalLimit=by[tid].reduce((a,s)=>a+num(s.baseLimitEok)+num(s.reinstatedLimitEok),0); const totalUsed=by[tid].reduce((a,s)=>a+num(s.paidUsedEok)+num(s.outstandingUsedEok),0);
          const pct = Math.round((totalUsed/Math.max(1,totalLimit))*100);
          return `<div class="program-v58" style="--program-color:${color}"><div class="program-v58-head"><div><h3>${esc(t.name||tid)}</h3><small>${esc(t.description||'')}</small></div><span class="program-total-v58">총 ${pct}%</span></div>${by[tid].map(s=>{
            const limit=num(s.baseLimitEok)+num(s.reinstatedLimitEok); const used=num(s.paidUsedEok)+num(s.outstandingUsedEok); const burn=Math.round((used/Math.max(1,limit))*100); const linked=mappingEntriesForStatus(s.statusId);
            return `<div class="layer-v58"><div class="layer-v58-title"><div><b>${esc(s.layer)}</b><br><small>${fmt((getTreaty(tid).layers.find(x=>x.layer===s.layer)||{}).from || 0)} 초과 ~ ${fmt((getTreaty(tid).layers.find(x=>x.layer===s.layer)||{}).to || limit)}</small></div><span class="program-total-v58">${burn}%</span></div><div class="layer-v58-bar"><div class="layer-v58-fill" style="width:${Math.min(100,burn)}%"></div></div><div class="layer-v58-inputs"><label>Paid<input id="ly_paid_${s._idx}" type="number" value="${num(s.paidUsedEok)}"></label><label>Outstanding<input id="ly_os_${s._idx}" type="number" value="${num(s.outstandingUsedEok)}"></label><label>복원 후 한도<input id="ly_re_${s._idx}" type="number" value="${num(s.reinstatedLimitEok)}"></label><button class="save-btn" onclick="saveLayerV59(${s._idx})">저장</button></div><div class="linked-accidents-v58">${linked.length ? linked.map(m=>`<span class="chip" title="${esc(m.claimNo)} / ${esc(m.insured||'')} / ${esc(m.layer)} / 할당 Gross ${fmt(m.allocGrossEok||0)}">${esc(m.claimNo)} · ${fmt(m.allocGrossEok||0)}<button onclick="removeLayerClaimV59('${esc(s.statusId)}','${esc(m.claimNo)}')">×</button></span>`).join('') : '<span class="layer-empty">연결된 사고계약 없음</span>'}</div></div>`;
          }).join('')}</div>`;
        }).join('')}</div>
      </div>
    </div>`;
  };

  function injectStyle(){
    if(document.getElementById('v60-manual-style')) return;
    const css = `
      .manual-alloc-section{display:flex;flex-direction:column;gap:10px;margin-top:10px}
      .alloc-program-box{border:1px solid #dbeafe;border-left:4px solid var(--alloc-accent);border-radius:12px;padding:10px;background:#ffffff}
      .alloc-program-title{font-weight:800;color:#0f172a;margin-bottom:8px;font-size:13px}
      .alloc-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:6px 0;border-top:1px dashed #e2e8f0}
      .alloc-row:first-child{border-top:none;padding-top:0}
      .alloc-row-left{display:flex;flex-direction:column;gap:2px}
      .alloc-row-left small{font-size:11px;color:#64748b}
      .alloc-row-right{display:flex;align-items:center;gap:8px}
      .alloc-row-right input{width:100px;height:34px;border:1px solid #cbd5e1;border-radius:8px;padding:0 10px}
      .alloc-row-right span{font-size:11px;color:#64748b;white-space:nowrap}
    `;
    const style=document.createElement('style'); style.id='v60-manual-style'; style.innerHTML=css; document.head.appendChild(style);
  }

  window.addEventListener('load',()=>setTimeout(()=>{
    restoreDrafts();
    injectStyle();
    if(typeof window.renderLayerTable==='function') window.renderLayerTable();
  },1800));
})();

/* ===== v61: Layer 소진 관리 - 검색/선택 후 상세 배분 UX ===== */
(function(){
  const $ = (id)=>document.getElementById(id);
  const num = (v)=>Number(v||0) || 0;
  const fmt = (v)=> (typeof eok === 'function') ? eok(num(v)) : `${Math.round(num(v)).toLocaleString()}억원`;
  const esc = (v)=>String(v ?? '').replace(/[&<>"']/g, s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  const now = ()=> new Date().toISOString().slice(0,16).replace('T',' ');
  const user = ()=> (typeof currentUser === 'function' ? currentUser() : 'DEMO');
  const slug = (v)=>String(v||'').replace(/[^a-zA-Z0-9가-힣]/g,'_');
  const treatyColor = (tid)=>({'TR-01':'#2563eb','TR-02':'#059669','TR-03':'#7c3aed','TR-04':'#ea580c'}[tid] || '#334155');
  const getTreaties = ()=> (state.treaties && state.treaties.length ? state.treaties : (DATA.treaties||[]));
  const getTreaty = (tid)=> getTreaties().find(t=>t.treatyId===tid) || {treatyId:tid,name:tid,description:'',layers:[]};
  const getAccidents = ()=> state.accidents || [];
  const getLayerClaims = ()=> state.layerClaims || (state.layerClaims=[]);
  const accidentKey = (a)=> String(a?.claimNo || a?.policyNo || '').trim();

  function initV61(){
    if(!state.claimLayerDrafts){
      try{ state.claimLayerDrafts = JSON.parse(localStorage.getItem('gra_v37_claim_layer_drafts') || '{}') || {}; }
      catch(e){ state.claimLayerDrafts = {}; }
    }
    if(!state.selectedLayerAccident){
      const firstMapped = getAccidents().find(a=>mappingEntriesForAccident(a).length>0);
      const first = firstMapped || getAccidents()[0];
      if(first) state.selectedLayerAccident = first.claimNo;
    }
  }
  function saveV61(){
    try{ localStorage.setItem('gra_v37_layer_claims', JSON.stringify(state.layerClaims || [])); }catch(e){}
    try{ localStorage.setItem('gra_v37_claim_layer_drafts', JSON.stringify(state.claimLayerDrafts || {})); }catch(e){}
    try{ if(typeof saveAll==='function') saveAll(); }catch(e){}
  }
  function statusForLayer(treatyId, layerName){
    return (state.layers||[]).find(s=>s.treatyId===treatyId && s.layer===layerName) || null;
  }
  function mappingEntriesForAccident(acc){
    const k = accidentKey(acc);
    return getLayerClaims().filter(x => String(x.claimNo||'')===k || (!!acc.policyNo && String(x.policyNo||'')===String(acc.policyNo)));
  }
  function mappingEntriesForStatus(statusId){
    return getLayerClaims().filter(x=>x.statusId===statusId);
  }
  function getClaimDraft(claimNo){
    initV61();
    if(!state.claimLayerDrafts[claimNo]) state.claimLayerDrafts[claimNo] = {};
    return state.claimLayerDrafts[claimNo];
  }
  function hydrateDraftFromMappings(acc){
    const draft = getClaimDraft(acc.claimNo);
    const maps = mappingEntriesForAccident(acc);
    if(Object.keys(draft).length===0 && maps.length){
      maps.forEach(m=>{
        const tid = m.treatyId || ((state.layers||[]).find(s=>s.statusId===m.statusId)||{}).treatyId;
        if(!tid) return;
        if(!draft[tid]) draft[tid] = {};
        draft[tid][m.layer] = num(m.allocGrossEok || m.grossLossEok);
      });
    }
    return draft;
  }
  function selectedTreatyIds(acc){
    const draft = hydrateDraftFromMappings(acc);
    const fromDraft = Object.keys(draft).filter(tid=>draft[tid] && Object.keys(draft[tid]).length>=0);
    const fromMap = [...new Set(mappingEntriesForAccident(acc).map(m=>m.treatyId).filter(Boolean))];
    return [...new Set([...fromDraft, ...fromMap])];
  }
  function recalcLayerUse(statusId){
    const s = (state.layers||[]).find(x=>x.statusId===statusId); if(!s) return;
    const linked = mappingEntriesForStatus(statusId);
    s.paidUsedEok = +linked.reduce((a,m)=>a+num(m.allocPaidEok ?? m.paidLossEok),0).toFixed(1);
    s.outstandingUsedEok = +linked.reduce((a,m)=>a+num(m.allocOutstandingEok ?? m.outstandingLossEok),0).toFixed(1);
    s.updatedBy = user(); s.updatedAt = now();
  }
  function recalcAll(){ (state.layers||[]).forEach(s=>recalcLayerUse(s.statusId)); }
  function allocationSummaryForAccident(acc){
    const byTreaty = {};
    mappingEntriesForAccident(acc).forEach(m=>{
      const tid = m.treatyId || ((state.layers||[]).find(s=>s.statusId===m.statusId)||{}).treatyId;
      if(!tid) return;
      (byTreaty[tid] = byTreaty[tid] || []).push(m);
    });
    return Object.keys(byTreaty).map(tid=>{
      const treaty = getTreaty(tid);
      const gross = byTreaty[tid].reduce((a,m)=>a+num(m.allocGrossEok||m.grossLossEok),0);
      const txt = byTreaty[tid].map(m=>`${m.layer}: ${fmt(m.allocGrossEok||0)}`).join(' / ');
      return {tid, name:treaty.name||tid, gross, text:txt};
    });
  }
  function calcTotalDraft(acc){
    const draft = hydrateDraftFromMappings(acc);
    let sum = 0;
    Object.keys(draft).forEach(tid=>Object.values(draft[tid]||{}).forEach(v=>sum += num(v)));
    return sum;
  }
  function selectedAccident(){
    initV61();
    return getAccidents().find(a=>String(a.claimNo||'')===String(state.selectedLayerAccident)) || getAccidents()[0] || null;
  }

  function renderCompactAccidentRow(acc){
    const mapped = mappingEntriesForAccident(acc);
    const active = String(acc.claimNo||'')===String(state.selectedLayerAccident);
    const summary = allocationSummaryForAccident(acc);
    return `<button class="acc-row-v61 ${active?'active':''}" onclick="selectLayerAccidentV61('${esc(acc.claimNo||'')}')">
      <div class="acc-row-main">
        <b>${esc(acc.claimNo||'-')}</b>
        <span class="${mapped.length?'status-ok':'status-warn'}">${mapped.length?'연결 '+summary.length+'개 프로그램':'미연결'}</span>
      </div>
      <div class="acc-row-sub">${esc(acc.policyNo||'-')} · ${esc(acc.insured||'-')}</div>
      <div class="acc-row-sub">${esc(acc.cause||'-')} · Gross ${fmt(num(acc.grossLossEok)||num(acc.paidLossEok)+num(acc.outstandingLossEok))}</div>
    </button>`;
  }

  function renderSelectedDetail(acc){
    if(!acc) return `<div class="layer-detail-empty"><b>사고계약을 선택하세요.</b><br>좌측 목록에서 사고번호 또는 증권번호로 검색 후 선택하면 프로그램/Layer 배분 입력 화면이 열립니다.</div>`;
    const selected = selectedTreatyIds(acc);
    const gross = num(acc.grossLossEok) || num(acc.paidLossEok)+num(acc.outstandingLossEok);
    const summary = allocationSummaryForAccident(acc);
    const draftSum = calcTotalDraft(acc);
    const programs = getTreaties().map(t=>`<label class="prog-check-v61" style="--pc:${treatyColor(t.treatyId)}">
      <input type="checkbox" data-claim="${esc(acc.claimNo||'')}" value="${esc(t.treatyId)}" ${selected.includes(t.treatyId)?'checked':''} onchange="toggleProgramForClaimV61('${esc(acc.claimNo||'')}','${esc(t.treatyId)}',this.checked)">
      <span>${esc(t.name)}</span>
    </label>`).join('');

    const editors = selected.length ? selected.map(tid=>renderAllocationEditor(acc, tid)).join('') : `<div class="mini-msg">적용할 재보험 프로그램을 선택하면 Layer별 배분금액 입력란이 표시됩니다.</div>`;

    return `<div class="selected-acc-v61">
      <div class="selected-head-v61">
        <div>
          <div class="eyebrow">선택 사고계약</div>
          <h3>${esc(acc.claimNo||'-')}</h3>
          <p>${esc(acc.policyNo||'-')} · ${esc(acc.insured||'-')}</p>
        </div>
        <span class="gross-pill">Gross ${fmt(gross)}</span>
      </div>

      <div class="acc-facts-v61">
        <div><span>사고유형</span><b>${esc(acc.cause||'-')}</b></div>
        <div><span>사고일</span><b>${esc(acc.claimDate||'-')}</b></div>
        <div><span>Paid</span><b>${fmt(acc.paidLossEok)}</b></div>
        <div><span>Outstanding</span><b>${fmt(acc.outstandingLossEok)}</b></div>
      </div>

      <div class="detail-block-v61">
        <div class="block-title-v61">1. 적용 프로그램 선택</div>
        <div class="program-pick-grid-v61">${programs}</div>
      </div>

      <div class="detail-block-v61">
        <div class="block-title-v61">2. 프로그램별 Layer 배분금액 입력</div>
        <div class="alloc-guide-v61">사용자가 직접 어느 XL 프로그램의 어느 Layer에 얼마를 반영할지 입력합니다. 입력 합계: <b>${fmt(draftSum)}</b></div>
        <div class="manual-alloc-section">${editors}</div>
      </div>

      <div class="detail-block-v61">
        <div class="block-title-v61">3. 현재 반영 결과</div>
        <div class="allocation-pills">
          ${summary.length ? summary.map(s=>`<span class="map-status-pill done" title="${esc(s.text)}" style="background:${treatyColor(s.tid)}15;border-color:${treatyColor(s.tid)}55;color:${treatyColor(s.tid)}">${esc(s.name)} · ${fmt(s.gross)}</span>`).join('') : '<span class="map-status-pill">아직 반영된 프로그램 없음</span>'}
        </div>
        ${summary.length ? `<div class="alloc-note">${summary.map(s=>`<div><b>${esc(s.name)}</b> : ${esc(s.text)}</div>`).join('')}</div>` : ''}
      </div>

      <div class="detail-actions-v61">
        <button class="save-btn" onclick="applyProgramsForClaimV61('${esc(acc.claimNo||'')}')">배분결과 저장</button>
        <button class="secondary-btn" onclick="clearProgramsForClaimV61('${esc(acc.claimNo||'')}')">전체 해제</button>
      </div>
    </div>`;
  }

  function renderAllocationEditor(acc, treatyId){
    const treaty = getTreaty(treatyId);
    const draft = getClaimDraft(acc.claimNo);
    const layerRows = (treaty.layers || []).map(layer=>{
      const status = statusForLayer(treatyId, layer.layer); if(!status) return '';
      const cap = num(status.baseLimitEok) + num(status.reinstatedLimitEok || 0);
      const value = num((draft[treatyId]||{})[layer.layer]);
      return `<div class="alloc-row-v61">
        <div class="alloc-row-left"><b>${esc(layer.layer)}</b><small>${fmt(layer.from||0)} 초과 ~ ${fmt(layer.to||cap)}</small></div>
        <div class="alloc-row-right"><input type="number" id="alloc_${slug(acc.claimNo)}_${slug(treatyId)}_${slug(layer.layer)}" value="${value}" placeholder="0"><span>${fmt(cap)} 한도</span></div>
      </div>`;
    }).join('');
    return `<div class="alloc-program-box-v61" style="--alloc-accent:${treatyColor(treatyId)}">
      <div class="alloc-program-title">${esc(treaty.name)}</div>${layerRows}
    </div>`;
  }

  window.selectLayerAccidentV61 = function(claimNo){
    state.selectedLayerAccident = claimNo;
    saveV61();
    window.renderLayerTable();
  };

  window.toggleProgramForClaimV61 = function(claimNo, treatyId, checked){
    initV61();
    const draft = getClaimDraft(claimNo);
    if(checked){ if(!draft[treatyId]) draft[treatyId] = {}; }
    else delete draft[treatyId];
    saveV61();
    window.renderLayerTable();
  };

  window.applyProgramsForClaimV61 = function(claimNo){
    initV61();
    const acc = getAccidents().find(a=>String(a.claimNo||'')===String(claimNo));
    if(!acc) return alert('사고계약 데이터를 찾지 못했습니다.');
    const draft = getClaimDraft(claimNo);
    const selected = Object.keys(draft);
    if(!selected.length) return alert('적용할 재보험 프로그램을 먼저 선택하세요.');

    const gross = num(acc.grossLossEok) || (num(acc.paidLossEok)+num(acc.outstandingLossEok));
    const paidRatio = gross>0 ? num(acc.paidLossEok)/gross : 0;
    const osRatio = gross>0 ? num(acc.outstandingLossEok)/gross : 0;
    const newLinks = [];

    for(const treatyId of selected){
      const treaty = getTreaty(treatyId);
      let treatySum = 0;
      for(const layer of (treaty.layers||[])){
        const input = $(`alloc_${slug(acc.claimNo)}_${slug(treatyId)}_${slug(layer.layer)}`);
        const allocGross = num(input?.value);
        if(!draft[treatyId]) draft[treatyId] = {};
        draft[treatyId][layer.layer] = allocGross;
        if(allocGross<=0) continue;
        const status = statusForLayer(treatyId, layer.layer);
        if(!status) continue;
        const layerCap = num(status.baseLimitEok) + num(status.reinstatedLimitEok || 0);
        if(allocGross > layerCap){
          alert(`${treaty.name} / ${layer.layer} 입력금액이 Layer 한도(${fmt(layerCap)})를 초과했습니다.`);
          return;
        }
        treatySum += allocGross;
        newLinks.push({
          statusId: status.statusId,
          treatyId,
          treatyName: treaty.name,
          layer: layer.layer,
          claimNo: acc.claimNo || '',
          policyNo: acc.policyNo || '',
          insured: acc.insured || '',
          cause: acc.cause || '',
          country: acc.country || '',
          city: acc.city || '',
          claimDate: acc.claimDate || '',
          grossLossEok: gross,
          paidLossEok: num(acc.paidLossEok),
          outstandingLossEok: num(acc.outstandingLossEok),
          allocGrossEok: allocGross,
          allocPaidEok: +(allocGross * paidRatio).toFixed(1),
          allocOutstandingEok: +(allocGross * osRatio).toFixed(1),
          note: '사용자 수동 Layer 배분',
          mappedBy: user(),
          mappedAt: now()
        });
      }
      if(treatySum > gross){
        alert(`${treaty.name}에 배분한 금액 합계(${fmt(treatySum)})가 사고 Gross(${fmt(gross)})를 초과했습니다.`);
        return;
      }
    }
    if(!newLinks.length) return alert('Layer별 배분금액을 입력하세요.');
    if(!confirm(`${claimNo} 사고계약의 프로그램/Layer 배분결과를 저장할까요?`)) return;

    state.layerClaims = getLayerClaims().filter(x=>String(x.claimNo||'')!==String(claimNo));
    newLinks.forEach(x=>state.layerClaims.push(x));
    recalcAll();
    saveV61();
    window.renderLayerTable();
    if(typeof window.renderDashboard==='function') window.renderDashboard();
  };

  window.clearProgramsForClaimV61 = function(claimNo){
    if(!confirm(`${claimNo} 사고계약의 프로그램/Layer 연결을 모두 해제할까요?`)) return;
    initV61();
    delete state.claimLayerDrafts[claimNo];
    state.layerClaims = getLayerClaims().filter(x=>String(x.claimNo||'')!==String(claimNo));
    recalcAll();
    saveV61();
    window.renderLayerTable();
    if(typeof window.renderDashboard==='function') window.renderDashboard();
  };

  window.removeLayerClaimV61 = function(statusId, claimNo){
    if(!confirm(`${claimNo}의 해당 Layer 연결을 삭제할까요?`)) return;
    const entry = getLayerClaims().find(x=>x.statusId===statusId && String(x.claimNo||'')===String(claimNo));
    if(entry && state.claimLayerDrafts?.[claimNo]?.[entry.treatyId]){
      delete state.claimLayerDrafts[claimNo][entry.treatyId][entry.layer];
    }
    state.layerClaims = getLayerClaims().filter(x=>!(x.statusId===statusId && String(x.claimNo||'')===String(claimNo)));
    recalcAll();
    saveV61();
    window.renderLayerTable();
    if(typeof window.renderDashboard==='function') window.renderDashboard();
  };

  window.saveLayerV61 = function(index){
    const s=(state.layers||[])[index]; if(!s) return;
    if(!confirm(`${s.treatyName} / ${s.layer}의 사용액을 저장할까요?`)) return;
    s.paidUsedEok=num($(`ly_paid_${index}`)?.value);
    s.outstandingUsedEok=num($(`ly_os_${index}`)?.value);
    s.reinstatedLimitEok=num($(`ly_re_${index}`)?.value);
    s.updatedBy=user(); s.updatedAt=now();
    try{ if(typeof saveAll==='function') saveAll(); }catch(e){}
    window.renderLayerTable();
    if(typeof window.renderDashboard==='function') window.renderDashboard();
  };

  function renderProgramLayerCard(status, index){
    const treaty = getTreaty(status.treatyId);
    const layerDef = (treaty.layers||[]).find(x=>x.layer===status.layer) || {};
    const limit = num(status.baseLimitEok) + num(status.reinstatedLimitEok);
    const used = num(status.paidUsedEok) + num(status.outstandingUsedEok);
    const burn = Math.round((used/Math.max(1,limit))*100);
    const linked = mappingEntriesForStatus(status.statusId);
    return `<div class="layer-v61">
      <div class="layer-v58-title"><div><b>${esc(status.layer)}</b><br><small>${fmt(layerDef.from||0)} 초과 ~ ${fmt(layerDef.to||limit)}</small></div><span class="program-total-v58">${burn}%</span></div>
      <div class="layer-v58-bar"><div class="layer-v58-fill" style="width:${Math.min(100,burn)}%"></div></div>
      <div class="layer-v58-inputs">
        <label>Paid<input id="ly_paid_${index}" type="number" value="${num(status.paidUsedEok)}"></label>
        <label>Outstanding<input id="ly_os_${index}" type="number" value="${num(status.outstandingUsedEok)}"></label>
        <label>복원 후 한도<input id="ly_re_${index}" type="number" value="${num(status.reinstatedLimitEok)}"></label>
        <button class="save-btn" onclick="saveLayerV61(${index})">저장</button>
      </div>
      <div class="linked-accidents-v58">${linked.length ? linked.map(m=>`<span class="chip" title="${esc(m.claimNo)} / ${esc(m.insured||'')} / ${esc(m.layer)} / 할당 Gross ${fmt(m.allocGrossEok||0)}">${esc(m.claimNo)} · ${fmt(m.allocGrossEok||0)}<button onclick="removeLayerClaimV61('${esc(status.statusId)}','${esc(m.claimNo)}')">×</button></span>`).join('') : '<span class="layer-empty">연결된 사고계약 없음</span>'}</div>
    </div>`;
  }

  window.renderLayerTable = function(){
    initV61();
    const oldTable=$('layerTable');
    let host=$('layerBoardHost');
    if(!host){
      host=document.createElement('div'); host.id='layerBoardHost';
      if(oldTable){
        const parent=oldTable.closest('.table-scroll') || oldTable.parentElement;
        if(parent){ parent.innerHTML=''; parent.appendChild(host); }
      }else{
        const sec=$('layer'); if(sec) sec.appendChild(host);
      }
    }
    const q=($('layerAccSearch')?.value || '').toLowerCase().trim();
    const filter=$('layerAccFilter')?.value || '전체';
    const accidents=getAccidents().filter(a=>{
      const mapped = mappingEntriesForAccident(a).length>0;
      const okFilter = filter==='전체' || (filter==='미연결' && !mapped) || (filter==='연결완료' && mapped);
      const okQ = !q || JSON.stringify(a).toLowerCase().includes(q);
      return okFilter && okQ;
    }).slice(0,120);
    const mappedCnt=getAccidents().filter(a=>mappingEntriesForAccident(a).length>0).length;
    const unlinkedCnt=Math.max(0,getAccidents().length-mappedCnt);
    const selected = selectedAccident();
    const by={}; (state.layers||[]).forEach((s,i)=>{ (by[s.treatyId]=by[s.treatyId]||[]).push({...s,_idx:i}); });

    host.innerHTML = `<div class="layer-workspace-v61">
      <div class="layer-search-panel-v61">
        <div class="layer-panel-title"><div><h3>기간계 사고계약 데이터</h3><p>사고계약을 검색·선택한 후 우측에서 프로그램/Layer 배분금액을 입력합니다.</p></div></div>
        <div class="layer-map-summary"><div><span>전체</span><b>${getAccidents().length}</b></div><div><span>연결완료</span><b>${mappedCnt}</b></div><div><span>미연결</span><b>${unlinkedCnt}</b></div></div>
        <div class="layer-accident-toolbar"><input id="layerAccSearch" placeholder="사고번호, 증권번호, 피보험자 검색" value="${esc($('layerAccSearch')?.value||'')}" oninput="renderLayerTable()"><select id="layerAccFilter" onchange="renderLayerTable()"><option ${filter==='전체'?'selected':''}>전체</option><option ${filter==='미연결'?'selected':''}>미연결</option><option ${filter==='연결완료'?'selected':''}>연결완료</option></select></div>
        <div class="acc-list-compact-v61">${accidents.length ? accidents.map(renderCompactAccidentRow).join('') : '<div class="mini-msg">검색 결과가 없습니다.</div>'}</div>
      </div>

      <div class="layer-detail-panel-v61">
        ${renderSelectedDetail(selected)}
      </div>
    </div>

    <div class="layer-program-panel-v61">
      <div class="layer-panel-title"><div><h3>재보험 프로그램 / Layer 소진 현황</h3><p>저장된 사고계약 배분 결과가 프로그램별 사용액으로 집계됩니다.</p></div></div>
      <div class="layer-program-board-v58">${Object.keys(by).map(tid=>{
        const t=getTreaty(tid); const color=treatyColor(tid); const totalLimit=by[tid].reduce((a,s)=>a+num(s.baseLimitEok)+num(s.reinstatedLimitEok),0); const totalUsed=by[tid].reduce((a,s)=>a+num(s.paidUsedEok)+num(s.outstandingUsedEok),0); const burn=Math.round((totalUsed/Math.max(1,totalLimit))*100);
        return `<div class="program-v58" style="--program-color:${color}"><div class="program-v58-head"><div><h3>${esc(t.name||tid)}</h3><small>${esc(t.description||'')}</small></div><span class="program-total-v58">총 ${burn}%</span></div>${by[tid].map(s=>renderProgramLayerCard(s,s._idx)).join('')}</div>`;
      }).join('')}</div>
    </div>`;
  };

  function injectStyles(){
    if(document.getElementById('v61-layer-style')) return;
    const css = `
      .layer-workspace-v61{display:grid;grid-template-columns:380px minmax(0,1fr);gap:18px;align-items:start}
      .layer-search-panel-v61,.layer-detail-panel-v61,.layer-program-panel-v61{background:#fff;border:1px solid #dbe4f0;border-radius:18px;padding:18px}
      .acc-list-compact-v61{display:flex;flex-direction:column;gap:10px;max-height:620px;overflow:auto;padding-right:4px;margin-top:12px}
      .acc-row-v61{border:1px solid #e2e8f0;background:#f8fafc;border-radius:14px;padding:12px;text-align:left;cursor:pointer}
      .acc-row-v61.active{border-color:#2563eb;background:#eff6ff;box-shadow:0 0 0 2px rgba(37,99,235,.08)}
      .acc-row-main{display:flex;justify-content:space-between;gap:8px;align-items:center}
      .acc-row-main b{font-size:14px;color:#0f172a}
      .acc-row-sub{font-size:12px;color:#64748b;margin-top:4px;line-height:1.35}
      .status-ok,.status-warn{font-size:11px;border-radius:999px;padding:4px 8px;font-weight:800;white-space:nowrap}
      .status-ok{background:#dcfce7;color:#166534}.status-warn{background:#fff7ed;color:#c2410c}
      .selected-head-v61{display:flex;justify-content:space-between;gap:16px;border-bottom:1px solid #e2e8f0;padding-bottom:14px}
      .selected-head-v61 h3{margin:2px 0 4px}.selected-head-v61 p{margin:0;color:#64748b}.eyebrow{font-size:11px;color:#64748b;font-weight:800;text-transform:uppercase}
      .gross-pill{align-self:flex-start;background:#172554;color:white;border-radius:999px;padding:7px 12px;font-weight:800}
      .acc-facts-v61{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:14px 0}
      .acc-facts-v61 div{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:10px}.acc-facts-v61 span{display:block;font-size:11px;color:#64748b}.acc-facts-v61 b{font-size:13px}
      .detail-block-v61{border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin-top:12px;background:#fff}
      .block-title-v61{font-weight:900;color:#0f172a;margin-bottom:10px}
      .program-pick-grid-v61{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      .prog-check-v61{display:flex;align-items:center;gap:8px;border:1px solid #e2e8f0;border-left:4px solid var(--pc);border-radius:12px;padding:10px;background:#f8fafc;font-size:13px;font-weight:700}
      .alloc-guide-v61{font-size:12px;color:#64748b;margin-bottom:10px}
      .manual-alloc-section{display:flex;flex-direction:column;gap:10px}
      .alloc-program-box-v61{border:1px solid #dbeafe;border-left:4px solid var(--alloc-accent);border-radius:12px;padding:10px;background:#ffffff}
      .alloc-program-title{font-weight:900;color:#0f172a;margin-bottom:8px;font-size:14px}
      .alloc-row-v61{display:grid;grid-template-columns:minmax(0,1fr) 260px;align-items:center;gap:12px;padding:8px 0;border-top:1px dashed #e2e8f0}
      .alloc-row-v61:first-of-type{border-top:none}
      .alloc-row-left{display:flex;flex-direction:column;gap:2px}.alloc-row-left small{font-size:11px;color:#64748b}
      .alloc-row-right{display:flex;align-items:center;gap:8px}.alloc-row-right input{width:110px;height:36px;border:1px solid #cbd5e1;border-radius:9px;padding:0 10px}.alloc-row-right span{font-size:11px;color:#64748b}
      .detail-actions-v61{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}
      .layer-program-panel-v61{margin-top:18px}
      @media(max-width:1100px){.layer-workspace-v61{grid-template-columns:1fr}.acc-list-compact-v61{max-height:320px}.acc-facts-v61{grid-template-columns:repeat(2,minmax(0,1fr))}.program-pick-grid-v61{grid-template-columns:1fr}.alloc-row-v61{grid-template-columns:1fr}}
    `;
    const style=document.createElement('style'); style.id='v61-layer-style'; style.innerHTML=css; document.head.appendChild(style);
  }

  window.addEventListener('load',()=>setTimeout(()=>{
    injectStyles();
    initV61();
    if(typeof window.renderLayerTable==='function') window.renderLayerTable();
  },1900));
})();

/* ===== v62: Risk XL은 사고별 적용, Cat XL은 Event별 합산 적용 ===== */
(function(){
  const $ = (id)=>document.getElementById(id);
  const num = (v)=>Number(v||0) || 0;
  const fmt = (v)=> (typeof eok === 'function') ? eok(num(v)) : `${Math.round(num(v)).toLocaleString()}억원`;
  const esc = (v)=>String(v ?? '').replace(/[&<>"']/g, s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  const now = ()=> new Date().toISOString().slice(0,16).replace('T',' ');
  const user = ()=> (typeof currentUser === 'function' ? currentUser() : 'DEMO');
  const slug = (v)=>String(v||'').replace(/[^a-zA-Z0-9가-힣]/g,'_');
  const treatyColor = (tid)=>({'TR-01':'#2563eb','TR-02':'#059669','TR-03':'#7c3aed','TR-04':'#ea580c'}[tid] || '#334155');
  const getTreaties = ()=> (state.treaties && state.treaties.length ? state.treaties : (DATA.treaties||[]));
  const getTreaty = (tid)=> getTreaties().find(t=>t.treatyId===tid) || {treatyId:tid,name:tid,description:'',layers:[]};
  const getAccidents = ()=> state.accidents || [];
  const getLayerClaims = ()=> state.layerClaims || (state.layerClaims=[]);
  const accidentKey = (a)=> String(a?.claimNo || a?.policyNo || '').trim();

  function isCatTreaty(treaty){
    const txt = `${treaty?.name||''} ${treaty?.type||''}`.toLowerCase();
    return txt.includes('cat');
  }
  function treatyModeLabel(treaty){
    return isCatTreaty(treaty) ? 'Event별 합산 적용' : '사고별 적용';
  }
  function defaultEventKey(acc){
    const cause = String(acc?.cause || 'Event').replace(/\s+/g,' ').trim();
    const d = acc?.claimDate || acc?.lossDate || '';
    return `${cause}${d ? ' / ' + d : ''}`;
  }
  function initV62(){
    if(!state.claimLayerDrafts){
      try{ state.claimLayerDrafts = JSON.parse(localStorage.getItem('gra_v37_claim_layer_drafts') || '{}') || {}; }
      catch(e){ state.claimLayerDrafts = {}; }
    }
    if(!state.selectedLayerAccident){
      const firstMapped = getAccidents().find(a=>mappingEntriesForAccident(a).length>0);
      const first = firstMapped || getAccidents()[0];
      if(first) state.selectedLayerAccident = first.claimNo;
    }
  }
  function saveV62(){
    try{ localStorage.setItem('gra_v37_layer_claims', JSON.stringify(state.layerClaims || [])); }catch(e){}
    try{ localStorage.setItem('gra_v37_claim_layer_drafts', JSON.stringify(state.claimLayerDrafts || {})); }catch(e){}
    try{ if(typeof saveAll==='function') saveAll(); }catch(e){}
  }
  function statusForLayer(treatyId, layerName){
    return (state.layers||[]).find(s=>s.treatyId===treatyId && s.layer===layerName) || null;
  }
  function mappingEntriesForAccident(acc){
    const k = accidentKey(acc);
    return getLayerClaims().filter(x => String(x.claimNo||'')===k || (!!acc.policyNo && String(x.policyNo||'')===String(acc.policyNo)));
  }
  function mappingEntriesForStatus(statusId){
    return getLayerClaims().filter(x=>x.statusId===statusId);
  }
  function getClaimDraft(claimNo){
    initV62();
    if(!state.claimLayerDrafts[claimNo]) state.claimLayerDrafts[claimNo] = {};
    return state.claimLayerDrafts[claimNo];
  }
  function hydrateDraftFromMappings(acc){
    const draft = getClaimDraft(acc.claimNo);
    const maps = mappingEntriesForAccident(acc);
    if(Object.keys(draft).length===0 && maps.length){
      maps.forEach(m=>{
        const tid = m.treatyId || ((state.layers||[]).find(s=>s.statusId===m.statusId)||{}).treatyId;
        if(!tid) return;
        if(!draft[tid]) draft[tid] = {};
        draft[tid][m.layer] = num(m.allocGrossEok || m.grossLossEok);
        if(m.eventKey) draft[tid]._eventKey = m.eventKey;
      });
    }
    return draft;
  }
  function selectedTreatyIds(acc){
    const draft = hydrateDraftFromMappings(acc);
    const fromDraft = Object.keys(draft).filter(tid=>draft[tid] && typeof draft[tid] === 'object');
    const fromMap = [...new Set(mappingEntriesForAccident(acc).map(m=>m.treatyId).filter(Boolean))];
    return [...new Set([...fromDraft, ...fromMap])];
  }
  function selectedAccident(){
    initV62();
    return getAccidents().find(a=>String(a.claimNo||'')===String(state.selectedLayerAccident)) || getAccidents()[0] || null;
  }

  function layerMetric(status){
    const treaty = getTreaty(status.treatyId);
    const entries = mappingEntriesForStatus(status.statusId);
    const limit = num(status.baseLimitEok) + num(status.reinstatedLimitEok);
    if(isCatTreaty(treaty)){
      const byEvent = {};
      entries.forEach(m=>{
        const k = m.eventKey || defaultEventKey(m);
        byEvent[k] = byEvent[k] || {gross:0, paid:0, os:0, count:0};
        byEvent[k].gross += num(m.allocGrossEok);
        byEvent[k].paid += num(m.allocPaidEok ?? m.paidLossEok);
        byEvent[k].os += num(m.allocOutstandingEok ?? m.outstandingLossEok);
        byEvent[k].count += 1;
      });
      const best = Object.keys(byEvent).map(k=>({eventKey:k,...byEvent[k]})).sort((a,b)=>b.gross-a.gross)[0] || {gross:0,paid:0,os:0,count:0,eventKey:''};
      return {usedGross:best.gross, paid:best.paid, os:best.os, burn:Math.round(best.gross/Math.max(1,limit)*100), label:'최고 Event', entries, eventKey:best.eventKey, mode:'cat'};
    }
    const best = entries.map(m=>({
      gross:num(m.allocGrossEok),
      paid:num(m.allocPaidEok ?? m.paidLossEok),
      os:num(m.allocOutstandingEok ?? m.outstandingLossEok),
      claimNo:m.claimNo,
      insured:m.insured
    })).sort((a,b)=>b.gross-a.gross)[0] || {gross:0,paid:0,os:0,claimNo:''};
    return {usedGross:best.gross, paid:best.paid, os:best.os, burn:Math.round(best.gross/Math.max(1,limit)*100), label:'최고 단일사고', entries, bestClaimNo:best.claimNo, mode:'risk'};
  }
  function recalcLayerUse(statusId){
    const s = (state.layers||[]).find(x=>x.statusId===statusId); if(!s) return;
    const metric = layerMetric(s);
    // Risk XL은 별건 사고를 누적하지 않고, 최대 단일사고 기준으로 화면 표시.
    // Cat XL은 동일 Event로 묶인 사고만 합산한 최고 Event 기준으로 화면 표시.
    s.paidUsedEok = +num(metric.paid).toFixed(1);
    s.outstandingUsedEok = +num(metric.os).toFixed(1);
    s.updatedBy = user(); s.updatedAt = now();
  }
  function recalcAll(){ (state.layers||[]).forEach(s=>recalcLayerUse(s.statusId)); }

  function allocationSummaryForAccident(acc){
    const byTreaty = {};
    mappingEntriesForAccident(acc).forEach(m=>{
      const tid = m.treatyId || ((state.layers||[]).find(s=>s.statusId===m.statusId)||{}).treatyId;
      if(!tid) return;
      (byTreaty[tid] = byTreaty[tid] || []).push(m);
    });
    return Object.keys(byTreaty).map(tid=>{
      const treaty = getTreaty(tid);
      const gross = byTreaty[tid].reduce((a,m)=>a+num(m.allocGrossEok||m.grossLossEok),0);
      const txt = byTreaty[tid].map(m=>`${m.layer}: ${fmt(m.allocGrossEok||0)}`).join(' / ');
      return {tid, name:treaty.name||tid, gross, text:txt};
    });
  }
  function calcTotalDraft(acc){
    const draft = hydrateDraftFromMappings(acc);
    let sum = 0;
    Object.keys(draft).forEach(tid=>Object.keys(draft[tid]||{}).forEach(k=>{
      if(!k.startsWith('_')) sum += num(draft[tid][k]);
    }));
    return sum;
  }

  function renderCompactAccidentRow(acc){
    const mapped = mappingEntriesForAccident(acc);
    const active = String(acc.claimNo||'')===String(state.selectedLayerAccident);
    const summary = allocationSummaryForAccident(acc);
    return `<button class="acc-row-v61 ${active?'active':''}" onclick="selectLayerAccidentV62('${esc(acc.claimNo||'')}')">
      <div class="acc-row-main">
        <b>${esc(acc.claimNo||'-')}</b>
        <span class="${mapped.length?'status-ok':'status-warn'}">${mapped.length?'연결 '+summary.length+'개 프로그램':'미연결'}</span>
      </div>
      <div class="acc-row-sub">${esc(acc.policyNo||'-')} · ${esc(acc.insured||'-')}</div>
      <div class="acc-row-sub">${esc(acc.cause||'-')} · Gross ${fmt(num(acc.grossLossEok)||num(acc.paidLossEok)+num(acc.outstandingLossEok))}</div>
    </button>`;
  }

  function renderAllocationEditor(acc, treatyId){
    const treaty = getTreaty(treatyId);
    const draft = getClaimDraft(acc.claimNo);
    const cat = isCatTreaty(treaty);
    const eventVal = esc((draft[treatyId]||{})._eventKey || defaultEventKey(acc));
    const eventInput = cat ? `<label class="event-key-v62">Event 그룹<input id="event_${slug(acc.claimNo)}_${slug(treatyId)}" value="${eventVal}" placeholder="예: 태풍 / 2026-02-28"></label>` : `<div class="mode-note-v62">Risk XL은 사고별 적용 기준이므로 별건 사고는 서로 합산하지 않습니다.</div>`;
    const layerRows = (treaty.layers || []).map(layer=>{
      const status = statusForLayer(treatyId, layer.layer); if(!status) return '';
      const cap = num(status.baseLimitEok) + num(status.reinstatedLimitEok || 0);
      const value = num((draft[treatyId]||{})[layer.layer]);
      return `<div class="alloc-row-v61">
        <div class="alloc-row-left"><b>${esc(layer.layer)}</b><small>${fmt(layer.from||0)} 초과 ~ ${fmt(layer.to||cap)}</small></div>
        <div class="alloc-row-right"><input type="number" id="alloc_${slug(acc.claimNo)}_${slug(treatyId)}_${slug(layer.layer)}" value="${value}" placeholder="0"><span>${fmt(cap)} 한도</span></div>
      </div>`;
    }).join('');
    return `<div class="alloc-program-box-v61" style="--alloc-accent:${treatyColor(treatyId)}">
      <div class="alloc-program-title">${esc(treaty.name)} <span class="mode-badge-v62">${treatyModeLabel(treaty)}</span></div>
      ${eventInput}${layerRows}
    </div>`;
  }

  function renderSelectedDetail(acc){
    if(!acc) return `<div class="layer-detail-empty"><b>사고계약을 선택하세요.</b><br>좌측 목록에서 사고번호 또는 증권번호로 검색 후 선택하면 프로그램/Layer 배분 입력 화면이 열립니다.</div>`;
    const selected = selectedTreatyIds(acc);
    const gross = num(acc.grossLossEok) || num(acc.paidLossEok)+num(acc.outstandingLossEok);
    const summary = allocationSummaryForAccident(acc);
    const draftSum = calcTotalDraft(acc);
    const programs = getTreaties().map(t=>`<label class="prog-check-v61" style="--pc:${treatyColor(t.treatyId)}">
      <input type="checkbox" data-claim="${esc(acc.claimNo||'')}" value="${esc(t.treatyId)}" ${selected.includes(t.treatyId)?'checked':''} onchange="toggleProgramForClaimV62('${esc(acc.claimNo||'')}','${esc(t.treatyId)}',this.checked)">
      <span>${esc(t.name)} <em>${treatyModeLabel(t)}</em></span>
    </label>`).join('');

    return `<div class="selected-acc-v61">
      <div class="selected-head-v61">
        <div><div class="eyebrow">선택 사고계약</div><h3>${esc(acc.claimNo||'-')}</h3><p>${esc(acc.policyNo||'-')} · ${esc(acc.insured||'-')}</p></div>
        <span class="gross-pill">Gross ${fmt(gross)}</span>
      </div>
      <div class="acc-facts-v61">
        <div><span>사고유형</span><b>${esc(acc.cause||'-')}</b></div>
        <div><span>사고일</span><b>${esc(acc.claimDate||'-')}</b></div>
        <div><span>Paid</span><b>${fmt(acc.paidLossEok)}</b></div>
        <div><span>Outstanding</span><b>${fmt(acc.outstandingLossEok)}</b></div>
      </div>
      <div class="detail-block-v61"><div class="block-title-v61">1. 적용 프로그램 선택</div><div class="program-pick-grid-v61">${programs}</div></div>
      <div class="detail-block-v61">
        <div class="block-title-v61">2. 프로그램별 Layer 배분금액 입력</div>
        <div class="alloc-guide-v61">Risk XL은 사고별로, Cat XL은 Event별로 적용됩니다. 입력 합계: <b>${fmt(draftSum)}</b></div>
        <div class="manual-alloc-section">${selected.length ? selected.map(tid=>renderAllocationEditor(acc, tid)).join('') : '<div class="mini-msg">적용할 재보험 프로그램을 선택하세요.</div>'}</div>
      </div>
      <div class="detail-block-v61">
        <div class="block-title-v61">3. 현재 반영 결과</div>
        <div class="allocation-pills">${summary.length ? summary.map(s=>`<span class="map-status-pill done" title="${esc(s.text)}" style="background:${treatyColor(s.tid)}15;border-color:${treatyColor(s.tid)}55;color:${treatyColor(s.tid)}">${esc(s.name)} · ${fmt(s.gross)}</span>`).join('') : '<span class="map-status-pill">아직 반영된 프로그램 없음</span>'}</div>
        ${summary.length ? `<div class="alloc-note">${summary.map(s=>`<div><b>${esc(s.name)}</b> : ${esc(s.text)}</div>`).join('')}</div>` : ''}
      </div>
      <div class="detail-actions-v61"><button class="save-btn" onclick="applyProgramsForClaimV62('${esc(acc.claimNo||'')}')">배분결과 저장</button><button class="secondary-btn" onclick="clearProgramsForClaimV62('${esc(acc.claimNo||'')}')">전체 해제</button></div>
    </div>`;
  }

  window.selectLayerAccidentV62 = function(claimNo){
    state.selectedLayerAccident = claimNo;
    saveV62();
    window.renderLayerTable();
  };
  window.toggleProgramForClaimV62 = function(claimNo, treatyId, checked){
    initV62();
    const draft = getClaimDraft(claimNo);
    if(checked){ if(!draft[treatyId]) draft[treatyId] = {}; }
    else delete draft[treatyId];
    saveV62();
    window.renderLayerTable();
  };
  window.applyProgramsForClaimV62 = function(claimNo){
    initV62();
    const acc = getAccidents().find(a=>String(a.claimNo||'')===String(claimNo));
    if(!acc) return alert('사고계약 데이터를 찾지 못했습니다.');
    const draft = getClaimDraft(claimNo);
    const selected = Object.keys(draft);
    if(!selected.length) return alert('적용할 재보험 프로그램을 먼저 선택하세요.');

    const gross = num(acc.grossLossEok) || (num(acc.paidLossEok)+num(acc.outstandingLossEok));
    const paidRatio = gross>0 ? num(acc.paidLossEok)/gross : 0;
    const osRatio = gross>0 ? num(acc.outstandingLossEok)/gross : 0;
    const newLinks = [];

    for(const treatyId of selected){
      const treaty = getTreaty(treatyId);
      let treatySum = 0;
      const eventEl = $(`event_${slug(acc.claimNo)}_${slug(treatyId)}`);
      const eventKey = isCatTreaty(treaty) ? (eventEl?.value || defaultEventKey(acc)) : '';
      if(!draft[treatyId]) draft[treatyId] = {};
      if(eventKey) draft[treatyId]._eventKey = eventKey;

      for(const layer of (treaty.layers||[])){
        const input = $(`alloc_${slug(acc.claimNo)}_${slug(treatyId)}_${slug(layer.layer)}`);
        const allocGross = num(input?.value);
        draft[treatyId][layer.layer] = allocGross;
        if(allocGross<=0) continue;
        const status = statusForLayer(treatyId, layer.layer);
        if(!status) continue;
        const layerCap = num(status.baseLimitEok) + num(status.reinstatedLimitEok || 0);
        if(allocGross > layerCap){
          alert(`${treaty.name} / ${layer.layer} 입력금액이 Layer 한도(${fmt(layerCap)})를 초과했습니다.`);
          return;
        }
        treatySum += allocGross;
        newLinks.push({
          statusId: status.statusId,
          treatyId,
          treatyName: treaty.name,
          layer: layer.layer,
          eventKey,
          claimNo: acc.claimNo || '',
          policyNo: acc.policyNo || '',
          insured: acc.insured || '',
          cause: acc.cause || '',
          country: acc.country || '',
          city: acc.city || '',
          claimDate: acc.claimDate || '',
          grossLossEok: gross,
          paidLossEok: num(acc.paidLossEok),
          outstandingLossEok: num(acc.outstandingLossEok),
          allocGrossEok: allocGross,
          allocPaidEok: +(allocGross * paidRatio).toFixed(1),
          allocOutstandingEok: +(allocGross * osRatio).toFixed(1),
          note: isCatTreaty(treaty) ? '사용자 수동 Layer 배분 / Event 합산 대상' : '사용자 수동 Layer 배분 / 사고별 적용',
          mappedBy: user(),
          mappedAt: now()
        });
      }
      if(treatySum > gross){
        alert(`${treaty.name}에 배분한 금액 합계(${fmt(treatySum)})가 사고 Gross(${fmt(gross)})를 초과했습니다.`);
        return;
      }
    }
    if(!newLinks.length) return alert('Layer별 배분금액을 입력하세요.');
    if(!confirm(`${claimNo} 사고계약의 프로그램/Layer 배분결과를 저장할까요?`)) return;

    state.layerClaims = getLayerClaims().filter(x=>String(x.claimNo||'')!==String(claimNo));
    newLinks.forEach(x=>state.layerClaims.push(x));
    recalcAll();
    saveV62();
    window.renderLayerTable();
    if(typeof window.renderDashboard==='function') window.renderDashboard();
  };
  window.clearProgramsForClaimV62 = function(claimNo){
    if(!confirm(`${claimNo} 사고계약의 프로그램/Layer 연결을 모두 해제할까요?`)) return;
    initV62();
    delete state.claimLayerDrafts[claimNo];
    state.layerClaims = getLayerClaims().filter(x=>String(x.claimNo||'')!==String(claimNo));
    recalcAll();
    saveV62();
    window.renderLayerTable();
    if(typeof window.renderDashboard==='function') window.renderDashboard();
  };
  window.removeLayerClaimV62 = function(statusId, claimNo){
    if(!confirm(`${claimNo}의 해당 Layer 연결을 삭제할까요?`)) return;
    const entry = getLayerClaims().find(x=>x.statusId===statusId && String(x.claimNo||'')===String(claimNo));
    if(entry && state.claimLayerDrafts?.[claimNo]?.[entry.treatyId]){
      delete state.claimLayerDrafts[claimNo][entry.treatyId][entry.layer];
    }
    state.layerClaims = getLayerClaims().filter(x=>!(x.statusId===statusId && String(x.claimNo||'')===String(claimNo)));
    recalcAll();
    saveV62();
    window.renderLayerTable();
    if(typeof window.renderDashboard==='function') window.renderDashboard();
  };
  window.saveLayerV62 = function(index){
    const s=(state.layers||[])[index]; if(!s) return;
    if(!confirm(`${s.treatyName} / ${s.layer}의 사용액을 저장할까요?`)) return;
    s.paidUsedEok=num($(`ly_paid_${index}`)?.value);
    s.outstandingUsedEok=num($(`ly_os_${index}`)?.value);
    s.reinstatedLimitEok=num($(`ly_re_${index}`)?.value);
    s.updatedBy=user(); s.updatedAt=now();
    try{ if(typeof saveAll==='function') saveAll(); }catch(e){}
    window.renderLayerTable();
    if(typeof window.renderDashboard==='function') window.renderDashboard();
  };

  function renderProgramLayerCard(status, index){
    const treaty = getTreaty(status.treatyId);
    const layerDef = (treaty.layers||[]).find(x=>x.layer===status.layer) || {};
    const limit = num(status.baseLimitEok) + num(status.reinstatedLimitEok);
    const metric = layerMetric(status);
    const burn = Math.min(999, metric.burn);
    const linked = mappingEntriesForStatus(status.statusId);
    const retention = /retention/i.test(status.layer);
    return `<div class="layer-v61 ${retention?'retention-row-v62':''}">
      <div class="layer-v58-title">
        <div><b>${esc(status.layer)}</b><br><small>${fmt(layerDef.from||0)} 초과 ~ ${fmt(layerDef.to||limit)} · ${treatyModeLabel(treaty)}</small></div>
        <span class="program-total-v58">${retention && !isCatTreaty(treaty) ? '보유구간' : burn+'%'}</span>
      </div>
      <div class="layer-mode-line-v62">${metric.label}${metric.eventKey ? `: ${esc(metric.eventKey)}` : metric.bestClaimNo ? `: ${esc(metric.bestClaimNo)}` : ''} 기준 표시</div>
      <div class="layer-v58-bar"><div class="layer-v58-fill" style="width:${Math.min(100,burn)}%"></div></div>
      <div class="layer-v58-inputs">
        <label>Paid<input id="ly_paid_${index}" type="number" value="${num(status.paidUsedEok)}"></label>
        <label>Outstanding<input id="ly_os_${index}" type="number" value="${num(status.outstandingUsedEok)}"></label>
        <label>복원 후 한도<input id="ly_re_${index}" type="number" value="${num(status.reinstatedLimitEok)}"></label>
        <button class="save-btn" onclick="saveLayerV62(${index})">저장</button>
      </div>
      <div class="linked-accidents-v58">${linked.length ? linked.map(m=>`<span class="chip" title="${esc(m.claimNo)} / ${esc(m.insured||'')} / ${esc(m.layer)} / 할당 Gross ${fmt(m.allocGrossEok||0)}${m.eventKey ? ' / Event '+esc(m.eventKey) : ''}">${esc(m.claimNo)} · ${fmt(m.allocGrossEok||0)}<button onclick="removeLayerClaimV62('${esc(status.statusId)}','${esc(m.claimNo)}')">×</button></span>`).join('') : '<span class="layer-empty">연결된 사고계약 없음</span>'}</div>
    </div>`;
  }

  window.renderLayerTable = function(){
    initV62();
    const oldTable=$('layerTable');
    let host=$('layerBoardHost');
    if(!host){
      host=document.createElement('div'); host.id='layerBoardHost';
      if(oldTable){
        const parent=oldTable.closest('.table-scroll') || oldTable.parentElement;
        if(parent){ parent.innerHTML=''; parent.appendChild(host); }
      }else{
        const sec=$('layer'); if(sec) sec.appendChild(host);
      }
    }
    const q=($('layerAccSearch')?.value || '').toLowerCase().trim();
    const filter=$('layerAccFilter')?.value || '전체';
    const accidents=getAccidents().filter(a=>{
      const mapped = mappingEntriesForAccident(a).length>0;
      const okFilter = filter==='전체' || (filter==='미연결' && !mapped) || (filter==='연결완료' && mapped);
      const okQ = !q || JSON.stringify(a).toLowerCase().includes(q);
      return okFilter && okQ;
    }).slice(0,120);
    const mappedCnt=getAccidents().filter(a=>mappingEntriesForAccident(a).length>0).length;
    const unlinkedCnt=Math.max(0,getAccidents().length-mappedCnt);
    const selected = selectedAccident();
    const by={}; (state.layers||[]).forEach((s,i)=>{ (by[s.treatyId]=by[s.treatyId]||[]).push({...s,_idx:i}); });

    host.innerHTML = `<div class="layer-rule-banner-v62">
      <b>적용 기준</b>
      <span>Risk XL: 별도 사고는 합산하지 않고 사고별 Layer 적용</span>
      <span>Cat XL: 동일 Event로 묶인 사고만 합산 적용</span>
    </div>
    <div class="layer-workspace-v61">
      <div class="layer-search-panel-v61">
        <div class="layer-panel-title"><div><h3>기간계 사고계약 데이터</h3><p>사고계약을 검색·선택한 후 우측에서 프로그램/Layer 배분금액을 입력합니다.</p></div></div>
        <div class="layer-map-summary"><div><span>전체</span><b>${getAccidents().length}</b></div><div><span>연결완료</span><b>${mappedCnt}</b></div><div><span>미연결</span><b>${unlinkedCnt}</b></div></div>
        <div class="layer-accident-toolbar"><input id="layerAccSearch" placeholder="사고번호, 증권번호, 피보험자 검색" value="${esc($('layerAccSearch')?.value||'')}" oninput="renderLayerTable()"><select id="layerAccFilter" onchange="renderLayerTable()"><option ${filter==='전체'?'selected':''}>전체</option><option ${filter==='미연결'?'selected':''}>미연결</option><option ${filter==='연결완료'?'selected':''}>연결완료</option></select></div>
        <div class="acc-list-compact-v61">${accidents.length ? accidents.map(renderCompactAccidentRow).join('') : '<div class="mini-msg">검색 결과가 없습니다.</div>'}</div>
      </div>
      <div class="layer-detail-panel-v61">${renderSelectedDetail(selected)}</div>
    </div>
    <div class="layer-program-panel-v61">
      <div class="layer-panel-title"><div><h3>재보험 프로그램 / Layer 적용 현황</h3><p>Risk XL은 누적 소진이 아니라 최고 단일사고 기준으로, Cat XL은 동일 Event 합산 기준으로 표시됩니다.</p></div></div>
      <div class="layer-program-board-v58">${Object.keys(by).map(tid=>{
        const t=getTreaty(tid); const color=treatyColor(tid);
        const statusMetrics = by[tid].map(s=>layerMetric(s));
        const totalLimit=by[tid].reduce((a,s)=>a+num(s.baseLimitEok)+num(s.reinstatedLimitEok),0);
        const visualUsed=statusMetrics.reduce((a,m)=>a+num(m.usedGross),0);
        const burn=Math.round((visualUsed/Math.max(1,totalLimit))*100);
        return `<div class="program-v58" style="--program-color:${color}"><div class="program-v58-head"><div><h3>${esc(t.name||tid)}</h3><small>${esc(t.description||'')} · ${treatyModeLabel(t)}</small></div><span class="program-total-v58">${isCatTreaty(t)?'Event 기준':'사고별 기준'}</span></div>${by[tid].map(s=>renderProgramLayerCard(s,s._idx)).join('')}</div>`;
      }).join('')}</div>
    </div>`;
  };

  const oldRenderDashboard = window.renderDashboard;
  window.renderDashboard = function(){
    try{ if(typeof oldRenderDashboard==='function') oldRenderDashboard(); }catch(e){}
    const layerBox=$('dashboardLayerBars');
    if(layerBox){
      const by={}; (state.layers||[]).forEach(s=>{ (by[s.treatyId]=by[s.treatyId]||[]).push(s); });
      layerBox.innerHTML=Object.keys(by).map(tid=>{
        const t=getTreaty(tid), color=treatyColor(tid);
        return `<div class="dash-program-card" style="--treaty-accent:${color}">
          <div class="dash-program-head"><div><h4>${esc(t.name||tid)}</h4><span>${treatyModeLabel(t)}</span></div><b>${isCatTreaty(t)?'Event':'Risk'}</b></div>
          ${by[tid].map(s=>{
            const limit=num(s.baseLimitEok)+num(s.reinstatedLimitEok);
            const m=layerMetric(s);
            const burn=m.burn;
            const linked=mappingEntriesForStatus(s.statusId);
            return `<div class="dash-layer-item"><div class="dash-layer-head"><span>${esc(s.layer)}</span><b class="burn-pill ${burn>=80?'danger':burn>=50?'warn':''}">${/retention/i.test(s.layer)&&!isCatTreaty(t)?'보유':burn+'%'}</b></div><div class="dash-layer-sub">${m.label} ${fmt(m.usedGross)} / ${fmt(limit)} · 연결 ${linked.length}건</div><div class="layer-track-modern"><span style="width:${Math.min(100,burn)}%"></span></div></div>`;
          }).join('')}
        </div>`;
      }).join('');
    }
  };

  function injectStyles(){
    if(document.getElementById('v62-layer-style')) return;
    const css = `
      .layer-rule-banner-v62{display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:#f8fafc;border:1px solid #dbe4f0;border-radius:14px;padding:12px 14px;margin-bottom:14px;color:#334155}
      .layer-rule-banner-v62 b{color:#0f172a}.layer-rule-banner-v62 span{background:white;border:1px solid #e2e8f0;border-radius:999px;padding:6px 10px;font-size:12px}
      .mode-badge-v62{display:inline-flex;margin-left:8px;border:1px solid #dbe4f0;background:#f8fafc;color:#475569;border-radius:999px;padding:3px 8px;font-size:11px}
      .mode-note-v62{font-size:12px;color:#475569;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px 10px;margin-bottom:8px}
      .event-key-v62{display:grid;grid-template-columns:100px 1fr;gap:8px;align-items:center;font-size:12px;color:#475569;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px 10px;margin-bottom:8px}
      .event-key-v62 input{height:34px;border:1px solid #cbd5e1;border-radius:8px;padding:0 10px}
      .prog-check-v61 em{display:block;font-style:normal;font-size:11px;color:#64748b;margin-top:2px}
      .layer-mode-line-v62{font-size:12px;color:#64748b;margin:6px 0}
      .retention-row-v62{background:#fffaf0}
    `;
    const style=document.createElement('style'); style.id='v62-layer-style'; style.innerHTML=css; document.head.appendChild(style);
  }

  window.addEventListener('load',()=>setTimeout(()=>{
    injectStyles();
    initV62();
    recalcAll();
    saveV62();
    if(typeof window.renderLayerTable==='function') window.renderLayerTable();
    if(typeof window.renderDashboard==='function') window.renderDashboard();
  },2100));
})();

/* ===== v60: PPW 축소(도래 알림) + 대시보드 KPI 차별화(수재확정·기간계 미입력) ===== */
(function(){
  const q=(id)=>document.getElementById(id);
  const esc=(s)=>String(s ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const DAY=86400000;
  function diff(d){ if(!d) return 9999; try{ const base=new Date((state.meta?.asOfDate||new Date().toISOString().slice(0,10))+'T00:00:00'); const t=new Date(String(d).slice(0,10)+'T00:00:00'); return Math.ceil((t-base)/DAY);}catch(e){return 9999;} }
  function pendingRows(){ return (state.fac||[]).filter(f=>f.reviewStatus==='수재확정'); }
  function confirmedAt(f){ const h=(f.statusHistory||[]).find(x=>x.status==='수재확정'); return h?h.at:(f.updatedAt||'-'); }
  function ppwSource(){ return (typeof window.officialPPWRows==='function')?window.officialPPWRows():[]; }

  // (A) 대시보드 2번째 KPI: PPW → 수재확정·기간계 미입력 (이 플랫폼만의 white space 지표)
  window.showPendingInputList=function(){
    const rows=pendingRows();
    let html='<h3>수재확정 · 기간계 미입력 대기</h3><p class="muted">수재확정됐으나 아직 기간계에 입력되지 않은 계약입니다. 기간계가 알 수 없는 구간으로, 입력이 누락되면 공식 데이터에서 빠집니다.</p><div class="table-scroll"><table><thead><tr><th>관리번호</th><th>피보험자</th><th>국가/도시</th><th>종목</th><th>수재확정일</th><th>담당</th></tr></thead><tbody>';
    html+=(rows.map(f=>`<tr><td>${esc(f.inwardRef)}</td><td>${esc(f.insured)}</td><td>${esc(f.country)}/${esc(f.city)}</td><td>${esc(f.line)}</td><td>${esc(confirmedAt(f))}</td><td>${esc(f.reviewOwner||f.owner||'-')}</td></tr>`).join('')||'<tr><td colspan="6">수재확정 후 기간계 미입력 건이 없습니다.</td></tr>');
    html+='</tbody></table></div>';
    const box=q('dashboardList'); if(box) box.innerHTML=html;
  };
  const prevDash=window.renderDashboard;
  window.renderDashboard=function(){
    try{ if(typeof prevDash==='function') prevDash(); }catch(e){console.warn(e);}
    try{
      const pending=pendingRows().length;
      const labels=document.querySelectorAll('#dashboard .kpi span');
      const ems=document.querySelectorAll('#dashboard .kpi em');
      const kpis=document.querySelectorAll('#dashboard .kpi');
      if(labels[1]) labels[1].innerText='수재확정·기간계 미입력';
      if(q('kpiPPW')) q('kpiPPW').innerText=pending+'건';
      if(ems[1]) ems[1].innerHTML='<span class="data-badge">기간계 입력 전 white space</span>';
      if(kpis[1]) kpis[1].onclick=()=>showPendingInputList();
      const task=q('todayTasks');
      if(task){
        const active=(state.fac||[]).filter(f=>!['수재확정','인수거절','기간계 입력완료'].includes(f.reviewStatus)).length;
        const acc=state.accidents?state.accidents.length:0;
        task.innerHTML=`<div class="card-item" onclick="switchTab('inward')"><b>계약 진행관리</b><br>검토 중 오퍼 ${active}건</div><div class="card-item" onclick="showPendingInputList()"><b>수재확정·기간계 미입력</b><br>입력 대기 ${pending}건</div><div class="card-item" onclick="switchTab('accident')"><b>사고계약 데이터</b><br>재보험 Layer 영향분석 ${acc}건</div>`;
      }
    }catch(e){console.warn('[v60 dash]',e);}
  };

  // (B) PPW 화면: 미수 관리 → "PPW 도래 알림(놓치면 담보 해지)" 으로 축소
  function riskBadge(d){
    if(d<=3) return '<span style="background:#fee2e2;color:#b91c1c;padding:2px 8px;border-radius:10px;font-weight:700;font-size:12px">담보 해지 임박 D-'+d+'</span>';
    if(d<=7) return '<span style="background:#fef3c7;color:#b45309;padding:2px 8px;border-radius:10px;font-weight:600;font-size:12px">도래 임박 D-'+d+'</span>';
    return '<span style="background:#e0e7ff;color:#3730a3;padding:2px 8px;border-radius:10px;font-size:12px">확인 필요</span>';
  }
  window.renderPPW=function(){
    const tbody=document.querySelector('#ppwTable tbody'); if(!tbody) return;
    const panel=document.querySelector('#ppwTable')?.closest('.panel');
    if(panel){
      const h=panel.querySelector('h3'); if(h) h.innerHTML='PPW 도래 알림 <span class="data-badge">기간계 체결 수재계약 · 7일 이내</span>';
      let cap=panel.querySelector('.ppw-caption'); if(!cap){cap=document.createElement('div');cap.className='ppw-caption muted';cap.style.marginBottom='8px';if(h)h.insertAdjacentElement('afterend',cap);}
      cap.innerHTML='PPW(보험료납입 워런티) 마감일을 놓치면 담보가 해지됩니다. 해외 출재사·통화·시차가 섞인 환경에서 마감일을 놓치지 않도록 <b>알림만</b> 제공합니다. 보험료 수금·정산·미수 회계는 기간계/회계 시스템 본업입니다.';
      const sel=q('ppwStatusFilter'); if(sel) sel.style.display='none';
    }
    const qstr=(q('ppwSearch')?.value||'').toLowerCase();
    const rows=ppwSource().filter(c=>!qstr||JSON.stringify(c).toLowerCase().includes(qstr)).sort((a,b)=>diff(a.ppwDate)-diff(b.ppwDate));
    const PAGE_SIZE=(typeof PAGE!=='undefined'?PAGE:10);
    const total=Math.max(1,Math.ceil(rows.length/PAGE_SIZE));
    state.pages=state.pages||{}; state.pages.ppw=Math.min(state.pages.ppw||1,total);
    const page=rows.slice((state.pages.ppw-1)*PAGE_SIZE,state.pages.ppw*PAGE_SIZE);
    const head=document.querySelector('#ppwTable thead tr');
    if(head) head.innerHTML='<th>증권번호</th><th>피보험자</th><th>국가/도시</th><th>보험종목</th><th>PPW 마감일</th><th>D-Day</th><th>위험도</th>';
    tbody.innerHTML=page.map(c=>{const d=diff(c.ppwDate);return `<tr><td>${esc(c.policyNo)}</td><td>${esc(c.insured)}</td><td>${esc(c.country)}/${esc(c.city)}</td><td>${esc(c.line)}</td><td>${esc(c.ppwDate)}</td><td>D-${d}</td><td>${riskBadge(d)}</td></tr>`;}).join('')||'<tr><td colspan="7">7일 이내 PPW 도래 건이 없습니다.</td></tr>';
    if(q('ppwPage')) q('ppwPage').innerText=`${state.pages.ppw} / ${total}`;
    if(typeof window.renderFacPPWMini==='function') window.renderFacPPWMini();
  };

  // 진행관리 화면 내 PPW 미니카드도 '도래 알림'으로 정리(미수 컬럼 제거)
  window.renderFacPPWMini=function(){
    const box=q('facPPWMini'); if(!box) return;
    const rows=ppwSource().slice(0,6);
    box.innerHTML=`<h4>PPW 도래 알림</h4><div class="mini-msg">조회 기준일로부터 7일 이내 PPW 마감 건만 표시합니다(놓치면 담보 해지). 기준: 기간계 체결 수재계약</div><table class="fac-ppw-mini-table"><thead><tr><th>증권번호</th><th>피보험자</th><th>PPW 마감일</th><th>D-Day</th><th>위험도</th></tr></thead><tbody>${rows.length?rows.map(c=>{const d=diff(c.ppwDate);return `<tr><td>${esc(c.policyNo)}</td><td>${esc(c.insured)}</td><td>${esc(c.ppwDate)}</td><td>D-${d}</td><td>${riskBadge(d)}</td></tr>`;}).join(''):'<tr><td colspan="5">7일 이내 PPW 도래 건이 없습니다.</td></tr>'}</tbody></table>`;
  };

  // 대시보드 목록 팝업의 'ppw'도 도래 알림 표현으로
  const prevList=window.showDashboardList;
  window.showDashboardList=function(kind){
    if(kind!=='ppw'){ if(typeof prevList==='function') return prevList(kind); return; }
    const rows=ppwSource().sort((a,b)=>diff(a.ppwDate)-diff(b.ppwDate));
    let html='<h3>PPW 도래 알림 (7일 이내)</h3><p class="muted">PPW 마감일 미준수 시 담보가 해지됩니다.</p><div class="table-scroll"><table><thead><tr><th>증권번호</th><th>피보험자</th><th>보험종목</th><th>PPW 마감일</th><th>D-Day</th><th>위험도</th></tr></thead><tbody>';
    html+=rows.slice(0,30).map(c=>{const d=diff(c.ppwDate);return `<tr><td>${esc(c.policyNo)}</td><td>${esc(c.insured)}</td><td>${esc(c.line)}</td><td>${esc(c.ppwDate)}</td><td>D-${d}</td><td>${riskBadge(d)}</td></tr>`;}).join('')||'<tr><td colspan="6">해당 건이 없습니다.</td></tr>';
    html+='</tbody></table></div>';
    const box=q('dashboardList'); if(box) box.innerHTML=html;
  };

  window.addEventListener('load',()=>setTimeout(()=>{ try{ window.renderDashboard(); window.renderPPW(); }catch(e){console.warn('[v60]',e);} },4000));
})();

/* ===== v62: 소재지 누적위험 — 체결계약(120) 기준 정합 + 전체 소재지 표시 ===== */
(function(){
  const q=(id)=>document.getElementById(id);
  function officialContracts(){ return (state.contracts && state.contracts.length ? state.contracts : (DATA.contracts||[])); }
  // 누적위험은 '기간계 체결 해외수재계약' 기준 → 체결수재계약조회(120건)와 일치
  window.allRiskContracts = function(){ return officialContracts().map(c=>({...c, sourceBucket:'official'})); };

  const prevRenderMap = window.renderMap;
  window.renderMap = function(){
    try{ if(typeof prevRenderMap==='function') prevRenderMap(); }catch(e){ console.warn('[v62 base]',e); }
    try{
      const regs = (typeof regionAgg==='function') ? regionAgg() : [];
      const cards = q('regionCards'); if(!cards) return;
      const totalCnt = regs.reduce((s,r)=>s+r.cnt,0);
      const totalTsi = regs.reduce((s,r)=>s+r.tsi,0);
      const fmt=(v)=> (typeof eok==='function'?eok(v):v+'억원');
      const summary = `<div class="region-card" style="background:#0f172a;color:#fff;cursor:default">
        <b>전체 누적위험 요약</b><br>소재지 ${regs.length}곳 · 계약 합계 ${totalCnt}건 · 누적 가입금액 ${fmt(totalTsi)}
        <br><small>기준: 기간계 체결 해외수재계약 (출재·수재계약 조회의 수재계약과 동일 모집단)</small></div>`;
      // 상위 12개 제한 제거 → 전체 소재지 카드 표시 (한국 포함 모든 소재지)
      cards.innerHTML = summary + regs.map(r=>`<div class="region-card" onclick="selectRegion('${r.country}','${r.city}')"><b>${r.country} / ${r.city}</b><br>누적 가입금액 ${fmt(r.tsi)} · 계약 ${r.cnt}건</div>`).join('');
    }catch(e){ console.warn('[v62 cards]',e); }
  };
  const prevSwitch = window.switchTab;
  window.switchTab = function(tab){
    if(typeof prevSwitch==='function') prevSwitch(tab);
    if(tab==='location') setTimeout(()=>{ try{ window.renderMap(); }catch(e){} }, 90);
  };
  window.addEventListener('load',()=>setTimeout(()=>{ try{ if(q('location')?.classList.contains('active')) window.renderMap(); }catch(e){} }, 4200));
})();

/* ===== v63: 대시보드 KPI 라벨 정합 + 목록 팝업(모달)화 — UX 정리 ===== */
(function(){
  const q=(id)=>document.getElementById(id);
  const esc=(s)=>String(s ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const DAY=86400000;
  function diff(d){ if(!d) return 9999; try{ const base=new Date((state.meta?.asOfDate||new Date().toISOString().slice(0,10))+'T00:00:00'); const t=new Date(String(d).slice(0,10)+'T00:00:00'); return Math.ceil((t-base)/DAY);}catch(e){return 9999;} }
  function riskBadge(d){
    if(d<=3) return '<span style="background:#fee2e2;color:#b91c1c;padding:2px 8px;border-radius:10px;font-weight:700;font-size:12px">담보 해지 임박 D-'+d+'</span>';
    if(d<=7) return '<span style="background:#fef3c7;color:#b45309;padding:2px 8px;border-radius:10px;font-weight:600;font-size:12px">도래 임박 D-'+d+'</span>';
    return '<span style="background:#e0e7ff;color:#3730a3;padding:2px 8px;border-radius:10px;font-size:12px">확인 필요</span>';
  }

  // KPI 라벨/배지를 '값 요소가 속한 카드' 기준으로 정확히 세팅 (인덱싱 어긋남 방지)
  function setKpi(valueId, label, badge){
    const v=q(valueId); if(!v) return; const card=v.closest('.kpi'); if(!card) return;
    const lbl=[...card.querySelectorAll('span')].find(s=>!s.closest('em') && s.id!==valueId && !s.classList.contains('data-badge'));
    if(lbl) lbl.innerText=label;
    const em=card.querySelector('em'); if(em) em.innerHTML='<span class="data-badge">'+badge+'</span>';
  }

  // 공통 모달
  function ensureModal(){
    let m=q('graListModal');
    if(!m){
      m=document.createElement('div'); m.id='graListModal';
      m.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.55);display:none;align-items:center;justify-content:center;z-index:99999;padding:24px';
      m.innerHTML='<div style="background:#fff;border-radius:14px;max-width:820px;width:100%;max-height:82vh;overflow:auto;padding:22px 24px;box-shadow:0 20px 60px rgba(0,0,0,.3)"><div id="graListBody"></div><div style="text-align:right;margin-top:14px"><button id="graListClose" style="padding:8px 18px;border:none;border-radius:8px;background:#0f172a;color:#fff;cursor:pointer">닫기</button></div></div>';
      document.body.appendChild(m);
      m.addEventListener('click',e=>{ if(e.target===m) m.style.display='none'; });
      q('graListClose').addEventListener('click',()=>{ m.style.display='none'; });
    }
    return m;
  }
  function openModal(title, subtitle, headers, rowsHtml){
    const m=ensureModal();
    q('graListBody').innerHTML =
      '<h3 style="margin:0 0 6px;font-size:18px">'+title+'</h3>'+
      (subtitle?'<p style="color:#64748b;font-size:13px;margin:0 0 12px">'+subtitle+'</p>':'')+
      '<div style="overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#f1f5f9;text-align:left">'+
      headers.map(h=>'<th style="padding:8px;white-space:nowrap">'+h+'</th>').join('')+
      '</tr></thead><tbody>'+rowsHtml+'</tbody></table></div>';
    m.style.display='flex';
    const dl=q('dashboardList'); if(dl) dl.innerHTML=''; // 인라인 잔존목록 제거(깨짐 방지)
  }
  function td(v){ return '<td style="padding:8px;border-bottom:1px solid #e2e8f0">'+v+'</td>'; }
  function tr(cells){ return '<tr>'+cells.map(td).join('')+'</tr>'; }

  window.showPendingInputList=function(){
    const rows=(state.fac||[]).filter(f=>f.reviewStatus==='수재확정');
    const conf=f=>{const h=(f.statusHistory||[]).find(x=>x.status==='수재확정');return h?h.at:(f.updatedAt||'-');};
    const body=rows.map(f=>tr([esc(f.inwardRef),esc(f.insured),esc(f.country)+'/'+esc(f.city),esc(f.line),esc(conf(f)),esc(f.reviewOwner||f.owner||'-')])).join('')
      || '<tr><td colspan="6" style="padding:12px;color:#64748b">수재확정 후 기간계 미입력 건이 없습니다.</td></tr>';
    openModal('수재확정 · 기간계 미입력 대기 ('+rows.length+'건)',
      '수재확정됐으나 아직 기간계에 입력되지 않은 계약입니다. 기간계가 알 수 없는 구간으로, 입력이 누락되면 공식 데이터에서 빠집니다.',
      ['관리번호','피보험자','국가/도시','종목','수재확정일','담당'], body);
  };

  window.showDashboardList=function(kind){
    if(kind==='renew'){
      const rows=(typeof renewRows==='function'?renewRows():[]);
      const body=rows.slice(0,50).map(r=>tr([esc(r.policyNo),esc(r.insured),esc(r.line),esc(r.renewalDate),'D-'+diff(r.renewalDate)])).join('')
        || '<tr><td colspan="5" style="padding:12px;color:#64748b">해당 건이 없습니다.</td></tr>';
      openModal('30일 이내 갱신계약 ('+rows.length+'건)','기간계 체결 수재계약 기준 만기 30일 이내',
        ['증권번호','피보험자','보험종목','만기일','D-Day'], body);
      return;
    }
    // ppw
    const rows=(typeof window.officialPPWRows==='function'?window.officialPPWRows():[]).slice().sort((a,b)=>diff(a.ppwDate)-diff(b.ppwDate));
    const body=rows.slice(0,50).map(c=>{const d=diff(c.ppwDate);return tr([esc(c.policyNo),esc(c.insured),esc(c.line),esc(c.ppwDate),'D-'+d,riskBadge(d)]);}).join('')
      || '<tr><td colspan="6" style="padding:12px;color:#64748b">7일 이내 PPW 도래 건이 없습니다.</td></tr>';
    openModal('PPW 도래 알림 (7일 이내)','PPW 마감일 미준수 시 담보가 해지됩니다.',
      ['증권번호','피보험자','보험종목','PPW 마감일','D-Day','위험도'], body);
  };

  const prevDash=window.renderDashboard;
  window.renderDashboard=function(){
    try{ if(typeof prevDash==='function') prevDash(); }catch(e){console.warn(e);}
    try{
      const pending=(state.fac||[]).filter(f=>f.reviewStatus==='수재확정').length;
      setKpi('kpiRenew','30일 이내 갱신계약','기간계 수재계약');
      setKpi('kpiPPW','수재확정·기간계 미입력','기간계 입력 전 white space');
      setKpi('kpiAccident','사고계약 데이터','기간계 사고계약');
      setKpi('kpiLayer','최고 Layer 소진율','사고계약 기반 Layer 관리');
      if(q('kpiPPW')) q('kpiPPW').innerText=pending+'건';
      const card=q('kpiPPW')?.closest('.kpi'); if(card) card.onclick=()=>showPendingInputList();
      const dl=q('dashboardList'); if(dl) dl.innerHTML=''; // 대시보드 본문 인라인 목록 제거 → 모달로만
    }catch(e){console.warn('[v63]',e);}
  };

  window.addEventListener('load',()=>setTimeout(()=>{ try{ window.renderDashboard(); }catch(e){} },4400));
})();

/* ===== v64: 소재지 누적위험 화면 UX 재구성 (지도 확대 + 지역현황 컴팩트 표) ===== */
(function(){
  const q=(id)=>document.getElementById(id);
  const esc=(s)=>String(s ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const fmt=(v)=> (typeof eok==='function'?eok(v):v+'억원');
  let sortKey='tsi';

  function resizeMap(){
    const map=q('leafletMap');
    if(map){ map.style.height='clamp(420px, 60vh, 620px)'; map.style.minHeight='420px';
      if(typeof leafletMapV36!=='undefined' && leafletMapV36){ setTimeout(()=>{ try{ leafletMapV36.invalidateSize(); }catch(e){} },140); } }
  }
  function renderRegionTable(){
    const cards=q('regionCards'); if(!cards) return;
    const regs=(typeof regionAgg==='function')?regionAgg().slice():[];
    regs.sort((a,b)=> sortKey==='cnt' ? b.cnt-a.cnt
                    : sortKey==='name'? (a.country+a.city).localeCompare(b.country+b.city,'ko')
                    : b.tsi-a.tsi);
    const totalCnt=regs.reduce((s,r)=>s+r.cnt,0), totalTsi=regs.reduce((s,r)=>s+r.tsi,0);
    const maxTsi=Math.max(1,...regs.map(r=>r.tsi));
    const arrow=k=>sortKey===k?' ▾':'';
    const sel=state.selectedRegion||{};
    let html=`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">
        <div style="font-size:13px;color:#334155"><b>소재지 ${regs.length}곳</b> · 계약 ${totalCnt}건 · 누적 ${fmt(totalTsi)}</div>
        <div style="font-size:12px;color:#64748b">정렬
          <a href="javascript:void(0)" onclick="__regionSort('tsi')" style="text-decoration:none;color:${sortKey==='tsi'?'#4f46e5':'#64748b'}">금액${arrow('tsi')}</a> ·
          <a href="javascript:void(0)" onclick="__regionSort('cnt')" style="text-decoration:none;color:${sortKey==='cnt'?'#4f46e5':'#64748b'}">건수${arrow('cnt')}</a> ·
          <a href="javascript:void(0)" onclick="__regionSort('name')" style="text-decoration:none;color:${sortKey==='name'?'#4f46e5':'#64748b'}">지역명${arrow('name')}</a>
        </div></div>`;
    html+='<div style="max-height:clamp(360px,52vh,560px);overflow:auto;border:1px solid #e2e8f0;border-radius:10px">'
        +'<table style="width:100%;border-collapse:collapse;font-size:13px">'
        +'<thead><tr style="position:sticky;top:0;background:#f8fafc;z-index:1;text-align:left">'
        +'<th style="padding:8px 10px">소재지</th><th style="padding:8px 10px;text-align:right">누적 가입금액</th><th style="padding:8px 10px;text-align:right">계약</th></tr></thead><tbody>';
    html+=regs.map(r=>{
      const w=Math.round(r.tsi/maxTsi*100);
      const active=(sel.country===r.country && sel.city===r.city);
      return `<tr style="border-top:1px solid #eef2f7;cursor:pointer;background:${active?'#eef2ff':''}" onclick="selectRegion('${esc(r.country)}','${esc(r.city)}')" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='${active?'#eef2ff':''}'">
        <td style="padding:7px 10px"><b>${esc(r.country)}</b> / ${esc(r.city)}</td>
        <td style="padding:7px 10px;text-align:right"><div style="display:flex;align-items:center;gap:6px;justify-content:flex-end">
          <span style="display:inline-block;height:6px;width:${w}%;max-width:80px;background:#6366f1;border-radius:3px;opacity:.55"></span>
          <span style="white-space:nowrap">${fmt(r.tsi)}</span></div></td>
        <td style="padding:7px 10px;text-align:right;white-space:nowrap">${r.cnt}건</td></tr>`;
    }).join('') || '<tr><td colspan="3" style="padding:12px;color:#64748b">표시할 계약이 없습니다.</td></tr>';
    html+='</tbody></table></div>';
    cards.innerHTML=html;
  }
  window.__regionSort=function(k){ sortKey=k; renderRegionTable(); };

  const prev=window.renderMap;
  window.renderMap=function(){
    try{ if(typeof prev==='function') prev(); }catch(e){console.warn('[v64 base]',e);}
    try{ resizeMap(); renderRegionTable(); }catch(e){console.warn('[v64]',e);}
  };
  const prevSwitch=window.switchTab;
  window.switchTab=function(tab){ if(typeof prevSwitch==='function') prevSwitch(tab); if(tab==='location') setTimeout(()=>{ try{ window.renderMap(); }catch(e){} },110); };
  window.addEventListener('load',()=>setTimeout(()=>{ try{ if(q('location')?.classList.contains('active')) window.renderMap(); }catch(e){} },4600));
})();

/* ===== v65: 해외수재 클레임 화면 문구 정정 (사고계약 → 체결 수재계약) ===== */
(function(){
  // 클레임 화면 한정 문구 교정 (Layer 소진 관리의 '기간계 사고계약'은 그대로 둠)
  const REPL=[
    ['기간계 사고계약 데이터를 기준으로','기간계 체결 수재계약을 기준으로'],
    ['기간계 사고계약 데이터','기간계 체결 수재계약'],
    ['기간계 사고계약을 선택','기간계 체결 수재계약을 선택'],
    ['기간계 사고계약 선택','기간계 체결 수재계약 선택'],
    ['기간계 사고계약','기간계 체결 수재계약'],
    ['선택 계약·사고 요약','선택 수재계약 요약'],
    ['선택 계약 · 사고 요약','선택 수재계약 요약'],
  ];
  const PH=[
    ['사고번호, 증권번호, 피보험자, 사고유형 검색','증권번호, 피보험자명으로 검색'],
    ['사고번호, 증권번호, 피보험자','증권번호, 피보험자명'],
  ];
  function sweep(){
    const root=document.getElementById('inwardClaim'); if(!root) return;
    try{
      const w=document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
      const hits=[];
      while(w.nextNode()){ const n=w.currentNode; if(n.nodeValue && REPL.some(([a])=>n.nodeValue.includes(a))) hits.push(n); }
      hits.forEach(n=>{ let v=n.nodeValue; REPL.forEach(([a,b])=>{ v=v.split(a).join(b); }); n.nodeValue=v; });
      root.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(el=>{
        PH.forEach(([a,b])=>{ if(el.placeholder && el.placeholder.includes(a)) el.placeholder=el.placeholder.split(a).join(b); });
      });
    }catch(e){console.warn('[v65]',e);}
  }
  const prevSwitch=window.switchTab;
  window.switchTab=function(tab){ if(typeof prevSwitch==='function') prevSwitch(tab); if(tab==='inwardClaim') setTimeout(sweep,80); };
  window.addEventListener('load',()=>{ setTimeout(sweep,4700); });
})();

/* ===== v66: 해외수재 클레임 — 기간계 입력용 CSV 내보내기 ===== */
(function(){
  window.exportClaimsCSV = function(){
    const rows = (state.inwardClaims || []);
    if(!rows.length){ alert('내보낼 클레임이 없습니다.'); return; }
    const cols = [
      ['사고번호','claimNo'],['증권번호','policyNo'],['피보험자','insured'],
      ['국가','country'],['도시','city'],['보험종목','line'],['사고유형','cause'],
      ['사고일','claimDate'],['통지일','noticeDate'],
      ['Paid손해액(억원)','paidLossEok'],['Outstanding손해액(억원)','outstandingLossEok'],
      ['추산손해액(억원)','estimatedLossEok'],['Gross손해액(억원)','grossLossEok'],
      ['업무처리단계','status'],['기간계입력상태','portalStatus'],['담당자','owner'],['메모','memo']
    ];
    const esc = v => { v=(v==null?'':String(v)); return /[",\r\n]/.test(v) ? '"'+v.replace(/"/g,'""')+'"' : v; };
    const header = cols.map(c=>c[0]).join(',');
    const body = rows.map(r=>cols.map(c=>esc(r[c[1]])).join(',')).join('\r\n');
    const csv = '\uFEFF' + header + '\r\n' + body;   // BOM: Excel 한글 깨짐 방지
    try{
      const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const today = (state.meta && state.meta.asOfDate) ? state.meta.asOfDate : new Date().toISOString().slice(0,10);
      a.href = url; a.download = '해외수재클레임_기간계입력용_'+today+'.csv';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(()=>URL.revokeObjectURL(url), 1000);
      const m=document.getElementById('icMsg'); if(m) m.innerText = rows.length+'건 CSV 내보내기 완료';
    }catch(e){ console.warn('[v66 csv]',e); alert('CSV 내보내기 중 오류가 발생했습니다.'); }
  };
})();

/* ===== v68: Layer 소진 관리 검색 — 한글 입력(IME) 끊김 수정 ===== */
(function(){
  // 입력할 때마다 보드 전체를 재렌더하면 입력창이 사라져 한글 조합이 깨진다.
  // → 재렌더 없이 카드 show/hide 로 필터, compositionstart/end 로 조합 보호.
  function wireLayerSearch(){
    const input=document.getElementById('layerAccSearch');
    if(!input) return;
    input.removeAttribute('oninput');           // 재렌더 트리거 제거
    if(input.dataset.imeWired==='1') return;
    input.dataset.imeWired='1';
    let composing=false;
    const apply=()=>{
      const q=(input.value||'').toLowerCase().trim();
      const list=document.querySelector('.acc-list-compact-v61'); if(!list) return;
      let shown=0;
      list.querySelectorAll('.acc-row-v61').forEach(row=>{
        const hit=!q || row.textContent.toLowerCase().includes(q);
        row.style.display=hit?'':'none'; if(hit) shown++;
      });
      let empty=list.querySelector('.ime-empty');
      if(shown===0){
        if(!empty){ empty=document.createElement('div'); empty.className='mini-msg ime-empty'; empty.textContent='검색 결과가 없습니다.'; list.appendChild(empty); }
        empty.style.display='';
      } else if(empty){ empty.style.display='none'; }
    };
    input.addEventListener('compositionstart',()=>{ composing=true; });
    input.addEventListener('compositionend',()=>{ composing=false; apply(); });
    input.addEventListener('input',()=>{ if(!composing) apply(); });
  }
  const prev=window.renderLayerTable;
  window.renderLayerTable=function(){
    if(typeof prev==='function') prev.apply(this,arguments);
    const input=document.getElementById('layerAccSearch');
    if(input){ input.dataset.imeWired=''; wireLayerSearch(); }
  };
  const prevSwitch=window.switchTab;
  window.switchTab=function(tab){ if(typeof prevSwitch==='function') prevSwitch(tab); if(tab==='layer') setTimeout(wireLayerSearch,60); };
  window.addEventListener('load',()=>setTimeout(wireLayerSearch,4800));
})();

/* ===== v69: 체결 출재/수재계약 조회 + PPW 도래 알림 출재/수재 구분 ===== */
(function(){
  const q=(id)=>document.getElementById(id);
  const esc=(s)=>String(s ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const won=(v)=>(typeof eok==='function'?eok(v):v+'억원');
  const DAY=86400000;
  function diff(d){ if(!d) return 9999; try{ const base=new Date((state.meta?.asOfDate||new Date().toISOString().slice(0,10))+'T00:00:00'); const t=new Date(String(d).slice(0,10)+'T00:00:00'); return Math.ceil((t-base)/DAY);}catch(e){return 9999;} }
  function cessions(){ return (state.cessions && state.cessions.length) ? state.cessions : (DATA.cessions||[]); }
  function contractsList(){ return (state.contracts && state.contracts.length) ? state.contracts : (DATA.contracts||[]); }
  if(!state.cessions) state.cessions = (DATA.cessions||[]).slice();
  state.contractBasis = state.contractBasis || 'inward';

  // ---------- 체결 출재/수재계약 조회 ----------
  window.setContractBasis = function(b){
    state.contractBasis=b; state.pages=state.pages||{}; state.pages.contract=1;
    document.querySelectorAll('.contract-basis-btn').forEach(x=>x.classList.toggle('active', x.dataset.basis===b));
    const lf=q('contractLineFilter'); if(lf) lf.style.display='';   // 둘 다 보종 필터 사용
    window.renderContractTable();
  };
  window.renderContractTable = function(){
    if(typeof setMetaText==='function'){ try{ setMetaText(); }catch(e){} }
    const basis=state.contractBasis||'inward';
    const qstr=(q('contractSearch')?.value||'').toLowerCase();
    const line=q('contractLineFilter')?.value||'전체';
    const thead=document.querySelector('#contractTable thead tr');
    const tbody=document.querySelector('#contractTable tbody'); if(!tbody) return;
    const PAGE_SIZE=(typeof PAGE!=='undefined'?PAGE:10);
    state.pages=state.pages||{}; state.pages.contract=state.pages.contract||1;

    if(basis==='outward'){
      const rows=cessions().filter(c=>(!qstr||JSON.stringify(c).toLowerCase().includes(qstr))&&(line==='전체'||c.line===line));
      const total=Math.max(1,Math.ceil(rows.length/PAGE_SIZE));
      state.pages.contract=Math.min(state.pages.contract,total);
      const page=rows.slice((state.pages.contract-1)*PAGE_SIZE,state.pages.contract*PAGE_SIZE);
      if(thead) thead.innerHTML='<th>출재번호</th><th>재보험자</th><th>유형</th><th>원수 피보험자</th><th>국가/종목</th><th>출재 가입금액</th><th>출재 보험료</th><th>출재 PPW</th><th>납입상태</th>';
      tbody.innerHTML=page.map(c=>`<tr>
        <td>${esc(c.cessionNo)}<br><span class="source-pill outward">기간계 출재</span></td>
        <td>${esc(c.reinsurer)}</td><td>${esc(c.type)}</td><td>${esc(c.originalInsured)}</td>
        <td>${esc(c.country)} / ${esc(c.line)}</td>
        <td>${won(c.cededTsiEok)}</td>
        <td>${won(c.cededPremiumEok)}<br><small>${esc(c.currency)} ${Number(c.cededPremiumOriginal||0).toLocaleString()}</small></td>
        <td>${esc(c.ppwDate)}</td>
        <td><span class="pay-pill ${esc(c.paymentStatus)}">${esc(c.paymentStatus)}</span></td></tr>`).join('')||'<tr><td colspan="9">출재계약 데이터가 없습니다.</td></tr>';
      const cc=q('contractCount'); if(cc) cc.innerHTML=`출재계약 ${rows.length}건 · 기간계 출재 데이터 기준 · 출재 PPW = 우리가 재보험자에게 출재보험료를 낼 기한(미준수 시 담보 해지)`;
      const pg=q('contractPage'); if(pg) pg.innerText=`${state.pages.contract} / ${total}`;
      return;
    }
    // 수재(기존)
    const rows=contractsList().filter(c=>(!qstr||JSON.stringify(c).toLowerCase().includes(qstr))&&(line==='전체'||c.line===line));
    const total=Math.max(1,Math.ceil(rows.length/PAGE_SIZE));
    state.pages.contract=Math.min(state.pages.contract,total);
    const page=rows.slice((state.pages.contract-1)*PAGE_SIZE,state.pages.contract*PAGE_SIZE);
    if(thead) thead.innerHTML='<th>증권번호</th><th>피보험자</th><th>국가/도시</th><th>보험종목</th><th>가입금액</th><th>보험료</th><th>만기일</th>';
    tbody.innerHTML=page.map(c=>`<tr><td>${esc(c.policyNo)}<br><span class="source-pill official">기간계 수재계약</span></td><td>${esc(c.insured)}</td><td>${esc(c.country)}/${esc(c.city)}</td><td>${esc(c.line)}</td><td>${won(c.tsiEok)}</td><td>${won(c.premiumEok)}</td><td>${esc(c.renewalDate)||'-'}</td></tr>`).join('');
    const cc=q('contractCount'); if(cc) cc.innerHTML=`수재계약 ${rows.length}건 · 월마감 후 기간계에서 내려받은 해외수재 계약 기준`;
    const pg=q('contractPage'); if(pg) pg.innerText=`${state.pages.contract} / ${total}`;
  };

  // ---------- PPW 도래 알림: 출재(낼 돈·담보해지) / 수재(받을 돈·미수) ----------
  function outwardPPW(){ return cessions().map(c=>({...c,_d:diff(c.ppwDate)})).filter(c=>(c._d>=-30&&c._d<=7)||c.paymentStatus==='미납').sort((a,b)=>a._d-b._d); }
  function inwardPPW(){ return (typeof window.officialPPWRows==='function'?window.officialPPWRows():[]).map(c=>({...c,_d:diff(c.ppwDate)})).sort((a,b)=>a._d-b._d); }
  function outBadge(c){
    const d=c._d;
    if(c.paymentStatus==='미납'||d<0) return '<span style="background:#fee2e2;color:#b91c1c;padding:2px 8px;border-radius:10px;font-weight:700;font-size:12px">출재료 미납 · 담보 해지 위험</span>';
    if(d<=3) return '<span style="background:#fee2e2;color:#b91c1c;padding:2px 8px;border-radius:10px;font-weight:700;font-size:12px">담보 해지 임박 D-'+d+'</span>';
    return '<span style="background:#fef3c7;color:#b45309;padding:2px 8px;border-radius:10px;font-weight:600;font-size:12px">출재료 납입 임박 D-'+d+'</span>';
  }
  function inBadge(c){
    const d=c._d;
    if(d<=3) return '<span style="background:#ffedd5;color:#c2410c;padding:2px 8px;border-radius:10px;font-weight:700;font-size:12px">수재료 미수 임박 D-'+d+'</span>';
    return '<span style="background:#e0e7ff;color:#3730a3;padding:2px 8px;border-radius:10px;font-size:12px">납입 확인 필요 D-'+d+'</span>';
  }
  function ppwPanel(){ let p=q('ppwPanel'); if(!p){ const t=q('ppwTable'); p=t?t.closest('.panel'):null; if(p) p.id='ppwPanel'; } return p; }

  window.renderPPW = function(){
    const panel=ppwPanel(); if(!panel) return;
    const out=outwardPPW(), inn=inwardPPW();
    const outRows = out.length ? out.map(c=>`<tr><td style="padding:7px 9px;border-bottom:1px solid #eef2f7">${esc(c.cessionNo)}</td><td style="padding:7px 9px;border-bottom:1px solid #eef2f7">${esc(c.reinsurer)}</td><td style="padding:7px 9px;border-bottom:1px solid #eef2f7">${esc(c.originalInsured)}</td><td style="padding:7px 9px;border-bottom:1px solid #eef2f7">${esc(c.ppwDate)}</td><td style="padding:7px 9px;border-bottom:1px solid #eef2f7">D-${c._d}</td><td style="padding:7px 9px;border-bottom:1px solid #eef2f7">${won(c.cededPremiumEok)}</td><td style="padding:7px 9px;border-bottom:1px solid #eef2f7">${outBadge(c)}</td></tr>`).join('') : '<tr><td colspan="7" style="color:#64748b;padding:10px">7일 이내 출재 PPW 도래 건이 없습니다.</td></tr>';
    const inRows = inn.length ? inn.map(c=>`<tr><td style="padding:7px 9px;border-bottom:1px solid #eef2f7">${esc(c.policyNo)}</td><td style="padding:7px 9px;border-bottom:1px solid #eef2f7">${esc(c.insured)}</td><td style="padding:7px 9px;border-bottom:1px solid #eef2f7">${esc(c.line)}</td><td style="padding:7px 9px;border-bottom:1px solid #eef2f7">${esc(c.ppwDate)}</td><td style="padding:7px 9px;border-bottom:1px solid #eef2f7">D-${c._d}</td><td style="padding:7px 9px;border-bottom:1px solid #eef2f7">${inBadge(c)}</td></tr>`).join('') : '<tr><td colspan="6" style="color:#64748b;padding:10px">7일 이내 수재 PPW 도래 건이 없습니다.</td></tr>';
    const th='style="background:#f1f5f9;text-align:left"'; const td='style="padding:7px 9px;border-bottom:1px solid #eef2f7"';
    panel.innerHTML=`
      <h3>PPW 도래 알림 <span class="data-badge">조회일 기준 7일 이내</span></h3>
      <p class="muted" style="margin:0 0 12px">PPW(보험료납입 워런티) 마감일을 출재/수재로 구분해 표시합니다. 보험료 수금·정산 회계는 기간계/회계 본업이며, 이 화면은 마감일을 놓치지 않도록 <b>알림만</b> 제공합니다.</p>
      <div style="border:1px solid #fecaca;border-radius:12px;padding:12px 14px;margin-bottom:14px;background:#fff7f7">
        <div style="font-weight:700;color:#b91c1c;margin-bottom:2px">① 출재 PPW — 우리가 재보험자에게 낼 출재보험료 (놓치면 우리 담보 해지)</div>
        <div class="muted" style="margin-bottom:8px">기준: 기간계 출재계약 데이터 · 미준수 시 해당 출재 담보가 해지됩니다.</div>
        <div style="overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr ${th}><th style="padding:7px 9px">출재번호</th><th style="padding:7px 9px">재보험자</th><th style="padding:7px 9px">원수 피보험자</th><th style="padding:7px 9px">출재 PPW</th><th style="padding:7px 9px">D-Day</th><th style="padding:7px 9px">출재보험료</th><th style="padding:7px 9px">위험도</th></tr></thead>
        <tbody>${outRows}</tbody></table></div>
      </div>
      <div style="border:1px solid #fed7aa;border-radius:12px;padding:12px 14px;background:#fffaf5">
        <div style="font-weight:700;color:#c2410c;margin-bottom:2px">② 수재 PPW — 출재사가 우리에게 낼 수재보험료 (미수 관리)</div>
        <div class="muted" style="margin-bottom:8px">기준: 기간계 체결 수재계약 데이터 · 받을 보험료(미수) 관리 목적입니다.</div>
        <div style="overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr ${th}><th style="padding:7px 9px">증권번호</th><th style="padding:7px 9px">피보험자</th><th style="padding:7px 9px">종목</th><th style="padding:7px 9px">수재 PPW</th><th style="padding:7px 9px">D-Day</th><th style="padding:7px 9px">상태</th></tr></thead>
        <tbody>${inRows}</tbody></table></div>
      </div>`;
  };

  // 대시보드 PPW 목록 모달도 출재/수재 구분
  const prevList=window.showDashboardList;
  window.showDashboardList=function(kind){
    if(kind!=='ppw'){ if(typeof prevList==='function') return prevList(kind); return; }
    const out=outwardPPW(), inn=inwardPPW();
    const trO=out.map(c=>`<tr><td style="padding:6px 8px">${esc(c.cessionNo)}</td><td style="padding:6px 8px">${esc(c.reinsurer)}</td><td style="padding:6px 8px">${esc(c.ppwDate)}</td><td style="padding:6px 8px">D-${c._d}</td><td style="padding:6px 8px">${outBadge(c)}</td></tr>`).join('')||'<tr><td colspan="5" style="padding:8px;color:#64748b">없음</td></tr>';
    const trI=inn.map(c=>`<tr><td style="padding:6px 8px">${esc(c.policyNo)}</td><td style="padding:6px 8px">${esc(c.insured)}</td><td style="padding:6px 8px">${esc(c.ppwDate)}</td><td style="padding:6px 8px">D-${c._d}</td><td style="padding:6px 8px">${inBadge(c)}</td></tr>`).join('')||'<tr><td colspan="5" style="padding:8px;color:#64748b">없음</td></tr>';
    let m=q('graListModal');
    if(!m){ m=document.createElement('div'); m.id='graListModal'; m.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.55);display:none;align-items:center;justify-content:center;z-index:99999;padding:24px'; m.innerHTML='<div style="background:#fff;border-radius:14px;max-width:820px;width:100%;max-height:82vh;overflow:auto;padding:22px 24px;box-shadow:0 20px 60px rgba(0,0,0,.3)"><div id="graListBody"></div><div style="text-align:right;margin-top:14px"><button id="graListClose" style="padding:8px 18px;border:none;border-radius:8px;background:#0f172a;color:#fff;cursor:pointer">닫기</button></div></div>'; document.body.appendChild(m); m.addEventListener('click',e=>{if(e.target===m)m.style.display='none';}); q('graListClose').addEventListener('click',()=>{m.style.display='none';}); }
    q('graListBody').innerHTML=`<h3 style="margin:0 0 10px">PPW 도래 알림 (7일 이내)</h3>
      <h4 style="color:#b91c1c;margin:6px 0">① 출재 PPW · 놓치면 우리 담보 해지</h4>
      <table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#f1f5f9;text-align:left"><th style="padding:6px 8px">출재번호</th><th style="padding:6px 8px">재보험자</th><th style="padding:6px 8px">출재 PPW</th><th style="padding:6px 8px">D-Day</th><th style="padding:6px 8px">위험도</th></tr></thead><tbody>${trO}</tbody></table>
      <h4 style="color:#c2410c;margin:16px 0 6px">② 수재 PPW · 미수 관리</h4>
      <table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#f1f5f9;text-align:left"><th style="padding:6px 8px">증권번호</th><th style="padding:6px 8px">피보험자</th><th style="padding:6px 8px">수재 PPW</th><th style="padding:6px 8px">D-Day</th><th style="padding:6px 8px">상태</th></tr></thead><tbody>${trI}</tbody></table>`;
    m.style.display='flex';
    const dl=q('dashboardList'); if(dl) dl.innerHTML='';
  };

  const prevSwitch=window.switchTab;
  window.switchTab=function(tab){ if(typeof prevSwitch==='function') prevSwitch(tab); if(tab==='contract') setTimeout(()=>{ try{ window.renderContractTable(); window.renderPPW(); }catch(e){} },70); };
  window.addEventListener('load',()=>setTimeout(()=>{ try{ window.renderPPW(); }catch(e){} },4900));
})();

/* ===== v70: 수재계약 입력관리(진행관리) CSV 내보내기 ===== */
(function(){
  const q=(id)=>document.getElementById(id);
  window.exportFacCSV = function(){
    const rows=(state.fac||[]);
    if(!rows.length){ alert('내보낼 수재계약이 없습니다.'); return; }
    const latest=f=>{ const h=(f.statusHistory||[])[0]; return h?((h.at||'')+' '+(h.by||'')+' → '+(h.status||'')):''; };
    const cols=[
      ['수재관리번호','inwardRef'],['접수번호','intakeNo'],['피보험자','insured'],
      ['국가','country'],['도시','city'],['보험종목','line'],
      ['가입금액(억원)','tsiEok'],['보험료(억원)','premiumEok'],['통화','currency'],
      ['보험료(원통화)','premiumOriginal'],['출재사','cedant'],['PPW','ppwDate'],
      ['진행상태','reviewStatus'],['검토담당','reviewOwner'],['접수경로','requestSource'],
      ['수재확정노트','confirmNote'],['메모','memo']
    ];
    const esc=v=>{ v=(v==null?'':String(v)); return /[",\r\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; };
    const header=cols.map(c=>c[0]).concat('최근 변경 로그').join(',');
    const body=rows.map(r=>cols.map(c=>esc(r[c[1]])).concat(esc(latest(r))).join(',')).join('\r\n');
    const csv='\uFEFF'+header+'\r\n'+body;
    try{
      const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
      const url=URL.createObjectURL(blob); const a=document.createElement('a');
      const today=(state.meta&&state.meta.asOfDate)?state.meta.asOfDate:new Date().toISOString().slice(0,10);
      a.href=url; a.download='수재계약입력관리_'+today+'.csv';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      const m=q('facMsg'); if(m) m.innerText=rows.length+'건 CSV 내보내기 완료';
    }catch(e){ console.warn('[v70 csv]',e); alert('CSV 내보내기 중 오류가 발생했습니다.'); }
  };
  function ensureFacCsvBtn(){
    const sec=q('inward'); if(!sec) return;
    const panel=sec.querySelector('#facTable')?.closest('.panel'); if(!panel) return;
    if(panel.querySelector('.fac-csv-btn')) return;
    const row=panel.querySelector('.bulk-action-row'); if(!row) return;
    row.style.display='flex'; row.style.alignItems='center'; row.style.gap='8px';
    const b=document.createElement('button');
    b.className='fac-csv-btn'; b.textContent='⬇ 진행관리 CSV 내보내기';
    b.style.cssText='margin-left:auto;padding:8px 16px;background:#0f766e;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap';
    b.onclick=exportFacCSV;
    row.appendChild(b);
  }
  const prevSwitch=window.switchTab;
  window.switchTab=function(tab){ if(typeof prevSwitch==='function') prevSwitch(tab); if(tab==='inward') setTimeout(ensureFacCsvBtn,90); };
  window.addEventListener('load',()=>setTimeout(ensureFacCsvBtn,5100));
})();
