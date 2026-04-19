
1. Kullanıcı Çıkışı

API: POST /users/logout
Kullanıcının sistemdeki aktif oturumunu sonlandırmak için kullanılır. Bu işlemden sonra kullanıcı tekrar giriş yapmadan korumalı işlemlere erişemez.

2. Hesap Silme

API: DELETE /users/{id}
Belirtilen kullanıcı hesabını sistemden kalıcı olarak siler. İşlem sırasında yetkilendirme kontrolü yapılır ve kullanıcı yalnızca kendi hesabını silebilir.

3. Favori Takım Ekleme

API: POST /users/{id}/favorites/teams
Kullanıcının favori takımlar listesine yeni bir takım eklemesini sağlar. Böylece kullanıcı ilgilendiği takımları takip edebilir ve sistem bu tercihlere göre içerik sunabilir.

4. Bildirim Tercihlerini Güncelleme

API: PUT /users/{id}/notifications
Kullanıcının almak istediği bildirim türlerini belirlemesini sağlar. Kullanıcı, bildirim ayarlarını değiştirerek uygulama deneyimini kişiselleştirebilir.

5. Piyasa Değeri Görüntüleme

API: GET /players/{playerId}/market-value
Belirli bir oyuncunun güncel piyasa değerini gösterir. Bu değer, oyuncunun transfer potansiyelini ve ekonomik durumunu ifade eder.

6. Admin Paneli

API: GET /admin/users
Sistemdeki tüm kullanıcıların listelenmesini sağlar. Bu endpoint yalnızca yönetici yetkisine sahip kullanıcılar tarafından erişilebilir ve sistem yönetimi amacıyla kullanılır.

7. Takım Kadrosu Görüntüleme

API: GET /teams/{teamId}/squad
Belirli bir takıma ait oyuncuların listesini sunar. Kullanıcılar takımın kadro yapısını ve oyuncu bilgilerini inceleyebilir.

8. AI Takım Raporu

API: GET /ai/team-report/{teamId}
Yapay zekâ tarafından oluşturulan takım analizini sunar. Bu rapor, takımın performansı ile güçlü ve zayıf yönleri hakkında genel değerlendirme içerir.

9. Yorum Silme

API: DELETE /api/comments/{commentId}
Belirli bir yorumu sistemden silmek için kullanılır. Bu işlem yalnızca yorumu yapan kullanıcı veya admin tarafından gerçekleştirilebilir.

10. Yorum Listeleme

API: GET /api/comments
Sistemde bulunan yorumları listelemek için kullanılır. Gerekirse belirli içeriklere göre filtreleme yapılarak ilgili yorumlar görüntülenebilir.