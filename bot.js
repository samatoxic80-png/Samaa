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

        if (type === 'imageMessage') {
            console.log("📸 وصلت صورة! جاري تنزيلها...");
            try {
                const buffer = await downloadMediaMessage(
                    msg, 
                    'buffer',
                    {},
                    { logger: P({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage }
                );

                const filename = `image_${Date.now()}.jpg`;
                fs.writeFileSync(filename, buffer);
                console.log(`✅ تم حفظ الصورة: ${filename}`);

                await sock.sendMessage(msg.key.remoteJid, { text: 'تم استلام الصورة بنجاح! 📥' });
            } catch (error) {
                console.error("❌ حصل خطأ:", error);
            }
        }
    });
}

startBot();