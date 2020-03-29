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
}

let lineType = line => {
    let type = line.match('([0-9]+. |\\* )') ? 'list' 
             : line.match('(#+ )')           ? 'title'
             : line.match('(^\n)')           ? 'newLine'
             : line.match('```')             ? 'code'
             : 'paragraph';

    return { text: line, type };
}  

let cleanLine = line => {
    line.text = line.text.replace(/(#+ )/, '');
    return line;
}

// Encapsulación por Closure
let saveState = () => {
    let last = null;

    let addNewLine = (line) => {

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
        if (line.text === '```' && last !== 'code') {
            last = 'code';
        } else if (last === 'code') {
            line.text = '    ' + line.text;
        } else if (last === 'code' && line.type === 'code') {
            last = 'paragraph';
        }

        return line;
    }

    return { addNewLine, prettifyCode };
} 

let addIdent = (line) => {
    if (line.type === 'list') {
        line.text = '    ' + line.text;
    }
    return line;
}

// Uso de Currying
let outputFile = fileName => {
    fs.writeFile(fileName, '', () => console.log('File created'));
    const logger = fs.createWriteStream(fileName, {
        flags: 'a'
    })

    let writeToFile = line => {
        if (line.type !== 'code') {
            logger.write(line.text);
        } else {
            logger.write('\n');
        }
    }
    return writeToFile;
}

// Uso de Destructuring
let { addNewLine, prettifyCode } = saveState();
let outputWrite = outputFile('output.txt');

let pipeline = pipe([lineType, cleanLine, addIdent, prettifyCode, addNewLine, outputWrite]);


let lineGen = lineGenerator(process.argv[2]);
let lines = Array.from(lineGen);
lines.map(x => pipeline(x));

