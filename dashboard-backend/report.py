from paramiko import SSHClient, SFTP
import re, base64

host = 'zcc-curation-dev.australiaeast.cloudapp.azure.com'
port = 22
user = 'binf6111_qc'
pw = 'cciQC2020'

def get_patient_report(patient_id):
    patient_id = patient_id.strip()

    ssh = SSHClient()
    ssh.load_system_host_keys()
    ssh.connect(host, port, user, pw)

    sftp = ssh.open_sftp()

    patient_dir = ""
    for dir in ["data/train/", "data/test/"]:
        for qual in ["high_qual/", "low_qual/"]:
            if patient_id in sftp.listdir(dir + qual):
                patient_dir = dir + qual + patient_id

    # patient id not found
    if not patient_dir:
        sftp.close()
        ssh.close()
        return ""

    sftp.chdir(patient_dir)

    contents = ""
    # try:
    #     print('opening')
    #     f = sftp.open("multiqc_report.html")
    #     print('opened')
    #     contents = f.read()
    #     print('read')
    #     f.close()
    # except IOError:
    #     print('no multiqc report available')
    _, stdout, _ = ssh.exec_command("cat " + patient_dir+"/multiqc_report.html")
    stdout.channel.recv_exit_status()
    contents = stdout.read()
        
    sftp.close()
    ssh.close()

    return contents

def get_chronqc_report():

    ssh = SSHClient()
    ssh.load_system_host_keys()
    ssh.connect(host, port, user, pw)

    sftp = ssh.open_sftp()

    # sftp.chdir("")
    # print(sftp.listdir())

    contents = ""

    _, stdout, _ = ssh.exec_command("cat " + "data/chronqc_data/chronqc_output/full_cohort.*.html")
    stdout.channel.recv_exit_status()
    contents = stdout.read()
    # print(contents)
        
    sftp.close()
    ssh.close()
    return contents

get_chronqc_report()


def get_circos(patient_id):
    patient_id = patient_id.strip()

    ssh = SSHClient()
    ssh.load_system_host_keys()
    ssh.connect(host, port, user, pw)

    sftp = ssh.open_sftp()

    sftp.chdir("data/plots/")

    imgs = {"input": "", "output": ""}

    plot_list = sftp.listdir()
    circos_names = [fname for fname in plot_list if re.search(patient_id, fname)]
    if (len(circos_names) == 0): 
        return imgs
    
    for img in circos_names:
        if re.search("input", img):
            param = "input"
        else:
            param = "output"
        with sftp.open(img, "rb") as f:
            img_b64 = base64.b64encode(f.read())

        imgs[param] = img_b64
        
        
    sftp.close()
    ssh.close()

    return imgs