export const E = ['water','fire','metal','wood','earth'] as const;
export type Element = typeof E[number];
export type Side = 'black'|'white';
export type Level = 'small'|'big';
export type Piece = { kind:Level; side:Side; element:Element; bigId?:string; bigLoc?:number };
export type State = {
  turn: Side; move:number; start:Element;
  board:(Piece|null)[];
  hands:Record<Side,{small:Record<Element,number>;big:Record<Element,number>}>;
  supply:Record<Element,number>; bigSupply:Record<Element,number>;
  tracker:Record<Side,number>; next:Record<Side,Element>;
  refined:Record<Side,Record<Element,boolean>>;
  log:string[]; winner:Side|null; winReason:string|null;
};
export const CN:Record<Element,string>={water:'水',fire:'火',metal:'金',wood:'木',earth:'土'};
export const BIG:Record<Element,string>={water:'淼',fire:'焱',metal:'鑫',wood:'森',earth:'垚'};
export const BEATS:Record<Element,Element>={fire:'metal',metal:'wood',wood:'earth',earth:'water',water:'fire'};
export const COUNTER:Record<Element,Element>={fire:'water',metal:'fire',wood:'metal',earth:'wood',water:'earth'};
export const WHITE_CYCLE:Element[]=['metal','water','wood','fire','earth'];
export const BLACK_CYCLE:Element[]=['metal','wood','earth','water','fire'];
export const S=[
[641,146,552.5,292,729.5,292],[552.5,292,464,439,641,439],[729.5,292,641,439,818,439],[552.5,292,729.5,292,641,439],[464,439,375.5,587,552.5,587],[641,439,552.5,587,729.5,587],[818,439,729.5,587,906.5,587],[464,439,641,439,552.5,587],[641,439,818,439,729.5,587],[375.5,587,287,735,464,735],[552.5,587,464,735,641,735],[729.5,587,641,735,818,735],[906.5,587,818,735,995,735],[375.5,587,552.5,587,464,735],[552.5,587,729.5,587,641,735],[729.5,587,906.5,587,818,735],[287,735,198.5,883,375.5,883],[464,735,375.5,883,552.5,883],[641,735,552.5,883,729.5,883],[818,735,729.5,883,906.5,883],[995,735,906.5,883,1083.5,883],[287,735,464,735,375.5,883],[464,735,641,735,552.5,883],[641,735,818,735,729.5,883],[818,735,995,735,906.5,883]
];
export const BIG_LOCS:number[][]=[[1,2,3,4],[2,5,6,8],[3,6,7,9],[5,10,11,14],[6,8,9,15],[6,11,12,15],[7,12,13,16],[10,17,18,22],[11,14,15,23],[11,18,19,23],[12,15,16,24],[12,19,20,24],[13,20,21,25]];
export const BIG_POLYS=[[641,146,552.5,292,464,439,818,439,729.5,292],[552.5,292,464,439,375.5,587,729.5,587,641,439],[729.5,292,641,439,552.5,587,906.5,587,818,439],[464,439,287,735,641,735],[464,439,641,735,818,439],[641,439,464,735,818,735],[818,439,641,735,995,735],[375.5,587,198.5,883,552.5,883],[375.5,587,552.5,883,729.5,587],[552.5,587,375.5,883,729.5,883],[552.5,587,729.5,883,906.5,587],[729.5,587,552.5,883,906.5,883],[906.5,587,729.5,883,1083.5,883]];
const C=S.map((p,i)=>({x:(p[0]+p[2]+p[4])/3,y:(p[1]+p[3]+p[5])/3,id:i+1}));
export const ADJ:number[][]=[[4],[4,8],[4,9],[1,2,3],[8,14],[8,9,15],[9,16],[2,5,6],[3,6,7],[14,22],[14,15,23],[15,16,24],[16,25],[5,10,11],[6,11,12],[7,12,13],[22],[22,23],[23,24],[24,25],[25],[10,17,18],[11,18,19],[12,19,20],[13,20,21]];
function hand(){return {small:Object.fromEntries(E.map(e=>[e,0])) as Record<Element,number>,big:Object.fromEntries(E.map(e=>[e,0])) as Record<Element,number>};}
export function newState(start:Element='metal'):State{const h={black:hand(),white:hand()};h.black.small[start]=1;h.white.small[start]=1;const supply=Object.fromEntries(E.map(e=>[e,5])) as Record<Element,number>;supply[start]-=2;return{turn:'black',move:1,start,board:Array(25).fill(null),hands:h,supply,bigSupply:Object.fromEntries(E.map(e=>[e,2])) as Record<Element,number>,tracker:{black:0,white:0},next:{black:BLACK_CYCLE[1],white:WHITE_CYCLE[1]},refined:{black:Object.fromEntries(E.map(e=>[e,false])) as any,white:Object.fromEntries(E.map(e=>[e,false])) as any},log:[],winner:null,winReason:null};}
export function clone(s:State):State{return JSON.parse(JSON.stringify(s));}
const opp=(s:Side):Side=>s==='black'?'white':'black';
const pAt=(s:State,c:number)=>s.board[c-1];
function externalNeighbors(loc:number){const cells=new Set(BIG_LOCS[loc]);const out=new Set<number>();for(const c of cells)for(const n of ADJ[c-1])if(!cells.has(n))out.add(n);return [...out];}
function blocked(s:State,side:Side,e:Element,cells:number[],loc?:number){const foe=opp(side),counter=COUNTER[e];for(const c of cells){const p=pAt(s,c);if(p&&p.side===foe&&p.kind==='small'&&p.element===counter)return`不能落子：对方小${CN[counter]}克大${BIG[e]}`;}if(loc!==undefined)for(const c of externalNeighbors(loc)){const p=pAt(s,c);if(p&&p.side===foe&&p.kind==='small'&&p.element===counter)return`不能落子：大${BIG[e]}的一条完整边被对方小${CN[counter]}封住`;}return null;}
export function legalSmall(s:State,side:Side,e:Element,c:number){if(s.hands[side].small[e]<=0)return'没有该小棋';const p=pAt(s,c),counter=BEATS[e];if(!p){for(const n of ADJ[c-1]){const q=pAt(s,n);if(q&&q.side===opp(side)&&q.kind==='small'&&q.element===counter)return`空格被对方小${CN[counter]}封住`;}return null;}if(p.kind==='big')return'小棋不能吃大棋';if(p.side===side)return'同级不能吃自己的棋子';return p.element===counter?null:`小${CN[e]}只能吃对方小${CN[counter]}`;}
export function legalBig(s:State,side:Side,e:Element,loc:number){if(s.bigSupply[e]<=0)return'该大棋供应已用尽';const cells=BIG_LOCS[loc];const ids=new Set<string>();for(const c of cells){const p=pAt(s,c);if(p?.kind==='big')ids.add(p.bigId!);}if(ids.size){if(ids.size!==1)return'不能部分覆盖其他大棋';const ps=cells.map(c=>pAt(s,c));if(ps.some(p=>!p||p.kind!=='big'||p.bigId!==[...ids][0]))return'不能部分覆盖其他大棋';const t=ps[0]!;if(t.side===side)return'不能吃自己的大棋';if(BEATS[e]!==t.element)return`大${BIG[e]}只能吃被其克制的大${BIG[t.element]}`;}const b=blocked(s,side,e,cells,loc);if(b)return b;for(const c of cells){const p=pAt(s,c);if(p?.kind==='small'&&p.side===opp(side)&&p.element===COUNTER[e])return`不能吃对方小${CN[p.element]}：它克制大${BIG[e]}`;}return null;}
function reclaim(s:State,side:Side,c:number){const p=pAt(s,c);if(!p)return;if(p.kind==='small'){if(p.side===side)s.hands[side].small[p.element]++;else s.hands[side].small[p.element]++;}s.board[c-1]=null;}
function finish(s:State,desc:string){const side=s.turn,cycle=side==='black'?BLACK_CYCLE:WHITE_CYCLE;s.tracker[side]=(s.tracker[side]+1)%5;const e=cycle[s.tracker[side]];s.next[side]=cycle[(s.tracker[side]+1)%5];if(s.supply[e]>0){s.supply[e]--;s.hands[side].small[e]++;}s.log.unshift(`${s.move}. ${side==='black'?'黑':'白'} ${desc}；补充小${CN[e]}`);s.move++;s.turn=opp(side);checkWin(s);}
function checkWin(s:State){if(s.winner)return;for(const side of ['black','white'] as Side[])if(E.every(e=>s.refined[side][e])){s.winner=side;s.winReason='五行大成';return;}if(s.board.filter(Boolean).length===25){const b=s.board.filter(p=>p?.side==='black').length,w=s.board.filter(p=>p?.side==='white').length;if(b!==w){s.winner=b>w?'black':'white';s.winReason='棋盘占领';}return;}if(!hasLegalMove(s,s.turn)){s.winner=opp(s.turn);s.winReason='逼停';}}
export function hasLegalMove(s:State,side:Side){for(const e of E)for(let c=1;c<=25;c++)if(!legalSmall(s,side,e,c))return true;for(const e of E)if(s.bigSupply[e]>0&&s.hands[side].small[e]+s.board.filter(p=>p?.side===side&&p.kind==='small'&&p.element===e).length>=3)for(let l=0;l<BIG_LOCS.length;l++)if(!legalBig(s,side,e,l))return true;return false;}
function consume3(s:State,side:Side,e:Element){let need=3;for(let c=1;c<=25&&need;c++){const p=pAt(s,c);if(p?.side===side&&p.kind==='small'&&p.element===e){s.board[c-1]=null;need--;}}const h=Math.min(need,s.hands[side].small[e]);s.hands[side].small[e]-=h;need-=h;if(need)return false;s.supply[e]+=3;return true;}
export function playSmall(s0:State,c:number,e:Element){const s=clone(s0),side=s.turn;if(s.winner)return{ok:false,reason:'本局已结束',state:s0};const err=legalSmall(s,side,e,c);if(err)return{ok:false,reason:err,state:s0};const target=pAt(s,c);if(target&&target.kind==='small')s.hands[side].small[target.element]++;s.hands[side].small[e]--;s.board[c-1]={kind:'small',side,element:e};finish(s,`放置小${CN[e]}（${c}）`);return{ok:true,state:s};}

export type AbilityAction =
 | {kind:'none'}
 | {kind:'water';moves:{from:number;to:number}[]}
 | {kind:'wood';places:{element:Element;cell:number}[]}
 | {kind:'fire';remove:number[]}
 | {kind:'earth';flip:number[]}
 | {kind:'metal';element:Element;cell:number};
function bigAdjCells(loc:number){const cells=new Set(BIG_LOCS[loc]);const out=new Set<number>();for(const c of cells)for(const n of ADJ[c-1])if(!cells.has(n))out.add(n);return [...out];}
function applyAbility(s:State,side:Side,e:Element,loc:number,a:AbilityAction){
 if(a.kind==='none')return null;
 const adj=new Set(bigAdjCells(loc));
 if(e==='water'&&a.kind==='water'){
   if(a.moves.length>2)return'淼最多移动2个小棋';
   if(new Set(a.moves.map(x=>x.from)).size!==a.moves.length)return'淼的起点不能重复';
   const moving=a.moves.map(x=>({from:x.from,to:x.to,p:pAt(s,x.from)}));
   if(moving.some(x=>!adj.has(x.from)||!x.p||x.p.kind!=='small'))return'淼只能移动与大棋相邻的小棋';
   const targets=new Set(a.moves.map(x=>x.to)); if(targets.size!==a.moves.length)return'淼的目标位置不能重复';
   for(const x of moving){if(x.to<1||x.to>25||pAt(s,x.to))return'淼只能移动到空格';}
   // remove first, then validate destination placement against the resulting board
   for(const x of moving)s.board[x.from-1]=null;
   for(const x of moving){for(const n of ADJ[x.to-1]){const q=pAt(s,n);if(q&&q.side!==x.p!.side&&q.kind==='small'&&q.element===COUNTER[x.p!.element]){for(const y of moving)s.board[y.from-1]=y.p;return`淼：目标${x.to}被对方小${CN[q.element]}封住`;}}}
   for(const x of moving)s.board[x.to-1]=x.p!;
   return null;
 }
 if(e==='wood'&&a.kind==='wood'){
   if(a.places.length>2)return'森最多放置2个小棋';
   for(const x of a.places){if(!adj.has(x.cell))return'森只能放在大棋相邻的空格';if(pAt(s,x.cell))return'森只能放在空格';if(s.hands[side].small[x.element]<=0)return'森的手牌没有所选小棋';const err=legalSmall(s,side,x.element,x.cell);if(err)return`森：${err}`;}
   for(const x of a.places){s.hands[side].small[x.element]--;s.board[x.cell-1]={kind:'small',side,element:x.element};}
   return null;
 }
 if(e==='fire'&&a.kind==='fire'){
   if(a.remove.length>2)return'焱最多焚烧2个小棋';for(const c of a.remove){if(!adj.has(c))return'焱只能选择相邻小棋';const p=pAt(s,c);if(!p||p.kind!=='small')return'焱只能焚烧小棋';}for(const c of a.remove){const p=pAt(s,c)!;s.supply[p.element]++;s.board[c-1]=null;}return null;
 }
 if(e==='earth'&&a.kind==='earth'){
   if(a.flip.length>2)return'垚最多翻转2个小棋';for(const c of a.flip){if(!adj.has(c))return'垚只能选择相邻小棋';const p=pAt(s,c);if(!p||p.kind!=='small')return'垚只能翻转小棋';}for(const c of a.flip){const p=pAt(s,c)!;p.side=side;}return null;
 }
 if(e==='metal'&&a.kind==='metal'){
   if(s.supply[a.element]<=0)return'鑫：补给区没有该小棋';const err=legalSmall(s,side,a.element,a.cell);if(err)return`鑫：${err}`;const p=pAt(s,a.cell);if(p&&p.kind==='small')s.hands[side].small[p.element]++;s.supply[a.element]--;s.board[a.cell-1]={kind:'small',side,element:a.element};return null;
 }
 return `大${BIG[e]}的能力参数不匹配`;
}
export function refineBig(s0:State,e:Element,loc:number,ability:AbilityAction={kind:'none'}){const s=clone(s0),side=s.turn;if(s.winner)return{ok:false,reason:'本局已结束',state:s0};if(s.bigSupply[e]<=0)return{ok:false,reason:'该大棋供应已用尽',state:s0};const total=s.hands[side].small[e]+s.board.filter(p=>p?.side===side&&p.kind==='small'&&p.element===e).length;if(total<3)return{ok:false,reason:'没有3个同元素小棋可炼化',state:s0};const err=legalBig(s,side,e,loc);if(err)return{ok:false,reason:err,state:s0};if(!consume3(s,side,e))return{ok:false,reason:'炼化失败',state:s0};const cells=BIG_LOCS[loc];const targetBig=cells.map(c=>pAt(s,c)).find(p=>p?.kind==='big');if(targetBig)for(const c of BIG_LOCS[targetBig.bigLoc!])s.board[c-1]=null;const id=`${s.move}-${side}-${e}`;for(const c of cells){const p=pAt(s,c);if(p?.kind==='small')s.hands[side].small[p.element]++;s.board[c-1]={kind:'big',side,element:e,bigId:id,bigLoc:loc};}s.bigSupply[e]--;s.refined[side][e]=true;const ae=applyAbility(s,side,e,loc,ability);if(ae)return{ok:false,reason:ae,state:s0};finish(s,`炼化大${BIG[e]}（大三角形 ${loc+1}）`);return{ok:true,state:s};}
