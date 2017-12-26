function dblclick(d){

  if (linemode) {
  d3.selectAll("svg > *").remove();
  d3.json(data_prefix+curr_graph, function(error, json) {
    // update only LINKS if change selected value
    if (error) throw error;

    currentJson.links = json.links;
    currentJson.nodes = json.nodes;

    update_pos();
    refresh();
    linemode = false;
  });}
}

function dot_click(d){

  d3.selectAll("svg > *").remove();
  stop();
  console.log(d.file)
    update(d.file);
}

function linkOver(d, i) {
  console.log("Over", i);
  d3.select(this).select("text").transition()
        .style("stroke-opacity", 0.4)
        .style("fill-opacity", 1);
}

function linkOut(d, i) {
  console.log("Out", i);
  d3.select(this).select("text")
      .transition()
      .delay(1000)
      .duration(1000)
      .style("stroke-opacity", 0)
      .style("fill-opacity", 0);
}
function mouseover(d) {
  svg.selectAll('.node').selectAll('text').remove();
  svg.selectAll('.node').selectAll('text.shadow').remove();

  d3.select(this).select("circle")
    .transition()
      .duration(750).attr("r",function(d){return 3+getsize(d);})

  svg.selectAll('.link')
    .style('stroke-width',function(p){
      if((p.source==d) || (p.target==d)){return 3 } return 1
    })

  linked_to = {};
  rt_counts = [];
  for (var i =0; i < currentJson.links.length; i++){
    curr = currentJson.links[i]

    if ((curr.source==d) &
      !(curr.target.id in linked_to)){
      //linked_to.push(currentJson.links[i].target);
      rt_counts.push(Number(curr.target.rts));
      linked_to[curr.target.id]=parseInt(curr.target.rts);
    }
    if ((curr.target==d)&!(curr.source.id in linked_to)){
      //linked_to.push(currentJson.links[i].source);
      rt_counts.push(Number(curr.source.rts));
      linked_to[curr.source.id]=parseInt(curr.source.rts);
    }
  }

  rt_counts.sort(compareNumbers);

  var thr = rt_counts.length - 3;

  svg.selectAll('.node')
    .append("text")
      .attr("class", "shadow")
      .attr("dx", 12)
      .attr("dy", ".35em")
      .text(function(p) {
        if((p.id in linked_to)&
          ((linked_to[p.id]>=rt_counts[thr])|(thr<0))) {
            return p.id+" : "+p.rts+" RTs"
          }
        });

  svg.selectAll('.node')
    .append("text")
      .attr("class", "hover")
      .attr("dx", 12)
      .attr("dy", ".35em")
      .text(function(p) {if((p.id in linked_to)&
        ((linked_to[p.id]>=rt_counts[thr])|(thr<0))){
        return p.id+" : "+p.rts+" RTs"}});

    d3.select(this).moveToFront()
      .append("text")
        .attr("class", "hover")
        .attr("class", "shadow")
        .attr("dx", 12)
        .attr("dy", ".35em")
        .text(d.id+" : "+d.rts+" RTs");
    d3.select(this).moveToFront()
      .append("text")
        .attr("class", "hover")
        .attr("dx", 12)
        .attr("dy", ".35em")
        .text(d.id+" : "+d.rts+" RTs");
}

function mouseout(d) {
  d3.select(this)
    .select("circle").transition()
          .duration(750)
          .attr("r", function(d){return getsize(d)});


          svg.selectAll('.node').selectAll('text.hover').remove();
          svg.selectAll('.node').selectAll('text.shadow').remove();

          svg.selectAll('.node').append("text")
              .attr("dx", 12)
              .attr("dy", ".35em")
              .text(function(d) { return bignodetext(d) })
              .attr('class','shadow');

          svg.selectAll('.node').append("text")
                  .attr("dx", 12)
                  .attr("dy", ".35em")
                  .text(function(d){return bignodetext(d)});

  svg.selectAll('.link').style('stroke',langcolor).style('stroke-width',1)
}

function langcolor(d){
      if(d.weightUK / d.weight < 0.1) {
        // purple
        return '#a31aff';
      }
      if(d.weightRU / d.weight < 0.1) {
        // blue
        return "#0073e6";
      }
      // gray
      return "#AAAAAA";
}

function color_button(){
  var color = 'red';
  if (moving){
    color = 'white'
  }
  svg.select("g").select('path')
      .style("fill",color);
}

function bignodetext(d){
   if(d.rts > nthbig){return d.id};
}
