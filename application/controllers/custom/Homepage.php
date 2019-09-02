<?php
class Homepage extends MY_Controller
{

  public function __construct()
  {
    parent::__construct($skip_auth = TRUE);
    $this->lang->load('general');
    //$this->output->enable_profiler(TRUE);

    //set template for print
    if ($this->input->get("print") === 'yes') 
    {
      $this->template->set_template('blank');
    }
  }

  function index() 
  {
    $page = $this->uri->segment(1);
		$data = array();

		$this->load->model("repository_model");
		$this->lang->load('catalog_search');
		$this->load->model("stats_model");

		// Load the Map viewer library
		$this->load->library('Map_viewer');
		
		$this->title = $page;

    if(file_exists('application/views/static/custom/' . $page . '.php'))
    {
			$content = $this->load->view('static/custom/' . $page, $data, true);
			$this->template->write('title', $this->title, true);
			$this->template->write('content', $content, true);
			$this->template->render();
			return true;		
		}
  }
  
}
/* End of file homepage.php */
/* Location: ./controllers/custom/homepage.php */