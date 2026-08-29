import { Agent, callable } from "agents";

export type Piece={owner:"black"|"white";level:"small"|"large";element:"water"|"fire"|"metal"|"wood"|"earth";x:number;y:number};
export type State={
  turn:"black"|"white"; board:Piece[];
  blackHand:Record<string,number>; whiteHand:Record<string,number>;
  supply:Record<string,number>; nextBlack:string; nextWhite:string; history:string[];
};

const initialState:State={
  turn:"black",board:[],
  blackHand:{water:0,fire:0,metal:1,wood:0,earth:0},
  whiteHand:{water:0,fire:0,metal:1,wood:0,earth:0},
  supply:{water:5,fire:5,metal:3,wood:5,earth:5},
  nextBlack:"wood",nextWhite:"water",history:[]
};

export class WuxingGame extends Agent<Env,State>{
  initialState=initialState;
  @callable() getState(){return this.state;}
  @callable() place(piece:Omit<Piece,"owner"> & {owner?: "black"|"white"}){
    const owner=piece.owner ?? this.state.turn;
    if(owner!==this.state.turn) return {ok:false,reason:"not-your-turn",state:this.state};
    const next={...this.state,board:[...this.state.board,{...piece,owner}],
      turn:owner==="black"?"white":"black",
      history:[...this.state.history,`${owner}:${piece.level}:${piece.element}@${piece.x},${piece.y}`]};
    this.setState(next);
    return {ok:true,state:next};
  }
  @callable() reset(){this.setState(initialState);return {ok:true,state:this.state};}
}
