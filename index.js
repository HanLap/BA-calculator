const fs = require('fs');
const pdf = require('pdf-parse');
const _ = require('lodash');


const regex = /^([0-9]*)?([a-zA-Z0-9\-\s\/-:äöüß]*)?([1-5],[0-9])?(\d?[0-9]|[1-9]0)$/;
const gradeRegEx = /^-?\d+(?:\.\d{0,1})?/;


if (!process.argv[1]) {
  console.log('no command line args');
  process.exit(1);
}

try {
  let dataBuffer = fs.readFileSync(process.argv[1]);
  parse(dataBuffer);
} catch (e) {
  console.error('file not found: ',process.argv[1]);
  console.error(e)
  process.exit(1);
}

function parse(dataBuffer) {
  pdf(dataBuffer).then(function (data) {
    // console.log(data.text); 

    const splits = data.text.split('\n');

    let filtered = _.dropRightWhile(
      _.dropWhile(
        splits,
        str => !str.toLowerCase().match('berechnung durchschnittsnote')
      ),
      str => !str.toLowerCase().match('gesamtleistungspunkte')
    );

    filtered = _.dropRight(_.drop(filtered, 1), 1);

    // filter page break
    let drop = true;
    filtered = filtered.filter(v => {
      if (v.toLowerCase().match('bescheinigung über')) {
        drop = false;
      }
      if (v.toLowerCase().match('bezeichnung der leist')) {
        drop = true;
        return false;
      }
      return drop;
    });

    const parsedArr = filtered
      .map(str => {
        const parsed = regex.exec(str);
        // return parsed;
        return {
          id: parsed[1],
          name: parsed[2],
          grade: parseFloat(parsed[3].replace(',', '.')),
          ects: parseInt(parsed[4])
        };
      });

    const ba = parsedArr.find(module => module.name.toLowerCase().match('bachelorarbeit'));

    const result = parsedArr
      .filter(a => !a.name.toLowerCase().match('bachelorarbeit'))
      .sort((a, b) => {
        return b.grade < a.grade ? 1 : -1;
      })
      .reduce((acc, a) => {
        if (acc.ects >= 90) {
          return acc;
        }
        console.log(`${a.grade}\t${a.ects}\t${a.name}`);
        return {
          ects: acc.ects + a.ects,
          grade: acc.grade + a.grade * a.ects
        };
      },
        { ects: 0, grade: 0.0 });

    if (ba) {
      result.grade += ba.grade * ba.ects;
      result.ects += ba.ects;
      console.log(`${ba.name.substr(0, 20)}:\t ${ba.grade}\t${ba.ects}`);
    }

    console.log('grade:\t\tects:')
    console.log(`  ${(result.grade / result.ects).toString().match(gradeRegEx)}\t\t  ${result.ects}`);
    process.exit(1);
  });
}