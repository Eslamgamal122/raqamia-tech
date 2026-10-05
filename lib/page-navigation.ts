'use client';
import {useEffect,useState} from 'react';
type Navigation={page:string;project:string|null};
export function readNavigation(hash:string,area:string,pages:readonly string[],fallback:string):Navigation{
 const params=new URLSearchParams(hash.replace(/^#/,''));
 if(params.get('area')!==area)return{page:fallback,project:null};
 const page=params.get('page')||fallback;
 if(!pages.includes(page))return{page:fallback,project:null};
 const project=params.get('project');
 return{page,project:page==='projects'&&project&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(project)?project:null};
}
export function navigationHash(area:string,value:Navigation){
 const params=new URLSearchParams({area,page:value.page});
 if(value.page==='projects'&&value.project)params.set('project',value.project);
 return '#'+params.toString();
}
export function usePageNavigation(area:string,pages:readonly string[],fallback:string,enabled=true){
 const [value,setValue]=useState<Navigation>({page:fallback,project:null}),[ready,setReady]=useState(false);
 useEffect(()=>{
  if(!enabled){setReady(false);return;}
  const restore=()=>setValue(readNavigation(window.location.hash,area,pages,fallback));
  restore();setReady(true);window.addEventListener('hashchange',restore);
  return()=>window.removeEventListener('hashchange',restore);
 },[enabled,area,pages,fallback]);
 useEffect(()=>{if(!enabled||!ready)return;const hash=navigationHash(area,value);if(window.location.hash!==hash)window.history.replaceState(window.history.state,'',window.location.pathname+window.location.search+hash);},[value,enabled,ready,area]);
 return{page:value.page,selected:value.project,setPage:(page:string)=>setValue(previous=>({...previous,page:pages.includes(page)?page:fallback})),setSelected:(project:string|null)=>setValue(previous=>({...previous,project}))};
}
