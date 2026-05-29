---
created: 2026-05-29T13:23
last_modified_at: 2026-05-29T13:24
---
# Build Spec: Success Signal Analysis

Build a simple web app called **Success Signal Analysis**.

Tagline: **Find the signal hiding in your past campaigns.**

## Purpose

Email marketers already have analytics, but analytics do not explain why their best campaigns worked.

This tool helps Kit users analyze their recent broadcasts, identify behavior patterns behind their strongest campaigns, and generate evidence-backed recommendations for what to repeat, stop doing, and test next.

## Core User Workflow

1. User visits the website.
2. User enters their Kit API key / secret (we should probably use oauth for this, I'm guessing that is how kit wants it)
3. User answers a few short questions about their goals.
4. App retrieves recent Kit broadcasts and available metrics.
5. App analyzes top and bottom performers based on the user’s stated success goal.
6. App generates a **Success Signal Analysis** report.
7. User can copy/download the report.

## Important Scope

Version 1 should focus on **Kit email broadcasts**.

If purchases/orders are available through the Kit API and the user says their goal is sales, include purchase/revenue data in the analysis. If purchase data is unavailable, gracefully explain that revenue data could not be retrieved and continue with broadcast metrics.

Do not build landing page, form, or full-funnel analysis yet.

## Data Sources

Use the Kit API.

Prefer API v4 where available. Kit recommends API v4 for new projects and says v3 is deprecated, though v3 still documents broadcast list, retrieve, and stats endpoints. Use whichever endpoints are easiest and reliable for the build. Kit’s API supports broadcasts, subscribers, purchases, and improved subscriber stats in v4. Research this more to be sure.

Relevant documented v3 broadcast endpoints:
- `GET /v3/broadcasts`
- `GET /v3/broadcasts/{broadcast_id}`
- `GET /v3/broadcasts/{broadcast_id}/stats`

Broadcast stats can include recipient count, open rate, click rate, unsubscribe count, total clicks, status, and send progress.

## Environment Variables

Use:
- `OPENAI_API_KEY`
- optionally `KIT_API_BASE_URL`
- optionally `DEFAULT_MODEL`

Do not store the user’s Kit API key permanently. (again, we are probably going to be using oauth)

## Recommended Tech Stack

Use a simple stack:
- Next.js or Vite/React
- Server-side API routes for Kit and OpenAI calls
- Tailwind or simple CSS
- No database required for v1

The app can keep session state in memory or browser state (should also email responses using optimizationdoc's resend account)

## Pages

### Home Page

Headline:

**Find the signal hiding in your past campaigns.**

Subheadline:

**Success Signal Analysis reviews your recent Kit broadcasts, compares your winners and losers, and turns your past performance into evidence-backed marketing experiments.**

Form fields:
- Kit API key / secret
- OpenAI key only if needed; otherwise use server env var
- Number of broadcasts to analyze, default 20
- Primary goal:
  - More opens
  - More clicks
  - More sales
  - More replies/engagement
  - Lower unsubscribes
  - Other
- Business model:
  - Creator/newsletter
  - Coaching/consulting
  - Course/product sales
  - SaaS
  - Podcast/media
  - Other
- Briefly describe what you are trying to accomplish with your email list.
- Which recent campaign surprised you, if any?
- What do you believe is already working?

Button:
**Analyze My Campaign Signals**

### Loading State

Show clear stages:
1. Connecting to Kit
2. Retrieving broadcasts
3. Retrieving broadcast details
4. Retrieving broadcast stats
5. Comparing winners and losers
6. Generating Success Signal Analysis

### Results Page

Title:

# Success Signal Analysis

Sections:

## Executive Summary

3-5 bullets summarizing the strongest findings.

## Your Success Goal

Restate what the user said they are optimizing for.

## Campaigns Analyzed

Show a simple table:
- Subject
- Send date
- Recipients
- Open rate
- Click rate
- Unsubscribes
- Revenue/purchases if available
- Success score

## Top Performers

List top 3-5 based on the user’s goal.

## Bottom Performers

List bottom 3-5 based on the user’s goal.

## Success Signals Detected

For each signal:

### Signal Name

Example: “Story-first emails appear to drive more clicks.”

### Evidence

Must cite specific campaign evidence.

Example:
- 4 of the top 5 campaigns used a personal story opening.
- Only 1 of the bottom 5 campaigns did.
- Story-first campaigns averaged 2.8% click rate vs. 1.1% for non-story campaigns.

### Why This May Matter

Explain in plain language.

### Related Marketing Principle

Use hybrid knowledge:
1. First rely on the user’s actual data.
2. Then connect to curated marketing principles.
3. Then use general LLM knowledge cautiously.

Possible frameworks:
- StoryBrand
- Russell Brunson / Epiphany Bridge
- Direct response marketing
- One clear CTA
- Curiosity-driven subject lines
- Relationship-before-transaction email marketing
- Specificity beats generality
- Audience trust and consistency

Do not claim the framework proves the result. Say “this is consistent with...” or “this resembles...”

### Recommended Experiment

Give one concrete test.

Example:
“Send three story-first emails with one CTA and compare click rate against your previous 10-campaign average.”

### Confidence Level

Use:
- High
- Medium
- Low

Explain why.

## What To Repeat

Evidence-backed actions the marketer should keep doing.

## What To Stop Doing

Evidence-backed actions the marketer should reduce or stop.

## Next 30-Day Experiment Plan

Give 3 simple experiments:
- Experiment
- Why
- How to measure
- What would count as success

## Data Limitations

Be transparent:
- Kit API fields may vary.
- Revenue/purchase data may not be available.
- Open rates are imperfect because of privacy changes.
- Correlation is not causation.
- Recommendations should be treated as experiments.

## Core Analysis Logic

The user defines success.

If goal is **More opens**:
- prioritize open rate
- compare subject lines, send timing, topic, preview, audience size

If goal is **More clicks**:
- prioritize click rate and total clicks
- compare CTA clarity, number of links, story usage, offer type, email length

If goal is **More sales**:
- prioritize revenue/purchases if available
- otherwise use clicks as proxy and note limitation

If goal is **Lower unsubscribes**:
- prioritize unsubscribe rate
- identify campaigns that may have caused audience mismatch, over-promotion, unclear value, or frequency issues

Create a success score based on the selected goal.

Example:
- Opens: open rate
- Clicks: click rate
- Sales: revenue per recipient or purchase rate
- Lower unsubscribes: inverse unsubscribe rate
- Other: ask the AI to infer a reasonable scoring method from the user’s stated goal and explain it

## Feature Extraction

For each broadcast, have AI or code classify:

- Topic
- Primary CTA
- Number of CTAs
- Number of links
- Approximate word count
- Subject line style:
  - curiosity
  - direct benefit
  - personal
  - urgent
  - question
  - announcement
- Email style:
  - personal story
  - educational
  - promotional
  - curated links
  - announcement
  - case study
- Tone:
  - personal
  - authoritative
  - urgent
  - conversational
  - inspirational
- Offer type:
  - free resource
  - paid product
  - consultation
  - content only
  - event
  - none
- Timing:
  - day of week
  - time of day if available

## Required “Failure and Adjustment” for Interview Demo

Build in a visible development story:

Initial approach:
- The first prompt only looked at metrics and generated generic advice.

Problem:
- The output sounded like generic email marketing advice.

Adjustment:
- Add a marketer-intent interview.
- Add winner-vs-loser comparison.
- Require every recommendation to cite evidence from the actual campaigns.
- Add “Related Marketing Principle” only after campaign evidence.

This should be real in the code/prompt history if possible.

## Prompting Structure

Use at least two AI calls if practical.

### AI Call 1: Campaign Feature Extraction

Input:
- Campaign subject
- Campaign content
- Stats
- User goal

Output JSON:
```json
{
  "campaign_id": "",
  "subject": "",
  "summary": "",
  "topic": "",
  "primary_cta": "",
  "cta_count": 0,
  "link_count": 0,
  "word_count": 0,
  "subject_style": "",
  "email_style": "",
  "tone": "",
  "offer_type": "",
  "story_present": true,
  "notes": ""
}```

### **AI Call 2: Success Signal Analysis**

System prompt:
```
You are an evidence-first marketing analyst.

Your job is to help a marketer discover the repeatable behaviors behind their best-performing Kit email broadcasts.

Do not give generic advice. Every major recommendation must be grounded in campaign evidence.

Reason from:
1. The user’s stated success goal.
2. The campaign performance data.
3. The campaign content analysis.
4. The marketer’s stated context.
5. Curated and general marketing principles.

When referencing marketing frameworks, do not overclaim. Use language such as “this is consistent with...” or “this resembles...”

Open rates are imperfect. Correlation is not causation. Treat recommendations as experiments.

Output a practical Success Signal Analysis report.
```

User prompt should include:

- User goal
- Business model
- User context answers
- Campaign stats
- Extracted campaign features
- Top performers
- Bottom performers

Required output:

- Executive summary
- Success goal
- Top performers
- Bottom performers
- 3-5 success signals
- Evidence for each signal
- Related marketing principle
- Recommended experiment
- Confidence level
- What to repeat
- What to stop doing
- 30-day experiment plan
- Data limitations

## **UX Details**

Keep UI simple.

No login.

No database.

Warn users:  
“Your Kit API key is used only to retrieve campaign data for this analysis and is not stored.”

Provide:

- Copy report button
- Download markdown button
- Re-run analysis button

## **Error Handling**
Use the error message skill to make these better. 
Handle:

- Invalid API key
- No broadcasts found
- Fewer than 5 broadcasts
- Stats unavailable
- Purchases unavailable
- OpenAI API error
- Kit API rate limit
- Empty campaign content

If fewer than 5 broadcasts:

- Still generate analysis
- Mark confidence as low

## **Acceptance Criteria**

The finished app should:

1. Accept a Kit API key (or oauth)
2. Retrieve recent broadcasts.
3. Retrieve broadcast details and stats.
4. Ask the user their success goal and context.
5. Score campaigns based on the chosen goal.
6. Compare top and bottom performers.
7. Generate a Success Signal Analysis report.
8. Include evidence for every major recommendation.
9. Include related marketing principles without overclaiming.
10. Include a next 30-day experiment plan.
11. Allow the report to be copied or downloaded.
12. Avoid storing the Kit API key.

## **Demo Script For Stripe Assignment**

Use this app as the homework project.

In the video, show:

### **1. Workflow today**

A Kit creator looks at open rates and click rates but does not know why certain emails worked.

Pain:

- Metrics are visible, but meaning is not.
- Best practices stay implicit.
- The marketer guesses what to do next.

### **2. Building process**

Explain:

- Started with a basic campaign review.
- Output was too generic.
- Adjusted by comparing winners vs. losers.
- Added marketer goals.
- Required evidence for every recommendation.
- Added marketing frameworks only after campaign evidence.

### **3. Working demo**

Show:

- Entering Kit API key
- Choosing success goal
- Pulling campaigns
- Generating Success Signal Analysis
- Reviewing evidence-backed signals
- Copying/downloading the report

### **4. Prompts and link**

Share:

- Link to working app
- Link to GitHub repo or code
- Prompts used for feature extraction and report generation