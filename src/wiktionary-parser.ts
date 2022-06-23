import { type IncomingMessage } from 'http';
import https from 'https';
import { JSDOM } from 'jsdom';
import { Definition } from './definition';
import { WordData } from './word-data';
import { ContentType } from './content-type';
import { ResultMap } from './result-map';
import { RelatedWord } from './related-word';
import { capitaliseInitials } from './capitalise-initials';
import { padMultilevel } from './pad-multilevel';

export class WiktionaryParser {
  private readonly relations: Array<string> = [
    'synonyms', 'antonyms', 'hypernyms', 'hyponyms', 'meronyms', 'holonyms', 'troponyms', 'related terms', 'coordinate terms'
  ];
  private readonly partsOfSpeech: Array<string> = [
    'noun', 'verb', 'adjective', 'adverb', 'determiner', 'article', 'preposition', 'conjunction', 'proper noun', 'letter',
    'character', 'phrase', 'proverb', 'idiom', 'symbol', 'syllable', 'numeral', 'initialism', 'interjection', 'definitions',
    'pronoun', 'particle', 'predicative', 'participle', 'suffix'
  ];
  private readonly includedItems: Array<string> = this.relations.concat(this.partsOfSpeech).concat(['etymology', 'pronunciation']);
  private readonly unwantedClasses: Array<string> = ['sister-wikipedia', 'thumb', 'reference', 'cited-source'];
  private dom!: JSDOM;
  private language: string = 'english';
  private currentWord!: string;

  public get document(): Document {
    return this.dom.window.document;
  }

  public constructor() {
  }

  public async parse(word: string, language: string = 'english'): Promise<Array<WordData>> {
    const html: string = await this.download(word);

    // create DOM object
    this.currentWord = word;
    this.language = language.toLowerCase();
    this.dom = new JSDOM(html);
    this.cleanHTML();
    return this.getWordData(this.language);
  }

  private url(word: string): string {
    return `https://en.wiktionary.org/wiki/${word}?printable=yes`;
  }

  private getWordData(language: string): Array<WordData> {
    const contents: Array<Element> = Array.from(this.document.querySelectorAll('span.toctext'));
    const wordContents: Array<Element> = [];
    let startIndex: string | null = null;
    contents.forEach(
      (element: Element): void => {
        if (element.textContent?.trim().toLowerCase() === language) {
          startIndex = element.previousElementSibling?.textContent + '.';
        }
      }
    );
    if (startIndex === null) {
      if (!!contents) {
        return [];
      }
      const languageHeading: Element | undefined = Array.from(this.document.querySelectorAll('span#mw-headline'))
        .find(
          (element: Element): boolean => element.textContent?.toLowerCase() === language
        );
      if (!languageHeading) {
        return [];
      }
    }
    contents.forEach(
      (element: Element): void => {
        const index: string | null = element.previousElementSibling!.textContent;
        const contentText: string = element.textContent!.replace(/[0-9]/g, '').trim();
        if (index?.startsWith(startIndex!) && this.includedItems.indexOf(contentText.toLowerCase()) > -1) {
          wordContents.push(element);
        }
      }
    );
    return this.mapToObject({
      examples: this.parseExamples(wordContents),
      definitions: this.parseDefinitions(wordContents),
      etymologies: this.parseEtymologies(wordContents),
      related: this.parseRelatedWords(wordContents),
      pronunciations: this.parsePronunciations(wordContents)
    });
  }

  private parseExamples(wordContents: Array<Element>): Array<[string, Array<string>, string]> {
    const definitionIdList: Array<[string, string, string]> = this.getIdList(wordContents, ContentType.DEFINITIONS);
    const exampleList: Array<[string, Array<string>, string]> = [];
    definitionIdList.forEach(
      ([definitionIndex, definitionId, definitionType]: [string, string, string]): void => {
        const spanTag: HTMLSpanElement = this.document.querySelector(`span#${definitionId}`)!;
        let table: Element | null = spanTag.parentElement!;
        while (table!.tagName !== 'OL') {
          table = table!.nextElementSibling;
        }
        const examples: Array<string> = [];
        while (!!table && table.tagName === 'OL') {
          table.querySelectorAll('dd').forEach(
            (dd: Element): void => {
              const exampleText: string = dd.textContent!.trim().replace(/\([^)]*\)/, '');
              if (!!exampleText) {
                examples.push(exampleText);
              }
              dd.innerHTML = '';
            }
          );
          exampleList.push([definitionIndex, examples, definitionType]);
          Array.from(table.querySelectorAll('ul')).concat(Array.from(table.querySelectorAll('ol'))).forEach(
            (list: HTMLElement): void => {
              list.innerHTML = '';
            }
          );
          table = table.nextElementSibling;
        }
      }
    );
    return exampleList;
  }

  private parseDefinitions(wordContents: Array<Element>): Array<[string, Array<string>, string]> {
    const definitionIdList: Array<[string, string, string]> = this.getIdList(wordContents, ContentType.DEFINITIONS);
    const definitionList: Array<[string, Array<string>, string]> = [];
    let definitionTag: Element | null = null;
    definitionIdList.forEach(
      ([definitionIndex, definitionId, definitionType]: [string, string, string]): void => {
        const definitionText: Array<string> = [];
        const spanTag: HTMLSpanElement = this.document.querySelector(`span#${definitionId}`)!;
        let table: Element | null = spanTag.parentElement!.nextElementSibling;
        while (!!table && ['H3', 'H4', 'H5'].indexOf(table.tagName) === -1) {
          definitionTag = table;
          table = table.nextElementSibling;
          if (definitionTag.tagName === 'P') {
            if (!!definitionTag.textContent?.trim()) {
              definitionText.push(definitionTag.textContent.trim());
            }
          }
          if (['OL', 'UL'].indexOf(definitionTag.tagName) > -1) {
            Array.from(definitionTag.children).forEach(
              (li: Element): void => {
                if (!!li.textContent) {
                  definitionText.push(li.textContent.trim());
                }
              }
            );
          }
        }
        if (definitionType === 'definitions') {
          definitionType = '';
        }
        definitionList.push([definitionIndex, definitionText, definitionType]);
      }
    );

    return definitionList;
  }

  private parseEtymologies(wordContents: Array<Element>): Array<[string, string]> {
    const etymologyIdList: Array<[string, string, string]> = this.getIdList(wordContents, ContentType.ETYMOLOGIES);
    const etymologyList: Array<[string, string]> = [];
    let etymologyTag: Element | null = null;
    etymologyIdList.forEach(
      ([etymologyIndex, etymologyId, _]: [string, string, string]): void => {
        let etymologyText: string = '';
        const span: HTMLSpanElement = this.document.querySelector<HTMLSpanElement>(`span#${etymologyId}`)!;
        let nextTag: Element | null = span.parentElement!.nextElementSibling;
        while (!!nextTag && ['H3', 'H4', 'DIV', 'H5'].indexOf(nextTag.tagName) === -1) {
          etymologyTag = nextTag;
          nextTag = nextTag.nextElementSibling;
          if (etymologyTag.tagName === 'P') {
            etymologyText += etymologyTag.textContent;
          } else {
            etymologyTag.querySelectorAll('li').forEach(
              (li: HTMLLIElement): string => etymologyText += li.textContent + '\n'
            );
          }
        }
        etymologyList.push([etymologyIndex, etymologyText.trim()]);
      }
    );
    return etymologyList;
  }

  private parseRelatedWords(wordContents: Array<Element>): Array<[string, Array<string>, string]> {
    const relationIdList: Array<[string, string, string]> = this.getIdList(wordContents, ContentType.RELATED);
    const relatedWordList: Array<[string, Array<string>, string]> = [];
    relationIdList.forEach(
      ([relatedIndex, relatedId, relationType]: [string, string, string]): void => {
        const words: Array<string> = [];
        const spanTag: HTMLSpanElement = this.document.querySelector(`span#${relatedId}`)!;
        let parent: Element | null = spanTag.parentElement;
        let listElements: NodeListOf<HTMLLIElement> = parent!.querySelectorAll('li');
        while (!!parent && !listElements.length) {
          parent = parent.nextElementSibling;
          listElements = parent!.querySelectorAll('li');
        }
        if (!!parent) {
          Array.from(listElements).forEach(
            (li: HTMLLIElement): void => {
              words.push(li.textContent!);
            }
          );
        }
        relatedWordList.push([relatedIndex, words, relationType]);
      }
    );
    return relatedWordList;
  }

  private parsePronunciations(wordContents: Array<Element>): Array<[string, Array<string>, Array<string>]> {
    const pronunciationIdList: Array<[string, string, string]> = this.getIdList(wordContents, ContentType.PRONUNCIATION);
    const pronunciationList: Array<[string, Array<string>, Array<string>]> = [];
    const audioLinks: Array<string> = [];
    const pronunciationDivClasses: Array<string> = ['mw-collapsible', 'vsSwitcher'];
    pronunciationIdList.forEach(
      ([pronunciationIndex, pronunciationId, _]: [string, string, string]): void => {
        const pronunciationText: Array<string> = [];
        const spanTag: HTMLSpanElement = this.document.querySelector(`span#${pronunciationId}`)!;
        let list: Element | null = spanTag.parentElement;
        while (list?.tagName !== 'UL') {
          list = list!.nextElementSibling;
          if (list?.tagName === 'P') {
            pronunciationText.push(list.textContent!);
            break;
          }
          if (
            list?.tagName === 'DIV' &&
            pronunciationDivClasses.some(
              (className: string): boolean => list!.classList.contains(className)
            )
          ) {
            break;
          }
        }
        Array.from(list.querySelectorAll('sup')).forEach(
          (sup: HTMLElement): string => sup.innerHTML = ''
        );
        Array.from(list.querySelectorAll('li')).forEach(
          (li: HTMLLIElement): void => {
            Array.from(li.querySelectorAll('.audiotable audio source') as NodeListOf<HTMLSourceElement>).forEach(
              (audioTag: HTMLSourceElement): void => {
                audioLinks.push(audioTag.src);
                audioTag.parentElement!.removeChild(audioTag);
              }
            );
            Array.from(li.querySelectorAll('ul')).forEach(
              (ul: HTMLUListElement): HTMLUListElement => ul.parentElement!.removeChild(ul)
            );
            const audioTables: NodeListOf<HTMLTableElement> = li.querySelectorAll('table.audiotable');
            if (!!li.textContent && !audioTables.length) {
              pronunciationText.push(li.textContent.trim());
            }
          }
        );
        pronunciationList.push([pronunciationIndex, pronunciationText, audioLinks]);
      }
    );
    return pronunciationList;
  }

  private getIdList(contents: Array<Element>, contentType: ContentType): Array<[string, string, string]> {
    let checklist: Array<string>;
    if (contentType === ContentType.ETYMOLOGIES) {
      checklist = ['etymology'];
    } else if (contentType === ContentType.PRONUNCIATION) {
      checklist = ['pronunciation'];
    } else if (contentType === ContentType.DEFINITIONS) {
      checklist = this.partsOfSpeech;
      if (this.language === 'chinese') {
        checklist.push(this.currentWord);
      }
    } else if (contentType === ContentType.RELATED) {
      checklist = this.relations;
    } else {
      return [];
    }
    const idList: Array<[string, string, string]> = [];
    if (!contents.length) {
      return checklist
        .filter(
          (check: string): boolean => !!this.document.querySelector(`span#${capitaliseInitials(check)}`)
        )
        .map(
          (check: string): [string, string, string] => ['1', capitaliseInitials(check), check]
        );
    }
    contents.forEach(
      (content: Element): void => {
        const contentIndex: string = content.previousElementSibling!.textContent!;
        const textToCheck: string = content.textContent!.replace(/[0-9]/g, '').trim().toLowerCase();
        if (checklist.indexOf(textToCheck) > -1) {
          const contentId: string = (content.parentElement as HTMLAnchorElement).getAttribute('href')!.replace('#', '');
          idList.push([contentIndex, contentId, textToCheck]);
        }
      }
    );
    return idList;
  }

  private mapToObject(map: ResultMap): Array<WordData> {
    const jsonObjectList: Array<WordData> = [];
    if (!map.etymologies) {
      map.etymologies = [['', '']];
    }
    map.etymologies.forEach(
      (currentEtymology: [string, string], index: number): void => {
        const nextEtymology: [string, string] = index + 1 < map.etymologies.length ? map.etymologies[index + 1] : ['999', ''];
        const dataObject: WordData = new WordData();
        dataObject.etymology = currentEtymology[1];
        map.pronunciations.forEach(
          ([pronunciationIndex, text, audioLinks]: [string, Array<string>, Array<string>]): void => {
            if (
              this.countDigits(currentEtymology[0]) === this.countDigits(pronunciationIndex) ||
              (currentEtymology[0] <= pronunciationIndex && pronunciationIndex < nextEtymology[0])
            ) {
              dataObject.pronunciations = text;
              dataObject.audioLink = audioLinks;
            }
          }
        );
        map.definitions.forEach(
          ([definitionIndex, definitionText, definitionType]: [string, Array<string>, string]): void => {
            const currentEtymologyStr: string = padMultilevel(currentEtymology[0]);
            const definitionIndexStr: string = padMultilevel(definitionIndex);
            const nextEtymologyStr: string = padMultilevel(nextEtymology[0]);

            if (
              (currentEtymologyStr <= definitionIndexStr && definitionIndexStr < nextEtymologyStr) ||
              this.isSubHeading(currentEtymology[0], definitionIndex)
            ) {
              const definitionObject: Definition = new Definition();
              definitionObject.text = definitionText;
              definitionObject.partOfSpeech = definitionType;
              map.examples.forEach(
                ([exampleIndex, examples, _]: [string, Array<string>, string]): void => {
                  if (exampleIndex.startsWith(definitionIndex)) {
                    definitionObject.examples = examples;
                  }
                }
              );
              map.related.forEach(
                ([relatedWordIndex, relatedWords, relationType]: [string, Array<string>, string]): void => {
                  if (relatedWordIndex.startsWith(definitionIndex)) {
                    definitionObject.relatedWords.push(new RelatedWord(relationType, relatedWords));
                  }
                }
              );
              dataObject.definitions.push(definitionObject);
            }
          }
        );
        jsonObjectList.push(dataObject);
      }
    );
    return jsonObjectList;
  }

  private countDigits(text: string): number {
    return text.split('').filter((d: string): boolean => !isNaN(parseInt(d, 10))).length;
  }

  private isSubHeading(child: string, parent: string): boolean {
    const childHeadings: Array<string> = child.split('.');
    const parentHeadings: Array<string> = parent.split('.');
    if (childHeadings.length <= parentHeadings.length) {
      return false;
    }
    for (let i: number = 0; i < parentHeadings.length; i++) {
      if (childHeadings[i] !== parentHeadings[i]) {
        return false;
      }
    }
    return true;
  }

  private cleanHTML(): void {
    this.unwantedClasses.forEach(
      (className: string): void => {
        Array.from(this.document.getElementsByClassName(className)).forEach(
          (element: Element): Element => element.parentElement!.removeChild(element)
        );
      }
    );
  }

  private async download(word: string): Promise<string> {
    return new Promise<string>((resolve: (text: string) => void): void => {
      https.get(this.url(word), (response: IncomingMessage): void => {
        let body: string = '';
        response.on('data', (chunk: Buffer): string => body += chunk);

        response.on('end', (): void => resolve(body));
      });
    });
  }
}
