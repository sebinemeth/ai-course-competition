this.properties = 0b001; //MSB to LSB: verbose_wild_mean

class MapData {
	constructor(car,c,startPos,selfindex) {
		this.car = car;
		this.c = c;
		this.startPos = startPos;
		this.selfindex = selfindex;
		this.startDistMap = undefined;
		this.goalDistMap = undefined;
		this.goalVisible = false;
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

		//map is wrong, reset needed
		//if(this.goalDistMap != undefined && this.goalDistMap[this.startPos.y][this.startPos.x] == Infinity) this.reset();
		//----

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
	}
	getH(state) {
		if(this.goal(state))
			return 0;
		if(this.goalDistMap[state.pos.y][state.pos.x] == undefined ||
			this.goalDistMap[state.pos.y][state.pos.x] == Infinity)
			return Infinity;
		var h = this.goalDistMap[state.pos.y][state.pos.x] + Math.floor(Math.sqrt(this.maxDist - this.startDistMap[state.pos.y][state.pos.x])); 
		//oily-sandy prediction
		if(state.speed != undefined)
			if(this.oily(state) || this.sandy(state))
				h += 15/this.car.stateTransition(state).length;
		else {/*the function is called in a static environment*/}
		if(!isNaN(h))
			return h;
		return undefined;
	}
	
	goal(state) {
		return this.c[state.pos.y][state.pos.x] == 100;
	}

	oily(state) {
		return this.c[state.pos.y][state.pos.x] == 91;
	}

	sandy(state) {
		return this.c[state.pos.y][state.pos.x] == 92;
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

	reset() {
		//this.startDistMap = undefined;
		//this.goalDistMap = undefined;
		this.goalVisible = false;
		console.log(" > WARNING: resetted");
	}

	initDraw() {
		var div;
		var control;
		var cellsize = parseInt(document.getElementById("track").children[0].getAttribute("width"));
		// we do not have the container yet
		if(document.getElementById("drawDiv") == null) {
			div = document.createElement("div");
			div.id = "drawDiv";
			div.style.position = "absolute";
			
			div.style.top = (8-cellsize/2)+"px";
			div.style.left = (8-cellsize/2)+"px";

			control = document.createElement("fieldset");
			control.id = "drawControl";
			control.style.position = "absolute";
			control.style.width = "100px";
			control.style.top = "8px";
			control.style.left = (this.c[0].length * cellsize) +"px";
			control.innerHTML = '<legend>Draw settings</legend>'+
				'<h3>Opacity</h3>'+
				'<input type="range" id="alpha" min="0" max="1" step="0.1" value="0.7">'+
				'<h3>Player</h3>'+
				'<input type="radio" id="none" name="drawSelection" value="none"><label for="none">none</label><br>';
			div.appendChild(control);
		}
		else {
			div = document.getElementById("drawDiv");
			control = document.getElementById("drawControl");
		}
		control.innerHTML += '<input type="radio" id="opt'+this.selfindex+'" name="drawSelection" value="'+this.selfindex+'" checked><label for="opt'+this.selfindex+'">'+this.selfindex+'</label><br>';
		
		var table = document.createElement("table");
		table.id = "draw"+this.selfindex;
		table.style.borderCollapse = "collapse";
		table.style.borderSpacing = "0px";
		table.style.display = "none";

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
		div.appendChild(table);
		document.body.appendChild(div);
	}

	draw() {
		if(document.getElementById("draw"+this.selfindex) == null)
			this.initDraw();
		var table = document.getElementById("draw"+this.selfindex);
		for(var i=0; i<this.c.length; i++) 
			for(var j=0; j<this.c[i].length; j++) {
				var cell = table.children[i].children[j];
				var alpha = document.getElementById("alpha").value;
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
				
		this.updateDrawDiv();
	}

	updateDrawDiv() {
		var control = document.getElementById("drawControl");
		var inputs = control.getElementsByTagName("input");
		for(var i=0; i<inputs.length; i++){
			var table = document.getElementById("draw"+inputs[i].value);
			if(table != null)
				table.style.display = inputs[i].checked ? "block" : "none";
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
			
			//out of c
			if(p2.y >= c.length || p2.y < 0 || p2.x >= c[0].length || p2.x < 0)
				continue;
			
			//move is invalid
			if (!lc.validVisibleLine(c,flip(p1), flip(p2)) || //obstacle in the way
				c[p2.y][p2.x] < 0) { //is wall
				continue;
				var obj = {
					speed: { x: state.speed.x + i, y: state.speed.y + j },
					invalid: false
				};
			}
			else {
				var obj = {
					pos: p2,
					speed: { x: state.speed.x + i, y: state.speed.y + j },
					prev: state,
					invalid: false,
					cost: 1
				};
			}
			nextStates.push(obj);
		}
	}
	if(this.mapData.oily(state) && length(state.speed) != 0) {
		nextStates = nextStates.sort(function(a,b){
			var a_diff = Math.abs(length(a.speed) - length(state.speed));
			var b_diff = Math.abs(length(b.speed) - length(state.speed));
			if (a_diff < b_diff) //a<b
				return -1;
			if (a_diff > b_diff) //a>b
				return 1;
			return 0; //a=b
		});
		nextStates = nextStates.slice(0,3);
	}
	if(this.mapData.sandy(state) && length(state.speed) != 0) {
		nextStates = nextStates.sort(function(a,b){
			if (length(a.speed) < length(b.speed)) //a<b
				return -1;
			if (length(a.speed) > length(b.speed)) //a>b
				return 1;
			return 0; //a=b
		});
		nextStates = nextStates.slice(0,3);
	}
	//remove invalid
	for(var i=0; i<nextStates.length; i++)
		if(nextStates[i].invalid)
			nextStates.splice((i--),1);
	//set penalty costs
	for(var i=0; i<nextStates.length; i++) {
		if(this.mapData.oily(nextStates[i]) || this.mapData.sandy(nextStates[i])) //a kovetkezo necces lesz
			nextStates[i].cost = 1;
		if((this.mapData.oily(state) || this.mapData.sandy(state)) && length(state.speed) != 0) {//mar most necces szoval nem biztos hogy egyaltalan mi lesz a kovetkezo
			nextStates[i].cost = (nextStates.length/3)*1 + ((3-nextStates.length)/3)*10; //várható értékben a cost
			//debugger;
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
this.playerAt = function(pos,playerdata,selfindex) {
	for(var i=0; i<playerdata.length; i++)
		if(i != selfindex && lc.equalPoints(playerdata[i].pos,pos))
			return true;
	return false;
}
this.init = function(c, playerdata, selfindex) {
	this.mapData = new MapData(this,c,flip(playerdata[selfindex].pos),selfindex);
	this.mapData.update(c);
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

		var optionIndex = 0; // undefined;
		for (var i = 0; i < this.route.next.length; i++) {
			if (!this.playerAt(flip(this.route.next[i].pos),playerdata,selfindex)) {
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
								&& !this.playerAt(flip(this.route.next[i].pos),playerdata,selfindex)) {
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
				console.log(">",optionIndex,"state:",next.pos,"cost:",next.cost,"h:",this.mapData.getH(next));
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