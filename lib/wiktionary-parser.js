"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WiktionaryParser = void 0;
const https_1 = __importDefault(require("https"));
const jsdom_1 = require("jsdom");
const definition_1 = require("./definition");
const word_data_1 = require("./word-data");
const content_type_1 = require("./content-type");
const related_word_1 = require("./related-word");
const capitalise_initials_1 = require("./capitalise-initials");
const pad_multilevel_1 = require("./pad-multilevel");
class WiktionaryParser {
    constructor() {
        this.relations = [
            'synonyms', 'antonyms', 'hypernyms', 'hyponyms', 'meronyms', 'holonyms', 'troponyms', 'related terms', 'coordinate terms'
        ];
        this.partsOfSpeech = [
            'noun', 'verb', 'adjective', 'adverb', 'determiner', 'article', 'preposition', 'conjunction', 'proper noun', 'letter',
            'character', 'phrase', 'proverb', 'idiom', 'symbol', 'syllable', 'numeral', 'initialism', 'interjection', 'definitions',
            'pronoun', 'particle', 'predicative', 'participle', 'suffix'
        ];
        this.includedItems = this.relations.concat(this.partsOfSpeech).concat(['etymology', 'pronunciation']);
        this.unwantedClasses = ['sister-wikipedia', 'thumb', 'reference', 'cited-source'];
        this.language = 'english';
    }
    get document() {
        return this.dom.window.document;
    }
    parse(word, language = 'english') {
        return __awaiter(this, void 0, void 0, function* () {
            const html = yield this.download(word);
            // create DOM object
            this.currentWord = word;
            this.language = language.toLowerCase();
            this.dom = new jsdom_1.JSDOM(html);
            this.cleanHTML();
            return this.getWordData(this.language);
        });
    }
    url(word) {
        return `https://en.wiktionary.org/wiki/${word}?printable=yes`;
    }
    getWordData(language) {
        const contents = Array.from(this.document.querySelectorAll('span.toctext'));
        const wordContents = [];
        let startIndex = null;
        contents.forEach((element) => {
            var _a, _b;
            if (((_a = element.textContent) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase()) === language) {
                startIndex = ((_b = element.previousElementSibling) === null || _b === void 0 ? void 0 : _b.textContent) + '.';
            }
        });
        if (startIndex === null) {
            if (!!contents) {
                return [];
            }
            const languageHeading = Array.from(this.document.querySelectorAll('span#mw-headline'))
                .find((element) => { var _a; return ((_a = element.textContent) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === language; });
            if (!languageHeading) {
                return [];
            }
        }
        contents.forEach((element) => {
            const index = element.previousElementSibling.textContent;
            const contentText = element.textContent.replace(/[0-9]/g, '').trim();
            if ((index === null || index === void 0 ? void 0 : index.startsWith(startIndex)) && this.includedItems.indexOf(contentText.toLowerCase()) > -1) {
                wordContents.push(element);
            }
        });
        return this.mapToObject({
            examples: this.parseExamples(wordContents),
            definitions: this.parseDefinitions(wordContents),
            etymologies: this.parseEtymologies(wordContents),
            related: this.parseRelatedWords(wordContents),
            pronunciations: this.parsePronunciations(wordContents)
        });
    }
    parseExamples(wordContents) {
        const definitionIdList = this.getIdList(wordContents, content_type_1.ContentType.DEFINITIONS);
        const exampleList = [];
        definitionIdList.forEach(([definitionIndex, definitionId, definitionType]) => {
            const spanTag = this.document.querySelector(`span#${definitionId}`);
            let table = spanTag.parentElement;
            while (table.tagName !== 'OL') {
                table = table.nextElementSibling;
            }
            const examples = [];
            while (!!table && table.tagName === 'OL') {
                table.querySelectorAll('dd').forEach((dd) => {
                    const exampleText = dd.textContent.trim().replace(/\([^)]*\)/, '');
                    if (!!exampleText) {
                        examples.push(exampleText);
                    }
                    dd.innerHTML = '';
                });
                exampleList.push([definitionIndex, examples, definitionType]);
                Array.from(table.querySelectorAll('ul')).concat(Array.from(table.querySelectorAll('ol'))).forEach((list) => {
                    list.innerHTML = '';
                });
                table = table.nextElementSibling;
            }
        });
        return exampleList;
    }
    parseDefinitions(wordContents) {
        const definitionIdList = this.getIdList(wordContents, content_type_1.ContentType.DEFINITIONS);
        const definitionList = [];
        let definitionTag = null;
        definitionIdList.forEach(([definitionIndex, definitionId, definitionType]) => {
            var _a;
            const definitionText = [];
            const spanTag = this.document.querySelector(`span#${definitionId}`);
            let table = spanTag.parentElement.nextElementSibling;
            while (!!table && ['H3', 'H4', 'H5'].indexOf(table.tagName) === -1) {
                definitionTag = table;
                table = table.nextElementSibling;
                if (definitionTag.tagName === 'P') {
                    if (!!((_a = definitionTag.textContent) === null || _a === void 0 ? void 0 : _a.trim())) {
                        definitionText.push(definitionTag.textContent.trim());
                    }
                }
                if (['OL', 'UL'].indexOf(definitionTag.tagName) > -1) {
                    Array.from(definitionTag.children).forEach((li) => {
                        if (!!li.textContent) {
                            definitionText.push(li.textContent.trim());
                        }
                    });
                }
            }
            if (definitionType === 'definitions') {
                definitionType = '';
            }
            definitionList.push([definitionIndex, definitionText, definitionType]);
        });
        return definitionList;
    }
    parseEtymologies(wordContents) {
        const etymologyIdList = this.getIdList(wordContents, content_type_1.ContentType.ETYMOLOGIES);
        const etymologyList = [];
        let etymologyTag = null;
        etymologyIdList.forEach(([etymologyIndex, etymologyId, _]) => {
            let etymologyText = '';
            const span = this.document.querySelector(`span#${etymologyId}`);
            let nextTag = span.parentElement.nextElementSibling;
            while (!!nextTag && ['H3', 'H4', 'DIV', 'H5'].indexOf(nextTag.tagName) === -1) {
                etymologyTag = nextTag;
                nextTag = nextTag.nextElementSibling;
                if (etymologyTag.tagName === 'P') {
                    etymologyText += etymologyTag.textContent;
                }
                else {
                    etymologyTag.querySelectorAll('li').forEach((li) => etymologyText += li.textContent + '\n');
                }
            }
            etymologyList.push([etymologyIndex, etymologyText.trim()]);
        });
        return etymologyList;
    }
    parseRelatedWords(wordContents) {
        const relationIdList = this.getIdList(wordContents, content_type_1.ContentType.RELATED);
        const relatedWordList = [];
        relationIdList.forEach(([relatedIndex, relatedId, relationType]) => {
            const words = [];
            const spanTag = this.document.querySelector(`span#${relatedId}`);
            let parent = spanTag.parentElement;
            let listElements = parent.querySelectorAll('li');
            while (!!parent && !listElements.length) {
                parent = parent.nextElementSibling;
                listElements = parent.querySelectorAll('li');
            }
            if (!!parent) {
                Array.from(listElements).forEach((li) => {
                    words.push(li.textContent);
                });
            }
            relatedWordList.push([relatedIndex, words, relationType]);
        });
        return relatedWordList;
    }
    parsePronunciations(wordContents) {
        const pronunciationIdList = this.getIdList(wordContents, content_type_1.ContentType.PRONUNCIATION);
        const pronunciationList = [];
        const audioLinks = [];
        const pronunciationDivClasses = ['mw-collapsible', 'vsSwitcher'];
        pronunciationIdList.forEach(([pronunciationIndex, pronunciationId, _]) => {
            const pronunciationText = [];
            const spanTag = this.document.querySelector(`span#${pronunciationId}`);
            let list = spanTag.parentElement;
            while ((list === null || list === void 0 ? void 0 : list.tagName) !== 'UL') {
                list = list.nextElementSibling;
                if ((list === null || list === void 0 ? void 0 : list.tagName) === 'P') {
                    pronunciationText.push(list.textContent);
                    break;
                }
                if ((list === null || list === void 0 ? void 0 : list.tagName) === 'DIV' &&
                    pronunciationDivClasses.some((className) => list.classList.contains(className))) {
                    break;
                }
            }
            Array.from(list.querySelectorAll('sup')).forEach((sup) => sup.innerHTML = '');
            Array.from(list.querySelectorAll('li')).forEach((li) => {
                Array.from(li.querySelectorAll('.audiotable audio source')).forEach((audioTag) => {
                    audioLinks.push(audioTag.src);
                    audioTag.parentElement.removeChild(audioTag);
                });
                Array.from(li.querySelectorAll('ul')).forEach((ul) => ul.parentElement.removeChild(ul));
                const audioTables = li.querySelectorAll('table.audiotable');
                if (!!li.textContent && !audioTables.length) {
                    pronunciationText.push(li.textContent.trim());
                }
            });
            pronunciationList.push([pronunciationIndex, pronunciationText, audioLinks]);
        });
        return pronunciationList;
    }
    getIdList(contents, contentType) {
        let checklist;
        if (contentType === content_type_1.ContentType.ETYMOLOGIES) {
            checklist = ['etymology'];
        }
        else if (contentType === content_type_1.ContentType.PRONUNCIATION) {
            checklist = ['pronunciation'];
        }
        else if (contentType === content_type_1.ContentType.DEFINITIONS) {
            checklist = this.partsOfSpeech;
            if (this.language === 'chinese') {
                checklist.push(this.currentWord);
            }
        }
        else if (contentType === content_type_1.ContentType.RELATED) {
            checklist = this.relations;
        }
        else {
            return [];
        }
        const idList = [];
        if (!contents.length) {
            return checklist
                .filter((check) => !!this.document.querySelector(`span#${(0, capitalise_initials_1.capitaliseInitials)(check)}`))
                .map((check) => ['1', (0, capitalise_initials_1.capitaliseInitials)(check), check]);
        }
        contents.forEach((content) => {
            const contentIndex = content.previousElementSibling.textContent;
            const textToCheck = content.textContent.replace(/[0-9]/g, '').trim().toLowerCase();
            if (checklist.indexOf(textToCheck) > -1) {
                const contentId = content.parentElement.getAttribute('href').replace('#', '');
                idList.push([contentIndex, contentId, textToCheck]);
            }
        });
        return idList;
    }
    mapToObject(map) {
        const jsonObjectList = [];
        if (!map.etymologies) {
            map.etymologies = [['', '']];
        }
        map.etymologies.forEach((currentEtymology, index) => {
            const nextEtymology = index + 1 < map.etymologies.length ? map.etymologies[index + 1] : ['999', ''];
            const dataObject = new word_data_1.WordData();
            dataObject.etymology = currentEtymology[1];
            map.pronunciations.forEach(([pronunciationIndex, text, audioLinks]) => {
                if (this.countDigits(currentEtymology[0]) === this.countDigits(pronunciationIndex) ||
                    (currentEtymology[0] <= pronunciationIndex && pronunciationIndex < nextEtymology[0])) {
                    dataObject.pronunciations = text;
                    dataObject.audioLink = audioLinks;
                }
            });
            map.definitions.forEach(([definitionIndex, definitionText, definitionType]) => {
                const currentEtymologyStr = (0, pad_multilevel_1.padMultilevel)(currentEtymology[0]);
                const definitionIndexStr = (0, pad_multilevel_1.padMultilevel)(definitionIndex);
                const nextEtymologyStr = (0, pad_multilevel_1.padMultilevel)(nextEtymology[0]);
                if ((currentEtymologyStr <= definitionIndexStr && definitionIndexStr < nextEtymologyStr) ||
                    this.isSubHeading(currentEtymology[0], definitionIndex)) {
                    const definitionObject = new definition_1.Definition();
                    definitionObject.text = definitionText;
                    definitionObject.partOfSpeech = definitionType;
                    map.examples.forEach(([exampleIndex, examples, _]) => {
                        if (exampleIndex.startsWith(definitionIndex)) {
                            definitionObject.examples = examples;
                        }
                    });
                    map.related.forEach(([relatedWordIndex, relatedWords, relationType]) => {
                        if (relatedWordIndex.startsWith(definitionIndex)) {
                            definitionObject.relatedWords.push(new related_word_1.RelatedWord(relationType, relatedWords));
                        }
                    });
                    dataObject.definitions.push(definitionObject);
                }
            });
            jsonObjectList.push(dataObject);
        });
        return jsonObjectList;
    }
    countDigits(text) {
        return text.split('').filter((d) => !isNaN(parseInt(d, 10))).length;
    }
    isSubHeading(child, parent) {
        const childHeadings = child.split('.');
        const parentHeadings = parent.split('.');
        if (childHeadings.length <= parentHeadings.length) {
            return false;
        }
        for (let i = 0; i < parentHeadings.length; i++) {
            if (childHeadings[i] !== parentHeadings[i]) {
                return false;
            }
        }
        return true;
    }
    cleanHTML() {
        this.unwantedClasses.forEach((className) => {
            Array.from(this.document.getElementsByClassName(className)).forEach((element) => element.parentElement.removeChild(element));
        });
    }
    download(word) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                https_1.default.get(this.url(word), (response) => {
                    let body = '';
                    response.on('data', (chunk) => body += chunk);
                    response.on('end', () => resolve(body));
                });
            });
        });
    }
}
exports.WiktionaryParser = WiktionaryParser;
