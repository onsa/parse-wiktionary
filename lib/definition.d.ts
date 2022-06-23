import { RelatedWord } from './related-word';
export declare class Definition {
    partOfSpeech: string;
    text: Array<string>;
    relatedWords: Array<RelatedWord>;
    examples: Array<string>;
    constructor(partOfSpeech?: string, text?: Array<string>, relatedWords?: Array<RelatedWord>, examples?: Array<string>);
}
