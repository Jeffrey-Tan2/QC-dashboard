# runs cohort report for train (from home dir)
from tempfile import TemporaryDirectory
import os, re, subprocess

# source types used to generate multiqc report in current data folder
file_ext = ["flagstats", "idxstats", "insert_size_metrics", "wgs_metrics",
            "alignment_summary_metrics", "base_distribution_by_cycle_metrics",
            "gc_bias_detail_metrics", "gc_bias_summary_metrics"]

def generate_cohort_report():
    os.chdir("data/")

    with TemporaryDirectory() as tmp_dir:
        os.mkdir(tmp_dir + "/train")
        os.mkdir(tmp_dir + "/test")
        for qual in ["train/high_qual/", "train/low_qual/", "test/high_qual/", "test/low_qual/"]:
            os.mkdir(tmp_dir + "/" + qual)
            for patient_id in os.listdir(qual):
                if re.search('multiqc_', patient_id):
                    continue
                patient_dir = qual + patient_id
                copy_files(patient_dir, tmp_dir)
        
        # -f overwrites any existing multiqc files
        subprocess.call(['multiqc', '-f', tmp_dir])
        
def copy_files(patient_dir, tmp_dir):
    new_patient_dir = tmp_dir + "/" + patient_dir
    os.mkdir(new_patient_dir)

    for file in os.listdir(patient_dir):
        # ext not including .tsv
        ext = re.sub(r'.tsv$', "", file).split(".")[-1]
        if ext in file_ext:
            adjust_sample_name_copy(patient_dir + "/" + file, new_patient_dir+"/"+file)

def adjust_sample_name_copy(ori, dest):
    fname = ori.split("/")[-1]
    try:
        f_o = open(ori)
        contents = f_o.read()
        contents = re.sub(" INPUT=input.bam", " INPUT="+fname, contents)
        f_o.close()

        f_d = open(dest, 'w')
        f_d.write(contents)
        f_d.close()
    except IOError:
        print("cannot open file")

def run_dir_multiqc():
    dirs = ["data/train/high_qual", "data/train/low_qual", 
            "data/test/high_qual", "data/test/low_qual"]
    cwd = os.getcwd()

    for dataset in dirs:
        os.chdir(dataset)
        with TemporaryDirectory() as tmp_dir:
            for patient_id in os.listdir():
                if re.search('multiqc_', patient_id):
                    continue
                copy_files(patient_id, tmp_dir)
            
            # -f overwrites any existing multiqc files
            subprocess.call(['multiqc', '-f', tmp_dir])

        os.chdir(cwd)

generate_cohort_report()
# run_dir_multiqc()