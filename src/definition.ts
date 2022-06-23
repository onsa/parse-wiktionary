import { RelatedWord } from './related-word';

export class Definition {
  public constructor(
    public partOfSpeech: string = '',
    public text: Array<string> = [],
    public relatedWords: Array<RelatedWord> = [],
    public examples: Array<string> = []
  ) { }
}
