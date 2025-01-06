const fs = require('fs').promises;

const getData = async () => {
    try {
        const response = await fs.readFile('paste.txt', { encoding: 'utf8' });
        const processed = response.replace(/\r\n|\r|\n/g, '\\n');
        console.log(processed);
        fs.writeFile('output.txt',processed);
    } catch (error) {
        console.error('Error:', error);
    }
};

getData();