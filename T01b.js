const fs = require("fs");
const _ = require('lodash');

// Declaración de Pipe
const pipe = functions => data => { 
    return functions.reduce(
        (value, func) => func(value), data
    );
};

// Función generadora para lectura de archivo
function* lineGenerator(fileName) {
    const text = fs.readFileSync(fileName);
    let textByLine = text.toString().split("\n");
    for (let line of textByLine) {
        yield line;
    }
    yield undefined;
}

let lineType = line => {
    if (line === undefined)
        return undefined;
    let type = line.match('([0-9]+.)')       ? 'olist' 
             : line.match('(\\*)')           ? 'ulist' 
             : line.match('(#+ )')           ? 'title'
             : line.match('(^\n)')           ? 'newLine'
             : line.match('```')             ? 'code'
             : 'paragraph';
    return { text: line, type };
}  

// Chaining Example
let formatTitle = line => {
    if (line === undefined)
    return undefined;
    if (line.type === 'title') {
        let titleSize = line.text
            .split('')
            .map( 
                function(e, i) {
                    if(e === '#'){
                        return i;
                    } 
                })
            .filter(item => item !== undefined)
            .length

        line.text = line.text
            .trim()
            .replace(/(#+ )/, `<h${titleSize}>`) + `</h${titleSize}>`;
    }
    return line;
}

// Encapsulación por Closure
let saveState = () => {
    let last = null;
    const tagsStack = [];
    const typeTagsMap = {
        'olist' : '<ol>',
        'ulist' : '<ul>',
        'paragraph' : '<p>',
        'code' : '<code><pre>'
    };
    const typeEndTagsMap = {
        'olist' : '</ol>',
        'ulist' : '</ul>',
        'paragraph' : '</p>',
        'code' : '</code></pre>'
    };

    const tagsEnder = (line) => {
        if (line === undefined) {
            line = { text: '\n', type: 'ender' };
            while (tagMapper = tagsStack.pop()) {
                line.text += `${typeEndTagsMap[tagMapper]}\n`;
            }
        }
        return line;
    }

    const tagsManager = (line) => {
        if (line === undefined)
        return undefined;
        if (['olist', 'ulist'].includes(line.type)) {
            line.text = '<li>' + line.text.replace(/([0-9]+. |\* )/, '') + '</li>\n'
        }

        if (last && line.type !== last && last !== 'code') {
            if (['olist', 'ulist', 'newLine', 'paragraph', 'code', 'title'].includes(line.type)) {
                let endTag = typeEndTagsMap[tagsStack.pop()];
                if (endTag === undefined) {
                    endTag = '';
                }
                let currentTag = typeTagsMap[line.type] === undefined? '' :  typeTagsMap[line.type]
                line.text = `${endTag}\n` + currentTag + `\n${line.text}`
                
                tagsStack.push(line.type);
            }
        }
        line.text =  line.text.replace(/\`\`\`/, '')
        return line;
    };

    let addNewLine = (line) => {
        if (line === undefined)
        return undefined;
        if (last && line.type !== last) {
            line.text = '\n' + line.text;
        }

        if (line.type === 'title') {
            line.text += '\n';
        }

        else if (line.type === 'paragraph') {
            line.text += ' ';
        } else if (line.type === 'list') {
            line.text += '\n';
        }

        if (last && line.type === 'list' && line.type !== last) {
            line.text = '\n' + line.text; 
        }

        if (last !== 'code') {
            last = line.type;
        }
        
        return line;
    }

    let prettifyCode = (line) => {
        if (line === undefined)
        return undefined;
        if (line.text === '```' && last !== 'code') {
            last = 'code';
        } else if (last === 'code') {
            line.text = '    ' + line.text;
        } else if (last === 'code' && line.type === 'code') {
            console.log(line.text)
            last = 'paragraph';
        }

        return line;
    }

    return { addNewLine, prettifyCode, tagsManager, tagsEnder };
} 

let addIdent = (line) => {
    if (line === undefined)
    return undefined;
    if (line.type === 'list') {
        line.text = '    ' + line.text;
    }
    return line;
}

// Uso de Currying
let outputFile = fileName => {
    fs.writeFile(fileName, '', () => console.log('File created'));
    const logger = fs.createWriteStream(fileName, {})

    let writeToFile = line => {
        logger.write(line.text);
    }
    return writeToFile;
}


// Uso de Destructuring
let { addNewLine, prettifyCode, tagsManager, tagsEnder } = saveState();
let outputWrite = outputFile('output.html');

let pipeline = pipe([lineType, formatTitle, addIdent, tagsManager, prettifyCode, addNewLine, tagsEnder, outputWrite]);

let lineGen = lineGenerator(process.argv[2]);
let lines = Array.from(lineGen);
lines.map(x => pipeline(x));

