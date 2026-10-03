# EcoScan AI — Demonstration Video Script

**Target length:** 4 min 40 s (hard limit 5 min)
**Language:** English narration (or English subtitles)
**Resolution:** 1920 x 1080, 30 fps
**Output filename:** `DemoVideo_EcoScanAI.mp4`
**Lead:** [Teammate C] · **Demo operator:** [Teammate A] · **Technical narration input:** [Teammate B]

> **Integrity rules for this script**
> - Every classification shown must be a real, unedited run of the deployed app. Do not stage or fake AI output.
> - Use only anonymous, permission-cleared items and images. No faces, names, or student numbers on camera.
> - Do not state accuracy, carbon savings, or user numbers that were not actually measured.
> - Fill every `[FILL IN]` field before recording.

---

## 1. One-line summary

A phone camera recognises an everyday item, and a real AI model explains how to sort it in Macau and why — turning a bin decision into a learning moment.

## 2. Cast and props

| Role | Person | Notes |
| --- | --- | --- |
| Narrator (voice-over) | [Teammate C] | Clear, slow English; ~135 words/min |
| On-screen student | [Teammate A] | Handles the phone; no face needed (hands + phone only is fine) |
| App operator | [Teammate B] | Runs the live scan; watches for network/API issues |

**Physical props:** one clean, empty plastic bottle; one aluminium can; one used AA battery (for the multi-option shot); one used tissue (for the "not recyclable" case); a table; a plain background.

**Digital props:** deployed frontend URL, a phone, a laptop for the fallback clip.

## 3. Pre-production checklist

- [ ] Backend deployed with `DEEPSEEK_API_KEY` set, `/api/health` shows `"aiConfigured": true`.
- [ ] Frontend deployed over **HTTPS** so the phone camera prompt works.
- [ ] Do 3–5 practice scans per item; keep only genuine results.
- [ ] Record a **backup screen capture** of a real successful scan (used if live network fails).
- [ ] Silence the room; use a clip-on mic or record narration separately in a quiet room.
- [ ] Confirm no API key, `.env`, or private data appears anywhere on screen.

---

## 4. Shot-by-shot script

### Scene 1 — Hook (0:00–0:18)

| | |
| --- | --- |
| **Visual** | Close-up: a hand turning a plastic bottle, unsure. Cut to a recycling bin with four openings. |
| **On screen text** | "Recycling shouldn't be a guess." |
| **Narration** | "Every day we throw things away. But for many students in Macau, one question is enough to stop us: which bin does this actually go in?" |

### Scene 2 — The problem (0:18–0:45)

| | |
| --- | --- |
| **Visual** | Quick montage: confusing labels, a mixed bin, a used tissue next to clean paper. |
| **On screen text** | "Local rules are specific. Recycling is easy to get wrong." |
| **Narration** | "Recycling rules depend on where you live. Paper that is clean can be recycled; paper that is greasy cannot. Guessing can contaminate a whole recycling stream. We wanted a tool that teaches the reason, not just the answer." |

### Scene 3 — What we built (0:45–1:05)

| | |
| --- | --- |
| **Visual** | App title screen: "EcoScan AI — See it. Sort it." |
| **On screen text** | "EcoScan AI · AI for Social Innovation · SDG 12 & 13" |
| **Narration** | "EcoScan AI is a web app. Take a photo or upload an image, and it identifies the item, suggests a recycling category based on Macau guidance, explains why, and gives you a short quiz. It is built for phones, tablets, and computers." |

### Scene 4 — Live demo, part 1: scan (1:05–1:50)

| | |
| --- | --- |
| **Visual** | Phone screen recording. Student taps the shutter, allows camera permission, centres the plastic bottle, captures. Loading screen appears. |
| **On screen text** | "Live camera · real AI scan" |
| **Narration** | "Let's scan a real bottle. We tap the camera button, allow camera access, and frame the object. We can also use Upload image if a camera is not available. When we confirm, the photo is sent to our server and then to a real AI vision model — DeepSeek's `deepseek-flash` model. The image is processed in memory and is not stored by our app." |

> **Editing note:** Show the permission prompt and the loading screen briefly so viewers see the real flow. If permission is denied during this take, keep it, and demonstrate the upload fallback — do not hide it.

### Scene 5 — Live demo, part 2: the result (1:50–2:30)

| | |
| --- | --- |
| **Visual** | Result screen. Zoom on the category badge, the recyclable status, and the confidence meter. |
| **On screen text** | "Item · Category · Confidence · Why" |
| **Narration** | "Here is the result. The app shows the item name, a suggested category, whether it is recyclable, and a confidence estimate. If the model is not sure, it says 'unknown' and asks you to check — it does not guess. Below is the decision trace: the reason for the suggestion, based only on our Macau guidance data." |

> **Optional extra shot (adds ~15 s):** scan a battery to show the multi-option result — each official Macau channel with its preparation steps, location, and source. If you add this shot, trim Scene 3 to stay under five minutes.

### Scene 6 — Education: the quiz (2:30–3:00)

| | |
| --- | --- |
| **Visual** | Tap "More information" to open Cleaning protocol, Learning signal, and the quiz. Answer the quiz; correct feedback appears. |
| **On screen text** | "Learn the reason. Then check yourself." |
| **Narration** | "This is why EcoScan AI is a learning tool, not just a scanner. Each result includes English cleaning steps, an environmental learning fact, and a one-question knowledge check with the correct answer and an explanation. Students learn the rule behind the decision." |

### Scene 7 — How the AI works (3:00–3:35)

| | |
| --- | --- |
| **Visual** | Simple architecture animation: Phone → React app → Node.js server (key hidden) → DeepSeek `deepseek-flash` → fixed JSON → Result screen. |
| **On screen text** | "Image recognition + English explanation = one AI model" |
| **Narration** | "Under the hood, three parts. The phone camera and interface are built with React. The Node.js server validates the image, keeps our API key private, and enforces a fixed response format. The AI model does two jobs at once: it reads the image, and it writes the English reason, cleaning steps, and quiz. We control its output with a carefully written prompt and strict JSON fields." |

### Scene 8 — Macau data, SDG, and honesty (3:35–4:10)

| | |
| --- | --- |
| **Visual** | Split screen: a source citation on the result page, plus the SDG 12 and SDG 13 logos. |
| **On screen text** | "Local source first · SDG 12 · SDG 13" |
| **Narration** | "Our rules come from Macau's Environmental Protection Bureau, the DSPA. We show the source and mark where a rule still needs checking, because recycling guidance can change. EcoScan AI supports Sustainable Development Goal 12, responsible consumption, and Goal 13, climate action. We are honest about limits: the model can misread blurry or mixed items, so results are guidance, not a final decision." |

### Scene 9 — Testing status (4:10–4:30)

| | |
| --- | --- |
| **Visual** | Screen capture of the automated test output and one recorded live result. |
| **On screen text** | "Unit tests: pass · Live scans recorded · Classroom testing: in progress" |
| **Narration** | "We tested the server with automated tests for validation, error handling, and response format, and we recorded real live scans. Our small student testing session is [FILL IN: completed with N participants / scheduled on date]. We do not claim numbers we did not measure." |

> **Editing rule:** Only describe testing that has actually happened. Update the spoken line and on-screen text to match the final result table in the Research Report.

### Scene 10 — Backup plan (4:30–4:45)

| | |
| --- | --- |
| **Visual** | Quick cut to the pre-recorded screen capture and a printed screenshot. |
| **On screen text** | "If the network or API fails: pre-recorded demo + screenshots" |
| **Narration** | "If the network or the AI service is unavailable during a live demo, we switch to this pre-recorded result and our screenshots, and we say clearly that it is a recording — never presented as a live scan." |

### Scene 11 — Close (4:45–4:55)

| | |
| --- | --- |
| **Visual** | App title, team names, SDG icons, repository link. |
| **On screen text** | "EcoScan AI · [Team name] · [School] · github.com/Anormalguybr/what" |
| **Narration** | "EcoScan AI. See it, sort it, and learn why. Thank you for watching." |

---

## 5. Timing summary

| Scene | Content | Duration |
| --- | --- | --- |
| 1 | Hook | 0:18 |
| 2 | Problem | 0:27 |
| 3 | What we built | 0:20 |
| 4 | Live scan | 0:45 |
| 5 | Result | 0:40 |
| 6 | Quiz / education | 0:30 |
| 7 | How the AI works | 0:35 |
| 8 | Data, SDG, honesty | 0:35 |
| 9 | Testing status | 0:20 |
| 10 | Backup plan | 0:15 |
| 11 | Close | 0:10 |
| | **Total** | **4:55** |

> If the live scan is slower than planned, trim Scene 3 and Scene 8 first. Never trim the honesty or backup scenes.

## 6. On-screen text (subtitle file content)

Provide these as burned-in captions or as an `.srt` file:

```text
1
00:00:00,000 --> 00:00:04,000
Recycling shouldn't be a guess.

2
00:00:04,000 --> 00:00:09,000
Which bin does this actually go in?

...
```

Extend this file to match the narration exactly. Keep captions short (max 2 lines, max 42 characters per line).

## 7. Narration-only transcript (for the .srt and poster QR review)

The spoken lines above, read in order, are the complete transcript. Read each scene's **Narration** cell aloud and nothing else.

## 8. Fields to fill before recording

- [ ] `[Team members: names]`
- [ ] `[School name]`
- [ ] `[Deployed frontend URL]` (only if it is live and verified over HTTPS)
- [ ] Scene 9 testing line, matched to the real results
- [ ] Confirm the repository link loads
- [ ] Confirm every `[FILL IN]` is removed
