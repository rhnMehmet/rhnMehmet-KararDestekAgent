# İbrahim Mert Bozdoğan'nın Web Frontend Görevleri
**Front-end Test Videosu:** [videom](https://www.youtube.com/watch?v=x-2c8BIoDVs)
https://www.youtube.com/watch?v=x-2c8BIoDVs

## 2️⃣0️⃣ Yorum Güncelleme

**API Endpoint:** `PUT /comments/{commentId}`  
**Geliştirici:** İbrahim Mert Bozdoğan

### Görev
Kullanıcının yaptığı yorumu düzenleyebilmesini sağlamak.

### UI Bileşenleri
- Yorum düzenleme text area
- Karakter sayacı
- “Kaydet” butonu
- “İptal” butonu
- Loading indicator

### Form Validasyonu
- Boş yorum engelleme
- Maksimum karakter kontrolü
- İçerik doğrulama

### Kullanıcı Deneyimi
- Inline edit sistemi
- Güncelleme sonrası anında yenileme
- Başarı bildirimi (toast/snackbar)
- Değişiklik kaybı uyarısı

### Teknik Detaylar
- Optimistic UI update
- State management (comment)
- API error handling
- Real-time UI refresh

---

## 2️⃣1️⃣ Kullanıcı Girişi (Login)

**API Endpoint:** `POST /users/login`  
**Geliştirici:** İbrahim Mert Bozdoğan

### Görev
Kullanıcının e-posta ve şifre ile giriş yapmasını sağlamak.

### UI Bileşenleri
- Email input
- Şifre input
- Şifre göster/gizle
- “Giriş Yap” butonu
- “Şifremi Unuttum” linki
- “Kayıt Ol” linki
- Loading spinner

### Form Validasyonu
- Email format kontrolü
- Boş alan kontrolü
- Minimum şifre uzunluğu

### Kullanıcı Deneyimi
- Başarılı giriş → dashboard yönlendirme
- Hatalı giriş mesajı
- Remember me (opsiyonel)

### Teknik Detaylar
- JWT token saklama
- Auth state management
- Protected routes
- Auto-login kontrolü

---

## 2️⃣2️⃣ Profil Görüntüleme

**API Endpoint:** `GET /users/{id}`  
**Geliştirici:** İbrahim Mert Bozdoğan

### Görev
Kullanıcının profil bilgilerini görüntülemek.

### UI Bileşenleri
- Profil fotoğrafı
- Ad Soyad
- Email
- Hesap oluşturulma tarihi
- “Profili Düzenle” butonu

### Kullanıcı Deneyimi
- Loading skeleton
- Error state + retry
- Responsive tasarım

### Teknik Detaylar
- Authorization kontrolü
- Data caching
- Routing entegrasyonu

---

## 2️⃣3️⃣ Oyuncuları Listeleme

**API Endpoint:** `GET /players`  
**Geliştirici:** İbrahim Mert Bozdoğan

### Görev
Tüm oyuncuları listelemek.

### UI Bileşenleri
- Oyuncu kartları / grid
- Arama alanı
- Pozisyon filtresi
- Takım filtresi
- Pagination / infinite scroll

### Kullanıcı Deneyimi
- Loading skeleton
- Empty state
- Hızlı filtreleme

### Teknik Detaylar
- Server-side pagination
- Debounced search
- Query params yönetimi

---

## 2️⃣4️⃣ Oyuncu Detayı

**API Endpoint:** `GET /players/{playerId}`  
**Geliştirici:** İbrahim Mert Bozdoğan

### Görev
Oyuncunun detaylı bilgilerini göstermek.

### UI Bileşenleri
- Oyuncu profil kartı
- Yaş
- Pozisyon
- Takım
- İstatistik paneli
- Piyasa değeri

### Kullanıcı Deneyimi
- Sekmeli yapı
- Smooth animasyonlar
- Mobil uyum

### Teknik Detaylar
- Dynamic routing
- Async data fetching
- Component modularization

---

## 2️⃣5️⃣ Transferleri Listeleme

**API Endpoint:** `GET /transfers`  
**Geliştirici:** İbrahim Mert Bozdoğan

### Görev
Transferleri listelemek.

### UI Bileşenleri
- Transfer tablosu
- Oyuncu adı
- Eski/Yeni kulüp
- Transfer tarihi
- Bonservis bedeli
- Filtre paneli

### Kullanıcı Deneyimi
- Tarihe göre sıralama
- Pagination / infinite scroll
- Loading skeleton

### Teknik Detaylar
- Server-side filtering
- Sorting
- Cache

---

## 2️⃣6️⃣ Favori Takım Silme

**API Endpoint:** `DELETE /users/{id}/favorites/teams/{teamId}`  
**Geliştirici:** İbrahim Mert Bozdoğan

### Görev
Favori takımı listeden kaldırmak.

### UI Bileşenleri
- Favori takım listesi
- Sil butonu
- Confirmation modal

### Kullanıcı Deneyimi
- Silme onayı
- Anında güncelleme
- Success bildirimi

### Teknik Detaylar
- Authentication kontrolü
- Optimistic UI
- Error rollback

---

## 2️⃣7️⃣ Transfer Tahmini (AI)

**API Endpoint:** `POST /ai/transfer-predictions`  
**Geliştirici:** İbrahim Mert Bozdoğan

### Görev
AI destekli transfer tahmini oluşturmak.

### UI Bileşenleri
- Oyuncu seçimi
- Tahmin oluştur butonu
- AI sonuç kartı
- Tahmini kulüp
- Olasılık yüzdesi
- Grafik paneli

### Kullanıcı Deneyimi
- AI loading animasyonu
- Görsel sonuç sunumu
- Tekrar tahmin oluşturma

### Teknik Detaylar
- Async API request
- Loading state
- Chart library
- Error fallback UI
