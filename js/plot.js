var color = d3.scale.category20();
var width = 700,
    height = 600;

var svg = d3.select("#area1").append("svg")
    .attr("width", width)
    .attr("height", height);

var currentJson;
var id_idx_map = {};
var oldNodes;
var linemode=false;
var nthbig = 0;
var maxWeight;
var data_prefix="data/"
var parseDate = d3.time.format("%Y-%m-%d").parse;

function plot(){
  cha
  .append("g")
  .attr("transform",
        "translate(" + (margin.left) + "," + (margin.top) + ")")
        ;

        cha.append("rect")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("fill", "#fbfbfb");

  d3.csv("data/rt_counts.csv", function(error, data) {
    data.forEach(function(d) {
        d.file = d.file;
        d.rts = d.rts;
        d.date = parseDate(d.date);
    });

    // Scale the range of the data
    x.domain(d3.extent(data, function(d) { return d.date; }));
    y.domain([0, 10000+d3.max(data, function(d) { return Number(d.rts); })]);

    // Add the valueline path.
    cha.append("path")
        .attr("class", "line")
        .attr("d", valueline(data));

    // Add the X Axis
    cha.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + cha_ht + ")")
        .call(xAxis);

    // Add the Y Axis
    cha.append("g")
        .attr("class", "y axis")
        .call(yAxis);

        cha.selectAll("dot")
          .data(data)
        .enter().append("circle")
          .attr("r", 3.5)
                .attr("stroke-opacity",0.7)
          .attr("fill-opacity",0.5)
          .attr('stroke', function(d){ if (d.file==curr_graph)
            {return 'purple'} else {return '#999'}})
            .attr('fill', function(d){ if (d.file==curr_graph)
              {return 'purple'} else {return '#fff'}})
          //.attr('fill', '#fff')
          .attr('stroke-width', '2')
          .attr("cx", function(d) { return x(d.date); })
          .attr("cy", function(d) { return y(d.rts); })
          .on('click',dot_click);
  });
}


var refresh = function(){

  var arrByID = currentJson.links.filter(filterSelfLinks);
  console.log(arrByID)
  maxWeight = Math.max.apply(Math,arrByID.map(function(o){return o.weight;}))
  console.log(maxWeight)

  plot();
  color_button();
  findnthbig();


  svg.append("text")
    .style("fill", "black")
    .attr("x", 150)
    .attr("y", height-10)
    .attr("text-anchor", "end")
    .style('font-family','sans-serif')
    .style('font-size','12px')
    .text(curr_graph);

  playButton(svg);
  var force = d3.layout.force()
      // .gravity(0.1)
      // .distance(10)
      .charge(-700)
      .size([width, height])
      .nodes(currentJson.nodes)
      .links(currentJson.links)
      // scale weight so distances dont get crazy
      .linkDistance(function(l){
          return Math.min(l.weight, 1);
        })
      .start();

  var link = svg.selectAll(".link")
      .data(currentJson.links)
    .enter()
      .append("g")
        .attr("class", "link")
        .attr("id", function(d){
          return "link-"+d.source.index+"-"+d.target.index;
        })
      .append("line")
        .style("stroke", langcolor)
        .style("stroke-opacity", function(d){
          return Math.log2(d.weight+1)/Math.log2(maxWeight)});

  var node = svg.selectAll(".node")
      .data(currentJson.nodes)
      .enter().append("g")

      .attr("class", "node")
      .attr("id", function(d){
        return "node"+d.index;
      })
      .on("mouseover", mouseover)
      .on("mouseout",mouseout)
      .on("dblclick",dblclick)

      // STILL PART OF NODE
      .on("click", function(d){
        stop();
        // store force node positions
        oldNodes = currentJson.nodes;
        node_id_map();
        head_height = height / 2;

        force.stop();
        force.on("tick", function(){});

        d.x = 80
        d.y = head_height;

        linemode=true;

        d3.select("#node"+d.index)
              .attr('transform', function(d){
                return 'translate('+d.x+', '+d.y+')';
              });

        var visited = [d.index];
        var frontier = [];
        var levels = {};
        levels[d.index]=0
        var pa_child = {};
        var changed = true;
        var epochs = 0;

        // padding
        y_start = head_height - (height/4)
        var lasty = y_start ;


        var propagate = function(a, b, t1, t2){
          /**
          a: source node of link
          b: target node of link
          t1: list of visited nodes
          t2: list of frontier nodes

          **/

          // if source node is in visited
          if((t1.indexOf(a.index) >= 0)
          // if target node is not in frontier
           && (t2.indexOf(b.index) < 0)
           // if target node is not in visited nodes
            && (t1.indexOf(b.index) < 0)
            // if they are not the same nodes
            && (a.index != b.index)) {

            console.log(Object.keys(levels).length)
            // move target node away from source node
            levels[b.index] = levels[a.index] + 1;
            pa_child[b.index] = a.index;

            lasty += 2 * b.rts / 50;

            // add target node to list of frontier nodes
            t2.push(b.index);
            return true;
          }
          return false;
        };

        while(changed) {
          changed = false;
          for(var i_link=0, len=currentJson.links.length;i_link < len;i_link++){

            changed = propagate(currentJson.links[i_link].source,
              currentJson.links[i_link].target, visited, frontier) || changed;

            changed = propagate(currentJson.links[i_link].target,
              currentJson.links[i_link].source, visited, frontier) || changed;
          }

          visited = visited.concat(frontier);
          lasty = y_start;
          console.log("Epoch "+epochs+". Length: "+visited.length);
          epochs++;
        }

        var max_level = Math.max.apply(null,Object.keys( levels ).map(
          function ( key ) { return levels[key]; }));
        for (var i = 0; i <= max_level;i++){
            var items_at_level = 0;

            var level_nodes = [];
            for (var key in levels){
              if (levels[key]==i){
                items_at_level += 1;
                level_nodes.push(key);
                console.log('pushed: '+key);
              }
            }

            console.log('items at level: '+items_at_level)
            for(var j = 0; j < level_nodes.length; j++){
              currentJson.nodes[level_nodes[j]].x = ((width-200)*i)/
              max_level + 10
              currentJson.nodes[level_nodes[j]].y = (j+1)*((height-50)/
              items_at_level);
            }
        }

        console.log(epochs+" epochs");
        for(var i_node=0;i_node<currentJson.nodes.length;i_node++){
          var b = currentJson.nodes[i_node];
          if(b.id == "\"Dbnmjr\""){
            console.log(b.id, b.x);
          }
          d3.select("#node"+b.index)
                .attr('transform', function(d){
                  return 'translate('+d.x+', '+d.y+')';
                });
        }

        for(var i_link=0, len=currentJson.links.length;i_link < len;i_link++){
          var link = currentJson.links[i_link];
          d3.select("#link-"+link.source.index+"-"+link.target.index).remove();
        }
        svg.selectAll(".link")
            .data(currentJson.links)
          .enter()
            .append("g")
              .attr("class", "link")
              .attr("id", function(d){
                return "link-"+d.source.index+"-"+d.target.index;
              })
            .append("line")
              .attr("x1", function(d) { return d.source.x })
              .attr("y1", function(d) { return d.source.y; })
              .attr("x2", function(d) { return d.target.x; })
              .attr("y2", function(d) { return d.target.y; })
              .style("stroke", langcolor)
              .style("stroke-opacity", function(d){
                return Math.log2(d.weight+1)/Math.log2(maxWeight)});;

        svg.selectAll(".link")
              .on("mouseover", linkOver)
              .on("mouseout", linkOut);

        var linkText = svg.selectAll(".link")
            .append("text")
              .attr("class", "link-label")
              .attr("font-family", "Arial, Helvetica, sans-serif")
              .attr("fill", "Black")
              .style("font", "normal 12px Arial")
              .attr("text-anchor", "middle")
              .text(function(d) {
                  if(d.source != d.target && d.source.x != d.target.x){
                    return d.weight;
                  }
              })
              .style("stroke-opacity", 0)
              .style("fill-opacity", 0);
        linkText
            .attr("x", function(d) {
                return (d.source.x + d.target.x) / 2;
            })
            .attr("y", function(d) {
                return (d.source.y + d.target.y) / 2;
            });
      });

      //FINISH NODE??
      d3.selection.prototype.moveToFront = function() {
        return this.each(function(){
          this.parentNode.appendChild(this);
        });

      };

  node.append("circle")
       // make node size relevant to number of RTs
      .attr("r",function(d){return getsize(d)})
      .attr("x", -8)
      .attr("y", -8)
      .attr("width", 16)
      .attr("fill-opacity",0.7)
      .attr("stroke-opacity",0.7)
      .attr("height", 16);


  // show names always

  node.append("text")
      .attr("dx", 12)
      .attr("dy", ".35em")
      .text(function(d) { return bignodetext(d) })
      .attr('class','shadow');
  node.append("text")
          .attr("dx", 12)
          .attr("dy", ".35em")
          .attr('class','back')
          .text(function(d){return bignodetext(d)});

  force.on("tick", function() {

    var minX = 0, maxX = width;
    var minY = 0, maxY = height;
    // var minX = currentJson.nodes[0].x, maxX = currentJson.nodes[0].x;
    // var minY = currentJson.nodes[0].y, maxY = currentJson.nodes[0].y;
    for(var i=0,len=currentJson.nodes.length;i<len;i++){
      minX = Math.min(minX, currentJson.nodes[i].x);
      maxX = Math.max(maxX, currentJson.nodes[i].x);
      minY = Math.min(minY, currentJson.nodes[i].y);
      maxY = Math.max(maxY, currentJson.nodes[i].y);
    }

    for(var i=0,len=currentJson.nodes.length;i<len;i++){
      currentJson.nodes[i].x = width*(currentJson.nodes[i].x - minX) / (maxX - minX);
      currentJson.nodes[i].y = height*(currentJson.nodes[i].y - minY) / (maxY - minY);
    }


    link.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    node.attr("transform", function(d) { return "translate(" + d.x + ","
     + d.y + ")"; });

  });
};


var allGraphs = getAllGraphs();
var graphSelect = document.getElementById("graphSelect");

graphSelect.onchange = function() {
    var graphSelect = document.getElementById("graphSelect");
    var selectedValue = graphSelect.options[graphSelect.selectedIndex].value;
    d3.selectAll("svg > *").remove();
    stop();
    update(allGraphs[selectedValue])
}

for (var i=0;i<allGraphs.length;i++){
  var option = document.createElement("option");
  option.text = allGraphs[i];
  option.value = i;
  graphSelect.add(option);
}


var curr_graph = allGraphs[0];
d3.json(data_prefix+curr_graph, function(error, json) {
  if (error) throw error;
  currentJson = json;
  refresh();

});

var step = -1;
var i = 1;
var moving = true;

playButton(svg);

//////////////////

var margin = {top: 10, right: 20, bottom: 10, left: 5}
// Parse the date / time
var cha_ht = 200 - margin.top - margin.bottom;
var cha_wd = width - margin.left - margin.right;
// Set the ranges
var x = d3.time.scale().range([0, cha_wd]);
var y = d3.scale.linear().range([cha_ht, 0]);


// Define the axes
var xAxis = d3.svg.axis().scale(x)
  .orient("bottom").ticks(7);

var yAxis = d3.svg.axis().scale(y)
  .orient("right").ticks(5);

// Define the line
var valueline = d3.svg.line()
    .x(function(d) { return x(d.date); })
    .y(function(d) { return y(d.rts); });

// Adds the svg canvas
var cha = d3.select("#area2")
  .append("svg")
    .attr("width", cha_wd+ margin.left + margin.right)
    .attr("height", cha_ht+ margin.top + margin.bottom)
    .attr('fill','gray');

    run_timer(i);
