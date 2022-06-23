### Wiktionary Parser

A Typescript clone of the original [WiktionaryParser](https://github.com/Suyash458/WiktionaryParser) that downloads words from Wiktionary ([wiktionary.org](https://wiktionary.org)) and parses them in an easy to use JSON format. Right now, it parses etymologies, definitions, pronunciations, examples, audio links and related words.

#### JSON structure

```json
[{
    "pronunciations": {
        "text": ["pronunciation text"],
        "audio": ["pronunciation audio"]
    },
    "definitions": [{
        "relatedWords": [{
            "relationshipType": "word relationship type",
            "words": ["list of related words"]
        }],
        "text": ["list of definitions"],
        "partOfSpeech": "part of speech",
        "examples": ["list of examples"]
    }],
    "etymology": "etymology text",
}]
```

#### Installation

```bash
npm install parse-wiktionary
```


#### Usage

 - Import the WiktionaryParser class.
 - Initialize an object and use the `parse("word", "language")` method.

#### Examples

```js
const { WiktionaryParser } = require('parse-wiktionary');

const parser = new WiktionaryParser();
const englishResults = parser.parse('test');
const frenchResults = parser.parse('test', 'french');
```

#### Contributions

If you want to add features/improvement or report issues, feel free to send a pull request!

#### License

Wiktionary Parser is licensed under [MIT](LICENSE.txt).
