## Mustafa Alican Kutsal'ın REST API Metotları

**API Test Videosu:** [videom](https://youtu.be/d8ptnBtG8OE)

---

## 1. Kullanıcı Kaydı
**Endpoint:** POST /users/register  

**Request Body:**
```json
{
  "firstName": "Ahmet",
  "lastName": "Yılmaz",
  "email": "ahmet@example.com",
  "password": "Guvenli123!"
}
```

**Response:** 201 Created - Kullanıcı başarıyla oluşturuldu  

---

## 2. Şifre Değiştirme
**Endpoint:** PUT /users/{id}/password  
**Path Parameters:** id (string, required) - Kullanıcı ID'si  

**Request Body:**
```json
{
  "currentPassword": "123456",
  "newPassword": "YeniGuvenli123!"
}
```

**Authentication:** Bearer Token gerekli  
**Response:** 200 OK - Şifre başarıyla güncellendi  

---

## 3. Favori Oyuncu Ekleme
**Endpoint:** POST /users/{id}/favorites/players  
**Path Parameters:** id (string, required) - Kullanıcı ID'si  

**Request Body:**
```json
{
  "playerId": "789"
}
```

**Authentication:** Bearer Token gerekli  
**Response:** 201 Created - Oyuncu favorilere eklendi  

---

## 4. Takımları Listeleme
**Endpoint:** GET /teams  

**Query Parameters (opsiyonel):**  
- league (string) - Lig filtresi  
- country (string) - Ülke filtresi  
- season (string) - Sezon filtresi  

**Response:** 200 OK - Takımlar başarıyla listelendi  

---

## 5. Takım Detayı Görüntüleme
**Endpoint:** GET /teams/{teamId}  
**Path Parameters:** teamId (string, required) - Takım ID'si  

**Response:** 200 OK - Takım detayları başarıyla getirildi  

---

## 6. Favori Oyuncu Silme
**Endpoint:** DELETE /users/{id}/favorites/players/{playerId}  

**Path Parameters:**  
- id (string, required) - Kullanıcı ID'si  
- playerId (string, required) - Oyuncu ID'si  

**Authentication:** Bearer Token gerekli  
**Response:** 204 No Content - Oyuncu favorilerden kaldırıldı  

---

## 7. Oyuncu Transfer Geçmişi
**Endpoint:** GET /players/{playerId}/transfers  
**Path Parameters:** playerId (string, required) - Oyuncu ID'si  

**Response:** 200 OK - Transfer geçmişi başarıyla listelendi  

---

## 8. Oyuncu Değer Tahmini
**Endpoint:** GET /ai/player-value/{playerId}  
**Path Parameters:** playerId (string, required) - Oyuncu ID'si  

**Response:** 200 OK - Oyuncunun tahmini değeri hesaplandı  

---

## 9. Profil Güncelleme
**Endpoint:** PUT /users/{id}  
**Path Parameters:** id (string, required) - Kullanıcı ID'si  

**Request Body:**
```json
{
  "firstName": "Ahmet",
  "lastName": "Yılmaz",
  "email": "ahmet@example.com"
}
```

**Authentication:** Bearer Token gerekli  
**Response:** 200 OK - Kullanıcı bilgileri başarıyla güncellendi
