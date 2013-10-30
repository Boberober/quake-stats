'use strict';

angular.module('quakeStatsApp').service('KillsService', ['Constants', function(Constants) {
	this.stats = null;
    this.alainKills = 0;
	var me = this;

    this.initMap = function(record, startIndex) {
        var map = {};
        map.name = me.getMapKey(record);
        map.startIndex = startIndex;
        map.players = {};
        return map;
    };

    this.getMapKey = function(record) {
        var startIndex = record.indexOf(Constants.MAP_NAME_KEY) + Constants.MAP_NAME_KEY.length,
            endIndex = record.indexOf(Constants.BACKSLASH_KEY, startIndex);
        return record.slice(startIndex, endIndex);
    };

    this.getPlayer = function (record) {
        var player = {},
            teamStr = record.substr(record.indexOf(Constants.TEAM_NUM_KEY) + Constants.TEAM_NUM_KEY.length, 1);

        player.id = me.getPlayerID(record);
        player.name = me.getPlayerName(record);
        player.team = parseInt(teamStr, 10);
        player.kills = [];
        player.deaths = [];
        player.humiliations = [];
        return player;
    };

    this.getPlayerID = function(record) {
        var idStr = record.slice(record.indexOf(Constants.PLAYER_INFO_KEY) + Constants.PLAYER_INFO_KEY.length, record.indexOf(Constants.PLAYER_NAME_KEY));
        return parseInt(idStr, 10);
    };

    this.getPlayerName = function(record) {
        return record.slice(record.indexOf(Constants.PLAYER_NAME_KEY) + Constants.PLAYER_NAME_KEY.length, record.indexOf(Constants.BACKSLASH_KEY, record.indexOf(Constants.PLAYER_NAME_KEY) + Constants.PLAYER_NAME_KEY.length));
    };

    this.getKill = function(record) {
        var killStr = record.slice(record.indexOf('Kill: ') + 'Kill: '.length, record.indexOf(':', record.indexOf('Kill: ') + 'Kill: '.length)),
            idsArr = killStr.split(' '),
            killerID = parseInt(idsArr[0], 10),
            victimID = parseInt(idsArr[1], 10),
            killModeID = parseInt(idsArr[2], 10),
            killerName = record.slice(record.lastIndexOf(': ') + ': '.length, record.indexOf(' killed')),
            victimName = record.slice(record.indexOf('killed ') + 'killed '.length, record.indexOf(' by'));
        return {killer: killerID,
            killerName:killerName,
            victim: victimID,
            victimName: victimName,
            mode: killModeID
        };
    };

    this.getTopPlayer = function(prop, map) {
        var topPlayer = null,
            player = null;
        for (var playerName in map.players) {
            player = map.players[playerName];
            if (topPlayer) {
                if (player[prop].length > topPlayer[prop].length) {
                    topPlayer = player;
                }
            } else {
                topPlayer = player;
            }
        }
        return topPlayer;
    };

    this.registerKill = function(kill, map) {
        var killerPlayer = map.players[kill.killerName],
            victimPlayer = map.players[kill.victimName];
        if (killerPlayer && victimPlayer) {
            killerPlayer.kills.push(kill);
            victimPlayer.deaths.push(kill);
            me.calculatePlayerToPlayerKills(kill);
        }
    };

    this.calculatePlayerToPlayerKills = function(kill) {
        var killerPlayer = me.stats.players[kill.killerName],
            victimPlayer = me.stats.players[kill.victimName];
        if (killerPlayer && victimPlayer) {
            killerPlayer.kills.push(kill);
            victimPlayer.deaths.push(kill);
            if (kill.mode === 2) {
                killerPlayer.humiliations.push(kill);
            }
        }
    };

    this.registerStatsPlayer = function(player) {
        if (!me.stats.players[player.name]) {
            me.stats.players[player.name] = player;
        }
        
    };

	this.getKillsStats = function(log) {
		if (me.stats) {
            return me.stats;
        }
        var i,
            record,
            map,
            kill,
            player;
        me.stats = {};
        me.stats.maps = {};
        me.stats.players = {};

        for (i = 0; i < log.length; i++) {
            record = log[i];
            if (record.indexOf('InitGame:') !== -1) {
                map = me.initMap(record, i);
                me.stats.maps[i] = map;
            }
            // Player
            if (record.indexOf(Constants.PLAYER_INFO_KEY) !== -1) {
                player = me.getPlayer(record);

                for (var name in map.players) {
                    if (map.players[name] && map.players[name].name === player.name) {
                        player = angular.copy(map.players[name]);
                        delete map.players[name];
                        break;
                    }
                }
                map.players[player.name] = player;
                me.registerStatsPlayer(player);
            }
            // Kill
            if (record.indexOf('Kill: ') !== -1) {
                kill = me.getKill(record);
                if (kill.victim !== kill.killer) {
                    me.registerKill(kill, map);
                }
            }
            // Exit
            if (record.indexOf('Exit: ') !== -1) {
                map.topKiller = me.getTopPlayer('kills', map);
                map.topVictim = me.getTopPlayer('deaths', map);
            }
        }
        console.log(me.stats);
		return me.stats;
	};

    this.getPlayerWeaponsStats = function(player) {
        var modes=  {},
            result = [],
            killMode,
            deathMode;
        if (player) {
            for (var kill in player.kills) {
                killMode = player.kills[kill].mode;
                if (modes[killMode] === undefined) {
                    modes[killMode] = {id:killMode, kills:0, deaths:0};
                    continue;
                } else {
                    modes[killMode].kills += 1;
                }
            }
            for (var death in player.deaths) {
                deathMode = player.deaths[death].mode;
                if (modes[deathMode] === undefined) {
                    modes[deathMode] = {id:deathMode, kills:0, deaths:0};
                    continue;
                } else {
                    modes[deathMode].deaths += 1;
                }
            }

            for (var mode in modes) {
                result.push(modes[mode]);
            }
        }
        return result;
    };
}]);