-- Seed 5 static markdown posts into D1 (slug matches frontend filenames).
-- Run AFTER schema.sql. Idempotent via INSERT OR IGNORE.

-- finding-direction
INSERT OR IGNORE INTO post (slug, title, date, excerpt, source, category, tags, body, published, sort_order, created_at, updated_at) VALUES ('finding-direction', '在不确定的夏天，寻找自己的方向', '2026-07-27', '高中结束了，新的世界正在展开。在期待与迷茫之间，我试着写下现在的自己。', 'online', '随笔', '成长,AI,大学', '
2026 年的夏天，我站在人生一个陌生的入口。

高中结束了，那个曾经被成绩、排名、考试填满的世界逐渐远去，而新的世界正在展开：大学的课程、国际化环境，优秀的同学，以及一个完全未知的未来。

奇怪的是，我并没有想象中那么兴奋，更多的是一种复杂的情绪——期待，也迷茫。

我即将进入一个中外合作办学项目，这是一条从未设想过的道路。未来几年，我会面对更高强度的学习、更复杂的环境，以及一群可能比自己更加优秀的人。

有时候，我会忍不住想："如果他们都在快速成长，而我停留在原地怎么办？""如果我的英语跟不上怎么办？""如果四年以后，我没有达到自己期待的高度怎么办？"

这种不确定感，会在夜深的时候突然出现。它不像高中时期那种明确的压力——目标在那里，只需要努力靠近。大学更像是一片没有地图的森林，你必须自己决定方向。

但回头看高中三年，我发现自己最大的变化，并不是知识增加了多少，而是慢慢理解了一个以前不太明白的词：谦卑。

曾经的我可能更关注证明自己——证明自己的能力，证明自己的想法正确。但随着见识越来越多，我开始意识到，世界远比想象中广阔。总有人比你优秀，总有人在你不知道的地方默默努力。真正重要的，不是急着成为那个"最厉害的人"，而是保持学习的姿态，保持对未知的敬畏，承认自己的不足，并愿意不断向前。

这一年，我也越来越清楚自己为什么喜欢 AI。很多人说 AI 是未来的趋势，但对我来说，它并不只是一个工具，它更像是一扇窗。当我第一次真正接触 AI 时，我感受到了一种过去很难想象的可能：一个普通的人，也可以拥有接近无限的信息和知识。它可以回答我的问题，可以帮助我解决学习上的困惑，可以陪我讨论未来的方向，甚至在一些迷茫的时候，它愿意倾听我的想法。它让我第一次感觉：信息差正在被缩小，一个人的边界，也许正在被重新定义。

过去的一段时间，我做了很多看起来"不一定有意义"的事情。写网站，尝试 AI Agent，研究本地模型，浏览 GitHub 上各种优秀项目，有时候甚至只是坐在那里，用 AI 辅助完成一些代码。现在回头看，这些项目本身可能并没有创造多大的实际价值，但那个过程很珍贵。因为在一次次尝试中，我似乎看见了一点未来的样子——未来的软件开发，未来的人机协作，未来一个普通人创造东西的方式。也许未来真正重要的能力，不只是写代码，而是拥有发现问题、利用工具、创造价值的能力。

有时候，我觉得自己是一个矛盾的人。别人可能觉得我是一个比较理性的人——喜欢研究技术，喜欢分析参数，喜欢比较产品，甚至会买一些看起来昂贵的数码产品。但其实很多时候，我都会反复比较，计算价值，思考每一笔花费是否值得。我喜欢新技术，但我也喜欢钢琴、摄影、古典音乐；我喜欢探索未知，但偶尔也会陷入焦虑；我看起来一直在折腾各种东西，但其实内心也会迷茫。也许这就是现在的我，一个正在成长，但还没有找到最终答案的年轻人。

最近的生活其实很简单。上午十点起床，练一会儿英语口语，但进步似乎没有想象中明显。下午打开电脑，开始一次新的 vibe coding，或者浏览 GitHub，看那些优秀开发者创造的作品，从中找点灵感。偶尔停下来，看着自己做出来的网站，会突然觉得："好像还不错。"然后伸个懒腰，去冰箱里翻出一个饭团，重新获得一点动力……

如果五年后这篇文章还在，这个网站还在运行，看到这篇文字的自己，希望你已经慢慢找到了属于自己的方向。希望你不再因为未知而过度焦虑，希望你依然保持好奇，依然愿意学习，依然愿意接触新的技术。但更希望你没有忘记：不要只追求成为一个厉害的人，成为一个温暖的人，一个能够帮助别人、创造价值的人，成为一个不会辜负自己，也不会辜负父母期待的人。

现在的我，可能还没有答案。我不知道未来会进入怎样的环境，不知道自己能不能保研，不知道几年后的自己会成为怎样的人。但至少，我知道一件事情：我愿意继续探索，愿意接受自己的不足，愿意保持谦卑。

因为也许只有在承认自己渺小的时候，我们才拥有无限成长的可能。

2026.07.27 凌晨

写给那个正在寻找方向的自己。
', 1, 60, '2026-07-30T00:00:00Z', '2026-07-30T00:00:00Z');

-- industry-cycle
INSERT OR IGNORE INTO post (slug, title, date, excerpt, source, category, tags, body, published, sort_order, created_at, updated_at) VALUES ('industry-cycle', '从高考志愿看产业周期', '2026-07-29', '为什么一个行业最容易被所有人看好的时候，往往也是竞争开始加剧的时候？狂热与崩盘之间，普通考生还能抓住什么？', 'online', '思考', 'AI,高考志愿,资本周期', '
这篇文章的灵感，来自近几年高考志愿中的一个非常明显的现象：越来越多的热门工科专业，正在经历疯狂涨分。人工智能、计算机科学与技术、电子信息、自动化、集成电路——这些曾经只属于少数人的专业，如今正在成为无数高分考生争夺的目标。很多高校的计算机相关专业录取分数线，甚至已经超过学校的一些传统王牌专业。

在志愿填报现场，家长讨论最多的话题也从过去的"哪个专业稳定？"变成"AI是不是未来？""计算机还能不能吃十年红利？""现在学人工智能，会不会错过最后一班车？"

这种现象其实非常有意思。因为它让我想到一个问题：为什么一个行业最容易被所有人看好的时候，往往也是竞争开始加剧的时候？

很多人认为，选择专业就是按照当下热点选择一个未来就业方向。但实际上，高考志愿更像一次特殊的投资。因为学生选择专业的时候，面对的是一个信息滞后的市场：资本市场可能已经提前发现趋势，企业可能已经开始调整战略。但是普通家庭接收到的信息，往往需要几年之后才会发生变化。这和金融市场非常类似——股价上涨之前，往往是企业基本面先改善，而大众开始讨论股票的时候，行情可能已经运行了一段时间。

专业选择也是如此：行业先变化，资本先行动，企业先扩张，最后才会传导到媒体 → 家长 → 考生 → 高考分数线。几乎没有行业会一直风光，但是几乎所有行业都会经历一个从上行到顶峰，最后趋于稳定的周期。

以 AI 为例，现在人们对 AI 的态度已经分化为两个极端：一半人在尖叫说 AI 是历史上最大的泡沫，而另一半人则在赞颂说这是人类历史上最伟大的突破。但这些人都狭隘地以用户增长率和使用人数试图窥视整个行业的发展前景，即**需求端视角**。固然，需求是重要的，因为有需求才会有市场，但需求端也恰恰是最具欺骗性的一端。需求可以通过营销来伪造，但供给端，才是真金白银真正流向，也最具有参考价值的一面。

因此，当我们忽略需求端的噪音，只关注那些真正掌握一手信息的投资商手中金钱的流向，这就是**资本周期理论**：它分为四个周期——**涌入、狂热、崩盘、继承**。想法很简单，回报是由供给驱动的，而不是需求。

那么，关于钱，有两个非常重要的数据：一个叫做**头部企业资本开支**，而另一个叫做**行业人均净利润**。这一次，就拿计算机行业来举例。

以 2010 年到 2025 作为这一轮的周期来看。2010 年，计算机被列为红牌专业（就业率低、失业率高、工资低），资本悄悄进场扩产，而普通人还未察觉。腾讯控股 2010 年资本开支约 20 亿元，而到了 2013 年快速增长至 87 亿元；阿里巴巴 2012 年行业投资约 10 亿元，2013 年则疯涨至 40 亿元。2012 年全行业利润总额增速持续高于从业人员增速，人均净利润从底部逐渐回升。两个数据稳定同步增长，这些在当年都可以通过各种渠道查询。但是大众认知里的计算机，还是"修电脑"的红牌专业，高考分数线也还在低位。而这所谓的大众认知与高考分数，正是典型的**滞后指标**。此时**先行指标**已经转向，**滞后指标**还未跟上——这便是周期的黄金入场点。

而接下来，涌入期的结尾，便是狂欢的序幕。腾讯控股在 2018 年到 2021 年的资本开支维持在 540–665 亿的高位区间，在 2020 年达到峰值的 665.99 亿，在 2021 年稍有回落至 625.65 亿，增速第一次出现正转平。再来看阿里巴巴，2019 年到 2022 年的资本开支一直维持在 430–530 亿的高位，在 2022 年达到 533.24 的阶段性峰值，之后又正转平，略有下滑。

再来看行业人均净利润。根据工信部发布的权威数据，2020 年全行业利润总额达到了 10676 亿元，从业人数 704.7 万人，人均净利润为 15.15 万元。2021 年全行业总利润 11875 亿元，从业人数 809 万，人均净利润下滑至 14.68 万元，首次出现回落。收入还在涨，人均利润已经开始下滑，说明人力供给的扩张速度已经超过了利润增长的速度。此时，计算机专业分数线逐年上涨，毫无下降趋势，转码培训班遍地开花。然而，供需过剩的警钟已然敲响，2023 年，计算机行业迎来了史无前例的全民裁员潮。

崩盘期开始，资本开支和行业人均净利润连年下滑，最终在 2025 年回暖，趋于稳定。供需重新平衡，进入继承期。

如果我们只是重复计算机的故事，那这篇文章没有意义。关键在于，这次周期不一样的地方在哪里。

大量企业开始重新评估初级岗位的必要性，尤其是在代码生成、数据分析、内容生产等高度标准化领域。AI 并没有简单替代整个行业，而是在改变行业内部的人才结构。一个残酷的悖论正在形成：AI 行业本身在大举招人，但 AI 同时在消灭大量入门级岗位。当 AI 能写代码、能做数据分析、能生成文案时，那些刚毕业、只会基础技能的应届生，恰恰是最容易被替代的群体。

2010 年计算机是红牌专业，抄底的人赚到了；2025 年 AI 专业分数线暴涨，追高的人可能要站岗。资本周期的铁律是：**当所有人都知道一个行业赚钱时，这个行业已经快不赚钱了。** 亚当·斯密早就说过，资金会流向高回报行业，带来更多竞争者，最终压低所有人的回报。AI 专业分数线越高，意味着供给越汹涌，未来竞争越惨烈。

但这不意味着 AI 不能学，而是说——单纯靠"选 AI 专业"躺赢的时代已经过去了。接下来赢的，不是最早进场的人，而是最懂怎么用 AI 解决具体问题的人。

国务院 2025 年 8 月印发的《关于深入实施"人工智能+"行动的意见》明确提出，推动人工智能与经济社会各行业各领域广泛深度融合。注意关键词——"+"，不是"AI 本身"，而是"AI 赋能一切"。未来最值钱的能力，不是会调参、会训练模型（这些 AI 自己越来越会做），而是知道在哪个行业、哪个场景、哪个环节用 AI 创造出真实价值。法律 AI 2025 年融资超 50 亿美元，医疗垂类 AI 超 40 亿美元，而通用大模型公司的外部融资额同比持平甚至下降。专业投资者已经把重心转向"垂直 AI 应用"。这意味着，懂法律又懂 AI 的人，比只懂法律的人值钱；懂医疗又懂 AI 的人，比只懂医疗的人值钱。

我们必须把**不可替代性**当作大学四年的核心 KPI。什么是不可以被 AI 替代的？复杂决策、跨领域整合、人际沟通、创造性思维、对行业的深度理解。这些能力不是上一门 AI 课能解决的，需要在具体场景中浸泡、在真实问题中磨砺。

斯坦福 2026 年的研究显示，在容易受到 AI 影响的职业中，年轻员工的就业人数明显下降，资深员工却相对稳定。为什么？因为资深员工的价值不在"会做什么"，而在"知道什么该做，怎么做更好"。

因此，**别把宝押在一个技能上**。行业在精简，但留下来的人更值钱了。那些只会写 CRUD、只会调接口的人被淘汰了，留下来的是能解决复杂问题的人。AI 时代同理——只会用 AI 工具的人会被淘汰，能用 AI 创造新价值的人会留下来。

关注滞后指标与先行指标的背离。现在 AI 专业分数线在涨，这是滞后指标。先行指标是什么？是资本开支的增速是否开始放缓，是行业人均利润是否开始下滑，是头部企业是否开始削减 AI 预算。投资者不再满足于"我们在投 AI"的故事，开始追问"什么时候能赚钱"。翻译成大白话：AI 行业现在烧的钱，需要未来每年产生更多的新收入才能还上债，而目前，绝大多数 AI 应用还在赔钱。这个信号，值得每一个准备跳进 AI 浪潮的人认真对待。

2000 年的互联网泡沫就是如此。互联网技术没有错，错的是：所有人认为，只要和互联网有关，就一定拥有价值。最后留下来的，是亚马逊、谷歌、腾讯、阿里……而不是所有当年的互联网公司。AI 时代也一样——未来留下来的，不会是所有 AI 企业，也不会是所有 AI 专业的学生，而是真正提高生产效率的企业与人才。

资本周期四个阶段——涌入、狂热、崩盘、继承——会一遍又一遍地上演。2010 年的计算机行业如此，2026 年的 AI 行业也不会例外。区别在于，计算机行业从 2010 年的红牌专业到 2021 年的巅峰，再到如今的稳定，走了一轮完整的周期，大约十五年。AI 行业从 2023 年 ChatGPT 引爆，到 2025–2026 年资本开支增速出现明显边际放缓的信号，周期的节奏可能只需三四年。周期的节奏在加快，留给普通人反应的时间在缩短。

"高考志愿是一次对产业周期的投资"这句话的真正含义是：不要在涌入期追高，不要在崩盘期恐慌，要在别人还没看懂的时候布局，在别人狂热的时候保持清醒。

AI 不会消失，就像计算机没有消失一样。但 AI 行业的红利，不会平均分配给每一个冲进来的人。AI 领域高端人才（博士、顶级算法工程师）仍然极度稀缺，而"普通 AI 专业毕业生"可能过剩。只有那些看清周期、选对赛道、构建不可替代性的人，才能穿越周期的起伏，留在牌桌上。

而大多数人，会在涌入期欢呼，在崩盘期抱憾离场，然后在下一个周期重新开始——一模一样的故事，换了个主角而已。

不要用后视镜开车——别只看过去几年什么专业火。周期不会奖励盲目的追随者。当所有人恐惧的时候，需要有人看到未来。当所有人狂热的时候，需要有人保持清醒。

因为真正决定一个人价值的，从来不是他是否站在风口，而是在风口到来之前，是否已经准备好了自己的能力。风会改变方向，行业会经历周期，但是那些能够理解趋势并且拥有创造价值能力的人，无论身处哪个时代，最终都会找到属于自己的位置。
', 1, 65, '2026-07-30T00:00:00Z', '2026-07-30T00:00:00Z');

-- python-to-ai-journey
INSERT OR IGNORE INTO post (slug, title, date, excerpt, source, category, tags, body, published, sort_order, created_at, updated_at) VALUES ('python-to-ai-journey', 'A Journey from Python Beginner to AI-Native Software Development', '2026-07-28', 'From my first encounter with Python to independently developing several websites — experiences, failures, and lessons learned during the past month.', 'online', '经验分享', 'Python,AI,Agent', '
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

After seeing Vito Wang''s personal blog, I became eager to create my own blog. Unfortunately, I could not find the same template.

So I had an idea:

Why not reverse engineer the frontend and recreate it?

Using a multi-Agent workflow, I successfully reproduced the website template almost 1:1.

However, this experience gave me another important realization:

If I can analyze someone else''s system, others can analyze mine as well.

Therefore, I started paying attention to website security. I learned that sensitive information, such as API keys, should never be exposed in frontend code. Instead, they should be stored securely on the backend.

I also began considering:

- Input validation
- Permission control
- Data isolation

A website is not only about appearance and functionality; it must also be reliable and secure.

## Managing AI''s Cognitive Cost

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

In the AI era, excellent software engineering is not only about managing code. It is also about managing AI''s cognitive resources.

## Looking Forward

Looking ahead, I will continue exploring how to integrate AI APIs into websites and build truly intelligent recommendation systems. I also want to explore how Agents can maintain project understanding even after losing previous context.

Looking back, my biggest achievement is not learning how many frameworks or tools. Instead, I gradually developed an engineering mindset:

Software development is not simply making programs run. It is the process of designing reliable, maintainable, and scalable systems under limited resources and complex environments.

Of course, I am still far away from becoming a real software engineer. During my four years at university, I hope to maintain this curiosity and continue exploring.

In the rapidly developing AI era, I want to become someone who not only uses tools, but also creates tools.
', 1, 55, '2026-07-30T00:00:00Z', '2026-07-30T00:00:00Z');

-- vpn-guide
INSERT OR IGNORE INTO post (slug, title, date, excerpt, source, category, tags, body, published, sort_order, created_at, updated_at) VALUES ('vpn-guide', '翻墙教程：不同操作系统，该如何以最少的成本部署稳定的VPN', '2026-07-26', '详细整理了 iOS、Android、Mac/Windows 不同操作系统下以最少成本部署稳定 VPN 的完整方案。', 'online', '经验分享', 'VPN,教程,Clash', '
在最最最伟大且帅气的 wzh 学长的指导下，我在高三第一次接触到了 VPN，并被 Gemini Pro 强大的多模态识别能力与 ChatGPT 领先时代的推理分析能力所震撼。AI 时代，如何快速接触到最新一代的大模型并将其为己所用已经成为了一种不可或缺的能力。然而，受限于国内互联网的保护，我们往往无法直接访问 OpenAI，Google 等国外网站，因此，本文详细整理了自己已知的不同系统的翻墙方式，希望能帮到大家，如有疏漏或有更优方案，欢迎补充与讨论！

## for iOS

### 一、准备一个外网 Apple ID（最好是美国）

这里为大家提供两种方案备选：

1. 前往 [https://www.id601.com](https://www.id601.com) 该网站售卖各式各样的 Apple ID，亲测质量很高，但是部分商品价格过高，建议购买私人独享账号（一定一定要已经购买了小火箭（shadowrocket）的账号，不然后面还要再买）
2. 前往 [https://account.apple.com](https://account.apple.com) 右上角折叠的小三角符号，点开创建新 Apple ID，填写个人信息，国家美国，电话可以留国内 +86 的，但是此方案有一个前提——必须拥有一个自己的谷歌账号，如果没有，建议找已有 VPN 的同学帮忙先注册一个或者返回方案一。

### 二、下载小火箭（shadowrocket）

拥有了一个海外 Apple ID 后，直接打开手机设置，点开最上面的头像进入账号设置，点击"媒体与购买"（Media & Purchases），然后"退出登录"（Sign Out），重新点击选择"媒体与购买"，选择"不是你本人"那个选项，输入前面准备的 Apple ID 账号与密码（注意 ⚠️，如果是购买的共享账号，很可能触发 Apple 的风控，所以一定要买完立马登录，如果晚了就白买了）

登录好了？一定看好了是"媒体与购买"那个选项哈，要是选择了下面那个 Sign in with Apple 就麻烦了（乐）

那么好，下一步，如果是氪金大佬直接买了独享账号的，去 App Store 下载"Shadowrocket"与"ChatGPT""Gemini""YouTube""Ins"等任意你想要下载的软件，下载完登录回原来的账号，第二步完成。

如果是自己注册的新外区账号，需要在淘宝等电商平台购买礼品卡为账户进行充值，购买小火箭，其余与前面相同，不再赘述。

### 三、购买 VPN 节点与流量

前往 [congyu.moe](https://congyu.moe) 这是笔者目前已知的性价比最高的网站，简单使用 QQ 邮箱注册后购买里面的 100GB，有效期一年的 19.8 元流量包，然后下滑，找到一个"一键导入 clash，跳转到小火箭，成功了！

然后小火箭里面还有一些简单的设置环节，在这里就不展开了，大部分是一些权限问题，如有问题可以向 AI 求助。

## for Android

### 一、下载 v2ray

前往 [congyu.moe](https://congyu.moe)，简单使用 QQ 邮箱注册后购买里面的 100GB，有效期一年的 19.8 元流量包，然后下滑，找到"工具下载"，下载"安卓用户 v2ray"的安装包，跟着指引下载好就行。

### 二、导入订阅链接

还是在 congyu.moe 里，复制 v2ray 家族的订阅链接，去到 v2ray 软件里粘贴链接，成功了！（如果订阅链接无法导入，请将链接当中的 `excellent.congyusub.top` 替换成 `congyu.moe`）

## for Mac/Windows

### 一、下载 Clash Verge Rev

前往 [GitHub Releases 页面](https://github.com/clash-verge-rev/clash-verge-rev/releases) 下载自己电脑对应的版本，千万别下错了：

- **Windows 普通电脑（Intel/AMD）**：`x64-setup.exe`（64 位安装版）
- **Mac 电脑（M1 及后续型号）**：`arm64`

### 二、导入订阅链接

依旧打开 congyu.moe，点击"一键导入 clash"，这一步很可能失败，是因为该过程需要用到外网服务器，因此应在 VPN 环境下操作（用刚才配置好 VPN 手机的热点）。

## 故障排查

配置好 VPN 后，还需要进行少量必要的调试，以达到稳定使用和节约流量的目的，其中电脑端的 Clash Verge Rev 故障率明显高于手机端，已知的有：

- 使用腾讯会议时由于网络连接请求率飙升，导致 mihomo 内核掉入循环，CPU 占用率飙升，此时只有去终端中强行终止 `verge-mihomo` 进程才能解决故障，并在软件中重启内核。
- Mac 端有时还会出现大量节点不可用的情况，目前没有已知解决方式，关闭虚拟网卡模式，重启内核，切换全局模式等方法可能有效。

## 写在最后

以上内容仅代表个人目前的使用经验与理解，受限于不同地区网络环境、设备型号以及服务商策略，具体效果可能存在差异。如果你在使用过程中遇到了新的问题，或者发现了更加稳定、低成本的方案，也欢迎交流与补充。

互联网最大的价值之一，就是让知识与信息能够自由流动。在 AI 快速发展的今天，能够合理利用全球范围内的优质工具，获取最新的技术资料、学习资源与创新思路，正在逐渐成为一种重要能力。当然，工具本身并不是目的，真正重要的是我们如何利用这些工具提升学习效率、拓展认知边界，并创造属于自己的价值。

希望这篇文章能够帮助刚刚接触这一领域的同学少走一些弯路，也希望大家在探索互联网世界的过程中保持理性、安全和独立思考。

最后，再次感谢给予我帮助的 wzh 学长，以及一路上分享经验的朋友们。愿我们都能在这个充满变化的时代，保持好奇，持续学习，拥抱 AI 时代带来的无限可能。
', 1, 50, '2026-07-30T00:00:00Z', '2026-07-30T00:00:00Z');

-- welcome
INSERT OR IGNORE INTO post (slug, title, date, excerpt, source, category, tags, body, published, sort_order, created_at, updated_at) VALUES ('welcome', '欢迎来到我的 Blog', '2026-07-26', '关于这个站点的诞生、设计思路与技术选型——一个 React 驱动的 Hexo Redefine 主题复刻。', 'online', '随笔', '公告,博客', '
欢迎来到我的个人博客。

这个站点最初的想法很简单：在 AI 时代，拥有一个属于自己的、可以自由表达的空间，比以往任何时候都重要。社交平台太喧嚣，笔记应用太封闭，而一个独立的博客，是知识沉淀和个人品牌建设的最佳载体。

## 为什么自己搭

市面上有无数博客平台——知乎、掘金、Medium、Notion——但它们都有一个共同的问题：你的内容住在别人的服务器上，受制于别人的规则、排版和算法。当平台衰落时，你的文字也随之消失。

自己搭建意味着：

- **完全的数据主权**——文章是本地 Markdown 文件，随时可以迁移
- **完全的视觉控制**——每个像素都由自己决定
- **完整的技术学习**——从前端到后端到部署，一个项目串起全栈能力

## 视觉设计

这个站点的视觉灵感来自 [Aleph_null](https://aleph-null.cc) 的 Hexo + Redefine 主题博客。我非常喜欢它那种极简、克制、又带着一点温度的风格——没有花哨的动画干扰阅读，但每一个交互细节都经过打磨。

复刻过程中重点还原了这些细节：

- **昼夜自动背景**：根据当前时间（06:00–18:00 白天，18:00–06:00 夜间）自动切换背景图片和配色，也可以手动覆盖
- **打字机副标题**：首页 hero 区域的副标题逐字打出，使用 `Typed.js` 风格的智能回删
- **滚动视差模糊**：首页背景随滚动渐进式模糊，营造空间纵深感
- **导航栏收缩**：滚动时导航栏高度平滑收缩，内容区宽度同步收窄
- **右下角工具栏**：回到顶部（带实时百分比）、字号调节、明暗切换、搜索，从折叠按钮向下展开
- **Footer 运行时计数器**：滚动数字动画，精确到秒

## 技术栈

| 层 | 技术 | 说明 |
|---|---|---|
| 前端框架 | React 18 + TypeScript | SPA，BrowserRouter |
| 构建工具 | Vite 5 | 极速 HMR |
| 样式 | Tailwind CSS v3 + 原生 CSS 变量 | 主题变量驱动昼夜切换 |
| 动画 | Framer Motion | 页面切换淡入上滑 |
| Markdown | marked + highlight.js + KaTeX | 代码高亮、数学公式、TOC、图片查看器 |
| 字体 | Chillax + Geist Variable | 标题用 Chillax，正文用 Geist |
| 数据 | localStorage + 静态 .md 文件 | 未来可无缝切换到 FastAPI + PostgreSQL |
| 部署 | Vite 静态构建 | 未来接入后端 API |

## 架构设计

项目刻意做了数据与视图的分层，方便未来从「纯前端 mock」迁移到「真实后端」：

```
src/
├── data/           # 静态数据源
│   ├── posts/      # Markdown 文章
│   └── profile.ts  # 个人信息（标签、GitHub 等）
├── services/       # 数据服务层（可替换为 API 调用）
│   ├── themeService.ts
│   └── articlesService.ts
├── auth/           # 认证服务（当前 mock，未来接 JWT）
│   ├── types.ts
│   ├── storage.ts
│   └── auth.ts
├── hooks/          # React 适配层
│   ├── useTheme.tsx
│   ├── useAuth.tsx
│   └── usePosts.ts
├── components/     # UI 组件
├── sections/       # 页面区块
└── pages/          # 路由页面
```

`services/` 和 `auth/` 层的接口形状已经按未来后端契约设计。切换到 FastAPI 时，只需要把 `articlesService.ts` 内部的 `localStorage` 调用换成 `fetch("/api/...")`，React 层零改动。

## 关于内容

这个博客会记录：

- **AI 开发实践**——大模型应用、Agent 设计、Prompt Engineering
- **全栈工程**——前端、后端、部署、DevOps 的踩坑笔记
- **学习思考**——算法、系统设计、读书笔记
- **生活**——摄影、钢琴、健身，以及其他感兴趣的事

## 写在最后

互联网最大的价值之一，是让知识与信息能够自由流动。这个博客是我的一小片自留地，如果其中的某篇文章恰好帮到了你，那就是它存在的意义。

欢迎在 [GitHub](https://github.com/Mavicer) 上找到我。
', 1, 40, '2026-07-30T00:00:00Z', '2026-07-30T00:00:00Z');
