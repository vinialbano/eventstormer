# Web Speech API reality check — research findings

Date: 2026-08-23. All claims cited. Sources preferred in this order: MDN (+ MDN browser-compat-data raw JSON), W3C/WICG spec repo, browser vendor docs (Chrome for Developers, chromestatus API, WebKit blog), Mozilla wiki/bugzilla, real bug trackers. Blog posts are used only where flagged.

---

## 1. Does the audio leave the device? — YES, by default, in every shipping implementation

### Chrome / Edge (Chromium)

MDN states this as a normative note on the interface page itself:

> "On some browsers, like Chrome, using Speech Recognition on a web page involves a server-based recognition engine. Your audio is sent to a web service for recognition processing, so it won't work offline."
> — [MDN, `SpeechRecognition`](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition) ([raw source](https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/speechrecognition/index.md), verified verbatim)

And in the MDN guide:

> "By default, using speech recognition on a web page involves a server-based recognition engine. Your audio is sent to a web service for recognition processing, so it won't work offline."
> "Speech recognition is usually performed using an online service. This means that an audio recording is sent to a server for processing, and the results are then returned to the browser. This has a couple of problems: Privacy: Many users are not comfortable with their speech being sent to a server."
> — [MDN, Using the Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API) (verified verbatim from [raw source](https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/web_speech_api/using_the_web_speech_api/index.md), lines 19–21 and 170–177)

The W3C/WICG working group's own on-device explainer names this as the motivating problem:

> Drawbacks of the current API: **Privacy** — "Raw and transcribed audio is transmitted over the network"; **Latency**; **Offline** — requires connectivity.
> — [WebAudio/web-speech-api, on-device-speech-recognition explainer](https://github.com/WebAudio/web-speech-api/blob/main/explainers/on-device-speech-recognition.md)

Google's own framing, in the Chrome 139 release post, only makes sense if the default is remote:

> "Adds on-device speech recognition support to the Web Speech API. … This addition means that websites can ensure that audio and transcribed speech are not sent to a third-party service for processing."
> — [New in Chrome 139, Chrome for Developers](https://developer.chrome.com/blog/new-in-chrome-139)

Same wording on the feature entry (fetched from the chromestatus JSON API, so this is the canonical record, not a blog paraphrase):

> "This feature adds on-device speech recognition support to the Web Speech API, allowing websites to ensure that neither audio nor transcribed speech are sent to a third-party service for processing."
> — [chromestatus feature 6090916291674112](https://chromestatus.com/feature/6090916291674112) (via `https://chromestatus.com/api/v0/features/6090916291674112`)

Corroborating API-surface evidence: the spec defines a `network` error — "Network communication required for completing the recognition failed" — and a `service-not-allowed` error referring to "the requested speech recognition service". A purely local engine would need neither. — [MDN, `SpeechRecognitionErrorEvent.error`](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognitionErrorEvent/error)

**Which third party:** Google. The Chrome Privacy Whitepaper has a `#speech` section stating Chrome uses Google's servers for the Web Speech API and sends an audio recording plus the requesting site's domain and language settings (without cookies). **I could not load the whitepaper directly** — `https://www.google.com/chrome/privacy/whitepaper.html` returned a JS shell with no speech text to both WebFetch and curl, so I am relying on secondary quotation of it. Treat "Google specifically, plus site domain metadata" as **strongly indicated but not primary-source-verified by me**. Ref: [whitepaper.html#speech](https://www.google.com/chrome/privacy/whitepaper.html#speech).

### Safari

Safari's engine is Siri's, and Siri dictation is a network service:

> "Now, Safari supports speech recognition powered by the same speech engine as Siri. That means web developers can enjoy the benefits of high-quality transcription for over 50 languages and dialects. Note that users will need Siri enabled in System Preferences on macOS or Settings in iOS or iPadOS for the API to be available to be used."
> — [New WebKit Features in Safari 14.1, WebKit blog](https://webkit.org/blog/11648/new-webkit-features-in-safari-14-1/)

**Not fully verified:** WebKit does not publish an explicit "audio is uploaded to Apple" statement for the Web Speech API path. Apple's [Siri, Dictation & Privacy](https://www.apple.com/legal/privacy/data/en/ask-siri-dictation/) notice covers the Siri/Dictation engine generally (server processing, with some on-device dictation on newer devices). Safari also surfaces a system-level "Speech Recognition" permission and, on macOS, a prompt telling the user speech data will be sent to Apple. **Verdict: assume audio reaches Apple; I could not find a WebKit primary source that guarantees on-device.** For a confidentiality analysis, "we don't know whether it stays local" is functionally the same as "it leaves."

### Firefox

Mozilla's own wiki: the implementation proxies audio to Google.

> "Currently we are sending audio to Google's Cloud Speech-to-Text."
> Prefs: `media.webspeech.recognition.enable`, `media.webspeech.recognition.force_enable`, endpoint override `media.webspeech.service.endpoint`.
> — [Mozilla Wiki, Web Speech API – Speech Recognition](https://wiki.mozilla.org/Web_Speech_API_-_Speech_Recognition)

### On-device mode: real, but narrow

- API surface (all marked **experimental** on MDN): `SpeechRecognition.processLocally` (boolean, default `false`), static `SpeechRecognition.available({langs, processLocally})`, static `SpeechRecognition.install({langs, processLocally})`. — [MDN `SpeechRecognition`](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition), [MDN `available()`](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/available_static)
- `available()` returns `available` / `downloadable` / `downloading` / `unavailable`; `downloadable` and `downloading` are **only** meaningful when `processLocally: true`. Critically: "It is not possible to use `available()` to guarantee that a remote service supports the specified languages. A value of `false` means that either an on-device *or* a remote speech recognition service supports them." — [MDN `available()`](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/available_static)
- If you set `processLocally = true` and the language pack isn't installed, `start()` fails with `language-not-supported`. So the correct flow is `available()` → `install()` → `start()`. — [MDN guide, On-device speech recognition](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API)
- Support, from MDN browser-compat-data (`api/SpeechRecognition.json`, fetched raw from `main`):
  - `processLocally`, `available()`, `install()`: **chrome 139** (desktop). `chrome_android: false`. `safari: false`, `safari_ios: false`. `firefox: false`. `edge: "mirror"` (auto-mirrored from Chrome — see the Edge caveat in §3).
  - The unprefixed `SpeechRecognition` constructor itself is `chrome 139`; the `webkitSpeechRecognition` prefixed form is `chrome 33`.
- chromestatus records the on-device feature's shipping stage as **desktop milestone 139, with `android`, `ios`, `webview` all null**, and its Chrome status string is still `"In developer trial (Behind a flag)"` at milestone 139 despite the Chrome 139 release post announcing it — i.e. **the vendor's own records are inconsistent about whether this is fully on by default.** Firefox and WebKit standards positions are both **Positive**, but neither has shipped. — [chromestatus API record](https://chromestatus.com/feature/6090916291674112), [Mozilla position](https://github.com/mozilla/standards-positions/issues/1157), [WebKit position](https://github.com/WebKit/standards-positions/issues/443)
- Real-world reliability of on-device is shaky. Chrome's own AI dev-preview thread reports `install({langs:['en-US'], processLocally:true})` resolving `true` on a Chromebook while no SODA model ever appears in `chrome://components`, and `language-not-supported` errors thereafter; it worked on macOS for another participant. — [chrome-ai-dev-preview-discuss thread](https://groups.google.com/a/chromium.org/g/chrome-ai-dev-preview-discuss/c/Rlyc2uAsFCY/m/i7QOnrClAgAJ). There is an open Chromium bug titled around `speechRecognition.available({processLocally:true, langs:['en-US']})` broken on macOS — [crbug 444393111](https://issues.chromium.org/issues/444393111) — and a downstream report of on-device hanging permanently in `"downloading"` — [brave-browser#55414](https://github.com/brave/brave-browser/issues/55414). **I could not read either tracker's body:** `issues.chromium.org` requires sign-in and returned only a login shell to WebFetch. The titles are from search-result metadata; treat the details as unverified, the existence of the reports as verified.
- The explainer lists ~17 languages as an *example* set for Chrome and states plainly that "availability of on-device speech recognition languages is user-agent dependent." — [on-device explainer](https://github.com/WebAudio/web-speech-api/blob/main/explainers/on-device-speech-recognition.md)

**Bottom line for Q1: with default settings, in every browser that implements this, the domain expert's narration of their company's operations is uploaded to Google (Chrome, Edge, Firefox) or Apple (Safari). On-device mode exists but is Chrome-desktop-only, experimental, requires a per-language pack download, and has open bugs. It cannot be assumed present.**

---

## 2. Continuous recognition over minutes — this is the second dealbreaker

- `continuous` "Controls whether continuous results are returned for each recognition, or only a single result. Defaults to single (`false`)." `interimResults` yields results with `isFinal === false`. — [MDN `SpeechRecognition`](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)
- **`continuous` does not mean "runs until you stop it".** The open spec-repo issue is explicit that Chrome ends the session on a few seconds of silence regardless:

  > "The `continuous` param doesn't work properly in Chrome desktop or for Android… it stops when no-speech was detected after usually 3-4 seconds." Workaround: "restart the recognition by calling the start method in the `onend` event" — which "works for desktop, but on Android devices you'll always hear a connect/disconnect sound."
  > — [WebAudio/web-speech-api issue #99, "Continuously listening"](https://github.com/WebAudio/web-speech-api/issues/99) — **open**, filed 2021-08-20, no assignee, no milestone. Five years open with no spec fix.

- **Chrome on Android: `continuous` is a no-op.** MDN's compat data says for `chrome_android`: `version_added: false`, note "The property can be set, but has no effect", pointing at [crbug 41297427](https://crbug.com/41297427) ("Web Speech API: Continuous speech recognition is broken on Android", per [issues.chromium.org/40324711](https://issues.chromium.org/issues/40324711) / the crbug redirect). Source: MDN BCD `api/SpeechRecognition.json` → `continuous.chrome_android`.
- **Safari `continuous` was broken before 17.** BCD records `safari: 14.1–17` as `partial_implementation` with the note "Returns multiple results when set to `false`", fixed properly in `safari 17`. Source: same BCD file.
- A ~60-second per-session cap in Chrome is widely reported on the Chromium html5 list ("there is a 60 second timeout in the first release of Web Speech API, and there is currently no way to increase that period of time"). — [chromium-html5, "Web Speech API limit of 60 seconds?"](https://groups.google.com/a/chromium.org/g/chromium-html5/c/s2XhT-Y5qAc). **Not verified against current Chrome** — that thread is old and I could not find a current authoritative statement of the cap. Do not quote a number; do assume sessions end on their own.
- Other reported failure modes I found asserted but **could not verify against a primary tracker**: `onend` not firing reliably even with `start()` inside it, and duplicated transcript text after a restart, particularly on mobile Chrome. Both are described in issue #99's discussion and in secondary sources.

**Standard workaround pattern** (this is the community pattern, not a spec-blessed one): set `continuous = true` and `interimResults = true`; keep an "intent to be listening" flag; in `onend`, if the flag is set, call `start()` again; guard against tight restart loops; on `no-speech` errors, ignore and let the restart handle it; de-duplicate transcript segments by tracking `event.resultIndex` and only appending results with `isFinal === true`, since interim results are re-emitted and indices reset across sessions.

**Is it reliable? No.** The restart loop is the documented workaround, but it: (a) loses audio in the gap between `end` and the next `start` — there is nothing in the API that buffers across a restart, so words spoken during the handoff are simply gone; (b) resets `resultIndex`, so your accumulator must be session-scoped or you will duplicate or drop text; (c) plays an audible chime per restart on Android; (d) re-triggers a permission prompt on every restart if not on HTTPS (see §4). For a **3–10 minute unbroken narration by a domain expert who pauses to think** — which is exactly what a domain expert narrating a business does — this pattern will silently eat sentences at every thinking pause. That is a correctness problem for the downstream LLM, not just a UX wart.

---

## 3. Browser support as of August 2026

From MDN browser-compat-data `api/SpeechRecognition.json` (raw, `main` branch) and [caniuse: speech-recognition](https://caniuse.com/speech-recognition):

| Browser | Constructor | Notes |
|---|---|---|
| Chrome desktop | `webkitSpeechRecognition` since **33**; unprefixed `SpeechRecognition` since **139** | Must be served from a web server (BCD note on the prefixed entry) |
| Chrome Android | mirrors Chrome | but `continuous` has no effect; on-device APIs `false` |
| Edge | BCD says `"mirror"` (i.e. same as Chrome) | **caniuse says Edge is NOT supported, all versions 12–151.** These sources contradict each other. BCD `"mirror"` is auto-derived, not hand-verified. **Unresolved — test Edge yourself before claiming support.** |
| Safari (macOS) | `webkitSpeechRecognition` since **14.1**; no unprefixed constructor | `continuous` only correct from **17**; requires Siri enabled at OS level |
| Safari iOS | mirrors Safari; caniuse says **14.5+** | see the [Apple forum thread on unclear `interimResults` behaviour in iOS WebKit](https://developer.apple.com/forums/thread/775699) |
| Firefox desktop | BCD: **142**, both prefixed and unprefixed, **behind `media.webspeech.recognition.enable`** | caniuse: "disabled by default" across all versions through 157. `continuous`/`interimResults`/`start()` land at **143**, also pref-gated. |
| Firefox Android | mirrors Firefox; caniuse says not supported (v153) | |
| Samsung Internet | mirrors Chrome (caniuse: partial from 4) | |

**Is Firefox still unsupported? Effectively yes.** The code exists as of 142/143 but is behind an about:config pref that is off in shipping builds, so no ordinary user has it. Also note the pref name is the same one Mozilla's wiki documents for the Google-proxying implementation — enabling it does not buy you local processing.

Prefixing: you need `window.SpeechRecognition || window.webkitSpeechRecognition`. Note MDN's remark that the on-device demo needs no prefix handling "because the implementations that support this functionality do so without prefixes" — i.e. **on-device mode and the prefixed API are disjoint; if you're on the `webkit` path you are on the cloud path.**

The spec is not a W3C Recommendation. caniuse classifies it as "Unofficial / W3C Note"; the living draft lives at [wicg.github.io/speech-api](https://wicg.github.io/speech-api/) — **I could not extract text from that URL** (WebFetch returned an empty document), so nothing here is quoted from the spec text itself.

---

## 4. Permissions and UX

- Mic permission is a normal prompt; recognition doesn't begin until it's granted: "The first time speech recognition is used, Chrome needs to ask the user for permission to use the microphone, in which case `onstart` only fires when and if the user allows permission." — [Chrome for Developers, Voice driven web apps](https://developer.chrome.com/blog/voice-driven-web-apps-introduction-to-the-web-speech-api)
- **HTTPS is load-bearing for the restart loop:** "Pages hosted on HTTPS do not need to ask repeatedly for permission, whereas HTTP hosted pages do." — same source. Combined with §2, on plain HTTP every `onend`→`start()` restart re-prompts. `localhost` counts as a secure context for permission-persistence purposes in Chromium, so local dev behaves like HTTPS; ship on HTTPS regardless.
- BCD carries the note on Chrome's prefixed entry: "You'll need to serve your code through a web server for recognition to work" — `file://` will not work.
- Denial / mid-session revocation surfaces through `SpeechRecognitionErrorEvent.error`:
  - `not-allowed` — "The user agent disallowed any speech input from occurring for reasons of security, privacy or user preference."
  - `service-not-allowed` — "The user agent disallowed the requested speech recognition service, either because the user agent doesn't support it or because of reasons of security, privacy or user preference."
  - `audio-capture` — "Audio capture failed." (device gone, taken by another app)
  - `network` — "Network communication required for completing the recognition failed."
  - `no-speech` — "No speech was detected."
  - `aborted`, `language-not-supported`, `phrases-not-supported`.
  — [MDN `SpeechRecognitionErrorEvent.error`](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognitionErrorEvent/error)
  Your restart loop **must** distinguish `no-speech`/`aborted` (retry) from `not-allowed`/`service-not-allowed` (stop, tell the user) or you will spin.
- **Safari has an extra gate:** the OS-level Siri/Dictation setting. If Siri is off in System Settings, the API is simply unavailable — [WebKit blog](https://webkit.org/blog/11648/new-webkit-features-in-safari-14-1/). That is a support-ticket generator for a product where the first interaction is "talk to us for ten minutes."
- **Not verified:** exact re-prompt behaviour when permission is revoked mid-session in each browser, and whether `onend` vs `onerror` fires first. Worth a manual test.

---

## 5. Practical alternatives (brief — the tradeoff, not a vendor bake-off)

**A. On-device Chrome mode (`processLocally: true`).** Cheapest change, genuinely private, zero bundle cost. But: Chrome desktop only, experimental, per-language pack download the user must consent to, open bugs on macOS and ChromeOS, and it does nothing for Safari/Firefox/mobile. Viable only as a *preferred path with a fallback*, never as the sole path. ([MDN guide](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API), [chromestatus](https://chromestatus.com/feature/6090916291674112))

**B. In-browser Whisper via transformers.js / ONNX Runtime Web (WASM or WebGPU).** Truly local, works cross-browser, no per-session upload, and you control chunking so long narration is a non-issue (you own the audio buffer). Costs: a **model download in the 100–200 MB range** for whisper-base/small class models — reported ~150 MB quantized small, ~200 MB base — cached in the browser's Cache API so it survives reloads but the *first* session pays it. WebGPU acceleration is available in Chrome/Edge 113+, Chrome Android 151+, Safari 26+ (partial), Safari iOS 26+ — but **Firefox has WebGPU disabled by default through 157**, so Firefox falls back to WASM and is materially slower. Reference implementation: [xenova/whisper-web](https://github.com/xenova/whisper-web). Support data: [caniuse: webgpu](https://caniuse.com/webgpu). *Caveat: the model-size and latency figures here come from secondary blog/demo sources, not vendor docs — validate by measuring before committing.*

**C. Hosted transcription API.** Best accuracy, best long-form handling, streaming or batch, predictable behaviour across all browsers, no bundle cost. Costs: per-minute money, an audio-upload path you must build, and — the thing the current plan was trying to avoid — **audio leaves the device to a vendor you choose.**

**The tradeoff, stated plainly:** the plan's premise was "browser-native means the audio stays put." That premise is false. So the real choice is between *(B)* paying ~150–200 MB of first-load and slower-than-realtime transcription on weak hardware in exchange for genuine locality, and *(C)* paying money and accepting a data-processor relationship with a vendor you can name, contract with, and put in a DPA. What you cannot honestly keep is *(default Web Speech)*: an uploaded-to-Google path with no contract, no DPA, no retention statement, and no vendor choice — which is strictly worse than (C) on confidentiality grounds while also being less accurate.

---

## What I searched and could NOT verify

- **`issues.chromium.org` is sign-in gated.** Both [444393111](https://issues.chromium.org/issues/444393111) and [40324711](https://issues.chromium.org/issues/40324711) returned login shells to WebFetch. I have their titles from search metadata and, for 41297427, MDN's own `impl_url` reference — but not their bodies, statuses, or comment threads.
- **The Chrome Privacy Whitepaper `#speech` section.** Both WebFetch and `curl` returned a JS shell with no speech text. The "Google servers, plus site domain and language, no cookies" detail is therefore secondary-sourced.
- **The WICG spec text** at `wicg.github.io/speech-api` returned an empty document; nothing in this report is quoted from the spec itself.
- **Safari's data path.** No WebKit or Apple developer-doc statement specifically about where Web Speech audio goes. Inferred from "the same speech engine as Siri" plus Apple's Siri/Dictation privacy notice.
- **Current Chrome session-length cap.** The 60-second figure traces to an old chromium-html5 list post. Unverified against current Chrome. Measure it.
- **Edge support.** BCD and caniuse contradict each other. Unresolved.
- **`onend` non-firing and post-restart duplication.** Asserted in spec-repo issue #99's discussion and secondary sources; no primary tracker entry verified.
- **Whisper-in-browser model sizes and latency.** Secondary sources only.

---

## Verdict

**Web Speech API is not suitable for this use case as described.** Two independent reasons, either of which is sufficient:

1. **Confidentiality.** By default the raw audio of a domain expert describing their company's operations is streamed to Google (Chrome/Edge/Firefox) or Apple (Safari). MDN says this outright on the interface page; the W3C working group's own explainer names it as the API's core privacy defect. There is no contract, no DPA, no retention statement, and no ability to choose or audit the processor. This is worse, not better, than a hosted API you deliberately select.
2. **Long-form capture.** `continuous = true` does not survive a 3–10 minute narration with thinking pauses. Chrome ends the session after a few seconds of silence ([open spec issue #99](https://github.com/WebAudio/web-speech-api/issues/99), unresolved since 2021); the restart-on-`onend` workaround drops audio in the handoff gap, resets `resultIndex`, chimes on Android, and re-prompts on non-HTTPS. Chrome Android ignores `continuous` entirely. You will silently lose sentences, and the LLM downstream will never know.

**What has to change in the plan:**

- Treat transcription as a **decided architectural choice**, not a free browser feature. Pick (B) in-browser Whisper or (C) a hosted API on the merits. If confidentiality is the actual driver — and for someone narrating their business, it is — go with (B) and eat the first-load model download; validate latency on a mid-range laptop before committing.
- If you keep any Web Speech path, it must be **`processLocally: true` only**, gated on `SpeechRecognition.available({langs, processLocally: true}) === "available"`, with an explicit fallback for everyone else. Never let it silently fall back to the cloud path — `processLocally` defaults to `false`, so an unset flag *is* the cloud path.
- Own the audio buffer yourself (`MediaRecorder` / Web Audio) rather than relying on the recognizer's session lifecycle. This is required for any of the alternatives anyway and it is what makes a 10-minute narration survivable.
- Ship on HTTPS. Handle `not-allowed` / `service-not-allowed` / `audio-capture` distinctly from `no-speech`.

**What the product doc must stop claiming:**

- Stop claiming **"browser-native speech only."** As written, and as implemented by default, it is not speech-only-in-the-browser; it is speech-uploaded-to-a-third-party.
- Stop listing **"server-side or hosted transcription" as out of scope.** The chosen default *is* hosted transcription — just hosted by an unnamed party under no agreement with you. Either the scope line is wrong or the technology choice is; they cannot both stand.
- Do not replace it with "on-device speech" unless the implementation actually sets `processLocally: true` and refuses to run otherwise — and even then, the doc must say Chrome-desktop-only and describe the language-pack download the user will see.
- Any privacy or confidentiality statement made to the domain expert about where their narration goes must be re-derived from whatever is actually chosen. Right now such a statement would be false.
