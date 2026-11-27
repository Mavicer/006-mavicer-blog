---
title: "Git学习小记"
date: "2026-11-27"
category: "经验分享"
tags: ["Git", "GitHub", "版本控制"]
excerpt: "从 Agent 问我的一句“是否合并推送”，到个人网站的第一次提交，再到 RoboMaster 团队里的分支协作，记下我理解 Git 的过程。"
published: true
sort_order: 90
---

暑假时刚接触vibe coding时，便经常看到agent完成一个任务后停下，询问“现阶段修改已提交本地，是否合并推送”，在agent将一个功能改坏以后，也可以方便的回退到上一个历史版本重新修改。到后来想要将自己的网站发布到公网，也少不了GitHub的帮助———借助cloudflare的Page Deployment功能，能够快捷地将保存在GitHub里的网站源码部署到公网，让所有人都可以访问。

## Git 和 GitHub 各管什么

一直以来，我都不太清楚Git和GitHub的区别，不都是储存历史代码，便于管理和回退的平台吗？在系统地学习了Git的相关知识后，这个问题得到了解答。

简单来说，Git 是一个本地版本控制工具，无需联网也能使用，而GitHub 是一个基于 Git 的在线代码托管平台，用于保管或分享你的代码，便于展示或团队协作。

例如，你修改了一个项目的代码：

```bash
git add .
git commit -m "修复程序崩溃"
git push
```

<figure class="git-figure" style="max-width:475px"><img src="/images/git-learning-notes/figure-1.webp" alt="本地 Git 仓库与 GitHub 之间的推送和拉取" width="1274" height="824" loading="lazy" data-viewer /></figure>

前两条命令由 Git 在本地完成，最后一条命令将本地提交推送到 GitHub，这也是vibing时常和agent说的“commit and push”的由来。

## 从初始化到第一次提交

那么让我们进入一个真实的工作流程，看看Git到底能帮助我们什么——假设现在我要从零开始开发一个个人网站，并且使用Git管理整个开发过程。第一步，初始化仓库：<code class="git-inline"><span class="git-cmd">git</span> <span class="git-verb">init</span> <span class="git-flag">-b</span> <span class="git-arg">main</span></code>，执行这条命令后，Git会在当前目录下创建一个隐藏的 <code class="git-inline"><span class="git-arg">.git</span></code> 文件夹，用于存储版本历史、分支信息以及仓库配置等数据。至此，这个普通的文件夹便成为了一个Git仓库。在完成基础框架的搭建后，我希望将当前的开发进度保留下来，于是便进入了第二步，第一次提交：

```bash
git status
git add .
git commit -m "完成网站基础框架"
```

这里涉及 Git 中三个非常重要的概念：工作区、暂存区和本地仓库。

<figure class="git-figure" style="max-width:600px"><img src="/images/git-learning-notes/figure-2.webp" alt="工作区、暂存区和本地仓库之间的数据流向" width="835" height="238" loading="lazy" data-viewer /></figure>

<code class="git-inline"><span class="git-cmd">git</span> <span class="git-verb">add</span></code> 并不意味着代码已经被正式保存为一个历史版本，而是将改动放进暂存区，告诉Git哪些修改将被纳入下一次提交。只有执行 <code class="git-inline"><span class="git-cmd">git</span> <span class="git-verb">commit</span></code>，才会真正产生一条新的版本记录。

随着网站功能不断增加，我又先后进行了多次提交，执行<code class="git-inline"><span class="git-cmd">git</span> <span class="git-verb">log</span> <span class="git-flag">--oneline</span></code>后，终端返回

```text
c7e942a 添加访问统计功能
b3d815f 完成博客页面
a8f621c 完成网站基础框架
```

每次提交都有一个对应的哈希值，用于标识这次提交。我们可以借助它查看历史版本，甚至恢复过去的代码。

## 用分支开发新功能

假设我现在想为网站添加一个全新的动画效果，但又担心修改过程中破坏原有功能，就可以使用分支来进行新功能的开发：<code class="git-inline"><span class="git-cmd">git</span> <span class="git-verb">switch</span> <span class="git-flag">-c</span> <span class="git-arg">new_animation</span></code>

<figure class="git-figure" style="max-width:590px"><img src="/images/git-learning-notes/figure-3.webp" alt="动画功能分支从 main 分出后合并" width="1192" height="402" loading="lazy" data-viewer /></figure>

在新分支上，我可以独立进行开发和提交，而不影响主分支的版本。待功能开发完成并通过测试后，再将其合并到主分支。

```bash
git add .
git commit -m "完成动画功能"
git switch main
git merge new_animation
```

这也解释了为什么在 Vibing 的过程中，Agent 经常询问我是否合并分支。

## 撤销一次提交

然而，开发过程并不总是一帆风顺的。假设某次提交导致整个网站无法正常运行，我可以通过 Git 撤销这次提交：<code class="git-inline"><span class="git-cmd">git</span> <span class="git-verb">revert</span> <span class="git-arg">HEAD</span></code>，Git 会创建一个新的提交，用于撤销上一次提交所带来的修改，同时保留完整的历史记录。这意味着即使将一个功能彻底改坏了，我也不必凭借记忆或者<code class="git-inline"><span class="git-arg">ctrl+z</span></code>重新编写原来的代码，而是可以利用 Git 恢复此前的开发成果。

## 把本地仓库推送到 GitHub

完成本地开发后，将本地仓库与 GitHub 上的远程仓库建立联系。

```bash
git remote add origin 仓库地址
git push -u origin main
```

之后，每次更新代码，只需要执行熟悉的三条命令：

```bash
git add .
git commit -m "新功能/debug"
git push
```

如果已经配置好了 Cloudflare Pages 的自动部署功能，那么 GitHub 上的代码更新还可以自动触发网站的构建与部署。从编写代码、管理版本、测试功能，到最终发布网站，一套完整的开发流程就此形成。

当然，代码的传输并非单向的。假设我在另一台电脑上继续开发同一个项目，或者队友已经向远程仓库推送了新的代码，我便可以通过 <code class="git-inline"><span class="git-cmd">git</span> <span class="git-verb">pull</span></code> 将远程分支的更新获取并整合到本地分支。如果是第一次在这台电脑上开发该项目，则可以通过 <code class="git-inline"><span class="git-cmd">git</span> <span class="git-verb">clone</span></code> 将远程仓库克隆到本地。

## 团队开发中的分支与冲突

至此，Git 不仅能够帮助我管理一台电脑上的代码版本，也能够实现多台设备之间的代码同步。而如果放在 RoboMaster 的团队背景下，Git 的优势还会被进一步放大。

<figure class="git-figure" style="max-width:680px"><img src="/images/git-learning-notes/figure-4.webp" alt="Git flow 中五种分支的关系" width="1032" height="366" loading="lazy" data-viewer /></figure>

如图是经典的Git flow开发流程，例如，队友那边的a功能还没有开发完毕，但b功能突然出现严重 Bug。此时，你可以直接从 <code class="git-inline"><span class="git-arg">main</span></code> 创建一个 <code class="git-inline"><span class="git-arg">hotfix</span></code> 分支，修复 Bug 后立即发布，再将修复同步到 <code class="git-inline"><span class="git-arg">develop</span></code>，完全不需要等待a功能开发完成再统一合并发布。

日常开发时，使用简单的GitHub flow或者简化的Git flow便可以覆盖大部分场景

<figure class="git-figure" style="max-width:600px"><img src="/images/git-learning-notes/figure-5.webp" alt="功能分支完成开发、提交和测试后合并上线" width="1278" height="570" loading="lazy" data-viewer /></figure>

学长在教学中也提到了实际会遇到的冲突等问题，并讲解了普适性的解决方案，这里不再赘述。

<figure class="git-figure" style="max-width:680px"><img src="/images/git-learning-notes/figure-6.webp" alt="培训示例中两条分支分别修改曝光参数" width="1772" height="764" loading="lazy" data-viewer /><figcaption>图片来自长空御风 RM 视觉组培训 PPT</figcaption></figure>

在接触 Vibe Coding 之初，我更多地将 Git 视为 Agent 的一个附属工具，甚至不需要理解其工作原理，只需要在合适的时候告诉 Agent “commit and push”。但在真正学习 Git 后，我发现 Git 的价值不仅仅在于保存历史代码，更在于让整个开发过程变得可追踪、可回退、可协作。
