# BotCityRS Scripts

Official CDN scripts for the BotCityRS webclient.

The published CDN entrypoint is:

```text
https://botcityrs.github.io/Scripts/manifest.json
```

## Add A New Script

1. Create a new TypeScript file in `src/scripts/`.

   Use a default-exported class that extends `BotScript`:

   ```ts
   import BotScript from '../runtime/BotScript';
   import Timer from '../runtime/Timer';
   import type { Bot } from '../runtime/types';

   const TIMER_GAME_INTERACT = 0;

   export default class MyNewScript extends BotScript {
     private timer = new Timer();

     constructor() {
       super('MyNewScript', false, { author: '', version: '1.0.0' });
       this.timer.defineTimer('TIMER_GAME_INTERACT', TIMER_GAME_INTERACT);
     }

     static override htmlSetup(base: HTMLElement): void {
       const desc = document.createElement('p');
       desc.className = 'bot-description';
       desc.textContent = 'Describe what this script does.';
       base.appendChild(desc);
     }

     static override buildFromHtml(_base: HTMLElement): MyNewScript {
       return new MyNewScript();
     }

     override update(bot: Bot): void {
       const api = bot.api;
       if (this.timer.hasTimer(TIMER_GAME_INTERACT)) {
         return;
       }

       api.tryLogin();
       // Add script behavior here.
       this.timer.setTimer(TIMER_GAME_INTERACT, 1200);
     }
   }
   ```

2. Build and validate locally.

   ```sh
   bun run build
   bun run test
   ```

   `bun run build` automatically discovers every `.ts` file in `src/scripts/`, builds it, and writes a manifest entry using the file name. Keep the file name, class name, and `super('<ScriptName>', false, { author, version })` value aligned so the dropdown label and module name stay predictable.

   The build writes:

   - `manifest.json`
   - `scripts/<ScriptName>.js`
   - `scripts/<ScriptName>.js.map`

   `bun run test` checks that every manifest entry has a built module and default export.

3. Check the generated `manifest.json`.

   A new script should appear like this:

   ```json
   {
     "name": "MyNewScript",
     "moduleUrl": "./scripts/MyNewScript.js",
     "exportName": "default"
   }
   ```

4. Commit and push the source changes.

   Pull requests run the GitHub Actions build and validation workflow. After changes merge to `main`, the same workflow builds the CDN files and publishes them to the `gh-pages` branch.

## Runtime Notes

- CDN scripts run in the browser and interact with the game through `bot.api`.
- Use helpers from `src/runtime/` for shared script-side code such as `BotScript`, `Timer`, menu action constants, and walk route labels.
- Keep script constructors no-argument or provide safe defaults. The loader may instantiate a script just to inspect metadata.
- `super('<ScriptName>', false, { author, version })` marks the script as CDN-provided instead of bundled system code and records required script metadata.
- Set `isDebugScript: true` in the metadata object only for debug-only scripts.

## Publish Checklist

Run these before pushing:

```sh
bun run build
bun run test
```

Pull requests run the same checks automatically. After a merge to `main`, confirm GitHub Pages can serve the manifest:

```sh
curl https://botcityrs.github.io/Scripts/manifest.json
```
