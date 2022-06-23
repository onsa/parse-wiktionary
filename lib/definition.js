"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Definition = void 0;
class Definition {
    constructor(partOfSpeech = '', text = [], relatedWords = [], examples = []) {
        this.partOfSpeech = partOfSpeech;
        this.text = text;
        this.relatedWords = relatedWords;
        this.examples = examples;
    }
}
exports.Definition = Definition;
