const crypto = require('crypto');

class Captcha {
    constructor(options = {}) {
        this.width = options.width || 120;
        this.height = options.height || 40;
        this.codeLength = options.codeLength || 4;
        this.fontSize = options.fontSize || 24;
        this.bgColor = options.bgColor || '#ffffff';
        this.fontColor = options.fontColor || '#333333';
        this.noiseCount = options.noiseCount || 50;
        this.lineCount = options.lineCount || 3;
        this.expireTime = options.expireTime || 5 * 60 * 1000;
        this.chars = options.chars || 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    }

    generateCode() {
        let code = '';
        for (let i = 0; i < this.codeLength; i++) {
            code += this.chars.charAt(Math.floor(Math.random() * this.chars.length));
        }
        return code;
    }

    generateId() {
        return crypto.randomBytes(16).toString('hex');
    }

    generateSVG(code) {
        const width = this.width;
        const height = this.height;
        
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
        
        svg += `<rect width="${width}" height="${height}" fill="${this.bgColor}"/>`;
        
        for (let i = 0; i < this.noiseCount; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const r = Math.random() * 2 + 1;
            const color = `rgb(${Math.floor(Math.random() * 150)}, ${Math.floor(Math.random() * 150)}, ${Math.floor(Math.random() * 150)})`;
            svg += `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="0.5"/>`;
        }
        
        for (let i = 0; i < this.lineCount; i++) {
            const x1 = Math.random() * width;
            const y1 = Math.random() * height;
            const x2 = Math.random() * width;
            const y2 = Math.random() * height;
            const color = `rgb(${Math.floor(Math.random() * 150)}, ${Math.floor(Math.random() * 150)}, ${Math.floor(Math.random() * 150)})`;
            svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1" opacity="0.5"/>`;
        }
        
        for (let i = 0; i < code.length; i++) {
            const x = (width / (code.length + 1)) * (i + 1);
            const y = height / 2 + this.fontSize / 3;
            const rotation = (Math.random() - 0.5) * 30;
            const color = this.getRandomColor();
            svg += `<text x="${x}" y="${y}" font-size="${this.fontSize}" font-family="Arial" font-weight="bold" fill="${color}" text-anchor="middle" transform="rotate(${rotation}, ${x}, ${y})">${code[i]}</text>`;
        }
        
        svg += '</svg>';
        return svg;
    }

    getRandomColor() {
        const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    verify(inputCode, storedCode) {
        if (!inputCode || !storedCode) {
            return false;
        }
        return inputCode.toUpperCase() === storedCode.toUpperCase();
    }

    generate() {
        const id = this.generateId();
        const code = this.generateCode();
        const svg = this.generateSVG(code);
        const expiresAt = Date.now() + this.expireTime;
        
        return {
            id,
            code,
            svg,
            expiresAt
        };
    }
}

module.exports = Captcha;