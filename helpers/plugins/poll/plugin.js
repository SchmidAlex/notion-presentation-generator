/*****************************************************************
** Author: Asvin Goel, goel@telematique.eu
**
** A plugin for reveal.js adding instant polls within an 
** online seminar. Updated for Multi-Select functionality.
**
** Version: 0.2.0
**
** License: MIT license (see LICENSE.md)
**
******************************************************************/

window.RevealPoll = window.RevealPoll || {
    id: 'RevealPoll',
    init: function(deck) {
        initPoll(deck);
    },
};

const initPoll = function (Reveal) {
    var config = Reveal.getConfig().poll;

    var polls = [];

    // Get poll index
    function getPollIndex(id) {
        return polls.findIndex((poll) => poll.id === id);
    }

    function initializePolls() {
        var pollElements = document.querySelectorAll(".poll");

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

                    if (multiSelect) {
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
                    vote(poll.getAttribute("data-poll"), selectedVotes);
                });
            }

            polls.push({ id, multi: multiSelect, voters: 0, votes });
        }
    }

    function vote(poll, choices) {
        // Send vote(s) to chair
        var message = new CustomEvent("send");
        message.content = {
            sender: "poll-plugin",
            recipient: true,
            type: "vote",
            poll,
            choices, // Changed to an array to support multiple votes
        };
        document.dispatchEvent(message);
    }

    document.addEventListener("received", function (message) {
        if (message.content && message.content.sender == "poll-plugin") {
            if (message.content.type == "vote") {
                const vote = message.content;
                const poll = polls[getPollIndex(message.content.poll)];

                // Increment number of voters
                poll.voters++;
                var voterMessage = new CustomEvent("broadcast");
                voterMessage.content = {
                    sender: "poll-plugin",
                    copy: true,
                    type: "voters",
                    poll: poll.id,
                    voters: poll.voters,
                };
                document.dispatchEvent(voterMessage);

                // Update results for each choice
                vote.choices.forEach((choice) => {
                    poll.votes[choice] = (poll.votes[choice] || 0) + 1;
                });

                // Broadcast updated results
                var resultsMessage = new CustomEvent("broadcast");
                resultsMessage.content = {
                    sender: "poll-plugin",
                    copy: true,
                    type: "results",
                    poll: poll.id,
                    votes: poll.votes,
                };
                document.dispatchEvent(resultsMessage);
            } else if (message.content.type == "voters") {
                // Update voter count
                var voters = document.querySelectorAll(
                    '.voters[data-poll="' + message.content.poll + '"]'
                );
                for (var j = 0; j < voters.length; j++) {
                    voters[j].innerHTML = message.content.voters;
                }
            } else if (message.content.type == "results") {
                // Update results display
                var results = document.querySelectorAll(
                    '.results[data-poll="' + message.content.poll + '"]'
                );

                for (var i = 0; i < results.length; i++) {
                    for (var choice in message.content.votes) {
                        var elements = results[i].querySelectorAll(
                            '[data-value="' + choice + '"]'
                        );
                        for (var j = 0; j < elements.length; j++) {
                            elements[j].innerHTML = message.content.votes[choice];
                        }
                    }
                }

                // Update charts if RevealChart is used
                if (RevealChart) {
                    var charts = document.querySelectorAll(
                        'canvas[data-chart][data-poll="' +
                            message.content.poll +
                            '"]'
                    );
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
