// Aplicativo: instalação, funcionamento offline e backup dos dados
(function(){
  if("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
  const bar=document.getElementById("app-bar"), inst=document.getElementById("app-inst"), txt=document.getElementById("app-txt"); let ev=null;
  const instalado=matchMedia("(display-mode: standalone)").matches||navigator.standalone===true; let fora=false; try{ fora=localStorage.getItem("iveco.app-x")==="1"; }catch(e){}
  addEventListener("beforeinstallprompt",e=>{ e.preventDefault(); ev=e; if(!instalado&&!fora) bar.hidden=false; });
  inst.onclick=()=>{ if(ev){ ev.prompt(); ev.userChoice.finally(()=>{ ev=null; bar.hidden=true; }); } };
  document.getElementById("app-x").onclick=()=>{ bar.hidden=true; try{ localStorage.setItem("iveco.app-x","1"); }catch(e){} };
  addEventListener("appinstalled",()=>bar.hidden=true);
  if(!instalado&&!fora&&/iPhone|iPad|iPod/i.test(navigator.userAgent)){ txt.textContent="Para instalar no iPhone: toque em Compartilhar e depois em “Adicionar à Tela de Início”."; inst.hidden=true; bar.hidden=false; }
  const conn=document.getElementById("conn-txt"); const net=()=>{ let t=document.getElementById("off-tag"); if(!navigator.onLine){ if(!t&&conn){ t=document.createElement("span"); t.id="off-tag"; t.className="off-tag"; t.textContent="Sem internet"; conn.parentNode.appendChild(t); } } else if(t) t.remove(); };
  addEventListener("online",net); addEventListener("offline",net); net();
  // Backup
  const b=document.getElementById("b-backup"); if(b) b.onclick=()=>{
    const ov=document.createElement("div"); ov.className="bk-ov"; ov.innerHTML=`<div class="bk-box"><h3>Backup dos dados</h3>
      <p style="margin:0">Os dados (programação, follow, alertas, cidades) ficam guardados <b>neste aparelho</b>. Salve um backup para passar para outro computador ou celular, ou para não perder nada.</p>
      <button type="button" class="pri" id="bk-save">Salvar backup (.json)</button>
      <label class="bt" id="bk-rest">Restaurar backup de um arquivo<input type="file" id="bk-file" accept=".json,application/json" hidden></label>
      <div class="bk-msg" id="bk-msg"></div><button type="button" id="bk-close">Fechar</button></div>`;
    document.body.appendChild(ov); const msg=ov.querySelector("#bk-msg"); const md=window.__modoNuvem&&window.__modoNuvem(); if(md&&md.nuvem&&!md.editor) ov.querySelector("#bk-rest").hidden=true; if(md&&md.nuvem) ov.querySelector("p").innerHTML="Os dados ficam na <b>nuvem</b> e aparecem para todos os usuários. Use o backup para guardar uma cópia de segurança"+(md.editor?" ou para carregar os dados pela primeira vez (Restaurar).":"."); ov.onclick=e=>{ if(e.target===ov) ov.remove(); }; ov.querySelector("#bk-close").onclick=()=>ov.remove();
    ov.querySelector("#bk-save").onclick=async()=>{ const j=await window.__backupDados(); const d=new Date(), p=n=>String(n).padStart(2,"0"); const nome=`backup-controle-iveco-${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`;
      const dl=await window.APP_SERVICOS.use("downloads"); try{ await dl.save({filename:nome,data:JSON.stringify(j),mimeType:"application/json"}); msg.textContent="Backup salvo: "+nome+" ("+Object.keys(j.dados).length+" registros)."; }catch(e){ msg.textContent="Backup cancelado."; } };
    ov.querySelector("#bk-file").onchange=async e=>{ const f=e.target.files[0]; if(!f) return; if(!confirm((window.__modoNuvem&&window.__modoNuvem().nuvem)?"Restaurar este backup vai SUBSTITUIR os dados da NUVEM para todos os usuários. Continuar?":"Restaurar este backup vai SUBSTITUIR os dados atuais deste aparelho. Continuar?")) return;
      try{ const j=JSON.parse(await f.text()); await window.__restaurarDados(j); msg.textContent="Backup restaurado. Recarregando…"; setTimeout(()=>location.reload(),800); }catch(err){ msg.textContent="Não foi possível restaurar: "+err.message; } };
  };
})();
