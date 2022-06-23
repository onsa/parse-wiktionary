import { Definition } from './definition';

export class WordData {
  public constructor(
    public etymology: string = '',
    public definitions: Array<Definition> = [],
    public pronunciations: Array<string> = [],
    public audioLink: Array<string> = []
  ) { }

  public toJSON(): any {
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
