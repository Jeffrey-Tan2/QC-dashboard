from paramiko import SSHClient, SFTP
import numpy as np
import os

host = 'zcc-curation-dev.australiaeast.cloudapp.azure.com'
port = 22
user = 'binf6111_qc'
pw = 'cciQC2020'

#TODO:  Figure out how to fetch images from database and display them on the dashboard
#       Find a way to show plots for a specific patient id

def get_patient_plots(patient_id):
    ssh = SSHClient()
    ssh.load_system_host_keys()
    ssh.connect(host, port, user, pw)

    sftp = ssh.open_sftp()

    with sftp.open('/home/binf6111_qc/data/plots/LKCGP_P000201-244412-01-06-01-R1.input.png') as f:
        img = cv2.imdecode(np.fromstring(f.read(), np.uint8), 1)

    cv2.imshow("image", img)
    cv2.waitKey(0)

    sftp.close()
    ssh.close()

    return plot
