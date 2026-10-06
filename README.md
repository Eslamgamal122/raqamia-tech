# Raqamia Tech — Hostinger / Node.js

نسخة مستقلة من نظام إدارة الشركة، تعمل على Next.js وNode.js بدون Workers أو D1 أو R2. تعليمات الإعداد ونقل البيانات في [HOSTINGER.md](./HOSTINGER.md).

```bash
npm ci
npm test
npm run build
npm start
```

التشغيل الإنتاجي يحتاج `APP_URL` و`DATA_DIR` ومفتاح `SITE_CONNECTION_ENCRYPTION_KEY`؛ إنشاء المدير الأول يتم بمتغيرات بيئة الخادم، وليس بتسجيل حساب عام.

لا ترفع `node_modules` أو `.next` أو ملفات البيانات أو كلمات المرور إلى GitHub. هذه النسخة تحتوي على الكود؛ بيانات النظام والمرفقات الحالية تُنقل بصورة منفصلة.
