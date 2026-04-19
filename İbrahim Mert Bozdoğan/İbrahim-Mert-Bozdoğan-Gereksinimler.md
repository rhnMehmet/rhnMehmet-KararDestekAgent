1 Yorum Güncelleme
Geliştirici / Sorumlu: İbrahim Mert Bozdoğan
API Metodu: PUT /comments/{commentId}
Açıklama: Kullanıcının daha önce yaptığı yorumu düzenlemesini sağlar. Güncellenen yorum içeriği doğrulandıktan sonra sistemdeki mevcut yorum verisi güncellenir ve değişiklikler anında yansıtılır.

2️⃣ Kullanıcı Girişi
Geliştirici / Sorumlu: İbrahim Mert Bozdoğan
API Metodu: POST /users/login
Açıklama: Kullanıcının e-posta ve şifre bilgileriyle sisteme giriş yapmasını sağlar. Kimlik doğrulama başarılı olursa JWT veya oturum anahtarı oluşturulur ve kullanıcıya iletilir.

3️⃣ Profil Görüntüleme
Geliştirici / Sorumlu: İbrahim Mert Bozdoğan
API Metodu: GET /users/{id}
Açıklama: Kullanıcının sistemde kayıtlı profil bilgilerinin görüntülenmesini sağlar. Yetkilendirme kontrolü yapılır ve sadece ilgili kullanıcı kendi profilini görüntüleyebilir.

4️⃣ Oyuncuları Listeleme
Geliştirici / Sorumlu: İbrahim Mert Bozdoğan
API Metodu: GET /players
Açıklama: Sistemde kayıtlı tüm oyuncuların liste halinde getirilmesini sağlar. Filtreleme ve sayfalama (pagination) desteği içerir.

5️⃣ Oyuncu Detayı Görüntüleme
Geliştirici / Sorumlu: İbrahim Mert Bozdoğan
API Metodu: GET /players/{playerId}
Açıklama: Seçilen oyuncunun yaş, pozisyon, takım, istatistik ve piyasa değeri gibi detaylı bilgilerinin görüntülenmesini sağlar.

6️⃣ Transferleri Listeleme
Geliştirici / Sorumlu: İbrahim Mert Bozdoğan
API Metodu: GET /transfers
Açıklama: Gerçekleşmiş transferlerin tarih, kulüp ve bonservis bilgileriyle birlikte listelenmesini sağlar.

7️⃣ Favori Takım Silme
Geliştirici / Sorumlu: İbrahim Mert Bozdoğan
API Metodu: DELETE /users/{id}/favorites/teams/{teamId}
Açıklama: Kullanıcının daha önce favori listesine eklediği bir takımı favorilerinden kaldırmasını sağlar. İşlem öncesinde kimlik doğrulama yapılır ve kullanıcı yalnızca kendi favori listesinden silme işlemi gerçekleştirebilir. Başarılı işlem sonrası ilgili takım kullanıcının favori listesinden çıkarılır.

8️⃣ Transfer Tahmini Oluşturma
Geliştirici / Sorumlu: İbrahim Mert Bozdoğan
API Metodu: POST /ai/transfer-predictions
Açıklama: Yapay zekâ modeli, oyuncu performans verileri, sözleşme süresi ve piyasa trendlerini analiz ederek olası transfer tahmini oluşturur. Sonuçta tahmini kulüp ve gerçekleşme olasılığı sunulur.
