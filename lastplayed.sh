#!/bin/sh

USERNAME=$1
echo "Queuing data on BGG" >&2
curl  --stderr /dev/null "https://boardgamegeek.com/xmlapi2/collection?username=${USERNAME}&own=1&excludesubtype=boardgameexpansion " 2>/dev/null >/dev/null
sleep 3 
echo "Determining last play date of each game." >&2
for gameid in `curl  --stderr /dev/null "https://boardgamegeek.com/xmlapi2/collection?username=${USERNAME}&own=1&excludesubtype=boardgameexpansion " 2>/dev/null | grep object | awk -F'objectid=' '{print $2}' | awk -F\" '{print $2}' | sed -e 's/\"//g'`
do
    /bin/echo -n . >&2
    /bin/sleep 0.3
    OUTPUT="`curl --stderr /dev/null \"https://boardgamegeek.com/xmlapi2/plays?username=${USERNAME}&mindate=2001-01-01&id=${gameid}  \" `"
    lastplayed=`echo $OUTPUT | grep date | awk -F'date=' '{print $2}' | awk -F\" '{print $2}' | sed -e 's/\"//g'`
    gamename=`echo $OUTPUT | grep "item name" | awk -F'item name=' '{print $2}' | awk -F\" '{print $2}' | sed -e 's/\"//g'`
    if [ "$lastplayed" = "" ]
    then
        /bin/echo -n "Never      " >> /tmp/lastplayed.$$
        content="`curl --stderr /dev/null \"https://boardgamegeek.com/xmlapi2/thing?id=${gameid}\"`"    
        gamename=`echo "$content" | grep primary | awk -F'value=' '{print $2}' | awk -F\" '{print $2}'`
    else
        /bin/echo -n "$lastplayed " >> /tmp/lastplayed.$$
    fi
    /bin/echo $gamename >> /tmp/lastplayed.$$
done
cat /tmp/lastplayed.$$ | sort -n > lastplayed.txt
cat lastplayed.txt