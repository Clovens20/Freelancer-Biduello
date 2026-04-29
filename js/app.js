/**
 * DJ Innovations — Premium Pòtal (V2)
 * VERSION FINALE — Jou Horizontal + Kreno Opsyonèl + Notifikasyon
 */

const state = {
    services: [],
    selectedServices: [],
    currentDay: null,   // index du jour ouvert, null = aucun
    selectedSlots: {},     // clé: `${svcId}_D${i}`, valeur: ['H8', 'H9', …]
    paymentMode: 'full',
    customerInfo: { prenom: '', non: '', email: '', telephone: '', message: '' },
    finalAmount: 0,
    gateway: 'stripe',
    urlDiscount: 0,
    currentCategory: 'coaching', // 'coaching' ou 'business'
    qtyMonths: 1, // ✅ NOUVO: Default 1 mwa
    isVacation: false,
    vacationMsg: '',
    vacationStart: null,
    vacationEnd: null,
    bookedSlots: [],
    userOffset: -4 // Default to Freelancer (Dominican Republic)
};

const FREELANCER_OFFSET = -4; // Dominican Republic (GMT-4)

const DAYS = ['Lendi', 'Madi', 'Mèkredi', 'Jedi', 'Vandredi', 'Samdi', 'Dimanch'];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 8); // 8h → 23h

// ── DOM ───────────────────────────────────────────────────────

const servicesGrid = document.getElementById('services-grid');
const selectionBox = document.getElementById('selection-box');
const countSelected = document.getElementById('count-selected');
const subtotalDisplay = document.getElementById('subtotal-display');
const modal = document.getElementById('service-modal');
const modalContainer = document.getElementById('modal-service-details');
const modalSelectBtn = document.getElementById('modal-select-btn');
const toStep2Btn = document.getElementById('to-step-2');
const toStep3Btn = document.getElementById('to-step-3');

let currentViewedServiceId = null;

// ── INIT ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => initApp());

function getYoutubeEmbedUrl(url) {
    if (!url) return '';
    let id = '';
    if (url.includes('watch?v=')) id = url.split('v=')[1].split('&')[0];
    else if (url.includes('youtu.be/')) id = url.split('youtu.be/')[1].split('?')[0];
    else if (url.includes('shorts/')) id = url.split('shorts/')[1].split('?')[0];
    else if (url.includes('embed/')) return url;
    return id ? `https://www.youtube.com/embed/${id}` : url;
}

async function initApp() {
    const urlParams = new URLSearchParams(window.location.search);
    const promo = urlParams.get('rabè') || urlParams.get('promo');
    if (promo) {
        state.urlDiscount = parseInt(promo) || 0;
        console.log(`🎁 Rabè detekte nan URL: ${state.urlDiscount}%`);
    }

    await loadLandingConfig();
    await fetchServicesFromSupabase();
    await fetchBookedSlots();
    trackVisit(); // ✅ Track site traffic
    setupEventListeners();
    setupCategoryHandlers(); // ✅ Add listeners for category buttons
    detectUserTimezone(); // ✅ Detect user's local timezone
}

function setupCategoryHandlers() {
    const btnCoaching = document.getElementById('btn-cat-coaching');
    const btnBusiness = document.getElementById('btn-cat-business');
    if (btnCoaching) btnCoaching.onclick = () => setCategory('coaching');
    if (btnBusiness) btnBusiness.onclick = () => setCategory('business');
}

async function trackVisit() {
    try {
        const lastVisit = localStorage.getItem('last_visit_track');
        const now = new Date().getTime();
        // Sèlman track si sa fè plis pase 30 minit (evite over-counting sou refresh)
        if (lastVisit && (now - parseInt(lastVisit)) < 1800000) return;

        let visitorId = localStorage.getItem('visitor_id');
        if (!visitorId) {
            visitorId = 'v_' + Math.random().toString(36).substring(2, 11);
            localStorage.setItem('visitor_id', visitorId);
        }

        await window.supabaseClient.from('site_visits').insert({
            page: 'home',
            visitor_id: visitorId
        });
        localStorage.setItem('last_visit_track', now.toString());
    } catch (e) { console.error('Traffic track error:', e); }
}

// ── LANDING CONFIG ────────────────────────────────────────────

async function fetchBookedSlots() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await window.supabaseClient
            .from('reservations')
            .select('horaires')
            .in('statut', ['paye', 'payé', 'paid', 'confirme', 'confirmé', 'atribue', 'atribué', 'en_attente', 'termine', 'terminé', 'complete', 'complète'])
            .gte('valide_juska', today); // ✅ SELMAN KI POKO EKSPIRÉ
        
        let blocked = [];
        (data || []).forEach(res => {
            if (res.horaires) {
                Object.keys(res.horaires).forEach(key => {
                    const slots = res.horaires[key]; 
                    if (key === 'antant_manuel') {
                        // Kreno manyèl yo deja gen fòma "D0_H18"
                        slots.forEach(s => blocked.push(s));
                    } else {
                        // Kreno nòmal yo nou dwe konstri yo
                        const dayPart = key.split('_').pop(); 
                        slots.forEach(h => blocked.push(`${dayPart}_${h}`));
                    }
                });
            }
        });
        state.bookedSlots = [...new Set(blocked)]; 
        console.log('✅ Kreno ki bloke:', state.bookedSlots);
    } catch (err) { console.error('Error fetching booked slots:', err); }
}

async function loadLandingConfig() {
    try {
        const { data, error } = await window.supabaseClient
            .from('landing_config').select('*').eq('id', 1).single();
        if (error || !data) return;

        const set = (id, val, attr = 'innerHTML') => {
            const el = document.getElementById(id);
            if (el) el[attr] = val;
        };
        set('hero-badge', `<span class="badge-dot"></span> ${data.hero_badge}`);
        set('hero-title', data.hero_title);
        set('hero-description', data.hero_description);
        set('hero-image', data.hero_image_url, 'src');
        set('ap-title', data.ap_title);
        set('ap-description', data.ap_description);
        set('ap-photo', data.ap_photo_url, 'src');
        set('footer-slogan', data.footer_slogan);

        // ✅ Business Dynamic Fields
        set('biz-hero-badge', data.business_hero_badge);
        set('biz-hero-title', data.business_hero_title);
        set('biz-hero-desc', data.business_hero_description);
        set('biz-promo-btn', data.business_promo_btn_text);
        
        // Portfolio Headers
        if(data.portfolio_tag) set('display-port-tag', data.portfolio_tag);
        if(data.portfolio_title) set('display-port-title', data.portfolio_title);
        if(data.portfolio_subtitle) set('display-port-sub', data.portfolio_subtitle);

        // Catégories Tabs Labels
        set('btn-cat-coaching', data.label_coaching_tab);
        set('btn-cat-business', data.label_business_tab);

        // On garde les titres actuels du state car ils vont switcher avec setCategory
        window.biz_titles = {
            plans: data.business_plans_title || 'Plan nou yo',
            subtitle: data.business_plans_subtitle || 'Chwazi plan ki pi byen koresponn ak bezwen biznis ou.'
        };
        window.coaching_titles = {
            plans: data.hero_title || 'Chwazi Sèvis ou bezwen yo',
            subtitle: 'Klike sou yon sèvis pou w wè tout detay konplet yo.'
        };

        // On garde aussi les labels du formulaire
        window.form_config = {
            business: {
                label_prenom: data.business_form_label_prenom || 'Nom konplè Responsab *',
                label_nom: data.business_form_label_nom || 'Non Entreprise la *',
                placeholder_prenom: data.business_form_placeholder_prenom || 'Antre non konplè w',
                placeholder_nom: data.business_form_placeholder_nom || 'Antre non biznis ou'
            },
            coaching: {
                label_prenom: data.coaching_form_label_prenom || 'Prenon *',
                label_nom: data.coaching_form_label_nom || 'Non Fanmi *',
                placeholder_prenom: data.coaching_form_placeholder_prenom || 'Antre prenon ou',
                placeholder_nom: data.coaching_form_placeholder_nom || 'Antre non ou'
            },
            common: {
                label_email: data.business_form_label_email || 'Imèl *',
                label_tel: data.business_form_label_tel || 'Telefòn *',
                label_msg: data.business_form_label_msg || 'Mesaj'
            }
        };

        // Appliquer les labels communs immédiatement
        set('label-email', window.form_config.common.label_email);
        set('label-telephone', window.form_config.common.label_tel);
        set('label-message', window.form_config.common.label_msg);

        // ✅ Business specific Hero Image (si nou nan mode business)
        const bizPromoImg = document.querySelector('.biz-promo-img img');
        if (bizPromoImg && data.business_hero_image_url) {
            bizPromoImg.src = data.business_hero_image_url;
        }

        state.isVacation = !!data.is_vacation;
        state.vacationMsg = data.vacation_msg || 'Mwen an vakans pou kounye a, m ap tounen talè!';
        state.vacationStart = data.vacation_start || null;
        state.vacationEnd = data.vacation_end || null;

        // ✅ Inject Pixels (Facebook, TikTok, GA4, etc.)
        injectPixels(data);

        // ✅ Sosyal Dinamik (TikTok, Facebook, Instagram, etc.)
        const socialsContainer = document.querySelector('.footer-socials');
        if (socialsContainer && data.social_links && Array.isArray(data.social_links)) {
            socialsContainer.innerHTML = '';
            data.social_links.forEach(link => {
                if (!link.enabled) return;
                const a = document.createElement('a');
                a.href = link.url || '#';
                a.target = '_blank';
                a.className = 'social-icon social-btn';
                a.title = link.platform;
                
                let iconSvg = '';
                const p = (link.platform || '').toLowerCase().trim();

                if (p.includes('facebook')) {
                    iconSvg = '<svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/></svg>';
                } else if (p.includes('instagram')) {
                    iconSvg = '<svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.981 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>';
                } else if (p.includes('tiktok')) {
                    iconSvg = '<svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>';
                } else if (p.includes('whatsapp')) {
                    iconSvg = '<svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.983.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>';
                } else {
                    iconSvg = '<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
                }

                a.innerHTML = iconSvg;
                socialsContainer.appendChild(a);
            });
        }

        // ✅ WhatsApp Dinamik
        const waNumber = data.whatsapp_number || '18096651142';
        document.querySelectorAll('a[href*="wa.me"]').forEach(link => {
            const href = link.getAttribute('href');
            const textMatch = href.match(/\?text=(.*)/);
            const textParam = textMatch ? `?text=${textMatch[1]}` : '';
            link.setAttribute('href', `https://wa.me/${waNumber}${textParam}`);
        });

        // ✅ Footer Dinamik
        const footerTerms = document.getElementById('dyn-footer-terms');
        if (footerTerms) {
            footerTerms.textContent = data.footer_terms_text || 'Tèm & Kondisyon';
            footerTerms.href = data.footer_terms_url || '#';
        }

        const footerPrivacy = document.getElementById('dyn-footer-privacy');
        if (footerPrivacy) {
            footerPrivacy.textContent = data.footer_privacy_text || 'Politik Konfidansyalite';
            footerPrivacy.href = data.footer_privacy_url || '#';
        }

        const footerSupport = document.getElementById('dyn-footer-support');
        if (footerSupport) {
            footerSupport.textContent = data.footer_support_text || 'Sipò';
            footerSupport.href = data.footer_support_url || '#';
        }
    } catch (err) {
        console.error('Erè config landing:', err);
    }
}

// ── PIXELS & TRACKING ─────────────────────────────────────────

function injectPixels(config) {
    if (!config) return;

    // ── OLD PIXELS (ID-based, for backward compatibility) ──
    if (config.fb_pixel_id) {
        console.log('🚀 Injecting FB Pixel (ID)');
        injectRawScript(`
            !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${config.fb_pixel_id}'); fbq('track', 'PageView');
        `);
    }
    if (config.tiktok_pixel_id) {
        console.log('🚀 Injecting TikTok Pixel (ID)');
        injectRawScript(`
            !function (w, d, t) {w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[p]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=d.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${config.tiktok_pixel_id}');ttq.page();}(window, document, 'ttq');
        `);
    }

    // ── NEW PIXELS (Full Script/Tag based) ──
    const networks = [
        { v: 'fb_verify_tag', p: 'fb_pixel_script' },
        { v: 'tiktok_verify_tag', p: 'tiktok_pixel_script' },
        { v: 'ga_verify_tag', p: 'ga_pixel_script' },
        { v: 'snap_verify_tag', p: 'snap_pixel_script' },
        { v: 'pin_verify_tag', p: 'pin_pixel_script' }
    ];

    networks.forEach(net => {
        if (config[net.v]) injectRawHTML(config[net.v]);
        if (config[net.p]) injectRawHTML(config[net.p]);
    });

    // 6. Custom Head Scripts (Generic)
    if (config.custom_head_scripts) {
        console.log('🚀 Injecting Custom Head Scripts');
        injectRawHTML(config.custom_head_scripts);
    }
}

function injectRawHTML(html) {
    if (!html) return;
    const temp = document.createElement('div');
    temp.innerHTML = html.trim();
    Array.from(temp.childNodes).forEach(node => {
        if (node.nodeType === 1) { // Element
            if (node.tagName === 'SCRIPT') {
                const script = document.createElement('script');
                if (node.src) script.src = node.src;
                else script.innerHTML = node.innerHTML;
                document.head.appendChild(script);
            } else {
                document.head.appendChild(node.cloneNode(true));
            }
        }
    });
}

function injectRawScript(code) {
    const s = document.createElement('script');
    s.innerHTML = code;
    document.head.appendChild(s);
}

// ── SERVICES ──────────────────────────────────────────────────

async function fetchServicesFromSupabase() {
    try {
        const { data, error } = await window.supabaseClient
            .from('services').select('*').eq('actif', true);
        if (error) throw error;
        state.services = data || [];
        renderServicesGrid();
    } catch (err) {
        console.error('Erè SDK:', err);
        if (servicesGrid) servicesGrid.innerHTML = '<p class="error">Nou pa t kapab chaje sèvis yo.</p>';
    }
}

function renderServicesGrid() {
    if (!servicesGrid) return;
    
    const filtered = state.services.filter(s => {
        const cat = (s.category || 'coaching').toLowerCase();
        return cat === state.currentCategory.toLowerCase();
    });

    if (filtered.length === 0) {
        // Fallback pèsonalize si se kategori Business
        if (state.currentCategory === 'business') {
            const fallbackPlans = [
                { 
                    id: 'std-fall', 
                    nom: 'Plan Standard', 
                    prix: 199, 
                    badge: '',
                    icon: '🧡',
                    description: 'Parfè pou ti ak mwayen biznis ki vle yon prezans dijital solid.', 
                    fonctionnalites: [
                        'Kreyasyon paj pwofesyonèl pou biznis ou',
                        '1 piblikasyon pa jou, 5 jou pa semèn',
                        'Jesyon konplè paj ou yo (FB, TikTok, Instagram)',
                        'Rapò mansyèl sou pèfòmans'
                    ], 
                    category: 'business' 
                },
                { 
                    id: 'prem-fall', 
                    nom: 'Plan Premium', 
                    prix: 349, 
                    badge: 'REKÒMANDE',
                    icon: '🧡',
                    description: 'Jesyon konplè pou biznis ki vle maksimize vizibilite ak vant yo.', 
                    fonctionnalites: [
                        'Kreyasyon paj pwofesyonèl (FB, TikTok, Instagram)',
                        '2 piblikasyon pa jou, 7 jou / 7',
                        'Kreyasyon & jesyon Ads (koût ads = biznis)',
                        'Jesyon konplè 100% — strategy, kontni, analiz',
                        'Rapò chak semèn + reyinyon mansyèl',
                        'Sipò prioritè 7 / 7'
                    ], 
                    category: 'business' 
                }
            ];
            servicesGrid.innerHTML = fallbackPlans.map(s => {
                return `
                    <div class="service-card biz-card" onclick="openServiceModal('${s.id}', true)">
                        ${s.badge ? `<div class="biz-badge-card">${s.badge}</div>` : '<div class="biz-badge-card">SOLISYON BUSINESS</div>'}
                        <h3>${s.nom}</h3>
                        <div class="price">$${s.prix} <span>${s.unite || '/mwa'}</span></div>
                        <p style="margin-bottom:15px; font-size:0.9rem;">${s.description}</p>
                        <ul style="list-style:none; padding:0; margin-bottom:20px; font-size:0.85rem; text-align:left;">
                            ${s.fonctionnalites.map(f => `
                                <li style="margin-bottom:8px; display:flex; align-items:start; gap:8px;">
                                    <span style="color:var(--primary); font-size:1rem;">${s.icon || '🧡'}</span>
                                    <span>${f}</span>
                                </li>`).join('')}
                        </ul>
                        <button class="btn-details">Chwazi Plan sa a</button>
                    </div>`;
            }).join('');
            // Nou dwe mete plan fallback sa yo nan state la tanporèman pou modal la fonksyone
            window.activeFallbackPlans = fallbackPlans;
            return;
        }

        servicesGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                <p style="color: var(--text-muted);">Poko gen sèvis disponib nan kategori sa a.</p>
                <button class="btn btn-ghost" onclick="setCategory('coaching')" style="margin-top:15px">Gade Sèvis Coaching yo</button>
            </div>`;
        return;
    }

    servicesGrid.innerHTML = filtered.map(s => {
        const isSelected = state.selectedServices.some(item => item.id === s.id);
        const isBusiness = (s.category || '').toLowerCase() === 'business';
        const icon = s.icon || '🧡';
        
        // Si se yon sèvis business, montre detay yo dirèkteman
        if (isBusiness) {
            return `
                <div class="service-card biz-card ${isSelected ? 'selected' : ''}" onclick="openServiceModal('${s.id}')">
                    ${isSelected ? '<div class="check-badge">✓</div>' : ''}
                    <div class="biz-badge-card">${s.badge || 'SOLISYON BUSINESS'}</div>
                    <h3>${s.nom}</h3>
                    <div class="price">$${s.prix} <span>${s.unite || '/mwa'}</span></div>
                    <p style="margin-bottom:15px; font-size:0.9rem;">${s.description || ''}</p>
                    <ul style="list-style:none; padding:0; margin-bottom:20px; font-size:0.85rem; text-align:left;">
                        ${(s.fonctionnalites || []).slice(0, 4).map(f => `
                            <li style="margin-bottom:6px; display:flex; align-items:start; gap:8px;">
                                <span style="color:var(--primary); font-size:0.9rem;">${icon}</span>
                                <span>${f}</span>
                            </li>`).join('')}
                    </ul>
                    <button class="btn-details">Chwazi Plan sa a</button>
                </div>`;
        }

        return `
            <div class="service-card ${isSelected ? 'selected' : ''}" onclick="openServiceModal('${s.id}')">
                ${isSelected ? '<div class="check-badge">✓</div>' : ''}
                <h3>${s.nom}</h3>
                <div class="price">$${s.prix} <span>${s.unite || '/mwa'}</span></div>
                <p>${s.description ? s.description.substring(0, 100) + '...' : ''}</p>
                <button class="btn-details">Fè rezèvasyon w</button>
            </div>`;
    }).join('');
}

window.setCategory = function(cat) {
    state.currentCategory = cat;
    
    // Mettre à jour les titres de section dynamiquement
    const titleEl = document.getElementById('biz-plans-title');
    const subtitleEl = document.getElementById('biz-plans-subtitle');
    
    const titles = (cat === 'business') ? (window.biz_titles || {}) : (window.coaching_titles || {});
    if (titleEl) titleEl.innerText = titles.plans || (cat === 'business' ? 'Plan nou yo' : 'Chwazi Sèvis ou bezwen yo');
    if (subtitleEl) subtitleEl.innerText = titles.subtitle || (cat === 'business' ? 'Chwazi plan ki pi byen koresponn ak bezwen biznis ou.' : 'Klike sou yon sèvis pou w wè tout detay konplet yo.');

    // Mettre à jour les onglets ou le style si nécessaire
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
    renderServicesGrid();
};

// ── MODAL ─────────────────────────────────────────────────────

let currentViewedServiceIsFallback = false;

window.openServiceModal = function (id, isFallback = false) {
    let s;
    if (isFallback) {
        s = (window.activeFallbackPlans || []).find(x => x.id === id);
    } else {
        s = state.services.find(x => x.id === id);
    }
    
    if (!s) return;
    currentViewedServiceId = id;
    currentViewedServiceIsFallback = isFallback;
    
    const isSelected = state.selectedServices.some(item => item.id === id);

    modalContainer.innerHTML = `
        <div class="modal-header-box">
            <h2 class="modal-title-lux" style="font-family:'DM Serif Display', serif; font-size:2.8rem; color:var(--primary); margin-bottom:10px;">${s.nom}</h2>
            <div class="modal-price-tag" style="font-size:1.4rem; font-weight:700; color:var(--accent); margin-bottom:20px;">${s.prix || 105}$<span style="font-size:0.9rem; color:var(--text-muted); font-weight:400;">${s.unite || '/mwa'}</span></div>
        </div>
        <div class="modal-body">
            <p class="modal-desc">${s.description || 'Sèvis sa a ap ede w grandi rapidman.'}</p>
            <div class="modal-feat-grid">
                ${(s.fonctionnalites || []).map(f => `
                    <div class="modal-feat-item">
                        <span>${f}</span>
                    </div>`).join('')}
            </div>
            ${s.video_url ? `
                <div class="modal-video-wrap" style="margin-top:30px; border-radius:16px; overflow:hidden; aspect-ratio:16/9; background:#000; border:1px solid rgba(255,255,255,0.1);">
                    <iframe src="${getYoutubeEmbedUrl(s.video_url)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="width:100%; height:100%;"></iframe>
                </div>` : ''}
        </div>`;

    modalSelectBtn.innerHTML = isSelected ? '✓ Sèvis sa a Chwazi' : `Chwazi Sèvis sa a ($${s.prix || 105})`;
    modalSelectBtn.className = isSelected ? 'btn-modal-action active' : 'btn-modal-action';
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

modalSelectBtn.onclick = () => {
    toggleServiceSelection(currentViewedServiceId, currentViewedServiceIsFallback);
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
};

document.querySelector('.close-btn').onclick = () => {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
};

function toggleServiceSelection(id, isFallback = false) {
    let s;
    if (isFallback) {
        s = (window.activeFallbackPlans || []).find(x => x.id === id);
    } else {
        s = state.services.find(x => x.id === id);
    }
    
    if (!s) return;
    
    const index = state.selectedServices.findIndex(item => item.id === id);
    if (index > -1) state.selectedServices.splice(index, 1);
    else state.selectedServices.push(s);
    renderServicesGrid();
    updateFunnelSelection();
}

function updateFunnelSelection() {
    const count = state.selectedServices.length;
    if (count > 0) {
        selectionBox.style.display = 'block';
        countSelected.innerText = count;
        const subtotal = state.selectedServices.reduce((acc, s) => acc + (s.prix || 105), 0);
        subtotalDisplay.innerText = `$${subtotal}`;
        toStep2Btn.disabled = false;
    } else {
        selectionBox.style.display = 'none';
        toStep2Btn.disabled = true;
    }
}

// ── ÉTAPE 2 — JOURS EN HORIZONTAL ────────────────────────────

window.toggleDay = function (dayIndex) {
    state.currentDay = (state.currentDay === dayIndex) ? null : dayIndex;
    renderDaySelector();
};

function renderDaySelector() {
    const container = document.getElementById('week-selector');
    if (!container) return;

    // Si on n'a pas de service sélectionné, on retourne à l'étape 1
    const currentSvc = window.currentSvc || state.selectedServices[0];
    if (!currentSvc) {
        goToStep(1);
        return;
    }

    // ── Gérer le Mode Vakans ──
    let onVacation = state.isVacation;
    const now = new Date();
    now.setHours(0,0,0,0);
    if (state.vacationStart) {
        const start = new Date(state.vacationStart);
        const end = state.vacationEnd ? new Date(state.vacationEnd) : null;
        if (now >= start && (!end || now <= end)) onVacation = true;
    }

    if (onVacation) {
        container.innerHTML = `
            <div class="vacation-mode-box" style="text-align:center; padding:40px; background:rgba(186,117,23,0.05); border:1px solid var(--border-gold); border-radius:18px; margin:20px 0;">
                <div style="font-size:3rem; margin-bottom:15px;">🏖️</div>
                <h3 style="color:var(--primary); font-family:'DM Serif Display',serif; font-size:1.8rem; margin-bottom:10px;">En Poz / Vakans</h3>
                <p style="color:var(--text); font-size:1.1rem; line-height:1.6;">${state.vacationMsg}</p>
            </div>`;
        return;
    }

    // Calcul total des créneaux sélectionnés
    const totalSelected = DAYS.reduce((acc, _, i) =>
        acc + (state.selectedSlots[`${currentSvc.id}_D${i}`] || []).length, 0);

    const progressEl = document.getElementById('selected-count');
    if (progressEl) progressEl.innerText = totalSelected;

    // ── Rangée des jours ──
    let tabsHtml = `<div class="days-tab-row">`;
    DAYS.forEach((day, i) => {
        const key = `${currentSvc.id}_D${i}`;
        const count = (state.selectedSlots[key] || []).length;
        const isActive = state.currentDay === i;
        tabsHtml += `
            <button class="day-tab-btn ${isActive ? 'active' : ''}" onclick="toggleDay(${i})">
                ${day}
                ${count > 0 ? `<span class="day-tab-dot"></span>` : ''}
            </button>`;
    });
    tabsHtml += `</div>`;

    // ── Panel de créneaux ──
    let panelHtml = `<div class="day-slots-expand ${state.currentDay !== null ? 'open' : ''}">`;
    if (state.currentDay !== null) {
        const i = state.currentDay;
        const key = `${currentSvc.id}_D${i}`;
        const slots = state.selectedSlots[key] || [];
        const count = slots.length;

        panelHtml += `
            <div class="slots-expand-inner">
                <div class="slots-expand-header">
                    <span class="slots-expand-title">Disponibilite pou <strong>${DAYS[i]}</strong></span>
                    ${count > 0 ? `<span class="slots-count-badge"><span class="badge-pulse-dot"></span>${count} chwazi</span>` : ''}
                </div>
                <div class="slots-time-grid">
                    ${HOURS.map(h => {
                        const slot = `H${h}`;
                        const isBooked = state.bookedSlots.includes(`D${i}_${slot}`);
                        const isSelected = slots.includes(slot);
                        // ── TIMEZONE CALCULATION ──
                        // formula: userTime = baseTime + (userOffset - baseOffset)
                        const offsetDiff = state.userOffset - FREELANCER_OFFSET;
                        let localHour = h + offsetDiff;
                        
                        // Handle wraps (if it goes below 0 or above 23)
                        let displayDayName = '';
                        if (localHour < 0) { 
                            localHour += 24; displayDayName = '(Jou avan)'; 
                        } else if (localHour >= 24) { 
                            localHour -= 24; displayDayName = '(Jou apre)'; 
                        }

                        const h12 = localHour === 0 ? 12 : (localHour > 12 ? localHour - 12 : localHour);
                        const period = localHour >= 12 ? 'PM' : 'AM';

                        if (isBooked) {
                            return `<button class="slot-btn booked" disabled>
                                <span class="slot-time">${h12}:00</span>
                                <span class="slot-period">${period}</span>
                                <div class="booked-label">Pran deja</div>
                            </button>`;
                        }

                        return `<button class="slot-btn ${isSelected ? 'selected' : ''}" onclick="toggleSlot('${currentSvc.id}', ${i}, '${slot}')">
                            <span class="slot-time">${h12}:00</span>
                            <span class="slot-period">${period}</span>
                            <div style="font-size:0.6rem; opacity:0.6; margin-top:2px">${displayDayName}</div>
                        </button>`;
                    }).join('')}
                </div>
                <div style="margin-top:20px; color:var(--text-3); font-size:0.85rem; text-align:center;">
                    * Coaching sa a se pou 24 èdtan pa mwa.
                </div>
            </div>`;
    }
    panelHtml += `</div>`;

    container.innerHTML = tabsHtml + panelHtml;

    // Nettoyer legacy
    const legacyGrid = document.getElementById('time-slots-grid');
    if (legacyGrid) legacyGrid.innerHTML = '';
}

window.toggleSlot = function (svcId, dayIndex, slot) {
    const key = `${svcId}_D${dayIndex}`;
    if (!state.selectedSlots[key]) state.selectedSlots[key] = [];
    const idx = state.selectedSlots[key].indexOf(slot);
    if (idx > -1) state.selectedSlots[key].splice(idx, 1);
    else state.selectedSlots[key].push(slot);
    renderDaySelector();
};

window.updateTimezoneOffset = function() {
    const selector = document.getElementById('user-timezone');
    if (!selector) return;
    state.userOffset = parseInt(selector.value);
    
    // Update color based on if it's the same or different
    const box = document.getElementById('timezone-selector-box');
    const msg = document.getElementById('tz-info-msg');
    
    if (state.userOffset === FREELANCER_OFFSET) {
        box.style.borderColor = 'var(--border-gold)';
        msg.innerText = "✅ Ou nan menm orè ak Biduello (Sen Domeng).";
    } else {
        box.style.borderColor = 'var(--primary)';
        msg.innerText = `💡 Atansyon: Ou nan GMT${state.userOffset >= 0 ? '+' : ''}${state.userOffset}. N ap montre w lè yo selon peyi w la.`;
    }
    
    renderDaySelector();
};

function detectUserTimezone() {
    try {
        const offsetMinutes = -new Date().getTimezoneOffset();
        const offsetHours = Math.round(offsetMinutes / 60);
        
        const selector = document.getElementById('user-timezone');
        if (selector) {
            // Find if this offset exists in our select options
            const options = Array.from(selector.options);
            const found = options.find(o => parseInt(o.value) === offsetHours);
            if (found) {
                selector.value = offsetHours;
                state.userOffset = offsetHours;
            } else {
                // If not in the list, we might want to add it or just stick to default
                console.log("Timezone offset not in basic list:", offsetHours);
            }
            updateTimezoneOffset();
        }
    } catch (e) { console.error("Timezone detect error:", e); }
}

// ── SETUP & EVENTS ────────────────────────────────────────────

function setupEventListeners() {
    if (toStep2Btn) {
        toStep2Btn.onclick = () => {
            const isBusiness = state.selectedServices.every(s => (s.category || '').toLowerCase() === 'business');
            if (isBusiness) {
                calculatePrice();
                goToStep(3);
            } else {
                goToStep(2);
                state.currentDay = null;
                renderDaySelector();
            }
        };
    }

    if (toStep3Btn) {
        toStep3Btn.disabled = false;
        toStep3Btn.onclick = () => { calculatePrice(); goToStep(3); };
    }

    const form = document.getElementById('contact-form');
    if (form) {
        form.onsubmit = (e) => {
            e.preventDefault();
            state.customerInfo = {
                prenom: document.getElementById('prenom').value,
                non: document.getElementById('non').value,
                email: document.getElementById('email').value,
                telephone: document.getElementById('telephone').value,
                message: document.getElementById('message').value
            };
            goToStep(4);
        };
    }

    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.onclick = (e) => {
            const tid = a.getAttribute('href');
            if (tid === '#services-section') {
                e.preventDefault();
                document.getElementById('services-section').scrollIntoView({ behavior: 'smooth' });
            }
        };
    });

    // ✅ FIX: Bouton Tounen (Back)
    document.querySelectorAll('.back-link').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            let to = parseInt(btn.dataset.to);
            const isBusiness = state.selectedServices.every(s => (s.category || '').toLowerCase() === 'business');
            
            // Si se business, nou sote step 2. Donk si nou tounen soti nan 3, ale nan 1.
            if (isBusiness && to === 2) to = 1;
            
            goToStep(to);
        };
    });

    const payBtn = document.getElementById('pay-button');
    if (payBtn) {
        payBtn.onclick = async () => {
            try {
                // ── Loading state ──
                payBtn.classList.add('loading');
                const origText = payBtn.textContent;
                payBtn.textContent = 'N ap trete peman an...';

                const svc = state.selectedServices[0];
                const totalSlots = DAYS.reduce((acc, _, i) => acc + (state.selectedSlots[`${svc.id}_D${i}`] || []).length, 0);
                const payload = {
                    service_id: svc.id,
                    prenom: state.customerInfo.prenom,
                    non: state.customerInfo.non,
                    email: state.customerInfo.email,
                    telephone: state.customerInfo.telephone,
                    message: state.customerInfo.message,
                    mode_paiement: state.paymentMode,
                    horaires: state.selectedSlots,
                    gateway: state.gateway,
                    rabais: state.urlDiscount,
                    qty_months: state.qtyMonths,
                    pas_de_creneaux: totalSlots === 0,
                    timezone_offset: state.userOffset,
                    timezone_name: document.getElementById('user-timezone')?.options[document.getElementById('user-timezone')?.selectedIndex]?.text || 'GMT' + state.userOffset
                };
                const res = await fetch(`${window.supabaseClient.supabaseUrl}/functions/v1/create-checkout-session`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.supabaseClient.supabaseKey}` },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Erreur pèman");
                // Track purchase initiation
                if (typeof fbq !== 'undefined') fbq('track', 'Purchase', { value: state.finalAmount, currency: 'USD' });
                if (data.url) location.href = data.url;
            } catch (e) {
                payBtn.classList.remove('loading');
                payBtn.textContent = state.gateway === 'moncash' ? 'Peye ak MonCash' : 'Konfime epi Peye Sekirize';
                if (typeof window.showToast === 'function') {
                    window.showToast('error', 'Erè Peman', e.message);
                } else {
                    alert('Erè: ' + e.message);
                }
            }
        };
    }

    document.querySelectorAll('.pay-card').forEach(card => {
        card.onclick = () => {
            document.querySelectorAll('.pay-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            state.paymentMode = card.dataset.mode || 'full';
            calculatePrice();
        };
    });

    document.querySelectorAll('.pay-gateway').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.pay-gateway').forEach(c => {
                c.classList.remove('active');
                c.style.borderColor = 'rgba(255,255,255,0.1)';
            });
            btn.classList.add('active');
            btn.style.borderColor = 'var(--primary)';
            state.gateway = btn.dataset.gateway;
            const pBtn = document.getElementById('pay-button');
            if (pBtn) pBtn.innerText = state.gateway === 'moncash' ? 'Peye ak MonCash' : 'Konfime epi Peye Sekirize';
        };
    });
}

function calculatePrice() {
    const baseTotal = state.selectedServices.reduce((acc, s) => acc + (s.prix || 105), 0);
    const st = baseTotal * state.qtyMonths; // ✅ Faktore mwa yo
    
    const dp = state.urlDiscount || 0; 
    const da = (st * dp) / 100;
    const dr = st - da;
    const fa = state.paymentMode === 'depot' ? dr / 2 : dr;
    const fe = document.getElementById('final-amount');
    const qe = document.getElementById('qty-months');
    if (qe) qe.value = state.qtyMonths;

    const te = document.getElementById('final-discount-text');
    if (fe) fe.innerText = `$${fa.toFixed(2)}`;
    if (te) te.innerText = `${dp}%`;
    state.finalAmount = fa;
}

window.changeQty = function(val) {
    state.qtyMonths += val;
    if (state.qtyMonths < 1) state.qtyMonths = 1;
    if (state.qtyMonths > 12) state.qtyMonths = 12;
    calculatePrice();
};

function goToStep(s) {
    if (s === 3) {
        const isBusiness = state.selectedServices.every(s => (s.category || '').toLowerCase() === 'business');
        const l1 = document.getElementById('label-prenom');
        const l2 = document.getElementById('label-non'); // ✅ FIXED ID (was label-nom)
        const i1 = document.getElementById('prenom');
        const i2 = document.getElementById('non');

        const cfg = isBusiness ? (window.form_config?.business || {}) : (window.form_config?.coaching || {});
        
        if (l1) l1.innerText = cfg.label_prenom || (isBusiness ? 'Nom konplè Responsab *' : 'Prenon *');
        if (l2) l2.innerText = cfg.label_nom || (isBusiness ? 'Non Entreprise la *' : 'Non Fanmi *');
        if (i1) i1.placeholder = cfg.placeholder_prenom || (isBusiness ? 'Antre non konplè w' : 'Antre prenon ou');
        if (i2) i2.placeholder = cfg.placeholder_nom || (isBusiness ? 'Antre non biznis ou' : 'Antre non ou');
    }
    document.querySelectorAll('.step-section').forEach(sec => sec.classList.remove('active'));
    const target = document.getElementById(`step-${s}`);
    if (target) target.classList.add('active');
    document.querySelectorAll('#stepper .step').forEach(dot => {
        dot.classList.remove('active');
        if (dot.dataset.step == s) dot.classList.add('active');
    });
}