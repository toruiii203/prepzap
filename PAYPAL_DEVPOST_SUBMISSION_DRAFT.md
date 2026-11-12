# Studenius — PayPal AI Hackathon Devpost submission draft

> **Submission integrity:** Replace bracketed placeholders with actual evidence.
> No merchant-authorized live PayPal Sandbox checkout is verified as of this draft.
> Never claim a verified capture or a production premium membership without an actual test.
> The project previously entered the Nebius x NVIDIA Global AI Hackathon.

## Project name

Studenius — AI Study Copilot with PayPal Sandbox Checkout

## Short tagline

An AI-powered study companion that turns learning materials into active recall, quizzes, tutoring and progress, with a PayPal Sandbox prototype for testing subscription checkout.

## Description (adapt to your actual live demo)

Studenius is a gamified AI learning workspace built to turn passive studying into active practice. Learners can work with study materials, generate quizzes, practice retrieval, use conversational AI tutoring and track learning progress.

Studenius already existed before the PayPal AI Hackathon and was entered in the Nebius x NVIDIA Global AI Hackathon. During this submission period the project was expanded with a separate PayPal-focused engineering branch. The new work introduces an opt-in PayPal Sandbox Orders v2 checkout flow, safer server-owned prices, order ownership verification, browser-based acceptance tests using simulated responses, and protections against unverified payment notifications.

The proposed VIP experience lets a learner choose a study plan and begin a test checkout. The backend uses PayPal Sandbox APIs to create and inspect orders and only attempts capture when the order belongs to the authenticated learner with the expected currency and amount. Sandbox captures remain clearly labeled test transactions and never grant a real paid subscription.

Studenius's AI pipeline connects NVIDIA Nemotron through Nebius Token Factory or NVIDIA NIM, with fallback to an existing Groq-backed service when needed. It supports adaptive learning tasks such as generating questions, extracting concepts and conversational tutoring.

**Status to update before submitting:** [Was the real merchant-owned PayPal Sandbox order approval and capture tested successfully? If yes, include exact test evidence; otherwise label it unverified and do not imply it works end-to-end.]

## What existed before, and what was built or changed during the submission period?

Studenius was an existing AI learning application with quizzes, tutoring, source handling, student profiles, progress tracking, and some pre-existing payment pages. It had already been submitted to the Nebius x NVIDIA Global AI Hackathon.

For this PayPal submission, the work concentrated on integrating the PayPal developer platform into a safer test checkout architecture and on hardening payment behavior. We implemented a server-side PayPal Sandbox Orders v2 prototype using server-defined PHP prices and authenticated Supabase account ownership, created sandbox-only return and capture handling, stopped an unsafe unverified legacy webhook from granting premium access, corrected premium-plan detection, and added automated security and Playwright browser tests.

The prior user interface and existing AI features were reused and extended, rather than presented as newly created from scratch. The new Sandbox integration is on branch `fix/studenius-paypal-safety-20261113` in draft PR #3. Actual provider-authorized Sandbox acceptance and production entitlement automation remain separate tasks.

## How does the project meet the main technology requirement?

**PayPal developer platform:** PayPal **Sandbox** and **Orders v2 REST APIs**. The sandbox-only Cloudflare Pages Function uses PayPal OAuth 2.0 client credentials server-side; it creates an order, fetches the order to verify the authenticated user's identifier, the plan, Philippine peso currency and server-set amount, and calls the order capture endpoint. The frontend directs learners only to an HTTPS PayPal Sandbox approval page and displays an explicit test-only result. **Live Sandbox acceptance is not yet verified**, so the submission must not claim that a successful real transaction has been demonstrated unless the user completes that test.

**AI tool/model:** NVIDIA Nemotron language models via **Nebius Token Factory** and **NVIDIA NIM**, plus the application's existing **Groq-based fallback**. The AI powers study assistance, quiz generation, concept explanation and active recall workflows.

**Other services:** Cloudflare Pages Functions for the PayPal prototype endpoint; Supabase authentication for verifying the learner's user ID. The project uses React, TypeScript and Vite.

## Additional sponsor tools

Select only tools actually used **within the PayPal hackathon submission's applicable sponsor list**. Do not list a sponsor merely because it is familiar or because it was used in the previous NVIDIA competition. If none of the listed optional sponsor tools were integrated, select the site's genuine none/other option.

## Public code repository

https://github.com/toruiii203/prepzap/tree/fix/studenius-paypal-safety-20261113

The public repo contains an MIT license, setup instructions, PayPal/AI architecture details, build/testing commands, and a dedicated Sandbox handoff document.

## Submission demonstration

**Working app:** [Paste actual public app URL after confirming the deployment includes the PayPal branch; the existing studenius.com site may still run older main code.]

**Public video:** [Paste a public/unlisted-accessible YouTube video URL after uploading an authentic recording of the live app.]

**Recommended 2–3 minute demo outline:**
- 0:00–0:25 — Studenius's study problem and the working AI dashboard
- 0:25–1:15 — Show an actual AI quiz / tutoring interaction and active recall
- 1:15–2:15 — Show the VIP plans and **only if verified**, the real PayPal Sandbox test order, approval and confirmed no-money receipt
- 2:15–2:45 — Show the safety model (authenticated order ownership, amount checks and no production charging) and close

Do not substitute mocked Playwright screenshots for a completed real-provider payment demonstration.

## Evidence and limitations

- Draft PR: https://github.com/toruiii203/prepzap/pull/3
- Passing Chromium Playwright CI: https://github.com/toruiii203/prepzap/actions/runs/43287660981
- Technical setup and limits: PAYPAL_HACKATHON_HANDOFF.md
- Earlier NVIDIA entry: https://devpost.com/software/studenius

CI uses mocked Supabase and PayPal browser fixtures. A complete developer Sandbox transaction, deployed endpoint setup, and production subscription fulfillment have not been independently verified. The project is a **Sandbox test prototype**, not a production payment service.
