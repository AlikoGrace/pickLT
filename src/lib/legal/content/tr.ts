import type { LegalContent } from '../types'

const content: LegalContent = {
  updatedLabel: 'Son güncelleme: {{date}}',
  languageNotice:
    'Bu metin size kolaylık sağlamak amacıyla hazırlanmış bir çeviridir. Dil sürümleri arasında fark olması halinde Almanca sürüm geçerlidir.',
  contentsLabel: 'İçindekiler',
  nav: {
    terms: 'Şartlar ve Koşullar',
    privacy: 'Gizlilik Politikası',
    help: 'Yardım',
    imprint: 'Künye',
  },

  // ── Terms ────────────────────────────────────────────────────────────────
  terms: {
    title: 'Şartlar ve Koşullar',
    intro: [
      'Bu şartlar, PickLte web sitesinin ve PickLte ile PickLte Mover uygulamalarının kullanımını düzenler. Nakliyeci arayan müşteriler ve taşıma hizmetlerini platform üzerinden sunan nakliyeciler için geçerlidir.',
      'Platform, künyede belirtilen şirket ("PickLte", "biz") tarafından işletilmektedir.',
    ],
    sections: [
      {
        id: 'role',
        heading: '1. PickLte nedir, ne değildir',
        paragraphs: [
          'PickLte, müşterileri bağımsız nakliyecilerle bir araya getiren çevrimiçi bir platformdur. Biz teknolojiyi sağlarız: rezervasyon süreci, fiyat hesaplaması, mesajlaşma, canlı takip ve ödeme işlemleri.',
          'Taşınma işlerini biz gerçekleştirmeyiz. Taşıyıcı veya nakliye şirketi değiliz, araç sahibi değiliz ve nakliyeciler bizim çalışanımız veya temsilcimiz değildir.',
          'Taşınma sözleşmesi, doğrudan müşteri ile talebi kabul eden nakliyeci arasında kurulur. Taşımayı yalnızca nakliyeci borçlanır ve bundan o sorumludur. Bizim kendi hizmetimiz, iletişimin kurulmasına aracılık etmek ve platformu işletmekle sınırlıdır.',
        ],
      },
      {
        id: 'scope',
        heading: '2. Neler rezerve edilebilir',
        bullets: [
          'Almanya içindeki taşınmalar. Alım ve teslim adreslerinin ikisi de Almanya\'da olmalıdır.',
          'Römork dahil, azami yüklü ağırlığı 3,5 tona kadar olan araçlarla taşıma.',
          'Ev eşyalarının, mobilyaların ve diğer eşyaların yüklenmesi, taşınması ve boşaltılması; müşteri seçerse nakliyeci tarafından paketleme ile birlikte.',
        ],
        after: [
          'Atık bertarafı, mobilya kurulumu, montaj işleri, cihaz bağlantısı, temizlik ve depolama platform üzerinden sunulmaz.',
        ],
      },
      {
        id: 'account',
        heading: '3. Hesabınız',
        bullets: [
          'Bir taşınmayı rezerve etmek veya kabul etmek için bir hesaba ihtiyacınız vardır. En az 18 yaşında olmanız gerekir.',
          'Her hesap ya müşteri hesabı ya da nakliyeci hesabıdır. Tek bir hesap her iki rolde kullanılamaz.',
          'Verdiğiniz bilgiler doğru olmalı ve güncel tutulmalıdır. E-posta adresinizi ve istendiği durumlarda telefon numaranızı doğrularız.',
          'Giriş bilgilerinizi gizli tutun. Kusurunuz bulunmadığı haller dışında, hesabınız üzerinden gerçekleşen işlemlerden siz sorumlusunuz.',
        ],
      },
      {
        id: 'movers',
        heading: '4. Nakliyeciler',
        paragraphs: [
          'Nakliyeciler platformu bağımsız işletmeler olarak, kendi adlarına ve kendi hesaplarına kullanır. Ne zaman müsait olacaklarına ve hangi talepleri kabul edeceklerine serbestçe karar verirler. Başka müşteriler için ve başka platformlar üzerinden çalışabilirler.',
          'Bir nakliyeci talep alabilmeden önce, kayıt sırasında verilen bilgileri kontrol ederiz: kişinin fotoğrafı, sürücü belgesi, vergi bilgileri ve azami yüklü ağırlığıyla birlikte araç. Kiralık araç için kiralama süresini sorarız.',
          'Her nakliyeci şunlardan sorumludur:',
        ],
        bullets: [
          'işletme kaydı ve işinin gerektirdiği her türlü izin,',
          'vergileri ve sosyal güvenlik primleri,',
          'aracının ve işinin sigortası,',
          'aracın yola elverişliliği ile 3,5 ton sınırı dahil karayolu ve taşıma mevzuatına uyum,',
          'bir taşınmada kendisine yardım eden kişiler.',
        ],
        after: [
          'Yaptığımız kontrol, sunulan belgelerin makul görünüp görünmediğine ilişkin bir kontroldür. Bir nakliyecinin veya belirli bir taşınmanın kalitesine dair bir garanti değildir.',
        ],
      },
      {
        id: 'booking',
        heading: '5. Rezervasyon nasıl oluşur',
        paragraphs: [
          'Müşteri taşınmayı tarif eder: adresler, tarih, eşyalar, her iki adresteki erişim, yardımcılar ve paketleme; yararlı olduğu yerde fotoğraflarla birlikte. Rezervasyon yapmanın iki yolu vardır.',
        ],
        bullets: [
          'Anlık taşınma: talep, yakındaki ve şu anda müsait olan bir nakliyeciye gider. Nakliyecinin kabul etmek için sınırlı bir süresi vardır. Kabul etmezse talep başka nakliyecilere sunulabilir.',
          'Planlı taşınma: ileri bir tarih için yapılan talep nakliyecilere görünür kılınır ve içlerinden biri talebi kabul eder.',
        ],
        after: [
          'Talep, müşterinin gösterilen fiyat üzerinden taşınma sözleşmesi kurma teklifidir. Müşteri ile nakliyeci arasındaki sözleşme, bir nakliyeci talebi uygulamada kabul ettiğinde kurulur. Her iki taraf da uygulamada bilgilendirilir.',
          'Bir talep için nakliyeci bulunmasına ilişkin bir hak bulunmamaktadır.',
        ],
      },
      {
        id: 'price',
        heading: '6. Fiyat',
        paragraphs: [
          'Müşteri bir talep göndermeden önce platform taşınmanın fiyatını gösterir. Fiyat, müşterinin verdiği bilgilere göre hesaplanır: mesafe, araç büyüklüğü, eşyaların hacmi ve ağırlığı, yardımcı sayısı, katlar ve erişim, paketleme ve taşınmanın anlık mı planlı mı olduğu. Fiyata, uygulandığı durumlarda yasal KDV ve platform ücreti dahildir.',
          'Fiyat, müşterinin verdiği bilgilere dayanır. Eşyalar veya yerindeki koşullar beyan edilenden önemli ölçüde farklıysa, nakliyeci taşınmayı rezerve edildiği şekliyle gerçekleştirmeyi reddedebilir.',
        ],
      },
      {
        id: 'payment',
        heading: '7. Ödeme ve platform ücreti',
        bullets: [
          'Müşteri, taşınma tamamlandıktan sonra nakliyeciye ödeme yapar: uygulamada kartla veya nakliyeciye nakit olarak.',
          'Kart ödemeleri, ödeme hizmeti sağlayıcımız Stripe tarafından işlenir. Kart numaralarını saklamayız.',
          'Taşınmaya aracılık etmemiz karşılığında nakliyeciden bir platform ücreti alırız. Bu ücret fiyatın bir payıdır ve nakliyeciye kabul etmeden önce gösterilir.',
          'Kartla ödemede ücret, tutar nakliyeciye ödenmeden önce kesilir. Nakit ödemede nakliyeci bize ücreti borçlanır ve taşınmadan sonra 24 saat içinde ödemek zorundadır. Vadesi geçmiş bir ücret bulunduğu sürece nakliyeci yeni talep almaz.',
        ],
      },
      {
        id: 'cancellation',
        heading: '8. Değişiklikler ve iptal',
        paragraphs: [
          'Müşteri, taşınma başlamadığı sürece talebi uygulamada iptal edebilir. Nakliyeci, kabul ettiği bir taşınmayı geri verebilir; bu durumda talep başka nakliyecilere sunulabilir.',
          'İptal için ücret almayız. Geç iptal nedeniyle müşteri ile nakliyecinin birbirlerine karşı sahip olabilecekleri talepler, aralarındaki sözleşmeye ve kanuna tabidir.',
          'Tüketicilerin yasal cayma hakları saklıdır.',
        ],
      },
      {
        id: 'performance',
        heading: '9. Taşınmanın gerçekleştirilmesi, hasar ve şikayetler',
        paragraphs: [
          'Nakliyeci taşınmayı kendi sorumluluğu altında gerçekleştirir. Taşınmadan doğan talepler, özellikle eşyanın hasar görmesi veya kaybolması, gecikme ya da gerçekleşmeyen bir taşınma nedeniyle doğan talepler, sözleşme ve taşıma hukuku uyarınca nakliyeciye karşı ileri sürülecek taleplerdir.',
          'Lütfen hasarı hemen fotoğraflarla kayda geçirin ve sohbet üzerinden nakliyeciye bildirin. İki taraf arasındaki iletişime yardımcı oluruz ve bir talebin takibi için gereken bilgileri iletebiliriz; ancak uyuşmazlıklar hakkında karar vermeyiz ve bir nakliyeci adına tazminat ödemeyiz.',
        ],
      },
      {
        id: 'conduct',
        heading: '10. Kullanım kuralları',
        bullets: [
          'Taşınma ve kendiniz hakkında eksiksiz ve dürüst bilgi verin.',
          'Tehlikeli maddelerin, hukuka uygun biçimde taşınamayacak eşyaların veya bertaraf edilecek atıkların taşınmasını rezerve etmeyin.',
          'Birbirinize saygılı davranın. Tehdit, ayrımcılık ve taciz platformdan çıkarılmaya yol açar.',
          'Değerlendirmeler, gerçekleşmiş bir taşınmaya ilişkin kendi deneyiminizi yansıtmalıdır.',
          'Platformun işleyişine müdahale etmeyin, verilerini otomatik yöntemlerle çekmeyin ve başka bir kişinin hesabını kullanmayın.',
        ],
      },
      {
        id: 'ranking',
        heading: '11. Nakliyeciler müşterilere nasıl gösterilir',
        paragraphs: [
          'Bir müşteri nakliyeci aradığında platform, doğrulanmış, çevrimiçi olan, başka bir işte bulunmayan ve aracı yüke uygun olan nakliyecileri dikkate alır. Bunlar arasında temel ölçüt alım adresine olan mesafedir: en yakın nakliyeci ilk sırada gösterilir.',
          'Nakliyeciler daha iyi bir sıra için ödeme yapamaz.',
        ],
      },
      {
        id: 'liability',
        heading: '12. Sorumluluğumuz',
        paragraphs: [
          'Kast ve ağır ihmal hallerinde, yaşama, vücut bütünlüğüne veya sağlığa verilen zararlarda ve kanunun hariç tutulamayan bir sorumluluk öngördüğü durumlarda sınırsız olarak sorumluyuz.',
          'Hafif ihmal hallerinde yalnızca bizimle yapılan sözleşme bakımından esaslı olan bir yükümlülüğün ihlalinden ve bu durumda da yalnızca bu tür bir sözleşme için tipik olan öngörülebilir zarardan sorumluyuz.',
          'Taşınmanın ifasından veya müşteriler ile nakliyecilerin birbirlerine karşı davranışlarından sorumlu değiliz, çünkü aralarındaki sözleşmenin tarafı değiliz. Platformun kesintisiz olarak kullanılabilir olacağını taahhüt etmeyiz.',
        ],
      },
      {
        id: 'termination',
        heading: '13. Kullanımın sona ermesi, askıya alma',
        paragraphs: [
          'Hesabınızı istediğiniz zaman uygulamada veya web sitesinde silebilirsiniz. Bu, devam eden veya rezerve edilmiş bir taşınma bulunmadığında ve nakliyeciler bakımından ödenmemiş platform ücreti ile bekleyen bir ödeme aktarımı olmadığında mümkündür.',
          'Ciddi bir neden varsa, özellikle yanlış bilgi veya belgeler, bu şartların ihlali, ödenmemiş bir platform ücreti veya diğer kullanıcılar için bir risk söz konusuysa, bir hesabı kısıtlayabilir veya askıya alabiliriz. Kullanıcıya gerekçeleri bildiririz. Nakliyeciler künyedeki iletişim bilgileri üzerinden itiraz edebilir; her şikayeti inceler ve yanıtlarız.',
          'Bir nakliyeciyle olan sözleşmeyi 30 gün önceden bildirimde bulunarak sona erdirebiliriz. Haklı nedenle bildirim süresi olmaksızın sona erdirme hakkı saklıdır.',
        ],
      },
      {
        id: 'changes',
        heading: '14. Bu şartlardaki değişiklikler',
        paragraphs: [
          'Kanunda veya platformda bir değişiklik gibi geçerli bir neden varsa, bu şartları ileriye dönük olarak değiştirebiliriz. Değişiklikleri, yürürlüğe girmelerinden en az 30 gün önce e-postayla veya uygulamada duyururuz. Kabul etmiyorsanız hesabınızı o tarihten önce silebilirsiniz.',
        ],
      },
      {
        id: 'law',
        heading: '15. Uygulanacak hukuk ve uyuşmazlıklar',
        paragraphs: [
          'Alman hukuku uygulanır. Tüketiciler ayrıca mutat meskenlerinin bulunduğu ülkenin emredici kurallarının sağladığı korumadan yararlanmaya devam eder.',
          'Bir tüketici hakem kurulu önündeki uyuşmazlık çözüm usulüne katılmakla yükümlü değiliz ve buna istekli de değiliz.',
          'Bu şartların bir hükmünün geçersiz olması halinde kalan hükümler yürürlükte kalır.',
        ],
      },
    ],
  },

  // ── Privacy ──────────────────────────────────────────────────────────────
  privacy: {
    title: 'Gizlilik Politikası',
    intro: [
      'Bu politika, PickLte web sitesini ve PickLte ile PickLte Mover uygulamalarını kullandığınızda hangi kişisel verilerin hangi amaçla işlendiğini ve hangi haklara sahip olduğunuzu açıklar.',
    ],
    sections: [
      {
        id: 'controller',
        heading: '1. Sorumlu kim',
        paragraphs: [
          'Genel Veri Koruma Tüzüğü (GDPR) anlamında veri sorumlusu, künyede belirtilen şirkettir. Gizlilikle ilgili her konuda orada verilen iletişim bilgileri üzerinden bize ulaşabilirsiniz.',
        ],
      },
      {
        id: 'data',
        heading: '2. Hangi verileri işliyoruz',
        bullets: [
          'Hesap: ad, e-posta adresi, telefon numarası, profil fotoğrafı, dil ve müşteri mi nakliyeci mi olduğunuz. Google ile giriş yaparsanız Google\'dan adınızı, e-posta adresinizi ve profil resminizi alırız.',
          'Taşınmalar: alım ve teslim adresleri, tarih ve saat, eşya listesi, erişim ve katlara ilişkin bilgiler, notlar, eşyaların fotoğrafları, ticari bir taşınmada şirket adı, taşınmanın fiyatı ve durumu.',
          'Nakliyeciler için ayrıca: kendi fotoğrafınız, sürücü belgenizin fotoğrafı, adresiniz ve vergi bilgileriniz, plakası, azami yüklü ağırlığı ve fotoğraflarıyla araçlarınız, kiralama süreleri, ekibinizdeki kişiler, kazançlarınız ve platform ücretleri.',
          'Konum: bkz. bölüm 4.',
          'İletişim: bir taşınmaya ilişkin müşteri ile nakliyeci arasındaki sohbet mesajları ve uygulama içi aramalarda kimin kimi, ne zaman ve ne kadar süreyle aradığı. Aramalar kaydedilmez.',
          'Ödeme: bir ödemenin tutarı, zamanı, yöntemi ve durumu. Kart bilgileri doğrudan ödeme hizmeti sağlayıcısına gider ve tarafımızca saklanmaz.',
          'Cihaz ve kullanım: cihazınızın anlık bildirim belirteci (token), uygulama sürümü, işletim sistemi ve bir isteğin IP adresi ile zamanını içeren teknik kayıtlar.',
          'Verdiğiniz veya aldığınız değerlendirmeler.',
        ],
      },
      {
        id: 'purposes',
        heading: '3. Verileri neden ve hangi hukuki dayanakla işliyoruz',
        bullets: [
          'Hesabınızı yönetmek ve müşteriler ile nakliyeciler arasındaki taşınmalara aracılık edip bunları yürütmek için: bir sözleşmenin ifası, GDPR madde 6(1)(b).',
          'Nakliyecilerin belgelerini kabul edilmelerinden önce kontrol etmek, kötüye kullanımı ve dolandırıcılığı önlemek, platformu güvenli tutmak ve hataları bulup gidermek için: güvenli ve çalışan bir platforma ilişkin meşru menfaatimiz, GDPR madde 6(1)(f).',
          'Nakliyecilerin gelirlerinin Platform Vergi Şeffaflığı Kanunu (DAC7) uyarınca vergi idaresine bildirilmesi dahil, vergi ve ticaret hukukundan doğan yükümlülükleri yerine getirmek için: hukuki yükümlülük, GDPR madde 6(1)(c).',
          'Cihazınızın konumunu, kamerasını, fotoğraf arşivini ve bildirimlerini kullanmak için: cihazınızın ayarlarından verdiğiniz veya geri aldığınız rızanız, GDPR madde 6(1)(a).',
        ],
      },
      {
        id: 'location',
        heading: '4. Konum',
        paragraphs: [
          'Bir nakliyecinin konumu yalnızca nakliyeci çevrimiçiyken veya bir işteyken kaydedilir. Müşteri bir nakliyecinin konumunu yalnızca kendi taşınması için ve o taşınma devam ederken görür. Bundan önce, nakliyeci arayan müşteriler yalnızca yaklaşık konumları görür.',
          'Nakliyeci çevrimdışı olduğunda ve bir işte olmadığında, saklanan konum silinir. Güzergah geçmişi tutulmaz.',
          'Müşteriler, alım adresini doldurmak için uygulamanın konumlarını kullanmasına izin verebilir. Bu isteğe bağlıdır.',
        ],
      },
      {
        id: 'photos',
        heading: '5. Fotoğraflar ve belgeler',
        paragraphs: [
          'Bir taşınmanın fotoğraflarını yalnızca müşteri, taşınmayı kabul eden nakliyeci ve açık talebin gösterildiği nakliyeciler görüntüleyebilir. Fotoğraflar, kısa süre sonra geçerliliğini yitiren bağlantılar üzerinden iletilir.',
          'Nakliyecilerin sürücü belgelerini ve diğer belgelerini yalnızca nakliyecinin kendisi ve bunları inceleyen personel görüntüleyebilir.',
        ],
      },
      {
        id: 'recipients',
        heading: '6. Verileri kimler alır',
        paragraphs: [
          'Bir taşınmanın diğer tarafı, taşınmanın gerçekleştirilmesi için gerekli olanı alır. Müşteri nakliyecinin adını, fotoğrafını, aracını ve değerlendirmelerini, taşınma sırasında da nakliyecinin konumunu görür. Nakliyeci müşterinin adını, adresleri, eşyaları ve fotoğrafları görür. Telefon numaraları yalnızca kabul edilmiş bir taşınma için gerekli olduğunda iletilir; aramalar uygulama içinde numara açıklanmadan yapılabilir.',
          'Verileri bizim adımıza ve sözleşmeye dayalı olarak işleyen hizmet sağlayıcılardan yararlanırız:',
        ],
        bullets: [
          'Appwrite: veritabanı, dosya depolama, giriş ve bildirimlerin iletilmesi; Almanya, Frankfurt\'ta barındırılır.',
          'Vercel: web sitesinin barındırılması.',
          'Stripe: ödeme işlemleri ve ödeme aktarımları. Stripe, bu işlemenin bir bölümü bakımından kendisi veri sorumlusudur.',
          'Mapbox: haritalar, adres arama ve rota hesaplama.',
          'Google: Google ile giriş ve anlık bildirimlerin iletilmesi (Firebase Cloud Messaging).',
          'LiveKit: uygulama içi aramaların iletimi.',
          'Sentry: AB\'de saklanan ve gönderilmeden önce kişisel bilgilerden arındırılan hata raporları.',
        ],
        after: [
          'Kanunun gerektirdiği durumlarda verileri makamlara iletiriz; özellikle nakliyecilerin gelir verilerini Federal Merkezi Vergi Dairesi\'ne.',
          'Bu sağlayıcılardan bazıları Amerika Birleşik Devletleri\'nde yerleşiktir veya verileri orada işleyebilir. Bu durumda aktarım, AB-ABD Veri Gizliliği Çerçevesi\'ne (Data Privacy Framework) veya Avrupa Komisyonu\'nun standart sözleşme maddelerine dayanır.',
          'Kişisel verileri satmayız ve üçüncü tarafların reklamları için kullanmayız.',
        ],
      },
      {
        id: 'cookies',
        heading: '7. Web sitesinde çerezler ve yerel depolama',
        bullets: [
          'Bir oturum çerezi oturumunuzu açık tutar.',
          'Bir dil çerezi seçtiğiniz dili hatırlar.',
          'Tarayıcının yerel depolaması, başladığınız bir rezervasyonu sayfayı yeniden yüklediğinizde kaybolmaması için saklar.',
        ],
        after: [
          'Bunlar web sitesinin çalışması için zorunludur. Web sitesi reklam çerezi kullanmaz ve ziyaretçileri web siteleri arasında izleyen analiz araçları kullanmaz. Sentry ile yapılan hata izleme teknik hataları kaydeder.',
        ],
      },
      {
        id: 'retention',
        heading: '8. Verileri ne kadar süre saklıyoruz',
        bullets: [
          'Hesap verileri: hesap var olduğu sürece.',
          'Hesabınızı sildikten sonra: profiliniz, fotoğraflarınız, belgeleriniz, adresleriniz, mesajlarınız ve cihaz verileriniz silinir veya anonim hale getirilir. Tamamlanmış taşınmalar, adınız olmaksızın anonim kayıtlar olarak kalır.',
          'Faturalar, ödeme kayıtları ve nakliyecilerin kimlik ve vergi bilgileri gibi, vergi ve ticaret hukukunun saklamamızı zorunlu kıldığı veriler: on yıla kadar, kısıtlı erişimle ayrı olarak saklanır, ardından silinir.',
          'Teknik kayıtlar: güvenlik ve sorun giderme için gerektiği ölçüde, kısa bir süre boyunca.',
        ],
      },
      {
        id: 'rights',
        heading: '9. Haklarınız',
        paragraphs: ['GDPR uyarınca şu haklara sahipsiniz:'],
        bullets: [
          'verileriniz hakkında bilgi ve bunların bir kopyasını almak,',
          'yanlış verilerin düzeltilmesini sağlamak,',
          'verilerin silinmesini veya işlenmesinin kısıtlanmasını sağlamak,',
          'sağladığınız verileri taşınabilir bir biçimde almak,',
          'meşru menfaatlerimize dayanan işlemeye itiraz etmek,',
          'verdiğiniz bir rızayı ileriye dönük olarak istediğiniz zaman geri almak.',
        ],
        after: [
          'Bir hakkınızı kullanmak için künyedeki iletişim bilgilerine yazın. Ayrıca bir veri koruma denetim makamına, özellikle ikamet ettiğiniz yerdeki makama şikayette bulunma hakkına sahipsiniz.',
        ],
      },
      {
        id: 'deletion',
        heading: '10. Hesabınızı silme',
        paragraphs: [
          'Hesabınızı kendiniz silebilirsiniz: uygulamalarda Profil altında, web sitesinde hesap ayarlarınızda. Güvenlik nedeniyle, bundan kısa süre önce yeniden giriş yapmanız istenir. Silme, devam eden veya rezerve edilmiş bir taşınma bulunmadığında ve nakliyeciler bakımından ödenmemiş platform ücreti ile bekleyen bir ödeme aktarımı olmadığında mümkündür.',
        ],
      },
      {
        id: 'security',
        heading: '11. Güvenlik',
        paragraphs: [
          'Veriler şifrelenmiş olarak iletilir. Verilere erişim role göre sınırlandırılmıştır: her kullanıcı yalnızca kendi verilerine ve yer aldığı taşınmalara erişir. Personelin erişimi görevin gerektirdiğiyle sınırlıdır ve kayıt altına alınır.',
        ],
      },
      {
        id: 'automated',
        heading: '12. Otomatik işleme',
        paragraphs: [
          'Bir taşınmanın fiyatı ve bir talep için gösterilen nakliyecilerin seçimi, taşınmanın bilgilerine göre otomatik olarak hesaplanır. Sizin üzerinizde hukuki sonuç doğuran hiçbir karar yalnızca otomatik yollarla alınmaz. Bir nakliyecinin kabulüne bir insan karar verir.',
          'Platform 18 yaşından küçük kişilere yönelik değildir.',
        ],
      },
      {
        id: 'changes',
        heading: '13. Bu politikadaki değişiklikler',
        paragraphs: [
          'Platform veya kanun değiştiğinde bu politikayı güncelleriz. Güncel sürüme her zaman bu sayfadan ulaşılabilir.',
        ],
      },
    ],
  },

  // ── Help ─────────────────────────────────────────────────────────────────
  help: {
    title: 'Yardım',
    intro: [
      'Taşınma rezervasyonu ve PickLte\'de nakliyeci olarak çalışma hakkında en sık sorulan soruların yanıtları.',
    ],
    groups: [
      {
        id: 'about',
        heading: 'PickLte hakkında',
        topics: [
          {
            id: 'what',
            question: 'PickLte nedir?',
            answer: [
              'PickLte, taşınmaya ihtiyacı olan kişileri bağımsız nakliyecilerle buluşturan bir platformdur. Taşınmayı tarif edersiniz, fiyatı görürsünüz ve bir nakliyeci talebi kabul eder.',
            ],
          },
          {
            id: 'who',
            question: 'Taşınmamı kim gerçekleştirir?',
            answer: [
              'PickLte değil, bağımsız bir nakliyeci. Taşınma sözleşmeniz, talebinizi kabul eden nakliyeciyle kurulur. PickLte iletişimin kurulmasına aracılık eder ve rezervasyon, takip ve ödeme imkanlarını sağlar.',
            ],
          },
          {
            id: 'where',
            question: 'PickLte nerede kullanılabilir?',
            answer: [
              'Almanya\'da, Almanya\'da başlayıp Almanya\'da biten taşınmalar için. Nakliyeciler 3,5 tona kadar panelvan ve küçük kamyonlar kullanır.',
            ],
          },
        ],
      },
      {
        id: 'booking',
        heading: 'Rezervasyon',
        topics: [
          {
            id: 'types',
            question: 'Anlık taşınma ile planlı taşınma arasındaki fark nedir?',
            answer: [
              'Anlık taşınma hemen şimdi içindir: talep, alım adresinin yakınındaki müsait bir nakliyeciye gider. Planlı taşınma sizin seçtiğiniz bir tarih ve saat içindir; nakliyeciler talebi görür ve içlerinden biri kabul eder.',
            ],
          },
          {
            id: 'price',
            question: 'Fiyat nasıl hesaplanır?',
            answer: [
              'Girdiğiniz bilgilere göre: mesafe, gereken araç büyüklüğü, eşyalarınızın hacmi ve ağırlığı, yardımcı sayısı, katlar ve asansör ile paketleme. Talebi göndermeden önce KDV dahil tam fiyatı görürsünüz.',
            ],
          },
          {
            id: 'items',
            question: 'Neleri taşıtabilirim?',
            answer: [
              'Ev eşyaları, mobilyalar, koliler ve diğer eşyalar. Mümkün olmayanlar: tehlikeli maddeler, hukuka uygun biçimde taşınamayacak eşyalar ve bertaraf edilecek atıklar.',
            ],
          },
          {
            id: 'extras',
            question: 'Paketleme veya ek yardımcı rezerve edebilir miyim?',
            answer: [
              'Evet. Planlı bir taşınmada paketleme düzeyi seçebilir ve yardımcı ekleyebilirsiniz. Mobilya kurulumu, montaj, cihaz bağlantısı, temizlik veya depolama gibi diğer işler PickLte üzerinden rezerve edilemez.',
            ],
          },
          {
            id: 'photos',
            question: 'Neden fotoğraf eklemeliyim?',
            answer: [
              'Fotoğraflar nakliyecinin yükü değerlendirmesine ve doğru araçla gelmesine yardımcı olur. Bunları yalnızca siz, taşınmanızın nakliyecisi ve açık talebinizin gösterildiği nakliyeciler görebilir.',
            ],
          },
        ],
      },
      {
        id: 'payment',
        heading: 'Ödeme',
        topics: [
          {
            id: 'how',
            question: 'Nasıl ve ne zaman ödeme yaparım?',
            answer: [
              'Taşınma tamamlandıktan sonra, uygulamada kartla veya nakliyeciye nakit olarak. Yöntemi rezervasyon sırasında seçersiniz.',
            ],
          },
          {
            id: 'fees',
            question: 'Ek ücretler var mı?',
            answer: [
              'Hayır. Rezervasyondan önce gösterilen fiyata KDV ve platform ücreti zaten dahildir. Uygulama üzerinden iptal etmek ücretsizdir.',
            ],
          },
        ],
      },
      {
        id: 'during',
        heading: 'Taşınma sırasında',
        topics: [
          {
            id: 'track',
            question: 'Nakliyecinin nerede olduğunu görebilir miyim?',
            answer: [
              'Evet. Nakliyeci size doğru yola çıktığında, taşınma bitene kadar onu haritada takip edebilirsiniz.',
            ],
          },
          {
            id: 'contact',
            question: 'Nakliyeciye nasıl ulaşırım?',
            answer: [
              'Taşınmanızın sayfasındaki sohbet veya uygulama içi arama üzerinden. Telefon numarası paylaşmanız gerekmez.',
            ],
          },
          {
            id: 'cancel',
            question: 'Nasıl iptal ederim?',
            answer: [
              'Taşınmayı açın ve İptal\'i seçin. Bu, taşınma başlayana kadar mümkündür. Nakliyeciye karşı hakkaniyet gereği lütfen mümkün olduğunca erken iptal edin.',
            ],
          },
          {
            id: 'damage',
            question: 'Bir şey hasar gördü. Ne yapmalıyım?',
            answer: [
              'Hemen fotoğraf çekin ve sohbet üzerinden nakliyeciye bildirin. Taşımadan nakliyeci sorumludur, dolayısıyla talebiniz nakliyeciye karşıdır. Anlaşmaya varamazsanız künyedeki iletişim bilgileri üzerinden bize yazın, iletişimde yardımcı oluruz.',
            ],
          },
        ],
      },
      {
        id: 'account',
        heading: 'Hesap',
        topics: [
          {
            id: 'password',
            question: 'Şifremi unuttum.',
            answer: [
              'Giriş sayfasında "Şifremi unuttum" seçeneğini seçin. Yeni bir şifre belirlemek için e-postayla bir kod alırsınız.',
            ],
          },
          {
            id: 'language',
            question: 'Dili nasıl değiştiririm?',
            answer: [
              'Web sitesinde sayfanın üst kısmındaki dil menüsünden, uygulamalarda Profil altından. Sekiz dil mevcuttur.',
            ],
          },
          {
            id: 'delete',
            question: 'Hesabımı nasıl silerim?',
            answer: [
              'Uygulamalarda Profil altında, web sitesinde hesap ayarlarınızda. Önce yeniden giriş yapmanız istenir. Silme, devam eden veya rezerve edilmiş bir taşınmanız olmadığında mümkündür. Kişisel verileriniz bunun ardından silinir veya anonim hale getirilir; ayrıntılar gizlilik politikasında yer alır.',
            ],
          },
        ],
      },
      {
        id: 'movers',
        heading: 'Nakliyeciler için',
        topics: [
          {
            id: 'register',
            question: 'PickLte\'de nasıl nakliyeci olurum?',
            answer: [
              'PickLte Mover uygulamasında veya web sitesinde kaydolun, profilinizi tamamlayın ve aracınızı ekleyin. Kendi fotoğrafınıza, sürücü belgenize, vergi bilgilerinize ve aracınızın tescil bilgilerine ihtiyacınız vardır. Bilgileriniz kontrol edildikten sonra çevrimiçi olabilirsiniz.',
            ],
          },
          {
            id: 'independent',
            question: 'PickLte\'nin çalışanı mıyım?',
            answer: [
              'Hayır. Bağımsız bir işletme olarak çalışırsınız. Ne zaman çevrimiçi olacağınıza ve hangi talepleri kabul edeceğinize siz karar verirsiniz; işletme kaydınızdan, vergilerinizden ve sigortanızdan siz sorumlusunuz.',
            ],
          },
          {
            id: 'vehicle',
            question: 'Hangi araçlara izin verilir?',
            answer: [
              'Römork dahil, azami yüklü ağırlığı 3,5 tona kadar olan araçlar. Hem kendi aracınız hem de kiralık araç mümkündür; kiralık araç için kiralama süresini girersiniz.',
            ],
          },
          {
            id: 'location',
            question: 'Konumum ne zaman paylaşılır?',
            answer: [
              'Yalnızca çevrimiçiyken veya bir işteyken. Bir taşınmanın müşterisi, konumunuzu o taşınma sırasında görür. Çevrimdışı olduğunuzda ve bir işiniz olmadığında konumunuz silinir.',
            ],
          },
          {
            id: 'earnings',
            question: 'Ne kadar kazanırım ve platform ücreti nedir?',
            answer: [
              'Her talep, siz kabul etmeden önce, KDV ve platform ücreti düşüldükten sonra ne kazanacağınızı gösterir. Kartla ödemede ücret, size yapılacak ödeme aktarımından kesilir. Nakit ödemede tutarın tamamını tahsil eder ve ücreti 24 saat içinde PickLte\'ye ödersiniz; ödenene kadar yeni talep almazsınız.',
            ],
          },
          {
            id: 'tax',
            question: 'PickLte gelirimi bildirir mi?',
            answer: [
              'Evet, kanunun gerektirdiği durumlarda. Platform işletmecileri satıcıların gelirlerini vergi idaresine bildirmek zorundadır (DAC7). Vergi dökümlerinizi uygulamadan indirebilirsiniz.',
            ],
          },
        ],
      },
    ],
  },

  // ── Imprint ──────────────────────────────────────────────────────────────
  imprint: {
    title: 'Künye',
    intro: ['Alman Dijital Hizmetler Kanunu\'nun (DDG) 5. maddesi uyarınca bilgiler.'],
    labels: {
      provider: 'Sağlayıcı',
      address: 'Adres',
      representedBy: 'Temsil eden',
      contact: 'İletişim',
      email: 'E-posta',
      phone: 'Telefon',
      register: 'Ticaret sicili',
      vatId: 'KDV kimlik numarası',
      responsibleForContent: 'İçerikten sorumlu',
    },
    sections: [
      {
        id: 'role',
        heading: 'Platformun rolü',
        paragraphs: [
          'PickLte bir aracılık platformudur. Taşınmalar, bağımsız nakliyeciler tarafından kendi adlarına ve kendi sorumlulukları altında gerçekleştirilir. Burada belirtilen sağlayıcı taşıyıcı değildir ve taşınma sözleşmesinin tarafı değildir.',
        ],
      },
      {
        id: 'disputes',
        heading: 'Tüketici uyuşmazlıklarının çözümü',
        paragraphs: [
          'Bir tüketici hakem kurulu önündeki uyuşmazlık çözüm usulüne katılmakla yükümlü değiliz ve buna istekli de değiliz.',
        ],
      },
      {
        id: 'content',
        heading: 'İçeriğe ilişkin sorumluluk',
        paragraphs: [
          'Bu sayfalardaki kendi içeriklerimizden genel kanunlar uyarınca sorumluyuz. Kullanıcıların ilettiği veya sakladığı bilgileri izlemekle ya da hukuka aykırı bir faaliyete işaret eden koşulları araştırmakla yükümlü değiliz. Somut bir ihlalden haberdar olduğumuzda içeriği gecikmeksizin kaldırırız.',
        ],
      },
      {
        id: 'links',
        heading: 'Bağlantılara ilişkin sorumluluk',
        paragraphs: [
          'Bu sayfalar üçüncü tarafların web sitelerine bağlantı verebilir. Bu web sitelerinin içeriğinden yalnızca işletmecileri sorumludur. Bir ihlalden haberdar olursak bağlantıyı kaldırırız.',
        ],
      },
      {
        id: 'copyright',
        heading: 'Telif hakkı',
        paragraphs: [
          'Bu sayfalardaki içerikler ve eserler telif hakkıyla korunmaktadır. Bunların telif hukukunun izin verdiği ölçünün ötesinde kopyalanması, işlenmesi veya dağıtılması yazılı iznimizi gerektirir.',
        ],
      },
    ],
  },
}

export default content
