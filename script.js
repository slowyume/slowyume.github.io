const STORAGE_KEY = 'playwithgoal-qr-v4';
const QR_PARAM = 'pwgl';

const TITLES = [
  { count: 0, title: '새로운 시작' },
  { count: 2, title: '한 걸음 나아가는 자' },
  { count: 5, title: '마음의 불씨를 품은 자' },
  { count: 10, title: '탐험하며 성장하는 자' },
  { count: 20, title: '자신의 길을 꾸준히 가는 자' },
  { count: 40, title: '삶을 만들어내는 자' },
  { count: 60, title: '노력이 빛을 발하는 자' },
  { count: 80, title: '목표 달성 전문가' },
  { count: 100, title: '자신의 스킬을 쌓아올린 대가' },
  { count: 120, title: '목표 달성 마스터' }
];

const TERRITORIES = [
  {level:1,name:'새싹터',icon:'🌱',desc:'작은 모험이 시작되는 곳',cost:300},
  {level:2,name:'초가집',icon:'🛖',desc:'편안하게 쉬어갈 수 있는 작은 집',cost:600},
  {level:3,name:'목조주택',icon:'🏡',desc:'조금씩 삶의 기반이 단단해집니다',cost:700},
  {level:4,name:'정원주택',icon:'🏘️',desc:'휴식과 성장이 함께 자라는 곳',cost:1000},
  {level:5,name:'별빛주택',icon:'🌃',desc:'밤에도 작은 꿈들이 빛나는 곳',cost:1500},
  {level:6,name:'저택',icon:'🏰',desc:'오래 쌓은 노력의 결실이 보이는 곳',cost:2500},
  {level:7,name:'신전',icon:'🏛️',desc:'나만의 가치와 목표를 기리는 곳',cost:5000},
  {level:8,name:'별의 제국',icon:'🌌',desc:'끝없이 새로운 모험을 시작하는 곳',cost:null}
];

const DEFAULT_QUESTS = [];

const WEAPON_NAMES = ['별빛 단검','바람의 검','달빛 활','새벽 지팡이','모험가의 검','은하의 창','숲의 활'];
const ARMOR_NAMES = ['구름 망토','초원 가죽갑옷','별빛 로브','여행자의 갑옷','달의 흉갑','숲의 망토','은하 판금갑옷'];
const SHOP_PREFIX = ['낡은','정교한','빛나는','신비한','용감한','찬란한','전설의'];

let state = loadState();
if(!state.lastDayKey) state.lastDayKey=dateKey(new Date());
if(!state.lastWeekKey) state.lastWeekKey=weekKey();
save();
let selectedGold = 100;
let loggedIn = localStorage.getItem('playwithgoal-local-login') === '1';

function freshState(){
  return {
    gold:0,totalXp:0,completedCount:0,bossCount:0,streak:0,lastPlayDate:null,lastDayKey:null,lastWeekKey:null,
    territoryLevel:1,bossClaimed:false,
    quests:DEFAULT_QUESTS.map(([id,name,gold])=>({
      id,name,gold,exp:Math.round(gold/2),completed:false,custom:false
    })),
    inventory:[],
    equipped:{weapon:null,armor:null},
    shopSeed:null,
    shopItems:[]
  };
}

function loadState(){
  try{
    const s=JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(!s)return freshState();
    const base=freshState();
    return {
      ...base,...s,
      quests:Array.isArray(s.quests)?s.quests:base.quests,
      inventory:Array.isArray(s.inventory)?s.inventory:[],
      equipped:s.equipped&&typeof s.equipped==='object'?s.equipped:base.equipped,
      shopItems:Array.isArray(s.shopItems)?s.shopItems:[],
      shopSeed:s.shopSeed||null
    };
  }catch{return freshState();}
}

function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}

function level(){return Math.max(1,Math.min(50,Math.floor(state.totalXp/100)+1));}

function title(){
  let t=TITLES[0];
  for(const x of TITLES) if(state.completedCount>=x.count)t=x;
  return t;
}

function nextTitle(){
  return TITLES.find(x=>state.completedCount<x.count)||null;
}

function dateKey(d){return d.toISOString().slice(0,10);}

function weekKey(d=new Date()){
  const x=new Date(d); x.setHours(0,0,0,0);
  const day=x.getDay()||7; x.setDate(x.getDate()-day+1);
  return dateKey(x);
}

function refreshPeriods(){
  const today = dateKey(new Date());
  const week = weekKey();

  // 처음 실행할 때 기준 날짜만 기록
  if(!state.lastDayKey){
    state.lastDayKey = today;
  }

  // 날짜가 바뀌면 일일 퀘스트를 새로 시작함.
  if(state.lastDayKey !== today){
    state.quests = state.quests.filter(q=>!q.rest);
    state.quests.forEach(q=>{
      if(q.completed){
        q.completed = false;
      }
      delete q.rest;
    });
    state.lastDayKey = today;
  }

  // 주간 보스는 새로운 주가 되면 다시 도전할 수 있게 함.
  if(!state.lastWeekKey){
    state.lastWeekKey = week;
  }
  if(state.lastWeekKey !== week){
    state.bossClaimed = false;
    state.lastWeekKey = week;
  }

  save();
}

function touchStreak(){
  const today=dateKey(new Date());
  if(!state.lastPlayDate){state.streak=1;state.lastPlayDate=today;return;}
  if(state.lastPlayDate===today)return;
  const y=new Date();y.setDate(y.getDate()-1);
  state.streak=state.lastPlayDate===dateKey(y)?state.streak+1:1;
  state.lastPlayDate=today;
}

function esc(s){
  return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function uid(prefix='q'){
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function bytesToBase64(bytes){
  let binary='';
  const chunk=0x8000;
  for(let i=0;i<bytes.length;i+=chunk) binary+=String.fromCharCode(...bytes.subarray(i,i+chunk));
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

function base64ToBytes(str){
  const b64=str.replace(/-/g,'+').replace(/_/g,'/')+'==='.slice((str.length+3)%4);
  const binary=atob(b64);
  const bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  return bytes;
}

function encodeLoginData(){
  const data={
    v:1,
    gold:state.gold,totalXp:state.totalXp,completedCount:state.completedCount,bossCount:state.bossCount,
    streak:state.streak,lastPlayDate:state.lastPlayDate,lastDayKey:state.lastDayKey,lastWeekKey:state.lastWeekKey,
    territoryLevel:state.territoryLevel,bossClaimed:state.bossClaimed,
    quests:state.quests,inventory:state.inventory,equipped:state.equipped,
    shopSeed:state.shopSeed,shopItems:state.shopItems
  };
  const json=JSON.stringify(data);
  const bytes=new TextEncoder().encode(json);
  return bytesToBase64(bytes);
}

function decodeLoginData(encoded){
  try{
    const data=JSON.parse(new TextDecoder().decode(base64ToBytes(encoded)));
    if(!data||data.v!==1||!Array.isArray(data.quests)||!Array.isArray(data.inventory))throw new Error('invalid');
    return data;
  }catch{return null;}
}

function buildLoginUrl(){
  const url=new URL(location.href);
  url.search='';url.hash='';
  url.searchParams.set(QR_PARAM,encodeLoginData());
  return url.toString();
}

function openLoginModal(){
  const modal=document.querySelector('#loginModal');
  if(modal)modal.showModal();
}

function createLoginQr(){
  const box=document.querySelector('#qrCode');
  const home=document.querySelector('#qrLoginHome');
  const view=document.querySelector('#qrLoginView');
  if(!box||!home||!view)return;
  if(typeof QRCode==='undefined'){
    toast('QR 생성 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해주세요.');
    return;
  }
  box.innerHTML='';
  const url=buildLoginUrl();
  new QRCode(box,{text:url,width:230,height:230,colorDark:'#34423b',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});
  home.classList.add('hidden');view.classList.remove('hidden');
}

function importLoginUrl(raw){
  try{
    const url=new URL(raw.trim());
    const encoded=url.searchParams.get(QR_PARAM);
    const data=encoded?decodeLoginData(encoded):null;
    if(!data){toast('유효한 PlayWithGoal QR 로그인 데이터가 아닙니다.');return false;}
    const base=freshState();
    state={...base,...data,
      quests:Array.isArray(data.quests)?data.quests:[],inventory:Array.isArray(data.inventory)?data.inventory:[],
      equipped:data.equipped&&typeof data.equipped==='object'?data.equipped:base.equipped,
      shopItems:Array.isArray(data.shopItems)?data.shopItems:[],shopSeed:data.shopSeed||null,
      lastDayKey:data.lastDayKey||dateKey(new Date()),lastWeekKey:data.lastWeekKey||weekKey()
    };
    loggedIn=true;
    localStorage.setItem('playwithgoal-local-login','1');
    save();
    render();
handleQrLoginFromUrl();
    closeDialog('#loginModal');
    toast('✨ QR 로그인 완료! 진행도를 불러왔습니다.');
    return true;
  }catch{
    toast('QR 로그인 주소를 확인해주세요.');
    return false;
  }
}

function handleQrLoginFromUrl(){
  const url=new URL(location.href);
  const encoded=url.searchParams.get(QR_PARAM);
  if(!encoded)return;
  const data=decodeLoginData(encoded);
  if(!data){toast('QR 로그인 데이터가 올바르지 않습니다.');return;}
  const base=freshState();
  state={...base,...data,
    quests:Array.isArray(data.quests)?data.quests:[],inventory:Array.isArray(data.inventory)?data.inventory:[],
    equipped:data.equipped&&typeof data.equipped==='object'?data.equipped:base.equipped,
    shopItems:Array.isArray(data.shopItems)?data.shopItems:[],shopSeed:data.shopSeed||null,
    lastDayKey:data.lastDayKey||dateKey(new Date()),lastWeekKey:data.lastWeekKey||weekKey()
  };
  loggedIn=true;
  localStorage.setItem('playwithgoal-local-login','1');
  save();
  history.replaceState({},document.title,url.origin+url.pathname+url.hash);
  render();
  setTimeout(()=>toast('✨ QR 로그인 완료! 진행도를 불러왔습니다.'),50);
}

function render(){
  refreshPeriods();
  const lv=level(),t=title(),base=(lv-1)*100,xp=Math.max(0,state.totalXp-base),pct=Math.min(100,xp);
  document.querySelector('#rpg-level').textContent=lv;
  document.querySelector('#rpg-gold').textContent=state.gold.toLocaleString();
  document.querySelector('#rpg-title').textContent=t.title;
  document.querySelector('#rpg-xpbar').style.width=pct+'%';
  document.querySelector('#rpg-xptext').textContent=`${xp} / 100 EXP`;
  document.querySelector('#rpg-percent').textContent=pct+'%';
  renderTerritory();renderQuests();renderBoss();renderCustom();renderAuth();renderShop();
}

function renderTerritory(){
  const t=TERRITORIES[Math.min(state.territoryLevel-1,TERRITORIES.length-1)];
  document.querySelector('#rpg-village').textContent=t.icon;
  document.querySelector('#rpg-houseName').textContent=t.name;
  document.querySelector('#rpg-houseDesc').textContent=t.desc;
  const b=document.querySelector('#upgradeButton'),h=document.querySelector('#upgradeHint');
  if(!t.cost){
    b.disabled=true;b.textContent='집 업그레이드 완료';h.textContent='최대 레벨에 도달했습니다.';
  }else{
    b.disabled=state.gold<t.cost;b.textContent='집 업그레이드';
    h.textContent=`다음 업그레이드: ${t.cost.toLocaleString()} G`;
  }
}

function renderQuests(){
  const list=document.querySelector('#rpg-quests');
  const active=state.quests.filter(q=>!q.completed);
  if(!active.length){
    list.innerHTML='<div class="empty">🎉 오늘의 퀘스트를 모두 완료했습니다.<br>새 퀘스트를 만들어보세요.</div>';
    return;
  }
  list.innerHTML=active.map(q=>`
    <div class="quest">
      <input class="quest-check" type="checkbox" data-id="${q.id}" aria-label="${esc(q.name)} 완료">
      <span class="quest-name">${esc(q.name)}</span>
      <span class="reward">+${q.gold} G<br>+${q.exp} EXP</span>
      <button class="delete-btn" data-delete="${q.id}" aria-label="삭제">×</button>
    </div>`).join('');
}

function renderBoss(){
  const completed=state.quests.filter(q=>q.completed).length,progress=Math.min(5,completed),pct=progress*20,box=document.querySelector('#rpg-boss');
  box.innerHTML=`
    <div class="boss">
      <div class="boss-top">
        <div class="boss-icon">🐉</div>
        <div class="boss-content">
          <strong>이번 주의 보스</strong>
          <p>퀘스트를 5개 완료하여 보스를 토벌하세요.</p>
          <div class="bar"><div style="width:${pct}%"></div></div>
          <div class="boss-status"><span>${progress} / 5</span><span>보상 500 G + 300 EXP</span></div>
        </div>
      </div>
      <button type="button" id="claimBoss" class="pill-button boss-button" ${progress<5||state.bossClaimed?'disabled':''}>
        ${state.bossClaimed?'이번 주 보상 완료':progress>=5?'보스 토벌하고 보상 받기':'보스 토벌까지 '+(5-progress)+'개 남음'}
      </button>
    </div>`;
  document.querySelector('#claimBoss').addEventListener('click',claimBoss);
}

function renderCustom(){
  const list=document.querySelector('#rpg-custom-quests');
  const custom=state.quests.filter(q=>q.custom);
  list.innerHTML=custom.length?custom.map(q=>`
    <div class="custom-row">
      <span><strong>${esc(q.name)}</strong> <small>· ${q.gold} G / ${q.exp} EXP</small></span>
      <button data-custom-delete="${q.id}">삭제</button>
    </div>`).join(''):'<div class="empty">추가한 퀘스트가 아직 없습니다.</div>';
}

function renderAuth(){
  document.querySelectorAll('.login-btn').forEach(x=>x.classList.toggle('hidden',loggedIn));
  document.querySelectorAll('.logout-btn').forEach(x=>x.classList.toggle('hidden',!loggedIn));
  document.querySelector('#management').classList.toggle('hidden',!loggedIn);
}

function seededRandom(seed){
  let n=seed>>>0;
  return function(){n=(n*1664525+1013904223)>>>0;return n/4294967296;};
}

function generateShop(force=false){
  const lv=level();
  const seedBase=`${weekKey()}-${lv}-${force?Date.now():''}`;
  let seed=0;
  for(let i=0;i<seedBase.length;i++)seed=((seed<<5)-seed+seedBase.charCodeAt(i))|0;
  const rnd=seededRandom(seed);
  const tier=Math.min(7,Math.max(1,Math.ceil(lv/7)));
  const items=[];
  const used=new Set();
  while(items.length<4){
    const type=rnd()<0.5?'weapon':'armor';
    const names=type==='weapon'?WEAPON_NAMES:ARMOR_NAMES;
    const name=names[Math.floor(rnd()*names.length)];
    const key=type+'-'+name;
    if(used.has(key))continue;
    used.add(key);
    const itemLevel=Math.max(1,Math.min(50,lv+Math.floor(rnd()*5)-2));
    const prefix=SHOP_PREFIX[Math.min(SHOP_PREFIX.length-1,tier-1)];
    const stat=Math.max(2,Math.round(itemLevel*2+rnd()*itemLevel));
    const price=Math.max(200,Math.round((itemLevel*55+stat*12+rnd()*180)/10)*10);
    items.push({
      id:uid('item'),type,name:`${prefix} ${name}`,level:itemLevel,
      stat,price,icon:type==='weapon'?'⚔️':'🛡️'
    });
  }
  state.shopItems=items;
  state.shopSeed=seedBase;
  save();
}

function ensureShop(){
  const today=weekKey();
  const prefix=`${today}-${level()}-`;
  if(!Array.isArray(state.shopItems)||state.shopItems.length!==4||!String(state.shopSeed||'').startsWith(prefix)){
    generateShop(false);
  }
}

function renderShop(){
  ensureShop();
  const box=document.querySelector('#rpg-shop');
  if(!box)return;
  box.innerHTML=state.shopItems.map(item=>{
    const equipped=state.equipped[item.type]===item.id;
    const owned=state.inventory.some(x=>x.id===item.id);
    return `
      <div class="shop-item ${equipped?'equipped':''}">
        <div class="shop-item-icon">${item.icon}</div>
        <div class="shop-item-main">
          <strong>${esc(item.name)}</strong>
          <small>Lv.${item.level} · ${item.type==='weapon'?'공격력':'방어력'} +${item.stat}</small>
          <span class="shop-price">💰 ${item.price.toLocaleString()} G</span>
        </div>
        <button type="button" class="shop-buy" data-buy-item="${item.id}" ${owned?'disabled':''}>
          ${equipped?'장착 중':owned?'보유 중':'구매'}
        </button>
      </div>`;
  }).join('')+`
    <div class="equipment-status">
      ⚔️ ${state.equipped.weapon?esc(findInventoryName(state.equipped.weapon)):'무기 없음'}
      · 🛡️ ${state.equipped.armor?esc(findInventoryName(state.equipped.armor)):'갑옷 없음'}
    </div>`;
}

function findInventoryName(id){
  const item=state.inventory.find(x=>x.id===id)||state.shopItems.find(x=>x.id===id);
  return item?item.name:'장비 없음';
}

function buyItem(id){
  const item=state.shopItems.find(x=>x.id===id);
  if(!item)return;
  if(state.inventory.some(x=>x.id===id)){toast('이미 가지고 있는 장비입니다.');return;}
  if(state.gold<item.price){toast(`💰 ${item.price-state.gold} G가 더 필요합니다.`);return;}
  state.gold-=item.price;
  state.inventory.push(item);
  state.equipped[item.type]=item.id;
  save();render();
  toast(`${item.icon} ${item.name}을(를) 구매하고 장착했습니다!`);
}

function refreshShop(){
  generateShop(true);
  renderShop();
  toast('🎲 AI 상인이 새로운 장비를 가져왔습니다.');
}


function completeQuest(id){
  const q=state.quests.find(x=>x.id===id);
  if(!q||q.completed)return;
  const old=level();
  q.completed=true;
  state.gold+=q.gold;
  state.totalXp+=q.exp;
  state.completedCount++;
  touchStreak();
  save();render();
  toast(`✨ ${q.name} 완료! +${q.exp} EXP · +${q.gold} G`);
  if(level()>old)setTimeout(()=>toast(`🎉 LEVEL UP! Lv.${level()} ${title().title}`),450);
}

function deleteQuest(id){
  const q=state.quests.find(x=>x.id===id);
  if(!q)return;
  state.quests=state.quests.filter(x=>x.id!==id);
  save();render();toast(`🗑️ "${q.name}" 퀘스트를 삭제했습니다.`);
}

function addQuest(name,gold){
  name=name.trim();
  if(!name){toast('퀘스트 이름을 입력해주세요.');return false;}
  const g=Number(gold);
  state.quests.push({id:uid('q'),name,gold:g,exp:Math.round(g/2),completed:false,custom:true});
  save();render();
  toast('⚔️ 새 퀘스트가 추가되었습니다.');
  return true;
}

function upgrade(){
  const t=TERRITORIES[state.territoryLevel-1];
  if(!t.cost)return;
  if(state.gold<t.cost){toast(`💰 ${t.cost-state.gold} G가 더 필요합니다.`);return;}
  state.gold-=t.cost;state.territoryLevel++;
  save();render();
  toast(`🏡 영지가 ${TERRITORIES[state.territoryLevel-1].name}(으)로 업그레이드되었습니다.`);
}

function claimBoss(){
  const completed=state.quests.filter(q=>q.completed).length;
  if(completed<5||state.bossClaimed)return;
  state.gold+=500;state.totalXp+=300;state.bossCount++;state.bossClaimed=true;
  save();render();toast('🐉 보스 토벌 성공! +500 G · +300 EXP');
}

function reset(){
  if(!confirm('진행도를 전체 초기화할까요?'))return;
  state=freshState();save();render();toast('진행도가 초기화되었습니다.');
}

function toast(msg){
  const el=document.querySelector('#toast');el.textContent=msg;el.classList.add('show');
  clearTimeout(window.__toast);window.__toast=setTimeout(()=>el.classList.remove('show'),2400);
}

function openQuestModal(){
  document.querySelector('#modalQuestName').value='';selectedGold=100;
  document.querySelectorAll('.diff-btn').forEach(b=>b.classList.toggle('selected',Number(b.dataset.gold)===selectedGold));
  document.querySelector('#newQuestModal').showModal();
  setTimeout(()=>document.querySelector('#modalQuestName').focus(),50);
}

function closeDialog(id){document.querySelector(id).close();}
function login(){openLoginModal();}
function logout(){loggedIn=false;localStorage.removeItem('playwithgoal-local-login');render();toast('로그아웃했습니다.');}

document.addEventListener('change',e=>{
  if(e.target.matches('.quest-check'))completeQuest(e.target.dataset.id);
});

document.addEventListener('click',e=>{
  const del=e.target.closest('[data-delete]');
  if(del)deleteQuest(del.dataset.delete);
  const cdel=e.target.closest('[data-custom-delete]');
  if(cdel)deleteQuest(cdel.dataset.customDelete);
  const buy=e.target.closest('[data-buy-item]');
  if(buy)buyItem(buy.dataset.buyItem);
});

const on = (selector,event,handler) => { const el=document.querySelector(selector); if(el) el.addEventListener(event,handler); };
on('#upgradeButton','click',upgrade);
on('#resetButton','click',reset);
on('#newQuestButton','click',openQuestModal);
on('#refreshShopButton','click',refreshShop);
on('#addQuestButton','click',()=>{ const name=document.querySelector('#newQuestName'),gold=document.querySelector('#newQuestGold'); if(name&&gold&&addQuest(name.value,gold.value)) name.value=''; });
on('#submitNewQuest','click',()=>{ const input=document.querySelector('#modalQuestName'); if(input&&addQuest(input.value,selectedGold)) closeDialog('#newQuestModal'); });
on('#modalClose','click',()=>closeDialog('#newQuestModal'));
document.querySelectorAll('.diff-btn').forEach(b=>b.addEventListener('click',()=>{ selectedGold=Number(b.dataset.gold); document.querySelectorAll('.diff-btn').forEach(x=>x.classList.toggle('selected',x===b)); }));
document.querySelectorAll('.login-btn').forEach(b=>b.addEventListener('click',login));
document.querySelectorAll('.logout-btn').forEach(b=>b.addEventListener('click',logout));
on('#createQrButton','click',createLoginQr);
on('#importQrButton','click',()=>{const input=document.querySelector('#qrImportInput'),button=document.querySelector('#applyQrImportButton');if(input)input.classList.toggle('hidden');if(button)button.classList.toggle('hidden');});
on('#applyQrImportButton','click',()=>{const input=document.querySelector('#qrImportInput');if(input)importLoginUrl(input.value);});
on('#closeQrViewButton','click',()=>{document.querySelector('#qrLoginView')?.classList.add('hidden');document.querySelector('#qrLoginHome')?.classList.remove('hidden');});
on('#loginClose','click',()=>closeDialog('#loginModal'));
const overlay=document.querySelector('#navOverlay');
on('#navOpenButton','click',()=>{ if(overlay){overlay.classList.remove('hidden');overlay.setAttribute('aria-hidden','false');} });
on('#navCloseButton','click',()=>{ if(overlay){overlay.classList.add('hidden');overlay.setAttribute('aria-hidden','true');} });
document.querySelectorAll('.nav-close-link').forEach(a=>a.addEventListener('click',()=>{ if(overlay) overlay.classList.add('hidden'); }));
render();
