this.properties = 0b001; //MSB to LSB: verbose_wild_mean

class MapData {
	constructor(c,startPos) {
		this.c = c;
		this.startPos = startPos;
		this.startDistMap = undefined;
		this.goalDistMap = undefined;
		this.goalVisible = false;
		this.update(c);
	}
	update(c) {
	
		//update c
		for(var i=0; i<c.length; i++)
			for(var j=0; j<c[i].length; j++) {
				if(this.c[i][j] == undefined)
					this.c[i][j] = c[i][j];
				if(c[i][j] == 100) {// -> we have to change paradigm
					if(!this.goalVisible &&
						this.startDistMap != undefined &&
						this.startDistMap[i][j] < Infinity) { // this goal can be accessed from the startpoint

						console.log("I see my target");
						this.goalVisible = true;
					}
				}
			}

		//update distmap
		/* distMap format
		1. goal not visible
			- undefined: not visible
			- Infinity: not yet graded, unreachable
			- <Number>: distance to startposition
			- <-1>: wall 
		2. goal visible
			- undefined: not visible
			- Infinity: not yet graded, unreachable
			- <Number>: distance to nearest goal
			- <-1>: wall
		*/

		//init startDistMap if needed
		if(this.startDistMap == undefined) {
			this.startDistMap = [];
			for (var i = 0; i < this.c.length; i++) {
				this.startDistMap.push([]);
				for (var j = 0; j < this.c[i].length; j++) {
					var cell = Infinity;
					if(this.c[i][j] < 0)
						cell = -1;
					if(this.c[i][j] == undefined)
						cell = undefined;
					this.startDistMap[i].push(cell);
				}
			}
			this.startDistMap[this.startPos.y][this.startPos.x] = 0;
		}

		//add new fields to startDistMap
		for (var i = 0; i < this.c.length; i++)
			for (var j = 0; j < this.c[i].length; j++)
				if(this.c[i][j] != undefined && this.startDistMap[i][j] == undefined) {
					this.startDistMap[i][j] = Infinity;
					if(this.c[i][j] < 0)
						this.startDistMap[i][j] = -1;
				}
		//spread changes
		this.spread(this.startDistMap);

		//reset goalDistMap
		this.goalDistMap = [];
		for (var i = 0; i < this.c.length; i++) {
			this.goalDistMap.push([]);
			for (var j = 0; j < this.c[i].length; j++) {
				var cell = Infinity;
				if(this.goalVisible && this.c[i][j] == 100 && this.startDistMap[i][j] < Infinity)
					cell = 0;
				if(!this.goalVisible && this.horizon({x:j, y:i}) && this.startDistMap[i][j] < Infinity)
					cell = 0;
				if(this.c[i][j] < 0)
					cell = -1;
				if(this.c[i][j] == undefined)
					cell = undefined;
				this.goalDistMap[i].push(cell);
			}
		}
		//spread changes
		this.spread(this.goalDistMap);

		//setting maxDist
		if(!this.goalVisible) {
			this.maxDist = 0;
			for (var i = 0; i < this.startDistMap.length; i++)
				for (var j = 0; j < this.startDistMap[i].length; j++)
					if(this.startDistMap[i][j] > this.maxDist && this.startDistMap[i][j] != Infinity)
						this.maxDist = this.startDistMap[i][j];
		}

		//draw map overlay
		//this.draw()
		//----
		
		//map is wrong
		//if(this.goalDistMap[this.startPos.y][this.startPos.x] == Infinity) throw "problem";
		//----
	}
	getH(state) {
		if(this.goal(state))
			return 0;
		if(this.goalDistMap[state.pos.y][state.pos.x] == undefined ||
			this.goalDistMap[state.pos.y][state.pos.x] == Infinity)
			return Infinity;
		var h = this.goalDistMap[state.pos.y][state.pos.x] + Math.floor(Math.sqrt(this.maxDist - this.startDistMap[state.pos.y][state.pos.x])); 
		if(!isNaN(h))
			return h;
		console.log("got NaN from expr:", this.goalDistMap[state.pos.y][state.pos.x], "+ Math.floor(Math.sqrt(", this.maxDist, "-", this.startDistMap[state.pos.y][state.pos.x],"))");
		return this.goalDistMap[state.pos.y][state.pos.x];
	}
	
	goal(state) {
		return this.c[state.pos.y][state.pos.x] == 100;
	}

	horizon(pos) {
		for(var i=Math.max(0,pos.y-1); i<=Math.min(this.c.length-1,pos.y+1); i++)
			for(var j=Math.max(0,pos.x-1); j<=Math.min(this.c[i].length-1,pos.x+1); j++)
				if(this.c[i][j] == undefined)
					return true;
		return false;
	}

	spread(map) {
		var change = false;
		do {
			change = false;
			for (var i = 0; i < map.length; i++)
				for (var j = 0; j < map[i].length; j++)
					if (map[i][j] > 0) {
						var minNeigh = Infinity;
						for (var ii = Math.max(i - 1, 0); ii < Math.min(i + 2, map.length); ii++)
							for (var jj = Math.max(j - 1, 0); jj < Math.min(j + 2, map[i].length); jj++)
								if (map[ii][jj] != -1 && map[ii][jj] < minNeigh)
									minNeigh = map[ii][jj];
						if (minNeigh + 1 < map[i][j]) {
							map[i][j] = minNeigh + 1;
							change = true;
						}
					}
		} while (change);
	}

	initDraw() {
		var table = document.createElement("table");
		var cellsize = parseInt(document.getElementById("track").children[0].getAttribute("width"));
		table.id = "draw";
		table.style.borderCollapse = "collapse";
		table.style.borderSpacing = "0px";
		table.style.position = "absolute";
		table.style.top = (8-cellsize/2)+"px";
		table.style.left = (8-cellsize/2)+"px";

		for(var i=0; i<this.c.length; i++) {
			var row = document.createElement("tr");
			for(var j=0; j<this.c[i].length; j++) {
				var cell = document.createElement("td");
				cell.style.textAlign = "center";
				cell.style.fontSize = (cellsize / 2) + "px";
				cell.style.fontFamily = "monospace";
				cell.style.padding = "0px";
				cell.style.height = cellsize + "px";
				cell.style.width = cellsize + "px";
				cell.title = "{x:"+j+",y:"+i+"}";
				row.appendChild(cell);
			}
			table.appendChild(row);
		}
		document.body.appendChild(table);
	}

	draw() {
		if(document.getElementById("draw") == null)
			this.initDraw();
		var table = document.getElementById("draw");
		for(var i=0; i<this.c.length; i++) 
			for(var j=0; j<this.c[i].length; j++) {
				var cell = table.children[i].children[j];
				var alpha = "0.7";
				var bg_color = "rgba(0,255,0,"+alpha+")";
				var text = this.getH({pos:{x:j,y:i},speed:{x:1,y:0}});
				if(this.goalDistMap[i][j] == undefined) {
					text = "";
					bg_color = "rgba(0,0,0,"+alpha+")";
				}
				if(this.goalDistMap[i][j] == Infinity) {
					bg_color = "rgba(255,0,0,"+alpha+")";
					text = "Inf";
				}	
				if(this.goalDistMap[i][j] == -1) {
					bg_color = "rgba(127,127,127,"+alpha+")";
					text = "";
				}
				
				cell.innerHTML = text;
				cell.style.backgroundColor = bg_color;
			}
				
	}
}


this.prop = function(name) {
	switch (name) {
		case "verbose":
			return (this.properties & 4) == 4;
		case "wild":
			return (this.properties & 2) == 2;
		case "mean":
			return (this.properties & 1) == 1;
		default:
			throw Error("no such property");
	}
}
var equalState = function(s1, s2) {
	if (s1 === undefined || s2 === undefined)
		return false;
	return s1.pos.x == s2.pos.x &&
		s1.pos.y == s2.pos.y &&
		s1.speed.x == s2.speed.x &&
		s1.speed.y == s2.speed.y;
	return JSON.stringify(s1.pos) == JSON.stringify(s2.pos) &&
		JSON.stringify(s1.speed) == JSON.stringify(s2.speed);
}
var length = function(p) {
	return Math.sqrt(Math.pow(p.x, 2) + Math.pow(p.y, 2));
}
var flip = function(p) {
	return { x: p.y, y: p.x };
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
this.stateTransition = function(state) {
	var nextStates = [];
	var c = this.mapData.c;
	if (this.mapData.goal(state))
		return nextStates;
	for (var i = -1; i < 2; i++) {
		for (var j = -1; j < 2; j++) {
			var p1 = state.pos;
			var p2 = { x: state.pos.x + state.speed.x + i, y: state.pos.y + state.speed.y + j };
			//move is invalid
			if ((p2.y >= c.length || p2.y < 0 || p2.x >= c[0].length || p2.x < 0) || //out of c
				!lc.validVisibleLine(c,flip(p1), flip(p2)) || //obstacle in the way
				c[p2.y][p2.x] < 0) {
				continue;
				nextStates.push({
					pos: p1,
					speed: { x: 0, y: 0 },
					prev: state,
					invalid: true,
					cost: 6
				});
			}
			else
				nextStates.push({
					pos: p2,
					speed: { x: state.speed.x + i, y: state.speed.y + j },
					prev: state,
					cost: 1
				});
		}
	}
	return nextStates;
}
var isIn = function(state, list, withLessOrEqual) {
	for (var i = 0; i < list.length; i++)
		if (equalState(state, list[i])) {
			if (withLessOrEqual === undefined) return true;
			else if (list[i].f <= state.f) return true;
		}
	return false;
}
var sortByF = function(list) {
	return list.sort(function(a, b) {
		if (a.f < b.f)
			return -1;
		if (a.f > b.f)
			return 1;
		return 0;
	});
}
this.getRoute = function(c, playerdata, selfindex, stepLimit) {
	stepLimit = this.mapData.maxDist - this.mapData.startDistMap[playerdata[selfindex].pos.x][playerdata[selfindex].pos.y] / 3;
	//console.log(stepLimit);
	var startTime = new Date().getTime();

	route = getState(c, playerdata, selfindex);
	route.cumSpeed = route.speed;
	route.totalCost = 0;

	var queue = [];
	queue.push(route);

	var step = 0;
	var visitedList = [];
	while (queue.length > 0) {
		step++;
		//TODO kilépési kritérium
		if (step > stepLimit)
			break;
		if (this.mapData.goal(queue[0]))
			break;
		var curState = queue.shift();
		visitedList.push(curState);
		var nextStates = this.stateTransition(curState);
		for (var i = 0; i < nextStates.length; i++) {
			nextStates[i].totalCost = curState.totalCost + nextStates[i].cost;
			nextStates[i].f = nextStates[i].totalCost + this.mapData.getH(nextStates[i]);
			if (!isIn(nextStates[i], queue, "wle")
				&& !isIn(nextStates[i], visitedList, "wle"))
				queue.push(nextStates[i]);
		}
		queue = sortByF(queue);
	}
	var topN = Number.MAX_VALUE;
	for (var i = 0; i < queue.length; i++) {
		if (i > topN)
			break;
		var slide = queue[i];
		while (slide.prev != undefined && (slide.prev.next == undefined || !isIn(slide, slide.prev.next))) {
			var tmp = slide;
			slide = slide.prev;
			if (slide.next == undefined)
				slide.next = [];
			slide.next.push(tmp);
		}
	}
	if (this.prop("verbose"))
		console.log(" > Computed route visiting", step, "states in", (new Date().getTime() - startTime), "ms, route end dist:");
	return route;
}
this.init = function(c, playerdata, selfindex) {
	this.mapData = new MapData(c,flip(playerdata[selfindex].pos));
	console.log("Initiated", {
		verbose: this.prop("verbose"),
		wild: this.prop("wild"),
		mean: this.prop("mean")
	});
}
this.movefunction = function(c, playerdata, selfindex) {
	this.mapData.update(c);
	try {
		if (this.prop("verbose"))
			console.log("My turn");

		this.route = this.getRoute(c, playerdata, selfindex, 600); //900

		var currentState = this.route;

		var optionIndex = undefined;
		for (var i = 0; i < this.route.next.length; i++) {
			if (lc.playerAt(flip(this.route.next[i].pos)) == -1 || lc.playerAt(flip(this.route.next[i].pos)) == selfindex) {
				optionIndex = i;
				break;
			}
		}

		if (this.prop("mean")) {
			for (var i = 0; i < this.route.next.length; i++) {
				for (var p = 0; p < playerdata.length; p++) {
					if (p != selfindex && playerdata[p].penalty == 0) {
						var possibleStates = this.stateTransition(getState(c, playerdata, p));
						if (possibleStates.length == 1) {
							if (lc.equalPoints(flip(possibleStates[0].pos), flip(this.route.next[i].pos))
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

		if (optionIndex != undefined) {
			this.route = this.route.next[optionIndex];
			var next = this.route;
			if (this.prop("verbose"))
				console.log(" > Chosing option", optionIndex);
			if(this.mapData.getH(next) == Infinity)
				console.log(this.mapData.c);
			return flip({
				x: next.pos.x - currentState.pos.x - currentState.speed.x,
				y: next.pos.y - currentState.pos.y - currentState.speed.y
			});
		}
		return { x: 0, y: 0 };
	}
	catch (e) {
		console.log("Error occured", e.stack);
		return { x: 0, y: 0 };
	}
}