# Regenerates demo/eg and demo/sa from one place: python3 packages/client-template/demo/generate.py
import json, os
ROOT=os.path.dirname(os.path.abspath(__file__))
def img(n): return f"/uploads/demo-{n}.jpg"

SIZE_EG=lambda s,m,l:[{"id":"size","name":"الحجم","nameEn":"Size","required":True,"priceMode":"replace","values":[
  {"id":"s","name":"صغير","nameEn":"Small","price":s},{"id":"m","name":"وسط","nameEn":"Medium","price":m},{"id":"l","name":"كبير","nameEn":"Large","price":l}]}]
def MILK(cur_oat):
  return {"id":"milk","name":"نوع اللبن","nameEn":"Milk","required":False,"priceMode":"delta","values":[
  {"id":"full","name":"لبن كامل الدسم","nameEn":"Whole milk","price":0},{"id":"skim","name":"لبن خالي الدسم","nameEn":"Skimmed","price":0},{"id":"oat","name":"لبن الشوفان","nameEn":"Oat milk","price":cur_oat}]}
SHOT=lambda p:{"id":"shot","name":"إضافات","nameEn":"Extras","required":False,"priceMode":"delta","values":[{"id":"none","name":"بدون","nameEn":"None","price":0},{"id":"shot","name":"شوت إسبريسو زيادة","nameEn":"Extra espresso shot","price":p}]}

cats=[
 {"id":"cat-drinks","name":"المشروبات","nameEn":"Drinks","parentId":None,"sortOrder":1,"active":True},
 {"id":"cat-hot","name":"قهوة ومشروبات ساخنة","nameEn":"Coffee & hot drinks","parentId":"cat-drinks","sortOrder":1,"active":True},
 {"id":"cat-cold","name":"مشروبات باردة","nameEn":"Cold drinks","parentId":"cat-drinks","sortOrder":2,"active":True},
 {"id":"cat-food","name":"الأكل","nameEn":"Food","parentId":None,"sortOrder":2,"active":True},
 {"id":"cat-breakfast","name":"الفطار","nameEn":"Breakfast","parentId":"cat-food","sortOrder":1,"active":True},
 {"id":"cat-mains","name":"ساندوتشات وأطباق","nameEn":"Sandwiches & mains","parentId":"cat-food","sortOrder":2,"active":True},
 {"id":"cat-sweets","name":"الحلويات","nameEn":"Desserts","parentId":"cat-food","sortOrder":3,"active":True},
]

def P(id,cat,ar,en,dar,den,price,image,featured=False,order=0,**kw):
  d={"id":id,"categoryId":cat,"name":ar,"nameEn":en,"description":dar,"descriptionEn":den,"price":price,"image":img(image),"available":True,"featured":featured,"sortOrder":order}
  d.update(kw); return d

eg=[
 P("p1","cat-hot","إسبريسو","Espresso","دبل شوت من بن أرابيكا محمّص طازة كل أسبوع","Double shot of Arabica, roasted fresh every week",70,"espresso",order=1),
 P("p2","cat-hot","كابتشينو","Cappuccino","إسبريسو ورغوة لبن ناعمة، متقدّم سخن على طول","Espresso with silky milk foam",85,"cappuccino",True,2,optionGroups=SIZE_EG(85,100,115)+[MILK(25),SHOT(25)]),
 P("p5","cat-hot","لاتيه","Caffè latte","إسبريسو مع لبن مبخّر وطبقة رغوة خفيفة","Espresso with steamed milk and a thin layer of foam",90,"latte",order=3,optionGroups=SIZE_EG(90,105,120)+[MILK(25),SHOT(25)]),
 P("p3","cat-hot","قهوة تركي","Turkish coffee","بن محوّج على الرملة، سادة أو مظبوط أو زيادة","Cardamom coffee brewed on hot sand, served your way",55,"turkish-coffee",order=4,optionGroups=[{"id":"sugar","name":"السكر","nameEn":"Sugar","required":True,"priceMode":"delta","values":[{"id":"plain","name":"سادة","nameEn":"No sugar","price":0},{"id":"medium","name":"مظبوط","nameEn":"Medium","price":0},{"id":"sweet","name":"زيادة","nameEn":"Sweet","price":0}]}]),
 P("p4","cat-hot","شاي بالنعناع","Mint tea","شاي كشري تقيل بالنعناع الفريش زي البيت","Strong loose-leaf tea with fresh mint",40,"mint-tea",order=5),
 P("p7","cat-hot","هوت شوكليت","Hot chocolate","شوكولاتة بلجيكي ذايبة في لبن سخن مع مارشميلو","Belgian chocolate melted into hot milk, topped with marshmallows",110,"hot-chocolate",order=6),
 P("p6","cat-cold","آيس لاتيه","Iced latte","إسبريسو على تلج ولبن ساقع","Espresso over ice with cold milk",105,"iced-latte",order=1,optionGroups=[MILK(25),SHOT(25)]),
 P("p9","cat-cold","آيس سبانيش لاتيه","Iced Spanish latte","إسبريسو ولبن مكثّف محلّى على تلج، أكتر حاجة بتتطلب عندنا","Espresso with sweetened condensed milk over ice, our best seller",120,"iced-spanish-latte",True,2,optionGroups=[MILK(25),SHOT(25)]),
 P("p8","cat-cold","عصير مانجو فريش","Fresh mango juice","مانجو عويس معصورة من غير سكر مضاف","Pressed Owais mango, no added sugar",90,"mango-juice",order=3,offerFrom=None),
 P("p11","cat-cold","ليموناضة بالنعناع","Mint lemonade","ليمون بلدي ونعناع فريش متضربين بالتلج","Fresh lime and mint blended with ice",70,"mint-lemonade",order=4),
 P("p15","cat-cold","ميلك شيك فراولة","Strawberry milkshake","فراولة طازة وآيس كريم فانيليا","Fresh strawberries blended with vanilla ice cream",115,"strawberry-milkshake",order=5),
 P("p10","cat-breakfast","فطار مصري","Egyptian breakfast","فول بالزيت الحار، طعمية، بيض أومليت، جبنة بيضا بالطماطم وعيش بلدي","Foul with chili oil, ta'ameya, omelette, white cheese and baladi bread",175,"egyptian-breakfast",True,1),
 P("p16","cat-breakfast","شكشوكة","Shakshuka","بيض مطبوخ في صلصة طماطم وفلفل بالكمون، مع عيش محمّص","Eggs poached in spiced tomato and pepper sauce, with toast",125,"shakshuka",order=2),
 P("p17","cat-breakfast","أومليت بالجبنة","Cheese omelette","تلات بيضات مع موتزاريلا وشيدر وسلطة جانبية","Three-egg omelette with mozzarella and cheddar, side salad",115,"cheese-omelette",order=3),
 P("p12","cat-breakfast","كرواسون زبدة","Butter croissant","مخبوز في الفرن كل صبح، طبقات هشّة بالزبدة الفرنساوي","Baked every morning with French butter",75,"butter-croissant",order=4),
 P("p18","cat-mains","برجر لحم كلاسيك","Classic beef burger","150 جرام لحم بلدي، شيدر، خس، طماطم وصوص البيت، مع بطاطس","150 g beef patty, cheddar, lettuce, tomato and house sauce, with fries",285,"beef-burger",True,1,prepEnabled=True),
 P("p19","cat-mains","ساندوتش تشيكن كريسبي","Crispy chicken sandwich","صدور فراخ مقرمشة، كول سلو وصوص رانش، مع بطاطس","Crispy chicken breast, coleslaw and ranch, with fries",225,"crispy-chicken-sandwich",order=2,prepEnabled=True),
 P("p20","cat-mains","كلوب ساندوتش","Club sandwich","توست محمّص، فراخ مشوية، تيركي مدخّن، بيض وجبنة","Toasted bread, grilled chicken, smoked turkey, egg and cheese",210,"club-sandwich",order=3),
 P("p21","cat-mains","فيتوتشيني ألفريدو بالفراخ","Chicken Alfredo fettuccine","مكرونة فيتوتشيني بصوص كريمة وبارميزان وفراخ مشوية","Fettuccine in parmesan cream sauce with grilled chicken",260,"chicken-alfredo",order=4),
 P("p22","cat-mains","سلطة سيزر بالفراخ","Chicken Caesar salad","خس رومين، فراخ مشوية، كروتون، بارميزان وصوص سيزر","Romaine, grilled chicken, croutons, parmesan and Caesar dressing",190,"caesar-salad",order=5),
 P("p14","cat-sweets","كنافة بالقشطة","Kunafa with cream","كنافة نابلسي محمّرة محشية قشطة، بتتقدّم سخنة","Golden kunafa filled with fresh cream, served warm",150,"kunafa",True,1,discountType="price",discountValue=125),
 P("p23","cat-sweets","تشيز كيك لوتس","Lotus cheesecake","تشيز كيك كريمي على قاعدة بسكويت لوتس وصوص لوتس","Creamy cheesecake on a Lotus biscuit base",160,"lotus-cheesecake",order=2),
 P("p24","cat-sweets","أم علي","Om Ali","رقائق عجين ولبن ومكسرات، من الفرن على طول","Baked pastry pudding with milk and nuts",120,"om-ali",order=3),
 P("p13","cat-sweets","بسبوسة بالقشطة","Basbousa with cream","بسبوسة بالسمنة البلدي وشربات خفيف","Semolina cake with ghee and light syrup",75,"basbousa",order=4),
 P("p25","cat-sweets","براونيز","Brownies","براونيز شوكولاتة غامقة، تتطلب مع بولة آيس كريم","Dark chocolate brownie, add a scoop of ice cream",110,"brownies",order=5,optionGroups=[{"id":"ice","name":"إضافات","nameEn":"Add-ons","required":False,"priceMode":"delta","values":[{"id":"none","name":"بدون","nameEn":"None","price":0},{"id":"ice","name":"بولة آيس كريم فانيليا","nameEn":"Vanilla ice cream scoop","price":35}]}]),
]
# category offer: 10% on hot drinks during morning (shows discount badges)
cats_eg=[dict(c) for c in cats]


def reviews(names):
  return [{"id":f"r{i+1}","rating":r,"overall":r,"name":n,"comment":c,"productId":pid,"createdAt":f"2026-10-{10+i:02d}T1{i}:00:00.000Z","visible":True} for i,(r,n,c,pid) in enumerate(names)]

banners_eg=[
 {"id":"bn-breakfast","imageUrl":img("banner-breakfast"),"title":"الفطار المصري بـ 175 ج.م","titleEn":"Egyptian breakfast, EGP 175","subtitle":"فول وطعمية وبيض وجبنة وعيش بلدي، كل يوم لحد الساعة 1","subtitleEn":"Foul, ta'ameya, eggs, cheese and baladi bread, daily until 1 pm","productId":"p10","sortOrder":1,"active":True,"startsAt":None,"endsAt":None},
 {"id":"bn-dessert","imageUrl":img("banner-dessert"),"title":"كنافة بالقشطة بـ 125 بدل 150","titleEn":"Kunafa with cream, EGP 125 instead of 150","subtitle":"عرض الأسبوع، بتتقدّم سخنة","subtitleEn":"This week's offer, served warm","productId":"p14","sortOrder":2,"active":True,"startsAt":None,"endsAt":None},
 {"id":"bn-coffee","imageUrl":img("banner-coffee"),"title":"آيس سبانيش لاتيه","titleEn":"Iced Spanish latte","subtitle":"أكتر مشروب بيتطلب عندنا","subtitleEn":"Our most ordered drink","productId":"p9","sortOrder":3,"active":True,"startsAt":None,"endsAt":None},
]
menu_eg={"categories":cats_eg,"products":eg,
 "contacts":[{"id":"c-wa","type":"whatsapp","label":"","value":"201000000000","active":True},{"id":"c-phone","type":"phone","label":"","value":"+201000000000","active":True},{"id":"c-ig","type":"instagram","label":"","value":"https://instagram.com/obelixagency","active":True},{"id":"c-map","type":"maps","label":"","value":"https://maps.google.com/?q=Cairo","active":True}],
 "reviews":reviews([(5,"أحمد م.","الفطار المصري ممتاز والطعمية سخنة ومقرمشة. هرجع تاني أكيد.","p10"),(5,"سارة ع.","السبانيش لاتيه مظبوط والطلب من الموبايل وصل الترابيزة بسرعة.","p9"),(4,"كريم ح.","الكنافة بالقشطة حلوة جداً، والمكان هادي ومريح للشغل.","p14"),(5,"منى س.","البرجر طازة والبطاطس مقرمشة. الأسعار واضحة وده مريح.","p18")]),
 "banners":banners_eg,
 "meta":{"promoEnabled":True,"cafe":"قهوة البيت","city":"القاهرة","demoVariant":"eg","note":"OBELIX Menu pilot demo — Egypt (EGP)"}}
brand_eg={"displayName":"قهوة البيت","slogan":"قهوة وفطار وأكل بيتي · القاهرة","sloganEn":"Coffee, breakfast & comfort food · Cairo","logoUrl":"/uploads/demo-logo-eg.svg","menuBackgroundUrl":img("cover-cafe"),"currency":"EGP","taxPercent":0,"taxInclusive":True,"colors":{"primary":"#5C3A1E","accent":"#D4A017","surface":"#F7F1E8"}}

# ---------------- Saudi
SIZE_SA=lambda s,m:[{"id":"size","name":"الحجم","nameEn":"Size","required":True,"priceMode":"replace","values":[{"id":"r","name":"عادي","nameEn":"Regular","price":s},{"id":"l","name":"كبير","nameEn":"Large","price":m}]}]
cats_sa=[
 {"id":"cat-drinks","name":"المشروبات","nameEn":"Drinks","parentId":None,"sortOrder":1,"active":True},
 {"id":"cat-hot","name":"القهوة المختصة","nameEn":"Specialty coffee","parentId":"cat-drinks","sortOrder":1,"active":True},
 {"id":"cat-arabic","name":"قهوة سعودية وشاي","nameEn":"Saudi coffee & tea","parentId":"cat-drinks","sortOrder":2,"active":True},
 {"id":"cat-cold","name":"مشروبات باردة","nameEn":"Cold drinks","parentId":"cat-drinks","sortOrder":3,"active":True},
 {"id":"cat-food","name":"الأكل","nameEn":"Food","parentId":None,"sortOrder":2,"active":True},
 {"id":"cat-breakfast","name":"الفطور","nameEn":"Breakfast","parentId":"cat-food","sortOrder":1,"active":True},
 {"id":"cat-mains","name":"ساندويتشات وأطباق","nameEn":"Sandwiches & mains","parentId":"cat-food","sortOrder":2,"active":True},
 {"id":"cat-sweets","name":"الحلى","nameEn":"Desserts","parentId":"cat-food","sortOrder":3,"active":True},
]
MILK_SA=MILK(4); SHOT_SA=SHOT(4)
sa=[
 P("s1","cat-hot","إسبريسو","Espresso","دبل شوت من محصول إثيوبي مختص","Double shot of Ethiopian specialty beans",12,"espresso",order=1),
 P("s2","cat-hot","كورتادو","Cortado","إسبريسو مع كمية مساوية من الحليب المبخّر","Espresso cut with an equal part of steamed milk",15,"cortado",order=2,optionGroups=[MILK_SA]),
 P("s3","cat-hot","فلات وايت","Flat white","دبل ريستريتو مع حليب مخملي","Double ristretto with velvety milk",17,"flat-white",order=3,optionGroups=[MILK_SA,SHOT_SA]),
 P("s4","cat-hot","سبانش لاتيه","Spanish latte","إسبريسو مع حليب مكثّف محلّى، الأكثر طلباً","Espresso with sweetened condensed milk, our best seller",19,"latte",True,4,optionGroups=SIZE_SA(19,23)+[MILK_SA,SHOT_SA]),
 P("s5","cat-hot","V60","V60 pour-over","تقطير يدوي من محصول اليوم، اسأل الباريستا عن الإيحاءات","Hand-brewed filter coffee of the day",22,"v60",order=5),
 P("s6","cat-arabic","قهوة سعودية (دلّة)","Saudi coffee (dallah)","قهوة خولاني بالهيل والزعفران، تقدّم مع تمر سكري","Khawlani coffee with cardamom and saffron, served with Sukkari dates",25,"saudi-coffee",True,1),
 P("s7","cat-arabic","شاي كرك","Karak tea","شاي بالحليب والهيل والزعفران","Spiced milk tea with cardamom and saffron",9,"karak-tea",order=2),
 P("s8","cat-arabic","شاي بالنعناع","Mint tea","شاي أحمر مع نعناع مديني طازج","Black tea with fresh Madinah mint",10,"mint-tea",order=3),
 P("s9","cat-cold","آيس سبانش لاتيه","Iced Spanish latte","إسبريسو وحليب مكثّف على ثلج","Espresso and condensed milk over ice",21,"iced-spanish-latte",True,1,optionGroups=SIZE_SA(21,25)+[MILK_SA,SHOT_SA]),
 P("s10","cat-cold","كولد برو","Cold brew","منقوع على البارد 18 ساعة، طعم ناعم وقليل الحموضة","Steeped cold for 18 hours, smooth and low in acidity",19,"cold-brew",order=2),
 P("s11","cat-cold","موهيتو ليمون ونعناع","Lemon mint mojito","ليمون ونعناع وصودا، بدون كحول","Lime, mint and soda, alcohol-free",18,"mint-lemonade",order=3),
 P("s12","cat-cold","عصير برتقال طازج","Fresh orange juice","برتقال معصور عند الطلب","Squeezed to order",16,"orange-juice",order=4),
 P("s13","cat-breakfast","شكشوكة","Shakshuka","بيض مطهو في صلصة طماطم وفلفل، مع خبز محمّص","Eggs in spiced tomato and pepper sauce, with toast",28,"shakshuka",True,1),
 P("s14","cat-breakfast","فول بالسمن","Foul with ghee","فول مدمّس بالسمن البري والكمون، مع خبز تميس","Slow-cooked fava beans with ghee and cumin, with tamees bread",18,"foul-medames",order=2),
 P("s15","cat-breakfast","كرواسون زعتر وجبن","Za'atar & cheese croissant","كرواسون زبدة محشي جبن عكاوي وزعتر","Butter croissant with akkawi cheese and za'atar",14,"zaatar-croissant",order=3),
 P("s16","cat-mains","ساندويتش حلومي","Halloumi sandwich","حلومي مشوي، طماطم، خيار وزعتر في خبز ساوردو","Grilled halloumi, tomato, cucumber and za'atar on sourdough",29,"halloumi-sandwich",order=1),
 P("s17","cat-mains","برجر واغيو","Wagyu burger","لحم واغيو 160 جرام، جبن شيدر وصوص خاص، مع بطاطس","160 g wagyu patty, cheddar and house sauce, with fries",49,"beef-burger",True,2,prepEnabled=True),
 P("s18","cat-mains","ساندويتش دجاج كرسبي","Crispy chicken sandwich","صدر دجاج مقرمش، كول سلو وصوص رانش، مع بطاطس","Crispy chicken breast, coleslaw and ranch, with fries",36,"crispy-chicken-sandwich",order=3,prepEnabled=True),
 P("s19","cat-mains","باستا ألفريدو بالدجاج","Chicken Alfredo pasta","فيتوتشيني بصوص كريمة وبارميزان ودجاج مشوي","Fettuccine in parmesan cream with grilled chicken",42,"chicken-alfredo",order=4),
 P("s20","cat-sweets","سان سباستيان تشيز كيك","San Sebastián cheesecake","تشيز كيك محروق الوجه بقوام كريمي","Burnt Basque cheesecake with a creamy center",28,"san-sebastian-cheesecake",True,1,discountType="price",discountValue=24),
 P("s21","cat-sweets","كنافة بالجبن","Kunafa with cheese","كنافة ناعمة محشية جبن، تقدّم ساخنة","Fine kunafa filled with cheese, served warm",26,"kunafa",order=2),
 P("s22","cat-sweets","كيكة التمر","Date cake","كيكة تمر بصوص الكراميل المملح","Date cake with salted caramel sauce",22,"date-cake",order=3),
 P("s23","cat-sweets","لقيمات","Luqaimat","لقيمات مقرمشة بدبس التمر والسمسم","Crispy dough bites with date syrup and sesame",18,"luqaimat",order=4),
]
banners_sa=[
 {"id":"bn-coffee","imageUrl":img("banner-coffee"),"title":"سبانش لاتيه بـ 19 ر.س","titleEn":"Spanish latte, SAR 19","subtitle":"قهوة مختصة محمّصة في الرياض","subtitleEn":"Specialty coffee roasted in Riyadh","productId":"s4","sortOrder":1,"active":True,"startsAt":None,"endsAt":None},
 {"id":"bn-dessert","imageUrl":img("banner-dessert"),"title":"سان سباستيان بـ 24 ر.س بدل 28","titleEn":"San Sebastián cheesecake, SAR 24 instead of 28","subtitle":"عرض الأسبوع","subtitleEn":"This week's offer","productId":"s20","sortOrder":2,"active":True,"startsAt":None,"endsAt":None},
 {"id":"bn-breakfast","imageUrl":img("banner-breakfast"),"title":"فطور الصباح","titleEn":"Morning breakfast","subtitle":"شكشوكة، فول بالسمن وكرواسون زعتر من 7 إلى 12","subtitleEn":"Shakshuka, foul and za'atar croissant, 7 am to noon","productId":"s13","sortOrder":3,"active":True,"startsAt":None,"endsAt":None},
]
menu_sa={"categories":cats_sa,"products":sa,
 "contacts":[{"id":"c-wa","type":"whatsapp","label":"","value":"966500000000","active":True},{"id":"c-phone","type":"phone","label":"","value":"+966500000000","active":True},{"id":"c-ig","type":"instagram","label":"","value":"https://instagram.com/obelixagency","active":True},{"id":"c-map","type":"maps","label":"","value":"https://maps.google.com/?q=Riyadh","active":True}],
 "reviews":reviews([(5,"عبدالله ف.","السبانش لاتيه ممتاز والطلب من الجوال سريع جداً.","s4"),(5,"نورة ق.","القهوة السعودية بالزعفران مع التمر تجربة رائعة.","s6"),(4,"فهد ع.","برجر الواغيو لذيذ والأسعار واضحة شاملة الضريبة.","s17"),(5,"ريم س.","السان سباستيان من أفضل ما جربت في الرياض.","s20")]),
 "banners":banners_sa,
 "meta":{"promoEnabled":True,"cafe":"بيت القهوة","city":"الرياض","demoVariant":"sa","note":"OBELIX Menu pilot demo — Saudi Arabia (SAR, VAT 15% inclusive)"}}
brand_sa={"displayName":"بيت القهوة","slogan":"قهوة مختصة وفطور · الرياض","sloganEn":"Specialty coffee & breakfast · Riyadh","logoUrl":"/uploads/demo-logo-sa.svg","menuBackgroundUrl":img("cover-cafe"),"currency":"SAR","taxPercent":15,"taxInclusive":True,"taxNumber":"300000000000003","colors":{"primary":"#1F4E3D","accent":"#C9A227","surface":"#F4F2EC"}}

routing={"cat-hot":"barista","cat-arabic":"barista","cat-cold":"barista","cat-breakfast":"kitchen","cat-mains":"kitchen","cat-sweets":"kitchen","cat-food":"kitchen"}
for v,m,b in (("eg",menu_eg,brand_eg),("sa",menu_sa,brand_sa)):
  os.makedirs(f"{ROOT}/{v}",exist_ok=True)
  json.dump(m,open(f"{ROOT}/{v}/menu.json","w"),ensure_ascii=False,indent=2)
  json.dump(b,open(f"{ROOT}/{v}/brand.patch.json","w"),ensure_ascii=False,indent=2)
  json.dump({"stationRouting":routing},open(f"{ROOT}/{v}/ordering.patch.json","w"),ensure_ascii=False,indent=2)
photos=sorted({p["image"].split("demo-")[1][:-4] for m in (menu_eg,menu_sa) for p in m["products"]}|{"cover-cafe","banner-breakfast","banner-coffee","banner-dessert"})
print(len(photos),photos)
json.dump({"branches":[
  {"id":"main","name":"فرع العليا","nameEn":"Olaya","slug":"main","active":True,"sortOrder":0},
  {"id":"branch-maadi","name":"فرع الملقا","nameEn":"Al Malqa","slug":"malqa","active":True,"sortOrder":1}]},
  open(f"{ROOT}/sa/branches.patch.json","w"),ensure_ascii=False,indent=2)
json.dump({"branches":[
  {"id":"main","name":"فرع الزمالك","nameEn":"Zamalek","slug":"main","active":True,"sortOrder":0},
  {"id":"branch-maadi","name":"فرع المعادي","nameEn":"Maadi","slug":"maadi","active":True,"sortOrder":1}]},
  open(f"{ROOT}/eg/branches.patch.json","w"),ensure_ascii=False,indent=2)
