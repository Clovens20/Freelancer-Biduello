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
    isVacation: false,
    vacationMsg: '',
    vacationStart: null,
    vacationEnd: null
};

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

async function initApp() {
    await loadLandingConfig();
    await fetchServicesFromSupabase();
    setupEventListeners();
}

// ── LANDING CONFIG ────────────────────────────────────────────

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

        state.isVacation = !!data.is_vacation;
        state.vacationMsg = data.vacation_msg || 'Mwen an vakans pou kounye a, m ap tounen talè!';
        state.vacationStart = data.vacation_start || null;
        state.vacationEnd = data.vacation_end || null;

        const links = { 'facebook-link': data.facebook_url, 'instagram-link': data.instagram_url, 'tiktok-link': data.tiktok_url };
        Object.entries(links).forEach(([id, href]) => {
            const el = document.getElementById(id);
            if (el && href && href !== '#') el.href = href;
            else if (el) el.style.display = 'none';
        });

        // ✅ Gérer les Sosyal yo (format dynamic)
        if (data.social_links && Array.isArray(data.social_links)) {
            const socialsContainer = document.querySelector('.footer-socials');
            if (socialsContainer) {
                socialsContainer.innerHTML = '';
                data.social_links.forEach(link => {
                    if (!link.enabled || !link.url || link.url === '#') return;
                    const a = document.createElement('a');
                    a.href = link.url;
                    a.target = '_blank';
                    a.className = 'social-icon';
                    a.title = link.platform;
                    let iconSvg = '';
                    const p = link.platform.toLowerCase();
                    if (p.includes('facebook')) iconSvg = '<svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/></svg>';
                    else if (p.includes('instagram')) iconSvg = '<svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.981 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>';
                    else if (p.includes('tiktok')) iconSvg = '<svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.06-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.9-.32-1.98-.23-2.81.33-.85.51-1.44 1.43-1.58 2.41-.14 1.01.23 2.08.94 2.81.65.68 1.57 1.08 2.51 1.03 1.6-.09 3.06-1.31 3.39-2.87.1-.61.06-1.22.06-1.84V.02z"/></svg>';
                    else if (p.includes('youtube')) iconSvg = '<svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>';
                    else if (p.includes('linkedin')) iconSvg = '<svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 .001-4.125 2.062 2.062 0 0 1 0 4.125zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>';
                    else if (p.includes('whatsapp')) iconSvg = '<svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.983.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>';
                    else iconSvg = '<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
                    a.innerHTML = iconSvg;
                    socialsContainer.appendChild(a);
                });
            }
        }
    } catch (err) {
        console.error('Erè config landing:', err);
    }
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
    servicesGrid.innerHTML = state.services.map(s => {
        const isSelected = state.selectedServices.some(item => item.id === s.id);
        return `
            <div class="service-card ${isSelected ? 'selected' : ''}" onclick="openServiceModal('${s.id}')">
                ${isSelected ? '<div class="check-badge">✓</div>' : ''}
                <h3>${s.nom}</h3>
                <div class="price">$${s.prix} <span>/mwa</span></div>
                <p>${s.description ? s.description.substring(0, 100) + '...' : ''}</p>
                <button class="btn-details">Fè rezèvasyon w</button>
            </div>`;
    }).join('');
}

// ── MODAL ─────────────────────────────────────────────────────

window.openServiceModal = function (id) {
    const s = state.services.find(x => x.id === id);
    if (!s) return;
    currentViewedServiceId = id;
    const isSelected = state.selectedServices.some(item => item.id === id);

    modalContainer.innerHTML = `
        <div class="modal-header-premium">
            <h2 class="modal-title-lux">${s.nom}</h2>
            <div class="modal-price-tag">${s.prix || 105}$<span>/ mwa</span></div>
        </div>
        <div class="modal-scroll-area">
            <p class="modal-desc-lux">${s.description || 'Sèvis sa a ap ede w grandi rapidman.'}</p>
            <div class="modal-features-grid-lux">
                ${(s.fonctionnalites || []).map(f => `
                    <div class="modal-feature-item">
                        <span class="feature-bullet">✦</span>
                        <span class="feature-text">${f}</span>
                    </div>`).join('')}
            </div>
            ${s.video_url ? `
                <div class="modal-video-wrap">
                    <iframe src="${s.video_url.replace('watch?v=', 'embed/')}" frameborder="0" allowfullscreen></iframe>
                </div>` : ''}
        </div>`;

    modalSelectBtn.innerHTML = isSelected ? '<span>✓ Sèvis Chwazi</span>' : `<span>Chwazi Sèvis sa a ($${s.prix || 105})</span>`;
    modalSelectBtn.className = isSelected ? 'btn gold wide active' : 'btn gold wide';
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

modalSelectBtn.onclick = () => {
    toggleServiceSelection(currentViewedServiceId);
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
};

document.querySelector('.close-btn').onclick = () => {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
};

function toggleServiceSelection(id) {
    const s = state.services.find(x => x.id === id);
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

/**
 * Ouvre ou ferme un jour (toggle)
 */
window.toggleDay = function (dayIndex) {
    state.currentDay = (state.currentDay === dayIndex) ? null : dayIndex;
    renderDaySelector();
};

/**
 * Rendu principal : rangée de jours + panel de créneaux
 */
function renderDaySelector() {
    const container = document.getElementById('week-selector');
    if (!container) return;
    // ── Gérer le Mode Vakans (Switch ou Dates) ──
    let onVacation = state.isVacation;
    const now = new Date();
    now.setHours(0,0,0,0);

    if (state.vacationStart) {
        const start = new Date(state.vacationStart);
        const end = state.vacationEnd ? new Date(state.vacationEnd) : null;
        if (now >= start && (!end || now <= end)) {
            onVacation = true;
        }
    }

    if (onVacation) {
        container.innerHTML = `
            <div class="vacation-mode-box" style="text-align:center; padding:40px; background:rgba(186,117,23,0.05); border:1px solid var(--border-gold); border-radius:18px; margin:20px 0;">
                <div style="font-size:3rem; margin-bottom:15px;">🏖️</div>
                <h3 style="color:var(--primary); font-family:'DM Serif Display',serif; font-size:1.8rem; margin-bottom:10px;">En Poz / Vakans</h3>
                <p style="color:var(--text); font-size:1.1rem; line-height:1.6;">${state.vacationMsg}</p>
                <p style="color:var(--text-2); font-size:0.9rem; margin-top:20px;">Nou tounen talè! Ou ka toujou kontinye pou kouri info w oswa kite yon mesaj.</p>
            </div>`;
        const nextBtn = document.getElementById('to-step-3');
        if (nextBtn) nextBtn.disabled = false;
        return;
    }

    // Calcul total des créneaux sélectionnés
    const totalSelected = DAYS.reduce((acc, _, i) =>
        acc + (state.selectedSlots[`${currentSvc.id}_D${i}`] || []).length, 0);

    // Mise à jour de l'indicateur global
    const progressEl = document.getElementById('selected-count');
    if (progressEl) progressEl.innerText = totalSelected;

    // ── Rangée des jours (pills horizontaux) ──
    let tabsHtml = `<div class="days-tab-row">`;

    DAYS.forEach((day, i) => {
        const key = `${currentSvc.id}_D${i}`;
        const count = (state.selectedSlots[key] || []).length;
        const isActive = state.currentDay === i;
        tabsHtml += `
            <button class="day-tab-btn ${isActive ? 'active' : ''}"
                    onclick="toggleDay(${i})">
                ${day}
                ${count > 0 ? `<span class="day-tab-dot"></span>` : ''}
            </button>`;
    });

    tabsHtml += `</div>`;

    // ── Panel de créneaux (s'ouvre sous les tabs) ──
    let panelHtml = `<div class="day-slots-expand ${state.currentDay !== null ? 'open' : ''}">`;

    if (state.currentDay !== null) {
        const i = state.currentDay;
        const key = `${currentSvc.id}_D${i}`;
        const slots = state.selectedSlots[key] || [];
        const count = slots.length;

        panelHtml += `
            <div class="slots-expand-inner">
                <div class="slots-expand-header">
                    <span class="slots-expand-title">
                        Disponibilite pou <strong>${DAYS[i]}</strong>
                    </span>
                    ${count > 0 ? `
                        <span class="slots-count-badge">
                            <span class="badge-pulse-dot"></span>
                            ${count} kreno chwazi
                        </span>` : ''}
                </div>
                <div class="slots-time-grid">
                    ${HOURS.map(h => {
            const slot = `H${h}`;
            const isSelected = slots.includes(slot);
            const hour12 = h > 12 ? h - 12 : h;
            const period = h >= 12 ? 'PM' : 'AM';
            return `
                        <button class="slot-btn ${isSelected ? 'selected' : ''}"
                            onclick="toggleSlot('${currentSvc.id}', ${i}, '${slot}')">
                            <span class="slot-time">${hour12}:00</span>
                            <span class="slot-period">${period}</span>
                        </button>`;
        }).join('')}
                </div>
            </div>`;
    }

    panelHtml += `</div>`;

    container.innerHTML = tabsHtml + panelHtml;

    // Vider la grille legacy si elle existe
    const legacyGrid = document.getElementById('time-slots-grid');
    if (legacyGrid) legacyGrid.innerHTML = '';
}

/**
 * Sélectionne / désélectionne un créneau
 */
window.toggleSlot = function (svcId, dayIndex, slot) {
    const key = `${svcId}_D${dayIndex}`;
    if (!state.selectedSlots[key]) state.selectedSlots[key] = [];

    const index = state.selectedSlots[key].indexOf(slot);
    if (index > -1) state.selectedSlots[key].splice(index, 1);
    else state.selectedSlots[key].push(slot);

    renderDaySelector(); // Re-render pour badges + compteur
};

// ── SETUP & EVENTS ────────────────────────────────────────────

function setupEventListeners() {
    if (toStep2Btn) {
        toStep2Btn.onclick = () => {
            goToStep(2);
            state.currentDay = null;
            renderDaySelector();
        };
    }

    // ✅ Créneaux OPTIONNELS — bouton toujours actif
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

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#' || targetId === '#services-section') {
                const el = document.getElementById('services-section');
                if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth' }); }
            }
        });
    });

    const payBtn = document.getElementById('pay-button');
    if (payBtn) {
        payBtn.onclick = async () => {
            try {
                const svc = state.selectedServices[0];

                // Calcul du total des créneaux
                const totalSlots = DAYS.reduce((acc, _, i) =>
                    acc + (state.selectedSlots[`${svc.id}_D${i}`] || []).length, 0);

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
                    // 🔔 Flag pour notifier le freelancer si aucun créneau choisi
                    pas_de_creneaux: totalSlots === 0
                };

                const res = await fetch(`${window.supabaseClient.supabaseUrl}/functions/v1/create-checkout-session`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${window.supabaseClient.supabaseKey}`
                    },
                    body: JSON.stringify(payload)
                });
                
                const data = await res.json();
                
                if (!res.ok) {
                    throw new Error(data.error || "Erreur HTTP : " + res.status);
                }

                if (data?.error) throw new Error(data.error + (data.traceback ? ' | ' + JSON.stringify(data.traceback) : ''));
                if (data?.url) location.href = data.url;
            } catch (e) {
                console.error(e);
                alert('Erè pèman: ' + e.message);
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
            state.gateway = btn.dataset.gateway || 'stripe';
            const pBtn = document.getElementById('pay-button');
            if (pBtn) pBtn.innerText = state.gateway === 'moncash'
                ? 'Peye ak MonCash'
                : 'Konfime epi Peye Sekirize';
        };
    });
}

// ── PRIX ──────────────────────────────────────────────────────

function calculatePrice() {
    const subtotal = state.selectedServices.reduce((acc, s) => acc + (s.prix || 105), 0);
    const discountPercent = state.selectedServices.length > 1 ? 10 : 0;
    const discountAmount = (subtotal * discountPercent) / 100;
    const discounted = subtotal - discountAmount;
    const finalAmount = state.paymentMode === 'depot' ? discounted / 2 : discounted;

    const finalAmtEl = document.getElementById('final-amount');
    const discountTextEl = document.getElementById('final-discount-text');
    if (finalAmtEl) finalAmtEl.innerText = `$${finalAmount.toFixed(2)}`;
    if (discountTextEl) discountTextEl.innerText = `${discountPercent}%`;
    state.finalAmount = finalAmount;
}

// ── NAVIGATION ────────────────────────────────────────────────

function goToStep(s) {
    document.querySelectorAll('.step-section').forEach(sec => sec.classList.remove('active'));
    const target = document.getElementById(`step-${s}`);
    if (target) target.classList.add('active');
    document.querySelectorAll('#stepper .step').forEach(dot => {
        dot.classList.remove('active');
        if (dot.dataset.step == s) dot.classList.add('active');
    });
}

// ── LANCEMENT ─────────────────────────────────────────────────

// Déjà appelés via initApp() dans DOMContentLoaded
// setupEventListeners();
// renderServicesGrid();