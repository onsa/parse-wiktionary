import { WordData } from './word-data';
export declare class WiktionaryParser {
    private readonly relations;
    private readonly partsOfSpeech;
    private readonly includedItems;
    private readonly unwantedClasses;
    private dom;
    private language;
    private currentWord;
    get document(): Document;
    constructor();
    parse(word: string, language?: string): Promise<Array<WordData>>;
    private url;
    private getWordData;
    private parseExamples;
    private parseDefinitions;
    private parseEtymologies;
    private parseRelatedWords;
    private parsePronunciations;
    private getIdList;
    private mapToObject;
    private countDigits;
    private isSubHeading;
    private cleanHTML;
    private download;
}
