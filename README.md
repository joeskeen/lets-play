# Let’s Play

A tiny peer-to-peer party game. One person hosts, everyone else joins with a
link, and the whole game runs over WebRTC data channels between the people in
the room. There is no account system, no game server, and no database.

This is a from-scratch rewrite of the 2020 Angular 9 / NgRx / Cashmere version
in this repository. The rules are the same; the transport, state model and UI
are new.

## Run it

```bash
npm install
npm start          # ng serve
npm run build      # production build
npm test           # Vitest
```

Open `http://localhost:4200`, type a name, and host a game.

## Deploying

`master` deploys automatically through
`.github/workflows/deploy-pages.yml`. The workflow builds with
`npm run build:pages`, which passes `--base-href=/lets-play/`, and force-pushes
the static output to the `gh-pages` branch. The site is served at
`https://joe.skeen.rocks/lets-play/`.

Local `npm run build` is unchanged and builds for `/`, so the output can still
be previewed at a server root.

## How a game works

1. **Host** creates a room and picks prompts (a default pack is pre-filled).
2. The host taps **Create invite**. That produces a link and a QR code.
3. **Joiner** opens the link. Their browser immediately prepares a reply code.
4. The joiner sends that reply back over any chat. The host pastes it into the
   lobby and taps **Connect player**.
5. Everyone writes an answer to the prompt.
6. In turn, a player picks a **?** answer and guesses who wrote it.
   - Correct: the answer is revealed, the guesser scores a point, and they keep
     their turn.
   - Wrong: the turn passes to the next player who has not been guessed.
7. The round ends when there is nothing left to guess. The host starts the next
   round. When the prompts run out, the final scores are shown.

The host is authoritative: they sequence every change and broadcast it. Guests
send intents, and the same pure reducer that the host uses also validates those
intents.

## The handshake

A normal WebRTC app needs a signaling server to swap SDP. This one does the swap
out of band, in **two messages**:

```
host                                    joiner
  │  offer (SDP + ICE candidates)          │
  │ ─────────────── link / QR ───────────▶ │
  │                                        │  answer (SDP + ICE candidates)
  │ ◀──────────── reply, pasted back ───── │
  │                                        │
  │ ═══════════ DTLS data channel ════════ │
```

Each blob is JSON, compressed with `CompressionStream('deflate-raw')` when that
makes it smaller, then base64url-encoded. A typical invite is 600–900
characters, small enough for a QR code.

ICE gathering is allowed to finish before the blob is serialized, so the SDP is
self-contained. That is what makes a two-message handshake possible. Later
connections (the rest of the mesh) use ordinary trickle ICE instead.

### Why there is no short join code

A short code like `ABCD-1234` is only useful if something can look it up. That
something is a server. The point of this rewrite is that there is not one, so
the invite itself has to carry the offer. It is a link (and a QR), not a code.

### Why one invite per person

An SDP offer contains ephemeral ICE credentials and a DTLS fingerprint. It is a
single-use handshake, not a room ticket. `Create invite` therefore rotates: it
closes the previous pending offer and makes a new one. For a four-player game
the host does this three times. The tradeoff is deliberate — the alternative is
a signaling server.

## The mesh

The first connection comes from the invite. Every other connection is
negotiated **through** the peers already connected:

- The joiner receives the roster in a snapshot.
- For each member it is not connected to, it creates an offer and sends it to a
  peer it can reach. Signals are relayed hop by hop (`t: 'signal'`, with an id
  cache so loops are harmless).
- The target replies with an answer, again relayed.
- ICE candidates trickle over the same path.

Once a pair is connected, it speaks directly. The result is a full mesh: every
peer has a data channel to every other peer.

The mesh also gives a best-effort substitute for TURN. If a direct path between
two guests fails, traffic can still be forwarded through a third peer. This is
not a real TURN relay (the first hop still has to work), but it removes a lot of
the usual "one person can't connect to anyone" failure mode.

## State replication

```
guest ── intent ──▶ host ── reduce(state, action, actor) ──▶ new state
                              │
                              ├── event { epoch, seq, action }
                              ▼
                          all guests
```

- **One writer.** Only the host mutates the shared state.
- **Pure reducer.** `src/app/game/model.ts` has no clocks, no randomness and no
  generated ids. Every peer replays the same action and lands on the same state.
  Anything non-deterministic (response ids, timestamps, prompt shuffling) is
  decided before the action is sent.
- **Sequenced.** Each event carries an `epoch` and a `seq`. A gap triggers a
  `resync`; the host replies with a full snapshot.
- **Validated twice.** The host rejects illegal intents (`reduce` returns
  `null`); guests apply only what the host broadcasts.
- **One author.** Guests accept `event` and `snapshot` messages only from the
  host they follow. A promotion snapshot is accepted only from the peer next in
  line, so a guest cannot forge a state update.

## Host succession

If the host’s link drops, the earliest-joined remaining player promotes
themselves:

1. They take the host id, remove the old host, repair the turn order, and bump
   the epoch.
2. They broadcast a full snapshot.
3. If the designated successor is also gone, every peer waits four seconds and
   then recomputes the successor from the members it can still reach.

There is no voting and no consensus protocol. The roster’s join order is the
tie-break, and the epoch change is the signal that a new authority exists.

## Limits and threat model

- **STUN only.** No TURN server is bundled. Symmetric NAT on both ends of the
  *first* hop cannot be solved without a relay. Add one in `ICE_SERVERS`
  (`src/app/core/peer-link.ts`) if you need it — for example Cloudflare Calls
  with ephemeral credentials. The mesh covers many, not all, cases.
- **Possession is access.** Anyone who has a live invite can join. There are no
  accounts, passwords or signatures. Treat an invite like a party invitation.
- **Transport security is DTLS.** Data channels are encrypted and authenticated
  peer to peer. The out-of-band channel (chat, QR, Slack) is the weak link: if
  someone can swap the SDP, they can be the peer.
- **No persistence.** A refresh leaves the room. There is no reconnection
  handshake yet; the mesh repairs connections while the tab lives.
- **One host.** The game is host-authoritative by design. It is a turn-based
  party game; there is no need for a CRDT or Byzantine agreement.
- **Room size.** Soft-capped at 16 members, which is already a lot for a full
  mesh (each peer holds N−1 connections).

## Code map

```
src/app/
  core/
    identity.ts     ids, names, deterministic identicon avatars
    codec.ts        deflate + base64url framing
    invite.ts       invite/reply schema, URL helpers, validation
    protocol.ts     wire envelopes and parsing
    peer-link.ts    one RTCPeerConnection, perfect negotiation, trickle ICE
    mesh.ts         peer map, signal relay, mesh formation
  game/
    model.ts        pure rules + authorization
    prompts.ts      default prompt pack + textarea parsing
  room.ts           identity, invites, host authority, snapshots, succession
  ui/               landing, join, lobby, game, avatar, QR, scoreboard
  app.ts            shell + view switch
```

Everything under `core/` and `game/model.ts` is framework-free and unit-tested.
`Room` is the only service that knows both transport and game.

## Tests

The Vitest suite covers:

- codec round-trips (including emoji), url-safe output, bad framing
- invite validation, URL building, pasted-link extraction
- wire parsing (valid messages, malformed messages, bad signals)
- the full game loop: writing, guessing, correct/incorrect turns, round ends,
  game over, mid-round departures, host-only actions

```bash
npm test                    # watch mode
npm test -- --watch=false   # one shot
```

## What is intentionally not here

Chat, voting, boot/skip intents, host abdication and government models are not
in this rewrite. They are tracked as GitHub issues so they do not turn into a
second backlog. The transport is the interesting part; these are product
features that can be layered on top of the `Action` union without touching the
handshake or the mesh.

The old Hastebin copy-paste flow and the `db.neelr.dev` signaling backend are
gone. `db.neelr.dev` no longer resolves, so that backend could not have worked
even if the app still built.

The previous implementation is recoverable from git at commit `709a246`.
