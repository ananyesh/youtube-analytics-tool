document.addEventListener('DOMContentLoaded', () => {
    console.log('YT Analytics v8.3 Initialized');
    const channelInput = document.getElementById('channelInput');
    const searchBtn = document.getElementById('searchBtn');
    const loading = document.getElementById('loading');
    const errorState = document.getElementById('errorState');
    const errorMsg = document.getElementById('errorMsg');
    const dashboard = document.getElementById('dashboard');
    const granularitySelect = document.getElementById('granularitySelect');
    const downloadBtn = document.getElementById('downloadBtn');
    const suggestions = document.getElementById('suggestions');
    const logoContainer = document.getElementById('logoContainer');

    // Navigation
    const navButtons = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.content-section');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetSection = btn.dataset.section;
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            sections.forEach(s => {
                if (s.id === targetSection + 'Section') {
                    s.classList.remove('hidden');
                } else {
                    s.classList.add('hidden');
                }
            });
        });
    });

    // UI Elements
    const channelThumbnail = document.getElementById('channelThumbnail');
    const channelTitle = document.getElementById('channelTitle');
    const countryTag = document.getElementById('countryTag');
    const publishedTag = document.getElementById('publishedTag');
    const topicTags = document.getElementById('topicTags');
    const subCount = document.getElementById('subCount');
    const viewCount = document.getElementById('viewCount');
    const videoCount = document.getElementById('videoCount');

    let growthChart = null;
    let currentChannelData = null;
    let currentChartType = 'subscribers';
    let suggestionTimeout = null;
    let liveStatsInterval = null;
    let currentSearchId = 0;
    let lastSimulatedSubs = 0; // Growth Simulation State
    let subsPerSecond = 0;

    // Initialize Odometers
    const subOdometer = new Odometer({ el: subCount, value: 0, format: '(,ddd)', theme: 'minimal' });
    const viewOdometer = new Odometer({ el: viewCount, value: 0, format: '(,ddd)', theme: 'minimal' });
    const videoOdometer = new Odometer({ el: videoCount, value: 0, format: '(,ddd)', theme: 'minimal' });

    // Ensure Zoom plugin is active
    if (typeof ChartZoom !== 'undefined') {
        Chart.register(ChartZoom);
    }

    // Helper: get thumbnail URL from any API response object
    const getThumb = (obj) => obj.thumbnails || obj.thumbnail || obj.thumbnail_url || 'https://www.youtube.com/s/desktop/5732ef2e/img/favicon_144x144.png';

    // Compare State
    let compareData = [];
    let compChart = null;
    let compChartType = 'subscribers';
    let compSuggestionTimeout = null;



    // Curated Top Channels Database
    const topChannelsDB = [
        { id: "UCX6OQ3DkcsbYNE6H8uQQuVA", cat: "Entertainment" }, // MrBeast
        { id: "UCq-Fj5jknLsUf-MWSy4_brA", cat: "Music" }, // T-Series
        { id: "UCbCmjCuTUZos6Inko4u57UQ", cat: "Kids" }, // Cocomelon
        { id: "UCpEhnqL0y41EpW2TvWAHD7Q", cat: "Entertainment" }, // SET India
        { id: "UCk8GzjMOrta8yxDcKfylJYw", cat: "Kids" }, // Kids Diana Show
        { id: "UC-lHJZR3Gqxm24_Vd_AJ5Yw", cat: "Gaming" }, // PewDiePie
        { id: "UCJplp5SjeGSdVdwsfb9Q7lQ", cat: "Kids" }, // Like Nastya
        { id: "UCvlE5gTbOvjiolFlEm-c_Ow", cat: "Kids" }, // Vlad and Niki
        { id: "UCFFbwnve3yF62-tVXkTyHqg", cat: "Music" }, // Zee Music Company
        { id: "UCJ5v_MCY6GNUBTO8-D3XoAg", cat: "Entertainment" }, // WWE
        { id: "UCOmHUn--16B90oW2L6FRR3A", cat: "Music" }, // BLACKPINK
        { id: "UCyoXW-Dse7fURq30EWl_CUA", cat: "Entertainment" }, // Goldmines
        { id: "UC6-F5tO8uklgE9Zy8IvbdFw", cat: "Entertainment" }, // Sony SAB
        { id: "UC295-Dw_tDNtZXFeAPAW6Aw", cat: "Entertainment" }, // 5-Minute Crafts
        { id: "UCLkAepWjdylmXSltofFvsYQ", cat: "Music" }, // BANGTANTV
        { id: "UCO1cgjhGqxNDdpbk58wK51A", cat: "Music" }, // Justin Bieber
        { id: "UC3IZKseVpdzPSBaWxBxundA", cat: "Music" }, // HYBE LABELS
        { id: "UCppHT7SZKKxoIu-BGp02xkw", cat: "Entertainment" }, // Zee TV
        { id: "UCffDXn7ycAzwL2LDlbyWOTw", cat: "Music" }, // Canal KondZilla
        { id: "UCcdwLPi3A4qlO_aE25q8OJA", cat: "Kids" }, // Pinkfong Baby Shark
        { id: "UC0C-w0YjGpqDXGB8IHb662A", cat: "Music" }, // Ed Sheeran
        { id: "UCfM3iI2L4ZXYXQ5z2c1lWbg", cat: "Music" }, // EminemMusic
        { id: "UCY30JRSgfhYXA6i6xX1erWg", cat: "Entertainment" }, // Badabun
        { id: "UCt4t-jeY85JegMlZ-E5UWtA", cat: "Entertainment" }, // A4
        { id: "UCtO1TIt92uH-iM0oIfB98sA", cat: "News" }, // Aaj Tak
        { id: "UCXGgrKt94gR6lmN4aN3mYTg", cat: "Gaming" }, // JuegaGerman
        { id: "UCqECaJ8Gagnn7YCbPEzWH6g", cat: "Music" }, // Taylor Swift
        { id: "UCiIgmzCRCsAksBw8O8sU4zw", cat: "Gaming" }, // elrubiusOMG
        { id: "UC2tsAmwAY5gQ9F_z_iR-1yA", cat: "Gaming" }, // Fernanfloo
        { id: "UCY1kMZp36IQSyNx_9h4mpCg", cat: "Gaming" } // Markiplier
    ];

    // --- Search Suggestions ---
    // --- Turbo-Racing Proxy Engine (v6.2) ---
    const searchCache = JSON.parse(localStorage.getItem('yt_search_cache') || '{}');
    const saveToCache = (key, val) => {
        searchCache[key] = val;
        // Keep cache small
        const keys = Object.keys(searchCache);
        if (keys.length > 50) delete searchCache[keys[0]];
        localStorage.setItem('yt_search_cache', JSON.stringify(searchCache));
    };

    const fetchProxied = async (url) => {
        const proxies = [
            (u) => `https://allorigins.hexlet.app/raw?url=${encodeURIComponent(u)}`,
            (u) => `https://api.cors.lol/?url=${encodeURIComponent(u)}`,
            (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}&t=${Date.now()}`,
        ];

        const tryProxy = async (getProxyUrl) => {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 10000); // 10s to allow full 1MB+ VidIQ history downloads

            try {
                const pUrl = getProxyUrl(url);
                const res = await fetch(pUrl, { signal: controller.signal });
                clearTimeout(id);

                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const text = await res.text();
                
                // Handle both raw JSON and allorigins-wrapped responses
                let data;
                try {
                    data = JSON.parse(text);
                } catch {
                    throw new Error("Non-JSON response");
                }

                if (data && typeof data === 'object' && data.contents) {
                    try { data = JSON.parse(data.contents); } catch { throw new Error("Bad contents"); }
                }

                if (!data || typeof data !== 'object') throw new Error("Invalid data");
                return data;
            } catch (e) {
                clearTimeout(id);
                throw e;
            }
        };

        // Race ALL proxies simultaneously — fastest valid response wins
        try {
            return await Promise.any(proxies.map(p => tryProxy(p)));
        } catch (e) {
            throw new Error("Connection timed out. Please try again in a moment.");
        }
    };

    const searchChannels = async (query) => {
        if (/^UC[\w-]{22}$/.test(query)) {
            return { results: [{ id: query, title: query }] };
        }

        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 5000);
            const res = await fetch(`https://api.socialcounts.org/youtube-live-subscriber-count/search/${encodeURIComponent(query)}`, { signal: controller.signal });
            clearTimeout(id);
            if (res.ok) {
                const data = await res.json();
                if (data && data.items && data.items.length > 0) {
                    return {
                        results: data.items.map(item => ({
                            id: item.id,
                            title: item.title,
                            thumbnails: item.pfp,
                            thumbnail: item.pfp,
                            handle: item.handle
                        }))
                    };
                }
            }
        } catch (e) {
            console.warn('socialcounts search failed', e);
        }

        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 5000);
            const res = await fetch(`https://mixerno.space/api/youtube-channel-counter/search/${encodeURIComponent(query)}`, { signal: controller.signal });
            clearTimeout(id);
            if (res.ok) {
                const data = await res.json();
                if (data && data.list && data.list.length > 0) {
                    return {
                        results: data.list.map(item => ({
                            id: item[2],
                            title: item[0],
                            thumbnails: item[1],
                            thumbnail: item[1]
                        }))
                    };
                }
            }
        } catch (e) {
            console.warn('mixerno search failed', e);
        }

        try {
            return await fetchProxied(`https://api.vidiq.com/youtube/channels/public/search?query=${encodeURIComponent(query)}`);
        } catch (e) {
            if (/^UC[\w-]{22}$/.test(query)) {
                return { results: [{ id: query, title: query }] };
            }
            throw e;
        }
    };

    const fetchLiveChannelSnapshot = async (channelId, searchItem = {}) => {
        let sctools = null;
        let socialcounts = null;

        await Promise.all([
            (async () => {
                try {
                    const c = new AbortController();
                    setTimeout(() => c.abort(), 6000);
                    const r = await fetch(`https://ests.sctools.org/api/get/${channelId}`, { signal: c.signal });
                    if (r.ok) sctools = await r.json();
                } catch (e) { console.warn('sctools snapshot failed', e); }
            })(),
            (async () => {
                try {
                    const c = new AbortController();
                    setTimeout(() => c.abort(), 6000);
                    const r = await fetch(`https://api.socialcounts.org/youtube-live-subscriber-count/${channelId}`, { signal: c.signal });
                    if (r.ok) socialcounts = await r.json();
                } catch (e) { console.warn('socialcounts snapshot failed', e); }
            })()
        ]);

        const apiSubs = (sctools && sctools.stats && sctools.stats.apiCount)
            || (socialcounts && socialcounts.counters && socialcounts.counters.api && socialcounts.counters.api.subscriberCount)
            || searchItem.subscribers;

        const views = (sctools && sctools.stats && sctools.stats.viewCount)
            || (socialcounts && socialcounts.counters && socialcounts.counters.api && socialcounts.counters.api.viewCount)
            || 0;

        const videos = (sctools && sctools.stats && sctools.stats.videoCount)
            || (socialcounts && socialcounts.counters && socialcounts.counters.api && socialcounts.counters.api.videoCount)
            || 0;

        if (!apiSubs && !views) {
            throw new Error('Could not retrieve stats for this channel.');
        }

        const subs = apiSubs || 0;
        const title = (sctools && sctools.info && sctools.info.name) || searchItem.title || channelId;
        const thumb = (sctools && sctools.info && sctools.info.avatar) || getThumb(searchItem);
        const country = (sctools && sctools.info && sctools.info.country) || 'Global';
        const now = Date.now();
        const yesterday = new Date(now - 24 * 60 * 60 * 1000).toISOString();
        const todayIso = new Date(now).toISOString();

        return [{
            id: channelId,
            title,
            thumbnail: thumb,
            thumbnails: thumb,
            country,
            published_at: todayIso,
            topics: ['YouTube'],
            subscribers: subs,
            stats: [
                { recorded_at: todayIso, subscribers: subs, views, videos },
                { recorded_at: yesterday, subscribers: subs, views, videos }
            ]
        }];
    };

    channelInput.addEventListener('input', () => {
        const query = channelInput.value.trim().toLowerCase();
        clearTimeout(suggestionTimeout);
        
        if (query.length < 2) {
            suggestions.classList.add('hidden');
            return;
        }

        if (searchCache[query]) {
            renderSuggestions(searchCache[query]);
            return;
        }

        suggestionTimeout = setTimeout(async () => {
            try {
                const data = await searchChannels(query);
                if (data && data.results && data.results.length > 0) {
                    const sliced = data.results.slice(0, 5);
                    saveToCache(query, sliced);
                    renderSuggestions(sliced);
                } else {
                    suggestions.classList.add('hidden');
                }
            } catch (e) { console.warn('Suggestion fetch failed'); }
        }, 250);
    });

    const renderSuggestions = (results) => {
        suggestions.innerHTML = '';
        results.forEach(res => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.innerHTML = `
                <img src="${getThumb(res)}" alt="" onerror="this.src='https://www.youtube.com/s/desktop/5732ef2e/img/favicon_144x144.png'">
                <div>
                    <div class="name">${res.title}</div>
                    <div class="handle">ID: ${res.id}</div>
                </div>
            `;
            item.addEventListener('click', () => {
                channelInput.value = res.title || res.id;
                suggestions.classList.add('hidden');
                handleSearch(res);
            });
            suggestions.appendChild(item);
        });
        suggestions.classList.remove('hidden');
    };

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            suggestions.classList.add('hidden');
        }
    });

    // --- Core Search Logic ---
    const handleSearch = async (selectedItem = null) => {
        const directItem = (selectedItem && selectedItem.id) ? selectedItem : null;
        const query = channelInput.value.trim();
        if (!directItem && !query) return;
        
        // KILL OLD PROCESSES
        const searchId = ++currentSearchId;
        if (liveStatsInterval) {
            clearInterval(liveStatsInterval);
            liveStatsInterval = null;
        }
        if (window._syncTimeout) {
            clearTimeout(window._syncTimeout);
            window._syncTimeout = null;
        }
        
        suggestions.classList.add('hidden');
        showState('loading');
        
        try {
            let searchItem = directItem;
            if (!searchItem) {
                const cleanQuery = query
                    .replace(/https?:\/\/(www\.)?youtube\.com\/(channel\/|user\/|c\/|@)?/g, '')
                    .replace(/\/$/g, '');

                const searchData = await searchChannels(cleanQuery);

                if (!searchData || !searchData.results || searchData.results.length === 0) {
                    throw new Error('No channel found matching your input.');
                }
                searchItem = searchData.results[0];
            }

            const channelId = searchItem.id;
            const today = new Date().toISOString().split('T')[0];
            const fromDate = '2005-04-23'; 
            
            let statsData = null;
            try {
                statsData = await fetchProxied(`https://api.vidiq.com/youtube/channels/public/stats?ids=${channelId}&from=${fromDate}&to=${today}`);
            } catch (e) {
                console.warn("VidIQ stats proxy failed, falling back to live snapshot:", e.message);
            }

            if (!statsData || statsData.length === 0 || !statsData[0].stats || statsData[0].stats.length === 0) {
                statsData = await fetchLiveChannelSnapshot(channelId, searchItem);
            }

            // --- DATA CLEANING ---
            let rawStats = statsData[0].stats.reverse();
            
            // Filter out 0 points and ensure cumulative integrity
            let maxSubs = 0;
            let maxViews = 0;
            const cleanedStats = rawStats.filter(s => {
                if (s.subscribers === 0 && s.views === 0) return false;
                return true;
            });

            statsData[0].stats = cleanedStats;
            
            // SEARCH IDENTITY CHECK: Only update if this is still the latest search
            if (searchId !== currentSearchId) return;

            currentChannelData = statsData[0];
            renderDashboard();
            showState('dashboard');
        } catch (err) {
            if (searchId !== currentSearchId) return;
            console.error(err);
            errorMsg.textContent = err.message;
            showState('error');
        }
    };

    // --- Compare Search Logic ---
    const compareInput = document.getElementById('compareInput');
    const compareSuggestions = document.getElementById('compareSuggestions');
    const compareChips = document.getElementById('compareChips');

    compareInput.addEventListener('input', () => {
        const query = compareInput.value.trim();
        clearTimeout(compSuggestionTimeout);
        
        if (query.length < 2) {
            compareSuggestions.classList.add('hidden');
            return;
        }

        compSuggestionTimeout = setTimeout(async () => {
            try {
                const data = await searchChannels(query);
                
                if (data && data.results && data.results.length > 0) {
                    renderCompSuggestions(data.results.slice(0, 5));
                } else {
                    compareSuggestions.classList.add('hidden');
                }
            } catch (e) { console.error('Suggestion fetch failed', e); }
        }, 400);
    });

    const renderCompSuggestions = (results) => {
        compareSuggestions.innerHTML = '';
        results.forEach(res => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.innerHTML = `
                <img src="${getThumb(res)}" alt="" onerror="this.src='https://www.youtube.com/s/desktop/5732ef2e/img/favicon_144x144.png'">
                <div>
                    <div class="name">${res.title}</div>
                    <div class="handle">ID: ${res.id}</div>
                </div>
            `;
            item.addEventListener('click', () => {
                compareInput.value = '';
                compareSuggestions.classList.add('hidden');
                addChannelToCompare(res.id, res);
            });
            compareSuggestions.appendChild(item);
        });
        compareSuggestions.classList.remove('hidden');
    };

    const addChannelToCompare = async (channelId, searchItem) => {
        if (compareData.length >= 10) return alert('Maximum 10 channels allowed for comparison.');
        if (compareData.find(c => c.id === channelId)) return alert('Channel already added.');
        
        try {
            const today = new Date().toISOString().split('T')[0];
            let statsData = null;
            try {
                statsData = await fetchProxied(`https://api.vidiq.com/youtube/channels/public/stats?ids=${channelId}&from=2005-04-23&to=${today}`);
            } catch (e) {
                console.warn("Compare VidIQ proxy failed, falling back to live snapshot:", e.message);
            }

            if (!statsData || statsData.length === 0 || !statsData[0].stats || statsData[0].stats.length === 0) {
                statsData = await fetchLiveChannelSnapshot(channelId, searchItem || {});
            }
            
            // Ensure ASCENDING order (Oldest to Newest) for the processing engine
            let rawStats = statsData[0].stats.sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
            
            statsData[0].stats = rawStats.filter(s => {
                if (s.subscribers === 0 && s.views === 0) return false;
                return true;
            });
            
            compareData.push(statsData[0]);
            renderCompareChips();
            updateCompareChart();
        } catch(e) {
            console.error(e);
            alert('Failed to add channel.');
        }
    };

    const handleCompareSearch = async () => {
        const query = compareInput.value.trim();
        if (!query) return;
        
        compareInput.value = '';
        compareSuggestions.classList.add('hidden');
        
        try {
            const cleanQuery = query
                .replace(/https?:\/\/(www\.)?youtube\.com\/(channel\/|user\/|c\/|@)?/g, '')
                .replace(/\/$/g, '');

            const searchData = await searchChannels(cleanQuery);
            if (searchData && searchData.results && searchData.results.length > 0) {
                const searchItem = searchData.results[0];
                addChannelToCompare(searchItem.id, searchItem);
            } else {
                alert('No channel found matching your input.');
            }
        } catch (e) {
            console.error(e);
            alert('Failed to search and add channel.');
        }
    };

    const addCompareBtn = document.getElementById('addCompareBtn');
    if (addCompareBtn) {
        addCompareBtn.addEventListener('click', handleCompareSearch);
    }
    compareInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleCompareSearch();
    });

    const removeCompareChannel = (id) => {
        compareData = compareData.filter(c => c.id !== id);
        renderCompareChips();
        updateCompareChart();
    };

    const renderCompareChips = () => {
        compareChips.innerHTML = '';
        compareData.forEach(c => {
            const chip = document.createElement('div');
            chip.className = 'chip';
            chip.innerHTML = `
                <img src="${getThumb(c)}" alt="" onerror="this.src='https://www.youtube.com/s/desktop/5732ef2e/img/favicon_144x144.png'">
                <span>${c.title}</span>
                <button class="chip-remove"><i class="fas fa-times"></i></button>
            `;
            chip.querySelector('.chip-remove').addEventListener('click', () => removeCompareChannel(c.id));
            compareChips.appendChild(chip);
        });
    };

    const renderDashboard = () => {
        const data = currentChannelData;
        
        // Handle varying thumbnail keys between APIs
        const thumbUrl = getThumb(data);
        
        // Update header logo container
        logoContainer.innerHTML = `<img src="${thumbUrl}" class="header-thumb" alt="Profile" onerror="this.src='https://www.youtube.com/s/desktop/5732ef2e/img/favicon_144x144.png'">`;

        channelThumbnail.src = thumbUrl;
        channelThumbnail.onerror = function() { this.src = 'https://www.youtube.com/s/desktop/5732ef2e/img/favicon_144x144.png'; };
        channelTitle.textContent = data.title;
        countryTag.innerHTML = `<i class="fas fa-globe"></i> ${data.country || 'Global'}`;
        const date = new Date(data.published_at);
        publishedTag.innerHTML = `<i class="fas fa-calendar"></i> Since ${date.getFullYear()}`;
        topicTags.innerHTML = '';
        if (data.topics) {
            data.topics.forEach(topic => {
                const span = document.createElement('span');
                span.className = 'topic-tag';
                span.textContent = topic;
                topicTags.appendChild(span);
            });
        }
        const latestStats = data.stats[data.stats.length - 1];
        
        // Initial set for odometers
        subOdometer.update(latestStats.subscribers);
        viewOdometer.update(latestStats.views);
        videoOdometer.update(latestStats.videos);
        
        updateChart();
        startLiveStats(data.id);
    };

    const startLiveStats = (channelId) => {
        if (liveStatsInterval) {
            clearInterval(liveStatsInterval);
            liveStatsInterval = null;
        }

        const data = currentChannelData;
        if (!data || !data.stats || data.stats.length < 1) return;

        // --- SCTOOLS NATIVE ENGINE (v4.6) ---
        const latest = data.stats[data.stats.length - 1];
        lastSimulatedSubs = latest.subscribers;
        let lastUpdateTime = Date.now();
        let useSimulation = false;

        // Velocity for smooth fallback
        if (data.stats.length >= 2) {
            const previous = data.stats[data.stats.length - 2];
            const timeDiffSeconds = (new Date(latest.recorded_at) - new Date(previous.recorded_at)) / 1000;
            const subDiff = latest.subscribers - previous.subscribers;
            subsPerSecond = timeDiffSeconds > 0 ? (subDiff / timeDiffSeconds) : 0;
            if (subsPerSecond < 0) subsPerSecond = 0;
        }

        // --- FAST LOOP (2s): Pure simulation, zero network calls, zero console errors ---
        liveStatsInterval = setInterval(() => {
            const now = Date.now();
            const deltaSeconds = (now - lastUpdateTime) / 1000;
            lastUpdateTime = now;

            const jitter = (Math.random() - 0.5) * 0.05;
            lastSimulatedSubs += (subsPerSecond * deltaSeconds) + jitter;
            subOdometer.update(Math.floor(lastSimulatedSubs));

            // Sync a session point to chart every ~10 seconds
            if (now % 10000 < 2000) {
                if (currentChannelData && currentChannelData.id === channelId) {
                    const sessionPoint = {
                        recorded_at: new Date(now).toISOString(),
                        subscribers: Math.floor(lastSimulatedSubs),
                        views: latest.views,
                        videos: latest.videos
                    };
                    currentChannelData.stats.push(sessionPoint);
                    if (currentChannelData.stats.length > 500) currentChannelData.stats.splice(50, 1);

                    if (growthChart && granularitySelect.value === 'hourly') {
                        growthChart.data.datasets[0].data.push({
                            x: new Date(sessionPoint.recorded_at),
                            y: sessionPoint[currentChartType]
                        });
                        growthChart.update('none');
                    }
                }
            }
        }, 2000);


        // --- SMART SYNC LOOP: Direct CORS-enabled APIs (SCTools + SocialCounts fallback) ---
        let isSyncing = false;
        const syncLive = async () => {
            if (isSyncing) return;
            isSyncing = true;
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000);
                const res = await fetch(`https://ests.sctools.org/api/get/${channelId}`, { signal: controller.signal });
                clearTimeout(timeoutId);
                if (res.ok) {
                    const json = await res.json();
                    if (json && json.stats) {
                        const liveSub = json.stats.estCount || json.stats.apiCount;
                        if (liveSub) lastSimulatedSubs = Math.floor(liveSub);
                        if (json.stats.viewCount)  viewOdometer.update(json.stats.viewCount);
                        if (json.stats.videoCount) videoOdometer.update(json.stats.videoCount);
                        if (json.averages && typeof json.averages.hourly === 'number') {
                            subsPerSecond = Math.max(0, json.averages.hourly / 3600);
                        }
                        isSyncing = false;
                        if (currentChannelData && currentChannelData.id === channelId) {
                            window._syncTimeout = setTimeout(syncLive, 10000);
                        }
                        return;
                    }
                }
            } catch (e) { /* Try SocialCounts fallback */ }

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000);
                const res = await fetch(`https://api.socialcounts.org/youtube-live-subscriber-count/${channelId}`, { signal: controller.signal });
                clearTimeout(timeoutId);
                if (res.ok) {
                    const json = await res.json();
                    const est = json && json.counters && (json.counters.estimation || json.counters.api);
                    if (est) {
                        if (est.subscriberCount) lastSimulatedSubs = Math.floor(est.subscriberCount);
                        if (est.viewCount) viewOdometer.update(est.viewCount);
                        if (est.videoCount) videoOdometer.update(est.videoCount);
                    }
                }
            } catch (e) { /* Silent fallback — simulation continues */ }
            isSyncing = false;
            // Schedule next sync only after this one finishes
            if (currentChannelData && currentChannelData.id === channelId) {
                window._syncTimeout = setTimeout(syncLive, 10000); // Wait 10s between requests
            }
        };
        syncLive(); // Start first sync
    };



    // --- Chart Logic ---
    const processChartStats = (stats, granularity) => {
        if (!stats || stats.length === 0) return [];
        
        const dataToProcess = stats;

        // Group by period
        const groups = {};
        dataToProcess.forEach(item => {
            const date = new Date(item.recorded_at);
            let key, snapped;
            
            if (granularity === 'hourly') {
                key = date.toISOString().substring(0, 13);
                snapped = key + ":00:00.000Z";
            } else if (granularity === 'daily') {
                key = date.toISOString().split('T')[0];
                snapped = key + "T00:00:00.000Z";
            } else if (granularity === 'weekly') {
                const d = new Date(date);
                const day = d.getUTCDay();
                const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Monday
                const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
                key = monday.toISOString().split('T')[0];
                snapped = key + "T00:00:00.000Z";
            } else if (granularity === 'monthly') {
                key = `${date.getUTCFullYear()}-${(date.getUTCMonth() + 1).toString().padStart(2, '0')}`;
                snapped = key + "-01T00:00:00.000Z";
            } else if (granularity === 'yearly') {
                key = `${date.getUTCFullYear()}`;
                snapped = key + "-01-01T00:00:00.000Z";
            }
            
            // Latest point in period wins, but we store a CLONE with a snapped timestamp
            groups[key] = { ...item, recorded_at: snapped };
        });

        // Smart Gap Filling: Only fill gaps if they are reasonably small to prevent browser lag
        const sortedKeys = Object.keys(groups).sort();
        // SAFETY GATE: If we already have a massive dataset (>5000 points), skip gap-filling to prevent crash
        if (sortedKeys.length > 1 && sortedKeys.length < 5000 && granularity !== 'yearly') {
            const MAX_GAP_HOURS = 48; 
            const MAX_GAP_DAYS = 31;
            
            for (let i = 0; i < sortedKeys.length - 1; i++) {
                const start = new Date(groups[sortedKeys[i]].recorded_at);
                const next = new Date(groups[sortedKeys[i+1]].recorded_at);
                let curr = new Date(start);
                
                if (granularity === 'hourly') {
                    curr.setUTCHours(curr.getUTCHours() + 1);
                    // Only fill if gap is small
                    const diffHours = (next - start) / (1000 * 60 * 60);
                    if (diffHours <= MAX_GAP_HOURS) {
                        while (curr < next) {
                            const k = curr.toISOString().substring(0, 13);
                            const s = k + ":00:00.000Z";
                            if (!groups[k]) groups[k] = { recorded_at: s, subscribers: null, views: null, videos: null };
                            curr.setUTCHours(curr.getUTCHours() + 1);
                        }
                    }
                } else if (granularity === 'daily' || granularity === 'weekly' || granularity === 'monthly') {
                    const diffMs = next - start;
                    const diffDays = diffMs / (1000 * 60 * 60 * 24);
                    
                    if (diffDays <= MAX_GAP_DAYS) {
                        if (granularity === 'daily') curr.setUTCDate(curr.getUTCDate() + 1);
                        else if (granularity === 'weekly') curr.setUTCDate(curr.getUTCDate() + 7);
                        else if (granularity === 'monthly') curr.setUTCMonth(curr.getUTCMonth() + 1);

                        while (curr < next) {
                            let k, s;
                            if (granularity === 'daily') {
                                k = curr.toISOString().split('T')[0];
                                s = k + "T00:00:00.000Z";
                            } else if (granularity === 'weekly') {
                                k = curr.toISOString().split('T')[0];
                                s = k + "T00:00:00.000Z";
                            } else {
                                k = curr.toISOString().substring(0, 7);
                                s = k + "-01T00:00:00.000Z";
                            }
                            if (!groups[k]) groups[k] = { recorded_at: s, subscribers: null, views: null, videos: null };
                            
                            if (granularity === 'daily') curr.setUTCDate(curr.getUTCDate() + 1);
                            else if (granularity === 'weekly') curr.setUTCDate(curr.getUTCDate() + 7);
                            else curr.setUTCMonth(curr.getUTCMonth() + 1);
                        }
                    }
                }
                // (Weekly/Monthly gap filling handled by Chart.js time axis scale naturally)
            }
        }

        return Object.keys(groups).sort().map(k => groups[k]);
    };

    const getProcessedStats = () => {
        const granularity = granularitySelect.value;
        return processChartStats(currentChannelData.stats, granularity);
    };

    const updateChart = () => {
        if (!currentChannelData) return;

        const processedStats = getProcessedStats();
        const ctx = document.getElementById('growthChart').getContext('2d');
        if (growthChart) growthChart.destroy();

        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, currentChartType === 'subscribers' ? 'rgba(255, 77, 77, 0.4)' : 'rgba(33, 150, 243, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 77, 77, 0)');

        const isLargeSet = processedStats.length > 1000;
        
        const yValues = processedStats.map(s => s[currentChartType]).filter(v => v !== null && v !== undefined);
        const minVal = yValues.length ? Math.min(...yValues) : 0;
        const maxVal = yValues.length ? Math.max(...yValues) : 0;
        let suggestedMin = minVal;
        let suggestedMax = maxVal;
        
        if (currentChartType === 'subscribers') {
            const latestSub = currentChannelData.subscribers;
            const getTruncationRes = (val) => {
                if (val >= 100000000) return 1000000;
                if (val >= 10000000) return 100000;
                if (val >= 1000000)  return 10000;
                if (val >= 100000)   return 1000;
                return 1;
            };
            const res = getTruncationRes(latestSub);
            if (maxVal - minVal < res) {
                const center = (maxVal + minVal) / 2;
                suggestedMin = center - res / 2;
                suggestedMax = center + res / 2;
            }
        }

        growthChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: currentChartType === 'subscribers' ? 'Subscribers' : 'Total Views',
                    data: processedStats.map(s => ({ x: new Date(s.recorded_at), y: s[currentChartType] })),
                    borderColor: currentChartType === 'subscribers' ? '#ff4d4d' : '#2196f3',
                    borderWidth: isLargeSet ? 2 : 3,
                    pointRadius: isLargeSet ? 0 : 2,
                    pointHoverRadius: 6,
                    fill: true,
                    backgroundColor: gradient,
                    tension: isLargeSet ? 0 : 0.3,
                    spanGaps: true
                }]
            },
            options: {
                animation: isLargeSet ? false : { duration: 1000 },
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: { 
                        backgroundColor: '#1a1a20', 
                        titleColor: '#fff', 
                        bodyColor: '#ccc',
                        callbacks: {
                            title: (items) => {
                                return new Date(items[0].parsed.x).toLocaleString([], { 
                                    month: 'short', day: 'numeric', year: 'numeric', 
                                    hour: '2-digit', minute: '2-digit' 
                                });
                            }
                        }
                    },
                    zoom: {
                        zoom: {
                            drag: { enabled: true, backgroundColor: 'rgba(255, 77, 77, 0.1)', borderColor: 'rgba(255, 77, 77, 0.4)', borderWidth: 1 },
                            mode: 'x'
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: { unit: granularitySelect.value === 'hourly' ? 'hour' : 'day' },
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#888' },
                        offset: true
                    },
                    y: {
                        suggestedMin: suggestedMin,
                        suggestedMax: suggestedMax,
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#888', callback: value => formatNumber(value) }
                    }
                }
            }
        });
    };

    const downloadCSV = () => {
        if (!currentChannelData) return;
        
        const stats = getProcessedStats();
        const headers = ['Timestamp', 'Subscribers', 'Views', 'Videos'];
        const rows = stats.map(s => [
            new Date(s.recorded_at).toISOString().replace('T', ' ').substring(0, 19),
            s.subscribers,
            s.views,
            s.videos
        ]);
        
        let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        
        const granularity = granularitySelect.value;
        link.setAttribute("download", `${currentChannelData.title}_analytics_${granularity}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- Compare Chart Logic ---
    const updateCompareChart = () => {
        const chartElem = document.getElementById('compareChart');
        if (!chartElem) return;
        const ctx = chartElem.getContext('2d');
        if (compChart) compChart.destroy();
        if (compareData.length === 0) return;

        // Ensure canvas has dimensions before rendering (fixes 'Empty Graph' issue)
        if (chartElem.clientWidth === 0) {
            setTimeout(updateCompareChart, 100);
            return;
        }

        const granularity = document.getElementById('compareGranularitySelect').value;
        const colors = ['#ff4d4d', '#2196f3', '#9d50bb', '#00e676', '#ffb300', '#00bfa5', '#e91e63', '#3f51b5', '#cddc39', '#ff5722'];
        
        const datasets = compareData.map((channel, i) => {
            let statsToProcess = channel.stats || [];
            // Infinite History enabled for Comparison mode (v4.0)
            const processed = processChartStats(statsToProcess, granularity);
            const isLarge = processed.length > 1000;
            return {
                label: channel.title,
                data: processed.map(s => ({ x: new Date(s.recorded_at), y: s[compChartType] })),
                borderColor: colors[i % colors.length],
                borderWidth: 2,
                pointRadius: isLarge ? 0 : 2,
                pointHoverRadius: 5,
                fill: false,
                tension: isLarge ? 0 : 0.3,
                spanGaps: true
            };
        });

        compChart = new Chart(ctx, {
            type: 'line',
            data: { datasets },
            options: {
                animation: datasets.some(d => d.data.length > 1000) ? false : { duration: 1000 },
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'nearest', axis: 'x', intersect: false },
                plugins: {
                    legend: { labels: { color: '#fff' } },
                    tooltip: { 
                        backgroundColor: '#1a1a20',
                        callbacks: {
                            title: (items) => {
                                return new Date(items[0].parsed.x).toLocaleString([], { 
                                    month: 'short', day: 'numeric', year: 'numeric', 
                                    hour: '2-digit', minute: '2-digit' 
                                });
                            }
                        }
                    },
                    zoom: {
                        zoom: {
                            drag: { 
                                enabled: true, 
                                backgroundColor: 'rgba(255, 255, 255, 0.05)', 
                                borderColor: 'rgba(255, 255, 255, 0.2)', 
                                borderWidth: 1 
                            },
                            mode: 'x'
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: { unit: granularity === 'hourly' ? 'hour' : 'day' },
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#888' },
                        offset: true
                    },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#888', callback: value => formatNumber(value) }
                    }
                }
            }
        });
    };

    document.getElementById('resetGrowthZoom').addEventListener('click', () => { if (growthChart) growthChart.resetZoom(); });
    document.getElementById('resetCompareZoom').addEventListener('click', () => { if (compChart) compChart.resetZoom(); });



    const formatNumber = (num) => {
        if (num === null || num === undefined) return '0';
        if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    const showState = (state) => {
        loading.classList.add('hidden');
        errorState.classList.add('hidden');
        dashboard.classList.add('hidden');
        if (state === 'loading') loading.classList.remove('hidden');
        if (state === 'error') errorState.classList.remove('hidden');
        if (state === 'dashboard') dashboard.classList.remove('hidden');
    };

    searchBtn.addEventListener('click', handleSearch);
    channelInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    granularitySelect.addEventListener('change', updateChart);
    // Est button removed
    downloadBtn.addEventListener('click', downloadCSV);

    
    // Dashboard Tabs
    document.querySelectorAll('#dashboardSection .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#dashboardSection .tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentChartType = btn.dataset.type;
            updateChart();
        });
    });

    // Compare Controls
    document.getElementById('compareGranularitySelect').addEventListener('change', updateCompareChart);
    document.getElementById('compSubsBtn').addEventListener('click', function() {
        document.getElementById('compViewsBtn').classList.remove('active');
        this.classList.add('active');
        compChartType = 'subscribers';
        updateCompareChart();
    });
    document.getElementById('compViewsBtn').addEventListener('click', function() {
        document.getElementById('compSubsBtn').classList.remove('active');
        this.classList.add('active');
        compChartType = 'views';
        updateCompareChart();
    });


});
