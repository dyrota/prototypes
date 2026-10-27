# Async deckbuilder prototypes

Three small two-player deckbuilders built for asynchronous, turn-by-turn play. Each turn is self-contained, and none of them uses a shared market row.

Play them at **https://dyrota.github.io/prototypes/**

| Game | Twist | Play |
|---|---|---|
| **Fair Folk** | Your opponent splits every hand you draw into two piles; you keep one. Then you split their next hand. | [fair-folk/](https://dyrota.github.io/prototypes/fair-folk/) |
| **Loom** | Every card links one symbol to another. You continue the shared thread from the symbol your opponent ended on. | [loom/](https://dyrota.github.io/prototypes/loom/) |
| **Relay** | Both players face the same 12 foes. Draft 1 of 3 cards; the 2 you pass go to your rival's next offer. | [relay/](https://dyrota.github.io/prototypes/relay/) |

## Ways to play

- **vs bot**: a simple heuristic opponent, for solo testing.
- **Hotseat**: two players on one device, with a hand-off screen between turns.
- **Online async**: each game also runs as a Claude artifact backed by a shared store. Players join open seats and take turns whenever they like. GitHub Pages builds only have the first two modes.

Local games are saved in your browser's localStorage.

## Layout

```
src/
  core.js        shared helpers (shuffle, draw, card rendering)
  fair-folk.js   rules, view and bot for each game (defines GAME)
  loom.js
  relay.js
  shell.js       lobby, storage, bot runner, hotseat hand-off, online play
  page.html      page template and styles
build.py         inlines everything into one HTML file per game
<game>/index.html   built pages served by GitHub Pages
dist/artifact/      built body-only pages for Claude artifacts (git-ignored)
```

Edit files in `src/`, then run `python3 build.py` and commit the rebuilt `<game>/index.html` files.

## Adding a game

Create `src/<slug>.js` that defines `GAME` with `key`, `title`, `color`, `hook`, `turn`, `watch`, `rules`, `score(st, seat)`, `setup()`, `view(st, ctx)`, an `on` map of action handlers (return `'commit'` to end the turn), and `bot(st, ctx)` (makes one decision per call). Add it to `GAMES` in `build.py` and link it from `index.html`.
