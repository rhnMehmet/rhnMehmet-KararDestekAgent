# Mehmet Orhan'nın Web Frontend Görevleri
**Front-end Test Videosu:** [videom](https://www.youtube.com/watch?v=yWrbGzaQZy8)

## 🔟 Kullanıcı Çıkışı (Logout)

**API Endpoint:** `POST /users/logout`

### Görev
Kullanıcının aktif oturumunu güvenli şekilde sonlandırmak.

### UI Bileşenleri
- Navbar “Çıkış Yap” butonu
- Profil dropdown menüsü
- Loading indicator

### Kullanıcı Deneyimi
- Tek tıkla çıkış
- Login sayfasına yönlendirme
- Korunan sayfalara erişim engeli

### Teknik Detaylar
- Token temizleme (localStorage / cookie)
- Session sonlandırma
- Protected route kontrolü
- Redirect handling

---
 
## 1️⃣1️⃣ Hesap Silme

**API Endpoint:** `DELETE /users/{id}`

### Görev
Kullanıcının hesabını kalıcı olarak silmesini sağlamak.

### UI Bileşenleri
- “Hesabı Sil” (danger button)
- Confirmation modal
- Şifre doğrulama (opsiyonel)

### Kullanıcı Deneyimi
- Geri alınamaz işlem uyarısı
- Çift onay mekanizması
- Otomatik logout + login yönlendirme

### Teknik Detaylar
- Authorization kontrolü
- Session temizleme
- Modal flow yönetimi
- Error handling

---

## 1️⃣2️⃣ Favori Takım Ekleme

**API Endpoint:** `POST /users/{id}/favorites/teams`

### Görev
Kullanıcının favori takımlarını yönetmesini sağlamak.

### UI Bileşenleri
- Takım kartları
- Favori butonu
- Favori ikon göstergesi
- Favori listesi

### Kullanıcı Deneyimi
- Anında ikon değişimi
- Favori paneli
- Success bildirimi

### Teknik Detaylar
- State management (favorites)
- Optimistic UI
- Duplicate kontrolü

---

## 1️⃣3️⃣ Bildirim Tercihleri

**API Endpoint:** `PUT /users/{id}/notifications`

### Görev
Kullanıcının bildirim ayarlarını yönetmesini sağlamak.

### UI Bileşenleri
- Toggle switch listesi
- Transfer bildirimleri
- Maç sonuçları
- Favori takım haberleri
- AI bildirimleri
- Kaydet butonu

### Kullanıcı Deneyimi
- Anlık değişim
- Kaydedildi bildirimi
- Basit UI

### Teknik Detaylar
- User preference state
- API senkronizasyonu
- Form persistence

---

## 1️⃣4️⃣ Oyuncu Piyasa Değeri

**API Endpoint:** `GET /players/{playerId}/market-value`

### Görev
Oyuncunun piyasa değerini görselleştirmek.

### UI Bileşenleri
- Oyuncu kartı
- Piyasa değeri
- Değer grafiği
- Tooltip

### Kullanıcı Deneyimi
- Grafik animasyonu
- Loading skeleton
- Mobil uyum

### Teknik Detaylar
- Chart library
- Async data fetching
- Cache yönetimi

---

## 1️⃣5️⃣ Admin Paneli — Kullanıcılar

**API Endpoint:** `GET /admin/users`

### Görev
Adminin tüm kullanıcıları görüntülemesi.

### UI Bileşenleri
- Kullanıcı tablosu
- Arama alanı
- Rol bilgisi
- Pagination
- Aksiyon menüsü

### Kullanıcı Deneyimi
- Yetki kontrolü
- Hızlı arama
- Responsive dashboard

### Teknik Detaylar
- Role-based access control
- Protected routes
- Server-side pagination

---

## 1️⃣6️⃣ Takım Kadrosu

**API Endpoint:** `GET /teams/{teamId}/squad`

### Görev
Takım oyuncularını listelemek.

### UI Bileşenleri
- Liste/Grid görünüm
- Oyuncu fotoğrafı
- Pozisyon
- Forma numarası

### Kullanıcı Deneyimi
- Filtreleme
- Hover detay
- Responsive yapı

### Teknik Detaylar
- Lazy loading
- Component reuse
- Cache

---

## 1️⃣7️⃣ AI Takım Raporu

**API Endpoint:** `GET /ai/team-report/{teamId}`

### Görev
AI analiz raporunu göstermek.

### UI Bileşenleri
- Analiz paneli
- Güçlü/zayıf yönler
- Grafikler

### Kullanıcı Deneyimi
- Loading animasyonu
- Kart tasarım
- Grafik destekli analiz

### Teknik Detaylar
- Data visualization
- Async API
- Error fallback UI

---

## 1️⃣8️⃣ Yorum Silme

**API Endpoint:** `DELETE /api/comments/{commentId}`

### Görev
Yorum silme işlemini sağlamak.

### UI Bileşenleri
- Yorum kartı
- Sil butonu
- Confirmation modal

### Kullanıcı Deneyimi
- Silme onayı
- Anında güncelleme
- Yetki uyarısı

### Teknik Detaylar
- Permission kontrolü
- Optimistic update
- Error rollback

---

## 1️⃣9️⃣ Yorum Listeleme

**API Endpoint:** `GET /api/comments`

### Görev
Yorumları listelemek.

### UI Bileşenleri
- Yorum listesi
- Kullanıcı bilgisi
- Tarih
- Filtreleme
- Pagination

### Kullanıcı Deneyimi
- Infinite scroll / sayfalama
- Empty state
- Loading skeleton

### Teknik Detaylar
- Server-side filtering
- Cache
- State management