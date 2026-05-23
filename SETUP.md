# خطوات تشغيل النظام

## 1. تشغيل Convex (مرة واحدة فقط)

```powershell
cd "C:\Users\M\Desktop\github for local\salman sports"
npx convex dev --configure=new
```

⚠️ **مهم:** اختر **"create a new project"** واكتب اسماً مثل `pe-supervision`.
**لا تختر** "choose an existing project" حتى لا يختلط هذا النظام بمشاريعك الأخرى.

سيُنشئ deployment جديداً ويحدّث `.env.local` تلقائياً.
بعد ظهور ✅ يبدأ Convex بمراقبة التغييرات — **اتركه يعمل في الخلفية**.

## 2. في طرفية ثانية — رفع البيانات

```powershell
cd "C:\Users\M\Desktop\github for local\salman sports"
node import-engine/seed.mjs
```

سيرفع: 13 موجه + 221 مدرسة + التوزيعات + الأكواد + التغطية + المقابلات

## 3. في طرفية ثالثة — تشغيل Next.js

```powershell
cd "C:\Users\M\Desktop\github for local\salman sports"
npm run dev
```

افتح المتصفح على: http://localhost:3100
(البورت 3100 لتجنّب التعارض مع مشاريع أخرى على 3000)
