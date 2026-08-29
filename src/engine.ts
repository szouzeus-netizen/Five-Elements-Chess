export const E = ['water','fire','metal','wood','earth'] as const;
export type Element = typeof E[number];
export type Side = 'black'|'white';
export type Level = 'small'|'big';
export type Piece = {kind:Level; side:Side; element:Element; bigId?:string; bigLoc?:number};
export type State = {
  turn:Side; move:number; start:Element;
  board:(Piece|null)[];
  hands:Record<Side,{small:Record<Element,number>;big:Record<Element,number>}>;
  supply:Record<Element,number>; bigSupply:Record<Element,number>;
  tracker:Record<Side,number>; next:Record<Side,Element>;
  refined:Record<Side,Record<Element,boolean>>;
  log:string[]; winner:Side|null; winReason:string|null;
};
export const CN:Record<Element,string>={water:'水',fire:'火',metal:'金',wood:'木',earth:'土'};
export const BIG:Record<Element,string>={water:'淼',fire:'焱',metal:'鑫',wood:'森',earth:'垚'};
// e beats this element
export const BEATS:Record<Element,Element>={fire:'metal',metal:'wood',wood:'earth',earth:'water',water:'fire'};
// this element is beaten by the value below
export const COUNTER:Record<Element,Element>={fire:'water',metal:'fire',wood:'metal',earth:'wood',water:'earth'};
// fixed replenishment sequences, starting after the chosen start element
export const WHITE_CYCLE:Element[]=['metal','water','wood','fire','earth'];
export const BLACK_CYCLE:Element[]=['metal','wood','earth','water','fire'];
export const S:number[][]=[
[641,146,552.5,292,729.5,292],[552.5,292,464,439,641,439],[729.5,292,641,439,818,439],[552.5,292,729.5,292,641,439],[464,439,375.5,587,552.5,587],[641,439,552.5,587,729.5,587],[818,439,729.5,587,906.5,587],[464,439,641,439,552.5,587],[641,439,818,439,729.5,587],[375.5,587,287,735,464,735],[552.5,587,464,735,641,735],[729.5,587,641,735,818,735],[906.5,587,818,735,995,735],[375.5,587,552.5,587,464,735],[552.5,587,729.5,587,641,735],[729.5,587,906.5,587,818,735],[287,735,198.5,883,375.5,883],[464,735,375.5,883,552.5,883],[641,735,552.5,883,729.5,883],[818,735,729.5,883,906.5,883],[995,735,906.5,883,1083.5,883],[287,735,464,735,375.5,883],[464,735,641,735,552.5,883],[641,735,818,735,729.5,883],[818,735,995,735,906.5,883]
];
export const BIG_LOCS:number[][]=[[1,2,3,4],[2,5,6,8],[3,6,7,9],[5,10,11,14],[6,8,9,15],[6,11,12,15],[7,12,13,16],[10,17,18,22],[11,14,15,23],[11,18,19,23],[12,15,16,24],[12,19,20,24],[13,20,21,25]];
export const BIG_POLYS:number[][][]=[
[[641,146],[552.5,292],[464,439],[818,439],[729.5,292]],
[[552.5,292],[464,439],[375.5,587],[729.5,587],[641,439]],
[[729.5,292],[641,439],[552.5,587],[906.5,587],[818,439]],
[[464,439],[287,735],[641,735]],
[[464,439],[641,735],[818,439]],
[[641,439],[464,735],[818,735]],
[[818,439],[641,735],[995,735]],
[[375.5,587],[198.5,883],[552.5,883]],
[[375.5,587],[552.5,883],[729.5,587]],
[[552.5,587],[375.5,883],[729.5,883]],
[[552.5,587],[729.5,883],[906.5,587]],
[[729.5,587],[552.5,883],[906.5,883]],
[[906.5,587],[729.5,883],[1083.5,883]]
];
export const ADJ:number[][]=[[4],[4,8],[4,9],[1,2,3],[8,14],[8,9,15],[9,16],[2,5,6],[3,6,7],[14,22],[14,15,23],[15,16,24],[16,25],[5,10,11],[6,11,12],[7,12,13],[22],[22,23],[23,24],[24,25],[25],[10,17,18],[11,18,19],[12,19,20],[13,20,21]];
const C=S.map((p,i)=>({x:(p[0]+p[2]+p[4])/3,y:(p[1]+p[3]+p[5])/3,id:i+1}));
const opp=(s:Side):Side=>s==='black'?'white':'black';
const pAt=(s:State,c:number)=>s.board[c-1];
function hand(){return {small:Object.fromEntries(E.map(e=>[e,0])) as Record<Element,number>,big:Object.fromEntries(E.map(e=>[e,0])) as Record<Element,number>};}
export function newState(start:Element='metal'):State{
 const h={black:hand(),white:hand()}; h.black.small[start]=1; h.white.small[start]=1;
 const supply=Object.fromEntries(E.map(e=>[e,5])) as Record<Element,number>; supply[start]-=2;
 const bi=Object.fromEntries(E.map(e=>[e,2])) as Record<Element,number>;
 const bidx=BLACK_CYCLE.indexOf(start), widx=WHITE_CYCLE.indexOf(start);
 return {turn:'black',move:1,start,board:Array(25).fill(null),hands:h,supply,bigSupply:bi,tracker:{black:bidx<0?0:bidx,white:widx<0?0:widx},next:{black:BLACK_CYCLE[(bidx+1+5)%5],white:WHITE_CYCLE[(widx+1+5)%5]},refined:{black:Object.fromEntries(E.map(e=>[e,false])) as Record<Element,boolean>,white:Object.fromEntries(E.map(e=>[e,false])) as Record<Element,boolean>},log:[],winner:null,winReason:null};
}
export function clone(s:State):State{return structuredClone(s);}
function cellsFreeForBig(s:State,loc:number){return BIG_LOCS[loc].map(c=>pAt(s,c));}
function bigIds(ps:(Piece|null)[]){return [...new Set(ps.filter(p=>p?.kind==='big').map(p=>p!.bigId))];}
function sideSmallCount(s:State,side:Side,e:Element){return s.hands[side].small[e]+s.board.filter(p=>p?.side===side&&p.kind==='small'&&p.element===e).length;}
function edgePairs(loc:number):number[][]{
 const cells=BIG_LOCS[loc];
 const edges:{a:number,b:number}[]=[];
 const key=(a:number,b:number)=>a<b?`${a},${b}`:`${b},${a}`;
 const coords=(cell:number)=>{const p=S[cell-1]; return [[p[0],p[1]],[p[2],p[3]],[p[4],p[5]]];};
 const map=new Map<string,{cell:number,a:number,b:number}>();
 for(const cell of cells){const q=coords(cell);for(let i=0;i<3;i++){const a=q[i],b=q[(i+1)%3];const k=`${Math.round(a[0]*2)},${Math.round(a[1]*2)}-${Math.round(b[0]*2)},${Math.round(b[1]*2)}`; if(map.has(k)||map.has(k.split('-').reverse().join('-'))) map.delete(map.has(k)?k:k.split('-').reverse().join('-')); else map.set(k,{cell,a:cell,b:cell});}}
 // Boundary edges of the union. Map each to an adjacent outside cell by scanning board adjacency.
 const out:number[][]=[];
 for(const c of cells){for(const n of ADJ[c-1]) if(!cells.includes(n)){out.push([c,n]);}}
 // group outside neighbors into 3 geometric sides using distance of their shared edge midpoint to BIG_POLYS boundary is unnecessary for the UI;
 // each side has exactly two outside neighbor cells, and the three groups can be derived by outside cell centroid direction from big centroid.
 const center=BIG_POLYS[loc].reduce((a,p)=>({x:a.x+p[0],y:a.y+p[1]}),{x:0,y:0}); center.x/=BIG_POLYS[loc].length;center.y/=BIG_POLYS[loc].length;
 const groups:number[][]=[[],[],[]];
 const poly=BIG_POLYS[loc];
 const sideLine=(a:number[],b:number[],p:{x:number,y:number})=>Math.abs((b[0]-a[0])*(p.y-a[1])-(b[1]-a[1])*(p.x-a[0]));
 // For each external neighbor, use which of the three outer triangle sides its shared edge belongs to: nearest polygon edge.
 const triEdges=[] as [number[],number[]][];
 // Convex hull of polygon vertices gives the big triangle corners.
 const pts=[...poly].sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
 const hull:number[][]=[]; const cross=(o:number[],a:number[],b:number[])=> (a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
 for(const p of pts){while(hull.length>=2&&cross(hull[hull.length-2],hull[hull.length-1],p)<=0)hull.pop();hull.push(p);} const lower=hull.slice(); const upper:number[][]=[]; for(const p of pts.slice().reverse()){while(upper.length>=2&&cross(upper[upper.length-2],upper[upper.length-1],p)<=0)upper.pop();upper.push(p);} upper.pop();lower.pop(); const h=lower.concat(upper);
 for(let i=0;i<3;i++)triEdges.push([h[i],h[(i+1)%3]]);
 for(const [c,n] of out){const cp=C[n-1];let best=0,bestd=Infinity;triEdges.forEach(([a,b],i)=>{const d=sideLine(a,b,cp)/Math.hypot(b[0]-a[0],b[1]-a[1]);if(d<bestd){bestd=d;best=i;}});groups[best].push(n);}
 return groups;
}
function emptyPlacementBlocked(s:State,side:Side,e:Element,c:number){
 const counter=COUNTER[e];
 for(const n of ADJ[c-1]){const p=pAt(s,n);if(p&&p.side===opp(side)&&p.kind==='small'&&p.element===counter)return true;}
 return false;
}
function legalSmall(s:State,side:Side,e:Element,c:number,allowHand=true){
 if(c<1||c>25)return'位置无效'; if(allowHand&&s.hands[side].small[e]<=0)return`没有小${CN[e]}`;
 const p=pAt(s,c), counter=BEATS[e];
 // Every small-piece placement, including a capture, must obey the same
 // counter-protection rule.  An enemy counter-piece adjacent to the target
 // makes the attempted placement illegal.
 if(emptyPlacementBlocked(s,side,e,c))return`不能落子：该位置被对方小${CN[COUNTER[e]]}封住`;
 if(!p)return null;
 if(p.kind==='big')return'小棋不能吃大棋';
 if(p.side===side)return'同级小棋不能吃自己的棋子';
 if(p.element!==counter)return`小${CN[e]}只能吃对方小${CN[counter]}`;
 return null;
}
function bigEdgeBlocked(s:State,side:Side,e:Element,loc:number){
 const counter=COUNTER[e], foe=opp(side);
 for(const group of edgePairs(loc)){
   if(group.length>=2 && group.every(c=>{const p=pAt(s,c);return !!p&&p.side===foe&&p.kind==='small'&&p.element===counter;})) return true;
 }
 return false;
}
function legalBig(s:State,side:Side,e:Element,loc:number,fromSupply=true){
 if(loc<0||loc>=BIG_LOCS.length)return'大三角形位置无效';
 if(fromSupply && s.bigSupply[e]<=0)return`大${BIG[e]}供应已用尽`;
 if(!fromSupply && s.hands[side].big[e]<=0)return`手牌没有大${BIG[e]}`;
 const cells=BIG_LOCS[loc], ps=cells.map(c=>pAt(s,c)), ids=bigIds(ps);
 if(ids.length>1)return'不能部分覆盖多个大棋';
 if(ids.length===1){
   const target=ps.find(p=>p?.kind==='big')!;
   if(ps.some(p=>!p||p.kind!=='big'||p.bigId!==target.bigId))return'大棋必须完整替代另一个大棋';
   if(target.side===side)return'大棋不能吃自己的大棋';
   if(target.element!==BEATS[e])return`大${BIG[e]}只能吃被其克制的大${BIG[target.element]}`;
 }
 const counter=COUNTER[e],foe=opp(side);
 // A big can eat own smalls and any enemy small except enemy counter-small.
 for(const p of ps) if(p?.kind==='small'&&p.side===foe&&p.element===counter)return`不能吃对方小${CN[counter]}：它克制大${BIG[e]}`;
 if(bigEdgeBlocked(s,side,e,loc))return`不能落子：大${BIG[e]}有一条完整边被对方小${CN[counter]}封住`;
 return null;
}
function takeThree(s:State,side:Side,e:Element,sources?:Array<number|'hand'>){
 if(sources){
   if(sources.length!==3)return false;
   let handNeed=0; const boardSources:number[]=[];
   for(const src of sources){
     if(src==='hand'){handNeed++;continue;}
     const c=Number(src);
     if(boardSources.includes(c))return false;
     const p=pAt(s,c);
     if(!p||p.side!==side||p.kind!=='small'||p.element!==e)return false;
     boardSources.push(c);
   }
   if(handNeed>s.hands[side].small[e])return false;
   for(const c of boardSources)s.board[c-1]=null;
   s.hands[side].small[e]-=handNeed; s.supply[e]+=3; return true;
 }
 let need=3; for(let c=1;c<=25&&need;c++){const p=pAt(s,c);if(p?.side===side&&p.kind==='small'&&p.element===e){s.board[c-1]=null;need--;}}
 const h=Math.min(need,s.hands[side].small[e]);s.hands[side].small[e]-=h;need-=h; if(need)return false;s.supply[e]+=3;return true;
}

function placeBig(s:State,side:Side,e:Element,loc:number,fromSupply:boolean){
 const cells=BIG_LOCS[loc], old=cells.map(c=>pAt(s,c));
 const id=`${s.move}-${side}-${e}-${Math.random().toString(36).slice(2,8)}`;
 const capturedSmall:Element[]=[];
 let captured:Piece|null=null;
 // A big-piece placement resolves its captures before its ability is checked.
 // Every small piece removed by the big piece (enemy OR own) goes to the
 // current player's small-piece hand, so it is immediately available to an
 // ability that follows this placement.
 for(const c of cells){
   const p=pAt(s,c);
   if(p?.kind==='small'){
     capturedSmall.push(p.element);
     s.hands[side].small[p.element]++;
   }
   if(p?.kind==='big')captured=p;
 }
 if(captured){s.hands[side].big[captured.element]++;}
 if(fromSupply){s.bigSupply[e]--;}else{s.hands[side].big[e]--;}
 for(const c of cells)s.board[c-1]={kind:'big',side,element:e,bigId:id,bigLoc:loc};
 return {old,captured,capturedSmall};
}

export type AbilityAction={kind:'none'}|{kind:'water';moves:{from:number;to:number}[]}|{kind:'wood';places:{element:Element;cell:number}[]}|{kind:'fire';remove:number[]}|{kind:'earth';flip:number[]}|{kind:'metal';element:Element;cell:number};
function adjacentToBig(loc:number){const cells=new Set(BIG_LOCS[loc]), out=new Set<number>();for(const c of cells)for(const n of ADJ[c-1])if(!cells.has(n))out.add(n);return [...out];}
function validateMovedPlacement(s:State,p:Piece,to:number){if(p.kind!=='small')return'只能移动小棋';if(to<1||to>25||pAt(s,to))return'目标必须是空格';if(emptyPlacementBlocked(s,p.side,p.element,to))return`目标位置被对方小${CN[COUNTER[p.element]]}封住`;return null;}
function applyAbility(s:State,side:Side,e:Element,loc:number,a:AbilityAction){
 // IMPORTANT: placeBig() has already resolved captures and returned every
 // captured small piece to this player's hand. Abilities therefore see the
 // post-capture hand, exactly as the rules require.
 const adj=new Set(adjacentToBig(loc));
 if(a.kind==='none')return null;
 if(e==='water'&&a.kind==='water'){
   if(a.moves.length>2)return'淼最多移动2个相邻小棋'; const seen=new Set<number>(); const moving:{from:number;to:number;p:Piece}[]=[];
   for(const m of a.moves){if(seen.has(m.from))return'淼不能重复选择同一棋子';seen.add(m.from);if(!adj.has(m.from))return'淼只能移动相邻小棋';const p=pAt(s,m.from);if(!p||p.kind!=='small')return'淼只能移动小棋';const er=validateMovedPlacement(s,p,m.to);if(er)return`淼：${er}`;moving.push({from:m.from,to:m.to,p});}
   const targets=new Set(moving.map(x=>x.to));if(targets.size!==moving.length)return'淼的目标位置不能重复';
   for(const x of moving)s.board[x.from-1]=null; for(const x of moving)s.board[x.to-1]=x.p; return null;
 }
 if(e==='wood'&&a.kind==='wood'){
   if(a.places.length>2)return'森最多放置2个小棋'; const used=new Set<number>();
   for(const x of a.places){if(used.has(x.cell))return'森不能重复选择位置';used.add(x.cell);if(!adj.has(x.cell))return'森只能放在大棋相邻空格';if(pAt(s,x.cell))return'森只能放在空格';if(s.hands[side].small[x.element]<=0)return`手牌没有小${CN[x.element]}`;const er=emptyPlacementBlocked(s,side,x.element,x.cell);if(er)return`森：该位置被对方小${CN[COUNTER[x.element]]}封住`;}
   for(const x of a.places){s.hands[side].small[x.element]--;s.board[x.cell-1]={kind:'small',side,element:x.element};} return null;
 }
 if(e==='fire'&&a.kind==='fire'){
   if(a.remove.length>2)return'焱最多焚烧2个相邻小棋';const seen=new Set<number>();for(const c of a.remove){if(seen.has(c))return'焱不能重复选择';seen.add(c);if(!adj.has(c))return'焱只能选择相邻小棋';const p=pAt(s,c);if(!p||p.kind!=='small')return'焱只能焚烧小棋';}
   for(const c of a.remove){const p=pAt(s,c)!;s.supply[p.element]++;s.board[c-1]=null;}return null;
 }
 if(e==='earth'&&a.kind==='earth'){
   if(a.flip.length>2)return'垚最多翻转2个相邻小棋';const seen=new Set<number>();for(const c of a.flip){if(seen.has(c))return'垚不能重复选择';seen.add(c);if(!adj.has(c))return'垚只能选择相邻小棋';const p=pAt(s,c);if(!p||p.kind!=='small')return'垚只能翻转小棋';if(p.side===side)return'垚只能翻转对方的小棋';}
   for(const c of a.flip)s.board[c-1]!.side=side;return null;
 }
 if(e==='metal'&&a.kind==='metal'){
   if(s.supply[a.element]<=0)return`供应区没有小${CN[a.element]}`;
   const c=a.cell;
   // 鑫 places a normal small piece from supply. Its extra action is not a
   // rules bypass: validate it with the exact same small-piece placement
   // rules used by an ordinary small move, including counter-protection.
   const er=legalSmall(s,side,a.element,c,false);
   if(er)return`鑫：${er}`;
   const p=pAt(s,c);
   if(p?.side===opp(side)&&p.element===BEATS[a.element])s.hands[side].small[p.element]++;
   s.supply[a.element]--;
   s.board[c-1]={kind:'small',side,element:a.element};
   return null;
 }
 return'能力参数错误';
}
function refillAndEnd(s:State,desc:string){
 const side=s.turn; const cycle=side==='black'?BLACK_CYCLE:WHITE_CYCLE; let idx=cycle.indexOf(s.next[side]); if(idx<0)idx=0; const e=cycle[idx]; s.tracker[side]=idx; s.next[side]=cycle[(idx+1)%5];
 if(s.supply[e]>0){s.supply[e]--;s.hands[side].small[e]++;}
 s.log.unshift(`${s.move}. ${side==='black'?'黑':'白'} ${desc}；追踪→${CN[e]}；${s.supply[e] >=0 && s.supply[e]===0?'该供应已空':'补充小'+CN[e]}`);
 s.move++;s.turn=opp(side);checkWin(s);
}
function boardCount(s:State,side:Side){return s.board.filter(p=>p?.side===side).length;}
// 五行大成判断的是“当前控制权”，不是历史上是否曾经炼化过。
// 一方只要当前至少控制一个淼、森、焱、垚、鑫即可；控制方式包括：
// 1) 该大棋在自己手牌中；或 2) 该大棋正在自己控制的棋盘位置上。
// 如果大棋后来被对方吃掉，它进入对方手牌，原玩家立即失去该大棋的控制权。
function controlsAllFiveBigs(s:State,side:Side){
 for(const e of E){
   const inHand=s.hands[side].big[e]>0;
   const onBoard=s.board.some(p=>p?.kind==='big'&&p.side===side&&p.element===e);
   if(!inHand&&!onBoard)return false;
 }
 return true;
}
function checkWin(s:State){
 // 兼容旧版本已经持久化的错误“五行大成”状态：如果只是历史炼化记录
 // 导致旧版本判胜，而当前已经不再同时控制五种大棋，则撤销这个旧胜负结果。
 if(s.winner&&s.winReason==='五行大成'&&!controlsAllFiveBigs(s,s.winner)){s.winner=null;s.winReason=null;}
 if(s.winner)return;
 // 五行大成：当前同时控制五种上级大棋；不追认已经失去的历史控制权。
 for(const side of ['black','white'] as Side[])if(controlsAllFiveBigs(s,side)){s.winner=side;s.winReason='五行大成';return;}
 if(s.board.every(Boolean)){const b=boardCount(s,'black'),w=boardCount(s,'white');s.winner=b===w?null:(b>w?'black':'white');if(s.winner)s.winReason='棋盘占领';if(s.winner)return;}
 if(!hasLegalMove(s,s.turn)){s.winner=opp(s.turn);s.winReason='逼停';}
}
export function hasLegalMove(s:State,side:Side){
 for(const e of E)if(s.hands[side].small[e]>0)for(let c=1;c<=25;c++)if(!legalSmall(s,side,e,c))return true;
 for(const e of E){
   if(s.bigSupply[e]>0&&sideSmallCount(s,side,e)>=3)for(let l=0;l<BIG_LOCS.length;l++)if(!legalBig(s,side,e,l,true))return true;
   if(s.hands[side].big[e]>0)for(let l=0;l<BIG_LOCS.length;l++)if(!legalBig(s,side,e,l,false))return true;
 }
 return false;
}
export function playSmall(s0:State,c:number,e:Element){
 const s=clone(s0),side=s.turn;if(s.winner)return{ok:false,reason:'本局已结束',state:s0};const er=legalSmall(s,side,e,c);if(er)return{ok:false,reason:er,state:s0};const p=pAt(s,c);if(p?.kind==='small'){s.hands[side].small[p.element]++;}s.hands[side].small[e]--;s.board[c-1]={kind:'small',side,element:e};refillAndEnd(s,`放置小${CN[e]}于 ${c}`);return{ok:true,state:s};
}
export function refineBig(s0:State,e:Element,loc:number,ability:AbilityAction={kind:'none'},sources?:Array<number|'hand'>){
 const s=clone(s0),side=s.turn;if(s.winner)return{ok:false,reason:'本局已结束',state:s0};
 if(s.bigSupply[e]<=0)return{ok:false,reason:`大${BIG[e]}供应已用尽`};
 if(sideSmallCount(s,side,e)<3)return{ok:false,reason:`没有3个小${CN[e]}可炼化`};
 const er=legalBig(s,side,e,loc,true);if(er)return{ok:false,reason:er};
 if(!takeThree(s,side,e,sources))return{ok:false,reason:'炼化素材选择无效：必须选择3个自己控制的小'+CN[e],state:s0};
 const result=placeBig(s,side,e,loc,true);
 s.refined[side][e]=true;
 const ae=applyAbility(s,side,e,loc,ability);if(ae)return{ok:false,reason:ae,state:s0};
 refillAndEnd(s,`炼化大${BIG[e]}于大三角形 ${loc+1}${ability.kind==='none'?'':'并发动'+BIG[e]}`);return{ok:true,state:s};
}

export function playBigFromHand(s0:State,e:Element,loc:number,ability:AbilityAction={kind:'none'}){
 const s=clone(s0),side=s.turn;if(s.winner)return{ok:false,reason:'本局已结束',state:s0};
 if(s.hands[side].big[e]<=0)return{ok:false,reason:`手牌没有大${BIG[e]}`};
 const er=legalBig(s,side,e,loc,false);if(er)return{ok:false,reason:er};
 placeBig(s,side,e,loc,false);
 const ae=applyAbility(s,side,e,loc,ability);if(ae)return{ok:false,reason:ae,state:s0};
 refillAndEnd(s,`打出手牌大${BIG[e]}于大三角形 ${loc+1}${ability.kind==='none'?'':'并发动'+BIG[e]}`);return{ok:true,state:s};
}

