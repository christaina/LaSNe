import os
from main import parseGML
import csv
import pandas as pd
import re

di = '/scratch/nyu/capstone/gmls'
outfi = '/scratch/nyu/capstone/LaSNe/viz/rt_counts.csv'

if __name__=='__main__':
    all_rts = []
    all_graphs = [x for x in os.listdir(di) if x[:2]=='rt' in x]
    for graph in all_graphs:
        print(graph)
        json = graph.split(".")[0]+".json"
        print(json)
        out = parseGML(os.path.join(di,graph))
        rts = sum(out['nodeRetweets'])
        all_rts.append([json,rts])
    df_ed = pd.DataFrame(all_rts)
    df_ed['date']= df_ed[0].apply(lambda x: pd.to_datetime("-".join(re.split("[._]",x)[1:4])))
    df_ed.columns=['file','rts','date']
    df_ed = df_ed.sort('date')
    df_ed.to_csv(outfi,index=False)
