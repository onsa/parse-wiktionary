"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.padMultilevel = void 0;
function padMultilevel(text, padding = 2) {
    return text
        .split('.')
        .map((n) => n.padStart(padding, '0'))
        .join('.');
}
exports.padMultilevel = padMultilevel;
