/* global jQuery, mapboxgl */
(function ($) {
  'use strict';

  var sourceMapData = [];
  var filteredMapData = [];

  var filterCurrentValues = {};

  var regionCountryIds = {};
  var countryIds = {};
  var regionsSurveyAvailableIds = {};
  var regionsSurveyIds = {};
  var countriesSurveysAvailableCount = {};
  var countriesSurveysTotalCount = {};
  var surveyCountMax = 1;

  var countryFilterExpression = ['all', false];
  var countryOpacityExpression = 0;

  var $filtersFormEl = $('form#map-filters');
  var $filtersDateRangeSliderEl = $('#mapfilter-daterange-slider');
  var $filterDateRangeLabelEl = $('#mapfilter-daterange-label');
  var $filtersDataAccessControls = $('#mapfilter-dataaccess input:radio[name="dataAccess"]');
  var $filterYearStartEl = $('#mapfilter-yearstart');
  var $filterYearEndEl = $('#mapfilter-yearend');

  var slideUpdateTimeoutID;

  var isTouchDevice = 'ontouchstart' in document.documentElement === true;

  var validateMapData = function (data) {
    // Validate the incoming map data
    // Expecting an array of objects with fields: id, yearStart, yearEnd, countryId, countryIso, region, dataAccess
    if (data !== undefined && Object.prototype.toString.call(data) === '[object Array]') {
      if (data.length > 0) {
        var expectedFields = ['id', 'yearStart', 'yearEnd', 'countryId', 'countryIso', 'region', 'dataAccess'];
        var i = expectedFields.length;
        while (i--) {
          if (data[0].hasOwnProperty(expectedFields[i])) {
            expectedFields.splice(i, 1);
          }
        }
        if (expectedFields.length === 0) {
          sourceMapData = data.concat();
          setInitialFilterValues(data);
          countStudies();
          filterMapData();
          activateControls();
        } else {
          console.log('Map data is not in expected format - Missing fields: ' + expectedFields.toString());
        }
      } else {
        console.log('Map data is empty');
      }
    } else {
      console.log('Map data is missing or is not expected format');
    }
  };

  var setInitialFilterValues = function (data) {
    // Set the initial values for the filter UI controls

    // Date range
    var yearMinValue = data.reduce(function (a, b) { return a['yearStart'] < b['yearStart'] ? a : b; })['yearStart'];
    var yearMaxValue = data.reduce(function (a, b) { return a['yearEnd'] > b['yearEnd'] ? a : b; })['yearEnd'];

    filterCurrentValues['yearStart'] = yearMinValue;
    filterCurrentValues['yearEnd'] = yearMaxValue;

    // Data access
    filterCurrentValues['dataAccess'] = '1';

    // Update the UI controls
    $filtersDateRangeSliderEl.slider({
      animate: false,
      min: parseInt(filterCurrentValues['yearStart']),
      max: parseInt(filterCurrentValues['yearEnd']),
      range: true,
      values: [parseInt(filterCurrentValues['yearStart']), parseInt(filterCurrentValues['yearEnd'])]
    });

    $filterDateRangeLabelEl.html(filterCurrentValues['yearStart'] + ' &ndash; ' + filterCurrentValues['yearEnd']);
    $filterYearStartEl.val(filterCurrentValues['yearStart']);
    $filterYearEndEl.val(filterCurrentValues['yearEnd']);

    $filtersDataAccessControls.filter('[value=' + filterCurrentValues['dataAccess'] + ']').prop('checked', true);

    // Add event listeners
    $filtersDateRangeSliderEl.on('slidechange', sliderUpdate);
    $filtersDateRangeSliderEl.on('slide', sliderUpdate);
    $filtersFormEl.on('change', 'input', getFilterValues);
  };

  var getFilterValues = function () {
    if ($filtersFormEl.length && $.deparam) {
      var serializedFilters = $filtersFormEl.serialize();
      filterCurrentValues = $.deparam(serializedFilters);

      // Apply new filters to map
      filterMapData();
    }
  };

  var countStudies = function () {
    sourceMapData.forEach(function (s) {
      var surveyId = s['id'];
      var iso = s['countryIso'];
      var countryId = s['countryId'];
      var region = s['region'];

      if (typeof iso === 'string' || iso === 'number') {
        if (!countriesSurveysTotalCount.hasOwnProperty(iso)) {
          countriesSurveysTotalCount[iso] = 1;
        } else {
          countriesSurveysTotalCount[iso]++;
        }
      }

      if (typeof region === 'string') {
        if (!regionsSurveyIds.hasOwnProperty(region)) {
          regionsSurveyIds[region] = [];
        }
        if (regionsSurveyIds[region].indexOf(surveyId) < 0) {
          regionsSurveyIds[region].push(surveyId);
        }
      }

      if (typeof countryId === 'string' || countryId === 'number') {
        if (!countryIds.hasOwnProperty(iso)) {
          countryIds[iso] = countryId;
        }
        if (typeof region === 'string') {
          if (!regionCountryIds.hasOwnProperty(region)) {
            regionCountryIds[region] = [];
          }
          if (regionCountryIds[region].indexOf(countryId) < 0) {
            regionCountryIds[region].push(countryId);
          }
        }
      }
    });

    // Determine the country with the highest survey count and use value for shading
    var mode = Object.keys(countriesSurveysTotalCount).reduce(function (a, b) { return countriesSurveysTotalCount[a] > countriesSurveysTotalCount[b] ? a : b; });
    surveyCountMax = countriesSurveysTotalCount[mode];
  };

  var activateControls = function () {
    $filtersDataAccessControls.prop('disabled', false);
  };

  var sliderUpdateValues = function (values) {
    $filterYearStartEl.val(values[0]);
    $filterYearEndEl.val(values[1]).trigger('change'); // Only need to trigger change event on one input field
  };

  var sliderUpdate = function (event, ui) {
    $filterDateRangeLabelEl.html(ui.values[0] + ' &ndash; ' + ui.values[1]);
    clearTimeout(slideUpdateTimeoutID);

    if (event.type === 'slide') {
      slideUpdateTimeoutID = window.setTimeout(sliderUpdateValues, 100, ui.values);
    } else if (event.type === 'slidechange') {
      sliderUpdateValues(ui.values);
    }
  };

  var updateCountries = function () {
    if (filteredMapData !== undefined && $.isArray(filteredMapData) && filteredMapData.length > 0) {
      var countries = [];
      regionsSurveyAvailableIds = {};
      countriesSurveysAvailableCount = {};
      filteredMapData.forEach(function (s) {
        var surveyId = s['id'];
        var iso = s['countryIso'];
        var region = s['region'];
        if (typeof iso === 'string' || iso === 'number') {
          if (countries.indexOf(iso) < 0) {
            countries.push(iso);
          }

          if (!countriesSurveysAvailableCount.hasOwnProperty(iso)) {
            countriesSurveysAvailableCount[iso] = 1;
          } else {
            countriesSurveysAvailableCount[iso]++;
          }
        }
        if (typeof region === 'string') {
          if (!regionsSurveyAvailableIds.hasOwnProperty(region)) {
            regionsSurveyAvailableIds[region] = [];
          }
          if (regionsSurveyAvailableIds[region].indexOf(surveyId) < 0) {
            regionsSurveyAvailableIds[region].push(surveyId);
          }
        }
      });

      // Filter the map so only active countries trigger a popup
      countryFilterExpression = ['match', ['get', 'WB_A3']];
      countryFilterExpression.push(countries);
      countryFilterExpression = countryFilterExpression.concat([true, false]);

      // Set the opacity of each country according to number of surveys
      var countryOpacityExpression = [
        'interpolate', ['linear'],
        ['zoom'],
        1, 0.8, // zoom level 1
        2 // zoom level 2+
      ];
      var ex = ['match', ['get', 'WB_A3']];

      for (var c in countriesSurveysAvailableCount) {
        ex.push(c, 0.25 + 0.75 * (countriesSurveysAvailableCount[c] / surveyCountMax));
      }

      ex.push(0);
      countryOpacityExpression.push(ex);
    } else {
      countryFilterExpression = ['all', false];
      countryOpacityExpression = 0;
    }

    map.setFilter('countries', countryFilterExpression);
    map.setPaintProperty('countries', 'fill-opacity', countryOpacityExpression);
  };

  var filterMapData = function () {
    // Use the values in 'filterCurrentValues' to filter map data

    var filteredData = [];
    sourceMapData.forEach(function (s) {
      var c1 = filterCurrentValues.yearStart <= s['yearStart'] && filterCurrentValues.yearEnd >= s['yearStart'];
      var c2 = filterCurrentValues.yearStart <= s['yearEnd'] && filterCurrentValues.yearEnd >= s['yearEnd'];
      var c3 = filterCurrentValues.yearStart >= s['yearStart'] && filterCurrentValues.yearEnd <= s['yearEnd'];
      var c4 = s['dataAccess'] === filterCurrentValues.dataAccess;

      if ((c1 || c2 || c3) && c4) {
        filteredData.push(s);
      }
    });

    filteredMapData = filteredData.concat();

    // Update the map
    updateCountries();
  };

  var clearPopupAndHoverEffects = function (e) {
    if (hoveredRegionStateId !== null) {
      map.setFeatureState({ source: 'countries', sourceLayer: '50m_regions', id: hoveredRegionStateId }, { hover: false });
    }
    if (hoveredCountryStateId !== null) {
      map.setFeatureState({ source: 'countries', sourceLayer: 'ne_50m_admin_0_countries', id: hoveredCountryStateId }, { hover: false });
    }
    popup.remove();
    hoveredCountryStateId = null;
    hoveredRegionStateId = null;
  };

  var generateSearchURLFromFeature = function (feature) {
    if (feature === undefined) {
      return null;
    }

    // Typical url structure:
    // /index.php/catalog/central#_r=&collection=&country=1&dtype=6&from=1934&page=1&ps=&sid=&sk=&sort_by=nation&sort_order=&to=2021&topic=&view=s&vk=

    var queryCountries;

    switch (feature.layer.id) {
      case 'countries':
        var countryIso = feature.properties['WB_A3'];
        if (!countriesSurveysTotalCount.hasOwnProperty(countryIso) || countriesSurveysTotalCount[countryIso].length === 0) {
          return null;
        }
        queryCountries = countryIds.hasOwnProperty(countryIso) ? countryIds[countryIso] : undefined;
        break;
      case 'regions':
        var regionName = feature.properties['REGION'];
        if (!regionsSurveyIds.hasOwnProperty(regionName) || regionsSurveyIds[regionName].length === 0) {
          return null;
        }
        queryCountries = regionCountryIds.hasOwnProperty(regionName) ? regionCountryIds[regionName].join() : undefined;
        break;
    }

    var querystring = {
      '_r': undefined,
      'collection': undefined,
      'country': queryCountries,
      'dtype': filterCurrentValues.dataAccess === '0' ? 6 : undefined,
      'from': filterCurrentValues.yearStart,
      'page': 1,
      'ps': undefined,
      'sid': undefined,
      'sk': undefined,
      'sort_by': 'nation',
      'sort_order': undefined,
      'to': filterCurrentValues.yearEnd,
      'topic': undefined,
      'view': 's',
      'vk': undefined
    };

    return '/index.php/catalog/central#' + $.param(querystring);
  };

  var style = {
    'version': 8,
    'sources': {
      'countries': {
        'type': 'vector',
        'tiles': [window.location.origin + '/mapfiles/tiles/{z}/{x}/{y}.pbf'],
        'maxzoom': 5
      }
    },
    'glyphs': window.location.origin + '/mapfiles/font/{fontstack}/{range}.pbf',
    'layers': [{
      'id': 'background',
      'type': 'background',
      'paint': {
        'background-color': 'hsl(240, 0%, 100%)'
      }
    }, {
      'id': 'regions',
      'type': 'fill',
      'metadata': {},
      'source': 'countries',
      'source-layer': '50m_regions',
      'filter': [
        'match', ['get', 'REGION_WB'],
        [
          'Sub-Saharan Africa',
          'East Asia & Pacific',
          'Europe & Central Asia',
          'Latin America & Caribbean',
          'Middle East & North Africa',
          'South Asia',
          'North America',
          'Antarctica'
        ],
        true,
        false
      ],
      'layout': {},
      'paint': {
        'fill-color': '#e6e6e6'
      }
    }, {
      'id': 'regions-highlighted',
      'type': 'fill',
      'metadata': {},
      'source': 'countries',
      'source-layer': '50m_regions',
      'minzoom': 1,
      'maxzoom': 2,
      'layout': {},
      'paint': {
        'fill-color': [
          'match', ['get', 'REGION_WB'],
          'Sub-Saharan Africa', 'hsl(128, 53%, 46%)',
          'East Asia & Pacific', 'hsl(274, 53%, 37%)',
          'Europe & Central Asia', 'hsl(36, 96%, 62%)',
          'Latin America & Caribbean', 'hsl(325, 100%, 46%)',
          'Middle East & North Africa', 'hsl(197, 100%, 47%)',
          'South Asia', 'hsl(240, 0%, 52%)',
          'North America', 'hsl(178, 46%, 41%)',
          '#000000'
        ],
        'fill-opacity': ['case',
          ['boolean', ['feature-state', 'hover'], false],
          0.4,
          0
        ]
      }
    }, {
      'id': 'countries-highlighted',
      'type': 'fill',
      'source': 'countries',
      'source-layer': 'ne_50m_admin_0_countries',
      'layout': {},
      'paint': {
        'fill-color': '#000000',
        'fill-opacity': ['case',
          ['boolean', ['feature-state', 'hover'], false],
          0.3,
          0
        ]
      }
    }, {
      'id': 'countries',
      'type': 'fill',
      'source': 'countries',
      'source-layer': 'ne_50m_admin_0_countries',
      'filter': countryFilterExpression,
      'layout': {},
      'paint': {
        'fill-color': [
          'match', ['get', 'REGION_WB'],
          'Sub-Saharan Africa', 'hsl(128, 53%, 46%)',
          'East Asia & Pacific', 'hsl(274, 53%, 37%)',
          'Europe & Central Asia', 'hsl(36, 96%, 62%)',
          'Latin America & Caribbean', 'hsl(325, 100%, 46%)',
          'Middle East & North Africa', 'hsl(197, 100%, 47%)',
          'South Asia', 'hsl(240, 0%, 52%)',
          'North America', 'hsl(178, 46%, 41%)',
          '#000000'
        ],
        'fill-opacity': countryOpacityExpression
      }
    }, {
      'id': 'admin-country',
      'type': 'line',
      'source': 'countries',
      'source-layer': 'ne_50m_admin_0_countries',
      'minzoom': 1,
      'layout': {
        'line-join': 'round',
        'line-cap': 'round'
      },
      'paint': {
        'line-color': 'hsl(0, 100%, 100%)',
        'line-width': [
          'interpolate', ['linear'],
          ['zoom'],
          3,
          0.5,
          10,
          2
        ]
      }
    },
    {
      'id': 'country-labels',
      'type': 'symbol',
      'source': 'countries',
      'source-layer': '50m_countries_label_points',
      'minzoom': 2,
      'maxzoom': 6,
      'layout': {
        'symbol-sort-key': ['get', 'LABELRANK'],
        'text-field': ['coalesce', ['get', 'NAME'], ['get', 'NAME_EN']],
        'text-font': ['Roboto Medium'],
        'text-max-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0,
          5,
          3,
          6
        ],
        'text-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          1,
          ['step', ['get', 'LABELRANK'], 12, 3, 10, 5, 9],
          9,
          ['step', ['get', 'LABELRANK'], 35, 3, 27, 5, 22]
        ]
      },
      'paint': {
        'text-halo-width': 1,
        'text-halo-color': 'hsla(345, 6%, 13%, 0.35)',
        'text-color': 'hsl(0, 0%, 100%)'
      }
    }
    ]
  };

  var map = new mapboxgl.Map({
    container: 'map',
    style: style,
    center: [9.87, 0],
    maxBounds: [[-180, -80], [180, 80]],
    zoom: 1,
    minZoom: 1,
    maxZoom: 5,
    dragRotate: false
  });

  map.addControl(new mapboxgl.NavigationControl({
    showCompass: false
  }));

  map.dragRotate.disable();
  map.touchZoomRotate.disableRotation();

  var popup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false
  });

  // Track the mouse cursor
  popup.trackPointer();

  var hoveredRegionStateId = null;
  var hoveredCountryStateId = null;

  map.on('mousemove', 'regions', function (e) {
    if (map.getZoom() > 2 || e.features.length === 0) {
      return;
    }

    var feature = e.features[0];
    if (hoveredRegionStateId !== feature.id) {
      if (hoveredRegionStateId !== null) {
        map.setFeatureState({ source: 'countries', sourceLayer: '50m_regions', id: hoveredRegionStateId }, { hover: false });
      }

      var name = feature.properties['REGION'];
      var surveyAvailableCount = regionsSurveyAvailableIds.hasOwnProperty(name) ? regionsSurveyAvailableIds[name].length : 0;
      var surveyTotalCount = regionsSurveyIds.hasOwnProperty(name) ? regionsSurveyIds[name].length : 0;

      if (surveyTotalCount > 0) {
        hoveredRegionStateId = feature.id;
        map.setFeatureState({ source: 'countries', sourceLayer: '50m_regions', id: hoveredRegionStateId }, { hover: true });

        var surveyAvailableStr = surveyAvailableCount + ' ' + (surveyAvailableCount === 1 ? 'survey' : 'surveys') + ' with available data';
        var surveyTotalStr = surveyTotalCount + ' ' + (surveyTotalCount === 1 ? 'survey' : 'surveys') + ' total';
        var popupHTML = '<strong>' + name + '</strong><br>' + surveyAvailableStr + '<br>' + surveyTotalStr;
        popup.setHTML(popupHTML).addTo(map);
      }
    }
  });

  map.on('mouseenter', 'regions', function (e) {
    if (map.getZoom() > 2) {
      return;
    }
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', 'regions', function () {
    if (map.getZoom() > 2 || isTouchDevice) {
      return;
    }

    if (hoveredRegionStateId !== null) {
      map.setFeatureState({ source: 'countries', sourceLayer: '50m_regions', id: hoveredRegionStateId }, { hover: false });
    }
    hoveredRegionStateId = null;
    map.getCanvas().style.cursor = '';
    popup.remove();
  });

  map.on('mousemove', 'countries', function (e) {
    if (map.getZoom() <= 2 || e.features.length === 0) {
      return;
    }

    var feature = e.features[0];
    if (hoveredCountryStateId !== feature.id) {
      if (hoveredCountryStateId !== null) {
        map.setFeatureState({ source: 'countries', sourceLayer: 'ne_50m_admin_0_countries', id: hoveredCountryStateId }, { hover: false });
      }

      hoveredCountryStateId = feature.id;
      map.setFeatureState({ source: 'countries', sourceLayer: 'ne_50m_admin_0_countries', id: hoveredCountryStateId }, { hover: true });

      var name = feature.properties['NAME'];
      var iso = feature.properties['WB_A3'];

      var surveyAvailableCount = countriesSurveysAvailableCount.hasOwnProperty(iso) ? countriesSurveysAvailableCount[iso] : 0;
      var surveyTotalCount = countriesSurveysTotalCount.hasOwnProperty(iso) ? countriesSurveysTotalCount[iso] : 0;
      var surveyAvailableStr = surveyAvailableCount + ' ' + (surveyAvailableCount === 1 ? 'survey' : 'surveys') + ' with available data';
      var surveyTotalStr = surveyTotalCount + ' ' + (surveyTotalCount === 1 ? 'survey' : 'surveys') + ' total';
      var popupHTML = '<strong>' + name + '</strong><br>' + surveyAvailableStr + '<br>' + surveyTotalStr;
      popup.setHTML(popupHTML).addTo(map);
    }
  });

  map.on('mouseenter', 'countries', function (e) {
    if (map.getZoom() <= 2) {
      return;
    }
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', 'countries', function () {
    if (map.getZoom() <= 2 || isTouchDevice) {
      return;
    }

    if (hoveredCountryStateId !== null) {
      map.setFeatureState({ source: 'countries', sourceLayer: 'ne_50m_admin_0_countries', id: hoveredCountryStateId }, { hover: false });
    }
    hoveredCountryStateId = null;
    map.getCanvas().style.cursor = '';
    popup.remove();
  });

  // Hide popup and hover effects when map is moved or zoomed
  map.on('movestart', clearPopupAndHoverEffects);

  map.on('click', function (e) {
    var features = map.queryRenderedFeatures(
      e.point,
      { layers: [map.getZoom() > 1 ? 'countries' : 'regions'] }
    );
    if (features.length > 0) {
      var feature = features[0];

      var url = generateSearchURLFromFeature(feature);
      if (url) {
        window.location = url;
      }
    } else {
      clearPopupAndHoverEffects();
    }
  });

  map.on('load', function (e) {
    // Retrieve and validate map data
    // For large data sets it may be better to request data via an asynchronous AJAX request rather than writing to window.mapData

    if (window.mapData !== undefined) {
      validateMapData(window.mapData);
    } else {
      console.log('mapData was not found');
    }
  });
})(jQuery);
