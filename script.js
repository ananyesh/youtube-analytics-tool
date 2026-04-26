document.addEventListener('DOMContentLoaded', () => {
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

    // Initialize Odometers
    const subOdometer = new Odometer({ el: subCount, value: 0, format: '(,ddd)', theme: 'minimal' });
    const viewOdometer = new Odometer({ el: viewCount, value: 0, format: '(,ddd)', theme: 'minimal' });
    const videoOdometer = new Odometer({ el: videoCount, value: 0, format: '(,ddd)', theme: 'minimal' });

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
        
        clearInterval(liveStatsInterval);
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
            
            let rawStats = statsData[0].stats.reverse();
            let maxSubs = 0, maxViews = 0;
            statsData[0].stats = rawStats.filter(s => {
                if (s.subscribers === 0 && s.views === 0) return false;
                if (s.subscribers < maxSubs) s.subscribers = maxSubs; else maxSubs = s.subscribers;
                if (s.views < maxViews) s.views = maxViews; else maxViews = s.views;
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
        clearInterval(liveStatsInterval);
        // Poll every 2 seconds for truly live experience
        liveStatsInterval = setInterval(async () => {
            try {
                const res = await fetch(`https://ests.sctools.org/api/get/${channelId}`);
                const data = await res.json();
                if (data && data.stats) {
                    const estCount = Math.floor(data.stats.estCount);
                    subOdometer.update(estCount);
                    viewOdometer.update(data.stats.viewCount);
                    videoOdometer.update(data.stats.videoCount);

                    // RECORD LIVE POINT: Append to historical data for the session
                    if (currentChannelData && currentChannelData.id === channelId) {
                        const now = new Date().toISOString();
                        currentChannelData.stats.push({
                            recorded_at: now,
                            subscribers: estCount,
                            views: data.stats.viewCount,
                            videos: data.stats.videoCount
                        });
                        // Limit to 500 session points to prevent memory bloat
                        if (currentChannelData.stats.length > 500 + 30) {
                            currentChannelData.stats.splice(30, 1);
                        }
                        // Auto-refresh chart if on hourly view
                        if (granularitySelect.value === 'hourly') {
                            updateChart();
                        }
                    }
                }
            } catch (e) { console.warn('Live stats fetch failed', e); }
        }, 2000);
    };



    // --- Chart Logic ---
    const processChartStats = (stats, granularity) => {
        if (!stats || stats.length === 0) return [];
        
        // Group by period
        const groups = {};
        stats.forEach(item => {
            const date = new Date(item.recorded_at);
            let key;
            if (granularity === 'hourly') {
                key = date.toISOString().substring(0, 13); // YYYY-MM-DDTHH
            } else if (granularity === 'daily') {
                key = date.toISOString().split('T')[0];
            } else if (granularity === 'weekly') {
                const d = new Date(date);
                const day = d.getDay();
                const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                key = new Date(d.setDate(diff)).toISOString().split('T')[0];
            } else if (granularity === 'monthly') {
                key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            } else if (granularity === 'yearly') {
                key = `${date.getFullYear()}`;
            }
            groups[key] = item; // Latest point in period wins
        });

        // Gap filling
        if (granularity === 'daily' || granularity === 'hourly') {
            const sortedKeys = Object.keys(groups).sort();
            if (sortedKeys.length > 1) {
                const start = new Date(sortedKeys[0]);
                const end = new Date(sortedKeys[sortedKeys.length - 1]);
                let curr = new Date(start);
                
                while (curr <= end) {
                    let k;
                    if (granularity === 'daily') {
                        k = curr.toISOString().split('T')[0];
                        if (!groups[k]) {
                            groups[k] = { recorded_at: curr.toISOString(), subscribers: null, views: null, videos: null };
                        }
                        curr.setDate(curr.getDate() + 1);
                    } else {
                        k = curr.toISOString().substring(0, 13);
                        if (!groups[k]) {
                            groups[k] = { recorded_at: curr.toISOString(), subscribers: null, views: null, videos: null };
                        }
                        curr.setHours(curr.getHours() + 1);
                    }
                }
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
        const granularity = granularitySelect.value;
        const labels = processedStats.map(s => {
            const d = new Date(s.recorded_at);
            return granularity === 'hourly' 
                ? d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                : d.toLocaleDateString();
        });
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
                    spanGaps: false // User wants gaps for missing data
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

    // --- Compare Chart Logic ---
    const updateCompareChart = () => {
        const ctx = document.getElementById('compareChart').getContext('2d');
        if (compChart) compChart.destroy();
        
        if (compareData.length === 0) return;

        const granularity = document.getElementById('compareGranularitySelect').value;
        const colors = ['#ff4d4d', '#2196f3', '#9d50bb', '#00e676', '#ffb300', '#00bfa5', '#e91e63', '#3f51b5', '#cddc39', '#ff5722'];
        
        const datasets = compareData.map((channel, i) => {
            const processed = processChartStats(channel.stats, granularity);
            const isHourly = granularity === 'hourly';
            
            return {
                label: channel.title,
                data: processed.map(s => {
                    const d = new Date(s.recorded_at);
                    const label = isHourly ? d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString();
                    return { x: label, y: s[compChartType] };
                }),
                borderColor: colors[i % colors.length],
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 5,
                fill: false,
                tension: 0.3,
                spanGaps: false // User wants gaps for missing data
            };
        });

        compChart = new Chart(ctx, {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#fff' } },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    x: {
                        type: 'category',
                        labels: [...new Set(datasets.flatMap(d => d.data.map(p => p.x)))].sort((a,b)=>new Date(a)-new Date(b)),
                        grid: { display: false },
                        ticks: { color: '#666', maxTicksLimit: 12 }
                    },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#666', callback: (value) => formatNumber(value) }
                    }
                }
            }
        });
    };

    // --- Leaderboard Logic ---
    const fetchLeaderboard = async () => {
        const tbody = document.getElementById('leaderboardBody');
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
