from scipy.sparse import csr_matrix
import numpy as np
import networkx as nx
import simplejson as json
from networkx.readwrite import json_graph
import os
from collections import Counter
import operator

join = os.path.join

def dict2array(d):
    x = np.zeros((1+max(d.keys())))
    for k, v in d.iteritems():
        x[k] = v

    return x

def get_rt_count(G):
    """
    Use cooccurence between leaders to count the total number times each leader is RT'd
    """
    counts = {}
    for edge in G.edges():
        weight = G.get_edge_data(edge[0],edge[1])[0]['weight']
        for user in edge:
            if user in counts.keys():
                counts[user] += int(weight)
            else:
                counts[user]=int(weight)
    return {k:int(v) for k,v in counts.iteritems()}


def getGlobalLeaders(dirname, threshold=100, eachDay=False):
    nodeTweets = {}
    nodeRetweets = {}
    eachDayLeaders = set()
    for filename in os.listdir(dirname):
        if not filename.endswith(".gml"):
            continue
        id2name = {}
        with open(join(dirname, filename)) as f:
            lineNum = 0
            inNode = False
            inEdge = False
            for line in f:
                line = line.strip()
                if line.find("node [") != -1:
                    inNode = True
                elif line.find("edge [") != -1:
                    inEdge = True
                elif line.find("]") != -1:
                    if inEdge:
                        if id2name[edgeSource] not in nodeRetweets:
                            nodeRetweets[id2name[edgeSource]] = 0
                        if id2name[edgeTarget] not in nodeTweets:
                            nodeTweets[id2name[edgeTarget]] = 0

                        nodeRetweets[id2name[edgeSource]] += 1
                        nodeTweets[id2name[edgeTarget]] += 1
                    inEdge = False
                    inNode = False

                if inNode:
                    if line.startswith("id "):
                        gmlId = int(line[3:])
                    if line.startswith("screen_name "):
                        name = line[12:].replace('"', '')
                        if gmlId not in id2name:
                            id2name[gmlId] = name

                if inEdge:
                    if line.startswith("source "):
                        edgeSource = int(line[7:])
                    if line.startswith("target "):
                        edgeTarget = int(line[7:])

                lineNum += 1

        sortedNodes = sorted(nodeTweets.items(), key=operator.itemgetter(1), reverse=True)
        eachDayLeaders.update(set([l[0] for l in sortedNodes[:threshold]]))

    if eachDay:
        return list(eachDayLeaders)
    else:
        hasXTweets = {}
        for k, v in nodeTweets.iteritems():
            if v not in hasXTweets:
                hasXTweets[v] = 0
            hasXTweets[v] += 1

        cnt = Counter(nodeTweets)

        return [w[0] for w in cnt.most_common(threshold)]

def getD3Json(filename, output_filename, global_leaders=None):
    """
    Parse GML file and reduce for D3 visualization
    """
    cooccurenceThreshold = 5

    ret = parseGML(filename, global_leaders)
    cooccurences = ret["cooccurences"].toarray()
    cooccurencesUK = ret["cooccurencesUK"].toarray()
    cooccurencesRU = ret["cooccurencesRU"].toarray()
    names = np.array(ret["names"])
    tweet_counts = ret["tweet_counts"]

    cooc = np.zeros_like(cooccurences)
    G = nx.MultiGraph()
    for name in names:
        G.add_node(name)

    for i in range(cooccurences.shape[0]):
        topX = np.argsort(cooccurences[i,:])[-cooccurenceThreshold:]
        for j in topX:
            topY = np.argsort(cooccurences[:,j])[-cooccurenceThreshold:]
            if cooccurences[i][j] > 0:
                G.add_edge(names[i],
                           names[j],
                           weight=cooccurences[i][j],
                           weightUK=cooccurencesUK[i][j],
                           weightRU=cooccurencesRU[i][j],
                           topBoth=(i in topY),
                )
                cooc[i][j] = cooccurences[i][j]
    np.save("cooc.npy", cooc)
    np.save("names.npy", names)
    nx.set_node_attributes(G, 'rts', tweet_counts)
    json_g = json_graph.node_link_data(G)
    with open(output_filename,'w') as f:
        json.dump(json_g, f)

def getFrequencyCounts(counts):
    y = np.bincount(counts)
    ii = np.nonzero(y)[0]
    return zip(ii,y[ii])

def createSparseFromList(edges, numNodes, leaders = {}):
    edges = [e for e in edges if e[0] not in leaders]
    return csr_matrix((np.ones(len(edges)), ([e[1] for e in edges], [e[0] for e in edges])), shape=(numNodes, numNodes))

def parseGML(filename, global_leaders=None):
    """Parse a GML file and return counts of the number of times a node is a source,
    as well as the number of times it is a target

    Parameters
    ----------
    filename : The name of the gml file to parse

    Returns
    -------
    TODO: doc
    """
    retweeterThreshold = 10
    numLeaders = 100

    inNode = False
    inEdge = False
    edgeSource = 0
    edgeTarget = 0
    name2id = {}
    id2name = {}
    gml2id = {}
    gmlId = 0
    nodeId = 0
    local_proEU = 0
    local_proRU = 0
    firstEdge = True
    language = ""
    allEdges = []
    edgesUK = []
    edgesRU = []
    proEU = {}
    proRU = {}

    if global_leaders is not None:
        for name in global_leaders:
            if name not in name2id:
                _id = len(name2id)
                name2id[name] = _id
                id2name[_id] = name

    with open(filename) as f:
        lineNum = 0
        for line in f:
            line = line.strip()
            if line.find("node [") != -1:
                inNode = True
            elif line.find("edge [") != -1:
                inEdge = True
                if firstEdge:
                    nodeRU = np.zeros((len(name2id)), dtype='int64')
                    nodeUK = np.zeros((len(name2id)), dtype='int64')
                    nodeSources = np.zeros((len(name2id)), dtype='int64')
                    nodeTargets = np.zeros((len(name2id)), dtype='int64')
                    firstEdge = False
            elif line.find("]") != -1:
                if inEdge:
                    allEdges.append((edgeSource, edgeTarget))
                    nodeSources[edgeSource] += 1
                    nodeTargets[edgeTarget] += 1
                    if language == "uk":
                        edgesUK.append((edgeSource, edgeTarget))
                    elif language == "ru":
                        edgesRU.append((edgeSource, edgeTarget))
                    else:
                        print("Unknown language: ", language)
                        raw_input()
                    edgeSource = 0
                    edgeTarget = 0
                inEdge = False
                inNode = False

            if inNode:
                if line.startswith("id "):
                    gmlId = int(line[3:])
                if line.startswith("pro_eu "):
                    local_proEU = int(line[7:].replace('"', ''))
                if line.startswith("pro_russian "):
                    local_proRU = int(line[12:].replace('"', ''))
                if line.startswith("screen_name "):
                    name = line[12:].replace('"', '')
                    if name not in name2id:
                        _id = len(name2id)
                        name2id[name] = _id
                        id2name[_id] = name

                        proEU[_id] = local_proEU
                        proRU[_id] = local_proRU
                    gml2id[gmlId] = name2id[name]
                    nodeId = name2id[name]

            if inEdge:
                if line.startswith("source "):
                    edgeSource = gml2id[int(line[7:])]
                if line.startswith("target "):
                    edgeTarget = gml2id[int(line[7:])]
                if line.startswith("language "):
                    language = line[9:].replace('"', '')

            lineNum += 1

    if global_leaders is None:
        # leaders = np.where(nodeTargets >= retweeterThreshold)[0]
        # print("Number of nodes who have more than %d retweeters: %d" % (retweeterThreshold, leaders.shape[0]))
        leaders = np.array([l for l in np.argsort(nodeTargets)[-numLeaders:] if nodeTargets[l] >= retweeterThreshold])
        print("Top %d nodes who have more than %d retweeters: %d" % (numLeaders, retweeterThreshold, leaders.shape[0]))
    else:
        leaders = np.array([name2id[l] for l in global_leaders if l in name2id])
        print("Number of leaders: %d" % leaders.shape[0])

    relations = createSparseFromList(allEdges, len(name2id), leaders.tolist())
    relationsRU = createSparseFromList(edgesRU, len(name2id), leaders.tolist())
    relationsUK = createSparseFromList(edgesUK, len(name2id), leaders.tolist())

    ldN = relations[leaders]
    cooccurences = ldN * ldN.T

    ldN = relationsRU[leaders]
    cooccurencesRU = ldN * ldN.T

    ldN = relationsUK[leaders]
    cooccurencesUK = ldN * ldN.T

    print(cooccurences.sum())
    proEU = dict2array(proEU)
    proRU = dict2array(proRU)
    print(proEU.shape)
    print(proRU.shape)

    return {
        "cooccurences": cooccurences,
        "cooccurencesRU": cooccurencesRU,
        "cooccurencesUK": cooccurencesUK,
        "tweet_counts": {id2name[i]: nodeTargets[i] for i in leaders},
        "names": [id2name[i] for i in leaders],
        "nodeTweets": nodeTargets,
        "nodeRetweets": nodeSources,
    }

if __name__ == "__main__":
    dirname = "/Users/sablayra/Capstone/rtnets_ukru_20131125_20140228.gml/"
    print "=> Getting global leaders..."
    global_leaders = getGlobalLeaders(dirname, 100, True)

    print "=> Generating graph for each day..."
    for filename in os.listdir(dirname):
        if not filename.endswith(".gml"):
            continue
        print("Processing "+filename)
        actualFilename = join(dirname, filename)
        getD3Json(actualFilename, 'viz/'+filename.replace(".gml", ".json"), None)
