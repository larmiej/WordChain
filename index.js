'use strict';

var request = require('request');
var Alexa = require("alexa-sdk");
var rp = require('request-promise');
var appId = 'amzn1.ask.skill.256e5fa9-874f-4a1d-9cc4-ff91bdf403ac'; //'amzn1.echo-sdk-ams.app.your-skill-id';

exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.appId = appId;
    alexa.dynamoDBTableName = 'LastLetterGame';
    alexa.registerHandlers(newSessionHandlers, gameModeHandlers, startGameHandlers, guessAttemptHandlers);
    alexa.execute();
};

var correctReplies = [
    "so smart",
    "you’re a genius",
    "great stuff",
    "what a smart ass"
];

var states = {
    GAMEMODE: '_GAMEMODE', // User is trying to guess the number.
    STARTMODE: '_STARTMODE'  // Prompt the user to start or restart the game.
};

var newSessionHandlers = {
    'NewSession': function() {
        if(Object.keys(this.attributes).length === 0) {
            this.attributes['endedSessionCount'] = 0;
            this.attributes['gamesPlayed'] = 0;
            this.attributes['gamesWon'] = 0;
        }
        this.handler.state = states.STARTMODE;
        this.emit(':ask', 'Welcome to the word chain game. You have played '
            + this.attributes['gamesPlayed'].toString() + ' times. would you like to play?',
            'Say yes to start the game or no to quit.');
    },
    "AMAZON.StopIntent": function() {
      this.emit(':tell', "Goodbye!");  
    },
    "AMAZON.CancelIntent": function() {
      this.emit(':tell', "Goodbye!");  
    },
    'SessionEndedRequest': function () {
        console.log('session ended!');
        this.attributes['endedSessionCount'] += 1;
        this.emit(":tell", "Goodbye!");
    }
};

var startGameHandlers = Alexa.CreateStateHandler(states.STARTMODE, {
    'NewSession': function () {
        this.emit('NewSession'); // Uses the handler in newSessionHandlers
    },
    'AMAZON.HelpIntent': function() {
        var message = 'I will mention a word and then you have to reply me with a word starting with the last letter' +
            ' of my word and I will do the same. Do you want to start the game?';
        this.emit(':ask', message, message);
    },
    'AMAZON.YesIntent': function() {
        //this.attributes["guessNumber"] = Math.floor(Math.random() * 100);
        this.handler.state = states.GAMEMODE;
        this.attributes["word"] = 'table';
        this.emit(':ask', 'Game On!, You are going down. My word is ' + this.attributes["word"]);
    },
    'AMAZON.NoIntent': function() {
        console.log("NOINTENT");
        this.emit(':tell', 'Ok, see you next time!');
    },
    "AMAZON.StopIntent": function() {
      console.log("STOPINTENT");
      this.emit(':tell', "Goodbye!");  
    },
    "AMAZON.CancelIntent": function() {
      console.log("CANCELINTENT");
      this.emit(':tell', "Goodbye!");  
    },
    'SessionEndedRequest': function () {
        console.log("SESSIONENDEDREQUEST");
        this.attributes['endedSessionCount'] += 1;
        this.emit(':tell', "Goodbye!");
    },
    'Unhandled': function() {
        console.log("UNHANDLED");
        var message = 'Say yes to continue, or no to end the game.';
        this.emit(':ask', message, message);
    }
});
// var tbody = '';
// var function2 = function(self) {
//     console.log("Cheeery:!!" + tbody);
//     ///this.emit(':ask', 'what a smart ass, My next word is ' + 'random', 'my word is ' + 'random' );
//     self.emit(':ask', 'what a smart ass, My next word is ' + tbody, 'my word is ' + tbody )
// }
var gameModeHandlers = Alexa.CreateStateHandler(states.GAMEMODE, {
    'NewSession': function () {
        this.handler.state = '';
        this.emitWithState('NewSession'); // Equivalent to the Start Mode NewSession handler
    },
    'WordGameIntent': function () {
        var inputWord = this.event.request.intent.slots.UpdateText.value;
        var OriginalWord = this.attributes["word"];
        
        console.log('user said: ' + inputWord);
        //check if last letter in original word matches firsl letter in input word
        var checkedPassed = false;
        
        console.log('OriginalWord: ' + OriginalWord);
        console.log('inputWord: ' + inputWord);
        if (inputWord && OriginalWord.toString().substring(OriginalWord.toString().length-1) == inputWord.toString().substring(0,1)){
            checkedPassed = true;
        }
        console.log('checkedPassed: ' + checkedPassed);

        if(checkedPassed){
            this.emit('Correct', () => {
                var inputLastLetter = inputWord.toString().substring(inputWord.toString().length-1);
                // console.log(inputLastLetter);
                // var newWord = 'game';
                //this.attributes["word"] = newWord;
                rp('https://api.datamuse.com/words?sp=' + inputLastLetter + '*').promise().bind(this)
                    .then((body) => {
                        var smartReply = correctReplies[parseInt((Math.random() * 10) % correctReplies.length)];
                        console.log(smartReply);
                        console.log(correctReplies);
                        var data = JSON.parse(body);
                        var newWord = data[parseInt((Math.random() * 10) % data.length)].word;
                        this.attributes["word"] = newWord.toString();
                        this.emit(':ask', smartReply + ', My next word is ' + newWord, 'my word is ' + newWord);
                    })
                    .catch(function (err) {
                        console.log(err);
                    });
                //this.emit(':ask', 'what a smart ass, My next word is ' + 'test', 'my word is ' + 'test');
                console.log('End of correct emit');
            });
        }
        else if(inputWord && !checkedPassed){
            this.emit('Wrong', () => {
                this.emit(':ask', 'Haha ' + inputWord.toString() + ' is Wrong! Do not worry, there are more important things in life than winning or losing a game. You lost though. LOL. Would you like to play again?',
                'Say yes to start a new game, or no to end the game.');
            })
        } else {
            this.emit('NotAWord');
        }
    },
    'AMAZON.HelpIntent': function() {
        // var message = 'I will mention a word and then you have to reply me with a word starting with the last letter' +
        //     ' of my word and I will do the same. Do you want to start the game?';
        this.emit(':ask', 'I mentioned the word ' + this.attributes["word"] + ', try to say another word that begins with the last letter', 'Try saying any word and lose.');
    },
    "AMAZON.StopIntent": function() {
        console.log("STOPINTENT");
      this.emit(':tell', "Goodbye!");  
    },
    "AMAZON.CancelIntent": function() {
        console.log("CANCELINTENT");
    },
    'SessionEndedRequest': function () {
        console.log("SESSIONENDEDREQUEST");
        this.attributes['endedSessionCount'] += 1;
        this.emit(':tell', "Goodbye!");
    },
    'Unhandled': function() {
        console.log("UNHANDLED");
        this.emit(':ask', 'Sorry, I didn\'t get that. Try saying a word.', 'Try saying a word.');
    }
});

// These handlers are not bound to a state
var guessAttemptHandlers = {
    'Correct': function(callback) {
        callback();
    },
    'Wrong': function(callback) {
        this.handler.state = states.STARTMODE;
        this.attributes['gamesPlayed']++;
        callback();
    },
    'NotAWord': function() {
        this.emit(':ask', 'Sorry, I didn\'t get that. Try saying a word.', 'Try saying a word.');
    }
};