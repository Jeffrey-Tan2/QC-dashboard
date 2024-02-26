#!flask/bin/python
from flask import Flask, jsonify, request, abort
from flask_cors import CORS
import json
import report, model
import pymysql
import sys
from config import db_creds

app = Flask(__name__)
CORS(app)

#keeping this as global so that predict endpoint can use this
clf_germline = model.fit_model("germline")
clf_tumour = model.fit_model("tumour")
model.plot_decision_tree(clf_germline, clf_tumour)


def add_filter_to_query(query, filter_query):
	if query.find(' where ') == -1:
		query = query + " where " + filter_query
	else:
		query = query + " and " + filter_query	
	return query


#call with /patient for all patient info
#patient specific example : /patient?patient_id=P000201
@app.route('/patient', methods=['GET'])
def get_patient_details(id_only = False):
	try:
		connection = pymysql.connect(
			host=db_creds['host'],
			user=db_creds['user'],
			passwd=db_creds['password'],
			db=db_creds['database'],
			port = db_creds['port'],
			ssl={'ssl':{'ca': '~/.qc-server-keys/ca.pem'
						}
				}
		)		
		patient_id = request.args.get('patient_id')
		hospital_location = request.args.get('h_loc')
		gender = request.args.get('gender')
		cancer_type = request.args.get('cancer_type')
		qc_status = request.args.get('qc_status')
		query = 'select patient.*, sample.cancer_type, sample_purity_metrics.qc_status from patient, sample, sample_purity_metrics'
		query += " where patient.patient_id = sample.patient_id and sample.sample_id = sample_purity_metrics.sample_id"
		if id_only:
			query = query.replace('*', 'patient_id')
		if patient_id:
			filter_query = "patient.patient_id='{0}'".format(patient_id)
			query = add_filter_to_query(query, filter_query)
		if hospital_location:
			filter_query = "hospital like '%{0}%'".format(hospital_location)
			query = add_filter_to_query(query, filter_query)
		if gender:
			filter_query = "sex='{0}'".format(gender)
			query = add_filter_to_query(query, filter_query)
		if cancer_type:
			filter_query = "cancer_type like '%{0}%'".format(cancer_type)
			query = add_filter_to_query(query, filter_query)
		if qc_status and qc_status[0]:
			qc_status = qc_status.split(",")
			if len(qc_status) == 1:
				filter_query = "qc_status='{0}'".format(qc_status[0])
			else:
				filter_query = "qc_status in {0}".format(tuple(qc_status))
			query = add_filter_to_query(query, filter_query)
		print(query)
		connection.ping(reconnect=True)
		cursor = connection.cursor()
		cursor.execute(query)
		all_patient_details = [dict((cursor.description[i][0], value)
    	          for i, value in enumerate(row)) for row in cursor.fetchall()]
		# print(all_patient_details)
		cursor.close()
		connection.close()
		if id_only:
			patient_ids = [patient["patient_id"] for patient in all_patient_details]
			return jsonify(patient_ids)
		else:
			return jsonify(all_patient_details)		
	except:	
		print("Unexpected error:", sys.exc_info()[0])
		return jsonify([])


@app.route('/sample', methods=['GET'])
def get_sample_details():
	try:
		connection = pymysql.connect(
			host=db_creds['host'],
			user=db_creds['user'],
			passwd=db_creds['password'],
			db=db_creds['database'],
			port = db_creds['port'],
			ssl={'ssl':{'ca': '~/.qc-server-keys/ca.pem'
						}
				}
		)		
		patient_id = request.args.get('patient_id')	
		query = 'select sample.*, p.qc_status, p.amber_qc, p.amber_tumor_baf, p.contamination, p.rna_uniq_mapped_reads, p.rna_uniq_mapped_reads_pct, p.rna_rin, p.purity, p.ploidy, p.mut_burden_mb from sample, sample_purity_metrics as p where sample.sample_id = p.sample_id'	
		if patient_id:
			filter_query = "patient_id='{0}'".format(patient_id)
			query = add_filter_to_query(query, filter_query)
		print(query)	

		cursor = connection.cursor()
		cursor.execute(query)
		sample_details = [dict((cursor.description[i][0], value)
				  for i, value in enumerate(row)) for row in cursor.fetchall()]
		print(sample_details)
		cursor.close()
		connection.close()	
		return jsonify(sample_details)	
	except:	
		print("Unexpected error:", sys.exc_info()[0])
		return jsonify([])


@app.route('/sample_quality_label', methods=['GET'])
def get_sample_quality_label():
	try:
		connection = pymysql.connect(
			host=db_creds['host'],
			user=db_creds['user'],
			passwd=db_creds['password'],
			db=db_creds['database'],
			port = db_creds['port'],
			ssl={'ssl':{'ca': '~/.qc-server-keys/ca.pem'
						}
				}
		)		
		patient_id = request.args.get('patient_id')
		query = 'select sample_quality_label.* from sample, sample_quality_label where sample.sample_id = sample_quality_label.sample_id and sample_quality_label.is_training = 1'
		if patient_id:
			filter_query = "patient_id='{0}'".format(patient_id)
			query = add_filter_to_query(query, filter_query)
		print(query)	

		cursor = connection.cursor()
		cursor.execute(query)
		sample_quality = [dict((cursor.description[i][0], value)
				  for i, value in enumerate(row)) for row in cursor.fetchall()]
		print(sample_quality)
		cursor.close()
		connection.close()	
		return jsonify(sample_quality)			
	except:
		print("Unexpected error:", sys.exc_info()[0])
		return jsonify([])		

# get sample ids using given patient ids
# separate patient ids with , eg. '?patient_ids=P000601,T000101,T000601'
# type is 'germline' or 'tumour'
@app.route('/sample_ids', methods=['GET'])
def get_sample_ids():
	try:
		connection = pymysql.connect(
		    host=db_creds['host'],
		    user=db_creds['user'],
		    passwd=db_creds['password'],
		    db=db_creds['database'],
		    port = db_creds['port'],
		    ssl={'ssl':{'ca': '~/.qc-server-keys/ca.pem'
		                }
		        }
		)		
		patient_ids = request.args.get('patient_ids')	
		type = request.args.get('type')
		query = 'select matched_normal_id, sample_id from sample'

		if patient_ids:
			patient_ids = patient_ids.split(",")
			if len(patient_ids) == 1:
				filter_query = "patient_id='{0}'".format(patient_ids[0])
			else:
				filter_query = "patient_id in {0}".format(tuple(patient_ids))
			query = add_filter_to_query(query, filter_query)
			
			# filter_query = "patient_id='{0}'".format(patient_ids)
			# query = add_filter_to_query(query, filter_query)

		print(query)	

		cursor = connection.cursor()
		cursor.execute(query)
		sample_ids = [dict((cursor.description[i][0], value)
    	          for i, value in enumerate(row)) for row in cursor.fetchall()]
		print(sample_ids)
		cursor.close()
		connection.close()	
		germline = [p['matched_normal_id'] for p in sample_ids]
		tumour = [p['sample_id'] for p in sample_ids]
		results = ""
		if type:
			if type.lower() == 'germline':
				results = ",".join(germline)
			elif type.lower() == 'tumour':
				results = ",".join(tumour)
		else:
			results = ",".join(germline + tumour)

		return jsonify(results)
	except:	
		print("Unexpected error:", sys.exc_info()[0])
		return jsonify([])

#call with /cohort_report for multiqc cohort report html
@app.route('/cohort_report', methods=['GET'])
def get_cohort_report():
	# contents = ""
	# try:
	# 	f = open('multiqc_cohort_report.html')
	# 	contents = f.read()
	# 	f.close()
	# except IOError:
	# 	print("Cannot open file")

	return report.get_chronqc_report()


#call with /patient_report for multiqc report for given patient id
#patient specific example : /patient_report?patient_id=P000201
@app.route('/patient_report', methods=['GET'])
def get_patient_report():
	patient_id = request.args.get('patient_id')
	return report.get_patient_report(patient_id)

#call with /patient_list for list of patient ids
@app.route('/patient_list', methods=['GET'])
def get_patient_list():
	data = get_patient_details(id_only = True)
	return data

#call with /predict for predicted quality of samples
#patient specific example : /predict?patient_id=P000201
@app.route('/predict', methods=['GET'])
def get_prediction_info():
	patient_id = request.args.get('patient_id')
	return model.prediction_info(patient_id, clf_germline, clf_tumour)

#call with /circos for base64 encoded circos plots (one input one output)
#patient specific example : /circos?patient_id=P004301
@app.route('/circos', methods=['GET'])
def get_circos_plots():
	patient_id = request.args.get('patient_id')
	return jsonify(report.get_circos(patient_id))

@app.route('/')
def index():
	return "QC Dashboard API"

if __name__ == '__main__':
	app.run(debug=True)