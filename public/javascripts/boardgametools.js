/* COMMON TEMPLATE
 {gamecount}x {gamename}
 [if {isExpansion} = true] [i]{gamecount}x {gamename}[/i]
 [if {isNewToMe} = true] [b]{gamecount}x {gamename}[/b]
 */


$(function(){
  $('#calculate').click(function (eventObject) {
     loadGamePlays($('#startdate').val(), $('#enddate').val(), $('#username').val(), $('#rowtemplate').val());
  });
});

function loadGamePlays (startDate, endDate, userName, rowTemplate) {
    $.get( '/api/plays', { username: userName, mindate: startDate, maxdate: endDate } )
        .done(function( data ) {
            if (data.plays) {
                var playDisplay = '';
                var playList = [];
                var templateRows = [];
                var newToMeDictionary = {};

                //Parse rowtemplates
                var rowTemplateLines = rowTemplate.match(/^.*([\n\r]+|$)/gm); //Split into lines
                $.each(rowTemplateLines, function (index, value) {
                    //Look for IF statement
                    if (value.toLowerCase().indexOf('[if') >= 0) {
                        var templateObj = {
                            type: 'conditional',
                            logic: value.substr(value.toLowerCase().indexOf('[if')+3, (value.toLowerCase().indexOf(']') - (value.toLowerCase().indexOf('[if')+3))).trim(),
                            content: value.substr(value.toLowerCase().indexOf(']', value.toLowerCase().indexOf('[if'))+1).trim() }
                        templateRows.push(templateObj);
                    }
                    else {
                        var templateObj = {
                            type: 'regular',
                            logic: null,
                            content: value
                        }
                        templateRows.push(templateObj);
                    }
                });

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

                var processTemplateTags = function (template, game) {
                    var processedString = template;
                    processedString = processedString.replace('{gamename}', game.first.gameName);
                    processedString = processedString.replace('{gameid}', game.first.gameId);
                    processedString = processedString.replace('{gamecount}', game.count);
                    processedString = processedString.replace('{isExpansion}', game.first.isExpansion.toString());
                    processedString = processedString.replace('{isNewToMe}', checkIfGameIsNewToMe(game.first.gameId));
                    return processedString;
                }

                var processGamePlay = function (game) {
                    var processedRow = '';
                    var templateToUse = null;
                    var operand = '=';
                    $.each(templateRows, function(index, template) {
                        if (template.type === 'conditional') {
                            if (template.logic) {
                                var lessThanIndex = template.logic.indexOf('<') >= 0;
                                var greaterThanIndex = template.logic.indexOf('>') >= 0;
                                var equalsIndex = template.logic.indexOf('=') >= 0;
                                var operand = '=';
                                if (lessThanIndex) {
                                    operand = '<';
                                } else if (greaterThanIndex) {
                                    operand = '>';
                                } else if (equalsIndex) {
                                    operand = '=';
                                }

                                var leftSide = template.logic.substr(0, template.logic.indexOf(operand)-1).trim();
                                var rightSide = template.logic.substr(template.logic.indexOf(operand)+1).trim();

                                leftSide = processTemplateTags(leftSide, game);
                                rightSide = processTemplateTags(rightSide, game);

                                switch (operand) {
                                    case '=':
                                        if (leftSide.toLowerCase() === rightSide.toLowerCase()) {
                                            templateToUse = template;
                                        }
                                        break;
                                   /* case '<':
                                        if (leftSide < rightSide) {
                                            templateToUse = template;
                                        }
                                        break;
                                    case '>':
                                        if (leftSide > rightSide) {
                                            templateToUse = template;
                                        }
                                        break; */
                                }
                            }
                        }
                        else {
                            if (!templateToUse) {
                                templateToUse = template;
                            }
                        }
                    });

                    if (templateToUse) {
                        processedRow = processTemplateTags(templateToUse.content.trim(), game);
                    }
                    return processedRow;
                }

                //Process Play Data
                $.each(data.plays.play, function (index, play) {
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
                        playDisplay = playDisplay + processGamePlay(game) + '\n';
                    }
                });
            }
            $('#output').html(playDisplay);
        });
}
