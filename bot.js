const { default: makeWASocket, useMultiFileAuthState, normalizeMessageContent, getContentType, downloadMediaMessage } = require('@whiskeysockets/baileys');
const P = require('pino');
const fs = require('fs');
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

        // هنا ضفنا دعم الفيديو (videoMessage)
        if (type === 'imageMessage' || type === 'videoMessage') {
            
            const isVideo = type === 'videoMessage';
            const fileType = isVideo ? 'فيديو 🎥' : 'صورة 📸';
            console.log(`وصل ${fileType}! جاري تنزيله...`);

            try {
                const buffer = await downloadMediaMessage(
                    msg, 
                    'buffer',
                    {},
                    { logger: P({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage }
                );

                // لو فيديو يبقى الامتداد mp4 ولو صورة jpg
                const ext = isVideo ? 'mp4' : 'jpg';
                const filename = `media_${Date.now()}.${ext}`;
                
                fs.writeFileSync(filename, buffer);
                console.log(`✅ تم حفظ الملف: ${filename}`);

                await sock.sendMessage(msg.key.remoteJid, { text: `تم استلام ${fileType} بنجاح! 📥` });
            } catch (error) {
                console.error("❌ حصل خطأ:", error);
            }
        }
    });
}

startBot();