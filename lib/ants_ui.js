'use strict';

var ants = require('./ants_game.js'); //load the ant engine
var vorpal = require('vorpal')(); //cli
var clc = require('cli-color'); //for colors
var emoji = require('node-emoji').emoji;
var _ = require('underscore'); //for easy processing

//make the engine available (for creating games)
module.exports = ants; 

//Returns a string representation of the current map
//Uses ANSI coloring
function getMap(game) {
  var places = game.colony.places;
  var tunnelLength = places[0].length;
  var beeIcon = clc.bgYellowBright.black('B');
  //var beeIcon = emoji.bee;
   
  var map = '';

  //header
  map += clc.bold('The Colony is under attack!\n');
  map += 'Food: '+game.colony.food+', Turn: '+game.turn+'\n';
  map += '     '+_.range(0,tunnelLength).join('    ')+'      Hive'+'\n'; //number line
   
  //for each tunnel
  var i, j, place; //declare loop variables
  for(i=0; i<places.length; i++){
    map += '    '+Array(tunnelLength+1).join('=====');
    
    if(i===0){ //top row, show the hive
      map += '    ';
      if(game.hive.bees.length > 0){
        map += beeIcon;
        map += (game.hive.bees.length > 1 ? game.hive.bees.length : ' ');
      }
    }
    map += '\n'; //top divider

    map += i+')  '; //tunnel number
    //map += String.fromCharCode(97+i)+')  '; //ascii convert number to letter
      
    //for each room
    for(j=0; j<places[i].length; j++){ //draw each room content
      place = places[i][j]; //vary based on place

      //output ant (if any)
      map += (place.ant ? iconFor(place.ant) : ' ');
      map += ' '; //spacer

      //output bees (if any)
      if(place.bees.length > 0){
        map += beeIcon;
        map += (place.bees.length > 1 ? place.bees.length : ' ');
      } else {
        map += '  '; //spaces instead
      }
      map += ' '; //spacer
    }
    map += '\n    ';
    for(j=0; j<places[i].length; j++){ //draw each room footer
      place = places[i][j];
      if(!place.water){
        map += '==== '; //draw the tunnel footer
      } else {
        map += clc.bgCyan('~~~~')+' '; //draw the water footer
      }
    }
    map += '\n';
  }
  map += '     '+_.range(0,tunnelLength).join('    ')+'\n'; //number line

  return map; //return this map for output
}

//Convenience function for printing the map of the game (external)
ants.showMapOf = function(game){
  console.log(getMap(game));
};


//A list of icons associated with each ant name
var antIcons = {
  'Grower': clc.greenBright('G'),
  'Thrower': clc.greenBright('T'),
  'Wall': clc.yellow('W'),
  'Hungry': clc.red('H'),
  'Fire': clc.redBright('F'),
  'Scuba': clc.cyanBright('S'),
  'Ninja': clc.blackBright('N'),
  'Bodyguard': clc.bgGreen('x'),
  'Queen': clc.magenta('Q'),
  'undefined': ' ' //for nothing
};

//Returns a formatted single-character "icon" for the given ant
//Uses ANSI coloring
function iconFor(ant){
  var icon, container;
  
  if(ant.contained){ //if ant holds another (e.g., bodyguard)
    container = true; //note there is a container
    ant = ant.contained; //ant is now whoever is inside
  }

  icon = antIcons[ant.name];
  if(icon === undefined){
    icon = '?'; //unrecognized
  }

  if(container){
    icon = clc.bgGreen(icon); //draw container as green background
  }
  
  return icon;
}


/**
 * Run interactive command-line interface for the given game
 */
ants.play = function(game){

  //vorpal CLI tool
  vorpal
    .delimiter(clc.green('AvB $')) //specify prompt
    .log(getMap(game))
    .show();

  vorpal
    .command('show', 'Shows the current game board.')
    .action(function(args, callback){
      vorpal.log(getMap(game));
      callback();
    });

  vorpal
    .command('deploy <antType> <tunnel>', 'Deploys an ant to tunnel (as "row,col" eg. "0,6").')
    .alias('add')
    .action(function(args, callback) {
      if(!antIcons[args.antType]){
        vorpal.log('Invalid ant type. Types are: '+Object.keys(antIcons).join(', '));
      }
      else if(!game.deployAnt(args.antType, args.tunnel)){
        vorpal.log('Invalid deployment. Is the tunnel location correct?');
      }
      else {
        vorpal.log(getMap(game)); //reshow the map?
      }
      callback(); //asks for next prompt
    });

  vorpal
    .command('remove <tunnel>', 'Removes the ant from the tunnel (as "row,col" eg. "0,6").')
    .action(function(args, callback){
      
      if(!game.removeAnt(args.tunnel)){
        vorpal.log('Invalid removal. Is the tunnel location correct?');      
      }
      else {
        vorpal.log(getMap(game)); //reshow the map?
      }
      callback(); //asks for the next prompt
    });

  vorpal
    .command('turn', 'Ends the current turn. Ants and bees will act.')
    .alias('end turn', 'take turn')
    .action(function(args, callback){
      game.takeTurn();
      vorpal.log(getMap(game));
      var won = game.gameWon;
      if(won === true){
        vorpal.log(clc.green('Yaaaay---\nAll bees are vanquished. You win!\n'));
      }
      else if(won === false){
        vorpal.log(clc.yellow('Bzzzzz---\nThe ant queen has perished! Please try again.\n'));
      }
      else {
        callback(); //game is still going, so ask for next prompt
      }
    });
};
