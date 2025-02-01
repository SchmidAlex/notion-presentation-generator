/*****************************************************************
** Author: Asvin Goel, goel@telematique.eu
**
** A plugin for reveal.js adding instant polls within an 
** online seminar. Updated for Multi-Select functionality with 
** vote restrictions.
**
** Version: 0.2.1
**
** License: MIT license (see LICENSE.md)
**
******************************************************************/

window.RevealPoll = window.RevealPoll || {
    id: "RevealPoll",
    init: function (deck) {
        initPoll(deck);
    },
};

function generateRandomString() {
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_:$!';
	let result = '';
	
	for (let i = 0; i < 50; i++) {
	  const randomIndex = Math.floor(Math.random() * characters.length);
	  result += characters.charAt(randomIndex);
	}
	
	return result;
}

const initPoll = function (Reveal) {
    var config = Reveal.getConfig().poll;

    var polls = [];

    // Get poll index
    function getPollIndex(id) {
        return polls.findIndex((poll) => poll.id === id);
    }

    function initializePolls() {
        var pollElements = document.querySelectorAll(".poll");

		var userId = generateRandomString();

        for (var i = 0; i < pollElements.length; i++) {
            var id = pollElements[i].getAttribute("data-poll");
            var multiSelect = pollElements[i].getAttribute("data-multi"); // New attribute for multi-select
            var votes = {};
            var buttons = pollElements[i].querySelectorAll("button");

            for (var j = 0; j < buttons.length; j++) {
                // Initialize number of votes for button
                votes[buttons[j].getAttribute("data-value")] = 0;

                // Make button clickable
                buttons[j].addEventListener("click", function (evt) {
                    if (!RevealSeminar.connected()) {
                        alert("You are currently not connected to the live poll. Your vote is ignored.");
                        return;
                    }

                    const button = evt.target;
                    const poll = button.parentElement;

                    if (button.classList.contains("selected")) {
                        return;
                    }

                    if (evt.target.parentElement.getAttribute("data-multi")) {
                        // Toggle selection for multi-select
                        button.classList.toggle("selected");
                        button.blur();
                    } else {
                        // Single select: disable all buttons after vote
                        var siblings = poll.querySelectorAll("button");
                        for (var i = 0; i < siblings.length; i++) {
                            siblings[i].disabled = true;
                        }
                        button.classList.add("selected");
                        button.blur();
                    }

                    // Collect all selected votes
                    const selectedVotes = Array.from(
                        poll.querySelectorAll("button.selected")
                    ).map((btn) => btn.getAttribute("data-value"));

                    // Submit votes for multi-select or single-select
                    vote(poll.getAttribute("data-poll"), selectedVotes, userId);
                });
            }

            polls.push({ id, multi: multiSelect, voters: 0, votes });
        }
    }

    function vote(poll, choices, userId) {
        // Send vote(s) to chair
        var message = new CustomEvent("send");
        message.content = {
            sender: "poll-plugin",
            recipient: true,
            type: "vote",
            poll,
            choices, // Changed to an array to support multiple votes
			userId
        };
        document.dispatchEvent(message);
    }

    document.addEventListener("received", function (message) {
		if (message.content && message.content.sender == "poll-plugin") {
			if (message.content.type == "vote") {
				const vote = message.content;
				const poll = polls[getPollIndex(vote.poll)];
	
				if (!poll) return;
	
				// Initialize userVotes if not already set
				if (!poll.userVotes) {
					poll.userVotes = {}; // Object to track votes per user
				}
	
				// Retrieve previous votes (if any)
				const previousVotes = poll.userVotes[vote.userId] || [];
	
				// If the same user is voting again, first remove previous votes
				previousVotes.forEach((choice) => {
					if (poll.votes[choice]) {
						poll.votes[choice] -= 1;
					}
				});
	
				// Store the new votes for this user
				poll.userVotes[vote.userId] = vote.choices;
	
				// Increment votes for selected choices
				vote.choices.forEach((choice) => {
					poll.votes[choice] = (poll.votes[choice] || 0) + 1;
				});
	
				// Only count the voter once per poll
				// Only count unique voters
				if (!previousVotes.length) {
					poll.voters++; // Only increase if it's the first vote from this user
				}
	
				// Broadcast updated voter count and results
				var voterMessage = new CustomEvent("broadcast");
				voterMessage.content = {
					sender: "poll-plugin",
					copy: true,
					type: "voters",
					poll: poll.id,
					voters: poll.voters,
				};
				document.dispatchEvent(voterMessage);
	
				var resultsMessage = new CustomEvent("broadcast");
				resultsMessage.content = {
					sender: "poll-plugin",
					copy: true,
					type: "results",
					poll: poll.id,
					votes: poll.votes,
				};
				document.dispatchEvent(resultsMessage);
			} else if (message.content.type == 'voters') {
				//console.log("voters", message.content )
				var voterDivs = document.querySelectorAll('.voters[data-poll="' + message.content.poll + '"]');
				voterDivs.forEach(voterDiv => {
					voterDiv.textContent = message.content.voters;
				});
			} else if (message.content.type == 'results') {
				// update result elements
				var results = document.querySelectorAll('.results[data-poll="' + message.content.poll + '"]');
				//console.log("Results", results )
				for (var i = 0; i < results.length; i++) {
					//console.log("Votes", message.content.votes )
					for (var choice in message.content.votes) {
						//console.log(choice);
						var elements = results[i].querySelectorAll('[data-value="' + choice + '"]');
						for (var j = 0; j < elements.length; j++) {
							elements[j].innerHTML = message.content.votes[choice];
						}
					}
				}

				// update result charts
				if (RevealChart) {
					var charts = document.querySelectorAll('canvas[data-chart][data-poll="' + message.content.poll + '"]');
					var data = [];
					for (var choice in message.content.votes) {
						data.push(message.content.votes[choice]);
					}
					for (var i = 0; i < charts.length; i++) {
						RevealChart.update(charts[i], 0, data);
					}
				}
			}
		}
	});
	

    Reveal.addEventListener("ready", function () {
        initializePolls();
    });

    return this;
};
