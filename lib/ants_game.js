'use strict';

/**
 * Represents an insect (e.g., an Ant or a Bee) in the game
 * This class should be treated as abstract
 */
class Insect {
  constructor(armor, place) {
    this._armor = armor;
    this._place = place;
  }
  
  get armor() {
    return this._armor;
  }
  
  reduceArmor(amount) {
    this._armor -= amount;
    if(this._armor <= 0){
      console.log(this.toString()+' ran out of armor and expired');
      this.place = undefined;
    }
  }

  get place(){
    return this._place;
  }
  
  set place(place){
    if(place === undefined){ //if being removed
      this._place._removeInsect(this);
      this._place = undefined;
    }
    else if(place._addInsect(this)){ //try to go to new place
      if(this._place !== undefined){
        this._place._removeInsect(this); //leave old place
      }
      this._place = place; //save our new location
    }
  }
  
  toString() {
    return this.name + '('+(this.place ? this.place.name : '')+')';
  }
}

/**
 * Represents a Bee (the antagonist!)
 */
class Bee extends Insect {
  constructor(armor, place){
    super(armor, place);
    this.name = 'Bee';
    this._damage = 1;
  }
  
  sting(ant){
    console.log(this+ ' stings '+ant+'!');
    ant.reduceArmor(this._damage);
  }
  
  get blocked() {
    return this.place.ant !== undefined;
  }
  
  //act on its turn
  act() {
    if(this.blocked){
      this.sting(this.place.ant);
    }
    else if(this.armor > 0) {
      this.place = this.place.exit;
    }
  }
}

/**
 * A class representing a basic Ant.
 * This class should be treated as abstract
 */
class Ant extends Insect {
  constructor(armor, cost, place){
    console.log("===DEBUG=== Armor: " + armor + " Cost: " + cost + " Place: " + place);
    super(armor, place);
    this._name = 'Ant'; //for display
    this._foodCost = cost;
  }
  
  get foodCost() {
    return this._foodCost;
  }
  
  get name() {
    return this._name;
  }
}


/**
 * Represents a location in the game
 */
class Place {
  constructor(name, exit, entrance) {
    this.name = name;
    this._bees = [];
    this._ant = undefined; //placeholder for code clarity
    this.exit = exit;
    this.entrance = entrance;
  }
  
  _addInsect(insect){
    if(insect instanceof Bee){
      this._bees.push(insect);
      return true;
    }
    else if(this._ant === undefined){
      this._ant = insect;
      return true;
    }
    else {
      return false; //could not add insect
    }
  }
  
  _removeInsect(insect){
    if(insect instanceof Bee){
      var index = this._bees.indexOf(insect);
      if(index >= 0){
        this._bees.splice(index,1);
      }
    }
    else {
      this._ant = undefined;
    }

  }
  
  get ant() { 
    return this._ant; 
  }
  
  get bees() {
    return this._bees;
  }
  
  //Returns a nearby bee, between the minDistance and the maxDistance ahead. 
  //If multiple bees are the same distance, a random bee is chosen
  getClosestBee(minDistance, maxDistance) {
		var p = this;
		for(var dist = 0; p!==undefined && dist <= maxDistance; dist++)
		{
			if(dist >= minDistance && p.bees.length > 0) {
				return p.bees[Math.floor(Math.random()*p.bees.length)]; //pick a random bee
      }
			p = p.entrance;
		}
		return undefined; //no bee found
  }

  toString() {
    return `Place[$(this.name)]`;
  }
}

/**
 * An entire colony of ants and their tunnels
 */
class AntColony {
  constructor(startingFood, numTunnels, tunnelLength, moatFrequency){
    var MAX_TUNNEL_LENGTH = 8;
    tunnelLength = Math.min(tunnelLength, MAX_TUNNEL_LENGTH); //respect the max-length
    
    this._food = startingFood;

    this._places = []; //2d-array storage for easy access
    this._beeEntrances = [];
    this._queenPlace = new Place('Ant Queen');
    
    //sets up a tunnels, which are linked-lists of places
    var prev, curr, typeName;
		for(var tunnel=0; tunnel < numTunnels; tunnel++)
		{
			curr = this._queenPlace; //start the tunnels at the queen
      this._places[tunnel] = [];
			for(var step=0; step < tunnelLength; step++)
			{
        //water or not?
        typeName = 'tunnel';
        if(moatFrequency !== 0 && (step+1)%moatFrequency === 0){ //if we have moats and we're on a moat count (starting at 1)
          typeName = 'water';
				}
				
				prev = curr; //keep track of the previous guy (who we will exit to)
        var locationId = tunnel+','+step; //location id string
        curr = new Place(typeName+'['+locationId+']', prev); //create new place with an exit that is the previous spot
				prev.entrance = curr; //the previous person's entrance is the new spot
				this._places[tunnel][step] = curr; //keep track of new place
			}
			this._beeEntrances.push(curr); //current place is last item in the tunnel, so mark that it is a bee entrance
		} //loop to next tunnel
  }
  
  get food() {
    return this._food;
  }
  
  increaseFood(amount){
    this._food += amount;
  }
  
  //returns a 2d-array of the places
  get places() {
    return this._places;
  }
  
  get entrances() {
    return this._beeEntrances;
  }
  
  get queenPlace() {
    return this._queenPlace;
  }
  
  get queenHasBees() {
    return this._queenPlace.bees.length > 0;
  }

  deployAnt(place, ant){
    if(this._food >= ant.foodCost){
      this._food -= ant.foodCost;
      ant.place = place; //assign the ant
      return ant.place === place; //return if could place the ant
    }
    else {
      return false; //could not place the ant
    }
  }
  
  removeAnt(place){
    place.ant = undefined;
  }
  
  //return all ants currently in the colony
  get allAnts() {
    var ants = [];
    for(var i=0; i<this._places.length; i++){
      for(var j=0; j<this._places[i].length; j++){
        if(this._places[i][j].ant !== undefined){
          ants.push(this._places[i][j].ant);
        }
      }
    }
    return ants;
  }
  
  //return all bees currently in the colony
  get allBees() {
    var bees = [];
    for(var i=0; i<this._places.length; i++){
      for(var j=0; j<this._places[i].length; j++){
        bees = bees.concat(this._places[i][j].bees);
      }
    }
    return bees;    
  }
  
  //Creates a default starting colony
  static createDefaultColony() {
    return new AntColony(2, 1,8,0);
  }

  //Creates a testing colony with extra food
  static createTestColony() {
    return new AntColony(10, 1,8,0);
  }

  //Creates a full colony with 3 tunnels
  static createFullColony() {
    return new AntColony(2, 3,8,0);
  }

  //Creates a full colony with three tunnels and moats
  static createWetColony() {
    return new AntColony(2, 3,8,3);
  }
}



class Hive extends Place {
  constructor(beeArmor){
    super('Hive');
    this._beeArmor = beeArmor;
    this._waves = {};
  }

  //Adds a wave of attacking bees to this hive
  addWave(attackTurn, numBees){
    var wave = [];
    for(var i=0; i<numBees; i++){
      var bee = new Bee(this._beeArmor, this);
      wave.push(bee);
      bee.place = this;
      this._bees.push(bee); //explicitly position the bee; workaround for bug(?)
    }
    this._waves[attackTurn] = wave;
    return this;
  }
  
  //Moves in the invaders who are attacking the colony on the given turn
  invade(colony, time){
    if(this._waves[time] !== undefined){
      this._waves[time].forEach(function(bee){
        var randEntrance = Math.floor(Math.random()*colony.entrances.length);
        bee.place = colony.entrances[randEntrance];       
      });
      return this._waves[time]; //return list of new bees
    }
    else{
      return []; //no bees attacking 
    }    
  }
  
  //Creates a hive with two attacking bees
  static createTestHive() {
    var hive = new Hive(3)
              .addWave(2,1)
              .addWave(3,1);
    return hive;
  }
  
  //Creates a hive filled with attacking bees
  static createFullHive() {
    var hive = new Hive(3)
              .addWave(2,1);
    for(var i=3; i<15; i+=2){
      hive.addWave(i, 1);
    }
    hive.addWave(15,8);
    return hive;
  }
  
  //Creates a hive filled with a huge number of powerful attacking bees
  static createInsaneHive() {
    var hive = new Hive(4)
              .addWave(1,2);
    for(var i=3; i<15; i+=2){
      hive.addWave(i, 1);
    }
    hive.addWave(15,20);
    return hive;
  }  
}


class AntGame {
  constructor(colony, hive){
    this._colony = colony;
    this._hive = hive;
    this._turn = 0;
  }
  
  //execute a turn
  takeTurn() {
    //all ants take a turn
    this._colony.allAnts.forEach(function(ant){
      ant.act(this._colony); //pass in colony reference if needed
    }, this);
    
    //all bees take a turn
    this._colony.allBees.forEach(function(bee){
      bee.act();
    }, this);
    
    //new bees arrive
    this._hive.invade(this._colony, this._turn);
    
    //turn finished
    this._turn++;    
  }

  get turn() {
    return this._turn;
  }

  //returns true if the game is won, false if lost, and undefined if ongoing
  get gameWon() {
    if(this._colony.queenHasBees){ //queen has been reached
      return false; //we won!
    }
    else if(this._colony.allBees.length + this._hive.bees.length === 0){ //no more bees!
      return true; //we won!
    }
    
    return undefined; //ongoing
  }

  //User control: deploy an ant of the given type
  //@param antType should be a String (subclass name)
  //@param placeName should be a String (form: "0,1" [tunnel,step])
  deployAnt(antType, placeName){
    try{ //brute force error catching
      var loc = placeName.split(',');
      var place = this._colony._places[loc[0]][loc[1]];
      var ant = new Ants[antType]();
      return this._colony.deployAnt(place, ant);
      //return true; //success
    }catch(e){
      return false; //error = failure
    }
  }

  //User control: remove an ant from the given place
  //@param placeName should be a String (form: "0,1" [tunnel,step])
  removeAnt(placeName){
    try { //brute force error catching
      var loc = placeName.split(',');
      var place = this._colony._places[loc[0]][loc[1]];
      place.ant.place = undefined; //take ant who was there and have him leave (circular)
      return true; //success
    }catch(e){
      return false; //error = failure
    }
  }
  
  get colony(){
    return this._colony;
  }
  
  get hive(){
    return this._hive;
  }
  
}


/*************
 * ANT TYPES *
 *************/

//an object to hold subclasses / give them specific namespaces
var Ants = {
  //grower type
  Grower : class extends Ant {
    constructor() {
      super(1,2);
      this._name = 'Grower';
    }
    
    act(colony) { 
        colony.increaseFood(1);
    }
  },
  
  //thrower type
  Thrower : class extends Ant {
    constructor()  {
      super(1,4);
      this._name = 'Thrower';
      this._damage = 1;
    }
  
    act() {
      var target = this.place.getClosestBee(0,3);
      if(target){
        console.log(this + ' throws a leaf at '+target);
        target.reduceArmor(this._damage);
      }        
    }
  },
  
  Wall : class extends Ant {
    constructor() {
      super(4,4);
      this._name = 'Wall';
    }
    
    act() {
      
    }
  },
  
  Hungry : class extends Ant {
    constructor() {
      super(1,4);
      this._name = 'Hungry';
      this._hunger = 3;
    }
    
    act() {
      if (this._hunger == 3) {
        var target = this.place.getClosestBee(0, 0);
        if (target) {
          console.log(this + ' devouered ' + target);
          target.reduceArmor(target.armor);
          this._hunger = 0;
        }
      } else {
        this._hunger += 1;
      }
    }
  },
  
  Fire : class extends Ant {
    constructor() {
      super(1,4);
      this._name = 'Fire';
      this._aftermathDamage = 3;
    }
    
    act() {
        
    }
    
    reduceArmor(amount) {
      if (this._armor <= 0) {
        console.log(this.toString() + ' exploded and caused damage to bees around it!');
        console.log(this.place);
        var bees = this.place.bees;
        for (var i = 0; i < bees.length; i++) {
          bees[i].reduceArmor(this._aftermathDamage);
        }
      }
      super.reduceArmor(amount); 
    }
  }
  
  //other types go here!
  //declare as SubclassName : class definition
  //so that the SubclassName acts as a key to find the class definition
};


//export classes to be available to other modules. Note that this does expose some of the other classes
module.exports.Hive = Hive;
module.exports.AntColony = AntColony;
module.exports.AntGame = AntGame;

