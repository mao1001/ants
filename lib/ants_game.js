'use strict';

class AntGame {
    constructor(colony, hive) {
        this._colony = colony;
        this._hive = hive;
        this._turn = 0;
    }

    //execute a turn
    takeTurn() {
        //all ants take a turn
        this._colony.allAnts.forEach(function(ant) {
            ant.act(this._colony); //pass in colony reference if needed
        }, this);

        //all bees take a turn
        this._colony.allBees.forEach(function(bee) {
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
        if (this._colony.queenHasBees) { //queen has been reached
            this._colony.queen._immovable = false;
            return false; //we won!
        } else if (this._colony.allBees.length + this._hive.bees.length === 0) { //no more bees!
            return true; //we won!
        }

        return undefined; //ongoing
    }

    //User control: deploy an ant of the given type
    //@param antType should be a String (subclass name)
    //@param placeName should be a String (form: "0,1" [tunnel,step])
    deployAnt(antType, placeName) {
        try { //brute force error catching
            var loc = placeName.split(',');
            var place = this._colony._places[loc[0]][loc[1]];
            var ant = new Ants[antType]();
            return this._colony.deployAnt(place, ant);
            //return true; //success
        } catch (e) {
            console.log(e);
            return false; //error = failure
        }
    }

    //User control: remove an ant from the given place
    //@param placeName should be a String (form: "0,1" [tunnel,step])
    removeAnt(placeName) {
        try { //brute force error catching
            var loc = placeName.split(',');
            var place = this._colony._places[loc[0]][loc[1]];
            place.ant.place = undefined; //take ant who was there and have him leave (circular)
            return true; //success
        } catch (e) {
            return false; //error = failure
        }
    }

    get colony() {
        return this._colony;
    }

    get hive() {
        return this._hive;
    }

}

/************
 * PLACES!!! *
 ************/

/**
 * Represents a location in the game
 */
class Place {
    constructor(name, exit, water, entrance) {
        this.name = name;
        this._bees = [];
        this._ant = undefined; //placeholder for code clarity
        this.exit = exit;
        this.entrance = entrance;
        this._water = water;
    }

    _addInsect(insect) {
        if (insect instanceof Bee) {
            this._bees.push(insect);
            return true;
        } else if (this._ant === undefined) {
            this._ant = insect;
            return true;
        } else {
            return false; //could not add insect
        }
    }

    _removeInsect(insect) {
        if (insect instanceof Bee) {
            var index = this._bees.indexOf(insect);
            if (index >= 0) {
                this._bees.splice(index, 1);
            }
        } else if (this._ant.container) {
            var contained = this._ant.contained;
            this._ant = undefined;
            this._addInsect(contained);
        } else if (!insect.immovable) {
            this._ant = undefined;
        }
    }

    get ant() {
        return this._ant;
    }

    get bees() {
        return this._bees;
    }
    
    get water() {
        return this._water;
    }

    //Returns a nearby bee, between the minDistance and the maxDistance ahead. 
    //If multiple bees are the same distance, a random bee is chosen
    getClosestBee(minDistance, maxDistance) {
        var p = this;
        for (var dist = 0; p !== undefined && dist <= maxDistance; dist++) {
            if (dist >= minDistance && p.bees.length > 0) {
                return p.bees[Math.floor(Math.random() * p.bees.length)]; //pick a random bee
            }
            p = p.entrance;
        }
        return undefined; //no bee found
    }

    toString() {
        return `Place[$(this.name)]`;
    }
}

class Hive extends Place {
    constructor(beeArmor) {
        super('Hive');
        this._beeArmor = beeArmor;
        this._waves = {};
    }

    //Adds a wave of attacking bees to this hive
    addWave(attackTurn, numBees) {
        var wave = [];
        for (var i = 0; i < numBees; i++) {
            var bee = new Bee(this._beeArmor, this);
            wave.push(bee);
            bee.place = this;
            this._bees.push(bee); //explicitly position the bee; workaround for bug(?)
        }
        this._waves[attackTurn] = wave;
        return this;
    }

    //Moves in the invaders who are attacking the colony on the given turn
    invade(colony, time) {
        if (this._waves[time] !== undefined) {
            this._waves[time].forEach(function(bee) {
                var randEntrance = Math.floor(Math.random() * colony.entrances.length);
                bee.place = colony.entrances[randEntrance];
            });
            return this._waves[time]; //return list of new bees
        } else {
            return []; //no bees attacking 
        }
    }

    //Creates a hive with two attacking bees
    static createTestHive() {
        var hive = new Hive(3)
            .addWave(2, 1)
            .addWave(3, 1);
        return hive;
    }

    //Creates a hive filled with attacking bees
    static createFullHive() {
        var hive = new Hive(3)
            .addWave(2, 1);
        for (var i = 3; i < 15; i += 2) {
            hive.addWave(i, 1);
        }
        hive.addWave(15, 8);
        return hive;
    }

    //Creates a hive filled with a huge number of powerful attacking bees
    static createInsaneHive() {
        var hive = new Hive(4)
            .addWave(1, 2);
        for (var i = 3; i < 15; i += 2) {
            hive.addWave(i, 1);
        }
        hive.addWave(15, 20);
        return hive;
    }
}

/**
 * An entire colony of ants and their tunnels
 */
class AntColony {
    constructor(startingFood, numTunnels, tunnelLength, moatFrequency) {
        var MAX_TUNNEL_LENGTH = 8;
        tunnelLength = Math.min(tunnelLength, MAX_TUNNEL_LENGTH); //respect the max-length

        this._food = startingFood;

        this._places = []; //2d-array storage for easy access
        this._beeEntrances = [];
        this._hiveCenter = new Place('Ant Queen');
        this._queen = undefined;

        //sets up a tunnels, which are linked-lists of places
        var prev, curr, typeName;
        for (var tunnel = 0; tunnel < numTunnels; tunnel++) {
            curr = this._hiveCenter; //start the tunnels at the queen
            this._places[tunnel] = [];
            for (var step = 0; step < tunnelLength; step++) {

                prev = curr; //keep track of the previous guy (who we will exit to)
                var locationId = tunnel + ',' + step; //location id string
                
                //water or not?
                if (moatFrequency !== 0 && (step + 1) % moatFrequency === 0) { //if we have moats and we're on a moat count (starting at 1)
                    curr = new Place('water' + '[' + locationId + ']', prev, true);
                } else {
                    curr = new Place('tunnel' + '[' + locationId + ']', prev, false); //create new place with an exit that is the previous spot
                }
                
                prev.entrance = curr; //the previous person's entrance is the new spot
                this._places[tunnel][step] = curr; //keep track of new place
            }
            this._beeEntrances.push(curr); //current place is last item in the tunnel, so mark that it is a bee entrance
        } //loop to next tunnel
    }

    get food() {
        return this._food;
    }

    increaseFood(amount) {
        this._food += amount;
    }

    //returns a 2d-array of the places
    get places() {
        return this._places;
    }

    get entrances() {
        return this._beeEntrances;
    }
    
    get queen() {
        return this._queen;
    }
    
    set queen(queen) {
        this._queen = queen;
    }

    get queenPlace() {
        if (this._queen === undefined) {
            return this._hiveCenter;   
        } else {
            return this._queen.place;
        }
    }

    get queenHasBees() {
        return this.queenPlace.bees.length > 0;
    }

    deployAnt(place, newAnt) {
        if (this._food >= newAnt.foodCost && (newAnt.watersafe || (place.water === newAnt.watersafe) )) {
            //The user can pay for it and the tile is a valid tile.
            if (place.ant !== undefined) {
                //There IS an ant already in the spot.
                if (newAnt.container && !place.ant.container) {
                    //The ant already in this spot has nothing holding it and the
                    //ant about to placed IS a container.
                    newAnt.contained = place.ant;
                    place._removeInsect();
                } else if (!newAnt.container && place.ant.container && (place.ant.contained === undefined)) {
                    //The ant already in this spot IS a container and isn't holding anything
                    //and the ant about to be placed ISN'T a container.
                    place.ant.contained = newAnt;
                    newAnt = place.ant;
                } else {
                    //One of the following holds true;
                    //1) Both in spot and placing are containers.
                    //2) Both in spot and placing are non-containers.
                    //3) Container already has something.
                    console.log("You fell into the abyss that is I-Have-No-Idea");
                    return false;
                }
            } 
            //The space is empty. Just place the ant down.
            this._food -= newAnt.foodCost;   
            newAnt.place = place; //assign the ant
            console.log(newAnt.place === place);
            return newAnt.place === place; //return if could place the ant
        } else {
            console.log("You are unable to pay for the ant or the target tile is not valid for that ant.");
            return false; //could not place the ant
        }
    }


    removeAnt(place) {
        place.ant = undefined;
    }

    //return all ants currently in the colony
    get allAnts() {
        var ants = [];
        for (var i = 0; i < this._places.length; i++) {
            for (var j = 0; j < this._places[i].length; j++) {
                var ant = this._places[i][j].ant;
                if (ant !== undefined) {
                    ants.push(ant);
                    if (ant.container) {
                        ants.push(ant.contained);
                    }
                }
            }
        }
        return ants;
    }

    //return all bees currently in the colony
    get allBees() {
        var bees = [];
        for (var i = 0; i < this._places.length; i++) {
            for (var j = 0; j < this._places[i].length; j++) {
                bees = bees.concat(this._places[i][j].bees);
            }
        }
        return bees;
    }

    //Creates a default starting colony
    static createDefaultColony() {
        return new AntColony(100, 1, 8, 0);
    }

    //Creates a testing colony with extra food
    static createTestColony() {
        return new AntColony(100, 1, 8, 0);
    }

    //Creates a full colony with 3 tunnels
    static createFullColony() {
        return new AntColony(100, 3, 8, 0);
    }

    //Creates a full colony with three tunnels and moats
    static createWetColony() {
        return new AntColony(100, 3, 8, 3);
    }
}

/*************
 * INSECTS!!! *
 *************/
/**
 * Represents an insect (e.g., an Ant or a Bee) in the game
 * This class should be treated as abstract
 */

class Insect {
    constructor(armor, place) {
        this._armor = armor;
        this._place = place;
        this._damageMultiplier = 1;
        this._damage = 0;
        this._name = 'Insect';
        
        //Default attribute lists.
        this._watersafe = false;
        this._stealth = false;
        this._container = false;
        this._immovable = false;
    }
    
    act(colony) {
    }
    
    //Deals damage of amount to a single target enemy.
    damage(amount, target) {
        if (target) {
            console.log(amount + " was dealt to " + target);
            target.reduceArmor(amount * this._damageMultiplier);
        }
    }
    
    //Reduces the amount of armor of this insect.
    reduceArmor(amount) {
        this._armor -= amount;
        if (this._armor <= 0) {
            console.log(this.toString() + ' ran out of armor and expired');
            this.place = undefined;
        }
    }
    
    toString() {
        return this.name + '(' + (this.place ? this.place.name : '') + ')';
    }
    
    get armor() {
        return this._armor;
    }
    
    get container() {
        return this._container;
    }
    
    get contained() {
        return this._contained;
    }
    
    set contained(newContained) {
        this._contained = newContained;
    }

    get immovable() {
        return this._immovable;
    }
    
    get name() {
        return this._name;
    }

    get place() {
        return this._place;
    }
    
    set place(place) {
        console.log("bye");
        if (place === undefined) { //if being removed
            this._place._removeInsect(this);
            this._place = undefined;
        } else if (place._addInsect(this)) { //try to go to new place
            if (this._place !== undefined) {
                this._place._removeInsect(this); //leave old place
            }
            this._place = place; //save our new location
        }
    }

    get stealth() {
        return this._stealth;
    }
    
    get watersafe() {
        return this._watersafe
    }
}

/**
 * Represents a Bee (the antagonist!)
 */
class Bee extends Insect {
    constructor(armor, place) {
        super(armor, place);
        this._name = 'Bee';
        this._damage = 1;
        this._watersafe = true;
    }
    
    act() {
        if (this.blocked) {
            var target = this.place.ant
            console.log(this.toString() + ' stings ' + target + '!');
            super.damage(this._damage, target);
        } else if (this.armor > 0) {
            this.place = this.place.exit;
        }
    }
    
    toString() {
        return super.toString();
    }

    get blocked() {
        return (this.place.ant !== undefined && !this.place.ant.stealth);
    }
}

/**
 * A class representing a basic Ant.
 * This class should be treated as abstract
 */
class Ant extends Insect {
    constructor(armor, cost, place) {
        super(armor, place);
        this._name = 'Ant'; //for display
        this._foodCost = cost;
    }
    
    //Damages all enemies on the same spot for amount damage.
    damageAllOnSpot(amount) {
        var bees = this.place.bees;
        for (var i = 0; i < bees.length; i++) {
            console.log(amount + ' damage was dealt to ' + bees[i]);
            bees[i].reduceArmor(amount);
        }
    }
    
    toString() {
        return super.toString();
    }
    
    get foodCost() {
        return this._foodCost;
    }
}

//an object to hold subclasses / give them specific namespaces
var Ants = {
    
    //Bodyguard type. Special in that it can be put around another ant
    //and absorb damage for that ant.
    Bodyguard : class extends Ant {
        constructor() {
            super(2, 4);
            this._name = 'Bodyguard';
            this._container = true;
        }
    },
    
    //Fire type. Upon death, the ant exploes causing damage to all bees that are on the same spot.
    Fire: class extends Ant {
        constructor() {
            super(1, 4);
            this._name = 'Fire';
            this._damage = 3;
        }
        
        reduceArmor(amount) {
            if (amount >= this._armor) {
                console.log(this.toString() + ' exploded and caused damage to bees around it!');
                super.damageAllOnSpot(this._damage);
            }
            super.reduceArmor(amount);
        }
    },
    
    //Grower ant. Produces 1 food per turn.
    Grower: class extends Ant {
        constructor() {
            super(1, 2);
            this._name = 'Grower';
        }

        act(colony) {
            super.act(colony);
            colony.increaseFood(1);
        }
    },
    
    //Hungry type consumes a bee whole but must wait 3 turns before doing so again.
    Hungry: class extends Ant {
        constructor() {
            super(1, 4);
            this._name = 'Hungry';
            this._hunger = 3;
        }

        act() {
            super.act();
            if (this._hunger == 3) {
                var target = this.place.getClosestBee(0, 0);
                if (target) {
                    console.log(this.toString() + ' devouered ' + target.toString() + ' whole!');
                    super.damage(target.armor, target);
                    this._hunger = 0;
                }
            } else {
                this._hunger += 1;
            }
        }
    },
    
    //Ninja type that does not prevent bees from advancing forward. However it does
    //1 damage to all units on the same spot.
    Ninja : class extends Ant {
        constructor() {
            super(1, 6);
            this._name = 'Ninja';
            this._damage = 1;
            this._stealth = true;
        }
        
        act() {
            super.act();
            super.damageAllOnSpot(this._damage);
        }
    },
    
    //Scuba type that is safe to put on water. This unit does ranged damage.
    Scuba : class extends Ant {
        constructor() {
            super(1, 5);
            this._name = 'Scuba';
            this._damage = 1;
            this._range = 3;
            this._watersafe = true;
        }
        
        act() {
            super.act();
            var target = this.place.getClosestBee(0, this._range);
            console.log(this.toString() + ' came out of the water and threw a stone at ' + target.toString());
            super.damage(this._damage, target);
        }
    },
    
    //Thrower type. Ranged unit that does damage.
    Thrower: class extends Ant {
        constructor() {
            super(1, 4);
            this._name = 'Thrower';
            this._damage = 1;
            this._range = 3;
        }

        act() {
            super.act();
            var target = this.place.getClosestBee(0, this._range);
            console.log(this.toString() + 'threw a leaf at ' + target.toString());
            super.damage(this._damage, target);
        }
    },
    
    //Wall type that doesn't attack and is only a high armor damage sponge.
    Wall: class extends Ant {
        constructor() {
            super(4, 4);
            this._name = 'Wall';
        }
    },
    
    //Queen ant that can only be deployed once. It will cause the 
    //damage output of those infront and behind the queen to do double damage.
    Queen : class extends Ant {
        constructor() {
            super(1, 6);
            this._name = 'Queen';
            this._watersafe = true;
            this._inspired = [];
            this._immovable = true;
        }
        
        act(colony) {
            super.act(colony);
            if (colony.queen === undefined) {
                //There is no deployed queen so far.
                colony.queen = this;
            } else if (colony.queen === this) {
                //There is a deployed queen. Double check that the surrounding ants are inspired.
                if (this.place && this.place.entrance && this.place.entrance.ant) {
                    //inspire the front ant
                    this.inspire(this.place.entrance.ant);
                }

                if (this.place && this.place.exit && this.place.exit.ant) {
                    //inspire the ant behind.
                    this.inspire(this.place.exit.ant);
                }  
            } else {
                //There is already another queen on the map. This one must be destroyed.
                console.log("A colony can't have more than one queen!");
                this._immovable = false;
                super.reduceArmor(this.armor);
            }
        }
        
        //Doubles the damage output of the target ant.
        inspire(ant) {
            if (this._inspired.indexOf(ant, this._inspired) != -1) {
                ant._damageMultiplier = 2;
                this._inspired.push(ant);
            }
        }
    }
};

//export classes to be available to other modules. Note that this does expose some of the other classes
module.exports.Hive = Hive;
module.exports.AntColony = AntColony;
module.exports.AntGame = AntGame;