"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WordData = void 0;
class WordData {
    constructor(etymology = '', definitions = [], pronunciations = [], audioLink = []) {
        this.etymology = etymology;
        this.definitions = definitions;
        this.pronunciations = pronunciations;
        this.audioLink = audioLink;
    }
    toJSON() {
        return {
            etymology: this.etymology,
            definitions: this.definitions,
            pronunciations: {
                text: this.pronunciations,
                audio: this.audioLink
            }
        };
    }
}
exports.WordData = WordData;
