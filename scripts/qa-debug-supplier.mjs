const BASE = 'http://localhost:4001/api/v1';
let token='', cookieJar='', csrf='';
function ext(res){const scs=res.headers.getSetCookie?res.headers.getSetCookie():[];for(const sc of scs){const eq=sc.indexOf('=');if(eq<0)continue;const n=sc.slice(0,eq).trim();const v=sc.slice(eq+1).split(';')[0];cookieJar=cookieJar.replace(new RegExp(`${n}=[^;]*;? ?`),'')+`${n}=${v}; `;}}
async function api(p,o={}){const h={'Content-Type':'application/json',...(o.headers||{})};if(token)h.Authorization=`Bearer ${token}`;if(cookieJar)h.Cookie=cookieJar;if(csrf&&!['GET','HEAD'].includes((o.method||'GET').toUpperCase()))h['X-CSRF-Token']=csrf;const res=await fetch(BASE+p,{...o,headers:h});ext(res);const t=await res.text();let b;try{b=JSON.parse(t)}catch{b=t}if(res.status===403&&!['GET','HEAD'].includes((o.method||'GET').toUpperCase())&&!o.__r){await refresh();return api(p,{...o,__r:true})}return{status:res.status,body:b};}
async function refresh(){const res=await fetch(BASE+'/auth/csrf',{method:'POST',headers:cookieJar?{Cookie:cookieJar}:{}});ext(res);csrf=(cookieJar.match(/csrf_token=([^;\s]+)/)||[])[1]||'';}
const login=await api('/auth/login',{method:'POST',body:JSON.stringify({email:'admin@shranix.com',password:'admin123'})});
token=login.body?.data?.tokens?.accessToken||login.body?.accessToken||'';
// create supplier
const gst='27'+'A'.repeat(5)+'9999'+'B1Z5';
const c=await api('/suppliers',{method:'POST',body:JSON.stringify({name:'Debug Sup',gstin:gst,mobile:'9900112233',status:'active'})});
const sid=(c.body?.data||c.body)?.id;
console.log('created id:',sid);
// address
const a=await api(`/suppliers/${sid}/addresses`,{method:'POST',body:JSON.stringify({addressType:'billing',address:'X',pincode:'411001'})});
const aid=(a.body?.data||a.body)?.id;
console.log('addr create status',a.status,'aid',aid,'body',JSON.stringify(a.body).slice(0,150));
const up=await api(`/suppliers/${sid}/addresses/${aid}`,{method:'PUT',body:JSON.stringify({pincode:'400001'})});
console.log('addr update status',up.status,'body',JSON.stringify(up.body).slice(0,200));
// ledger
const lg=await api(`/suppliers/${sid}/ledger`);
console.log('ledger status',lg.status,'body',JSON.stringify(lg.body).slice(0,250));
// cleanup
await api(`/suppliers/${sid}`,{method:'DELETE'});
