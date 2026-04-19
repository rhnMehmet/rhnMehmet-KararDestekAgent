1️⃣ Kullanıcı Kaydı

API Metodu: POST /users/register

Açıklama:
Yeni kullanıcıların sisteme kayıt olmasını sağlar. Kullanıcıdan ad, soyad, e-posta ve şifre bilgileri alınır. Girilen bilgiler doğrulanır ve şifre güvenli bir şekilde hashlenerek veritabanına kaydedilir. Aynı e-posta adresiyle birden fazla kayıt oluşturulması engellenir.

2️⃣ Şifre Değiştirme

API Metodu: PUT /users/{id}/password

Açıklama:
Kullanıcının mevcut şifresini doğruladıktan sonra yeni bir şifre belirlemesini sağlar. Yeni şifre güvenlik standartlarına uygun biçimde hashlenerek veritabanında saklanır.

3️⃣ Favori Oyuncu Ekleme

API Metodu: POST /users/{id}/favorites/players

Açıklama:
Kullanıcının ilgilendiği oyuncuları favori oyuncular listesine eklemesini sağlar. Aynı oyuncunun birden fazla kez eklenmesi sistem tarafından engellenir.

4️⃣ Takımları Listeleme

API Metodu: GET /teams

Açıklama:
Sistem içerisinde kayıtlı olan tüm futbol takımlarını liste halinde getirir. İsteğe bağlı olarak lig, ülke veya sezon bazlı filtreleme yapılabilir.

5️⃣ Takım Detayı Görüntüleme

API Metodu: GET /teams/{teamId}

Açıklama:
Seçilen takımın kadro bilgileri, teknik ekip, lig sıralaması ve takım istatistikleri gibi detaylı bilgilerin görüntülenmesini sağlar.

6️⃣ Favori Oyuncu Silme

API Metodu: DELETE /users/{id}/favorites/players/{playerId}

Açıklama:
Kullanıcının daha önce favorilere eklediği bir oyuncuyu favori listesinden kaldırmasını sağlar. İşlem sırasında kullanıcı kimlik doğrulaması yapılır ve yalnızca ilgili kullanıcı kendi favori listesinden silme işlemi gerçekleştirebilir.

7️⃣ Oyuncu Transfer Geçmişi

API Metodu: GET /players/{playerId}/transfers

Açıklama:
Seçilen oyuncunun kariyeri boyunca gerçekleştirdiği transferleri, transfer tarihlerini ve bonservis bedellerini kronolojik sırayla listeler.

8️⃣ Oyuncu Değer Tahmini

API Metodu: GET /ai/player-value/{playerId}

Açıklama:
Yapay zekâ destekli analiz sistemi; oyuncunun performans istatistikleri, yaşı ve kariyer verilerini inceleyerek gelecekteki tahmini piyasa değerini hesaplar.

9️⃣ Profil Güncelleme

API Metodu: PUT /users/{id}

Açıklama:
Kullanıcının ad, soyad, e-posta ve profil bilgilerini güncellemesini sağlar. Girilen bilgiler doğrulanarak sistemdeki mevcut kullanıcı verileri güvenli şekilde güncellenir.
