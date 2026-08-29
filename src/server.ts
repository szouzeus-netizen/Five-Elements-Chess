import { DurableObject } from 'cloudflare:workers';
import { newState, playSmall, refineBig, playBigFromHand, type Element, type State } from './engine';

type Env={WUXING:DurableObjectNamespace;ASSETS:Fetcher};

export class WuxingGame extends DurableObject<Env>{
  state:State;
  constructor(ctx:DurableObjectState,env:Env){super(ctx,env);this.state=newState('metal');}
  async load(){const v=await this.ctx.storage.get<State>('state');if(v)this.state=v;}
  async fetch(req:Request){
    await this.load();
    const url=new URL(req.url);
    if(req.method==='GET')return Response.json(this.state);
    if(req.method!=='POST')return new Response('Method Not Allowed',{status:405});
    const body:any=await req.json();
    let r:any;
    if(body.action==='reset'){this.state=newState(body.start||'metal'); await this.ctx.storage.delete('past'); await this.ctx.storage.put('state',this.state); return Response.json({ok:true,state:this.state});}
    else if(body.action==='undo'){const past=(await this.ctx.storage.get<State[]>('past'))||[]; const prev=past.pop(); if(!prev)return Response.json({ok:false,reason:'没有可撤回的行动',state:this.state}); this.state=prev; await this.ctx.storage.put('past',past); await this.ctx.storage.put('state',this.state); return Response.json({ok:true,state:this.state});}
    else if(body.action==='small')r=playSmall(this.state,Number(body.cell),body.element as Element);
    else if(body.action==='big')r=refineBig(this.state,body.element as Element,Number(body.loc)-1,body.ability||{kind:'none'});
    else if(body.action==='bigHand')r=playBigFromHand(this.state,body.element as Element,Number(body.loc)-1,body.ability||{kind:'none'});
    else return Response.json({ok:false,reason:'unknown action'},{status:400});
    if(r){if(!r.ok)return Response.json(r); const past=(await this.ctx.storage.get<State[]>('past'))||[]; past.push(this.state); if(past.length>50)past.shift(); await this.ctx.storage.put('past',past); this.state=r.state;}
    await this.ctx.storage.put('state',this.state);
    return Response.json({ok:true,state:this.state});
  }
}

export class WuxingRoom extends DurableObject<Env>{ async fetch(){ return new Response('Legacy migration placeholder',{status:410}); } }

export default {async fetch(req:Request,env:Env){
  const url=new URL(req.url);
  if(url.pathname.startsWith('/api/room/')){
    const room=decodeURIComponent(url.pathname.slice('/api/room/'.length)).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,64)||'main';
    const id=env.WUXING.idFromName(room); return env.WUXING.get(id).fetch(req);
  }
  return env.ASSETS.fetch(req);
}};
