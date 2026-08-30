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
            .select('*')
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

function renderVideos(videos) {
    const grid = document.getElementById('video-grid');
    grid.innerHTML = '';
    
    if (videos.length === 0) {
        grid.innerHTML = `<div style="text-align:center; width:100%; color:var(--text-2); grid-column: 1 / -1; padding: 40px;">Pa gen videyo pou kategori sa a kounye a.</div>`;
        return;
    }
    
    videos.forEach((v, index) => {
        const thumbHTML = v.thumbnail_url 
            ? `<img src="${v.thumbnail_url}" alt="${v.title}" class="video-thumb" loading="lazy">` 
            : `<div class="video-thumb-placeholder">🎬</div>`;
            
        const card = document.createElement('div');
        card.className = 'video-card';
        card.style.animation = `fadeUp 0.5s ease forwards ${index * 0.1}s`;
        card.style.opacity = '0';
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
    document.getElementById('video-modal').style.display = 'flex';
}

function closeVideoModal() {
    document.getElementById('video-modal').style.display = 'none';
}

async function submitBuyVideo(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-buy');
    btn.disabled = true;
    btn.innerHTML = 'L ap trete...';
    
    const email = document.getElementById('buy-email').value;
    const videoId = document.getElementById('buy-video-id').value;
    
    try {
        // Retrieve backend function URL dynamically (using the same domain or edge function url)
        // Here we use Supabase functions invoke
        const { data, error } = await window.supabaseClient.functions.invoke('create-video-checkout', {
            body: {
                email: email,
                video_id: videoId
            }
        });
        
        if (error) throw error;
        if (data && data.url) {
            window.location.href = data.url; // Redirect to Stripe
        } else {
            throw new Error("Pa gen URL peman ki retounen.");
        }
    } catch (err) {
        console.error("Erè peman:", err);
        alert("Peman an echwe oswa pa disponib kounye a. Tanpri eseye ankò pi ta.");
        btn.disabled = false;
        btn.innerHTML = 'Kontinye nan Peman an →';
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
