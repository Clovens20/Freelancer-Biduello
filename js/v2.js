/**
 * DJ Innovations V2 — Nouvelles fonctionnalités
 * FAQ accordéon, Témoignages, Portfolio, Devis Entreprises,
 * Toast notifications, Back-to-top, Mobile nav, Tracking
 */

document.addEventListener('DOMContentLoaded', () => {
    initV2();
});

async function initV2() {
    setupBackToTop();
    setupScrollSpy();
    await loadTemoignages();
    await loadPortfolio();
    await loadFaq();
    initCounters();
}

// ── MOBILE NAV ─────────────────────────────────────────────────

window.toggleMobileNav = function() {
    const nav = document.getElementById('nav-links');
    const btn = document.getElementById('hamburger-btn');
    if (!nav) return;
    const isOpen = nav.classList.toggle('open');
    if (btn) btn.classList.toggle('open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';

    // Fermer au clic sur un lien
    if (isOpen) {
        nav.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => {
                nav.classList.remove('open');
                btn.classList.remove('open');
                document.body.style.overflow = '';
            }, { once: true });
        });
    }
};

// ── SCROLL SPY (nav active links) ──────────────────────────────

function setupScrollSpy() {
    const header = document.getElementById('site-header');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;

        // Header compact après 80px
        if (header) {
            header.classList.toggle('scrolled', scrollY > 80);
        }

        // Back-to-top visibility
        const btn = document.getElementById('back-to-top');
        if (btn) btn.classList.toggle('visible', scrollY > 400);

        lastScroll = scrollY;
    }, { passive: true });

    // Active section highlight
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                navLinks.forEach(link => {
                    const href = link.getAttribute('href');
                    link.classList.toggle('active-nav', href === `#${id}`);
                });
            }
        });
    }, { threshold: 0.3 });

    sections.forEach(s => observer.observe(s));
}

// ── BACK TO TOP ─────────────────────────────────────────────────

function setupBackToTop() {
    const btn = document.getElementById('back-to-top');
    if (!btn) return;
    // La visibilité est gérée par setupScrollSpy
}

// ── TEMOIGNAGES ─────────────────────────────────────────────────

async function loadTemoignages() {
    const grid = document.getElementById('temoignages-grid');
    if (!grid) return;

    try {
        if (!window.supabaseClient) throw new Error("Supabase not ready");

        const { data, error } = await window.supabaseClient
            .from('temoignages')
            .select('*')
            .eq('actif', true)
            .order('ordre', { ascending: true });

        if (error || !data || data.length === 0) {
            renderTemoignages(grid, getDefaultTemoignages());
        } else {
            renderTemoignages(grid, data);
        }
    } catch (e) {
        console.warn("Supabase loadTemoignages error, using fallback:", e);
        renderTemoignages(grid, getDefaultTemoignages());
    }
}

function getDefaultTemoignages() {
    return [
        { id: 1, nom: 'Wadline P.', service: 'Coaching', badge_resultat: '+40% vant nan 30 jou', citation: 'Aprè 1 mwa coaching, biznis mwen chanje nèt. DJ se yon ekspè vrèman!', avatar_url: 'assets/avatars/haitian_woman_1_1777075567329.png' },
        { id: 2, nom: 'Judson F.', service: 'Facebook Ads', badge_resultat: 'ROAS 5.1x', citation: 'Mwen depanse $200 reklam, mwen fè $1020 vant. Mèsi anpil!', avatar_url: 'assets/avatars/haitian_man_1_1777075578948.png' },
        { id: 3, nom: 'Dieula V.', service: 'TikTok Ads', badge_resultat: '10k followers nan 3 semèn', citation: 'TikTok mwen te mouri, kounye a li ap boule chak jou!', avatar_url: 'assets/avatars/haitian_woman_2_1777075589349.png' },
        { id: 4, nom: 'Marc-Arthur T.', service: 'Coaching Business', badge_resultat: '3x plis kliyan', citation: 'Estrateji DJ ba mwen an chanje tout bagay pou antrepriz mwen.', avatar_url: 'assets/avatars/haitian_man_2_1777075602573.png' },
        { id: 5, nom: 'Daphney J.', service: 'Facebook Ads', badge_resultat: '+65% trafik', citation: 'Kliyan ap rele mwen kounye a, mwen pa bezwen kouri dèyè yo ankò!', avatar_url: 'assets/avatars/haitian_woman_3_1777075617264.png' },
        { id: 6, nom: 'Woodensky C.', service: 'Coaching', badge_resultat: 'Lanse biznis nan 45 jou', citation: 'Mwen pa t konn kote pou kòmanse, DJ gide mwen pas-a-pas.', avatar_url: 'assets/avatars/haitian_man_3_1777075630903.png' }
    ];
}

function renderTemoignages(grid, items) {
    grid.innerHTML = items.map(t => {
        const initials = (t.nom || 'K').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
        return `
        <div class="temo-card" data-animate="fade-up">
            <div class="temo-badge">${t.badge_resultat || '+Results'}</div>
            <p class="temo-quote">${t.citation}</p>
            <div class="temo-author">
                ${t.avatar_url
                    ? `<img class="temo-avatar" src="${t.avatar_url}" alt="${t.nom}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
                    : ''
                }
                <div class="temo-avatar-placeholder" style="${t.avatar_url ? 'display:none' : ''}">${initials}</div>
                <div>
                    <div class="temo-name">${t.nom}</div>
                    <div class="temo-service">${t.service}</div>
                    <div class="temo-stars">★★★★★</div>
                </div>
            </div>
        </div>`;
    }).join('');

    // Réanimer les nouvelles cartes
    grid.querySelectorAll('[data-animate]').forEach(el => {
        const io = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
            });
        }, { threshold: 0.1 });
        io.observe(el);
    });
}

// ── TEMOIGNAGE CLIENT SUBMISSION ────────────────────────────────
window.openTemoignageModal = function() {
    const modal = document.getElementById('temoignage-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
};

window.closeTemoignageModal = function() {
    const modal = document.getElementById('temoignage-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
        document.getElementById('form-temoignage').reset();
    }
};

window.submitTemoignage = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-temo');
    const originalText = btn.textContent;
    btn.textContent = 'Ap voye...';
    btn.disabled = true;

    try {
        if (!window.supabaseClient) throw new Error("Supabase pa disponib");

        const nom = document.getElementById('temo-nom').value;
        const service = document.getElementById('temo-service').value;
        const badge = document.getElementById('temo-badge').value;
        const citation = document.getElementById('temo-citation').value;
        const photoInput = document.getElementById('temo-photo');
        
        let avatarBase64 = null;
        if (photoInput.files && photoInput.files[0]) {
            avatarBase64 = await compressImageToBase64(photoInput.files[0]);
        }

        const { error } = await window.supabaseClient
            .from('temoignages')
            .insert([{
                nom: nom,
                service: service,
                badge_resultat: badge || '+Rezila',
                citation: citation,
                avatar_url: avatarBase64,
                actif: false, // En attente d'approbation
                ordre: 99
            }]);

        if (error) throw error;

        // Succès
        btn.textContent = '✅ Soumèt avek siksè !';
        btn.style.background = 'var(--success)';
        btn.style.borderColor = 'var(--success)';
        
        setTimeout(() => {
            closeTemoignageModal();
            btn.textContent = originalText;
            btn.style.background = '';
            btn.style.borderColor = '';
            btn.disabled = false;
            
            if (window.showToast) {
                window.showToast('Mèsi! Temwayaj ou a anba evalyasyon.', 'success');
            } else {
                alert('Mèsi! Temwayaj ou a anba evalyasyon.');
            }
        }, 2000);

    } catch (err) {
        console.error("Erè soumèt temwayaj:", err);
        btn.textContent = '❌ Erè, Eseye Ankò';
        btn.style.background = 'var(--error)';
        btn.style.borderColor = 'var(--error)';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
            btn.style.borderColor = '';
            btn.disabled = false;
        }, 3000);
    }
};

function compressImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 200;
                const MAX_HEIGHT = 200;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = error => reject(error);
        };
        reader.onerror = error => reject(error);
    });
}

// ── PORTFOLIO ───────────────────────────────────────────────────

async function loadPortfolio() {
    const grid = document.getElementById('portfolio-grid');
    if (!grid) return;

    try {
        if (!window.supabaseClient) throw new Error("Supabase not ready");

        const { data, error } = await window.supabaseClient
            .from('portfolio_campagnes')
            .select('*')
            .eq('actif', true)
            .order('ordre', { ascending: true });

        if (error || !data || data.length === 0) {
            renderPortfolio(grid, getDefaultPortfolio());
        } else {
            renderPortfolio(grid, data);
        }
    } catch (e) {
        console.warn("Supabase loadPortfolio error, using fallback:", e);
        renderPortfolio(grid, getDefaultPortfolio());
    }
}

function getDefaultPortfolio() {
    return [
        { id: 1, plateforme: 'facebook', couleur_plateforme: '#1877F2', secteur: 'Restaurant Lakay', budget: '$300', resultat: 'Vant: $1,890', metrique_label: 'ROAS', metrique_valeur: 6.3, periode: '21 jou' },
        { id: 2, plateforme: 'tiktok',   couleur_plateforme: '#ff0050', secteur: 'Boutique Mode',   budget: '$150', resultat: 'Followers: +8,200', metrique_label: 'CPL', metrique_valeur: 0.018, periode: '14 jou' },
        { id: 3, plateforme: 'facebook', couleur_plateforme: '#1877F2', secteur: 'Coach Fitness',   budget: '$200', resultat: 'Leads: 147', metrique_label: 'CPL', metrique_valeur: 1.36, periode: '30 jou' },
        { id: 4, plateforme: 'instagram',couleur_plateforme: '#E1306C', secteur: 'Salon Beaute',    budget: '$100', resultat: 'Rezervasyon: +38', metrique_label: 'ROAS', metrique_valeur: 4.8, periode: '7 jou' }
    ];
}

function getPlatformIcon(plateforme) {
    const p = (plateforme || '').toLowerCase();
    if (p.includes('facebook')) return '<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/></svg>';
    if (p.includes('tiktok'))  return '<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/></svg>';
    if (p.includes('instagram')) return '<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.981 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>';
    return '📢';
}

function getPlatformName(plateforme) {
    const p = (plateforme || '').toLowerCase();
    if (p.includes('facebook')) return 'Facebook Ads';
    if (p.includes('tiktok'))   return 'TikTok Ads';
    if (p.includes('instagram')) return 'Instagram Ads';
    return plateforme || 'Ads';
}

function renderPortfolio(grid, items) {
    // Calcule max ROAS pour les barres de progression
    const maxVal = Math.max(...items.map(i => parseFloat(i.metrique_valeur) || 0), 1);

    grid.innerHTML = items.map(c => {
        const val = parseFloat(c.metrique_valeur) || 0;
        const barW = Math.min(100, (val / maxVal) * 100).toFixed(0);
        const displayVal = val < 1 ? '$' + val : val + (c.metrique_label === 'ROAS' ? 'x' : '');

        return `
        <div class="portfolio-card" data-animate="fade-up" style="border-left: 4px solid ${c.couleur_plateforme};">
            <div class="portfolio-periode">${c.periode}</div>
            <div class="portfolio-platform-tag" style="background:${c.couleur_plateforme}20; color:${c.couleur_plateforme}; border:1px solid ${c.couleur_plateforme}40;">
                ${getPlatformIcon(c.plateforme)} ${getPlatformName(c.plateforme)}
            </div>
            <div class="portfolio-sector">${c.secteur}</div>
            <div class="portfolio-budget">💰 Bidj\u00e8: ${c.budget}</div>
            <div class="portfolio-metric">
                <span class="portfolio-metric-value">${displayVal}</span>
                <span class="portfolio-metric-label">${c.metrique_label}</span>
            </div>
            <div style="height:5px; background:rgba(255,255,255,0.06); border-radius:50px; margin:10px 0;">
                <div style="height:100%; width:${barW}%; background:linear-gradient(90deg, ${c.couleur_plateforme}, ${c.couleur_plateforme}99); border-radius:50px; transition:width 1s ease;"></div>
            </div>
            <div class="portfolio-result">✅ ${c.resultat}</div>
        </div>`;
    }).join('');

    grid.querySelectorAll('[data-animate]').forEach(el => {
        const io = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
            });
        }, { threshold: 0.1 });
        io.observe(el);
    });
}

// ── FAQ ─────────────────────────────────────────────────────────

async function loadFaq() {
    const list = document.getElementById('faq-list');
    if (!list) return;

    let faqItems = null;

    try {
        if (!window.supabaseClient) throw new Error("Supabase not ready");

        const { data, error } = await window.supabaseClient
            .from('landing_config')
            .select('faq_items')
            .eq('id', 1)
            .single();

        if (!error && data && data.faq_items && Array.isArray(data.faq_items) && data.faq_items.length > 0) {
            faqItems = data.faq_items;
        }
    } catch (e) { 
        console.warn("Supabase loadFaq error, using fallback:", e);
    }

    if (!faqItems) faqItems = getDefaultFaq();
    renderFaq(list, faqItems);
}

function getDefaultFaq() {
    return [
        { q: "Eske coaching la fèt an lign?", r: "Wi, tout sesyon coaching yo fèt 100% an lign via Zoom oswa Google Meet. Ou ka patisipe kèlkeswa kote ou ye nan mond lan." },
        { q: "Nan ki lang sesyon yo fèt?", r: "Tout sesyon yo fèt an kreyòl ayisyen. Nou vize kliyan ayisyen toupatou nan mond lan." },
        { q: "Konbyen tan yon sesyon coaching dire?", r: "Chak sesyon dire 1 èdtan. Ou jwenn 6 sesyon pa mwa (6 èdtan total) selon plan ou a." },
        { q: "Eske gen garanti rezilta?", r: "Nou bay yon garanti satisfaksyon 100%. Si ou pa satisfè apre premye sesyon an, nou remèt ou lajan ou a san kesyon." },
        { q: "Ki platfòm peman ou aksepte?", r: "Nou aksepte Kat Kredi (Visa, Mastercard) via Stripe, ak MonCash pou kliyan ki ann Ayiti." },
        { q: "Eske mwen ka peye an avans sèlman (50%)?", r: "Wi! Ou ka chwazi peye 50% kounye a epi 50% anvan dezyèm sesyon an. Opsyon sa a disponib nan etap peman an." },
        { q: "Ki diferans ant Coaching Pèsonèl ak Sèvis Business?", r: "Coaching Pèsonèl se pou antreprenè k ap aprann estrateji dijital. Sèvis Business se nou k ap jere epi kreye kanpay piblisite pou biznis ou dirèkteman." },
        { q: "Nan konbyen tan mwen ap wè rezilta?", r: "Majorite kliyan nou yo wè premye rezilta nan 2-4 semèn. Rezilta final yo depann de plan ou a ak angajman ou." },
        { q: "Eske mwen ka anile abònman mwen?", r: "Wi, ou ka anile nenpòt ki lè san penalite. Nou jis mande yon preyavi 48 èdtan." },
        { q: "Eske nou travay ak gwo antrepriz tou?", r: "Absoliman! Nou gen plan espesyal pou antrepriz ak ajans. Kontakte nou dirèkteman pou yon devis pèsonalize." },
        { q: "Eske mwen bezwen eksperyans nan maketing pou kòmanse?", r: "Non! Coaching nou an adapte pou tout nivo — debutant kou avanse. Nou kòmanse kote ou ye a." },
        { q: "Kijan m ka kontakte nou si mwen gen yon kesyon ijans?", r: "Ou ka ekri nou dirèkteman sou WhatsApp (bouton an ba paj la) oswa voye yon imèl. Nou reponn nan mwens pase 2 èdtan." }
    ];
}

function renderFaq(list, items) {
    list.innerHTML = items.map((item, i) => `
        <div class="faq-item" id="faq-item-${i}">
            <div class="faq-q" onclick="toggleFaq(${i})">
                <span class="faq-q-text">${item.q}</span>
                <span class="faq-chevron">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M6 9l6 6 6-6"/>
                    </svg>
                </span>
            </div>
            <div class="faq-a">${item.r}</div>
        </div>
    `).join('');
}

window.toggleFaq = function(index) {
    const allItems = document.querySelectorAll('.faq-item');
    allItems.forEach((item, i) => {
        if (i === index) {
            item.classList.toggle('open');
        } else {
            item.classList.remove('open');
        }
    });
};

// ── DEVIS ENTREPRISES ────────────────────────────────────────────

window.submitDevis = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('devis-btn');
    if (btn) { 
        btn.disabled = true; 
        const span = btn.querySelector('span');
        if (span) span.textContent = 'N ap voye...'; 
    }

    const payload = {
        nom_entreprise: document.getElementById('devis-nom')?.value || '',
        secteur: document.getElementById('devis-secteur')?.value || '',
        budget_mensuel: document.getElementById('devis-budget')?.value || '',
        objectif: document.getElementById('devis-objectif')?.value || '',
        email: document.getElementById('devis-email')?.value || '',
        telephone: document.getElementById('devis-tel')?.value || '',
        statut: 'nouveau'
    };

    try {
        if (!window.supabaseClient) throw new Error("Supabase not ready");

        const { error } = await window.supabaseClient
            .from('devis_entreprises')
            .insert(payload);

        if (error) throw error;

        showToast('success', '✅ Demann resevwa!', 'N ap kontakte ou nan mwens pase 24 èdtan.');

        // Track Facebook Pixel
        if (typeof fbq !== 'undefined') fbq('track', 'Lead');

        // Reset form
        document.getElementById('devis-form')?.reset();

        // Afficher message de succès dans le form
        const form = document.getElementById('devis-form');
        if (form) {
            form.innerHTML = `
                <div style="text-align:center; padding:40px 20px;">
                    <div style="font-size:3rem; margin-bottom:16px; animation: bounceIn 0.5s ease;">✅</div>
                    <h4 style="color:var(--accent); font-size:1.3rem; margin-bottom:10px;">Mèsi! Demann ou an resevwa.</h4>
                    <p style="color:var(--text-secondary); font-size:0.9rem;">N ap kontakte ou nan mwens pase 24 èdtan via im\u00e8l oswa WhatsApp.</p>
                </div>`;
        }
    } catch (err) {
        console.error('Devis error:', err);
        showToast('error', '❌ Erè!', 'Tanpri eseye ankò oswa kontakte nou sou WhatsApp.');
        if (btn) { btn.disabled = false; btn.querySelector('span').textContent = 'Voye Demann nan'; }
    }
};

// ── TOAST NOTIFICATIONS ──────────────────────────────────────────

window.showToast = function(type = 'info', title = '', message = '', duration = 4500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <div class="toast-content">
            ${title ? `<div class="toast-title">${title}</div>` : ''}
            ${message ? `<div class="toast-msg">${message}</div>` : ''}
        </div>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hiding');
        toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, duration);
};

// ── COUNT UP ANIMATION ───────────────────────────────────────────

function initCounters() {
    const counters = document.querySelectorAll('[data-count]');
    if (counters.length === 0) return;

    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            const target = parseFloat(el.dataset.count);
            const suffix = el.dataset.suffix || '';
            const duration = 2000;
            const start = performance.now();

            function update(now) {
                const progress = Math.min((now - start) / duration, 1);
                const ease = 1 - Math.pow(1 - progress, 3);
                const val = target < 10 ? (target * ease).toFixed(1) : Math.round(target * ease);
                el.textContent = val + suffix;
                if (progress < 1) requestAnimationFrame(update);
            }

            requestAnimationFrame(update);
            io.unobserve(el);
        });
    }, { threshold: 0.5 });

    counters.forEach(c => io.observe(c));
}

// ── TRACKING FACEBOOK PIXEL ─────────────────────────────────────

// Clic WhatsApp → fbq Contact
document.querySelectorAll('.whatsapp-float, a[href*="wa.me"]').forEach(el => {
    el.addEventListener('click', () => {
        if (typeof fbq !== 'undefined') fbq('track', 'Contact');
    });
});

// Bouton "Kòmanse Kounye a" → fbq InitiateCheckout
document.querySelectorAll('a[href="#services-section"], .btn.gold').forEach(el => {
    el.addEventListener('click', () => {
        if (typeof fbq !== 'undefined') fbq('track', 'InitiateCheckout');
    });
});
