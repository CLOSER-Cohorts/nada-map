<?php if (!defined('BASEPATH')) exit('No direct script access allowed');

/**
 * Map viewer library for NADA
 * 
 */

class Map_viewer
{

  protected $ci;

  public function __construct()
  {
    $this->ci = &get_instance();

    // Load JS and CSS dependencies in head

    // CDN
    // $this->ci->template->add_js('<script src="https://api.tiles.mapbox.com/mapbox-gl-js/v1.2.0/mapbox-gl.js"></script>', 'inline');
    // $this->ci->template->add_css('//api.tiles.mapbox.com/mapbox-gl-js/v1.2.0/mapbox-gl.css');

    // Local
    $this->ci->template->add_js('mapfiles/mapbox-gl.js');
    $this->ci->template->add_css('mapfiles/mapbox-gl.css');

    // Load additional UI components
    $this->ci->template->add_css('javascript/jquery/themes/base/jquery-ui.css');
    $this->ci->template->add_js('javascript/jquery/ui/minified/jquery.ui.core.min.js');
    $this->ci->template->add_js('javascript/jquery/ui/minified/jquery.ui.widget.min.js');
    $this->ci->template->add_js('javascript/jquery/ui/minified/jquery.ui.mouse.min.js');
    $this->ci->template->add_js('javascript/jquery/ui/minified/jquery.ui.slider.min.js');
    $this->ci->template->add_js('mapfiles/jquery.ui.touch-punch.min.js');

    // Add map CSS styles

    $map_styles = '.map-wrapper {
      position: relative;
    }
    .map-wrapper:before {
      display: block;
      content: "";
      width: 100%;
      padding-top: 60%;
    }
    #map {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
    }
    #map-filters a {
      transition: none;
    }
    .mapboxgl-popup,
        .mapboxgl-popup * {
            pointer-events: none;
        }
        
        .mapboxgl-popup-anchor-bottom .mapboxgl-popup-tip,
        .mapboxgl-popup-anchor-bottom-left .mapboxgl-popup-tip,
        .mapboxgl-popup-anchor-bottom-right .mapboxgl-popup-tip {
            border-top-color: #231F20;
        }
        
        .mapboxgl-popup-anchor-right .mapboxgl-popup-tip {
            border-left-color: #231F20;
        }
        
        .mapboxgl-popup-anchor-top .mapboxgl-popup-tip,
        .mapboxgl-popup-anchor-top-left .mapboxgl-popup-tip,
        .mapboxgl-popup-anchor-top-right .mapboxgl-popup-tip {
            border-bottom-color: #231F20;
        }
        
        .mapboxgl-popup-anchor-left .mapboxgl-popup-tip {
            border-right-color: #231F20;
        }
        
        .mapboxgl-popup-content {
            background-color: #231F20;
            color: #FFFFFF;
        }
        
        #map-filters .ui-slider {
          border-color: transparent;
        }

        #map-filters .ui-slider::before {
          content: \'\';
          display: block;
          position: absolute;
          top: 50%;
          width: 100%;
          height: 4px;
          margin-top: -2px;
          background: #EDEDED;
        }

        #map-filters .ui-slider-range {
          top: 50%;
          height: 4px;
          margin-top: -2px;
          background: #3E3E49;
        }
        
        #map-filters .ui-slider-handle.ui-state-default {
          background: url("data:image/svg+xml;utf8,%3Csvg%20width%3D%226%22%20height%3D%2221%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M4%200h2v21H4a4%204%200%200%201-4-4V4a4%204%200%200%201%204-4z%22%20fill%3D%22%23F32F66%22%20fill-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E") no-repeat center;
          border: none;
          cursor: pointer;
        }

        #map-filters .ui-slider-handle.ui-state-default:last-child {
          background: url("data:image/svg+xml;utf8,%3Csvg%20width%3D%226%22%20height%3D%2221%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M0%200h2a4%204%200%200%201%204%204v13a4%204%200%200%201-4%204H0V0z%22%20fill%3D%22%23F32F66%22%20fill-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E") no-repeat center;
          border: none;
        }

        #mapfilter-daterange-label {
          font-family: lexia, serif;
        }

        #map-filters .form-check {
          padding-left: 0;
        }
        
        #map-filters .custom-control-label {
          cursor: pointer;
          font-size: 0.9375em;
        }
        
        #map-filters .custom-radio .custom-control-input:checked~.custom-control-label::before {
          background-color: #EDEDED;
        }
        
        #map-filters .custom-radio .custom-control-input:checked~.custom-control-label::after {
          background-image: url("data:image/svg+xml;charset=utf8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%27-5%20-5%2010%2010%27%3E%3Ccircle%20r%3D%275%27%20fill%3D%27%233E3E49%27%2F%3E%3C%2Fsvg%3E");
        }

        body.home .breadcrumb {
          display: none;
        }
        
        @media only screen and (max-width: 768px) {
          .map-wrapper {
            height: 400px;
          }
          .map-wrapper:before {
            padding-top: 0;
          }
        }';
    $this->ci->template->add_css($map_styles, 'embed');
  }

  public function renderFilters()
  {
    // Filters
    echo '<form id="map-filters">
    <div class="row pl-4 pr-4 pt-3 pb-3">
    <div class="col-md-6 mb-4 mb-md-0">
        <h5>Date range</h5>
        <p class="mb-0"><span id="mapfilter-daterange-label"></span></p>
        <div id="mapfilter-daterange-slider"></div>
        <input type="hidden" name="yearStart" id="mapfilter-yearstart" value="0">
        <input type="hidden" name="yearEnd" id="mapfilter-yearend" value="0">
    </div>
    <div class="col-md-6">
        <h5>Data access</h5>
        <div id="mapfilter-dataaccess">
          <div class="form-check">
              <div class="custom-control custom-radio">
                  <input type="radio" id="mapfilter-dataaccess-available" name="dataAccess" class="custom-control-input" checked value="1" disabled>
                  <label class="custom-control-label" for="mapfilter-dataaccess-available">Data available</label>
              </div>
          </div>
          <div class="form-check">
              <div class="custom-control custom-radio">
                  <input type="radio" id="mapfilter-dataaccess-notavailable" name="dataAccess" class="custom-control-input" value="0" disabled>
                  <label class="custom-control-label" for="mapfilter-dataaccess-notavailable">Data not available</label>
              </div>
          </div>
        </div>
      </div>
    </div>
</form>';
  }

  public function renderMap()
  {
    /*
    get a summary of all surveys with fields: 
    - id
    - year_start
    - year_end
    - iso
    - data_access
    */
    $all_surveys_summary = $this->ci->db->select('surveys.id, surveys.year_start as yearStart, surveys.year_end as yearEnd, countries.countryid as countryId, countries.iso as countryIso, regions.title as region, (forms.model <> "data_na") as dataAccess')
      // ->distinct(TRUE)
      ->join("survey_countries", "surveys.id=survey_countries.sid", "left")
      ->join("countries", "survey_countries.cid=countries.countryid", "left")
      ->join("region_countries", "survey_countries.cid=region_countries.country_id", "left")
      ->join("regions", "region_countries.region_id=regions.id", "left")
      ->join("forms", "surveys.formid=forms.formid", "left")
      ->where("regions.pid", 1)
      ->get('surveys');

    $map_data = $all_surveys_summary->result_array();



    // Map container
    echo '<div class="map-wrapper"><div id="map"></div></div>' . PHP_EOL;

    // Map data
    echo '<script type="text/javascript">' . PHP_EOL;
    echo 'var mapData = ' . json_encode($map_data) . ';'  . PHP_EOL;
    echo '</script>' . PHP_EOL;

    echo '<script type="text/javascript" src="/mapfiles/map.js"></script>' . PHP_EOL;

  }
}
