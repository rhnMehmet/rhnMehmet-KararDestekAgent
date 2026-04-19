# Mehmet Orhan'nın REST API Metotları

**API Test Videosu:** [videom](https://youtu.be/YeCbF3M1tU0)

## 1. Kullanıcı Çıkışı
**Endpoint:** POST /users/logout  

**Authentication:** Bearer Token gerekli  
**Response:** 200 OK - Kullanıcı başarıyla çıkış yaptı  

---

## 2. Hesap Silme
**Endpoint:** DELETE /users/{id}  
**Path Parameters:** id (string, required) - Kullanıcı ID'si  

**Authentication:** Bearer Token gerekli  
**Response:** 204 No Content - Kullanıcı hesabı başarıyla silindi  

---

## 3. Favori Takım Ekleme
**Endpoint:** POST /users/{id}/favorites/teams  
**Path Parameters:** id (string, required) - Kullanıcı ID'si  

**Request Body:**
```json
{
  "teamId": "12345"
}
```

**Authentication:** Bearer Token gerekli  
**Response:** 201 Created - Takım favorilere eklendi  

---

## 4. Bildirim Tercihlerini Güncelleme
**Endpoint:** PUT /users/{id}/notifications  
**Path Parameters:** id (string, required) - Kullanıcı ID'si  

**Request Body:**
```json
{
  "emailNotifications": true,
  "pushNotifications": false,
  "smsNotifications": true
}
```

**Authentication:** Bearer Token gerekli  
**Response:** 200 OK - Bildirim tercihleri güncellendi  

---

## 5. Piyasa Değeri Görüntüleme
**Endpoint:** GET /players/{playerId}/market-value  
**Path Parameters:** playerId (string, required) - Oyuncu ID'si  

**Response:** 200 OK - Oyuncunun piyasa değeri getirildi  

```json
{
  "playerId": "101",
  "marketValue": 35000000,
  "currency": "EUR",
  "lastUpdated": "2026-04-05"
}
```

---

## 6. Admin Paneli
**Endpoint:** GET /admin/users  

**Authentication:** Admin yetkisi gerekli  
**Response:** 200 OK - Kullanıcı listesi başarıyla getirildi  

```json
[
  {
    "id": "1",
    "firstName": "Admin",
    "lastName": "Hesap",
    "email": "admin@test.com",
    "role": "ADMIN"
  },
  {
    "id": "2",
    "firstName": "Ahmet",
    "lastName": "Yılmaz",
    "email": "ahmet@example.com",
    "role": "USER"
  }
]
```

---

## 7. Takım Kadrosu Görüntüleme
**Endpoint:** GET /teams/{teamId}/squad  
**Path Parameters:** teamId (string, required) - Takım ID'si  

**Response:** 200 OK - Takım kadrosu başarıyla getirildi  

```json
[
  {
    "playerId": "101",
    "name": "Lionel Messi",
    "position": "RW"
  },
  {
    "playerId": "102",
    "name": "Kylian Mbappe",
    "position": "ST"
  }
]
```

---

## 8. AI Takım Raporu
**Endpoint:** GET /ai/team-report/{teamId}  
**Path Parameters:** teamId (string, required) - Takım ID'si  

**Response:** 200 OK - AI takım raporu oluşturuldu  

```json
{
  "teamId": "10",
  "strengths": ["Hücum gücü", "Pas oyunu"],
  "weaknesses": ["Defans hataları"],
  "overallRating": 8.5
}
```

---

## 9. Yorum Silme
**Endpoint:** DELETE /api/comments/{commentId}  
**Path Parameters:** commentId (string, required) - Yorum ID'si  

**Authentication:** Bearer Token gerekli  
**Response:** 204 No Content - Yorum başarıyla silindi  

---

## 10. Yorum Listeleme
**Endpoint:** GET /api/comments  

**Query Parameters (opsiyonel):**  
- postId (string)  

**Response:** 200 OK - Yorumlar başarıyla listelendi  

```json
[
  {
    "id": "501",
    "user": "Ahmet",
    "content": "Harika bir oyuncu!",
    "createdAt": "2026-04-05"
  }
]
```