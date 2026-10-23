(function () {
    const initPortfolio = () => {
        if (window.__PORTFOLIO_READY__) return;
        window.__PORTFOLIO_READY__ = true;

        // 1. Cursor Spotlight Effect on Cards
        document.querySelectorAll('.spotlight-card').forEach(card => {
            card.addEventListener('mousemove', e => {
                const rect = card.getBoundingClientRect();
                card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
                card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
            });
        });

        // 2. Scroll-Spy for Header Stage Highlight
        const sections = document.querySelectorAll('.track-section');

        function updateStageOnScroll() {
            if (window.__clickLock) return;

            const scrollY = window.scrollY;
            if (scrollY < 140) {
                window.setActiveStage(null);
                return;
            }

            if ((window.innerHeight + scrollY) >= document.documentElement.scrollHeight - 40) {
                window.setActiveStage('github');
                return;
            }

            const triggerPoint = scrollY + window.innerHeight * 0.35;
            let activeId = null;

            sections.forEach(sec => {
                if (triggerPoint >= sec.offsetTop) {
                    activeId = sec.id;
                }
            });

            window.setActiveStage(activeId);
        }

        window.addEventListener('scroll', updateStageOnScroll, { passive: true });
        updateStageOnScroll();

        // 3. GitHub Live Activity & Repositories Fetcher (@Hyvest48)
        const GH_USER = 'Hyvest48';
        const reposCountEl = document.getElementById('gh-repos-count');
        const followersCountEl = document.getElementById('gh-followers-count');
        const bioEl = document.getElementById('gh-bio');
        const eventsListEl = document.getElementById('gh-events-list');
        const reposListEl = document.getElementById('gh-repos-list');

        function formatRelativeDate(dateStr) {
            const date = new Date(dateStr);
            const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
            if (diffSec < 60) return 'just now';
            const diffMin = Math.floor(diffSec / 60);
            if (diffMin < 60) return `${diffMin}m ago`;
            const diffHr = Math.floor(diffMin / 60);
            if (diffHr < 24) return `${diffHr}h ago`;
            const diffDays = Math.floor(diffHr / 24);
            if (diffDays < 30) return `${diffDays}d ago`;
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }

        function describeEvent(ev) {
            const repoName = ev.repo ? ev.repo.name.replace(`${GH_USER}/`, '') : 'repository';
            switch (ev.type) {
                case 'PushEvent': {
                    const count = ev.payload && ev.payload.commits ? ev.payload.commits.length : 1;
                    const msg = ev.payload && ev.payload.commits && ev.payload.commits[0]
                        ? ev.payload.commits[0].message.split('\n')[0]
                        : `Pushed ${count} commit(s) to branch`;
                    return { title: `Pushed to ${repoName}`, desc: msg };
                }
                case 'CreateEvent':
                    return {
                        title: `Created ${ev.payload.ref_type || 'repository'} in ${repoName}`,
                        desc: ev.payload.description || 'Initialized new project workspace'
                    };
                case 'WatchEvent':
                    return { title: `Starred ${ev.repo.name}`, desc: 'Bookmarked repository on GitHub' };
                default:
                    return { title: `Activity in ${repoName}`, desc: ev.type.replace('Event', '') };
            }
        }

        async function loadGitHubData() {
            try {
                const userRes = await fetch(`https://api.github.com/users/${GH_USER}`);
                if (userRes.ok) {
                    const user = await userRes.json();
                    if (reposCountEl) reposCountEl.textContent = user.public_repos ?? 0;
                    if (followersCountEl) followersCountEl.textContent = user.followers ?? 0;
                    if (user.bio && bioEl) bioEl.textContent = user.bio;
                }
            } catch (_) {}

            try {
                const eventsRes = await fetch(`https://api.github.com/users/${GH_USER}/events/public?per_page=5`);
                if (!eventsRes.ok) throw new Error('Events API error');
                const events = await eventsRes.json();

                if (Array.isArray(events) && events.length > 0 && eventsListEl) {
                    eventsListEl.innerHTML = '';
                    events.slice(0, 4).forEach(ev => {
                        const info = describeEvent(ev);
                        const repoUrl = ev.repo ? `https://github.com/${ev.repo.name}` : `https://github.com/${GH_USER}`;
                        const item = document.createElement('a');
                        item.className = 'gh-item';
                        item.href = repoUrl;
                        item.target = '_blank';
                        item.rel = 'noopener noreferrer';

                        item.innerHTML = `
                            <div class="gh-item-top">
                                <span class="gh-item-title">${info.title}</span>
                                <span class="gh-item-time">${formatRelativeDate(ev.created_at)}</span>
                            </div>
                            <div class="gh-item-desc">${info.desc}</div>
                        `;
                        eventsListEl.appendChild(item);
                    });
                } else if (eventsListEl) {
                    eventsListEl.innerHTML = `
                        <a href="https://github.com/${GH_USER}" target="_blank" rel="noopener noreferrer" class="gh-item">
                            <div class="gh-item-top">
                                <span class="gh-item-title">@${GH_USER} on GitHub</span>
                                <span class="gh-item-time">Active</span>
                            </div>
                            <div class="gh-item-desc">Working on web marketplace &amp; TypeScript/PHP projects. Click to view full profile activity.</div>
                        </a>
                    `;
                }
            } catch (_) {
                if (eventsListEl) {
                    eventsListEl.innerHTML = `
                        <a href="https://github.com/${GH_USER}" target="_blank" rel="noopener noreferrer" class="gh-item">
                            <div class="gh-item-top">
                                <span class="gh-item-title">View @${GH_USER} Activity</span>
                                <span class="gh-item-time">GitHub ↗</span>
                            </div>
                            <div class="gh-item-desc">Open my GitHub profile to inspect recent commits and contributions.</div>
                        </a>
                    `;
                }
            }

            try {
                const reposRes = await fetch(`https://api.github.com/users/${GH_USER}/repos?sort=updated&per_page=4`);
                if (!reposRes.ok) throw new Error('Repos API error');
                const repos = await reposRes.json();

                if (Array.isArray(repos) && repos.length > 0 && reposListEl) {
                    reposListEl.innerHTML = '';
                    repos.slice(0, 4).forEach(repo => {
                        const item = document.createElement('a');
                        item.className = 'gh-item';
                        item.href = repo.html_url;
                        item.target = '_blank';
                        item.rel = 'noopener noreferrer';

                        item.innerHTML = `
                            <div class="gh-item-top">
                                <span class="gh-item-title">${repo.name}</span>
                                <span class="gh-item-time">${formatRelativeDate(repo.updated_at)}</span>
                            </div>
                            <div class="gh-item-desc">${repo.description || 'Web development repository on GitHub.'}</div>
                            <div class="gh-repo-meta">
                                <span class="gh-lang-tag">● ${repo.language || 'Code'}</span>
                                <span>★ ${repo.stargazers_count || 0}</span>
                            </div>
                        `;
                        reposListEl.appendChild(item);
                    });
                } else if (reposListEl) {
                    reposListEl.innerHTML = `
                        <a href="https://github.com/${GH_USER}?tab=repositories" target="_blank" rel="noopener noreferrer" class="gh-item">
                            <div class="gh-item-top">
                                <span class="gh-item-title">Explore Repositories</span>
                                <span class="gh-item-time">GitHub ↗</span>
                            </div>
                            <div class="gh-item-desc">Browse my public source code and experiments on GitHub.</div>
                        </a>
                    `;
                }
            } catch (_) {
                if (reposListEl) {
                    reposListEl.innerHTML = `
                        <a href="https://github.com/${GH_USER}?tab=repositories" target="_blank" rel="noopener noreferrer" class="gh-item">
                            <div class="gh-item-top">
                                <span class="gh-item-title">github.com/${GH_USER}</span>
                                <span class="gh-item-time">Repos ↗</span>
                            </div>
                            <div class="gh-item-desc">Visit my GitHub profile to view all public repositories.</div>
                        </a>
                    `;
                }
            }
        }

        loadGitHubData();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPortfolio);
    } else {
        initPortfolio();
    }
})();