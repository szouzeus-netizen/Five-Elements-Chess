import { DurableObject } from 'cloudflare:workers';
import { newState, playSmall, refineBig, playBigFromHand, type Element, type State } from './engine';

type Env = {
  WUXING: DurableObjectNamespace;
  ASSETS: Fetcher;
  WUXING_AI_KEY: string;
};

function unauthorized() {
  return Response.json({ ok: false, reason: 'Unauthorized' }, { status: 401 });
}

function aiAuthorized(req: Request, env: Env) {
  const auth = req.headers.get('Authorization') || '';
  const key = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return !!env.WUXING_AI_KEY && key === env.WUXING_AI_KEY;
}

function cors(r: Response) {
  const h = new Headers(r.headers);
  h.set('Access-Control-Allow-Origin', '*');
  h.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  h.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  return new Response(r.body, { status: r.status, headers: h });
}

function roomNameFromRequest(url: URL) {
  return (url.searchParams.get('room') || 'main')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 64) || 'main';
}

async function roomFetch(env: Env, room: string, req: Request) {
  const id = env.WUXING.idFromName(room);
  return env.WUXING.get(id).fetch(req);
}

export class WuxingGame extends DurableObject<Env> {
  state: State;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.state = newState('metal');
  }

  async load() {
    const v = await this.ctx.storage.get<State>('state');
    if (v) this.state = v;
  }

  async fetch(req: Request) {
    await this.load();
    const url = new URL(req.url);

    if (req.method === 'GET') return Response.json(this.state);
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

    const body: any = await req.json();
    let r: any;

    if (body.action === 'reset') {
      this.state = newState(body.start || 'metal');
      await this.ctx.storage.delete('past');
      await this.ctx.storage.put('state', this.state);
      return Response.json({ ok: true, state: this.state });
    } else if (body.action === 'undo') {
      const past = (await this.ctx.storage.get<State[]>('past')) || [];
      const prev = past.pop();
      if (!prev) return Response.json({ ok: false, reason: '没有可撤回的行动', state: this.state });
      this.state = prev;
      await this.ctx.storage.put('past', past);
      await this.ctx.storage.put('state', this.state);
      return Response.json({ ok: true, state: this.state });
    } else if (body.action === 'small') {
      r = playSmall(this.state, Number(body.cell), body.element as Element);
    } else if (body.action === 'big') {
      r = refineBig(
        this.state,
        body.element as Element,
        Number(body.loc) - 1,
        body.ability || { kind: 'none' },
        body.sources
      );
    } else if (body.action === 'bigHand') {
      r = playBigFromHand(
        this.state,
        body.element as Element,
        Number(body.loc) - 1,
        body.ability || { kind: 'none' }
      );
    } else {
      return Response.json({ ok: false, reason: 'unknown action' }, { status: 400 });
    }

    if (r) {
      if (!r.ok) return Response.json(r);
      const past = (await this.ctx.storage.get<State[]>('past')) || [];
      past.push(this.state);
      if (past.length > 50) past.shift();
      await this.ctx.storage.put('past', past);
      this.state = r.state;
    }

    await this.ctx.storage.put('state', this.state);
    return Response.json({ ok: true, state: this.state });
  }
}

export class WuxingRoom extends DurableObject<Env> {
  async fetch() {
    return new Response('Legacy migration placeholder', { status: 410 });
  }
}

export default {
  async fetch(req: Request, env: Env) {
    const url = new URL(req.url);

    if (req.method === 'OPTIONS') return cors(new Response(null, { status: 204 }));

    // AI control API. The key is stored as a Cloudflare Worker secret.
    // GET  /api/ai/state?room=main
    // POST /api/ai/move?room=main
    if (url.pathname === '/api/ai/state' || url.pathname === '/api/ai/move') {
      if (!aiAuthorized(req, env)) return cors(unauthorized());

      const room = roomNameFromRequest(url);
      const target = new URL(req.url);
      target.pathname = '/';
      target.search = '';

      if (url.pathname === '/api/ai/state') {
        const r = await roomFetch(env, room, new Request(target.toString(), { method: 'GET' }));
        return cors(r);
      }

      if (req.method !== 'POST') {
        return cors(new Response('Method Not Allowed', { status: 405 }));
      }

      const body = await req.text();
      const r = await roomFetch(
        env,
        room,
        new Request(target.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body
        })
      );
      return cors(r);
    }

    // Normal web UI room API.
    if (url.pathname.startsWith('/api/room/')) {
      const room = decodeURIComponent(url.pathname.slice('/api/room/'.length))
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .slice(0, 64) || 'main';
      const id = env.WUXING.idFromName(room);
      return env.WUXING.get(id).fetch(req);
    }

    if (req.method === 'GET' && url.pathname === '/') {
      const assetUrl = new URL(req.url);
      assetUrl.pathname = '/index.html';
      return env.ASSETS.fetch(new Request(assetUrl.toString(), req));
    }

    return env.ASSETS.fetch(req);
  }
} satisfies ExportedHandler<Env>;
