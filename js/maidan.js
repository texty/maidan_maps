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

  
  var buildings_data = 'data/maidan_buildings.geojson';
  map.addSource('buildings_data', { type: 'geojson', data: buildings_data });
  

  // buildings layer
  map.addLayer({
      "id": "buildings",
      "type": "fill",
      'filter': ['!=', '181012', false],
      "source": "buildings_data",
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
function create_popup(coors, text) {
  var popup = new mapboxgl.Popup({closeOnClick: false})
    .setLngLat(coors)
    .setHTML('<div>' + text + '</div>')
    .addTo(map);
  $(".mapboxgl-popup-content").animate({ opacity: 0.7 }, 500 );
}



// animate map positioning
function animate_fly(target, zoom, bearing, pitch){
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
function show_buildings(column) {
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
    .attr("stdDeviation","1.5")
    .attr("result","coloredBlur");

var feMerge = filter.append("feMerge");

feMerge.append("feMergeNode")
    .attr("in","coloredBlur");

feMerge.append("feMergeNode")
    .attr("in","SourceGraphic");




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
     });

  update_position(geometries);

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
      .style("filter", "url(#glow)")
      .attr("fill", function(d) {
        if (d.properties.tabir == "maidan" || d.properties.tabir == "civil") { return "#9ebcda"}
        else { return "#ae017e"}
      })
      .attr("fill-opacity", 0.5)
      .attr("stroke",  function(d) {
        if (d.properties.tabir == "maidan" || d.properties.tabir == "civil") { return "#bfd3e6"}
        else { return "#ae017e"}
      })
      .attr("stroke-width", 1.5)
      .attr("opacity", 0)
      .on("mouseover", function(d) {
        d3.select(this).attr("r", 10);
        div.transition()
          .duration(200)
          .style("opacity", .9);
        div.html(d.properties.name)
          .style("left", (d3.event.pageX) + "px")
          .style("top", (d3.event.pageY - 28) + "px");
       })
     .on("mouseout", function(d) {
        d3.select(this).attr("r", 5);
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



// hide  killings when scrolling backwards
function hide_killing(date) {
  var parseTime = d3.timeParse("%Y-%m-%d %H:%M:%S");
  d3.selectAll("circle")
    .filter(function(d) { return parseTime(d.properties.time) > parseTime(date) })
    .attr("opacity", 0);
}



//sort dots
function show_killing(date1, date2, condition) {

  var parseTime = d3.timeParse("%Y-%m-%d %H:%M:%S");
  hide_killing(date2);

  d3.selectAll("circle")
    .filter(function(d) { return parseTime(d.properties.time) >= parseTime(date1) && parseTime(d.properties.time) <= parseTime(date2) })
    .attr("opacity", 0.5)
    .attr("r", "10px")
    .transition()
    .duration(1500)
    .attr("r", "5px")
    .transition()
    .duration(1000)
    .attr("r", "10px")
    .transition()
    .duration(1500)
    .attr("r", "5px")
    .each(function(d) {
      if (condition) {
        var full_name = d.properties.name;
        var surname = full_name.split(" ");
        create_popup(d.geometry.coordinates, surname[0]);
      }
    })
}



var protestline_data; // global 
d3.json("data/protestline_all.geojson", function(err, data) {
    protestline_data = data;
});


//draw line
function new_line(color, list) {

  var geometries = [];

  for (var i = 0; i < list.length; i++) { 
      var new_line = protestline_data.features.filter(function(feature) {
        return feature.properties["id"] == list[i];
      });
      geometries.push(new_line[0]);
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
      update_position(geometries);
  },100); 

}



//update polistion
function update_position(features) {
  
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

    update_position(features);
}




// ======== SCROLL ===========
// trigger video
function play_video(file, note, img) {
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


function stop_video() {
  document.getElementById('video-events').pause();
  $( "#map" ).css( "z-index", 2 );
  $( ".video-events-con" ).css( "z-index", 1 );
  $("#map").animate({ opacity: 1 }, 300 );
  $(".video-btn").fadeOut(300);
  $(".video-events-con").animate({ opacity: 0 }, 300 );
}


// custom on scroll interaction
$('#one').waypoint(function(direction) {
  stop_video();
  $(".mapboxgl-popup").fadeOut("slow");
  show_killing("2014-01-01 14:00:00","2014-01-23 14:00:00", false);
  create_popup([30.5299169, 50.4505057], 'Нігоян, Сеник, Жизневський');
  create_popup([30.524515,50.449412], 'територія Майдану');
  create_popup([30.536166,50.446939], 'територія силовиків і Антимайдану');
  if (direction === 'up') {
      play_video("http://texty.org.ua/video/maidan_maps/maidan-bg-blacked.mp4")
      animate_fly(map_center, zoom_size, 0, 0);
      map.setPaintProperty('barricade', 'line-opacity', 0);
  }
},{ offset: 300 });


$('#two').waypoint(function(direction) {
  $(".mapboxgl-popup").fadeOut("slow");
  create_popup([30.528463,50.451366], 'барикади');
  create_popup([30.535909,50.447964], 'шеренги силовиків');
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
    $(".mapboxgl-popup").fadeOut("slow"); 
    window.setTimeout(function(){
      d3.select("#mariinka").transition().duration(500).attr("opacity", 0.2);
      new_line("#9ebcda", ["protestline"]);
    },2000); 
  } if (direction === 'up') {
    map.setPaintProperty('fights', 'line-opacity', 0); 
  }
},{ offset: 150 });


$('#four').waypoint(function(direction) {
  if(direction === 'down') {
    map.setFilter('fights', ['==', 'time', 1012 ]);
    window.setTimeout(function() {
        create_popup([30.534752, 50.445804], 'сутички');
        map.setPaintProperty('fights', 'line-opacity', 1);
    }, 2500);
  }
},{ offset: 150 });


$('#five').waypoint(function(direction) {
  new_line("#650149", ["bline_181012"]);
  create_popup([30.535651, 50.446638], 'колона силовиків');
  if (direction === 'up') {
    show_buildings('181012');
    morph("geo181320", ["mariinka"]);
    hide_killing("2014-01-23 14:00:00");
  }
},{ offset: 150 });


$('#six').waypoint(function(direction) {
  $(".mapboxgl-popup, .fight-path").fadeOut("slow");
  map.setFilter('fights', ['<=', 'time', 1140 ]);
  show_killing("2014-02-18 10:00:00","2014-02-18 12:10:00", true);
  show_buildings('regions_office');
  morph("geo181140", ["mariinka"]);
},{ offset: 150 });


$('#seven').waypoint(function(direction) {
  show_buildings('181012');
  if (direction === 'down') {
    $("#hint, #video-note, #video-map").animate({ opacity: 1 }, 300 );
    play_video("http://texty.org.ua/video/maidan_maps/mariinka-start.mp4", "Початок протистояння в Маріїнському парк", "img/minimap-mariinka-start.png");
    window.setTimeout(function(){
      $("#hint").animate({ opacity: 0 }, 3000 );
    },7000); 
  } else if (direction === 'up') {
    stop_video();
    $("#hint, #video-note, #video-map").animate({ opacity: 0 }, 300 );
  }
},{ offset: 50 });


$('#eight').waypoint(function(direction) {
  if (direction === 'down') {
    stop_video();
    $("#hint").animate({ opacity: 0 }, 300 );
  } else if (direction === 'up') {
    play_video("http://texty.org.ua/video/maidan_maps/mariinka-start.mp4", "Початок протистояння в Маріїнському парк", "img/minimap-mariinka-start.png");
  }
},{ offset: 250 });


$('#nine').waypoint(function(direction) {
  $(".mapboxgl-popup, .fight-path").fadeOut("slow");
  morph("geo181320", ["maidan", "mariinka"]);
  new_line("#650149", ["lypska", "oplot"]);
  create_popup([30.543557, 50.443881], 'атака Оплоту');
  create_popup([30.534039, 50.443346], 'наступ «беркутівців»');
  create_popup([30.534708, 50.445689], 'атака «беркутівців»');
  var new_filter = [ "in", 'time', 1012, 1140]
  map.setFilter('fights', new_filter);
},{ offset: 250 });


$('#ten').waypoint(function(direction) {
  morph("geo181340", ["maidan", "mariinka"]);
  $(".mapboxgl-popup, #oplot").fadeOut("slow");
  new_line("#650149", ["pidkriplennia"]);
  create_popup([30.535995, 50.444863], 'розділена колона мітингувальників');
},{ offset: 250 });


$('#eleven').waypoint(function(direction) {
  $(".mapboxgl-popup").fadeOut("slow");
  show_killing("2014-02-18 12:10:01", "2014-02-18 14:00:00", true);
  var new_filter = [ "in", 'time', 1012, 1400 ]
  map.setFilter('fights', new_filter);
},{ offset: 150 });


$('#twelve').waypoint(function(direction) {
  $(".mapboxgl-popup").fadeOut("slow");
  morph("geo181415", ["mariinka"]);
  new_line("#650149", ["mariinka-titushky", "mariinka-vv"]);
  create_popup([30.541488,50.445151], "м'ясорубка в Маріїнському парку");
  var new_filter = [ "in", 'time', 1012, 1140, 1400, 1410 ]
  map.setFilter('fights', new_filter);
},{ offset: 150 });


$('#thirteen').waypoint(function(direction) {
  if (direction === 'down') {
    play_video("http://texty.org.ua/video/maidan_maps/grushevskogo9.mp4", "Тітушки та силовики добивають поранених протестувальників біля будинку №9 на вул. Грушевського", "img/minimap-grushevskogo9.png"); 
  } else if (direction === 'up') {
    stop_video();
  }
},{ offset: 50 });


$('#fourteen').waypoint(function(direction) {
  $(".mapboxgl-popup, .fight-path").fadeOut("slow");
  show_killing("2014-02-18 14:00:01", "2014-02-18 14:15:00", true);
  if (direction === 'down') {
    stop_video();
  } else if (direction === 'up') {
    play_video("http://texty.org.ua/video/maidan_maps/grushevskogo9.mp4", "Тітушки та силовики добивають поранених протестувальників біля будинку №9 на вул. Грушевського", "img/minimap-grushevskogo9.png");
  }
},{ offset: 350 });


$('#fifteen').waypoint(function(direction) {
  if (direction === 'down') {
    play_video("http://texty.org.ua/video/maidan_maps/gas-kriposnyi.mp4", "Леонід Бібік намагається розчистити дорогу за допомогою міліцейського ГАЗу", "img/minimap-gas-kriposnyi.png"); 
  } else if (direction === 'up') {
    stop_video();
  }
},{ offset: 50 });


$('#sixteen').waypoint(function(direction) {
  show_killing("2014-02-18 14:15:01", "2014-02-18 14:30:00", true);
  if (direction === 'down') {
    stop_video();
  } else if (direction === 'up') {
    play_video("http://texty.org.ua/video/maidan_maps/gas-kriposnyi.mp4", "Леонід Бібік намагається розчистити дорогу за допомогою міліцейського ГАЗу", "img/minimap-gas-kriposnyi.png"); 
  }
},{ offset: 350 });


$('#seventeen').waypoint(function(direction) {
  $(".mapboxgl-popup, .fight-path").fadeOut("slow");
  morph("geo181505", ["mariinka"]);
  show_killing("2014-02-18 14:31:00", "2014-02-18 15:10:00", true);
  var new_filter = [ "in", 'time', 1012, 1410 ]
  map.setFilter('fights', new_filter); 
  if (direction == "up") {
    d3.select("#mariinka").attr("opacity", 0.2);
    morph("geo181505", ["maidan"]);
  }
},{ offset: 150 });


$('#eighteen').waypoint(function(direction) {
  $(".mapboxgl-popup").fadeOut("slow");
  d3.select("#mariinka").transition().duration(500).attr("opacity", 0);
  var new_filter = [ "in", 'time', 1012 ]
  map.setFilter('fights', new_filter);
  new_line("#650149", ["nastup-berkut"]);
  morph("geo181000", ["maidan"]);
  show_killing("2014-02-18 15:10:01","2014-02-18 16:00:00", true);
  if(direction == "up") {
    morph("geo181000", ["berkut"]);
  }
},{ offset: 250 });


$('#nineteen').waypoint(function(direction) {
  if (direction === 'down') {
    play_video("http://texty.org.ua/video/maidan_maps/shovkovychna.mp4", "Протистояння на перехресті Інститутська-Шовковична", "img/minimap-shovkovychna.png"); 
  } else if (direction === 'up') {
    stop_video(); 
  }
},{ offset: 10 });


$('#twenty').waypoint(function(direction) {
  if (direction === 'down') {
    stop_video(); 
  } else if (direction === 'up') {
    play_video("http://texty.org.ua/video/maidan_maps/shovkovychna.mp4", "Протистояння на перехресті Інститутська-Шовковична", "img/minimap-shovkovychna.png"); 
  }
},{ offset: 350 });


$('#twenty-one').waypoint(function(direction) {
  $(".mapboxgl-popup, .fight-path").fadeOut("slow");
  morph("geo181610", ["maidan", "berkut"]);
  map.getSource('barricade-data').setData("data/lines_181610.geojson");
  create_popup([30.521186, 50.446151], "майданівці займають КМДА");
  show_buildings('181920');
  create_popup([30.528872, 50.447983], "штурм барикади на Інститутській");
  var new_filter = [ "in", 'time', 1610 ]
  map.setFilter('fights', new_filter);
},{ offset: 150 });


$('#twenty-two').waypoint(function(direction) {
  $(".mapboxgl-popup").fadeOut("slow");
  show_killing("2014-02-18 16:00:01","2014-02-18 16:15:00", false);
  create_popup([30.5289244, 50.4480053], 'Дворянець, Хурція');
},{ offset: 150 });


$('#twenty-three').waypoint(function(direction) {
  $(".mapboxgl-popup").fadeOut("slow");
  var new_filter = [ "in", 'time', 2100 ]
  map.setFilter('fights', new_filter);
  morph("geo181630", ["maidan", "berkut"]);
  show_buildings('182324');
  map.getSource('barricade-data').setData("data/lines_181920.json");
},{ offset: 150 });


$('#twenty-four').waypoint(function(direction) {
  morph("geo181645", ["maidan", "berkut"]);
  map.getSource('barricade-data').setData("data/lines_182324.geojson");
},{ offset: 50 });


$('#twenty-five').waypoint(function(direction) {
  morph("geo181645", ["maidan", "berkut"]);
  show_killing("2014-02-18 16:15:01", "2014-02-18 17:20:00", false);
  create_popup([30.5258614, 50.4514723], 'Третяк, Теплюк');
},{ offset: 50 });


$('#twenty-six').waypoint(function(direction) {
  morph("geo181645", ["maidan", "berkut"]);
  $(".mapboxgl-popup").fadeOut("slow");
  show_killing("2014-02-18 17:20:01", "2014-02-18 19:00:00", true);
},{ offset: 50 });


$('#twenty-seven').waypoint(function(direction) {
  if (direction === 'down') {
    play_video("http://texty.org.ua/video/maidan_maps/btrs.mp4", "БТРи таранять барикади", "img/minimap-btrs.png"); 
  } else if (direction === 'up') {
    stop_video(); 
    animate_fly(map_center, zoom_size, 0, 0);
  }
},{ offset: 100 });


$('#twenty-eight').waypoint(function(direction) {
  if (direction === 'down') {
    stop_video(); 
  } else if (direction === 'up') {
    play_video("http://texty.org.ua/video/maidan_maps/btrs.mp4", "БТРи таранять барикади", "img/minimap-btrs.png"); 
  }
  show_killing("2014-02-18 19:00:01", "2014-02-18 19:59:00", false);
  create_popup([30.52468283519492, 50.450512220079837], 'Бондарев, Плеханов');
  create_popup([30.5243795, 50.450093], 'Брезденюк');
},{ offset: 350 });


$('#twenty-nine').waypoint(function(direction) { 
  $(".mapboxgl-popup").fadeOut("slow");
  show_killing("2014-02-18 20:00:00", "2014-02-18 20:10:00", true);
  animate_fly([30.522290,50.450731], zoom_size*1.05, 20, 0);
},{ offset: 350 });


$('#thirty').waypoint(function(direction) {
  $(".mapboxgl-popup").fadeOut("slow");
  show_killing("2014-02-18 20:10:01", "2014-02-18 21:30:00", true);
},{ offset: 50 });


$('#thirty-one').waypoint(function(direction) {
  $(".mapboxgl-popup").fadeOut("slow");
  show_killing("2014-02-18 21:30:01","2014-02-18 22:00:00", true);
},{ offset: 50 });


$('#thirty-two').waypoint(function(direction) {
  $(".mapboxgl-popup").fadeOut("slow");
  show_killing("2014-02-18 22:00:01","2014-02-18 22:30:00", true);
},{ offset: 50 });



$('#thirty-three').waypoint(function(direction) {
  $(".mapboxgl-popup").fadeOut("slow");
  show_killing("2014-02-18 22:30:01","2014-02-18 23:00:00", false);
  create_popup([30.5247509, 50.4505398], 'Кульчицький, Швець, Бойків');
},{ offset: 50 });


$('#thirty-four').waypoint(function(direction) {
  if (direction === 'down') {
    play_video("http://texty.org.ua/video/maidan_maps/anthem-18.mp4", "Штурм барикад 18 лютого. Відео BABYLON'13", "img/minimap-anthem.png"); 
  } else if (direction === 'up') {
    stop_video(); 
  }
},{ offset: 100 });


$('#thirty-five').waypoint(function(direction) {
  if (direction === 'down') {
    stop_video(); 
  } else if (direction === 'up') {
    play_video("http://texty.org.ua/video/maidan_maps/anthem-18.mp4", "Штурм барикад 18 лютого. Відео BABYLON'13", "img/minimap-anthem.png"); 
  }
  show_killing("2014-02-18 23:00:01", "2014-02-18 23:50:00", true);
},{ offset: 350 });


$('#thirty-six').waypoint(function(direction) {
  $(".mapboxgl-popup").fadeOut("slow");
  show_killing("2014-02-18 23:50:01","2014-02-18 23:55:00", true);
},{ offset: 100 });


$('#thirty-seven').waypoint(function(direction) {
  $(".mapboxgl-popup").fadeOut("slow");
  show_killing("2014-02-18 23:55:01", "2014-02-19 00:15:00", true);
  create_popup([30.524533, 50.450460], 'пожежа у Будинку профспілок');
  var new_filter = [ "in", 'time', 2100, 190100 ]
  map.setFilter('fights', new_filter);
},{ offset: 100 });


$('#thirty-eight').waypoint(function(direction) {
  $(".mapboxgl-popup").fadeOut("slow");
  show_killing("2014-02-19 00:15:01", "2014-02-19 00:45:00", true);
},{ offset: 100 });


$('#thirty-nine').waypoint(function(direction) {
  if (direction === 'down') {
    play_video("http://texty.org.ua/video/maidan_maps/unions-fire.mp4", "Порятунок протестувальників з будинку профспілок. Відео BABYLON'13", "img/minimap-unions-fire.png"); 
  } else if (direction === 'up') {
    stop_video(); 
  }
},{ offset: 100 });


$('#forty').waypoint(function(direction) {
  if (direction === 'down') {
    stop_video(); 
  } else if (direction === 'up') {
    play_video("http://texty.org.ua/video/maidan_maps/unions-fire.mp4", "Порятунок протестувальників з будинку профспілок. Відео BABYLON'13", "img/minimap-unions-fire.png"); 
  }
  $(".mapboxgl-popup").fadeOut("slow");
  show_killing("2014-02-19 00:45:01", "2014-02-19 01:00:00", true);
},{ offset: 350 });


$('#forty-one').waypoint(function(direction) {
  $(".mapboxgl-popup").fadeOut("slow");
  show_killing("2014-02-19 01:00:01", "2014-02-19 02:10:00", false);
  create_popup([30.524320854186136, 50.450851057984273], 'Цвігун, Топій, Клітинський');
  if (direction == "up") {
    morph("geo181645", ["maidan", "berkut"]);
    d3.select("#church").attr("opacity", 0.2);
  }
},{ offset: 350 });


$('#forty-two').waypoint(function(direction) {
  $(".mapboxgl-popup").fadeOut("slow");
  map.getSource('barricade-data').setData("data/lines_190300.geojson");
  morph("geo190300", ["maidan", "berkut"]);  
  d3.select("#church").attr("opacity", 0);
},{ offset: 350 });


$('#forty-three').waypoint(function(direction) {
   if (direction === 'down') {
    play_video("http://texty.org.ua/video/maidan_maps/explosions-18.mp4", "Палаючі барикади. Відео BABYLON'13", "img/minimap-explosions-18.png"); 
  } else if (direction === 'up') {
    stop_video(); 
  }
},{ offset: 10 });


$('#forty-four').waypoint(function(direction) {
   if (direction === 'down') {
    stop_video(); 
  } else if (direction === 'up') {
    play_video("http://texty.org.ua/video/maidan_maps/explosions-18.mp4", "Палаючі барикади. Відео BABYLON'13", "img/minimap-explosions-18.png"); 
  }
},{ offset: 350 });


$('#forty-five').waypoint(function(direction) {
  if (direction === 'up') {
    $(".mapboxgl-popup").fadeOut("slow");
    show_buildings('182324');
  }
},{ offset: 250 });


$('#forty-six').waypoint(function(direction) {
  if (direction === 'down') {
    play_video("http://texty.org.ua/video/maidan_maps/day-19.mp4", "Ранок на Майдані 19 лютого. Відео BABYLON'13", "img/minimap-day-19.png");  
  } else if (direction === 'up') {
     stop_video();  
    $(".mapboxgl-popup").fadeOut("slow");
    morph("geo190300", ["maidan", "berkut"]);
  }
  show_buildings('191400');
},{ offset: 50 });


$('#forty-seven').waypoint(function(direction) {
  morph("geo191400", ["maidan"]);
  create_popup([30.525266, 50.447507], 'Мітингувальники захопили консерваторію');
  if (direction === 'down') {
    stop_video();
  } else if (direction === 'up') {
    play_video("http://texty.org.ua/video/maidan_maps/day-19.mp4", "Ранок на Майдані 19 лютого. Відео BABYLON'13", "img/minimap-day-19.png");
  }
},{ offset: 350 });


$('#forty-eight').waypoint(function(direction) {
  $(".mapboxgl-popup").fadeOut("slow");
  show_killing("2014-02-19 02:10:01", "2014-02-20 08:00:00", true);
  if (direction === "up"){
    animate_fly([30.522290,50.450731], zoom_size*1.05, 20, 0);
  }
},{ offset: 250 });


$('#forty-nine').waypoint(function(direction) {
  $(".mapboxgl-popup").fadeOut("slow");
  animate_fly([30.523568,50.449962], zoom_size*1.1, 10, 10);
  show_killing("2014-02-20 08:00:01", "2014-02-20 08:50:00", true);
},{ offset: 250 });


$('#fifty').waypoint(function(direction) {
  if (direction === 'down') {
    play_video("http://texty.org.ua/video/maidan_maps/explosion-20.mp4", "Майдан намагається повернути позиції. Між 8 та 9 ранку 20 січня", "img/minimap-explosion-20.png");  
  } else if (direction === 'up') {
     stop_video();  
  }
},{ offset: 50 });


$('#fifty-one').waypoint(function(direction) {
  if (direction === 'down') {
    stop_video();
  } else if (direction === 'up') {
    morph("geo191400", ["maidan", "berkut"]);
    play_video("http://texty.org.ua/video/maidan_maps/explosion-20.mp4", "Майдан намагається повернути позиції. Між 8 та 9 ранку 20 січня", "img/minimap-explosion-20.png");  
  }
},{ offset: 350 });


$('#fifty-two').waypoint(function(direction) {
  $(".mapboxgl-popup").fadeOut("slow");
  show_killing("2014-02-20 08:50:01", "2014-02-20 08:59:34", false);
  create_popup([30.526180374466549, 50.449740482901902], 'Балюк, Арутюнян');
  map.getSource('barricade-data').setData("data/lines_200900.geojson");
  morph("geo200900", ["maidan", "berkut", "chorna-rota"]);
  d3.select("#chorna-rota").attr("opacity", 0);
},{ offset: 250 });


$('#fifty-three').waypoint(function(direction) {
  $(".mapboxgl-popup").fadeOut("slow");
  d3.select("#chorna-rota").attr("opacity", 0.7).style("fill", "#000000").style("stroke", "#fee391");
  show_killing("2014-02-20 08:59:35", "2014-02-20 09:00:37", true);
  create_popup([30.528248, 50.449275], 'Поява чорної роти');
  if(direction === "up") {
    morph("geo200900", ["maidan", "berkut", "chorna-rota"]);
  }
},{ offset: 250 });


$('#fifty-four').waypoint(function(direction) {
  $(".mapboxgl-popup").fadeOut("slow");
  morph("geo200905", ["maidan", "berkut","chorna-rota"]);
  show_killing("2014-02-20 09:00:38", "2014-02-20 09:05:00", true);
},{ offset: 250 });


$('#fifty-five').waypoint(function(direction) {
  $(".mapboxgl-popup").fadeOut("slow");
  show_killing("2014-02-20 09:05:01", "2014-02-20 09:07:16", true);
},{ offset: 150 });


$('#fifty-six').waypoint(function(direction) {
  if (direction === 'down') {
    play_video("http://texty.org.ua/video/maidan_maps/retreat-20.mp4", "Відступ силовиків до урядового кварталу ~9:10 20 січня", "img/minimap-retreat-20.png");  
  } else if (direction === 'up') {
     stop_video();  
     morph("geo200905", ["maidan", "berkut","chorna-rota"]);
  }
},{ offset: 150 });


$('#fifty-seven').waypoint(function(direction) {
  if (direction === 'down') {
    stop_video();
  } else if (direction === 'up') {
    play_video("http://texty.org.ua/video/maidan_maps/retreat-20.mp4", "Відступ силовиків до урядового кварталу ~9:10 20 січня", "img/minimap-retreat-20.png");  
  }
},{ offset: 350 });


$('#fifty-eight').waypoint(function(direction) {
  morph("geo200910", ["maidan", "berkut","chorna-rota"]);
  $(".mapboxgl-popup").fadeOut("slow");
  show_killing("2014-02-20 09:07:17", "2014-02-20 09:08:15", true);
},{ offset: 250 });


$('#fifty-nine').waypoint(function(direction) {
  $(".mapboxgl-popup").fadeOut("slow");
  show_killing("2014-02-20 09:08:16", "2014-02-20 09:08:34", true);
},{ offset: 250 });


$('#sixty').waypoint(function(direction) {
  $(".mapboxgl-popup").fadeOut("slow");
  morph("geo200910", ["chorna-rota"]);
  show_killing("2014-02-20 09:08:35", "2014-02-20 09:11:55", false);
  create_popup([30.527103533328003, 50.449944021296972], 'Коцюба, Братушка');
},{ offset: 150 });


$('#sixty-one').waypoint(function(direction) {
  morph("geo200912", ["chorna-rota"]);
},{ offset: 150 });



$('#sixty-two').waypoint(function(direction) {
  $(".mapboxgl-popup").fadeOut("slow");
  if (direction === 'down') {
    play_video("http://texty.org.ua/video/maidan_maps/instytutska-0913.mp4", "Снайпери з жовтими пов'язками стріляють в натовп. ~9:13 20 лютого", "img/minimap-instytutska-0913.png");  
  } else if (direction === 'up') {
     stop_video();  
  }
},{ offset: 50 });


$('#sixty-three').waypoint(function(direction) {
  morph("geo200916", ["chorna-rota"]);
  $(".mapboxgl-popup").fadeOut("slow");
  show_killing("2014-02-20 09:11:56", "2014-02-20 09:15:40", true);
  if (direction === 'down') {
    stop_video();
  } else if (direction === 'up') {
    play_video("http://texty.org.ua/video/maidan_maps/instytutska-0913.mp4", "Снайпери з жовтими пов'язками стріляють в натовп. ~9:13 20 лютого", "img/minimap-instytutska-0913.png");  
  }
},{ offset: 350 });


$('#sixty-four').waypoint(function(direction) {
  $(".mapboxgl-popup").fadeOut("slow");
  morph("geo200919", ["maidan","berkut","chorna-rota"]);
  show_killing("2014-02-20 09:15:41", "2014-02-20 09:18:08", false);
  create_popup([30.527153468447487, 50.449888581575465], 'Аксенін, Мойсей, Тарасюк');
},{ offset: 150 });


$('#sixty-five').waypoint(function(direction) { 
  map.getSource('barricade-data').setData("data/lines_200921.geojson");
  morph("geo200921", ["maidan","berkut","chorna-rota"]); 
},{ offset: 150 });


$('#sixty-six').waypoint(function(direction) {
  $(".mapboxgl-popup").fadeOut("slow");
  show_killing("2014-02-20 09:18:09", "2014-02-20 09:21:59", true);
},{ offset: 150 });


$('#sixty-seven').waypoint(function(direction) {
  $(".mapboxgl-popup").fadeOut("slow");
  if (direction === 'down') {
    play_video("http://texty.org.ua/video/maidan_maps/instytutska-0922.mp4", "Смерть Андрія Дигдаловича, 09:22:51 20 лютого", "img/minimap-instytutska-0922.png");  
  } else if (direction === 'up') {
     stop_video();  
  }
},{ offset: 150 });


$('#sixty-eight').waypoint(function(direction) {
  show_killing("2014-02-20 09:22:00", "2014-02-20 09:26:00", true);
  animate_fly([30.527048, 50.448768], zoom_size*1.17, 10, 10);
  if (direction === 'down') {
    stop_video();
  } else if (direction === 'up') {
    play_video("http://texty.org.ua/video/maidan_maps/instytutska-0922.mp4", "Смерть Андрія Дигдаловича, 09:22:51 20 лютого", "img/minimap-instytutska-0922.png");   
  }
},{ offset: 350 });


$('#sixty-nine').waypoint(function(direction) {
  $(".mapboxgl-popup").fadeOut("slow");
  show_killing("2014-02-20 09:26:01", "2014-02-20 09:28:00", false);
  create_popup([30.528612462947695, 50.448532866121219], 'Дзявульський, Кемський, Опанасюк');
  if (direction === "up") {
    morph("geo200921", ["maidan","berkut","chorna-rota"]);
  }
},{ offset: 150 });


$('#seventy').waypoint(function(direction) {
  $(".mapboxgl-popup").fadeOut("slow");
  show_killing("2014-02-20 09:28:01", "2014-02-20 09:29:40", true);
  morph("geo200929", ["maidan","berkut","chorna-rota"]);
},{ offset: 150 });


$('#seventy-one').waypoint(function(direction) {
  $(".mapboxgl-popup").fadeOut("slow");
  show_killing("2014-02-20 09:29:41", "2014-02-20 09:47:11", false);
  create_popup([30.528949480304266, 50.448046761295394], 'Гриневич, Жиловага');
  create_popup([30.528334370230827, 50.448306019834526], 'Ушневич, Жеребний, Варениця, Точин');
},{ offset: 200 });


$('#seventy-two').waypoint(function(direction) {
  $(".mapboxgl-popup").fadeOut("slow");
  show_killing("2014-02-20 09:47:12", "2014-02-20 09:56:28",false);
  create_popup([50.448190345594632, 30.528439171999914], 'Паращук, Ткачук, Зубенко, Пантелєєв, Голоднюк, Гурик, Котляр');
},{ offset: 200 });


$('#seventy-three').waypoint(function(direction) {
  $(".mapboxgl-popup").fadeOut("slow");
  show_killing("2014-02-20 09:56:29", "2014-02-20 11:29:54",false);
  create_popup([30.526485293253895, 50.449354803550193], 'Полянський');
  create_popup([30.52885167800893, 50.447952269965796], 'Шилінг');
  create_popup([30.528407731469191, 50.448185896579758], 'Паньків, Царьок, Чміленко, Чаплінський');
  create_popup([30.529006812684287, 50.44817776032658], 'Храпаченко');
},{ offset: 10 });


$('#seventy-four').waypoint(function(direction) {
  $(".mapboxgl-popup").fadeOut("slow");
  animate_fly([30.522290,50.450731], zoom_size*1.05, 20, 0);
  if (direction === 'down') {
     play_video("http://texty.org.ua/video/maidan_maps/instytutska-1001.mp4", "Eпіцентр розстрілів, ~10:01 20 лютого", "img/minimap-instytutska-1001.png");  
  } else if (direction === 'up') {
     stop_video();  
     morph("geo200929", ["maidan", "berkut"]);
     map.getSource('barricade-data').setData("data/lines_200921.geojson");
     d3.select("#chorna-rota").attr("opacity", 0.8);
     animate_fly([30.527048, 50.448768], zoom_size*1.17, 10, 10);
  }
},{ offset: 10 });


$('#seventy-five').waypoint(function(direction) {
  $(".mapboxgl-popup").fadeOut("slow");
  d3.select("#chorna-rota").attr("opacity", 0);
  show_killing("2014-02-20 11:29:55", "2014-02-20 16:57:55", true);
  if (direction === 'down') {
    stop_video();
  } else if (direction === 'up') {
    play_video("http://texty.org.ua/video/maidan_maps/instytutska-1001.mp4", "Eпіцентр розстрілів, ~10:01 20 лютого", "img/minimap-instytutska-1001.png");   
  }
},{ offset: 350 });


$('#seventy-six').waypoint(function(direction) {
  map.getSource('barricade-data').setData("data/lines_201610.geojson");
  morph("geo201610", ["maidan", "berkut"]);
},{ offset: 350 });


$('#seventy-seven').waypoint(function(direction) {
  $(".mapboxgl-popup").fadeOut("slow");
},{ offset: 150 });



$('#seventy-eight').waypoint(function(direction) {
  $(".mapboxgl-popup").fadeOut("slow");
  animate_fly([30.527287,50.449388], zoom_size*1.03, 20, 0);
},{ offset: 150 });


$('.disclaimer').waypoint(function(direction) {
  $("#map").animate({ opacity: 0.15 }, 200 );
  if(direction === "up") {
    $("#map").animate({ opacity: 1 }, 200 );
  }
},{ offset: 450 });

