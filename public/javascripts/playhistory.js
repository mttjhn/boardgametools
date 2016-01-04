/* COMMON TEMPLATE
 {gamecount}x {gamename}
 [if {isExpansion} = true] [i]{gamecount}x {gamename}[/i]
 [if {isNewToMe} = true] [b]{gamecount}x {gamename}[/b]
 */


$(function(){
  $('#calculate').click(function (eventObject) {
     loadPlayData($('#startdate').val(), $('#enddate').val(), $('#username').val(), $('#rowtemplate').val());
  });
});

var playHistoryData = [];

function loadPlayData (startDate, endDate, userName, rowTemplate) {
    //Clear our array of results!
    playHistoryData = [];
    //Start getting data!
    var maxPages = 10;
    var getFunctions = [];
    // Get first page of plays, so we can determine the total.
    $.get( '/api/plays', { username: userName, mindate: startDate, maxdate: endDate, page: 1 } )
    .done(function( data ) {
        // Calculate the total...
        if (data.plays.total) {
            var pageCount = Math.ceil(data.plays.total/100);
            maxPages = pageCount;
        }

        // Load in the plays from the first page while we're at it.
        if (data.plays) {
            playHistoryData = playHistoryData.concat(data.plays.play);
        }

        // Construct an array of functions for a deferred
        for (i = 2; i <= maxPages; i++) { 
            getFunctions.push(
                $.get( '/api/plays', { username: userName, mindate: startDate, maxdate: endDate, page: i } )
                .done(function( pageData ) {
                    // Load in the plays!
                    if (pageData.plays) {
                        playHistoryData = playHistoryData.concat(pageData.plays.play);
                    }
                }));
        }

        
    }, function () {
        $.when.apply($, getFunctions).then(function () {
            // Do the actual load of plays!!
            var playDisplay = '';
            var playList = [];
            var newToMeDictionary = {};

            var group = function (array, groupBy, sumBy)
            {
                var groupedArray = [];
                var dictionary = {};
                $.each(array, function (index, item) {
                    if (!dictionary[item[groupBy]]) {
                        dictionary[item[groupBy]] = [item];
                    } else {
                        dictionary[item[groupBy]].push(item);
                    }
                });

                for (var property in dictionary) {
                    var dictArray = dictionary[property];
                    var itemCount = 0;
                    if (sumBy)
                    {
                        // Total up sumBy values
                        $.each(dictArray, function (index, item) {
                            if (item[sumBy])
                            {
                                itemCount = itemCount + item[sumBy];
                            }
                            else
                            {
                                // Just add one if we can't find the sum column
                                itemCount = itemCount + 1;
                            }
                        });
                    }
                    else
                    {
                        // Use count if no sum
                        var itemCount = dictArray.length;
                    }

                    var firstItem = null;
                    if (dictArray.length > 0) {
                        firstItem = dictArray[0];
                    }
                    var groupedItem = { count: itemCount, first: firstItem, values: dictArray }
                    groupedArray.push(groupedItem);
                }

                groupedArray = sortItems(groupedArray);

                return groupedArray;
            }

            var sortItems = function (array) {
                return array.sort(function(a, b) {
                    var g1 = a.first.gameName.toLowerCase();
                    var g2 = b.first.gameName.toLowerCase();

                    var c1 = a.count;
                    var c2 = b.count;

                    // Sort descending with count numbers
                    if (c1 != c2) {
                        if (c1 > c2) return -1;
                        if (c1 < c2) return 1;
                        return 0;
                    }

                    // Sort ascending if count is the same
                    if (g1 < g2) return -1;
                    if (g1 > g2) return 1;
                    return 0;
                });
            }

            var checkIfGameIsNewToMe = function (gameId) {
                var dictionaryValue = newToMeDictionary[gameId];
                if (dictionaryValue) {
                    return dictionaryValue.toString();
                } else {
                    return 'false';
                }
            }

            var processGamePlay = function (game) {
                // prepare object with supported fields
                var dataObject = {
                    gamename: game.first.gameName,
                    gameid: game.first.gameId,
                    gamecount: game.count,
                    isexpansion: game.first.isExpansion.toString(),
                    isnewtome: checkIfGameIsNewToMe(game.first.gameId)
                };

                var compiledTemp = _.template(rowTemplate);
                return compiledTemp(dataObject).trim();
            }

            var totalPlays = 0,
                totalGames = 0,
                newToMeGames = 0,
                newToMePlays = 0,
                expansionPlays = 0,
                expansionGames = 0;

            //Process Play Data
            $.each(playHistoryData, function (index, play) {
                //Calculate subtypes and expansions
                var subtype = null;
                var isExpansion = false;
                if (play.item && play.item.subtypes && play.item.subtypes.subtype && play.item.subtypes.subtype.value) {
                    subtype = play.item.subtypes.subtype.value;
                } else if (play.item.subtypes.subtype.length) {
                    $.each(play.item.subtypes.subtype, function(index, value) {
                       if (value.value && value.value.indexOf('expansion') >= 0) {
                           subtype = value.value;
                           isExpansion = true;
                        }
                    });
                }

                //Calculate new to me
                var isNewToMe = false;
                if (play.players && play.players.player) {
                    $.each(play.players.player, function(index, value) {
                        if(value.username && value.username === userName) {
                           if (value.new === 1) {
                               newToMeDictionary[play.item.objectid] = true;
                           } else if (!newToMeDictionary[play.item.objectid]) {
                               newToMeDictionary[play.item.objectid] = false;
                           }
                       }
                    });
                }

                var newPlay = {
                    id: play.id,
                    date: new Date(play.date),
                    quantity: new Number(play.quantity),
                    gameName: play.item.name,
                    gameId: play.item.objectid,
                    comments: play.comments,
                    subtype: subtype,
                    isExpansion: isExpansion
                }

                playList.push(newPlay);
            });


            var processedList = group(playList, 'gameName', 'quantity');
            $.each(processedList, function(index, game) {

                if (game.first) {
                    // Construct totals
                    totalPlays = totalPlays + game.count;
                    totalGames = totalGames + 1;
                    if (checkIfGameIsNewToMe(game.first.gameId) === 'true') {
                        newToMeGames = newToMeGames + 1;
                        newToMePlays = newToMePlays + game.count;
                    }
                    if (game.first.isExpansion.toString() === 'true') {
                        expansionPlays = expansionPlays + game.count;
                        expansionGames = expansionGames + 1;
                    }

                    // Add game row to the display
                    playDisplay = playDisplay + processGamePlay(game) + '\n';
                }
            });

            //Add header to playDisplay
            var headerTemplate = 'Total of <%= totalplays %> plays of <%= totalgames %> distinct games, <%= expansionplays %> of which were expansion plays (<%= expansiongames %> games), and <%= newtomegames %> games that were new to me (<%= newtomeplays %> plays).';
            var headerData = {
                totalplays: totalPlays,
                totalgames: totalGames,
                expansiongames: expansionGames,
                expansionplays: expansionPlays,
                newtomegames: newToMeGames,
                newtomeplays: newToMePlays
            };
            var compiledHeaderTemplate = _.template(headerTemplate);
            var headerText = compiledHeaderTemplate(headerData);
            playDisplay = headerText + '\n\n' + playDisplay;

            // Print the full output to the display
            $('#output').html(playDisplay);
        });
    });
};
