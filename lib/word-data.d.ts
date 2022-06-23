import { Definition } from './definition';
export declare class WordData {
    etymology: string;
    definitions: Array<Definition>;
    pronunciations: Array<string>;
    audioLink: Array<string>;
    constructor(etymology?: string, definitions?: Array<Definition>, pronunciations?: Array<string>, audioLink?: Array<string>);
    toJSON(): any;
}
