$(function(){
  $('#calculate').click(function (eventObject) {
     loadLastPlays($('#username').val());
  });
});

var collectionList = [];

function loadLastPlays (userName) {
    // Start by processing the collection
    processCollection(userName, true);
};

function processCollection (userName, owned) {
	// Prepare parameters
	var _owned = 1;
	if (owned === false) { _owned = 0; }

	// Get collection information from BGG
	$.get( '/api/collection', { username: userName, own: _owned, brief: 0 } )
        .done(function( data ) {
        	if (data.message && data.message.contains("Your request for this collection")) {
        		alert(data.message);
        	}
            else {
            	if (data.items && data.items.item) {
            		var collection = data.items;
            		console.log('Total Items: ' + collection.totalitems);
            		$.each(collection.item, function (index, item) {
            			console.log(item);
            			// Prepare empty Game Object
            			var gameObject = newGameObject();

            			// Process property values
            			gameObject.id = item.objectid;
            			gameObject.playCount = item.numplays;
            			gameObject.imageUrl = item.thumbnail;
            			gameObject.type = item.subtype;

            			// Process Status Info
            			if (item.status) {
            				gameObject.status.forTrade = (item.status.fortrade === 1);
            				gameObject.status.own = (item.status.own === 1);
            				gameObject.status.preOrdered = (item.status.preordered === 1);
            				gameObject.status.prevOwned = (item.status.prevowned === 1);
            				gameObject.status.wantInTrade = (item.status.want === 1);
            				gameObject.status.wantToBuy = (item.status.wanttobuy === 1);
            				gameObject.status.wantToPlay = (item.status.wanttoplay === 1);
            				gameObject.status.wishlist = (item.status.wishlist === 1);
            			}

            			// Process Name Info
            			if (item.name) {
            				gameObject.name = item.name.$t;
            			}

            			// TODO: The below code doesn't work well. I think I'll need to sync play data with a local database. Hmmm...
        				/*
            			// Look up last played date
            			$.get( '/api/plays', { username: userName, id: gameObject.id, page: 1 } )
            				.done(function (playData) {
            					if (playData.plays && playData.plays.play) {
            						var playList = playData.plays.play;
            						if (playList.length > 0) {
            							var latestPlay = playList[0];
            							if (latestPlay.date.length > 10) {
	            							var latestPlayDate = Date.parse(latestPlay.date.substring(4), latestPlay.date.substring(4, 2), latestPlay.date.substring(6, 2));
	            							gameObject.latestPlayDate = latestPlayDate;
            							}

            							collectionList.push(gameObject);
            						}
            					}
            				});
            			*/
            		});
            	}
            }

            console.log(collectionList);
        });
};

function newGameObject() {
	return {
		id: null,
		name: "",
		playCount: 0,
		imageUrl: "",
		type: "boardgame",
		status: {
			forTrade: false,
			own: false,
			preOrdered: false,
			prevOwned: false,
			wantInTrade: false,
			wantToBuy: false,
			wantToPlay: false,
			wishlist: false
		}
	};
};