"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.capitaliseInitials = void 0;
function capitaliseInitials(text) {
    return text
        .split(' ')
        .map((t) => t[0].toUpperCase() + t.slice(1))
        .join(' ');
}
exports.capitaliseInitials = capitaliseInitials;
