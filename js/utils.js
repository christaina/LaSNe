
function filterSelfLinks(link) {
  console.log(link.source)
  console.log(link.target)
  if ((link.source != link.target)) {
    return true;
  }
  return false;
}
function getbiggest(nodeset){

  biggest_size = 0;
  biggest = 0;

  for(var i=0, len=nodeset.length; i < len;i++){
    if (nodeset[i].rts > biggest_size){
      biggest_size = nodeset[i].rts;
      biggest = i;
    }
  }
  return biggest;
}

function getsize(d){
  biggest = currentJson.nodes[getbiggest(currentJson.nodes)];
  return (d.rts/(biggest.rts/8))+1;
}
function run_timer(i){
  function timer () {
     initial =  setTimeout(function () {
        d3.selectAll("svg > *").remove();
        update(allGraphs[i]);
          i++;
          if (i < allGraphs.length) {
              timer();
          }
      }, 8000)
  }
  timer();
    }

function findnthbig(){
  var allsizes = [];
  for(var i=0, len=currentJson.nodes.length; i < len;i++){
    c = Number(currentJson.nodes[i].rts);
    if (c>0){
      allsizes.push(c);}
  }
  allsizes.sort(compareNumbers);
  nthbig = allsizes[allsizes.length-5];
}

function compareNumbers(a, b)
{
    return a - b;
}

function update_pos(){
      for (var i =0,len=currentJson.nodes.length; i < len;i++){
        if(id_idx_map[currentJson.nodes[i].id]>-1){
          currentJson.nodes[i].x = oldNodes[i].x;
          currentJson.nodes[i].x = oldNodes[i].y;
        }
      }
}

function node_id_map(){
  for (var i=0, len = oldNodes.length; i < len; i++){
    id_idx_map[oldNodes[i].id] = i;
  }
}

function update(file){
    curr_graph = file;
    oldNodes = currentJson.nodes;
    node_id_map();

  d3.json(data_prefix+file, function(error, json) {
    if (error) throw error;
    currentJson.nodes = json.nodes;
    currentJson.links = json.links;

    refresh();

  });
}

function stop(){
  clearTimeout(initial);
  moving = false;
  color_button();
}

function go(){
  run_timer(allGraphs.indexOf(curr_graph));
  moving = true;
  color_button();
}
