import React, { Component } from 'react'
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link
} from "react-router-dom";
import moment from 'moment';
import './App.css';

const API_URL_PREFIX = "http://127.0.0.1:5000"
const COHORT_REPORT_API = API_URL_PREFIX + "/cohort_report"

function App() {
  return (
    <Router>
      <div class="container-fluid">
        <nav className="App-header">
          <p>Precision Medicine Quality Control Dashboard</p>
        </nav>
      </div>

      <div class="container-fluid tab">
        <Tabs />
      </div>

      <div class="container-fluid">
        <Switch>
          <Route exact path="/">
            <Cohort />
          </Route>
          <Route path="/single_patient">
            <SinglePatient />
          </Route>
        </Switch>

      </div>
    </Router>
  );

}


class Tabs extends Component {
  componentDidMount() {
    var activeTab = window.location.pathname === "/" ? "cohort" : "patient";
    switchActive(activeTab);
  }
  render() {
    return (
      <div class="tab">
          <button class="tablinks" id="cohort-tab" href="#"><Link to="/" id="cohort-link">Cohort</Link></button>
          <button class="tablinks" id="patient-tab" href="#"><Link to="/single_patient" id="patient-link">Patient</Link></button>
      </div>
    );
  }
}


function Cohort() {
  switchActive("cohort");

  return (
    <div class="container">
      <div class="row">
      <div class="col sidenav">
        <CohortForm />
        <div id="cohort-patient-info"></div>
      </div>
      <div class="col-9">
        {/* <h4>Cohort View</h4> */}
        <iframe id="cohort-report" title="cohort-report" src={COHORT_REPORT_API}></iframe>
       </div>
      </div>
    </div>
  );
}



class CohortForm extends Component{
  constructor(props) {
    super(props);
    this.state = {h_loc:'', gender:'', cancerType:'', 
                  qcStatus: "PASS,FAIL_SEGMENT,FAIL_GENDER,FAIL_DELETED_GENES",
                  sampleType: "Germline,Tumour"};
    this.handleChange1 = this.handleChange1.bind(this);
    this.handleChange2 = this.handleChange2.bind(this);    
    this.handleChange3 = this.handleChange3.bind(this);
    this.qcStatusHandler = this.qcStatusHandler.bind(this);
    this.sampleTypeHandler = this.sampleTypeHandler.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }


  componentDidUpdate(prevProps, prevState) {
    if (this.state.h_loc !== prevState.h_loc || this.state.gender !== prevState.gender || 
        this.state.cancerType !== prevState.cancerType || this.state.qcStatus !== prevState.qcStatus) {

        var h_loc = this.state.h_loc;
        var gender = this.state.gender;
        var cancer_type = this.state.cancerType;
        var qc_status = this.state.qcStatus;
    
        var url = API_URL_PREFIX + '/patient?h_loc=';
        url += h_loc;
        url += '&gender=';
        url += gender;
        url += '&cancer_type=' + cancer_type;
        url += '&qc_status=' + qc_status;
    
        fetch(url)
            .then(response => response.json())
            .then((data) => {
                this.setState({ patient_info: data })
            })
            .catch(console.log);   
    }
  }

  handleChange1(event) {
    this.setState({h_loc: event.target.value});
  }

  handleChange2(event) {
    this.setState({gender: event.target.value});
  } 

  handleChange3(event) {
    this.setState({cancerType: event.target.value});
  }  

  qcStatusHandler(label, checked) {
    label = label.toUpperCase().replace(/ /g, "_");
    if (!checked) {
      // remove from string
      if (!this.state.qcStatus.match(",")){
        this.setState({qcStatus: ""});
      } else {
        let re = new RegExp("("+label+",|,"+label+"$)");
        this.setState({qcStatus: this.state.qcStatus.replace(re, "")});
      }
    } else {
      if (this.state.qcStatus === "") {
        this.setState({qcStatus: label});
      } else {
        this.setState({qcStatus: this.state.qcStatus + "," + label});
      }
    }
  }

  sampleTypeHandler(label, checked) {
    if (!checked) {
      // remove from string
      if (!this.state.sampleType.match(",")){
        this.setState({sampleType: ""});
      } else {
        let re = new RegExp("("+label+",|,"+label+"$)");
        this.setState({sampleType: this.state.sampleType.replace(re, "")});
      }
    } else {
      if (this.state.sampleType === "") {
        this.setState({sampleType: label});
      } else {
        this.setState({sampleType: this.state.sampleType + "," + label});
      }
    }
  }

  handleSubmit() {
    if (this.state.patient_info) {
      var patient_arr = [];
      for (var patient of this.state.patient_info) {
        patient_arr.push(patient['patient_id']);
      }
      var patient_str = patient_arr.join();

      let url = API_URL_PREFIX + '/sample_ids?patient_ids='+patient_str;
      // select type
      if (!this.state.sampleType.match(",")) {
        url += '&type=' + this.state.sampleType;
      }
      fetch(url)
      .then(rsp => rsp.json())
      .then(json => console.log(json));
    }
  }

  render() {
        if (this.state.patient_info) {
          const src = document.getElementById("cohort-patient-info");
          src.innerHTML = "";
          let title = document.createElement('div');
          title.id = 'cohort-result-title';
          title.innerText = "Results";
          src.appendChild(title);

          for (var i = 0; i < this.state.patient_info.length; ++i) {
            var patient = this.state.patient_info[i];
            var patient_info = '';
            patient_info += patient['patient_id'] + ' | ';
            patient_info += patient['hospital'] + ' | ';
            patient_info += patient['sex'] + '\n';
            patient_info += patient['cancer_type'] + ' | ';
            patient_info += patient['qc_status'];

            let div = document.createElement('div');
            div.classList.add('cohort-result');
            div.innerText = patient_info;
            src.appendChild(div);
          }
          
        }       

    return (
      <div id='filter'>
        <button id="cohort-submit" class="btn btn-outline-success my-2 my-sm-0" type="submit" onClick={this.handleSubmit}>Generate Plots</button>
        <br/>
        <div>
          <div class="input-group-text" id="hospital-text">Hospital</div>
          <input type="search" placeholder="Enter hospital" class="form-control filter" id="hospital" value={this.state.h_loc} onChange={this.handleChange1}/>
        </div>

        <div>
          <div class="input-group-text" id="gender-text">Gender</div>
          <input type="search" placeholder="Enter gender" class="form-control filter" id="gender" value={this.state.gender} onChange={this.handleChange2}/>  
        </div>

        <div>
          <div class="input-group-text" id="cancer-type-text">Cancer Type</div>
          <input type="search" placeholder="Enter cancer type" class="form-control filter" id="cancer-type" value={this.state.cancerType} onChange={this.handleChange3}/>  
        </div>

        <div>
          <div class="input-group-text" id="qc-status-text">QC Status</div>
          <div class="checkbox-container">
            <Checkbox label="Pass" checked={true} handler={this.qcStatusHandler}/>
            <Checkbox label="Fail Segment" checked={true} handler={this.qcStatusHandler}/>
            <Checkbox label="Fail Gender" checked={true} handler={this.qcStatusHandler}/>
            <Checkbox label="Fail Deleted Genes" checked={true} handler={this.qcStatusHandler}/>
          </div>
        </div>

        {/* <div>
          <div class="input-group-text" id="sample-type-text">Sample Type</div>
          <div class="checkbox-container">
            <Checkbox label="Germline" checked={true} handler={this.sampleTypeHandler}/>
            <Checkbox label="Tumour" checked={true} handler={this.sampleTypeHandler}/>
          </div>
        </div> */}

      </div>
    );
  }

}

class Checkbox extends Component {
  constructor(props) {
    super(props);
    this.state = { checked: this.props.checked };
    this.handleCheck = this.handleCheck.bind(this);
  }

  handleCheck() {
    this.setState({checked: !this.state.checked}, this.props.handler(this.props.label, !this.state.checked));
  }

  render() {
    return (
      <div class="checkbox">
        <input type="checkbox" onChange={this.handleCheck} defaultChecked={this.state.checked}></input>
        <div class="checkbox-label">{this.props.label}</div>
      </div>
    )
  }
}



class SinglePatient extends Component {
  constructor(props) {
    super(props)
    this.state = {
      showKnowWhyPopup: false,
      showModal: false
    };
    this.handler = this.handler.bind(this);
    this.setPredictionInfoHandler = this.setPredictionInfoHandler.bind(this);
    this.showModal = this.showModal.bind(this);
    this.hideModal = this.hideModal.bind(this);
  }

  handler(qual){
    if (qual === "low" || qual === "high") {
      this.setState({ quality: qual });
    } else {
      this.setState({ quality: "unreviewed"});
    }
  }

  setPredictionInfoHandler(data) {
    this.setState({prediction_info : data});
  }

  toggleKnowWhyPopup() {
    this.setState({
      showKnowWhyPopup: !this.state.showKnowWhyPopup
    })
  }

  showModal() {
    this.setState({showModal: true});
  }

  hideModal() {
    this.setState({showModal: false});
  }

  render() {
    switchActive("patient");
    return (
      <div class="container">
        <div class="row">
          <div class="col sidenav">
            <PatientIDForm setPredictionInfoHandler={this.setPredictionInfoHandler} handler={this.handler} />
            <br/>
            <div id="patient-sample-details"></div>
          </div>
          <div class="col-9">
            <div class="wrapper">
              <h4 id='patient-title'>Single-Patient View</h4>
              {/* <div id="know-why">
                {this.state.prediction_info && <button onClick={this.toggleKnowWhyPopup.bind(this)}>Know Why</button>}
                {this.state.prediction_info && this.state.showKnowWhyPopup ? 
                    <KnowWhy predictionInfo={this.state.prediction_info} closePopup={this.toggleKnowWhyPopup.bind(this)}/>
                    : null }
              </div> */}
              {this.state.prediction_info && <button class="toggle" onClick={this.showModal}>Know Why</button>}
              <div id="qual-labels"></div>
            </div>
            <div>
              <div id="patient-header">Please enter patient ID</div>
              {this.state.quality && <ObvsQual quality={this.state.quality}/>}
            </div>
            <div id="patient-body"></div>
          </div>
        </div>  
        <Modal show={this.state.showModal} onClose={this.hideModal}>
          <KnowWhy predictionInfo={this.state.prediction_info} />
        </Modal>
      </div>
    );
  }
}


//shows details of why the prediction was made
class KnowWhy extends Component {


  render() {
    const data = this.props.predictionInfo;

    var samples = {'germline':[], 'tumour':[]};
    for (let sample in data) {
      if (data[sample]['type'] === "germline") {
        samples['germline'].push(sample);
      }
      else {
        samples['tumour'].push(sample);
      }
    }

    const germline_content = samples['germline'].map((sample) =>
      <SamplePredictionDetails 
        sample_id = {sample}
        qual_pred = {data[sample]['qual_pred']} 
        path = {data[sample]['path']}
        values = {data[sample]['values']} 
        className="dtree-val"/>
    );
    const tumour_content = samples['tumour'].map((sample) =>
      <SamplePredictionDetails 
        sample_id = {sample}
        qual_pred = {data[sample]['qual_pred']} 
        path = {data[sample]['path']}
        values = {data[sample]['values']} 
        className="dtree-val" />
    ); 

    return (
      <div class="knowwhypopup">
            <div>
              <Features />

              <table className="circos dtree">
                {/* <thead><tr><th colSpan="2">
                  Features
                </th></tr></thead> */}
                <tbody>
                  <tr class="dtree-plots">
                    <td>Decision Tree for Germline Samples</td><td>Decision Tree for Tumour Samples</td>
                  </tr>
                  <tr>
                    <td><img src="clf_germline.png" alt="Germline Decision Tree" class="img-fluid" /></td>
                    <td><img src="clf_tumour.png" alt="Tumour Decision Tree" class="img-fluid" /></td>
                  </tr>
                  <tr>
                    <td>{germline_content}</td><td>{tumour_content}</td>
                  </tr>
                </tbody>
              </table>
              {/* <div>  
                <h3 class="dtreeheading">Decision Tree for Germline Samples</h3>         
                <img src="clf_germline.png" alt="Germline Decision Tree" class="img-fluid" />
                {germline_content}
              </div>
              <div>
                <h3 class="dtreeheading">Decision Tree for Tumour Samples</h3>
                <img src="clf_tumour.png" alt="Tumour Decision Tree" class="img-fluid" />
                {tumour_content}
              </div>  */}
            </div>
      </div>
    )
  }
}

function Features() {
  return (
    <table className="sample features">
    <thead><tr><th colSpan="2">
      Features
    </th></tr></thead>
    <tbody>
      <tr>
        <td>30x</td><td>Picard_mqc-generalstats-picard-PCT_30X</td>
      </tr>
      <tr>
        <td>dup_passed</td><td>duplicates_passed</td>
      </tr>
      <tr>
        <td>gc_drop</td><td>GC_DROPOUT</td>
      </tr>
      <tr>
        <td>med_cov</td><td>Picard_mqc-generalstats-picard-MEDIAN_COVERAGE</td>
      </tr>
    </tbody>
  </table>
  );
}


function SamplePredictionDetails(props) {

  let sample_id_content;
  if (props.qual_pred === 1) {
    sample_id_content = <div class='good dtree-id'> {props.sample_id}  </div>;
  }      
  else {
    sample_id_content = <div class='warning dtree-id'> {props.sample_id}  </div>;
  }
  const decision_path = props.path.map((id) =>
    <li> Node #{id} </li>
  );

  return (
    <div>
    {sample_id_content}

    <table className="dtree-val">
    <thead><tr><th colSpan="2">
      Values
    </th></tr></thead>
    <tbody>
      <Field fieldName='Picard_mqc-generalstats-picard-PCT_30X' fieldKey='Picard_mqc-generalstats-picard-PCT_30X' obj={props.values}/>
      <Field fieldName='duplicates_passed' fieldKey='duplicates_passed' obj={props.values}/>
      <Field fieldName='GC_DROPOUT' fieldKey='GC_DROPOUT' obj={props.values}/>
      <Field fieldName='Picard_mqc-generalstats-picard-MEDIAN_COVERAGE' fieldKey='Picard_mqc-generalstats-picard-MEDIAN_COVERAGE' obj={props.values}/>
    </tbody>
    </table>

    <table className="dtree-path">
    <thead><tr><th colSpan="2">
      Decision Path
    </th></tr></thead>
    </table>

    <ul>{decision_path}</ul>
      

    <br />
    </div>
  );
}


class PatientIDForm extends Component{
  constructor(props) {
    super(props);
    this.state = {patient_id: ''};
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChange(event) {
    this.setState({patient_id: event.target.value});
  }

  handleSubmit(event) {

    event.preventDefault();

    fetch(API_URL_PREFIX + "/patient_list")
    .then(rsp => rsp.json())
    .then(json => {
      let patient_ids = json;
      var id = this.state.patient_id.trim();

      if (patient_ids.includes(id)) {
        document.getElementById("id-not-found").style.display = "none";
        document.getElementById("patient-header").innerText = "Patient ID: " + this.state.patient_id;
    
        var patient_url = API_URL_PREFIX + '/patient?patient_id=';
        patient_url += id;
        if (id !== null && id !== '') {
          fetch(patient_url)
              .then(response => response.json())
              .then((data) => {
                  this.setState({ patient_info: data[0] })
              })
              .catch(console.log);
        }

        var sample_url = API_URL_PREFIX + '/sample?patient_id=';
        sample_url += id;
        if (id !== null && id !== '') {
          fetch(sample_url)
              .then(response => response.json())
              .then((data) => {
                  this.setState({ sample_info: data[0] })
              })
              .catch(console.log);
        }

        var sample_quality_url = API_URL_PREFIX + '/sample_quality_label?patient_id=';
        sample_quality_url += id;
        if (id !== null && id !== '') {
          fetch(sample_quality_url)
              .then(response => response.json())
              .then((data) => {
                  this.setState({ sample_quality_label: data[0] })

                  var sample_quality_label = this.state.sample_quality_label;
                  if (sample_quality_label == null || Object.entries(sample_quality_label).length === 0) {
                    sample_quality_label = {'quality_label': '?'};
                  }

                  this.props.handler(sample_quality_label['quality_label']);
              })
              .catch(console.log);
        }                             

        var prediction_url = API_URL_PREFIX + '/predict?patient_id=';
        prediction_url += id;
        if (id !== null && id !== '') {
          fetch(prediction_url)
              .then(response => response.json())
              .then((data) => {
                  this.props.setPredictionInfoHandler(data)
              })
              .catch(console.log);
        }

        
        var circos_url = API_URL_PREFIX + '/circos?patient_id=' + id;
        if (id !== null && id !== '') {
          fetch(circos_url)
              .then(response => response.json())
              .then((data) => {
                  this.setState({ circos: data })
                  if (!data["input"] & !data["output"]) {
                    this.setState({circosExists: false});
                  } else {
                    this.setState({circosExists: true});
                  }
              })
              .catch(console.log);
        }

    
        

        addPlots(id);
        addQualityLabels(id);       

    } else {
      document.getElementById("id-not-found").innerText = "Error: Patient ID '"+id+"' not found.";
      document.getElementById("id-not-found").style.display = "block";
    }
  });
  }

  render() {
    return (
    <div>
      <form onSubmit={this.handleSubmit} class="form-inline my-2 my-lg-0">
        <input class="form-control mr-sm-2" type="search" placeholder="Patient ID" aria-label="PatientId" value={this.state.value} onChange={this.handleChange}/>
        <button class="btn btn-outline-success my-2 my-sm-0" type="submit">Submit</button>
      </form>
      <div id="id-not-found"></div>
      {this.state.patient_info && this.state.sample_info && <PatientInfo patientInfo={this.state.patient_info} sampleInfo={this.state.sample_info}/>} 
      {this.state.sample_info && <SampleInfo sampleInfo={this.state.sample_info}/>} 
      {this.state.sample_info && <RNAInfo sampleInfo={this.state.sample_info}/>} 
      {this.state.sample_info && <ContamInfo sampleInfo={this.state.sample_info}/>}
      {this.state.circosExists && <Circos imgs={this.state.circos} sampleID={this.state.sample_info["sample_id"]} />}
    </div>
  );
  }
}



class PatientInfo extends Component {
  constructor() {
    super();
    this.state = {open: true};
    this.toggle = this.toggle.bind(this);
  }

  toggle() {
    this.setState({open: !this.state.open });
  }

  render() {
    const p_obj = this.props.patientInfo;
    const s_obj = this.props.sampleInfo;
    return (
      <table className="patient">
        <thead><tr><th colSpan="2">
          <div class="toggle patient" onClick={() => this.toggle()}>{this.state.open ? "–" : "+" }</div>
          Patient Info
        </th></tr></thead>
        {this.state.open ? (
          <tbody>
            <Field fieldName='Patient ID' fieldKey="patient_id" obj={p_obj}/>
            <Field fieldName='Sex' fieldKey="sex" obj={p_obj}/>
            <Field fieldName='Age at Diagnosis' fieldKey='age_at_diagnosis' obj={p_obj}/>
            <Field fieldName='Vital Status' fieldKey='vital_status' obj={p_obj}/>
            <Field fieldName='Age at Death' fieldKey='age_at_death' obj={p_obj}/>
            <Field fieldName='Hospital' fieldKey='hospital' obj={p_obj}/>
            <Field fieldName='Enrolment Date' fieldKey='enrolment_date' obj={p_obj}/>
            <Field fieldName='Cancer Category' fieldKey='cancer_category' obj={s_obj}/>
            <Field fieldName='Cancer Type' fieldKey='cancer_type' obj={s_obj}/>
            <Field fieldName='Final Diagnosis' fieldKey='final_diagnosis' obj={s_obj}/>
          </tbody>
        ) : null}
      </table>
    )
  }
}

class SampleInfo extends Component {
  constructor() {
    super();
    this.state = {open: false};
    this.toggle = this.toggle.bind(this);
  }

  toggle() {
    this.setState({open: !this.state.open });
  }

  render() {
    const s_obj = this.props.sampleInfo;
    return (
      <div>
          <table className="sample">
          <thead><tr><th colSpan="2">
            <div class="toggle sample" onClick={() => this.toggle()}>{this.state.open ? "–" : "+" }</div>
            Sample Info
          </th></tr></thead>
          {this.state.open ? (
            <tbody>
              <Field fieldName='Manifest ID' fieldKey='manifest_id' obj={s_obj}/>
              <Field fieldName='Age at Sample' fieldKey='age_at_sample' obj={s_obj}/>
              <Field fieldName='Event Type' fieldKey='event_type' obj={s_obj}/>
              <Field fieldName='Purity' fieldKey='purity' obj={s_obj}/>
              <Field fieldName='Ploidy' fieldKey='ploidy' obj={s_obj}/>
              <Field fieldName='Mutations/Mb' fieldKey='mut_burden_mb' obj={s_obj}/>
            </tbody>
          ) : null }
          </table>
          <div id="patient-info"></div>
      </div>
    )
  }
}

class ContamInfo extends Component {
  constructor() {
    super();
    this.state = {open: false};
    this.toggle = this.toggle.bind(this);
  }

  toggle() {
    this.setState({open: !this.state.open });
  }

  render() {
    const s_obj = this.props.sampleInfo;
    return (
      <div>
          <table className="contam">
            <thead><tr><th colSpan="2">
              <div class="toggle contam" onClick={() => this.toggle()}>{this.state.open ? "–" : "+" }</div>
              Contamination Check
            </th></tr></thead>
            {this.state.open ? (
              <tbody>
                <Field fieldName='QC Status' fieldKey='qc_status' obj={s_obj}/>
                <Field fieldName='AMBER QC' fieldKey='amber_qc' obj={s_obj}/>
                <Field fieldName='AMBER Tumour BAF' fieldKey='amber_tumor_baf' obj={s_obj}/>
                <Field fieldName='Contamination' fieldKey='contamination' obj={s_obj}/>
              </tbody>
            ) : null }
          </table>
          <div id="patient-info"></div>
      </div>
    )
  }
}

class RNAInfo extends Component {
  constructor() {
    super();
    this.state = {open: false};
    this.toggle = this.toggle.bind(this);
  }

  toggle() {
    this.setState({open: !this.state.open });
  }

  render() {
    const s_obj = this.props.sampleInfo;
    return (
      <div>
          <table className="rna">
            <thead><tr><th colSpan="2">
              <div class="toggle rna" onClick={() => this.toggle()}>{this.state.open ? "–" : "+" }</div>
              RNA QC Metrics
            </th></tr></thead>
            {this.state.open ? (
              <tbody>
                <Field fieldName='RNA Unique Mapped Reads Count' fieldKey='rna_uniq_mapped_reads' obj={s_obj}/>
                <Field fieldName='RNA Unique Mapped Reads %' fieldKey='rna_uniq_mapped_reads_pct' obj={s_obj}/>
                <Field fieldName='RIN' fieldKey='rna_rin' obj={s_obj}/>
              </tbody>
            ) : null }
          </table>
          <div id="patient-info"></div>
      </div>
    )
  }
}

class Field extends Component {
  render() {
    const key = this.props.fieldKey;
    const obj = this.props.obj;
    if (obj.hasOwnProperty(key)) {
      let val = obj[key];
      if (val === null) return null;
      if (key === "enrolment_date") {
        val = moment(val).format('YYYY-MM-DD');
      } else if (key === "manifest_id") {
        val = val.match(/.*_(M\d+($|_pt\d$))/)[1];
      }
      return (
        <tr>
          <td className={this.props.type}>{this.props.fieldName}</td>
          <td className={this.props.type}>{val}</td>
        </tr>
      )
    } else {
      return null;
    }
  }
}
 

class Circos extends Component {
  constructor() {
    super();
    this.state = {open: true, showModal: false};
    this.toggle = this.toggle.bind(this);
    this.showModal = this.showModal.bind(this);
    this.hideModal = this.hideModal.bind(this);
  }

  toggle() {
    this.setState({open: !this.state.open });
  }

  showModal() {
    this.setState({showModal: true});
  }

  hideModal() {
    this.setState({showModal: false});
  }

  render() {
    const input = "data:image/jpeg;base64," + this.props.imgs["input"];
    const output = "data:image/jpeg;base64," + this.props.imgs["output"];
    const descrip_1 = "The outer first circle shows the chromosomes. The darker shaded areas represent large gaps in the human reference genome: i.e. regions of centromeres, heterochromatin & missing short arms.\n\n";
    const descrip_2 = "The second circle shows the somatic variants (incl. exon, intron and intergenic regions). Somatic variants are further divided into an outer ring of single nucleotide polymorphism (SNP) allele frequencies and an inner ring of short insertion/deletion (INDEL) locations. SNP allele frequencies have been corrected for tumor purity and scale from 0 to 100%. Each dot represents a single somatic variant. SNPs are colored according to the type of base change (e.g. C>T/G>A in red) and are in concordance with the coloring used in Alexandrov et al. 2013 Nature paper that describes the use of mutational signatures. INDELs are colored yellow and red for insertions and deletions respectively.\n\n";
    const descrip_3 = "The third circle shows all observed tumor purity adjusted copy number changes, including both focal and chromosomal somatic events. Copy number losses are indicated in red, green shows regions of copy number gain. The scale ranges from 0 (complete loss) to 6 (high level gains). If the absolute copy number is > 6 it is shown as 6 with a green dot on the diagram.\n\n";
    const descrip_4 = "The fourth circle represents the observed 'minor allele copy numbers’ across the chromosome. The range of the chart is from 0 to 3. The expected normal minor allele copy number is 1, and anything below 1 is shown as a loss (orange) and represents a LOH event. Minor allele copy numbers above 1 (blue) indicate amplification events of both A and B alleles at the indicated locations.\n\n";
    const descrip_5 = "The innermost circle displays the observed structural variants within or between the chromosomes. Translocations are indicated in blue, deletions in red, insertions in yellow, tandem duplications in green and inversions in black.\n\n";

    const descrip_raw1 = "The outer circle shows the COBALT ratios of the reference and tumor samples in green and blue respectively. Note the reference ratios are after GC and diploid normalization have been applied. The tumor ratios are after GC normalization has been applied.";
    const descrip_raw2 = "The inner circle shows the raw AMBER BAF points in orange.";
    return (
      <div>
        <table className="circos">
          <thead><tr><th colSpan="2">
            <div class="toggle circos" onClick={() => this.toggle()}>{this.state.open ? "–" : "+" }</div>
            Circos Plots
          </th></tr></thead>
          {this.state.open ? (
            <tbody>
              <tr>
                <td>Input</td>
                <td>Output</td>
              </tr>
              <tr>
                <td><img src={input} alt="Input circos" onClick={this.showModal}/></td>
                <td><img src={output} alt="Output circos" onClick={this.showModal}/></td>
              </tr>
            </tbody>
          ) : null}
        </table>
        <Modal show={this.state.showModal} onClose={this.hideModal}>
          <table className="circos">
            <thead><tr><th colSpan="2">
              Circos Plots 
            </th></tr></thead>
            <tbody>
              <tr>
                <td colSpan="2">Sample ID: {this.props.sampleID}</td>
              </tr>
              <tr>
                <td>Input</td>
                <td>Output</td>
              </tr>
              <tr>
                <td><img src={input} alt="Input circos" onClick={this.showModal}/></td>
                <td><img src={output} alt="Output circos" onClick={this.showModal}/></td>
              </tr>
              <tr id="circos-description">
                <td>
                  {descrip_raw1} <br/><br/>
                  {descrip_raw2} <br/><br/>
                </td>
                <td>
                {descrip_1} <br/><br/>
                {descrip_2} <br/><br/>
                {descrip_3} <br/><br/>
                {descrip_4} <br/><br/>
                {descrip_5} <br/><br/>
                </td>
              </tr>
            </tbody>
          </table>
        </Modal>
      </div>
    );
  }
}

class Modal extends Component {
  render() {
    if (!this.props.show) return null;
    return (
      <div class="modal-backdrop">
        <div class="modal">
            {this.props.children}
            <button class="close-modal" onClick={this.props.onClose}>Close</button>
        </div>
      </div>
    );
  }
}


class ObvsQual extends Component {
  render() {
    var label = this.props.quality.toUpperCase();
    if (label !== 'UNREVIEWED') {
      label += ' QUAL';
    }
    return (
      <div class="obvs-qual">
        <div id='obvs-qual-label' class={this.props.quality}>{label}</div>
        <span class="hover-text">Observed Sample Quality</span>
      </div>
    );
  }
}

function addPlots(patientID) {
  var src = document.getElementById("patient-body");
  src.innerHTML = "";
  let temp = document.createElement("div");
  temp.innerText = "Generating MultiQC report...";
  temp.style.display = "block";
  src.appendChild(temp);

  var iframe = document.createElement("iframe");
  iframe.src = API_URL_PREFIX + "/patient_report?patient_id=" + patientID;
  iframe.id = "patient-report";
  iframe.title = "patient-report";
  iframe.onload = function() {temp.style.display = "none";}
  src.appendChild(iframe);
}

function addQualityLabels(patientID) {
  let src = document.getElementById("qual-labels")

  src.innerHTML = "";
  fetch(API_URL_PREFIX + "/predict?patient_id="+patientID)
  .then(rsp => rsp.json())
  .then(json => {
    for (let sample in json) {
      let div = document.createElement("div");
      div.classList.add("qual-label")
      if (json[sample]["qual_pred"] === 1) {
        div.innerText = "✓ Sample " + sample + " predicted to have good quality.";
        div.classList.add("good");
      } else {
        div.innerText = "⚠ Warning: sample " + sample + " may have low quality.";
        div.classList.add("warning");
      }
      src.appendChild(div)

    }
  })

}

function switchActive(activeTab) {
  var tabName = activeTab + "-tab";
  var linkName = activeTab + "-link";
  var inactiveTab = activeTab === "cohort" ? "patient" : "cohort";
  var itabName = inactiveTab + "-tab";
  var ilinkName = inactiveTab + "-link";

  if (document.getElementById(tabName)) {
    document.getElementById(tabName).classList.add("active");
  }
  if (document.getElementById(linkName)) {
    document.getElementById(linkName).classList.add("active");
  }
  if (document.getElementById(itabName)) {
    document.getElementById(itabName).classList.remove("active");
  }
  if (document.getElementById(ilinkName)) {
    document.getElementById(ilinkName).classList.remove("active");
  }
}


export default App
