# İbrahim Mert BOZDOĞAN'ın REST API Metotları

**API Test Videosu:** [Videom](https://youtu.be/S4VbVKW1EcU) 


## 1. Yorum Güncelleme (İbrahim Mert Bozdoğan)
**Endpoint:** PUT /comments/{commentId}  
**Path Parameters:** commentId (string, required) - Yorum ID'si  

**Request Body:**
```json
{
  "content": "Güncellenmiş yorum metni"
}
```

**Authentication:** Bearer Token gerekli  
**Response:** 200 OK - Yorum başarıyla güncellendi  

---

## 2. Kullanıcı Girişi (İbrahim Mert Bozdoğan)
**Endpoint:** POST /users/login  

**Request Body:**
```json
{
  "email": "admin@test.com",
  "password": "123456"
}
```

**Response:** 200 OK - Giriş başarılı  

```json
{
  "token": "jwt_token_example",
  "user": {
    "id": "1",
    "firstName": "Admin",
    "lastName": "Hesap",
    "email": "admin@test.com",
    "role": "ADMIN"
  }
}
```

---

## 3. Profil Görüntüleme (İbrahim Mert Bozdoğan)
**Endpoint:** GET /users/{id}  
**Path Parameters:** id (string, required) - Kullanıcı ID'si  

**Authentication:** Bearer Token gerekli  
**Response:** 200 OK - Kullanıcı bilgileri getirildi  

```json
{
  "id": "1",
  "firstName": "Admin",
  "lastName": "Hesap",
  "email": "admin@test.com",
  "role": "ADMIN"
}
```

---

## 4. Oyuncuları Listeleme (İbrahim Mert Bozdoğan)
**Endpoint:** GET /players  

**Query Parameters (opsiyonel):**  
- page (number)  
- limit (number)  
- position (string)  

**Response:** 200 OK - Oyuncular listelendi  

```json
[
  {
    "id": "101",
    "name": "Lionel Messi",
    "position": "RW",
    "team": "Inter Miami"
  }
]
```

---

## 5. Oyuncu Detayı Görüntüleme (İbrahim Mert Bozdoğan)
**Endpoint:** GET /players/{playerId}  
**Path Parameters:** playerId (string, required) - Oyuncu ID'si  

**Response:** 200 OK - Oyuncu detayları getirildi  

```json
{
  "id": "101",
  "name": "Lionel Messi",
  "age": 37,
  "position": "RW",
  "team": "Inter Miami",
  "marketValue": 35000000
}
```

---

## 6. Transferleri Listeleme (İbrahim Mert Bozdoğan)
**Endpoint:** GET /transfers  

**Response:** 200 OK - Transferler listelendi  

```json
[
  {
    "player": "Kylian Mbappe",
    "from": "Monaco",
    "to": "PSG",
    "fee": 180000000,
    "date": "2018-07-01"
  }
]
```

---

## 7. Favori Takım Silme (İbrahim Mert Bozdoğan)
**Endpoint:** DELETE /users/{id}/favorites/teams/{teamId}  
**Path Parameters:**  
- id (string, required)  
- teamId (string, required)  

**Authentication:** Bearer Token gerekli  
**Response:** 204 No Content - Takım favorilerden kaldırıldı  

---

## 8. AI Transfer Uyum Tahmini (İbrahim Mert Bozdoğan)
**Endpoint:** POST /ai/transfer-predictions  

**Request Body:**
```json
{
  "playerId": "102"
}
```

**Response:** 200 OK - Transfer uyum tahmini oluşturuldu  

```json
{
  "player": "Kylian Mbappe",
  "predictedClub": "Real Madrid",
  "probability": 0.87
}
```

---

## 9. Yorum Ekleme (İbrahim Mert Bozdoğan)
**Endpoint:** POST /comments  

**Request Body:**
```json
{
  "content": "Harika bir oyuncu!",
  "playerId": "101"
}
```

**Authentication:** Bearer Token gerekli  
**Response:** 201 Created - Yorum başarıyla eklendi
