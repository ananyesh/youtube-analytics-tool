document.addEventListener('DOMContentLoaded', () => {
    console.log('YT Analytics v5.4 Initialized');
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

    // Leaderboard State
    let leaderboardData = [];
    let leaderboardSort = 'subscribers';
    let leaderboardCat = 'All';

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
    channelInput.addEventListener('input', () => {
        const query = channelInput.value.trim();
        clearTimeout(suggestionTimeout);
        
        if (query.length < 2) {
            suggestions.classList.add('hidden');
            return;
        }

        suggestionTimeout = setTimeout(async () => {
            try {
                const res = await fetch(`https://api.vidiq.com/youtube/channels/public/search?query=${encodeURIComponent(query)}`);
                const data = await res.json();
                
                if (data && data.results && data.results.length > 0) {
                    renderSuggestions(data.results.slice(0, 5));
                } else {
                    suggestions.classList.add('hidden');
                }
            } catch (e) { console.error('Suggestion fetch failed', e); }
        }, 300);
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
                channelInput.value = res.id;
                suggestions.classList.add('hidden');
                handleSearch();
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
    const handleSearch = async () => {
        const query = channelInput.value.trim();
        if (!query) return;
        
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
        
        isEstimating = false;
        const estBtn = document.getElementById('estBtn');
        if (estBtn) estBtn.classList.remove('active');
        
        suggestions.classList.add('hidden');
        showState('loading');
        
        try {
            const cleanQuery = query
                .replace(/https?:\/\/(www\.)?youtube\.com\/(channel\/|user\/|c\/|@)?/g, '')
                .replace(/\/$/g, '');

            const searchRes = await fetch(`https://api.vidiq.com/youtube/channels/public/search?query=${encodeURIComponent(cleanQuery)}`);
            const searchData = await searchRes.json();

            if (!searchData || !searchData.results || searchData.results.length === 0) {
                throw new Error('No channel found matching your input.');
            }

            const channelId = searchData.results[0].id;
            const today = new Date().toISOString().split('T')[0];
            const fromDate = '2005-04-23'; 
            
            const statsRes = await fetch(`https://api.vidiq.com/youtube/channels/public/stats?ids=${channelId}&from=${fromDate}&to=${today}`);
            const statsData = await statsRes.json();

            if (!statsData || statsData.length === 0) {
                throw new Error('Could not retrieve stats for this channel.');
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
                const res = await fetch(`https://api.vidiq.com/youtube/channels/public/search?query=${encodeURIComponent(query)}`);
                const data = await res.json();
                
                if (data && data.results && data.results.length > 0) {
                    renderCompSuggestions(data.results.slice(0, 5));
                } else {
                    compareSuggestions.classList.add('hidden');
                }
            } catch (e) { console.error('Suggestion fetch failed', e); }
        }, 300);
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
                addChannelToCompare(res.id);
            });
            compareSuggestions.appendChild(item);
        });
        compareSuggestions.classList.remove('hidden');
    };

    const addChannelToCompare = async (channelId) => {
        if (compareData.length >= 10) return alert('Maximum 10 channels allowed for comparison.');
        if (compareData.find(c => c.id === channelId)) return alert('Channel already added.');
        
        try {
            const today = new Date().toISOString().split('T')[0];
            const statsRes = await fetch(`https://api.vidiq.com/youtube/channels/public/stats?ids=${channelId}&from=2005-04-23&to=${today}`);
            const statsData = await statsRes.json();
            
            if (!statsData || statsData.length === 0) throw new Error('Stats not found');
            
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


        // --- SMART SYNC LOOP: Recursive timeout to prevent stacking ---
        let isSyncing = false;
        const syncLive = async () => {
            if (isSyncing) return;
            isSyncing = true;
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout
                const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent('https://ests.sctools.org/api/get/' + channelId)}&cache=` + Date.now();
                const res = await fetch(proxyUrl, { signal: controller.signal });
                clearTimeout(timeoutId);
                const wrapper = await res.json();
                if (wrapper && wrapper.contents) {
                    const json = JSON.parse(wrapper.contents);
                    if (json && json.stats && json.stats.estCount) {
                        lastSimulatedSubs = Math.floor(json.stats.estCount);
                        if (json.stats.viewCount)  viewOdometer.update(json.stats.viewCount);
                        if (json.stats.videoCount) videoOdometer.update(json.stats.videoCount);
                    }
                }
            } catch (e) { /* Silent fallback — SCTools is down, simulation continues */ }
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
            const MAX_GAP_HOURS = 48; // Max hours to fill in one go for hourly
            const MAX_GAP_DAYS = 31;  // Max days to fill for daily/weekly
            
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
        let stats = currentChannelData.stats;
        
        if (isEstimating) {
            stats = estimateGrowth(stats);
        }
        
        return processChartStats(stats, granularity);
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
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#888', callback: value => formatNumber(value) }
                    }
                }
            }
        });
    };

    let isEstimating = false;
    let originalStats = null;

    const estimateGrowth = (stats) => {
        if (!stats || stats.length < 2) return stats;
        
        // Deep clone to avoid modifying source
        const estStats = JSON.parse(JSON.stringify(stats));
        
        // Find indices where subscribers change
        const changeIndices = [];
        for (let i = 0; i < estStats.length; i++) {
            if (i === 0 || i === estStats.length - 1 || estStats[i].subscribers !== estStats[i - 1].subscribers) {
                changeIndices.push(i);
            }
        }

        // Interpolate between changes based on views
        for (let k = 0; k < changeIndices.length - 1; k++) {
            const startIdx = changeIndices[k];
            const endIdx = changeIndices[k+1];
            
            const startSub = estStats[startIdx].subscribers;
            const endSub = estStats[endIdx].subscribers;
            const startView = estStats[startIdx].views;
            const endView = estStats[endIdx].views;
            
            const subDiff = endSub - startSub;
            // Handle negative views (audits/deletions) as positive magnitude
            const viewDiff = Math.abs(endView - startView); 
            
            if (viewDiff > 0 && subDiff !== 0) {
                const ratio = subDiff / viewDiff;
                for (let j = startIdx + 1; j < endIdx; j++) {
                    const currentViewDiff = Math.abs(estStats[j].views - startView);
                    let estimated = Math.floor(startSub + (currentViewDiff * ratio));
                    
                    // Clamp to prevent spikes above/below the known step boundaries
                    const min = Math.min(startSub, endSub);
                    const max = Math.max(startSub, endSub);
                    estStats[j].subscribers = Math.max(min, Math.min(max, estimated));
                }
            } else if (subDiff === 0 && k > 0 && endIdx === estStats.length - 1) {
                // ONLY apply prevRatio if this is the very last segment (live growth)
                // Otherwise, historical flat periods should stay flat
                const prevStartIdx = changeIndices[k-1];
                const prevEndIdx = changeIndices[k];
                const prevSubDiff = estStats[prevEndIdx].subscribers - estStats[prevStartIdx].subscribers;
                const prevViewDiff = Math.abs(estStats[prevEndIdx].views - estStats[prevStartIdx].views);
                const prevRatio = prevSubDiff / (prevViewDiff || 1);
                
                if (prevRatio !== 0) {
                    for (let j = startIdx + 1; j <= endIdx; j++) {
                        const currentViewDiff = Math.abs(estStats[j].views - startView);
                        estStats[j].subscribers = Math.floor(startSub + (currentViewDiff * Math.abs(prevRatio)));
                    }
                }
            }
        }
        
        return estStats;
    };

    const downloadCSV = () => {
        if (!currentChannelData) return;
        
        // Use estimated stats if active
        let sourceStats = currentChannelData.stats;
        if (isEstimating) {
            sourceStats = estimateGrowth(sourceStats);
        }
        
        const stats = processChartStats(sourceStats, granularitySelect.value);
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
        link.setAttribute("download", `${currentChannelData.title}_${isEstimating ? 'estimated_' : ''}analytics_${granularitySelect.value}.csv`);
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

    // --- Leaderboard Logic ---
    const fetchLeaderboard = async () => {
        const tbody = document.getElementById('leaderboardBody');
        if (!tbody) return; // Maintenance Mode: Prevent error while leaderboard is offline
        tbody.innerHTML = '<tr><td colspan="4" class="text-center"><i class="fas fa-spinner fa-spin"></i> Fetching Live Stats for Top Global Channels...</td></tr>';
        
        try {
            // Using a broader Dec 2025 window and chunking into batches of 10 for reliability
            const fromDate = "2025-12-01";
            const toDate = "2025-12-31";
            const chunkSize = 10;
            let allStats = [];

            for (let i = 0; i < topChannelsDB.length; i += chunkSize) {
                const chunk = topChannelsDB.slice(i, i + chunkSize);
                const ids = chunk.map(c => c.id).join(',');
                try {
                    const statsRes = await fetch(`https://api.vidiq.com/youtube/channels/public/stats?ids=${ids}&from=${fromDate}&to=${toDate}`);
                    if (!statsRes.ok) throw new Error(`HTTP ${statsRes.status}`);
                    const statsData = await statsRes.json();
                    if (Array.isArray(statsData)) {
                        allStats = allStats.concat(statsData);
                    }
                } catch (chunkErr) {
                    console.warn(`Leaderboard chunk ${i} failed:`, chunkErr);
                }
            }

            if (allStats.length === 0) throw new Error('No data retrieved from API');

            leaderboardData = allStats.map(data => {
                const stats = data.stats || [];
                const latestStat = stats.length > 0 ? stats[stats.length - 1] : { subscribers: 0, views: 0 };
                const dbInfo = topChannelsDB.find(db => db.id === data.id);
                return {
                    ...data,
                    subscribers: latestStat.subscribers || 0,
                    views: latestStat.views || 0,
                    category: dbInfo ? dbInfo.cat : "Unknown"
                };
            });
            
            renderLeaderboard();
        } catch(e) {
            console.error('Leaderboard load failed:', e);
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">Failed to load leaderboard. Please try again later.</td></tr>';
        }
    };

    const renderLeaderboard = () => {
        const tbody = document.getElementById('leaderboardBody');
        tbody.innerHTML = '';
        
        let filteredData = leaderboardData;
        if (leaderboardCat !== 'All') {
            filteredData = filteredData.filter(c => c.category === leaderboardCat);
        }
        
        // Sort data explicitly
        filteredData.sort((a, b) => {
            const valA = a[leaderboardSort] || 0;
            const valB = b[leaderboardSort] || 0;
            return valB - valA;
        });
        
        if (filteredData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No channels found for this category.</td></tr>';
            return;
        }

        filteredData.forEach((channel, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="rank">#${index + 1}</td>
                <td>
                    <div class="channel-cell">
                        <img src="${getThumb(channel)}" alt="" onerror="this.src='https://www.youtube.com/s/desktop/5732ef2e/img/favicon_144x144.png'">
                        <div>
                            <div>${channel.title}</div>
                            <div style="font-size:0.75rem; color:var(--text-secondary);">${channel.category}</div>
                        </div>
                    </div>
                </td>
                <td>${formatNumber(channel.subscribers)}</td>
                <td>${formatNumber(channel.views)}</td>
            `;
            tbody.appendChild(tr);
        });
    };

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
    const estBtn = document.getElementById('estBtn');
    if (estBtn) {
        estBtn.addEventListener('click', () => {
            isEstimating = !isEstimating;
            estBtn.classList.toggle('active', isEstimating);
            updateChart();
        });
    }
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

    // Leaderboard Controls
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            leaderboardSort = btn.dataset.sort;
            renderLeaderboard();
        });
    });
    
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            leaderboardCat = btn.dataset.cat;
            renderLeaderboard();
        });
    });

    // Trigger Leaderboard Fetch on load
    fetchLeaderboard();
});
