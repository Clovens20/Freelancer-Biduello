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
    gateway: 'stripe'
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

        const links = { 'facebook-link': data.facebook_url, 'instagram-link': data.instagram_url, 'tiktok-link': data.tiktok_url };
        Object.entries(links).forEach(([id, href]) => {
            const el = document.getElementById(id);
            if (el && href) el.href = href;
        });
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
    const currentSvc = state.selectedServices[0];
    if (!currentSvc) return;

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

setupEventListeners();
renderServicesGrid();