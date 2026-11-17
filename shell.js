// Torre Iveco · comportamento do visual de aplicativo (menu, título da página, tema, menu "mais")
(function(){
  const $=s=>document.querySelector(s), root=document.documentElement, body=document.body;
  const grava=(k,v)=>{ try{ v==null?localStorage.removeItem(k):localStorage.setItem(k,v); }catch(e){} };
  const le=k=>{ try{ return localStorage.getItem(k); }catch(e){ return null; } };

  /* título da página conforme a aba */
  const GRUPO={tab:"Operação",fc:"Operação",crit:"Operação",comp:"Operação",bi:"Painéis",anim:"Painéis",tl:"Painéis",ind:"Painéis",prog:"Cadastros",fora:"Cadastros",rod:"Cadastros"};
  function titulo(){
    const b=$('.sb-nav .tab[aria-selected="true"]'); if(!b) return;
    const t=b.querySelector(".t").textContent; $("#sh-titulo").textContent=t; $("#sh-grupo").textContent=GRUPO[b.dataset.tab]||"";
    document.title=t+" · Torre Iveco";
  }
  new MutationObserver(titulo).observe($(".sb-nav"),{subtree:true,attributes:true,attributeFilter:["aria-selected"]});
  titulo();

  /* menu lateral: abrir/fechar no celular, recolher no computador */
  const abre=()=>{ body.classList.add("sb-aberto"); $("#sb-scrim").hidden=false; };
  const fecha=()=>{ body.classList.remove("sb-aberto"); $("#sb-scrim").hidden=true; };
  $("#sh-abre").onclick=abre; $("#sh-bn-mais").onclick=abre; $("#sh-fecha").onclick=fecha; $("#sb-scrim").onclick=fecha;
  document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{ fecha(); if(b.closest(".bn")||b.closest(".sb-nav")) window.scrollTo({top:0}); }));
  $("#sh-min").onclick=()=>{ const m=root.classList.toggle("sb-min"); grava("iveco.menu",m?"min":null); setTimeout(()=>dispatchEvent(new Event("resize")),250); };

  /* tema claro / escuro */
  const escuro=()=>root.dataset.theme? root.dataset.theme==="dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  const iconeTema=()=>{ $("#sh-tema use").setAttribute("href",escuro()?"#i-sun":"#i-moon"); const m=$('meta[name="theme-color"]'); if(m) m.content=escuro()?"#0A1117":"#0F1B24"; };
  $("#sh-tema").onclick=()=>{ const novo=escuro()?"light":"dark"; root.dataset.theme=novo; grava("iveco.tema",novo); iconeTema(); setTimeout(()=>dispatchEvent(new Event("resize")),50); };
  iconeTema();

  /* menu "mais opções" */
  const pop=$("#sh-pop"), mais=$("#sh-mais");
  const fechaPop=()=>{ pop.hidden=true; mais.setAttribute("aria-expanded","false"); };
  mais.onclick=e=>{ e.stopPropagation(); pop.hidden=!pop.hidden; mais.setAttribute("aria-expanded",String(!pop.hidden)); };
  document.addEventListener("click",e=>{ if(!pop.hidden&&!e.target.closest(".mais")) fechaPop(); });
  pop.addEventListener("click",e=>{ if(e.target.closest("button")) setTimeout(fechaPop,0); });
  document.addEventListener("keydown",e=>{ if(e.key==="Escape"){ fechaPop(); fecha(); } });
  $("#sh-resumo").onclick=()=>$("#b-resumo").click();

  /* mostrar/ocultar o resumo do dia (indicadores + análise) */
  const insTxt=()=>{ $("#sh-ins span").textContent=body.classList.contains("sem-resumo")?"Mostrar resumo do dia":"Ocultar resumo do dia"; };
  if(le("iveco.resumo")==="off") body.classList.add("sem-resumo");
  $("#sh-ins").onclick=()=>{ const off=body.classList.toggle("sem-resumo"); grava("iveco.resumo",off?"off":null); insTxt(); };
  insTxt();

  /* instalar como aplicativo (usa o mesmo convite da barra de instalação) */
  const inst=$("#sh-inst");
  addEventListener("beforeinstallprompt",()=>{ inst.hidden=false; });
  addEventListener("appinstalled",()=>{ inst.hidden=true; });
  inst.onclick=()=>{ const b=$("#app-inst"); b&&b.click(); };
})();
