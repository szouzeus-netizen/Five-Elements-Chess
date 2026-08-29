import React,{useEffect,useMemo,useState} from "react";
import {createRoot} from "react-dom/client";
import {useAgent} from "agents/react";
import type {State} from "./game";

declare global{interface Window{HOST?:string;openai?:{sendFollowUpMessage?:(a:{prompt:string})=>void}}}
const ELEMENTS=[["water","水"],["fire","火"],["metal","金"],["wood","木"],["earth","土"]] as const;
const LABELS={water:"水",fire:"火",metal:"金",wood:"木",earth:"土"};
const ROWS=[1,3,5,7,9];

function App(){
  const [gameId]=useState(()=>crypto.randomUUID());
  const [state,setState]=useState<State|null>(null);
  const [element,setElement]=useState<State["board"][number]["element"]>("metal");
  const [level,setLevel]=useState<"small"|"large">("small");
  const [pending,setPending]=useState<{x:number;y:number}|null>(null);
  const host=window.HOST??"http://localhost:5173/";
  const {stub}=useAgent<State>({host,name:gameId,agent:"wuxingGame",onStateUpdate:setState});
  useEffect(()=>{stub.getState().then(setState).catch(console.error)},[stub]);

  const cells=useMemo(()=>ROWS.flatMap((n,y)=>Array.from({length:n},(_,x)=>({x,y}))),[]);
  const pieceAt=(x:number,y:number)=>state?.board.find(p=>p.x===x&&p.y===y);

  async function confirm(){
    if(!pending)return;
    const r=await stub.place({owner:state?.turn??"black",level,element,x:pending.x,y:pending.y});
    if(r?.ok)setPending(null);
  }

  return <div style={{fontFamily:"system-ui,sans-serif",maxWidth:1100,margin:"0 auto",padding:18}}>
    <h1>五行阵</h1>
    <div style={{color:"#6b7280",marginBottom:16}}>对话内交互棋盘原型 · 当前回合：{state?.turn==="black"?"黑方":"白方"}</div>
    <div style={{display:"grid",gridTemplateColumns:"minmax(520px,1fr) 320px",gap:20}}>
      <section style={{background:"#fff",border:"1px solid #ddd",borderRadius:18,padding:18}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
          {ROWS.map((count,y)=><div key={y} style={{display:"flex",gap:5}}>
            {Array.from({length:count},(_,x)=>{
              const p=pieceAt(x,y), sel=pending?.x===x&&pending?.y===y;
              return <button key={x} title={`${String.fromCharCode(65+y)}${x+1}`} onClick={()=>setPending({x,y})}
                style={{width:64,height:56,clipPath:y%2===0?"polygon(50% 0,100% 100%,0 100%)":"polygon(0 0,100% 0,50% 100%)",
                border:sel?"3px solid #2563eb":"1px solid #777",background:p?(p.owner==="black"?"#111827":"#fff"):"#fafafa",
                color:p?(p.owner==="black"?"#fff":"#111827"):"#9ca3af",fontWeight:700,cursor:"pointer"}}>
                {p?LABELS[p.element]:`${String.fromCharCode(65+y)}${x+1}`}
              </button>
            })}
          </div>)}
        </div>
      </section>
      <aside style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{background:"#fff",border:"1px solid #ddd",borderRadius:18,padding:16}}>
          <h3>选择落子</h3>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {ELEMENTS.map(([k,l])=><button key={k} onClick={()=>setElement(k)} style={{padding:"8px 12px",borderRadius:10,border:element===k?"2px solid #2563eb":"1px solid #ccc",background:"#fff"}}>{l}</button>)}
          </div>
          <div style={{marginTop:10,display:"flex",gap:6}}>
            <button onClick={()=>setLevel("small")} style={{padding:8}}>小棋</button>
            <button onClick={()=>setLevel("large")} style={{padding:8}}>大棋</button>
          </div>
          <p>选择：{level==="small"?"小":"大"}{LABELS[element]}</p>
          <p>位置：{pending?`${String.fromCharCode(65+pending.y)}${pending.x+1}`:"未选择"}</p>
          <button onClick={confirm} disabled={!pending} style={{width:"100%",padding:11,border:0,borderRadius:10,background:"#111827",color:"#fff",opacity:pending?1:.45}}>确定落子</button>
        </div>
        <div style={{background:"#fff",border:"1px solid #ddd",borderRadius:18,padding:16}}>
          <h3>公开信息</h3>
          <div>黑方手牌：{JSON.stringify(state?.blackHand??{})}</div>
          <div>白方手牌：{JSON.stringify(state?.whiteHand??{})}</div>
          <div>黑方下一张：{state?.nextBlack??"-"}</div>
          <div>白方下一张：{state?.nextWhite??"-"}</div>
          <div>供应堆：{JSON.stringify(state?.supply??{})}</div>
          <div style={{marginTop:10}}>最近行动：{state?.history?.at(-1)??"无"}</div>
        </div>
        <button onClick={()=>stub.reset()} style={{padding:10,borderRadius:10,border:"1px solid #bbb",background:"#fff"}}>重置棋局</button>
      </aside>
    </div>
  </div>;
}
createRoot(document.getElementById("root")!).render(<App/>);
