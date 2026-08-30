// JS Logic pou paj Vidéo AI a
document.addEventListener('DOMContentLoaded', () => {
    loadVideos();
});

let allVideos = [];

async function loadVideos() {
    const grid = document.getElementById('video-grid');
    const filters = document.getElementById('cat-filters');
    
    try {
        const { data: videos, error } = await window.supabaseClient
            .from('videos_ai')
            .select('id, title, description, category, price, thumbnail_url, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        allVideos = videos || [];
        
        // Extrè kategori ki ekziste yo pou bouton filtre yo
        const categories = [...new Set(allVideos.map(v => v.category))];
        
        categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'cat-btn';
            btn.textContent = cat;
            btn.dataset.cat = cat;
            btn.onclick = () => filterVideos(cat, btn);
            filters.appendChild(btn);
        });

        // Add event listener to "All" button
        const allBtn = document.querySelector('.cat-btn[data-cat="all"]');
        if (allBtn) {
            allBtn.onclick = () => filterVideos('all', allBtn);
        }

        renderVideos(allVideos);

    } catch (err) {
        console.error("Erè chaje videyo:", err);
        grid.innerHTML = `<div style="text-align:center; width:100%; color:var(--danger); grid-column: 1 / -1; padding: 40px;">⚠️ Gen yon pwoblèm lè n ap chaje videyo yo. Tanpri verifye baz de done a.</div>`;
    }
}

function filterVideos(category, btn) {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    if (category === 'all') {
        renderVideos(allVideos);
    } else {
        const filtered = allVideos.filter(v => v.category === category);
        renderVideos(filtered);
    }
}

function convertImageUrl(rawUrl) {
    if (!rawUrl) return null;
    const url = rawUrl.trim();

    // Google Drive links
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (driveMatch) {
        return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w1000`;
    }
    const driveOpenMatch = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
    if (driveOpenMatch) {
        return `https://drive.google.com/thumbnail?id=${driveOpenMatch[1]}&sz=w1000`;
    }
    const driveUcMatch = url.match(/drive\.google\.com\/uc\?(?:[^&]+&)*id=([^&]+)/);
    if (driveUcMatch) {
        return `https://drive.google.com/thumbnail?id=${driveUcMatch[1]}&sz=w1000`;
    }

    // PostImg
    const postimgMatch = url.match(/^https?:\/\/(?:www\.)?postimg\.cc\/([^/\s?#]+)\/?/);
    if (postimgMatch && !url.includes('i.postimg.cc')) {
        return `https://i.postimg.cc/${postimgMatch[1]}`;
    }

    // Imgur
    const imgurPageMatch = url.match(/^https?:\/\/(?:www\.)?imgur\.com\/([a-zA-Z0-9]+)\/?$/);
    if (imgurPageMatch) {
        return `https://i.imgur.com/${imgurPageMatch[1]}.jpg`;
    }

    // Dropbox
    if (url.includes('dropbox.com') && url.includes('dl=0')) {
        return url.replace('dl=0', 'raw=1');
    }

    return url;
}

function renderVideos(videos) {
    const grid = document.getElementById('video-grid');
    grid.innerHTML = '';
    
    if (videos.length === 0) {
        grid.innerHTML = `<div style="text-align:center; width:100%; color:var(--text-2); grid-column: 1 / -1; padding: 40px;">Pa gen videyo pou kategori sa a kounye a.</div>`;
        return;
    }
    
    videos.forEach((v, index) => {
        const thumbUrl = convertImageUrl(v.thumbnail_url);
        
        const card = document.createElement('div');
        card.className = 'video-card';
        card.style.animation = `fadeUp 0.5s ease forwards ${index * 0.1}s`;
        card.style.opacity = '0';

        const thumbHTML = `
            <div class="video-thumb-wrap" style="position: relative; width: 100%; height: 200px; background: #0d0d12; overflow: hidden;">
                ${thumbUrl ? `<img src="${thumbUrl}" alt="" class="video-thumb" loading="lazy" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s ease;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : ''}
                <div class="video-thumb-placeholder" style="display: ${thumbUrl ? 'none' : 'flex'}; width: 100%; height: 100%; align-items: center; justify-content: center; flex-direction: column; background: linear-gradient(135deg, rgba(186,117,23,0.15) 0%, rgba(20,20,30,0.95) 100%); color: var(--text-2);">
                    <span style="font-size: 3rem; margin-bottom: 6px; filter: drop-shadow(0 2px 8px rgba(0,0,0,0.5));">🎬</span>
                    <span style="font-size: 0.75rem; color: var(--primary); font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase;">${v.category || 'Vidéo AI'}</span>
                </div>
                <div class="play-badge" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 48px; height: 48px; background: rgba(0, 0, 0, 0.65); border: 2px solid var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(0,0,0,0.4); pointer-events: none;">
                    <span style="color: var(--primary); font-size: 1.1rem; margin-left: 3px;">▶</span>
                </div>
            </div>
        `;

        card.innerHTML = `
            ${thumbHTML}
            <div class="video-content">
                <div class="video-category">${v.category}</div>
                <h3 class="video-title">${v.title}</h3>
                <p class="video-desc">${v.description || ''}</p>
                <div class="video-footer">
                    <div class="video-price">$${v.price.toFixed(2)} USD</div>
                    <button class="btn btn-sm primary gold" onclick="openVideoModal('${v.id}', '${v.title.replace(/'/g, "\\'")}', ${v.price})">Achte Videyo Sa</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Modal Logic
function openVideoModal(id, title, price) {
    document.getElementById('buy-video-id').value = id;
    document.getElementById('modal-video-title').textContent = title;
    document.getElementById('modal-video-price').textContent = `$${price.toFixed(2)} USD`;
    selectVideoGateway('stripe');
    document.getElementById('video-modal').style.display = 'flex';
}

function closeVideoModal() {
    document.getElementById('video-modal').style.display = 'none';
}

function selectVideoGateway(gateway) {
    document.getElementById('buy-gateway').value = gateway;
    const cards = document.querySelectorAll('.video-pay-gateway');
    cards.forEach(card => {
        if (card.dataset.gateway === gateway) {
            card.classList.add('active');
            card.style.borderColor = 'var(--primary)';
        } else {
            card.classList.remove('active');
            card.style.borderColor = 'rgba(255,255,255,0.1)';
        }
    });

    const btn = document.getElementById('btn-submit-buy');
    if (gateway === 'moncash') {
        btn.textContent = 'Peye ak MonCash →';
    } else {
        btn.textContent = 'Peye ak Kat Kredi (Stripe) →';
    }
}

async function submitBuyVideo(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-buy');
    const gateway = document.getElementById('buy-gateway').value || 'stripe';
    btn.disabled = true;
    btn.innerHTML = 'L ap trete...';
    
    const email = document.getElementById('buy-email').value;
    const videoId = document.getElementById('buy-video-id').value;
    
    try {
        const { data, error } = await window.supabaseClient.functions.invoke('create-video-checkout', {
            body: {
                email: email,
                video_id: videoId,
                gateway: gateway
            }
        });
        
        if (error) throw error;
        if (data && data.url) {
            window.location.href = data.url; // Redirect to Stripe or MonCash payment URL
        } else if (data && data.error) {
            throw new Error(data.error);
        } else {
            throw new Error("Pa gen URL peman ki retounen.");
        }
    } catch (err) {
        console.error("Erè peman:", err);
        alert(err.message || "Peman an echwe oswa pa disponib kounye a. Tanpri eseye ankò pi ta.");
        btn.disabled = false;
        selectVideoGateway(gateway);
    }
}

// Animation styles dynamic
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;
document.head.appendChild(style);
