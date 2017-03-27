// ======== Mapbox ===========

var screen_width = $( window ).width();
var zoom_size = (screen_width <= 768 ? 13.5: screen_width <= 1280 ? 14 : screen_width <= 1440 ? 14.4 : 14.6);
var map_center = (screen_width <= 768 ? [30.523904,50.448349] : [30.520715, 50.448279] );


var map = new mapboxgl.Map({
    container: 'map', // container id
    style: 'js/basic.json', // styles
    minZoom: 12, //restrict map zoom 
    maxZoom: 18,
    center: map_center, // starting position
    zoom: zoom_size// starting zoom
});


map.scrollZoom.disable();
map.touchZoomRotate.disable();
map.doubleClickZoom.disable();

if (screen_width <= 1024) {
  map.dragPan.disable();
}

map.on('load', function () {
  
  var bdata = 'data/lines_181012.geojson';
  map.addSource('barricade-data', { type: 'geojson', data: bdata });
  

  // barricade layer
  map.addLayer({
      "id": "barricade",
      "type": "line",
      "source": "barricade-data",
      "layout": {
          "line-join": "round",
          "line-cap": "round"
      },
      "paint": {
          "line-color": {
            property: 'class',
            type: 'categorical',
            stops: [
                ['protesters', '#9ebcda'],
                ['police', '#f768a1']
              ]
          },
          "line-opacity": 0,
          'line-opacity-transition': {
            duration: 500
              },
          "line-width": 5,
          "line-blur": 5
        }
    });


  var buildingsData = 'data/maidan_buildings.geojson';
  map.addSource('buildingsData', { type: 'geojson', data: buildingsData });
  

  // buildings layer
  map.addLayer({
      "id": "buildings",
      "type": "fill",
      'filter': ['!=', '181012', false],
      "source": "buildingsData",
      "layout": {},
      "paint": {
            'fill-color': {
              property: '181012',
                type: 'categorical',
                stops: [
                    ['police', '#AE017E'],
                    ['protesters', '#223b53'],
                    ['neutral', '#E48511']
                    ]
                },
            'fill-opacity': 0.3
        }
    });



  // fights layer
  map.addSource('fights-data', { type: 'geojson', data: "data/fights18.geojson" });
  
  map.addLayer({
      "id": "fights",
      "type": "line",
      "source": "fights-data",
      "layout": {
          "line-cap": "round",
          "line-join": "round"
      },
      "paint": {
          "line-color": "#67001f",
          "line-opacity": 0,
          'line-opacity-transition': {
            duration: 1000
              },
          "line-width": 55,
          "line-blur": 40
        }
    });

});



// create custom popup
function createPopup(coors, text) {
  var popup = new mapboxgl.Popup({closeOnClick: false})
    .setLngLat(coors)
    .setHTML('<div>' + text + '</div>')
    .addTo(map);
  $(".mapboxgl-popup-content").animate({ opacity: 0.8 }, 500 );
}



// animate map positioning
function animateFly(target, zoom, bearing, pitch){
    map.flyTo({
        center: target,
        zoom: zoom,
        bearing: bearing,
        pitch: pitch,
        speed: 0.5, // make the flying slow
        curve: 1, // change the speed at which it zooms out
        easing: function (t) {
            return t;
        }
    });
}


// show particular buildings
function showBuildings(column) {
    map.setFilter('buildings', ['!=', column, false ]); 
    map.setPaintProperty('buildings', 'fill-color', {
            property: column,
            type: 'categorical',
            stops: [
              ['police', '#AE017E'],
              ['protesters', '#223b53'],
              ['neutral', '#ef6548']
              ]
          });
}




// ======== D3 functions ===========
var container = map.getCanvasContainer()
var svg = d3.select(container).append("svg")

// transforming geo data
var transform = d3.geoTransform({point: projectPoint});
var path = d3.geoPath().projection(transform);

function projectPoint(lon, lat) {
  var point = map.project(new mapboxgl.LngLat(lon, lat));
  this.stream.point(point.x, point.y);
}



// awesome blur effect
var defs = svg.append("defs");

//Filter for the outside glow
var filter = defs.append("filter")
    .attr("id","glow");

filter.append("feGaussianBlur")
    .attr("stdDeviation","1")
    .attr("result","coloredBlur");

var feMerge = filter.append("feMerge");

feMerge.append("feMergeNode")
    .attr("in","coloredBlur");

feMerge.append("feMergeNode")
    .attr("in","SourceGraphic");


// more intense blur for chorna rota
var filter_polygon = svg.append("defs")
  .append("filter")
  .attr("id", "blur")
  .append("feGaussianBlur")
  .attr("stdDeviation", 4);


// loading main polygons 
d3.json("data/polygons.json", function(err, geodata) {
  var geometries = geodata.geo181000;
  
  var polygons = svg.selectAll("path")
     .data(geometries)
     .enter()
     .append("path")
     .attr("class", function(d) {
       return d.properties.class;
     })
     .attr("id", function(d) {
       return d.properties.id;
     })
     .attr("d", path)
     .style("fill", function(d) {
        if (d.properties.class == "protesters") { return "#9ebcda"}
        else { return "#ae017e"}
     })
     .attr("opacity", function(d) {
       return d.properties.opacity;
     })
     .style("filter", "url(#glow)");

  updatePosition(geometries);

});



// add tooltip 
var div = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);



// loading points of killings
d3.json("data/all-killed.geojson", function(err, geodata) {
  var geometries = geodata.features;
 
  function mapboxProjection(lonlat) {
      var p = map.project(new mapboxgl.LngLat(lonlat[0], lonlat[1]))
      return [p.x, p.y];
    }
    
  var dots =  svg.selectAll("circle")
      .data(geometries)
      .enter()
      .append("circle")
      .attr("class", "killed")
      .style("filter", "url(#glow)")
      .attr("fill", function(d) {
        if (d.properties.tabir == "maidan" || d.properties.tabir == "civil") { return "#89ADD2"}
        else { return "#ae017e"}
      })
      .attr("fill-opacity", 0.35)
      .attr("stroke",  function(d) {
        if (d.properties.tabir == "maidan" || d.properties.tabir == "civil") { return "#C4D6E9"}
        else { return "#ae017e"}
      })
      .attr("stroke-width", 1.5)
      .attr("opacity", 0)
      .on("mouseover", function(d) {
        d3.select(this).attr("r", 12);
        div.transition()
          .duration(200)
          .style("opacity", .9);
        div.html("<b>" + d.properties.name + "</b>" + "<br>" + "<b>Загинув(ла):</b> " + d.properties.tooltip + "<br>" + "<b>Місце смерті: </b>" + d.properties.place_cert)
          .style("left", function() {
            if (d3.event.pageX >= screen_width - 130 ) {
              return d3.event.pageX - 130 + "px"
            } else  { return d3.event.pageX + "px"}
          })
          .style("top", (d3.event.pageY - 28) + "px");
       })
     .on("mouseout", function(d) {
        d3.select(this).attr("r", 7);
        div.transition()
          .duration(500)
          .style("opacity", 0);
       });

  function render() { 
     dots.attr("cx", function (d) { return mapboxProjection(d.geometry.coordinates)[0] })
         .attr("cy", function (d) { return mapboxProjection(d.geometry.coordinates)[1] })
  }

  map.on("viewreset", function() {
        render()
  });
  map.on("move", function() {
    render()
  });

  // render our initial visualization
  render()

});



//hide  killings when scrolling backwards
var parseTime = d3.timeParse("%Y-%m-%d %H:%M:%S");

function hideKilling(date) {
  d3.selectAll("circle")
    .filter(function(d) { return parseTime(d.properties.time) > parseTime(date) })
    .attr("opacity", 0);

  d3.selectAll("circle")
    .filter(function(d) { return parseTime(d.properties.time) < parseTime(date) })
    .attr("opacity", 0.45);
}


//filter dots
function showKilling(date1, date2, condition) {

  hideKilling(date2);

  d3.selectAll("circle")
    .filter(function(d) { return parseTime(d.properties.time) >= parseTime(date1) && parseTime(d.properties.time) <= parseTime(date2) })
    .attr("opacity", 0.9)
    .attr("r", "10px")
    .transition()
    .duration(1500)
    .attr("r", 7)
    .transition()
    .duration(1000)
    .attr("r", 12)
    .transition()
    .duration(1500)
    .attr("r", 7)
    .each(function(d) {
      if (condition) {
        var full_name = d.properties.name;
        var surname = full_name.split(" ");
        createPopup(d.geometry.coordinates, surname[0]);
      }
    })
}



var protestline_data; // global 
d3.json("data/protestline_all.geojson", function(err, data) {
    protestline_data = data;
});


//draw line
function attackLine(color, list) {

  var geometries = [];

  for (var i = 0; i < list.length; i++) { 
      var newLine = protestline_data.features.filter(function(feature) {
        return feature.properties["id"] == list[i];
      });
      geometries.push(newLine[0]);
    }

  var lines = svg.selectAll("path2")
       .data(geometries)
       .enter()
       .append("path")
       .attr("class", function(d,i) {
         return d.properties.class;
       })
       .attr("id", function(d,i) {
         return d.properties.id;
       })
       .attr("d", path)
       .attr("fill", "none")
       .attr("stroke", color)
       .attr("stroke-width", 5)
       .style("filter", "url(#glow)")
       .style("stroke-linecap", "round")
       .attr("opacity", 0.9);

  window.setTimeout(function(){
      $('.fight-path').css('stroke-dashoffset',0);
      updatePosition(geometries);
  },100); 

}



//update position
function updatePosition(features) {
  
  function update() {

    var updated_position = features.map(path)

    for (i = 0; i < features.length; i++) { 
      d3.selectAll("#" + features[i].properties["id"]).attr("d", updated_position[i]);
    }
  }

  map.on("viewreset", function() {
    update();
  });
  map.on("movestart", function() {
    update();
  });
  map.on("rotate", function() {
    update();
  });
  map.on("move", function() {
    update();
  });

}


var morph_data; // global 
d3.json("data/polygons.json", function(err, data) {
    morph_data = data;
});


//morph polygon
function morph(key, list) {

    var features = morph_data[key];
    
    for (var i = 0; i < list.length; i++) {  
      var updated_feature = features.filter(function(feature) {
        return feature.properties["id"] == list[i];
      });

      d3.select("#" + list[i]).transition()
          .duration(2000)
          .attr("d", updated_feature.map(path));
    }

    updatePosition(features);
}



// ======== SCROLL ===========
// trigger video
function playVideo(file, note, img) {
  $( "#map" ).css( "z-index", 1 );
  $( ".video-events-con" ).css( "z-index", 2 );
  $("#map").animate({ opacity: 0 }, 300 );
  $(".video-events-con").animate({ opacity: 1 }, 300 );
  $(".video-btn").fadeIn(300);
  $("#video-events").html('<source src=' + file + ' type="video/mp4">' );
  document.getElementById('video-events').load();
  document.getElementById('video-events').play();
  $("#video-note").html(note);
  $("#video-map").attr("src", img);
}


function stopVideo() {
  document.getElementById('video-events').pause();
  $( "#map" ).css( "z-index", 2 );
  $( ".video-events-con" ).css( "z-index", 1 );
  $("#map").animate({ opacity: 1 }, 300 );
  $(".video-btn").fadeOut(300);
  $(".video-events-con").animate({ opacity: 0 }, 300 );
}


// custom on scroll interaction
$('#one').waypoint(function(direction) {
  stopVideo();
  $(".mapboxgl-popup").remove();
  showKilling("2014-01-01 14:00:00","2014-01-23 14:00:00", false);
  createPopup([30.5299169, 50.4505057], 'Нігоян, Сеник, Жизневський');
  createPopup([30.524515,50.449412], 'територія Майдану');
  createPopup([30.536166,50.446939], 'територія силовиків і Антимайдану');
  if (direction === 'up') {
      playVideo("http://texty.org.ua/video/maidan_maps/maidan-bg-blacked.mp4", "Відео Влада Казакова")
      animateFly(map_center, zoom_size, 0, 0);
      map.setPaintProperty('barricade', 'line-opacity', 0);
  }
},{ offset: 300 });


$('#two').waypoint(function(direction) {
  $(".mapboxgl-popup").remove();
  createPopup([30.528463,50.451366], 'барикади');
  createPopup([30.535909,50.447964], 'шеренги силовиків');
  if (direction === 'down') {
    map.setPaintProperty('barricade', 'line-opacity', 0.8);
  } else if (direction === 'up') {
    d3.select("#mariinka").attr("opacity", 0);
    morph("geo181000", ["maidan"]);
    $(".fight-path").fadeOut("slow");
  }
},{ offset: 150 });


$('#three').waypoint(function(direction) {
  if (direction === 'down') {
    morph("geo181012", ["maidan"]);
    $(".mapboxgl-popup").remove(); 
    window.setTimeout(function(){
      d3.select("#mariinka").transition().duration(500).attr("opacity", 0.2);
      attackLine("#9ebcda", ["protestline"]);
    },2000); 
  } if (direction === 'up') {
    map.setPaintProperty('fights', 'line-opacity', 0); 
  }
},{ offset: 150 });


$('#four').waypoint(function(direction) {
  if(direction === 'down') {
    map.setFilter('fights', ['==', 'time', 1012 ]);
    window.setTimeout(function() {
        createPopup([30.534752, 50.445804], 'сутички');
        map.setPaintProperty('fights', 'line-opacity', 1);
    }, 2500);
  }
},{ offset: 150 });


$('#five').waypoint(function(direction) {
  attackLine("#650149", ["bline_181012"]);
  createPopup([30.535651, 50.446638], 'колона силовиків');
  if (direction === 'up') {
    showBuildings('181012');
    morph("geo181320", ["mariinka"]);
    hideKilling("2014-01-23 14:00:00");
  }
},{ offset: 150 });


$('#six').waypoint(function(direction) {
  $(".fight-path, .mapboxgl-popup").remove();
  map.setFilter('fights', ['<=', 'time', 1140 ]);
  showKilling("2014-02-18 10:00:00","2014-02-18 12:10:00", true);
  showBuildings('regions_office');
  morph("geo181140", ["mariinka"]);
},{ offset: 150 });


$('#seven').waypoint(function(direction) {
  showBuildings('181012');
  if (direction === 'down') {
    $("#hint, #video-map, #video-note").animate({ opacity: 1 }, 300 );
    $("#video-filter").animate({ opacity: 0.35 }, 300 );
    playVideo("http://texty.org.ua/video/maidan_maps/mariinka-start.mp4", "Початок протистояння в Маріїнському парк. Відео Денис Артемєв", "img/minimap-mariinka-start.png");
  } else if (direction === 'up') {
    stopVideo();
    $("#hint, #video-map, #video-filter").animate({ opacity: 0 }, 300 );
  }
},{ offset: 50 });


$('#eight').waypoint(function(direction) {
  if (direction === 'down') {
    stopVideo();
    $("#hint").animate({ opacity: 0 }, 300 );
  } else if (direction === 'up') {
    playVideo("http://texty.org.ua/video/maidan_maps/mariinka-start.mp4", "Початок протистояння в Маріїнському парк. Відео Денис Артемєв", "img/minimap-mariinka-start.png");
  }
},{ offset: 250 });


$('#nine').waypoint(function(direction) {
  $(".fight-path, .mapboxgl-popup").remove();
  morph("geo181320", ["maidan", "mariinka"]);
  attackLine("#650149", ["lypska", "oplot"]);
  createPopup([30.543557, 50.443881], 'атака Оплоту');
  createPopup([30.534039, 50.443346], 'наступ «беркутівців»');
  createPopup([30.534708, 50.445689], 'атака «беркутівців»');
  var new_filter = [ "in", 'time', 1012, 1140]
  map.setFilter('fights', new_filter);
},{ offset: 250 });


$('#ten').waypoint(function(direction) {
  morph("geo181340", ["maidan", "mariinka"]);
  $(".mapboxgl-popup, #oplot").remove();
  attackLine("#650149", ["pidkriplennia"]);
  createPopup([30.535995, 50.444863], 'розділена колона мітингувальників');
},{ offset: 250 });


$('#eleven').waypoint(function(direction) {
  $(".mapboxgl-popup").remove();
  showKilling("2014-02-18 12:10:01", "2014-02-18 14:00:00", true);
  var new_filter = [ "in", 'time', 1012, 1400 ]
  map.setFilter('fights', new_filter);
},{ offset: 150 });


$('#twelve').waypoint(function(direction) {
  $(".mapboxgl-popup").remove();
  morph("geo181415", ["mariinka"]);
  attackLine("#650149", ["mariinka-titushky", "mariinka-vv"]);
  createPopup([30.541488,50.445151], "м'ясорубка в Маріїнському парку");
  var new_filter = [ "in", 'time', 1012, 1140, 1400, 1410 ]
  map.setFilter('fights', new_filter);
},{ offset: 150 });


$('#thirteen').waypoint(function(direction) {
  if (direction === 'down') {
    playVideo("http://texty.org.ua/video/maidan_maps/grushevskogo9.mp4", "Тітушки та силовики добивають поранених протестувальників біля будинку №9 на вул. Грушевського. Відео Oleg V.", "img/minimap-grushevskogo9.png"); 
  } else if (direction === 'up') {
    stopVideo();
  }
},{ offset: 50 });


$('#fourteen').waypoint(function(direction) {
  $(".mapboxgl-popup, .fight-path").remove();
  showKilling("2014-02-18 14:00:01", "2014-02-18 14:15:00", true);
  if (direction === 'down') {
    stopVideo();
  } else if (direction === 'up') {
    playVideo("http://texty.org.ua/video/maidan_maps/grushevskogo9.mp4", "Тітушки та силовики добивають поранених протестувальників біля будинку №9 на вул. Грушевського. Відео Oleg V.", "img/minimap-grushevskogo9.png");
  }
},{ offset: 350 });


$('#fifteen').waypoint(function(direction) {
  if (direction === 'down') {
    playVideo("http://texty.org.ua/video/maidan_maps/gas-kriposnyi.mp4", "Леонід Бібік намагається розчистити дорогу за допомогою міліцейського ГАЗу. Відео Павла Кучера", "img/minimap-gas-kriposnyi.png"); 
  } else if (direction === 'up') {
    stopVideo();
  }
},{ offset: 50 });


$('#sixteen').waypoint(function(direction) {
  showKilling("2014-02-18 14:15:01", "2014-02-18 14:30:00", true);
  if (direction === 'down') {
    stopVideo();
  } else if (direction === 'up') {
    playVideo("http://texty.org.ua/video/maidan_maps/gas-kriposnyi.mp4", "Леонід Бібік намагається розчистити дорогу за допомогою міліцейського ГАЗу. Відео Павла Кучера", "img/minimap-gas-kriposnyi.png"); 
  }
},{ offset: 350 });


$('#seventeen').waypoint(function(direction) {
  $(".mapboxgl-popup, .fight-path").remove();
  morph("geo181505", ["mariinka"]);
  showKilling("2014-02-18 14:31:00", "2014-02-18 15:10:00", true);
  var new_filter = [ "in", 'time', 1012, 1410 ]
  map.setFilter('fights', new_filter); 
  if (direction == "up") {
    d3.select("#mariinka").attr("opacity", 0.2);
    morph("geo181505", ["maidan"]);
  }
},{ offset: 150 });


$('#eighteen').waypoint(function(direction) {
  $(".mapboxgl-popup").remove();
  d3.select("#mariinka").transition().duration(500).attr("opacity", 0);
  var new_filter = [ "in", 'time', 1012 ]
  map.setFilter('fights', new_filter);
  attackLine("#650149", ["nastup-berkut"]);
  morph("geo181000", ["maidan"]);
  showKilling("2014-02-18 15:10:01","2014-02-18 16:00:00", true);
  if(direction == "up") {
    morph("geo181000", ["berkut"]);
  }
},{ offset: 250 });


$('#nineteen').waypoint(function(direction) {
  if (direction === 'down') {
    playVideo("http://texty.org.ua/video/maidan_maps/shovkovychna.mp4", "Протистояння на перехресті Інститутська-Шовковична. Відео Максима Кудимця", "img/minimap-shovkovychna.png"); 
  } else if (direction === 'up') {
    stopVideo(); 
  }
},{ offset: 10 });


$('#twenty').waypoint(function(direction) {
  if (direction === 'down') {
    stopVideo(); 
  } else if (direction === 'up') {
    playVideo("http://texty.org.ua/video/maidan_maps/shovkovychna.mp4", "Протистояння на перехресті Інститутська-Шовковична. Відео Максима Кудимця", "img/minimap-shovkovychna.png"); 
  }
},{ offset: 350 });


$('#twenty-one').waypoint(function(direction) {
  $(".mapboxgl-popup, .fight-path").remove();
  morph("geo181610", ["maidan", "berkut"]);
  map.getSource('barricade-data').setData("data/lines_181610.geojson");
  createPopup([30.521186, 50.446151], "майданівці займають КМДА");
  showBuildings('181920');
  createPopup([30.528872, 50.447983], "штурм барикади на Інститутській");
  map.setFilter('fights', [ "in", 'time', 1610 ]);
},{ offset: 150 });


$('#twenty-two').waypoint(function(direction) {
  $(".mapboxgl-popup").remove();
  showKilling("2014-02-18 16:00:01","2014-02-18 16:15:00", false);
  createPopup([30.5289244, 50.4480053], 'Дворянець, Хурція');
  createPopup([30.515834, 50.445087], 'Зайко');
},{ offset: 150 });


$('#twenty-three').waypoint(function(direction) {
  $(".mapboxgl-popup").remove();
  map.setFilter('fights', [ "in", 'time', 2100 ]);
  morph("geo181630", ["maidan", "berkut"]);
  showBuildings('182324');
  map.getSource('barricade-data').setData("data/lines_181920.json");
},{ offset: 150 });


$('#twenty-four').waypoint(function(direction) {
  morph("geo181645", ["maidan", "berkut"]);
  map.getSource('barricade-data').setData("data/lines_182324.geojson");
},{ offset: 150 });


$('#twenty-five').waypoint(function(direction) {
  showKilling("2014-02-18 16:15:01", "2014-02-18 17:25:00", false);
  createPopup([30.5258614, 50.4514723], 'Третяк, Теплюк');
  createPopup([30.5254161, 50.4520734], 'Прохорчук');
},{ offset: 150 });


$('#episode-iii').waypoint(function(direction) {
  if (direction === "up") {
    morph("geo181645", ["maidan", "berkut"]);
  }
},{ offset: 50 });


$('#twenty-six').waypoint(function(direction) {
  $(".mapboxgl-popup").remove();
  showKilling("2014-02-18 17:25:01", "2014-02-18 19:00:00", true);
},{ offset: 250 });


$('#twenty-seven').waypoint(function(direction) {
  if (direction === 'down') {
    playVideo("http://texty.org.ua/video/maidan_maps/btrs.mp4", "БТРи таранять барикади. Відео Accidents news", "img/minimap-btrs.png"); 
  } else if (direction === 'up') {
    stopVideo(); 
    animateFly(map_center, zoom_size, 0, 0);
  }
},{ offset: 50 });


$('#twenty-eight').waypoint(function(direction) {
  if (direction === 'down') {
    stopVideo(); 
  } else if (direction === 'up') {
    playVideo("http://texty.org.ua/video/maidan_maps/btrs.mp4", "БТРи таранять барикади. Відео Accidents news", "img/minimap-btrs.png"); 
  }
  $(".mapboxgl-popup").remove();
  animateFly([30.522290,50.450731], zoom_size*1.07, 20, 0);
  showKilling("2014-02-18 19:00:01", "2014-02-18 19:59:00", false);
  createPopup([30.52468283519492, 50.450512220079837], 'Бондарев, Плеханов');
  createPopup([30.5243795, 50.450093], 'Брезденюк');
},{ offset: 350 });


$('#twenty-nine').waypoint(function(direction) { 
  $(".mapboxgl-popup").remove();
  showKilling("2014-02-18 20:00:00", "2014-02-18 20:10:00", true);
},{ offset: 350 });


$('#thirty').waypoint(function(direction) {
  $(".mapboxgl-popup").remove();
  showKilling("2014-02-18 20:10:01", "2014-02-18 21:30:00", true);
},{ offset: 50 });


$('#thirty-one').waypoint(function(direction) {
  $(".mapboxgl-popup").remove();
  showKilling("2014-02-18 21:30:01","2014-02-18 22:00:00", true);
},{ offset: 50 });


$('#thirty-two').waypoint(function(direction) {
  $(".mapboxgl-popup").remove();
  showKilling("2014-02-18 22:00:01","2014-02-18 22:30:00", true);
},{ offset: 50 });



$('#thirty-three').waypoint(function(direction) {
  $(".mapboxgl-popup").remove();
  showKilling("2014-02-18 22:30:01","2014-02-18 23:00:00", false);
  createPopup([30.5247509, 50.4505398], 'Кульчицький, Швець, Бойків');
},{ offset: 100 });


$('#thirty-four').waypoint(function(direction) {
  if (direction === 'down') {
    playVideo("http://texty.org.ua/video/maidan_maps/anthem-18.mp4", "Штурм барикад 18 лютого. Відео BABYLON'13", "img/minimap-anthem.png"); 
  } else if (direction === 'up') {
    stopVideo(); 
  }
},{ offset: 100 });


$('#thirty-five').waypoint(function(direction) {
  if (direction === 'down') {
    stopVideo(); 
  } else if (direction === 'up') {
    playVideo("http://texty.org.ua/video/maidan_maps/anthem-18.mp4", "Штурм барикад 18 лютого. Відео BABYLON'13", "img/minimap-anthem.png"); 
  }
  $(".mapboxgl-popup").remove();
  showKilling("2014-02-18 23:00:01", "2014-02-18 23:50:00", true);
},{ offset: 350 });


$('#thirty-six').waypoint(function(direction) {
  $(".mapboxgl-popup").remove();
  showKilling("2014-02-18 23:50:01","2014-02-18 23:55:00", true);
  if (direction === "up") {
    map.setFilter('fights', [ "in", 'time', 2100 ]);
  }
},{ offset: 100 });


$('#thirty-seven').waypoint(function(direction) {
  $(".mapboxgl-popup").remove();
  showKilling("2014-02-18 23:55:01", "2014-02-19 00:15:00", true);
  createPopup([30.524737, 50.450870], 'пожежа у Будинку профспілок');
  map.setFilter('fights', [ "in", 'time', 2100, 190100 ]);
},{ offset: 100 });


$('#thirty-eight').waypoint(function(direction) {
  $(".mapboxgl-popup").remove();
  showKilling("2014-02-19 00:15:01", "2014-02-19 00:45:00", true);
},{ offset: 100 });


$('#thirty-nine').waypoint(function(direction) {
  if (direction === 'down') {
    playVideo("http://texty.org.ua/video/maidan_maps/unions-fire.mp4", "Порятунок протестувальників з будинку профспілок. Відео BABYLON'13", "img/minimap-unions-fire.png"); 
  } else if (direction === 'up') {
    stopVideo(); 
    animateFly([30.523568,50.449962], zoom_size*1.05, 10, 10);
  }
},{ offset: 100 });


$('#forty').waypoint(function(direction) {
  if (direction === 'down') {
    stopVideo(); 
  } else if (direction === 'up') {
    playVideo("http://texty.org.ua/video/maidan_maps/unions-fire.mp4", "Порятунок протестувальників з будинку профспілок. Відео BABYLON'13", "img/minimap-unions-fire.png"); 
  }
  $(".mapboxgl-popup").remove();
  animateFly([30.523568,50.449962], zoom_size*1.1, 10, 10);
  showKilling("2014-02-19 00:45:01", "2014-02-19 01:00:00", true);
},{ offset: 350 });


$('#forty-one').waypoint(function(direction) {
  $(".mapboxgl-popup").remove();
  showKilling("2014-02-19 01:00:01", "2014-02-19 02:10:00", false);
  createPopup([30.524320854186136, 50.450851057984273], 'Цвігун, Топій, Клітинський');
  if (direction == "up") {
    morph("geo181645", ["maidan", "berkut"]);
    d3.select("#church").attr("opacity", 0.2);
  }
},{ offset: 350 });


$('#forty-two').waypoint(function(direction) {
  map.getSource('barricade-data').setData("data/lines_190300.geojson");
  morph("geo190300", ["maidan", "berkut"]);  
  d3.select("#church").attr("opacity", 0);
},{ offset: 350 });


$('#forty-three').waypoint(function(direction) {
   if (direction === 'down') {
    playVideo("http://texty.org.ua/video/maidan_maps/explosions-18.mp4", "Палаючі барикади. Відео BABYLON'13", "img/minimap-explosions-18.png"); 
  } else if (direction === 'up') {
    stopVideo(); 
    map.setFilter('fights', [ "in", 'time', 2100, 190100 ]);
  }
},{ offset: 10 });


$('#forty-four').waypoint(function(direction) {
   morph("geo190300", ["maidan", "berkut"]); 
   map.setFilter('fights', [ "in", 'time', 2100, 190100, 190500 ]); 
   if (direction === 'down') {
    stopVideo(); 
  } else if (direction === 'up') {
    playVideo("http://texty.org.ua/video/maidan_maps/explosions-18.mp4", "Палаючі барикади. Відео BABYLON'13", "img/minimap-explosions-18.png"); 
  }
},{ offset: 350 });


$('#forty-five').waypoint(function(direction) {
  morph("geo190300", ["maidan", "berkut"]);
  if (direction === 'up') {
    $(".mapboxgl-popup").remove();
    showBuildings('182324');
    map.setFilter('fights', [ "in", 'time', 2100, 190100, 190500 ]); 
  }
},{ offset: 150 });


$('#forty-six').waypoint(function(direction) {
  if (direction === 'down') {
    map.setFilter('fights', [ "in", 'time', 2100 ]);
    playVideo("http://texty.org.ua/video/maidan_maps/day-19.mp4", "Ранок на Майдані 19 лютого. Відео BABYLON'13", "img/minimap-day-19.png");  
  } else if (direction === 'up') {
     stopVideo();  
    $(".mapboxgl-popup").remove();
    morph("geo190300", ["maidan", "berkut"]);
  }
  showBuildings('191400');
},{ offset: 50 });


$('#forty-seven').waypoint(function(direction) {
  morph("geo191400", ["maidan"]);
  createPopup([30.525384, 50.448231], 'Мітингувальники захопили консерваторію');
  if (direction === 'down') {
    stopVideo();
  } else if (direction === 'up') {
    playVideo("http://texty.org.ua/video/maidan_maps/day-19.mp4", "Ранок на Майдані 19 лютого. Відео BABYLON'13", "img/minimap-day-19.png");
  }
},{ offset: 350 });


$('#episode-v').waypoint(function(direction) {
  if (direction === "up") {
    morph("geo191400", ["maidan"]);
  }
},{ offset: 50 });


$('#forty-eight').waypoint(function(direction) {
  $(".mapboxgl-popup").remove();
  showKilling("2014-02-19 02:10:01", "2014-02-20 08:00:00", true);
  if (direction === "up"){
     morph("geo191400", ["maidan"]);
  }
},{ offset: 250 });


$('#forty-nine').waypoint(function(direction) {
  $(".mapboxgl-popup").remove();
  showKilling("2014-02-20 08:00:01", "2014-02-20 08:50:00", true);
},{ offset: 250 });


$('#fifty').waypoint(function(direction) {
  if (direction === 'down') {
    playVideo("http://texty.org.ua/video/maidan_maps/explosion-20.mp4", "Майдан намагається повернути позиції. Між 8 та 9 ранку 20 січня. Відео Maidan18-20 History", "img/minimap-explosion-20.png");  
  } else if (direction === 'up') {
     stopVideo();  
  }
},{ offset: 50 });


$('#fifty-one').waypoint(function(direction) {
  if (direction === 'down') {
    stopVideo();
  } else if (direction === 'up') {
    morph("geo191400", ["maidan", "berkut"]);
    playVideo("http://texty.org.ua/video/maidan_maps/explosion-20.mp4", "Майдан намагається повернути позиції. Між 8 та 9 ранку 20 січня. Відео Maidan18-20 History", "img/minimap-explosion-20.png");  
  }
},{ offset: 350 });


$('#fifty-two').waypoint(function(direction) {
  $(".mapboxgl-popup").remove();
  showKilling("2014-02-20 08:50:01", "2014-02-20 08:59:34", false);
  map.setFilter('fights', [ "in", 'time', 2100, 200900 ]);
  createPopup([30.526180374466549, 50.449740482901902], 'Балюк, Арутюнян');
  map.getSource('barricade-data').setData("data/lines_200900.geojson");
  morph("geo200900", ["maidan", "berkut", "chorna-rota"]);
  d3.select("#chorna-rota").attr("opacity", 0);
},{ offset: 250 });


$('#fifty-three').waypoint(function(direction) {
  $(".mapboxgl-popup").remove();
  d3.select("#chorna-rota").attr("opacity", 0.9).style("fill", "#000000").style("stroke", "#fee391").style("filter", "url(#blur)");
  showKilling("2014-02-20 08:59:35", "2014-02-20 09:00:37", true);
  createPopup([30.528248, 50.449275], 'Поява чорної роти');
  if(direction === "up") {
    morph("geo200900", ["maidan", "berkut", "chorna-rota"]);
  }
},{ offset: 250 });


$('#fifty-four').waypoint(function(direction) {
  $(".mapboxgl-popup").remove();
  morph("geo200905", ["maidan", "berkut","chorna-rota"]);
  showKilling("2014-02-20 09:00:38", "2014-02-20 09:05:00", true);
},{ offset: 250 });


$('#fifty-five').waypoint(function(direction) {
  $(".mapboxgl-popup").remove();
  showKilling("2014-02-20 09:05:01", "2014-02-20 09:07:16", true);
},{ offset: 50 });


$('#fifty-six').waypoint(function(direction) {
  if (direction === 'down') {
    playVideo("http://texty.org.ua/video/maidan_maps/retreat-20.mp4", "Відступ силовиків до урядового кварталу ~9:10 20 січня. Відео Maidan18-20 History", "img/minimap-retreat-20.png");  
  } else if (direction === 'up') {
     stopVideo();  
     morph("geo200905", ["maidan", "berkut","chorna-rota"]);
  }
},{ offset: 150 });


$('#fifty-seven').waypoint(function(direction) {
  if (direction === 'down') {
    stopVideo();
  } else if (direction === 'up') {
    playVideo("http://texty.org.ua/video/maidan_maps/retreat-20.mp4", "Відступ силовиків до урядового кварталу ~9:10 20 січня. Відео Maidan18-20 History", "img/minimap-retreat-20.png");  
  }
},{ offset: 350 });


$('#fifty-eight').waypoint(function(direction) {
  morph("geo200910", ["maidan", "berkut","chorna-rota"]);
  $(".mapboxgl-popup").remove();
  showKilling("2014-02-20 09:07:17", "2014-02-20 09:08:15", true);
},{ offset: 250 });


$('#fifty-nine').waypoint(function(direction) {
  $(".mapboxgl-popup").remove();
  showKilling("2014-02-20 09:08:16", "2014-02-20 09:08:34", true);
  if (direction === "up") {
    map.setFilter('fights', [ "in", 'time', 2100, 200900 ]);
  }
},{ offset: 250 });


$('#sixty').waypoint(function(direction) {
  $(".mapboxgl-popup").remove();
  morph("geo200910", ["chorna-rota"]);
  map.setFilter('fights', [ "in", 'time', 2100, 200900, 200910 ]);
  showKilling("2014-02-20 09:08:35", "2014-02-20 09:11:55", false);
  createPopup([30.527103533328003, 50.449944021296972], 'Коцюба, Братушка');
  createPopup([30.526766501661189, 50.449829978298638], 'Ільків');
},{ offset: 150 });


$('#sixty-one').waypoint(function(direction) {
  morph("geo200912", ["chorna-rota"]);
},{ offset: 150 });


$('#sixty-two').waypoint(function(direction) {
  $(".mapboxgl-popup").remove();
  if (direction === 'down') {
    playVideo("http://texty.org.ua/video/maidan_maps/instytutska-0913.mp4", "Снайпери з жовтими пов'язками стріляють в натовп. ~9:13 20 лютого. Відео ютуб-каналу «Виновных покарают»", "img/minimap-instytutska-0913.png");  
  } else if (direction === 'up') {
     stopVideo();  
  }
},{ offset: 50 });


$('#sixty-three').waypoint(function(direction) {
  $(".mapboxgl-popup").remove();
  morph("geo200916", ["chorna-rota"]);
  showKilling("2014-02-20 09:11:56", "2014-02-20 09:15:40", true);
  if (direction === 'down') {
    stopVideo();
  } else if (direction === 'up') {
    playVideo("http://texty.org.ua/video/maidan_maps/instytutska-0913.mp4", "Снайпери з жовтими пов'язками стріляють в натовп. ~9:13 20 лютого. Відео ютуб-каналу «Виновных покарают»", "img/minimap-instytutska-0913.png");  
  }
},{ offset: 350 });


$('#sixty-four').waypoint(function(direction) {
  $(".mapboxgl-popup").remove();
  morph("geo200919", ["maidan","berkut","chorna-rota"]);
  showKilling("2014-02-20 09:15:41", "2014-02-20 09:18:08", false);
  createPopup([30.527153468447487, 50.449888581575465], 'Аксенін, Мойсей, Тарасюк');
},{ offset: 150 });


$('#sixty-five').waypoint(function(direction) { 
  map.getSource('barricade-data').setData("data/lines_200921.geojson");
  morph("geo200921", ["maidan","berkut","chorna-rota"]); 
},{ offset: 150 });


$('#sixty-six').waypoint(function(direction) {
  $(".mapboxgl-popup").remove();
  showKilling("2014-02-20 09:18:09", "2014-02-20 09:21:59", true);
},{ offset: 150 });


$('#sixty-seven').waypoint(function(direction) {
  $(".mapboxgl-popup").remove();
  if (direction === 'down') {
    playVideo("http://texty.org.ua/video/maidan_maps/instytutska-0922.mp4", "Смерть Андрія Дигдаловича, 09:22:51 20 лютого. Відео BABYLON'13", "img/minimap-instytutska-0922.png");  
  } else if (direction === 'up') {
     stopVideo(); 
     map.setFilter('fights', [ "in", 'time', 2100, 200900, 200910 ]);
     animateFly([30.523568,50.449962], zoom_size*1.1, 10, 10);
  }
},{ offset: 150 });


$('#sixty-eight').waypoint(function(direction) {
  showKilling("2014-02-20 09:22:00", "2014-02-20 09:26:00", true);
  map.setFilter('fights', [ "in", 'time', 2100, 200900, 200920]);
  if (direction === 'down') {
    animateFly([30.527048, 50.448768], zoom_size*1.17, 10, 10);
    stopVideo();
  } else if (direction === 'up') {
    playVideo("http://texty.org.ua/video/maidan_maps/instytutska-0922.mp4", "Смерть Андрія Дигдаловича, 09:22:51 20 лютого. Відео BABYLON'13", "img/minimap-instytutska-0922.png");   
  }
},{ offset: 350 });


$('#sixty-nine').waypoint(function(direction) {
  $(".mapboxgl-popup").remove();
  showKilling("2014-02-20 09:26:01", "2014-02-20 09:28:00", false);
  createPopup([30.528612462947695, 50.448532866121219], 'Дзявульський, Кемський, Опанасюк');
  if (direction === "up") {
    morph("geo200921", ["maidan","berkut","chorna-rota"]);
  }
},{ offset: 100 });


$('#seventy').waypoint(function(direction) {
  $(".mapboxgl-popup").remove();
  showKilling("2014-02-20 09:28:01", "2014-02-20 09:29:40", true);
  morph("geo200929", ["maidan","berkut","chorna-rota"]);
  if (direction === "up") {
    map.setFilter('fights', [ "in", 'time', 2100, 200900, 200920]);
  }
},{ offset: 100 });


$('#seventy-one').waypoint(function(direction) {
  $(".mapboxgl-popup").remove();
  showKilling("2014-02-20 09:29:41", "2014-02-20 09:47:11", false);
   map.setFilter('fights', [ "in", 'time', 2100, 200900, 200925]);
  createPopup([30.528949480304266, 50.448046761295394], 'Гриневич, Жиловага');
  createPopup([30.528334370230827, 50.448306019834526], 'Ушневич, Жеребний, Варениця, Точин');
},{ offset: 200 });


$('#seventy-two').waypoint(function(direction) {
  $(".mapboxgl-popup").remove();
  showKilling("2014-02-20 09:47:12", "2014-02-20 09:56:28", false);
  createPopup([30.528439171999914, 50.448190345594632], 'Паращук, Ткачук, Зубенко, Пантелєєв, Голоднюк, Гурик');
},{ offset: 200 });


$('#seventy-three').waypoint(function(direction) {
  $(".mapboxgl-popup").remove();
  showKilling("2014-02-20 09:56:29", "2014-02-20 11:29:54",false);
  createPopup([30.526485293253895, 50.449354803550193], 'Полянський');
  createPopup([30.52885167800893, 50.447952269965796], 'Шилінг');
  createPopup([30.528407731469191, 50.448185896579758], 'Паньків, Царьок, Чміленко, Чаплінський, Котляр');
  createPopup([30.529006812684287, 50.44817776032658], 'Храпаченко');
  if (direction === "up") {
    animateFly([30.527048, 50.448768], zoom_size*1.17, 10, 10);
  }
},{ offset: 10 });


$('#seventy-four').waypoint(function(direction) {
  $(".mapboxgl-popup").remove();
  if (direction === 'down') {
     animateFly([30.522290,50.450731], zoom_size*1.05, 20, 0);
     playVideo("http://texty.org.ua/video/maidan_maps/instytutska-1001.mp4", "Eпіцентр розстрілів, ~10:01 20 лютого. Відео Тараса Макаренко", "img/minimap-instytutska-1001.png");  
  } else if (direction === 'up') {
     stopVideo();  
     morph("geo200929", ["maidan", "berkut"]);
     map.getSource('barricade-data').setData("data/lines_200921.geojson");
     d3.select("#chorna-rota").attr("opacity", 0.8);
  }
},{ offset: 10 });


$('#seventy-five').waypoint(function(direction) {
  $(".mapboxgl-popup").remove();
  d3.select("#chorna-rota").attr("opacity", 0);
  showKilling("2014-02-20 11:29:55", "2014-02-20 16:57:55", true);
  if (direction === 'down') {
    stopVideo();
  } else if (direction === 'up') {
    playVideo("http://texty.org.ua/video/maidan_maps/instytutska-1001.mp4", "Eпіцентр розстрілів, ~10:01 20 лютого. Відео Тараса Макаренко", "img/minimap-instytutska-1001.png");   
  }
},{ offset: 350 });


$('#seventy-six').waypoint(function(direction) {
  map.setFilter('fights', [ "in", 'time', 2100, 200900]);
  map.getSource('barricade-data').setData("data/lines_201610.geojson");
  morph("geo201610", ["maidan", "berkut"]);
},{ offset: 350 });


$('#seventy-seven').waypoint(function(direction) {
  $(".mapboxgl-popup").remove();
  if (direction === "up") {
    animateFly([30.522290,50.450731], zoom_size*1.05, 20, 0);
  }
},{ offset: 150 });



$('#seventy-eight').waypoint(function(direction) {
  animateFly([30.527048, 50.448768], zoom_size*1.12, 60, 0);
  if (direction === "down") {
    $(".mapboxgl-popup").remove();
    $("#maidan, #mvs, #padmin, #berkut, .legend, .mute-btn-wrapper").animate({ opacity: 0 }, 2500 );
    map.setPaintProperty('buildings', 'fill-opacity', 0);
    map.setPaintProperty('barricade', 'line-opacity', 0);
    map.setPaintProperty('fights', 'line-opacity', 0);
    d3.selectAll("circle")
      .transition()
      .delay(function(d, i) { return i * 150; })
      .attr("r", 15)
      .transition()
      .duration(500)
      .attr("r", 7)
      .attr("fill", "#ffffff")
      .attr("stroke", "#ffffff");
  } else if (direction === "up") {
     $("#maidan, #mvs, #padmin, #berkut").animate({ opacity: 0.2 }, 2500 );
     $(".legend, .mute-btn-wrapper").animate({ opacity: 1 }, 2500 );
     map.setPaintProperty('buildings', 'fill-opacity', 0.3);
     map.setPaintProperty('barricade', 'line-opacity', 0.8);
     map.setPaintProperty('fights', 'line-opacity', 1);
     d3.selectAll("circle")
     .attr("fill", function(d) {
        if (d.properties.tabir == "maidan" || d.properties.tabir == "civil") { return "#9ebcda"}
        else { return "#ae017e"}
      })
      .attr("stroke",  function(d) {
        if (d.properties.tabir == "maidan" || d.properties.tabir == "civil") { return "#bfd3e6"}
        else { return "#ae017e"}
      });
  }
},{ offset: 50 });


$('.disclaimer').waypoint(function(direction) {
  if (direction === "down") {
    $("#map").animate({ opacity: 0.15 }, 200 );
  }
  else if (direction === "up"){
    $("#map").animate({ opacity: 1 }, 200 );
  }
},{ offset: 350 });

