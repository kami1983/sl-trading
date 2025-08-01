const crypto = require('crypto');

function getEventDiscriminator(eventName) {
    const eventString = `event:${eventName}`;
    const hash = crypto.createHash('sha256').update(eventString).digest();
    return hash.slice(0, 8);
}

// 计算 TradeEvent 的 discriminator
const tradeEventDiscriminator = getEventDiscriminator('TradeEvent');
console.log('TradeEvent Discriminator:', Array.from(tradeEventDiscriminator));

// 从实际数据中提取 discriminator
const base64Data = 'vdt/007mYe4GAAAAMzA3MzIyKwAAAEthbWlXV00zVHQ4S3d6b1hYZGFpcHk4WmlnWTJmajlNM0pwWno5WlRaRk4rAAAAS2FtaVdXTTNUdDhLd3pvWFhkYWlweThaaWdZMmZqOU0zSnBaejlaVFpGTgBkAAAAAAAAAPBJAgAAAAAA+nHZT5gBAAA=';
const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
const actualDiscriminator = binaryData.slice(0, 8);
console.log('Actual Data Discriminator:', Array.from(actualDiscriminator));

// 比较两个 discriminator
const isMatch = Buffer.from(tradeEventDiscriminator).equals(Buffer.from(actualDiscriminator));
console.log('Is TradeEvent?', isMatch); 