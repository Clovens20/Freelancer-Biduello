/**
 * DJ Innovations — Premium Pòtal (V2 - Mwa, Multi-Sèvis, 4 Semèn)
 * VERSION PROPRE & COMPLÈTE
 */

const state = {
    services: [], 
    selectedServices: [], 
    currentWeek: 1, 
    selectedSlots: {}, 
    paymentMode: 'full', 
    customerInfo: { prenom: '', non: '', email: '', telephone: '', message: '' },
    finalAmount: 0,
    totalDiscount: 0
};

// DOM SELECTORS
const servicesGrid = document.getElementById('services-grid');
const selectionBox = document.getElementById('selection-box');
const countSelected = document.getElementById('count-selected');
const subtotalDisplay = document.getElementById('subtotal-display'); // MODIFIÉ: Correspond à id="subtotal-display"
const modal = document.getElementById('service-modal');
const modalContainer = document.getElementById('modal-service-details');
const modalSelectBtn = document.getElementById('modal-select-btn');
const toStep2Btn = document.getElementById('to-step-2');
const toStep3Btn = document.getElementById('to-step-3');

let currentViewedServiceId = null;

// INIT
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    await loadLandingConfig();
    await fetchServicesFromSupabase();
    setupEventListeners();
}

/**
 * Charge dynamiquement le contenu de la landing page (Hero, AP, Footer)
 */
async function loadLandingConfig() {
    try {
        const { data, error } = await window.supabaseClient
            .from('landing_config')
            .select('*')
            .eq('id', 1)
            .single();
        
        if (error || !data) return;

        // Mise à jour du Hero
        const badge = document.getElementById('hero-badge');
        if (badge) badge.innerHTML = `<span class="badge-dot"></span> ${data.hero_badge}`;
        
        const title = document.getElementById('hero-title');
        if (title) title.innerHTML = data.hero_title;
        
        const desc = document.getElementById('hero-description');
        if (desc) desc.innerHTML = data.hero_description;
        
        const img = document.getElementById('hero-image');
        if (img) img.src = data.hero_image_url;

        // Mise à jour Avant-Propos
        const apTitle = document.getElementById('ap-title');
        if (apTitle) apTitle.innerHTML = data.ap_title;
        
        const apDesc = document.getElementById('ap-description');
        if (apDesc) apDesc.innerHTML = data.ap_description;
        
        const apPhoto = document.getElementById('ap-photo');
        if (apPhoto) apPhoto.src = data.ap_photo_url;

        // Mise à jour Footer & Sosyal
        const footerSlogan = document.getElementById('footer-slogan');
        if (footerSlogan) footerSlogan.innerHTML = data.footer_slogan;

        const fb = document.getElementById('facebook-link');
        const ig = document.getElementById('instagram-link');
        const tk = document.getElementById('tiktok-link');

        if (fb && data.facebook_url) fb.href = data.facebook_url;
        if (ig && data.instagram_url) ig.href = data.instagram_url;
        if (tk && data.tiktok_url) tk.href = data.tiktok_url;

    } catch (err) {
        console.error('Erè config landing:', err);
    }
}

/**
 * Récupère les services actifs depuis Supabase
 */
async function fetchServicesFromSupabase() {
    try {
        const { data, error } = await window.supabaseClient
            .from('services')
            .select('*')
            .eq('actif', true);
        
        if (error) throw error;
        state.services = data || [];
        renderServicesGrid();
    } catch (err) {
        console.error('Erè SDK:', err);
        if (servicesGrid) servicesGrid.innerHTML = '<p class="error">Nou pa t kapab chaje sèvis yo.</p>';
    }
}

/**
 * Affiche la grille des services
 */
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
                <button class="btn-details">Wè detay konplè</button>
            </div>
        `;
    }).join('');
}

/**
 * Ouvre le modal avec les détails du service
 */
window.openServiceModal = function(id) {
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
                    </div>
                `).join('')}
            </div>

            ${s.video_url ? `
                <div class="modal-video-wrap">
                    <iframe src="${s.video_url.replace('watch?v=', 'embed/')}" frameborder="0" allowfullscreen></iframe>
                </div>
            ` : ''}
        </div>
    `;

    // Update selection button status
    modalSelectBtn.innerHTML = isSelected ? '<span>✓ Sèvis Chwazi</span>' : `<span>Chwazi Sèvis sa a ($${s.prix || 105})</span>`;
    modalSelectBtn.className = isSelected ? 'btn gold wide active' : 'btn gold wide';

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

/**
 * Gère la sélection/désélection depuis le modal
 */
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

/**
 * Met à jour le récapitulatif de sélection (Step 1)
 */
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

// ── Funnel Steps (2: Horaires) ────────────────────────────────

window.changeViewedWeek = function(w) {
    state.currentWeek = w;
    renderWeekTabs();
};

function renderWeekTabs() {
    const container = document.getElementById('week-selector');
    if (!container) return;
    container.innerHTML = [1, 2, 3, 4].map(w => `
        <button class="week-btn ${state.currentWeek === w ? 'active' : ''}" onclick="changeViewedWeek(${w})">Semèn ${w}</button>
    `).join('');
    renderTimeSlots();
}

function renderTimeSlots() {
    const grid = document.getElementById('time-slots-grid');
    const progressIndicator = document.getElementById('selected-count');
    const currentSvc = state.selectedServices[0];
    if (!currentSvc || !grid) return;
    
    // Calcul des heures choisies pour la semaine actuelle
    const weekKey = `${currentSvc.id}_${state.currentWeek}`;
    const selectedThisWeek = (state.selectedSlots[weekKey] || []).length;
    if (progressIndicator) progressIndicator.innerText = selectedThisWeek;

    const days = ['Lendi', 'Madi', 'Mèkred.', 'Jedi', 'Vandred.', 'Samdi', 'Dimanch'];
    let html = '';
    
    // Génération des créneaux de 8h00 à 23h00
    const hours = [];
    for(let h=8; h<=23; h++) hours.push(h);

    for (let i = 0; i < 7; i++) {
        html += `
            <div class="day-col">
                <div class="day-header">${days[i]}</div>
                <div class="slots-list">
                    ${hours.map(h => {
                        const slot = `D${i}_H${h}`;
                        const isSelected = (state.selectedSlots[weekKey] || []).includes(slot);
                        // TODO: Ajouter check si le slot est déjà pris en DB
                        return `<button class="slot-btn ${isSelected ? 'selected' : ''}" 
                                onclick="toggleSlot('${currentSvc.id}', ${state.currentWeek}, '${slot}', this)">
                                ${h}:00</button>`;
                    }).join('')}
                </div>
            </div>`;
    }
    grid.innerHTML = html;
}

window.toggleSlot = function(svcId, week, slot, btn) {
    const key = `${svcId}_${week}`;
    if (!state.selectedSlots[key]) state.selectedSlots[key] = [];
    
    const index = state.selectedSlots[key].indexOf(slot);
    if (index > -1) {
        state.selectedSlots[key].splice(index, 1);
        btn.classList.remove('selected');
    } else {
        if (state.selectedSlots[key].length >= 6) {
            alert('Ou ka chwazi sèlman 6 èdtan pa semèn. Retire yon lòt kreno si w vle chanje sa a.');
            return;
        }
        state.selectedSlots[key].push(slot);
        btn.classList.add('selected');
    }
    
    // Update indicator
    const progressIndicator = document.getElementById('selected-count');
    if (progressIndicator) progressIndicator.innerText = state.selectedSlots[key].length;
    
    checkFinalStep();
}

function checkFinalStep() {
    const currentSvc = state.selectedServices[0];
    if (!currentSvc) return;
    
    // Le bouton de l'étape 3 s'active uniquement si TOUTES les 4 semaines ont 6h chacune
    let totalSelected = 0;
    for(let w=1; w<=4; w++) {
        totalSelected += (state.selectedSlots[`${currentSvc.id}_${w}`] || []).length;
    }
    
    toStep3Btn.disabled = (totalSelected < 24);
}

// ── SETUP & EVENTS ───────────────────────────────────────────

function setupEventListeners() {
    if (toStep2Btn) toStep2Btn.onclick = () => { goToStep(2); renderWeekTabs(); };
    if (toStep3Btn) toStep3Btn.onclick = () => { calculatePrice(); goToStep(3); };

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

    // Anchor links (Smooth scroll)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#' || targetId === '#services-section') {
                const targetElement = document.getElementById('services-section');
                if (targetElement) {
                    e.preventDefault();
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });

    const payBtn = document.getElementById('pay-button');
    if (payBtn) {
        payBtn.onclick = async () => {
            try {
                const { data, error } = await window.supabaseClient.functions.invoke('create-checkout-session', { body: state });
                if (data?.url) location.href = data.url;
                if (error) throw error;
            } catch(e) {
                console.error(e);
                alert("Erè pèman: " + e.message);
            }
        };
    }
}

function calculatePrice() {
    const subtotal = state.selectedServices.reduce((acc, s) => acc + (s.prix || 105), 0);
    
    // Calcul de la remise automatique si plus d'un service
    const discountPercent = state.selectedServices.length > 1 ? 10 : 0;
    const discountAmount = (subtotal * discountPercent) / 100;
    const discountedTotal = subtotal - discountAmount;

    // Si dépôt (50%), on divise le montant initial par deux
    const finalAmount = state.paymentMode === 'depot' ? discountedTotal / 2 : discountedTotal;
    
    const finalAmtEl = document.getElementById('final-amount');
    const discountTextEl = document.getElementById('final-discount-text');
    
    if (finalAmtEl) finalAmtEl.innerText = `$${finalAmount.toFixed(2)}`;
    if (discountTextEl) discountTextEl.innerText = `${discountPercent}%`;

    state.finalAmount = finalAmount;
}

// Gestion du choix de paiement physique (cartes 100% ou 50%)
document.querySelectorAll('.pay-card').forEach(card => {
    card.onclick = () => {
        document.querySelectorAll('.pay-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        state.paymentMode = card.dataset.mode || 'full';
        calculatePrice(); // Recalculer le prix immédiatement
    };
});

function goToStep(s) {
    document.querySelectorAll('.step-section').forEach(sec => sec.classList.remove('active'));
    const target = document.getElementById(`step-${s}`);
    if (target) target.classList.add('active');
    
    // Mise à jour visuelle des étapes
    document.querySelectorAll('#stepper .step').forEach(dot => {
        dot.classList.remove('active');
        if (dot.dataset.step == s) dot.classList.add('active');
    });
}

// État initial de paiement
state.paymentMode = 'full';

// Initialisation globale
setupEventListeners();
renderServicesGrid();