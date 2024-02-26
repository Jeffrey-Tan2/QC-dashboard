#using root user
create database BINF6111_QC;

CREATE USER 'qc_backend'@'localhost' IDENTIFIED BY 'qc_backend';

grant all on BINF6111_QC.* to 'root'@'localhost';
grant all on BINF6111_QC.* to 'qc_backend'@'localhost';	


#login as qc_backend	

CREATE TABLE IF NOT EXISTS patient (
	id INT AUTO_INCREMENT PRIMARY KEY,
	patient_id VARCHAR(20) UNIQUE NOT NULL, 
	sex VARCHAR(20),
	age_at_diagnosis INT,
	age_at_death INT, 
	vital_status enum('Alive', 'Dead', 'Unknown'),
	hospital VARCHAR(100),
	enrolment_date DATE
)  ENGINE=INNODB;



mysql -u qc_backend -D BINF6111_QC -p



CREATE TABLE IF NOT EXISTS sample (
	id INT AUTO_INCREMENT PRIMARY KEY,
	sample_id VARCHAR(50) UNIQUE NOT NULL,
	patient_id VARCHAR(20) NOT NULL,
	manifest_id VARCHAR(50) NOT NULL,
	matched_normal_id VARCHAR(50) UNIQUE NOT NULL, 
	study VARCHAR(50),
	age_at_sample INT,
	cancer_category VARCHAR(50),
	cancer_type VARCHAR(50),
	diagnosis VARCHAR(50),
	final_diagnosis VARCHAR(100),
	event_type VARCHAR(5),
	tissue enum('TT','BMA','BMT','CSF','PB','SK','PF'),
	wgs_date DATE,
	FOREIGN KEY (patient_id) REFERENCES patient (patient_id)
)  ENGINE=INNODB;



CREATE TABLE IF NOT EXISTS sample_purity_metrics (
	id INT AUTO_INCREMENT PRIMARY KEY,
	sample_id VARCHAR(50) UNIQUE NOT NULL, 
	gender_from_sample VARCHAR(20),
	status VARCHAR(20),
	qc_status VARCHAR(20),

	amber_qc enum('PASS', 'FAIL', 'WARN'),
	amber_tumor_baf double,
	contamination double,
	rna_uniq_mapped_reads int, 
	rna_uniq_mapped_reads_pct double,
	rna_rin double,
	mut_burden_mb double,

	purity double,
	norm_factor double,
	score double,
	somatic_penalty double, 
	ploidy double,
	diploid_proportion double, 
	polyclonal_proportion double, 
	whole_genome_duplication int(1),
	min_purity double,
	max_purity double,
	min_ploidy double,
	max_ploidy double,
	min_diploid_proportion double,
	max_diploid_proportion double,
	ms_indels_per_mb double,
	ms_status enum('MSI-H', 'MSS'),
	tmb_per_mb double,
	tmb_status enum('HIGH', 'LOW'),
	tml int,
	tml_status enum('HIGH', 'LOW'),

	FOREIGN KEY (sample_id) REFERENCES sample (sample_id)

)  ENGINE=INNODB;


CREATE TABLE IF NOT EXISTS sample_quality_label (
	id INT AUTO_INCREMENT PRIMARY KEY,
	sample_id VARCHAR(50) UNIQUE NOT NULL, 
	quality_label enum('high', 'low'),
	is_training int(1),
	predicted_label enum('high', 'low'),
	FOREIGN KEY (sample_id) REFERENCES sample (sample_id)
)  ENGINE=INNODB;


#train high_qual
INSERT INTO sample_quality_label (sample_id, quality_label, is_training) 
	SELECT sample_id, 'high', 1 FROM sample WHERE patient_id IN ('P005906', 'P006301', 'P006501', 'P005602', 'P002805', 'P002207', 'P005801', 'P002307', 'P006204', 'P003607', 'P005404', 'P006304', 'P005304', 'P005202', 'P005704', 'P006904', 'P006502', 'P001905', 'P000803');

#train low_qual
INSERT INTO sample_quality_label (sample_id, quality_label, is_training) 
	SELECT sample_id, 'low', 1 FROM sample WHERE patient_id IN ('P000806', 'P005001', 'P002601', 'T000901', 'P002902', 'P000201', 'P002006', 'P004301', 'P001103', 'P000808', 'T000801', 'T001101', 'T000601', 'P005501', 'P004801', 'T000101', 'P003001', 'P003506', 'P002102');

#test high_qual
INSERT INTO sample_quality_label (sample_id, quality_label, is_training) 
	SELECT sample_id, 'high', 0 FROM sample WHERE patient_id IN ('P003307', 'P006404', 'P005702', 'P001805', 'P007104');

#test loq_qual
INSERT INTO sample_quality_label (sample_id, quality_label, is_training) 
	SELECT sample_id, 'low', 0 FROM sample WHERE patient_id IN ('P002301', 'P000601', 'P003804', 'P001502', 'P002704');