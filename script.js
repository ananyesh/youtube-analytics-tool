document.addEventListener('DOMContentLoaded', () => {
    const channelInput = document.getElementById('channelInput');
    const searchBtn = document.getElementById('searchBtn');
    const loading = document.getElementById('loading');
    const errorState = document.getElementById('errorState');
    const errorMsg = document.getElementById('errorMsg');
    const dashboard = document.getElementById('dashboard');
    const granularitySelect = document.getElementById('granularitySelect');
    const downloadBtn = document.getElementById('downloadBtn');
    const fetchLogosBtn = document.getElementById('fetchLogosBtn');
    const logoGallery = document.getElementById('logoGallery');
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
                <img src="${res.thumbnail_url}" alt="">
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

        suggestions.classList.add('hidden');
        showState('loading');
        logoGallery.innerHTML = `
            <div class="gallery-empty">
                <i class="fas fa-image"></i>
                <p>Click the button to scan archives for previous logos</p>
            </div>`;
        
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
                
                // Ensure non-decreasing (fix for data glitches)
                if (s.subscribers < maxSubs) s.subscribers = maxSubs;
                else maxSubs = s.subscribers;
                
                if (s.views < maxViews) s.views = maxViews;
                else maxViews = s.views;
                
                return true;
            });

            statsData[0].stats = cleanedStats;
            currentChannelData = statsData[0];

            renderDashboard();
            showState('dashboard');
        } catch (err) {
            console.error(err);
            errorMsg.textContent = err.message;
            showState('error');
        }
    };

    const renderDashboard = () => {
        const data = currentChannelData;
        logoContainer.innerHTML = `<img src="${data.thumbnail_url}" class="header-thumb" alt="Profile">`;
        channelThumbnail.src = data.thumbnail_url;
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
        subCount.textContent = formatNumber(latestStats.subscribers);
        viewCount.textContent = formatNumber(latestStats.views);
        videoCount.textContent = formatNumber(latestStats.videos);
        updateChart();
    };

    // --- Wayback Machine Logic ---

    const fetchProxy = async (url) => {
        const proxies = [
            `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
            `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
            `https://corsproxy.io/?${encodeURIComponent(url)}`,
            `https://thingproxy.freeboard.io/fetch/${url}`
        ];
        for (const proxyUrl of proxies) {
            try {
                const res = await fetch(proxyUrl);
                if (!res.ok) continue;
                if (proxyUrl.includes('allorigins')) {
                    const data = await res.json();
                    return data.contents;
                } else {
                    return await res.text();
                }
            } catch (e) { console.warn(`Proxy ${proxyUrl} failed`, e); }
        }
        if (window.location.protocol === 'https:') {
            try {
                const res = await fetch(url);
                if (res.ok) return await res.text();
            } catch (e) {}
        }
        throw new Error('All CORS proxies failed. Try running from a live server (GitHub Pages).');
    };

    const fetchHistoricalLogos = async () => {
        if (!currentChannelData) return;
        const channelId = currentChannelData.id;
        const channelUrl = `https://www.youtube.com/channel/${channelId}`;
        fetchLogosBtn.disabled = true;
        fetchLogosBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Searching Archives...</span>';
        logoGallery.innerHTML = '<div class="gallery-empty"><p>Scanning Wayback Machine snapshots...</p></div>';
        try {
            const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(channelUrl)}&output=json&collapse=timestamp:6&filter=statuscode:200`;
            const cdxText = await fetchProxy(cdxUrl);
            let snapshots = [];
            try {
                snapshots = JSON.parse(cdxText);
                if (Array.isArray(snapshots) && snapshots.length > 0 && snapshots[0][0] === 'urlkey') {
                    snapshots.shift(); 
                }
            } catch (e) {
                snapshots = cdxText.trim().split('\n').map(line => line.split(' '));
            }
            if (!Array.isArray(snapshots) || snapshots.length === 0) {
                throw new Error('No historical snapshots found.');
            }
            const step = Math.max(1, Math.floor(snapshots.length / 8));
            const targetSnapshots = [];
            for (let i = 0; i < snapshots.length; i += step) {
                if (snapshots[i]) targetSnapshots.push(snapshots[i]);
                if (targetSnapshots.length >= 8) break;
            }
            const estSeconds = targetSnapshots.length * 2;
            logoGallery.innerHTML = `<div class="gallery-empty"><p>Found ${targetSnapshots.length} snapshots. Est. time: ${estSeconds}s...</p></div>`;
            const foundLogos = new Set();
            for (let i = 0; i < targetSnapshots.length; i++) {
                const snap = targetSnapshots[i];
                if (!snap || !snap[1]) continue;
                const timestamp = snap[1];
                const archiveUrl = `https://web.archive.org/web/${timestamp}/${channelUrl}`;
                fetchLogosBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span>Processing ${i+1}/${targetSnapshots.length}...</span>`;
                try {
                    const html = await fetchProxy(archiveUrl);
                    const logoRegex = /https:\/\/(yt3\.ggpht\.com\/[a-zA-Z0-9\-_=]+|lh3\.googleusercontent\.com\/[a-zA-Z0-9\-_=]+)/g;
                    const nameRegex = /<title>(.*?) - YouTube<\/title>/;
                    const matches = html.match(logoRegex);
                    const nameMatch = html.match(nameRegex);
                    const historicalName = nameMatch ? nameMatch[1].replace(' - YouTube', '') : currentChannelData.title;
                    if (matches) {
                        const rawLogo = matches.find(m => !m.includes('favicon') && !m.includes('icon'));
                        if (rawLogo) {
                            const cleanLogo = rawLogo.split('=')[0]; 
                            if (!foundLogos.has(cleanLogo)) {
                                foundLogos.add(cleanLogo);
                                if (foundLogos.size === 1) logoGallery.innerHTML = '';
                                const proxiedLogoUrl = `https://web.archive.org/web/${timestamp}im_/${cleanLogo}`;
                                addLogoToGallery(proxiedLogoUrl, timestamp, historicalName);
                            }
                        }
                    }
                } catch (e) { console.warn('Snapshot fetch failed', e); }
            }
            if (foundLogos.size === 0) {
                logoGallery.innerHTML = '<div class="gallery-empty"><p>No previous logos found in snapshots.</p></div>';
            }
        } catch (err) {
            console.error(err);
            logoGallery.innerHTML = `<div class="gallery-empty"><p class="error">${err.message}</p></div>`;
        } finally {
            fetchLogosBtn.disabled = false;
            fetchLogosBtn.innerHTML = '<i class="fas fa-sync"></i> <span>Fetch from Wayback</span>';
        }
    };

    const addLogoToGallery = (url, timestamp, name) => {
        const year = timestamp.substring(0, 4);
        const month = timestamp.substring(4, 6);
        const day = timestamp.substring(6, 8);
        const dateStr = `${year}-${month}-${day}`;
        const item = document.createElement('div');
        item.className = 'logo-item';
        item.innerHTML = `
            <img src="${url}" alt="Historical Logo" onerror="this.src='https://www.youtube.com/s/desktop/5732ef2e/img/favicon_144x144.png'">
            <div class="logo-name" title="${name}">${name}</div>
            <div class="date"><i class="far fa-clock"></i> ${dateStr}</div>
        `;
        logoGallery.appendChild(item);
    };

    // --- Chart Logic ---

    const getProcessedStats = () => {
        const granularity = granularitySelect.value;
        const stats = currentChannelData.stats;
        
        if (granularity === 'daily') return stats;
        
        // Group by period and take the LATEST entry for each period (since it's cumulative)
        const groups = {};
        stats.forEach(item => {
            const date = new Date(item.recorded_at);
            let key;
            if (granularity === 'weekly') {
                const d = new Date(date);
                const day = d.getDay();
                const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                key = new Date(d.setDate(diff)).toISOString().split('T')[0];
            } else if (granularity === 'monthly') {
                key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            } else if (granularity === 'yearly') {
                key = `${date.getFullYear()}`;
            }
            groups[key] = item; // Keep overwriting so we get the latest point in the group
        });
        
        return Object.keys(groups).sort().map(key => groups[key]);
    };

    const updateChart = () => {
        if (!currentChannelData) return;

        const processedStats = getProcessedStats();
        const ctx = document.getElementById('growthChart').getContext('2d');
        const labels = processedStats.map(s => new Date(s.recorded_at).toLocaleDateString());
        const values = processedStats.map(s => s[currentChartType]);

        if (growthChart) growthChart.destroy();

        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, currentChartType === 'subscribers' ? 'rgba(255, 77, 77, 0.4)' : 'rgba(33, 150, 243, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 77, 77, 0)');

        growthChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: currentChartType === 'subscribers' ? 'Subscribers' : 'Total Views',
                    data: values,
                    borderColor: currentChartType === 'subscribers' ? '#ff4d4d' : '#2196f3',
                    borderWidth: 3,
                    pointRadius: processedStats.length > 100 ? 0 : 3,
                    pointHoverRadius: 6,
                    fill: true,
                    backgroundColor: gradient,
                    tension: 0.3,
                    spanGaps: true // Handle missing data points gracefully
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(20, 20, 30, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#a0a0b8',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        padding: 12
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#666', maxTicksLimit: 12 }
                    },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { 
                            color: '#666',
                            callback: (value) => formatNumber(value)
                        }
                    }
                }
            }
        });
    };

    const downloadCSV = () => {
        if (!currentChannelData) return;
        const stats = getProcessedStats();
        const headers = ['Date', 'Subscribers', 'Views', 'Videos'];
        const rows = stats.map(s => [
            new Date(s.recorded_at).toISOString().split('T')[0],
            s.subscribers,
            s.views,
            s.videos
        ]);
        let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${currentChannelData.title}_analytics_${granularitySelect.value}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
    downloadBtn.addEventListener('click', downloadCSV);
    fetchLogosBtn.addEventListener('click', fetchHistoricalLogos);
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentChartType = btn.dataset.type;
            updateChart();
        });
    });
});
