var distMap;
var properties = 0b001; //MSB to LSB: verbose_wild_mean
var prop = function(name) {
	switch(name) {
		case "verbose":
			return (properties & 4) == 4;
		case "wild":
			return (properties & 2) == 2;
		case "mean":
			return (properties & 1) == 1;
		default:
			throw Error("no such property");
	}
}
var equalState = function(s1,s2) {
    if(s1 === undefined || s2 === undefined)
        return false;
    return JSON.stringify(s1.pos) == JSON.stringify(s2.pos) &&
            JSON.stringify(s1.speed) == JSON.stringify(s2.speed);
}
var length = function(p) {
    return Math.sqrt(Math.pow(p.x,2) + Math.pow(p.y,2));
}
var flip = function(p) {
    return {x: p.y, y: p.x};
}
var getState = function(c, playerdata, selfindex) {
    return {
        pos: flip({
            x: playerdata[selfindex].pos.x,
            y: playerdata[selfindex].pos.y
             }),
        speed: flip({
            x: playerdata[selfindex].pos.x - playerdata[selfindex].oldpos.x,
            y: playerdata[selfindex].pos.y - playerdata[selfindex].oldpos.y
        }),
        next: undefined
    };
}
var stateTransition = function(state,c) {
    var nextStates = [];
	if(goal(state,c))
		return nextStates;
    for(var i=-1; i<2; i++) {
        for(var j=-1; j<2; j++) {
            var p1 = state.pos;
            var p2 = {x: state.pos.x+state.speed.x+i, y: state.pos.y+state.speed.y+j};
            //move is invalid
            if((p2.y >= c.length || p2.y < 0 || p2.x >= c[0].length || p2.x < 0) || //out of c
              !lc.validLine(flip(p1),flip(p2)) || //obstacle in the way
              c[p2.y][p2.x] < 0 ){
                continue;
                nextStates.push({
                    pos:p1,
                    speed:{x:0,y:0},
                    prev: state,
                    invalid: true,
                    cost: 6
                });
            }
            else
                nextStates.push({
                    pos:p2,
                    speed:{x:state.speed.x+i,y: state.speed.y+j},
                    prev: state,
                    cost: 1
                });
        }
    }
    return nextStates;
}
var h = function(state,c) {
    if(goal(state,c)) 
		return 0;
	var speed = Math.max(Math.abs(state.speed.x),Math.abs(state.speed.y));
	return distMap[state.pos.y][state.pos.x]/ (prop("wild") ? speed : 1);
}
var goal = function(state,c) {
    return c[state.pos.y][state.pos.x] == 100;
}
var isIn = function(state,list,withLessOrEqual) {
    for(var i=0; i<list.length; i++)
        if(equalState(state,list[i])) {
            if(withLessOrEqual === undefined) return true;
            else if(list[i].f <= state.f) return true;
        }
    return false;
}
var sortByF = function(list) {
    return list.sort(function(a,b) {
        if (a.f < b.f)
            return -1;
        if (a.f > b.f)
            return 1;
        return 0;
    });
}
var getRoute = function(c, playerdata, selfindex, stepLimit) {
    var startTime = new Date().getTime();
    
	route = getState(c,playerdata,selfindex);
	route.cumSpeed = route.speed;
	route.totalCost = 0;

	var queue = [];
    queue.push(route);
    
	var step = 0;
	var visitedList = [];
    while(queue.length > 0) {
		step++;
        //TODO kilépési kritérium
        if(step > stepLimit)
            break;
		if(goal(queue[0],c))
			break;
        var curState = queue.shift();
		visitedList.push(curState);
        var nextStates = stateTransition(curState,c);
        for(var i=0; i<nextStates.length; i++) {
            nextStates[i].totalCost = curState.totalCost + nextStates[i].cost;
            nextStates[i].f = nextStates[i].totalCost + h(nextStates[i],c);
            if(!isIn(nextStates[i],queue) 
				&& !isIn(nextStates[i],visitedList))
                queue.push(nextStates[i]);
        }
        queue = sortByF(queue);
    }
	var endDist = distMap[queue[0].pos.y][queue[0].pos.x];
    var topN = Number.MAX_VALUE;
    for(var i=0; i < queue.length; i++) {
		if(i > topN)
			break;
        var slide = queue[i];
        while(slide.prev != undefined && (slide.prev.next == undefined || !isIn(slide,slide.prev.next))) {
            var tmp = slide;
            slide = slide.prev;
            if(slide.next == undefined)
                slide.next = [];
            slide.next.push(tmp);
        }
    }
    if(prop("verbose"))
		console.log(" > Computed route visiting",step,"states in",(new Date().getTime() - startTime),"ms, route end dist:",endDist);
	return route;
}
var getDistmap = function(c) {
	//-1 fal, 0 cél, minden más: táv, Inf még nem néztem
    var startTime = new Date().getTime();
	var map = [];
	for(var i=0; i<c.length; i++) {
		map.push([]);
		for(var j=0; j<c[i].length; j++) {
			var cell = Infinity;
			if(c[i][j] == 100)
				cell = 0;
			if(c[i][j] < 0)
				cell = -1;
			map[i].push(cell);
		}
	}
	var change = false;
	do {
		change = false;
		for(var i=0; i<map.length; i++)
			for(var j=0; j<map[i].length; j++)
				if(map[i][j] > 0) {
					var minNeigh = Infinity;
					for(var ii=Math.max(i-1,0); ii<Math.min(i+2,map.length); ii++)
						for(var jj=Math.max(j-1,0); jj<Math.min(j+2,map[i].length); jj++)
							if(map[ii][jj] != -1 && map[ii][jj] < minNeigh)
								minNeigh = map[ii][jj];
					if(minNeigh + 1 < map[i][j]) {
						map[i][j] = minNeigh + 1;
						change = true;
					}
				}
	} while(change);
	return map;
}
this.init = function(c, playerdata, selfindex)  {
	distMap = getDistmap(c);
	console.log("Initiated",{
		verbose:prop("verbose"),
		wild:prop("wild"),
		mean:prop("mean")
	});
}
this.movefunction = function(c, playerdata, selfindex)  {
	try {
		if(prop("verbose"))
			console.log("My turn");

		this.route = getRoute(c,playerdata,selfindex,600); //900

		var currentState = this.route;

		var optionIndex = undefined;
		for(var i=0; i<this.route.next.length; i++) {
			if(lc.playerAt(flip(this.route.next[i].pos)) == -1) {
				optionIndex = i;
				break;
			}
		}

		if(prop("mean")) {
			for(var i=0; i<this.route.next.length; i++) {
				for(var p=0; p<playerdata.length; p++) {
					if(p != selfindex && playerdata[p].penalty == 0) {
						var possibleStates = stateTransition(getState(c,playerdata,p),c);
						if(possibleStates.length == 1) {
							if(lc.equalPoints(flip(possibleStates[0].pos),flip(this.route.next[i].pos))
								&& (lc.playerAt(flip(this.route.next[i].pos)) == -1
								|| lc.playerAt(flip(this.route.next[i].pos)) == selfindex)) {
								optionIndex = i;
								console.log("HAHAHAHAHAHAHAHAHAHAHAHAHAHAHAHAHAHA");
								break;
							}
						}
					}
				}
			}
		}

		if(optionIndex != undefined) {
			this.route = this.route.next[optionIndex];
			var next = this.route;
			if(prop("verbose"))
				console.log(" > Chosing option",optionIndex);
			return flip({
				x: next.pos.x - currentState.pos.x - currentState.speed.x,
				y: next.pos.y - currentState.pos.y - currentState.speed.y
			});
		}
		return {x: 0, y: 0};
	}
	catch(e) {
		console.log("Error occured",e.stack);
		return {x: 0, y: 0};
	}
}