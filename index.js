const fs = require('fs');
const pdf = require('pdf-parse');
const _ = require('lodash');


const regex = /^([0-9]*)?([a-zA-Z0-9\-\säöüß]*)?([1-5],[0-9])?(\d?[1-9]|[1-9]0)$/;
const gradeRegEx = /^-?\d+(?:\.\d{0,1})?/;


let dataBuffer = fs.readFileSync('Durchschnittsnote.pdf');
 
pdf(dataBuffer).then(function(data) {
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

    const result = parsedArr
      .sort((a, b) => {
        return b.grade < a.grade? 1 : -1; 
      })
      .reduce((acc, a) => {
        if(acc.ects >= 90) {
          return acc;
        }
        console.log(`${a.name.substr(0, 20)}:\t ${a.grade}\t${a.ects}`);
        return {
          ects: acc.ects + a.ects,
          grade: acc.grade + a.grade * a.ects
        };
      },
      {ects: 0, grade: 0.0});

    console.log(`grade: ${(result.grade / result.ects).toString().match(gradeRegEx)}\tects: ${result.ects}`);
});