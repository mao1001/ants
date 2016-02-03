# Ants vs. Some-Bees

This module is a simple turn-based tower-defense game played on the command-line, completed as part of a [course](http://arch-joelross.rhcloud.com/) at the UW ISchool. 

The below questions should be answered (in detail!) regarding your submission!


##### 1. Spend some time reading through the provided code _carefully_ to make sure you understand it. After you've read the code, in the space below list any _design patterns_ we discussed in class that you can find (note that you may need to revisit the code after each lecture). Be clear about which pattern is used, where, and _why it is being employed_.
The ants seem to be following a subclassing pattern loosely with overlapping repeated methods and code
blocks that could be eliminated with inheritance. 

##### 2. After you've read the code, is there anywhere that it could be re-architected (e.g., using design patterns) to be more changeable or reusable? 
There are a few methods in ant or bee that can be extrapolated out into the insect super class to streamline a few
calls such as sting and damaging in general. To string could be pulled out as well to streamline how insects 
are printed out in the logs.


##### 3. The tunnels in the `AntColony` are structured as a ___Linked List___ (where each element is a `Place`, and the `exit` and `entrance` variables are the traditional `next` and `prev`). Why is this data structure appropriate (as opposed to, say, an array). _You may need to revisit your notes from CSE 143._
This allows us to restructure things dynamicallly if needed and much of the code that only refers
to the exit or entrance of the node. This drastically reduces overhead if anything ever
were needed to be changed about the structure of the code.


##### 4. Describe the overall architecture you used to implement the different components of this assignment. Did you use inheritance? A particular design pattern?
To streamline a lot of the functionality between bees and ants I used inheritance to pull out and standardize calls.
This opened up a lot of functions to the other insect that previously weren't available. Although not
needed or specified in this assignment, the luxury of having it there is what architecting is all about.


##### 5. Specifically, discuss your use of object-oriented design patterns in your program. What patterns did you use in your implementation (be specific)? Why? Is there anywhere you explicitly decided _not_ to use a pattern (e.g., because doing so would have made it more difficult to change the code later, etc)? Be detailed---you should reflect carefully on your own design and architecture work!
A heavy emphasis on factory method with inheritance and subclassing to fully flesh out functionality and interchangability.
For example, we may have only defined a few units to be water safe, invisible or immovable but with a flip of a boolean
at compile time or even run time, the functionality of those insects can change to produce new behavior and the 
rest of the code should just work. This did however require me to write some of the place and colony methods to handle
attributes. Given more time however more could be done to further decouple say the queen from ant colony.


##### 6. Approximately how many hours did it take you to complete this assignment? #####
About 15 hours.


##### 7. Did you receive help from any other sources (classmates, etc)? If so, please list who (be specific!). #####
No but I did help a few people.


##### 8. Did you encounter any problems in this assignment we should warn students about in the future? How can we make the assignment better? #####
The 9 steps on the assignment serve as a good implementation excercises to get you really used to the code base.
From there ones understanding is really well rounded and the real restructure can be architected.

