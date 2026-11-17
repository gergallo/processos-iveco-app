/* ===== Serviços do aplicativo: banco de dados e downloads =====
   Com config.js preenchido (Supabase): base ÚNICA na nuvem, login por e-mail e senha,
   atualização em tempo real para todos e cópia local para abrir sem internet.
   Sem config.js: base apenas neste aparelho (IndexedDB).                              */
(function(){
  const CFG=window.CONFIG_NUVEM||{}, NUVEM=!!(CFG.url&&CFG.chave&&window.supabase&&!/COLE_AQUI/.test(CFG.url+CFG.chave));
  const DBN="controle-iveco", ST="docs";
  let idb=null, mem=new Map(), pronto=null, sb=null, eu=null, editor=!NUVEM, pend=[];
  const colL=new Map(), docL=new Map();
  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  const abrir=()=>new Promise((ok,er)=>{ const r=indexedDB.open(DBN,1); r.onupgradeneeded=()=>r.result.createObjectStore(ST); r.onsuccess=()=>ok(r.result); r.onerror=()=>er(r.error); });
  const idbTodos=async()=>{ try{ idb=idb||await abrir(); await new Promise((ok,er)=>{ const c=idb.transaction(ST,"readonly").objectStore(ST).openCursor(); c.onsuccess=()=>{ const cu=c.result; if(cu){ mem.set(cu.key,cu.value); cu.continue(); } else ok(); }; c.onerror=()=>er(c.error); }); }catch(e){ idb=null; } };
  const idbPut=(k,v)=>{ if(!idb) return Promise.resolve(); return new Promise(ok=>{ const tx=idb.transaction(ST,"readwrite"), s=tx.objectStore(ST); v===undefined?s.delete(k):s.put(v,k); tx.oncomplete=()=>ok(); tx.onerror=()=>ok(); }); };
  const idbLimpa=()=>{ if(!idb) return Promise.resolve(); return new Promise(ok=>{ const tx=idb.transaction(ST,"readwrite"); tx.objectStore(ST).clear(); tx.oncomplete=()=>ok(); tx.onerror=()=>ok(); }); };
  const snapCol=col=>({docs:[...mem.entries()].filter(([k])=>k.startsWith(col+"/")&&k.indexOf("/",col.length+1)<0).map(([k,v])=>({id:k.slice(col.length+1),data:()=>clone(v),exists:true}))});
  const snapDoc=p=>{ const v=mem.get(p); return {id:p.split("/").pop(),exists:v!==undefined,data:()=>clone(v)}; };
  const avisaCol=col=>(colL.get(col)||[]).forEach(f=>{ try{f(snapCol(col))}catch(e){console.error(e)} });
  const avisa=path=>{ avisaCol(path.slice(0,path.lastIndexOf("/"))); (docL.get(path)||[]).forEach(f=>{ try{f(snapDoc(path))}catch(e){console.error(e)} }); };
  const avisaTudo=()=>{ colL.forEach((_,c)=>avisaCol(c)); docL.forEach((fs,p)=>fs.forEach(f=>{ try{f(snapDoc(p))}catch(e){} })); };
  const addL=(m,k,f)=>{ if(!m.has(k)) m.set(k,[]); m.get(k).push(f); return ()=>{ const a=m.get(k)||[]; const i=a.indexOf(f); if(i>=0) a.splice(i,1); }; };
  let avisoT=null; const aviso=t=>{ let e=document.getElementById("nv-toast"); if(!e){ e=document.createElement("div"); e.id="nv-toast"; e.style.cssText="position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:10001;background:#13202A;color:#fff;padding:10px 16px;border-radius:10px;font:14px system-ui;box-shadow:0 8px 24px rgba(0,0,0,.3);max-width:90vw"; document.body.appendChild(e); } e.textContent=t; e.hidden=false; clearTimeout(avisoT); avisoT=setTimeout(()=>e.hidden=true,3500); };
  const status=t=>{ const run=()=>{ const c=document.getElementById("conn-txt"); if(c) c.textContent=t; }; document.readyState==="loading"?document.addEventListener("DOMContentLoaded",run):run(); };

  /* ---------- nuvem ---------- */
  const PK="controle-iveco-pendentes";
  try{ pend=JSON.parse(localStorage.getItem(PK)||"[]"); }catch(e){ pend=[]; }
  const salvaPend=()=>{ try{ localStorage.setItem(PK,JSON.stringify(pend)); }catch(e){} };
  const envia=async op=>{ if(op.del){ const {error}=await sb.from("docs").delete().eq("path",op.path); if(error) throw error; }
    else { const {error}=await sb.from("docs").upsert({path:op.path,data:op.data,updated_at:new Date().toISOString(),updated_by:eu&&eu.email}); if(error) throw error; } };
  let enviando=false;
  const esvazia=async()=>{ if(!NUVEM||enviando||!pend.length||!navigator.onLine) return; enviando=true;
    try{ while(pend.length){ await envia(pend[0]); pend.shift(); salvaPend(); } status("Nuvem · sincronizado"); }catch(e){ status(`Sem conexão · ${pend.length} alteração(ões) aguardando envio`); } enviando=false; };
  const telaLogin=()=>new Promise(res=>{ const monta=()=>{ const ov=document.createElement("div"); ov.id="nv-login"; ov.innerHTML=`<form class="nv-box" autocomplete="on"><img src="icon-192.png" alt="" width="56" height="56"><h2>Controle Processos Iveco</h2><p>Entre com o e-mail e a senha que você recebeu.</p><label>E-mail<input type="email" name="email" autocomplete="username" required></label><label>Senha<input type="password" name="senha" autocomplete="current-password" required></label><button type="submit">Entrar</button><div class="nv-msg" role="status"></div></form>`;
      document.body.appendChild(ov); const f=ov.querySelector("form"), m=ov.querySelector(".nv-msg"); f.email.focus();
      f.onsubmit=async e=>{ e.preventDefault(); m.textContent="Entrando…"; const {data,error}=await sb.auth.signInWithPassword({email:f.email.value.trim(),password:f.senha.value});
        if(error){ m.textContent=/Invalid login/i.test(error.message)?"E-mail ou senha incorretos.":"Não foi possível entrar: "+error.message; return; } ov.remove(); res(data.session); }; };
    document.readyState==="loading"?document.addEventListener("DOMContentLoaded",monta):monta(); });
  const baixaTudo=async()=>{ const novo=new Map(); for(let i=0;;i+=1000){ const {data,error}=await sb.from("docs").select("path,data").range(i,i+999); if(error) throw error; data.forEach(r=>novo.set(r.path,r.data)); if(data.length<1000) break; }
    pend.forEach(op=>op.del?novo.delete(op.path):novo.set(op.path,op.data)); mem=novo; await idbLimpa(); for(const [k,v] of mem) await idbPut(k,v); };
  const iniciaNuvem=async()=>{
    sb=window.supabase.createClient(CFG.url,CFG.chave,{auth:{persistSession:true,autoRefreshToken:true}});
    await idbTodos(); // mostra a última cópia enquanto conecta
    let {data:{session}}=await sb.auth.getSession();
    if(!session&&navigator.onLine) session=await telaLogin();
    eu=session&&session.user;
    if(!eu){ status("Sem internet · mostrando a última cópia salva"); editor=false; return; }
    try{ const {data}=await sb.from("editores").select("email").eq("email",eu.email).maybeSingle(); editor=!!data; }catch(e){ editor=false; }
    try{ await baixaTudo(); status(editor?"Nuvem · sincronizado":"Nuvem · somente leitura"); }catch(e){ status("Sem conexão · mostrando a última cópia salva"); }
    sb.channel("docs-rt").on("postgres_changes",{event:"*",schema:"public",table:"docs"},p=>{
      if(p.eventType==="DELETE"){ const k=p.old&&p.old.path; if(!k) return; mem.delete(k); idbPut(k,undefined); avisa(k); }
      else { const r=p.new; if(!r||!r.path) return; mem.set(r.path,r.data); idbPut(r.path,r.data); avisa(r.path); } }).subscribe();
    addEventListener("online",()=>{ esvazia(); baixaTudo().then(avisaTudo).catch(()=>{}); });
    addEventListener("offline",()=>status("Sem internet · usando a cópia salva"));
    setInterval(esvazia,30000); esvazia();
    const marca=()=>{ document.body.classList.toggle("nv-leitura",!editor); const bar=document.createElement("div"); bar.className="nv-user"; bar.innerHTML=`<span>👤 ${eu.email}${editor?"":" · <b>somente leitura</b>"}</span><button type="button">Sair</button>`;
      bar.querySelector("button").onclick=async()=>{ await sb.auth.signOut(); await idbLimpa(); try{ localStorage.removeItem(PK); }catch(e){} location.reload(); };
      const c=document.querySelector(".conn"); (c&&c.parentNode||document.body).appendChild(bar); };
    document.readyState==="loading"?document.addEventListener("DOMContentLoaded",marca):marca();
  };
  const iniciaLocal=async()=>{ await idbTodos(); if(!idb){ try{ const raw=localStorage.getItem(DBN); if(raw) Object.entries(JSON.parse(raw)).forEach(([k,v])=>mem.set(k,v)); }catch(e){} } };
  pronto=(NUVEM?iniciaNuvem():iniciaLocal()).catch(e=>{ console.error(e); status("Erro ao carregar a base: "+e.message); });

  const gravar=async(path,val)=>{
    if(NUVEM&&!editor){ aviso("Seu acesso é somente leitura."); throw Object.assign(new Error("Somente leitura"),{code:"somente_leitura"}); }
    if(val===undefined) mem.delete(path); else mem.set(path,val);
    await idbPut(path,val); avisa(path);
    if(!idb&&!NUVEM){ try{ const o={}; mem.forEach((v,k)=>o[k]=v); localStorage.setItem(DBN,JSON.stringify(o)); }catch(e){ throw Object.assign(new Error("Espaço cheio"),{code:"quota"}); } }
    if(NUVEM){ pend=pend.filter(o=>o.path!==path); pend.push(val===undefined?{path,del:true}:{path,data:val}); salvaPend(); esvazia(); } };
  const db={
    collection:col=>({ onSnapshot:f=>{ const un=addL(colL,col,f); pronto.then(()=>f(snapCol(col))); return un; }, get:async()=>{ await pronto; return snapCol(col); } }),
    doc:path=>({ set:async v=>{ await pronto; await gravar(path,clone(v)); },
      update:async v=>{ await pronto; await gravar(path,Object.assign({},mem.get(path)||{},clone(v))); },
      delete:async()=>{ await pronto; await gravar(path,undefined); },
      get:async()=>{ await pronto; return snapDoc(path); },
      onSnapshot:f=>{ const un=addL(docL,path,f); pronto.then(()=>f(snapDoc(path))); return un; } })
  };
  window.__modoNuvem=()=>({nuvem:NUVEM,editor,email:eu&&eu.email});
  window.__backupDados=async()=>{ await pronto; const o={}; mem.forEach((v,k)=>o[k]=v); return {app:"controle-iveco",versao:1,geradoEm:new Date().toISOString(),dados:o}; };
  window.__restaurarDados=async j=>{ await pronto; if(!j||j.app!=="controle-iveco"||!j.dados) throw new Error("Arquivo de backup inválido");
    if(NUVEM){ if(!editor) throw new Error("Seu acesso é somente leitura");
      const linhas=Object.entries(j.dados).map(([path,data])=>({path,data,updated_at:new Date().toISOString(),updated_by:eu.email}));
      for(let i=0;i<linhas.length;i+=200){ const {error}=await sb.from("docs").upsert(linhas.slice(i,i+200)); if(error) throw new Error(error.message); }
      const novos=new Set(Object.keys(j.dados)), velhos=[...mem.keys()].filter(k=>!novos.has(k));
      for(let i=0;i<velhos.length;i+=200){ const {error}=await sb.from("docs").delete().in("path",velhos.slice(i,i+200)); if(error) throw new Error(error.message); }
      return; }
    for(const k of [...mem.keys()]) await gravar(k,undefined); for(const [k,v] of Object.entries(j.dados)) await gravar(k,v); };
  const downloads={ save:async({filename,data,mimeType})=>{ const blob=data instanceof Blob?data:new Blob([data],{type:mimeType||"application/octet-stream"});
      try{ const f=new File([blob],filename,{type:blob.type}); if(/iPhone|iPad|iPod/i.test(navigator.userAgent)&&navigator.canShare&&navigator.canShare({files:[f]})){ await navigator.share({files:[f],title:filename}); return; } }catch(e){ if(e&&e.name==="AbortError") throw Object.assign(new Error("cancelado"),{code:"declined"}); }
      const url=URL.createObjectURL(blob), a=document.createElement("a"); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); },4000); } };
  window.APP_SERVICOS={ use:async n=>n==="db"?db:n==="downloads"?downloads:null };
})();
