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
const gunSelect = document.getElementById('gun');
const aySelect = document.getElementById('ay');
const yilSelect = document.getElementById('yil');
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
    initializeDateSelectors();
}

function setupEventListeners() {
    personelSelect.addEventListener('change', handlePersonelChange);
    gunSelect.addEventListener('change', handleDateChange);
    aySelect.addEventListener('change', handleDateChange);
    yilSelect.addEventListener('change', handleDateChange);
    appointmentForm.addEventListener('submit', handleSubmit);
}

function initializeDateSelectors() {
    // Ayları doldur
    const aylar = [
        'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    
    aylar.forEach((ay, index) => {
        const option = document.createElement('option');
        option.value = index + 1;
        option.textContent = ay;
        aySelect.appendChild(option);
    });
    
    // Yılları doldur (2024-2030)
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year <= currentYear + 6; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yilSelect.appendChild(option);
    }
    
    // Güncel yılı seç
    yilSelect.value = currentYear;
    
    // Ay değiştiğinde günleri güncelle
    aySelect.addEventListener('change', updateGunler);
    yilSelect.addEventListener('change', updateGunler);
}

function updateGunler() {
    const ay = parseInt(aySelect.value);
    const yil = parseInt(yilSelect.value);
    
    if (!ay || !yil) {
        gunSelect.innerHTML = '<option value="">Gün</option>';
        return;
    }
    
    const gunSayisi = new Date(yil, ay, 0).getDate();
    const bugun = new Date();
    const minDate = new Date(bugun.getFullYear(), bugun.getMonth(), bugun.getDate() + 1);
    const secilenTarih = new Date(yil, ay - 1, 1);
    
    gunSelect.innerHTML = '<option value="">Gün</option>';
    
    for (let gun = 1; gun <= gunSayisi; gun++) {
        const kontrolTarih = new Date(yil, ay - 1, gun);
        
        // Geçmiş tarihleri engelle
        if (kontrolTarih >= minDate) {
            const option = document.createElement('option');
            option.value = gun;
            option.textContent = gun;
            gunSelect.appendChild(option);
        }
    }
}

function handleDateChange() {
    const gun = gunSelect.value;
    const ay = aySelect.value;
    const yil = yilSelect.value;
    
    if (gun && ay && yil) {
        // YYYY-MM-DD formatında tarih oluştur
        const formattedGun = gun.padStart(2, '0');
        const formattedAy = ay.padStart(2, '0');
        tarihInput.value = `${yil}-${formattedAy}-${formattedGun}`;
        
        if (selectedHizmet) {
            generateAvailableTimes(tarihInput.value);
        }
    } else {
        tarihInput.value = '';
        resetSaatSelect();
    }
}

// API Functions
async function apiRequest(endpoint, options = {}) {
    const url = `${SUPABASE_URL}${endpoint}`;
    const headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
        ...options.headers
    };

    try {
        const response = await fetch(url, {
            ...options,
            headers
        });

        console.log('API Response status:', response.status);
        console.log('API Response headers:', response.headers);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        // Check if response has content
        const responseText = await response.text();
        console.log('Raw response text:', responseText);
        
        if (!responseText) {
            // Empty response is OK for POST requests
            return { success: true };
        }
        
        try {
            return JSON.parse(responseText);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            throw new Error(`JSON parsing failed: ${parseError.message}`);
        }
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


async function generateAvailableTimes(selectedDate) {
    const saatSelect = document.getElementById('saat');
    saatSelect.innerHTML = '<option value="">Saat seçin...</option>';
    saatSelect.disabled = false;

    try {
        // Mevcut randevuları çek
        const personelId = personelSelect.value;
        const randevularResponse = await apiRequest(`/randevu?personel_id=eq.${personelId}&randevu_tarihi=gte.${selectedDate}&randevu_tarihi=lt.${new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000).toISOString()}`);
        
        // Dolu saatleri bir set olarak sakla
        const doluSaatler = new Set();
        randevularResponse.forEach(randevu => {
            const randevuTarihi = new Date(randevu.randevu_tarihi);
            const saat = randevuTarihi.getHours().toString().padStart(2, '0') + ':' + 
                         randevuTarihi.getMinutes().toString().padStart(2, '0');
            doluSaatler.add(saat);
        });

        // Generate hours from 9:00 to 18:00
        for (let hour = 9; hour <= 18; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                
                // Eğer saat doluysa gösterme
                if (doluSaatler.has(time)) {
                    continue;
                }
                
                const option = document.createElement('option');
                option.value = time;
                option.textContent = time;
                saatSelect.appendChild(option);
            }
        }
        
        // Eğer tüm saatler doluysa
        if (saatSelect.options.length === 1) {
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "Seçilebilir saat yok";
            option.disabled = true;
            saatSelect.appendChild(option);
        }
    } catch (error) {
        console.error('Saatler yüklenemedi:', error);
        // Hata olursa tüm saatleri göster
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
        console.log('Form verileri:', formData);
        
        const result = await createAppointment(formData);
        console.log('Başarılı sonuç:', result);
        
        showSuccess(formData);
    } catch (error) {
        console.error('Detaylı hata:', error);
        
        // Daha spesifik hata mesajları
        if (error.message.includes('401') || error.message.includes('403')) {
            showError('API yetkilendirme hatası. Lütfen sayfayı yenileyin.');
        } else if (error.message.includes('400')) {
            showError('Geçersiz veri. Lütfen tüm alanları kontrol edin.');
        } else if (error.message.includes('500')) {
            showError('Sunucu hatası. Lütfen biraz sonra tekrar deneyin.');
        } else {
            showError(`Randevu talebi oluşturulamadı: ${error.message}`);
        }
    } finally {
        setLoading(false);
    }
}

function validateForm() {
    const personelId = personelSelect.value;
    const hizmetId = hizmetSelect.value;
    const gun = gunSelect.value;
    const ay = aySelect.value;
    const yil = yilSelect.value;
    const tarih = tarihInput.value;
    const saat = saatSelect.value;
    const ad = document.getElementById('ad').value.trim();
    const soyad = document.getElementById('soyad').value.trim();
    const telefon = document.getElementById('telefon').value.trim();

    if (!personelId || !hizmetId || !gun || !ay || !yil || !tarih || !saat || !ad || !soyad || !telefon) {
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

    console.log('Gönderilen veri:', payload);
    
    try {
        const response = await apiRequest('/randevu', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        console.log('API yanıtı:', response);
        return response;
    } catch (error) {
        console.error('Randevu oluşturma hatası:', error);
        throw error;
    }
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
