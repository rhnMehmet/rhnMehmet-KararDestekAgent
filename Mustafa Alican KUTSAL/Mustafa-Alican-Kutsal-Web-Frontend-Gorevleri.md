## Mustafa Alican Kutsal'ın Web Frontend Görevleri

**Frontend Test Videosu:** [videom](https://youtu.be/KBN9hPudNFM)

---

## 1️⃣ Kullanıcı Kaydı

**API Endpoint:** `POST /users/register`

### Görev
Yeni kullanıcıların sisteme kayıt olmasını sağlamak.

### UI Bileşenleri
- Ad input
- Soyad input
- Email input
- Şifre input
- Şifre tekrar input
- “Kayıt Ol” butonu
- Loading indicator

### Form Validasyonu
- Email format kontrolü
- Şifre güvenlik kuralları
- Boş alan kontrolü
- Şifre eşleşme kontrolü

### Kullanıcı Deneyimi
- Başarılı kayıt sonrası login yönlendirme
- Hata mesajları
- Anlık validasyon

### Teknik Detaylar
- Password hashing
- Duplicate email kontrolü
- API validation
- Error handling

---

## 2️⃣ Şifre Değiştirme

**API Endpoint:** `PUT /users/{id}/password`

### Görev
Kullanıcının şifresini güvenli şekilde değiştirmesini sağlamak.

### UI Bileşenleri
- Mevcut şifre input
- Yeni şifre input
- Şifre tekrar input
- “Güncelle” butonu

### Form Validasyonu
- Mevcut şifre doğrulama
- Şifre güvenlik kuralları
- Şifre eşleşme kontrolü

### Kullanıcı Deneyimi
- Başarı bildirimi
- Hatalı şifre uyarısı
- Anlık geri bildirim

### Teknik Detaylar
- Password hashing
- Authentication kontrolü
- Secure update işlemi
- Error handling

---

## 3️⃣ Favori Oyuncu Ekleme

**API Endpoint:** `POST /users/{id}/favorites/players`

### Görev
Kullanıcının favori oyuncularını eklemesini sağlamak.

### UI Bileşenleri
- Oyuncu kartı
- Favori ekle butonu
- Favori ikon göstergesi

### Kullanıcı Deneyimi
- Anında ikon değişimi
- Favori listesine eklenme bildirimi

### Teknik Detaylar
- State management
- Optimistic UI update
- Duplicate kontrolü

---

## 4️⃣ Takımları Listeleme

**API Endpoint:** `GET /teams`

### Görev
Sistemdeki tüm takımları listelemek.

### UI Bileşenleri
- Takım kartları
- Arama alanı
- Filtreleme (lig, ülke, sezon)
- Pagination / infinite scroll

### Kullanıcı Deneyimi
- Hızlı filtreleme
- Loading skeleton
- Empty state

### Teknik Detaylar
- Server-side filtering
- Pagination
- Query param yönetimi

---

## 5️⃣ Takım Detayı Görüntüleme

**API Endpoint:** `GET /teams/{teamId}`

### Görev
Takımın detaylı bilgilerini göstermek.

### UI Bileşenleri
- Takım profil kartı
- Kadro listesi
- Teknik ekip
- İstatistik paneli

### Kullanıcı Deneyimi
- Sekmeli yapı
- Responsive tasarım
- Smooth geçişler

### Teknik Detaylar
- Dynamic routing
- Async data fetching
- Component modularization

---

## 6️⃣ Favori Oyuncu Silme

**API Endpoint:** `DELETE /users/{id}/favorites/players/{playerId}`

### Görev
Favori oyuncuyu listeden kaldırmak.

### UI Bileşenleri
- Favori oyuncu listesi
- Sil butonu
- Confirmation modal

### Kullanıcı Deneyimi
- Silme onayı
- Anında güncelleme
- Success bildirimi

### Teknik Detaylar
- Authentication kontrolü
- Optimistic UI update
- Error rollback

---

## 7️⃣ Oyuncu Transfer Geçmişi

**API Endpoint:** `GET /players/{playerId}/transfers`

### Görev
Oyuncunun transfer geçmişini göstermek.

### UI Bileşenleri
- Transfer listesi / tablo
- Tarih bilgisi
- Kulüp bilgisi
- Bonservis bedeli

### Kullanıcı Deneyimi
- Kronolojik sıralama
- Loading skeleton
- Filtreleme

### Teknik Detaylar
- Server-side data fetch
- Sorting
- Cache yönetimi

---

## 8️⃣ Oyuncu Değer Tahmini

**API Endpoint:** `GET /ai/player-value/{playerId}`

### Görev
Oyuncunun gelecekteki değer tahminini göstermek.

### UI Bileşenleri
- Oyuncu kartı
- Tahmini değer
- Grafik paneli

### Kullanıcı Deneyimi
- AI loading animasyonu
- Görsel veri sunumu
- Mobil uyum

### Teknik Detaylar
- Async API request
- Data visualization
- Cache yönetimi

---

## 9️⃣ Profil Güncelleme

**API Endpoint:** `PUT /users/{id}`

### Görev
Kullanıcının profil bilgilerini güncellemesini sağlamak.

### UI Bileşenleri
- Ad input
- Soyad input
- Email input
- “Kaydet” butonu
- Loading indicator

### Form Validasyonu
- Email format kontrolü
- Boş alan kontrolü
- Veri doğrulama

### Kullanıcı Deneyimi
- Anında güncelleme
- Başarı bildirimi
- Hata mesajları

### Teknik Detaylar
- Authentication kontrolü
- API sync
- State management
- Error handling