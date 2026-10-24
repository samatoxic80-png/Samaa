const { default: makeWASocket, useMultiFileAuthState, normalizeMessageContent, getContentType, downloadMediaMessage } = require('@whiskeysockets/baileys');
const P = require('pino');
const qrcode = require('qrcode-terminal');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        auth: state,
        logger: P({ level: 'silent' }),
        printQRInTerminal: false 
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, qr } = update;
        if (qr) {
            qrcode.generate(qr, { small: true }); 
            console.log("👆 امسح الكود اللي فوق من واتساب");
        }
        if (connection === 'open') {
            console.log('✅ البوت اتصل بنجاح!');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message) return; 

        const normalizedMsg = normalizeMessageContent(msg.message);
        if (!normalizedMsg) return;

        const type = getContentType(normalizedMsg); 

        if (type === 'imageMessage' || type === 'videoMessage') {
            
            const isVideo = type === 'videoMessage';
            console.log(`وصل ${isVideo ? 'فيديو' : 'صورة'}! جاري تنزيله...`);

            try {
                const buffer = await downloadMediaMessage(
                    msg, 
                    'buffer',
                    {},
                    { logger: P({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage }
                );

                // إرسال الميديا لرقم البوت نفسه (رسائلك المحفوظة)
                const myJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                
                if (isVideo) {
                    await sock.sendMessage(myJid, { video: buffer, caption: '🎥 فيديو تم التقاطه!' });
                } else {
                    await sock.sendMessage(myJid, { image: buffer, caption: '📸 صورة تم التقاطها!' });
                }

                console.log(`✅ تم إرسال الملف لرسائلك المحفوظة!`);

            } catch (error) {
                console.error("❌ حصل خطأ:", error);
            }
        }
    });
}

startBot();