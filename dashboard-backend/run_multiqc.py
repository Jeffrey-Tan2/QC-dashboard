from tempfile import TemporaryDirectory
import os, re, subprocess

# source types used to generate multiqc report in current data folder
file_ext = ["flagstats", "idxstats", "insert_size_metrics", "wgs_metrics",
            "alignment_summary_metrics", "base_distribution_by_cycle_metrics",
            "gc_bias_detail_metrics", "gc_bias_summary_metrics"]
# multiqc_path = "/home/binf6111_qc/.local/bin/multiqc"

def generate_patient_reports():
    cwd = os.getcwd()
    for dir in ["data/train/", "data/test/"]:
        for qual in ["high_qual/", "low_qual/"]:
            for patient_id in os.listdir(dir+qual):
                if re.search('multiqc_', patient_id):
                    continue
                patient_dir = dir + qual + patient_id
                run_multiqc_patient(patient_dir)
                os.chdir(cwd)

def run_multiqc_patient(patient_dir):
    # navigate to patient dir
    os.chdir(patient_dir)
    files = os.listdir()

    with TemporaryDirectory() as tmp_dir:

        for file in files:
            # ext not including .tsv
            ext = re.sub(r'.tsv$', "", file).split(".")[-1]
            if ext in file_ext:
                # sftp.get(file, tmp_dir+"/"+file)
                adjust_sample_name_copy(file, tmp_dir+"/"+file)
        
        # -f overwrites any existing multiqc files
        subprocess.call(['multiqc', '-f', tmp_dir])


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

generate_patient_reports()