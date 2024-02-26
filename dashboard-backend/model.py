import pandas as pd
from paramiko import SSHClient, SFTP
# from sklearn import svm
from sklearn.tree import DecisionTreeClassifier, plot_tree
from sklearn.metrics import accuracy_score
import matplotlib.pyplot as plt
import re, pickle
import json

host = 'zcc-curation-dev.australiaeast.cloudapp.azure.com'
port = 22
user = 'binf6111_qc'
pw = 'cciQC2020'

def get_datasets():
    try:
        dataset = pd.read_pickle("dataset.pkl")
    except FileNotFoundError: 
        ssh = SSHClient()
        ssh.load_system_host_keys()
        ssh.connect(host, port, user, pw)
        sftp = ssh.open_sftp()

        # 0 low qual 1 high qual
        df_tr_high = read_table(sftp, "data/train/high_qual/", 1, 'train')
        df_tr_low = read_table(sftp, "data/train/low_qual/", 0, 'train')

        df_te_high = read_table(sftp, "data/test/high_qual/", 1, 'test')
        df_te_low = read_table(sftp,"data/test/low_qual/", 0, 'test')
        dataset = pd.concat([df_te_high, df_te_low, df_tr_high, df_tr_low])

        sftp.close()
        ssh.close()
        dataset.to_pickle("dataset.pkl")
    finally:
        return dataset


def read_table(sftp, dir_name, qual, dataset):
    fpath = dir_name + "multiqc_data/multiqc_general_stats.txt"
    with sftp.open(fpath) as f:
        df = pd.read_table(f)

    df["qual"] = [qual] * len(df.index)
    df["dataset"] = [dataset] * len(df.index)
    df["type"] = ["germline" if re.search("G", n.split("-")[-1]) else "tumour" for n in df["Sample"]]

    fpath = dir_name + "multiqc_data/multiqc_picard_gcbias.txt"
    with sftp.open(fpath) as f:
        df_gc = pd.read_table(f)

    gc_cols = ["Sample", "ALIGNED_READS", "AT_DROPOUT", "GC_DROPOUT", "GC_NC_40_59"]
    df = pd.merge(df, df_gc[gc_cols], on='Sample', how='outer')

    fpath = dir_name + "multiqc_data/multiqc_samtools_flagstat.txt"
    with sftp.open(fpath) as f:
        df_fs = pd.read_table(f)
    
    fs_cols = ["Sample", "duplicates_passed", "paired in sequencing_passed"]
    df = pd.merge(df, df_fs[fs_cols], on='Sample', how='outer')

    # get mean of lanes for samtools tumour metrics
    for col in ['Samtools_mqc-generalstats-samtools-flagstat_total', 
                'Samtools_mqc-generalstats-samtools-mapped_passed',
                'duplicates_passed', 'paired in sequencing_passed']:
        for i in range(len(df.index)):
            if pd.isna(df[col].iloc[i]):
                df.at[i, col] = df.loc[df.Sample.str.match(rf"{df.Sample.iloc[i]}\..")][col].mean()
    
    # drop null rows
    df = df[df["Picard_mqc-generalstats-picard-MEDIAN_COVERAGE"].notna()]
    df = df[df["Samtools_mqc-generalstats-samtools-mapped_passed"].notna()]

    return df

# feature_columns = ['Samtools_mqc-generalstats-samtools-mapped_passed',
#                     "Picard_mqc-generalstats-picard-MEDIAN_COVERAGE",
#                     'GC_DROPOUT', 'duplicates_passed'
#                     ]

feature_columns = [ "Picard_mqc-generalstats-picard-PCT_30X",
                    'duplicates_passed','GC_DROPOUT', 
                    "Picard_mqc-generalstats-picard-MEDIAN_COVERAGE"]

# mapped_passed, gc_dropout (tumour 9, germline 7)
# mapped_passed, median_coverage (tumour 8-9, germline 7-9)
# mapped_passed, median_coverage, gc_dropout (tumour 7-8, germline 7-8)
# mapped_passed, median_coverage, duplicates_passed (tumour 8, germline 8-9)
# mapped_passed, median_coverage, duplicates_passed, gc_dropout (tumour 8, germline 9)
# mapped_passed, pct_30x, duplicates_passed, gc_dropout (tumour 9, germline 9)
# pct_30x, duplicates_passed, gc_dropout (tumour 9, germline 9)
# pct_30x, duplicates_passed (tumour 9, germline 8)
# pct_30x, duplicates_passed, mapped_passed_pct (tumour 9, 7-8)
# pct_30x, duplicates_passed, gc_dropout, median_coverage (tumour 9, germline 8-9)

def fit_model(type):
    # type is "germline" or "tumour"
    print("Training model on sample type : " + type)
    data = get_datasets()
    data = data.loc[data.type == type]

    train = data.loc[(data.type == type) & (data.dataset == "train")]
    test = data.loc[(data.type == type) & (data.dataset == "test")]

    X_train = train[feature_columns]
    y_train = train.qual
    X_test = test[feature_columns]
    y_test = test.qual

    clf = DecisionTreeClassifier()

    clf = clf.fit(X_train, y_train)

    train_pred = clf.predict(X_train)
    test_pred = clf.predict(X_test)


    print(train_pred)
    print(y_train)
    print(test_pred)
    print(y_test)

    accuracy = accuracy_score(y_train, train_pred)
    print("Training accuracy : ", accuracy)
    
    accuracy = accuracy_score(y_test, test_pred)
    print("Test accuracy : ", accuracy)

    return clf


def plot_decision_tree(clf_germline, clf_tumour):
    print('plotting decision tree')

    feature_names = ['30x', 'dup_pas', 'gc_drop', 'med_cov']
    # text = ''
    # for i in range(len(feature_names)):
    #     text = text + feature_names[i] + ' : ' + feature_columns[i] + ' | '
    # print(text)

    fig = plt.figure(dpi = 500)
    # ax = fig.add_subplot(111)
    plot_tree(clf_germline, feature_names=feature_names, filled=True, impurity=False, node_ids=True)
    # ax.text(1, 1, text, verticalalignment='bottom', horizontalalignment='right')
    plt.savefig('../qc-dashboard/public/clf_germline.png')
    plt.close(fig)

    fig = plt.figure(dpi = 500)
    # ax = fig.add_subplot(111)
    plot_tree(clf_tumour, feature_names=feature_names, filled=True, impurity=False, node_ids=True)
    # ax.text(0.9, 0.1, text, verticalalignment='bottom', horizontalalignment='right')
    plt.savefig('../qc-dashboard/public/clf_tumour.png')  
    plt.close(fig)  


    print('plotting complete')


def get_decision_node_path_list(model, df, feature_columns):
    decision_path = model.decision_path(df[feature_columns])
    node_path_list = []
    for sample_id in range(len(df.index)):
        node_path = decision_path.indices[decision_path.indptr[sample_id]:decision_path.indptr[sample_id + 1]]
        node_path_list.append(node_path.tolist())
    return node_path_list


def prediction_info(patient_id, clf_germline, clf_tumour):
    # Sample return value:
    #returns json of below sample dict
        # {
        #     "sampleId1": 
        #                 {  "qual_pred": 1, 
        #                     "path": [0, 5, 7, 8], 
        #                     "type": "tumour",
        #                     "values": {"Picard_mqc-generalstats-picard-PCT_30X": 0.977916, "duplicates_passed": 117346670.66666667, 
        #                     "GC_DROPOUT": 0.193325, "Picard_mqc-generalstats-picard-MEDIAN_COVERAGE": 103.0}
        #                 },
        #     "sampleId2":
        #                 {   "qual_pred": 0,
        #                     "path": [0, 1, 2],
        #                     "type": "germline",
        #                     "values": {}
        #                 } 
                
        # }   

    patient_id.strip()
    data = get_datasets()
    data_pred = data.loc[data.Sample.str.match(rf".*{patient_id}.*"),]


    data_pred_g = data_pred[data_pred.type == "germline"].copy()
    data_pred_t = data_pred[data_pred.type == "tumour"].copy()

    
    data_pred_g["qual_pred"] = clf_germline.predict(data_pred_g[feature_columns])
    data_pred_t["qual_pred"] = clf_tumour.predict(data_pred_t[feature_columns])
    
    data_pred_g["path"] = get_decision_node_path_list(clf_germline, data_pred_g, feature_columns)
    data_pred_t["path"] = get_decision_node_path_list(clf_tumour, data_pred_t, feature_columns)
    
    # feature_names = ['30x', 'dup_pas', 'gc_drop', 'med_cov']

    data_pred = pd.concat([data_pred_t, data_pred_g])
    data_pred = data_pred.set_index("Sample")

    required_columns = feature_columns + ["qual_pred", "path", "type"]

    op_dict = data_pred[required_columns].to_dict(orient='index')
    
    prediction_info = {}
    for sample in op_dict:
        data = op_dict[sample]
        prediction_info_value = {}
        values = {}
        for key in data:
            if key in ["qual_pred", "path", "type"]:
                prediction_info_value[key] = data[key]
            else:
                values[key] = data[key]
        prediction_info_value["values"] = values
        prediction_info[sample] = prediction_info_value
        
    print(json.dumps(prediction_info))

    return json.dumps(prediction_info)