// Supabase Configuration
const SUPABASE_URL = 'https://umbuncjulxmqobpqttin.supabase.co/rest/v1';
const SUPABASE_ANON_KEY = 'sb_publishable_psy0bacTpyKP8OuLfODV5Q_QNFwW62Y';

// Global variables
let personelData = [];
let hizmetData = [];
let selectedPersonel = null;
let selectedHizmet = null;

// DOM Elements
const personelSelect = document.getElementById('personel');
const hizmetSelect = document.getElementById('hizmet');
const tarihInput = document.getElementById('tarih');
const saatSelect = document.getElementById('saat');
const appointmentForm = document.getElementById('appointmentForm');
const submitBtn = document.getElementById('submitBtn');
const successMessage = document.getElementById('successMessage');
const errorMessage = document.getElementById('errorMessage');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    loadPersonel();
    setupEventListeners();
    setMinDate();
}

function setupEventListeners() {
    personelSelect.addEventListener('change', handlePersonelChange);
    tarihInput.addEventListener('change', handleTarihChange);
    appointmentForm.addEventListener('submit', handleSubmit);
}

function setMinDate() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];
    tarihInput.min = minDate;
}

// API Functions
async function apiRequest(endpoint, options = {}) {
    const url = `${SUPABASE_URL}${endpoint}`;
    const headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        ...options.headers
    };

    try {
        const response = await fetch(url, {
            ...options,
            headers
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Load Personel
async function loadPersonel() {
    try {
        personelData = await apiRequest('/personel?order=ad_soyad');
        populatePersonelSelect();
    } catch (error) {
        showError('Personel bilgileri yüklenemedi. Lütfen sayfayı yenileyin.');
    }
}

function populatePersonelSelect() {
    personelSelect.innerHTML = '<option value="">Personel seçin...</option>';
    
    personelData.forEach(personel => {
        const option = document.createElement('option');
        option.value = personel.id;
        option.textContent = personel.ad_soyad;
        personelSelect.appendChild(option);
    });
}

// Handle Personel Change
async function handlePersonelChange() {
    const personelId = personelSelect.value;
    
    if (!personelId) {
        resetHizmetSelect();
        return;
    }

    selectedPersonel = personelData.find(p => p.id === personelId);
    await loadHizmet(personelId);
}

async function loadHizmet(personelId) {
    try {
        hizmetData = await apiRequest(`/hizmet?personel_id=eq.${personelId}&order=ad`);
        populateHizmetSelect();
    } catch (error) {
        showError('Hizmet bilgileri yüklenemedi. Lütfen tekrar deneyin.');
    }
}

function populateHizmetSelect() {
    hizmetSelect.innerHTML = '<option value="">Hizmet seçin...</option>';
    hizmetSelect.disabled = false;

    hizmetData.forEach(hizmet => {
        const option = document.createElement('option');
        option.value = hizmet.id;
        option.textContent = `${hizmet.ad} - ${hizmet.sure_dakika}dk - ₺${hizmet.fiyat}`;
        option.dataset.sure = hizmet.sure_dakika;
        option.dataset.fiyat = hizmet.fiyat;
        option.dataset.ad = hizmet.ad;
        hizmetSelect.appendChild(option);
    });

    // Add hizmet info display
    addHizmetInfo();
    
    // Add hizmet change listener
    hizmetSelect.addEventListener('change', handleHizmetChange);
}

function addHizmetInfo() {
    const existingInfo = document.querySelector('.hizmet-info');
    if (existingInfo) {
        existingInfo.remove();
    }

    const infoDiv = document.createElement('div');
    infoDiv.className = 'hizmet-info';
    infoDiv.id = 'hizmetInfo';
    infoDiv.style.display = 'none';
    
    hizmetSelect.parentNode.appendChild(infoDiv);

    hizmetSelect.addEventListener('change', updateHizmetInfo);
}

function handleHizmetChange() {
    const hizmetId = hizmetSelect.value;
    
    if (hizmetId) {
        selectedHizmet = hizmetData.find(h => h.id === hizmetId);
    } else {
        selectedHizmet = null;
    }
    
    updateHizmetInfo();
}

function updateHizmetInfo() {
    const selectedOption = hizmetSelect.options[hizmetSelect.selectedIndex];
    const infoDiv = document.getElementById('hizmetInfo');

    if (selectedOption && selectedOption.value) {
        const sure = selectedOption.dataset.sure;
        const fiyat = selectedOption.dataset.fiyat;
        
        infoDiv.innerHTML = `
            <strong>Seçilen Hizmet:</strong> ${selectedOption.dataset.ad}<br>
            <strong>Süre:</strong> ${sure} dakika<br>
            <strong>Fiyat:</strong> ₺${fiyat}
        `;
        infoDiv.style.display = 'block';
    } else {
        infoDiv.style.display = 'none';
    }
}

// Handle Tarih Change
function handleTarihChange() {
    const selectedDate = tarihInput.value;
    
    if (!selectedDate || !selectedHizmet) {
        resetSaatSelect();
        return;
    }

    generateAvailableTimes(selectedDate);
}

function generateAvailableTimes(selectedDate) {
    const saatSelect = document.getElementById('saat');
    saatSelect.innerHTML = '<option value="">Saat seçin...</option>';
    saatSelect.disabled = false;

    // Generate hours from 9:00 to 18:00
    for (let hour = 9; hour <= 18; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
            const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            const option = document.createElement('option');
            option.value = time;
            option.textContent = time;
            saatSelect.appendChild(option);
        }
    }
}

// Form Submit
async function handleSubmit(e) {
    e.preventDefault();
    
    if (!validateForm()) {
        return;
    }

    setLoading(true);
    
    try {
        const formData = getFormData();
        await createAppointment(formData);
        showSuccess(formData);
    } catch (error) {
        showError('Randevu talebi oluşturulamadı. Lütfen tekrar deneyin.');
    } finally {
        setLoading(false);
    }
}

function validateForm() {
    const personelId = personelSelect.value;
    const hizmetId = hizmetSelect.value;
    const tarih = tarihInput.value;
    const saat = saatSelect.value;
    const ad = document.getElementById('ad').value.trim();
    const soyad = document.getElementById('soyad').value.trim();
    const telefon = document.getElementById('telefon').value.trim();

    if (!personelId || !hizmetId || !tarih || !saat || !ad || !soyad || !telefon) {
        showError('Lütfen tüm alanları doldurun.');
        return false;
    }

    // Validate phone format
    const phoneDigits = telefon.replace(/[^\d]/g, '');
    if (phoneDigits.length !== 10) {
        showError('Telefon numarası 10 haneli olmalıdır.');
        return false;
    }

    return true;
}

function getFormData() {
    const selectedOption = hizmetSelect.options[hizmetSelect.selectedIndex];
    const hizmetAd = selectedOption.dataset.ad;
    
    return {
        personel_id: personelSelect.value,
        hizmet_id: hizmetSelect.value,
        musteri_ad: document.getElementById('ad').value.trim(),
        musteri_soyad: document.getElementById('soyad').value.trim(),
        musteri_telefon: document.getElementById('telefon').value.trim(),
        randevu_tarihi: `${tarihInput.value}T${saatSelect.value}:00.000Z`,
        hizmet_ad: hizmetAd
    };
}

async function createAppointment(data) {
    const payload = {
        personel_id: data.personel_id,
        hizmet_id: data.hizmet_id,
        musteri_ad: data.musteri_ad,
        musteri_soyad: data.musteri_soyad,
        musteri_telefon: data.musteri_telefon,
        randevu_tarihi: data.randevu_tarihi,
        durum: 'beklemede'
    };

    return await apiRequest('/randevu', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

function showSuccess(formData) {
    // Hide form
    document.querySelector('.form-container').style.display = 'none';
    
    // Update success message
    document.getElementById('musteriAd').textContent = `${formData.musteri_ad} ${formData.musteri_soyad}`;
    document.getElementById('hizmetAd').textContent = formData.hizmet_ad;
    document.getElementById('tarihSaat').textContent = formatDateTime(formData.randevu_tarihi);
    
    // Show success message
    successMessage.style.display = 'block';
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    const options = { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    };
    return date.toLocaleDateString('tr-TR', options);
}

function showError(message) {
    document.getElementById('errorText').textContent = message;
    errorMessage.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setLoading(loading) {
    submitBtn.disabled = loading;
    
    if (loading) {
        submitBtn.querySelector('.btn-text').style.display = 'none';
        submitBtn.querySelector('.btn-loading').style.display = 'flex';
    } else {
        submitBtn.querySelector('.btn-text').style.display = 'block';
        submitBtn.querySelector('.btn-loading').style.display = 'none';
    }
}

// Reset functions
function resetHizmetSelect() {
    hizmetSelect.innerHTML = '<option value="">Önce personel seçin...</option>';
    hizmetSelect.disabled = true;
    selectedHizmet = null;
    
    const infoDiv = document.getElementById('hizmetInfo');
    if (infoDiv) {
        infoDiv.style.display = 'none';
    }
}

function resetSaatSelect() {
    saatSelect.innerHTML = '<option value="">Önce tarih seçin...</option>';
    saatSelect.disabled = true;
}

// Phone formatting
document.getElementById('telefon').addEventListener('input', function(e) {
    let value = e.target.value.replace(/[^\d]/g, '');
    
    if (value.length > 10) {
        value = value.substring(0, 10);
    }
    
    let formatted = value;
    if (value.length > 3) {
        formatted = value.substring(0, 3) + ' ' + value.substring(3);
    }
    if (value.length > 6) {
        formatted = value.substring(0, 3) + ' ' + value.substring(3, 6) + ' ' + value.substring(6);
    }
    if (value.length > 8) {
        formatted = value.substring(0, 3) + ' ' + value.substring(3, 6) + ' ' + value.substring(6, 8) + ' ' + value.substring(8);
    }
    
    e.target.value = formatted;
});
