"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelatedWord = void 0;
class RelatedWord {
    constructor(relationshipType = '', words = []) {
        this.relationshipType = relationshipType;
        this.words = words;
    }
}
exports.RelatedWord = RelatedWord;
