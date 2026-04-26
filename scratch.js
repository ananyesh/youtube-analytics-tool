const names = ['MrBeast', 'T-Series', 'Cocomelon - Nursery Rhymes', 'SET India', 'Kids Diana Show', 'PewDiePie', 'Like Nastya', 'Vlad and Niki', 'Zee Music Company', 'WWE', 'BLACKPINK', 'Goldmines', 'Sony SAB', '5-Minute Crafts', 'BANGTANTV', 'Justin Bieber', 'HYBE LABELS', 'Zee TV', 'Canal KondZilla', 'Pinkfong Baby Shark', 'ChuChu TV', 'Colors TV', 'Ed Sheeran', 'EminemMusic', 'Badabun', 'A4', 'Aaj Tak', 'JuegaGerman', 'Taylor Swift'];

async function run() {
    for(let n of names) {
        try {
            const res = await fetch('https://api.vidiq.com/youtube/channels/public/search?query=' + encodeURIComponent(n));
            const json = await res.json();
            if(json.results && json.results.length > 0) {
                console.log(`{ id: "${json.results[0].id}", title: "${json.results[0].title}" }, // ${n}`);
            }
        } catch(e) {}
    }
}
run();
