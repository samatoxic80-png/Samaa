const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

// سيرفر وهمي عشان منصة Render تفتكر إن الموقع شغال ومتقفلوش
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(port, () => console.log(`Server listening on port ${port}`));

// إعداد البوت
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// كود الـ QR
client.on('qr', (qr) => {
    console.log('\n=============================================');
    console.log('امسح الكود ده من واتساب (الأجهزة المرتبطة):');
    qrcode.generate(qr, { small: true });
    console.log('=============================================\n');
});

client.on('ready', () => {
    console.log('✅ البوت شغال وجاهز لسحب الصور!');
});

// استقبال الرسائل
client.on('message', async message => {
    if (message.hasMedia) {
        try {
            console.log('جاري تحميل الميديا...');
            const media = await message.downloadMedia();
            
            if (media) {
                console.log('✅ تم سحب صورة/فيديو (تشاف مرة واحدة أو عادي)!');
                // الرد على المرسل (اختياري، تقدر تمسح السطر ده)
                // message.reply('تم استلام الملف.'); 
            }
        } catch (error) {
            console.error('حدث خطأ:', error);
        }
    }
});

client.initialize();