# LinkedIn and résumé copy

Replace the bracketed placeholders before posting. LinkedIn doesn't render Markdown, so paste the post text as it is.

## Launch post

I built Komponent at [HACKATHON NAME]: an AI advisor that puts together a complete PC build from what's actually for sale in Cambodia.

You tell it your budget and what the PC is for, in your own words. It returns eight compatible parts with real prices from two local retailers. You can swap parts, check CPU and GPU balance, see estimated frame rates, and download a PDF report on the build.

The biggest lesson was that a good prompt isn't a guarantee.

I told the model to match CPU sockets, use the right memory and stay on budget. It mostly did. But "mostly" isn't good enough when the result is a CPU that physically doesn't fit the motherboard.

So I changed the architecture: the LLM proposes, and deterministic code verifies. The model handles what it's good at, understanding a messy request like "something quiet for 1440p, I already own a case". Then ordinary code checks every build: compatibility, memory generation, CPU and GPU balance, and budget. The model isn't even allowed to name specific CPUs or GPUs in its reply, so the text can never contradict the build on screen.

Other things I'd take into my next project:

→ Fixing one problem can create another. Merging two model calls into one left the part shortlist without a budget, and suddenly it was pairing a $74 CPU with a $965 GPU.
→ Accurate beats large. I replaced 6,170 estimated parts with 533 real local listings, and the product got better.
→ Deployment finds what development hides. Square brackets in a filename silently broke my Vercel config.

Built with React, TypeScript, Node.js, SQLite, the Gemini API and Vercel, with Claude as an AI pair-programmer. Product direction and technical decisions were mine.

[RESULT]

Try it: [LIVE URL]
Code and full decision log: https://github.com/NUON-Visessvitia/Hackathon-PC-project

#SoftwareEngineering #AI #WebDevelopment #Hackathon

## Shorter version

I built Komponent at [HACKATHON NAME]: an AI advisor that creates complete PC builds from real listings and real prices at Cambodian retailers.

The key design decision was to never let the model have the last word. Gemini interprets the request and proposes parts, then deterministic code verifies socket and memory compatibility, CPU and GPU balance, and budget before anyone sees the result.

Built with React, TypeScript, Node.js, SQLite and Vercel, with Claude as an AI pair-programmer. Product direction and technical decisions were mine.

Demo: [LIVE URL]
Code and decision log: https://github.com/NUON-Visessvitia/Hackathon-PC-project

## Projects section entry

**Name:** Komponent: AI PC Build Advisor

**Associated with:** [HACKATHON NAME]

**Dates:** September 2026

**URL:** [LIVE URL]

**Description:**

An AI advisor that turns a plain-language request into a complete, compatible PC build, using 533 real listings and prices from two retailers in Cambodia.

• Designed a validation pipeline around Google Gemini that corrects socket, memory, CPU/GPU balance and budget problems in code after each model response
• Built a React and TypeScript interface with conversational build creation, part swapping, FPS estimates and PDF reports
• Developed an Express and SQLite backend, deployed as a Vercel serverless function
• Added on-demand build reports using Google Search grounding, with a fallback when search quota is exhausted

**Skills:** React · TypeScript · Node.js · Express.js · SQLite · LLM Integration · Prompt Engineering · Vercel

## Résumé bullets

- Built and deployed a full-stack AI PC-build advisor using React, TypeScript, Express, SQLite and the Gemini API during a hackathon.
- Designed a post-processing pipeline that validates LLM output against a 533-part catalog and corrects socket, memory, performance-balance and budget errors.
- Used schema-constrained JSON output to combine intent extraction and part selection into a single model call per message.
- Replaced a 6,170-entry estimated dataset with real listings from two Cambodian retailers, including per-retailer price ranges.
- Diagnosed and resolved serverless deployment failures involving native dependencies, bundled data files and configuration glob matching on Vercel.
