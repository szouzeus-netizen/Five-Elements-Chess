import { Agent, callable } from "agents";

export type Owner = "black" | "white";
export type Level = "small" | "large";
export type Element = "water" | "fire" | "metal" | "wood" | "earth";

export type Piece = {
  id: string;
  owner: Owner;
  level: Level;
  element: Element;
  x: number;
  y: number;
};

export type State = {
  turn: Owner;
  board: Piece[];
  blackHand: Record<Element, number>;
  whiteHand: Record<Element, number>;
  supply: Record<Element, number>;
  nextBlack: Element;
  nextWhite: Element;
  history: string[];
};

const elements: Element[] = ["water", "fire", "metal", "wood", "earth"];

const emptyHand = (): Record<Element, number> => ({
  water: 0,
  fire: 0,
  metal: 0,
  wood: 0,
  earth: 0,
});

const initialState: State = {
  turn: "black",
  board: [],
  blackHand: { ...emptyHand(), metal: 1 },
  whiteHand: { ...emptyHand(), metal: 1 },
  supply: { water: 5, fire: 5, metal: 3, wood: 5, earth: 5 },
  nextBlack: "wood",
  nextWhite: "water",
  history: [],
};

function cloneState(state: State): State {
  return {
    ...state,
    board: state.board.map((p) => ({ ...p })),
    blackHand: { ...state.blackHand },
    whiteHand: { ...state.whiteHand },
    supply: { ...state.supply },
    history: [...state.history],
  };
}

export class WuxingGame extends Agent<Env, State> {
  initialState = initialState;

  @callable()
  getState() {
    return this.state;
  }

  @callable()
  place(input: {
    owner?: Owner;
    level: Level;
    element: Element;
    x: number;
    y: number;
  }) {
    const owner = input.owner ?? this.state.turn;
    if (owner !== this.state.turn) {
      return { ok: false, reason: "not-your-turn", state: this.state };
    }

    if (!elements.includes(input.element)) {
      return { ok: false, reason: "invalid-element", state: this.state };
    }

    const next = cloneState(this.state);
    const occupied = next.board.some((p) => p.x === input.x && p.y === input.y);
    if (occupied) {
      return { ok: false, reason: "occupied", state: this.state };
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    next.board.push({
      id,
      owner,
      level: input.level,
      element: input.element,
      x: input.x,
      y: input.y,
    });
    next.turn = owner === "black" ? "white" : "black";
    next.history.push(
      `${owner === "black" ? "黑" : "白"}方：${input.level === "small" ? "小" : "大"}${input.element} @ ${input.y + 1}-${input.x + 1}`,
    );
    this.setState(next);
    return { ok: true, state: next };
  }

  @callable()
  reset() {
    this.setState(cloneState(initialState));
    return { ok: true, state: this.state };
  }
}
