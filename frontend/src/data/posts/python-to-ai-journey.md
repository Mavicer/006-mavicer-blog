---
title: "A Journey from Python Beginner to AI-Native Software Development"
date: "2026-07-28"
category: "经验分享"
tags: ["Python", "AI", "Agent", "Web开发", "成长"]
excerpt: "From my first encounter with Python to independently developing several websites — experiences, failures, and lessons learned during the past month."
published: true
sort_order: 55
---

My personal website is finally online. However, when I opened it, I suddenly realized that it still looked a little empty. So why not write a few more articles and fill it with some personal stories? Haha.

This also gives me a perfect opportunity to summarize my experiences, failures, and lessons learned during the past month — from my first encounter with Python to independently developing several websites, including my own personal blog.

At the same time, I suddenly realized that this would be a great opportunity to practice my academic English writing skills. Therefore, here is the article you are reading now.

## My First Encounter with Programming

"What? You started learning Python only after finishing the Gaokao?"

Well, that is actually true.

During high school, computer classes were probably not a serious subject. Bringing textbooks was optional, but bringing a USB drive full of games was absolutely necessary. I did not attach importance to computer science until a few days before the final qualification exam, when I nervously asked my computer teacher if I could come to school during the weekend for extra lessons.

Fortunately, everything worked out well in the end.

However, my seemingly boring summer vacation unexpectedly awakened my curiosity for technology. As someone who could never really stay idle, I started searching on Douyin and Bilibili for topics like:

"Skills that freshmen should learn before entering university."

Python appeared almost everywhere.

So, one morning, with the help of ChatGPT, I successfully configured my development environment on my Mac. From a simple `print` statement, to variables, loops, datasets, functions, modules, and unpacking techniques, I spent seven days building my programming foundation.

The most exciting moment was not learning new syntax itself, but seeing a program I wrote actually work as expected. That small but concrete sense of achievement pushed me into the next stage of exploration.

## From Small Programs to Real-World Projects

During my Python learning journey, the most enjoyable part was using newly acquired knowledge to create programs that could actually solve real problems. Soon, my project folder started filling with small applications:

- A health report analysis program
- A simulated Gaokao score checking system
- A simulated university application assistant

As my understanding improved, I continued adding new functions, including:

- An 8×8 password card verification system
- Data storage and retrieval functions
- Version upgrades from 1.0 to 2.0 and 3.0

However, I gradually became unsatisfied with programs that could only run inside the terminal. Naturally, I started exploring web development.

## Entering the AI-Assisted Development Era

This was also the moment when I encountered the concept of AI Agents.

With the mindset of "learning AI through AI," I spent an afternoon asking ChatGPT what exactly is an Agent.

At first, I used Cursor. Unfortunately, my quota ran out halfway through my first project — damn!

Eventually, I chose VS Code as my long-term development environment. For cost reasons, I selected a budget-friendly setup:

**CC Switch + DeepSeek V4 Pro**

After watching countless videos about people creating "master-level PPT generators" with AI coding tools, I naively started my first AI project:

**AI PPT Agent.**

My dream was to build something similar to WPS AI or Gamma.

Reality, however, quickly gave me a lesson.

After burning out over four hundred millions of tokens, I ended up with a 600MB unmaintainable codebase. It could not understand the core message of documents, lacked aesthetic judgment, and even the only useful image search function frequently failed, producing strange gray placeholders instead of actual images.

## The First Lesson: AI Is Not Magic

Looking back now, I understand the reason.

DeepSeek was not specifically optimized for complex image understanding tasks, and many so-called "zero-experience beginners creating professional AI PPTs" were actually relying on extremely detailed prompts copied from tools like motionsites.ai, describing layouts down to pixel-level details.

However, this failure revealed a much deeper question:

Can we simply describe a problem in natural language and expect AI to perfectly complete an entire project?

Obviously not.

AI is not a god. It does not have mind-reading abilities.

As the architect and decision-maker of a project, if I simply sit back, occasionally swiping the screen, and repeatedly click:

"Yes, continue, use auto mode."

That would actually be a rather humorous and thought-provoking situation.

## Learning to Control AI Development

After this complete failure, I started my next project:

**AI Travel Website.**

Why a travel website? The reason was simple. I happened to find a free hero section prompt from motionsites, and this project could reuse the image search system from my previous failed attempt.

However, these were not enough.

I started experimenting with methods to keep AI Agents moving in the right direction. Before implementing a new feature, I stopped directly coding and instead entered Plan Mode. I would:

1. Review the generated development plan myself.
2. Send the plan to ChatGPT.
3. Ask it to evaluate feasibility and potential problems.

The improvement was obvious.

The endless cycle of "fixing one bug and creating three new bugs" was significantly reduced.

When the output did not match expectations, I asked the Agent to inspect related files first and explain its reasoning before making modifications.

The funniest example happened when I asked it to find landscape images of Chongqing. The result? A desert image.

After checking the code, I discovered that DeepSeek was judging image relevance by analyzing visual color distribution rather than actual semantic content. After discussing the issue with GPT, I designed a new retrieval strategy and guided DeepSeek to modify the system. Finally, the feature became actually usable.

## Building a Meaningful Product

However, the travel website was only a small experiment. My real goal was to build something useful.

Therefore, after careful consideration, I started my next project:

**University Learning Platform.**

The motivation was simple. In an era of information overload, could we create a platform for university students where they could manage:

- Academic planning
- Resource discovery
- Personal development

instead of searching through countless fragmented sources?

So I started.

## Exploring Multi-Agent Development

This time, based on previous experiences, I decided to try a new approach:

**Multi-Agent development workflow.**

At first glance, it may seem like making the problem more complicated. However, if I compare myself and AI Agents to a software company, the previous single-Agent approach was like hiring only one employee.

This employee had to handle:

- Requirement analysis
- Architecture design
- Coding
- Debugging
- Optimization

This naturally created problems:

- Excessively long context
- Lack of architectural supervision
- Insufficient review
- Local optimization loops

Therefore, I imagined a different workflow. What if I hired multiple "employees"?

- One Agent could handle: requirement analysis, prompt design
- Another could focus on: architecture planning, implementation
- Another could handle: data collection
- Another could perform: testing and review

This approach could keep the project moving toward the original goal.

## Understanding the Limits of Recommendation Systems

However, new challenges appeared.

The original "personalized recommendation" feature was not simply a tag-based filtering system. It was essentially a small recommendation engine.

I first considered **Collaborative Filtering**, but quickly realized that it requires large amounts of user-resource interaction data. At the early stage of my project, there simply was not enough data to train a reliable recommendation model.

I also experimented with lightweight local models. However, I discovered that:

LLMs are excellent at semantic understanding and explanation, but they are not perfect replacements for traditional recommendation algorithms. Using them directly for resource ranking often introduced hallucinations.

Therefore, I temporarily abandoned the advanced recommendation system.

But I will come back to it!

## Learning Security Through Reverse Engineering

After seeing Vito Wang's personal blog, I became eager to create my own blog. Unfortunately, I could not find the same template.

So I had an idea:

Why not reverse engineer the frontend and recreate it?

Using a multi-Agent workflow, I successfully reproduced the website template almost 1:1.

However, this experience gave me another important realization:

If I can analyze someone else's system, others can analyze mine as well.

Therefore, I started paying attention to website security. I learned that sensitive information, such as API keys, should never be exposed in frontend code. Instead, they should be stored securely on the backend.

I also began considering:

- Input validation
- Permission control
- Data isolation

A website is not only about appearance and functionality; it must also be reliable and secure.

## Managing AI's Cognitive Cost

After several days of experimenting with AI-assisted development, I gradually discovered ways to reduce token consumption.

If an Agent needs to read the entire project every time:

- Token usage increases dramatically
- Response speed decreases
- Important information becomes harder to identify

Therefore, I started optimizing my Agent workflow. I created project context documents, such as:

- `README.md`
- `ARCHITECTURE.md`
- `DEVELOPMENT.md`
- `TODO.md`

With these documents, Agents do not need to repeatedly analyze the entire project. They can quickly recover the necessary context.

For multi-Agent collaboration, maintaining consistent project understanding is equally important. Therefore, communication documents such as `COMMUNICATION.md` can help different Agents exchange information and coordinate tasks.

In the AI era, excellent software engineering is not only about managing code. It is also about managing AI's cognitive resources.

## Looking Forward

Looking ahead, I will continue exploring how to integrate AI APIs into websites and build truly intelligent recommendation systems. I also want to explore how Agents can maintain project understanding even after losing previous context.

Looking back, my biggest achievement is not learning how many frameworks or tools. Instead, I gradually developed an engineering mindset:

Software development is not simply making programs run. It is the process of designing reliable, maintainable, and scalable systems under limited resources and complex environments.

Of course, I am still far away from becoming a real software engineer. During my four years at university, I hope to maintain this curiosity and continue exploring.

In the rapidly developing AI era, I want to become someone who not only uses tools, but also creates tools.
