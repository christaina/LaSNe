function playButton(svg) {
  wid = 30
  ht = 30
  var i = 0;

  var button = svg.append("g")
      .attr("transform", "translate("+ (height - ht +80) +","+ (width - 140) +")");

  button
    .append("rect")
      .attr("width", wid)
      .attr("height", ht)
      .attr("rx", 4)
      .style("fill", "gray");

  button
    .append("path")
      //.attr("d", "M15 10 L15 40 L35 25 Z")
      .attr("d", "M8 8 L8 22 L22 15 Z")
      .style("fill", function(d){if (moving){return 'white'}else{return 'red'}});

  button
    .append("title")
      .text('Press to stop animation');

  button
      .on("mousedown", function() {
        if(moving){
          stop();
        }
        else{
          go();
        }
        d3.select(this).select("rect")
            .style("fill","white")
            .transition().style("fill","gray");
        d3.select(this).select("title").text(function(d){ if (moving){
          return 'Press to stop animation'} return "Press to start animation"});
      });

      button
          .on('mouseup',function(){
            console.log(moving)
            d3.select(this).select("path").style("fill", function(d){if (moving){return 'white'}else{return 'red'}});
          });
}
